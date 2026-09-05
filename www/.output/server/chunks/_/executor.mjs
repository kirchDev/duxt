import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

function normalizeCode(userCode) {
  let code = userCode.trim();
  code = code.replace(/^```(?:js|javascript|typescript|ts|tsx|jsx)?[ \t]*\n/, "").replace(/\n?```[ \t]*$/, "").trim();
  code = code.replace(/^export\s+default\s+/, "");
  const arrowMatch = code.match(/^async\s*\(\s*\)\s*=>\s*\{([\s\S]*)\}[;\t ]*$/);
  if (arrowMatch?.[1]) {
    code = arrowMatch[1].trim();
  } else {
    const arrowIdx = code.search(/^async\s*\(\s*\)\s*=>/);
    if (arrowIdx === 0) {
      const arrowEnd = code.indexOf("=>");
      if (arrowEnd !== -1) {
        const expr = code.slice(arrowEnd + 2).trim();
        if (expr && !expr.startsWith("{")) {
          code = `return ${expr.replace(/;[ \t]*$/, "")};`;
        }
      }
    }
  }
  const iifeMatch = code.match(/^\(\s*async\s*\(\s*\)\s*=>\s*\{([\s\S]*)\}\s*\)\s*\(\s*\)[;\t ]*$/);
  if (iifeMatch?.[1]) {
    code = iifeMatch[1].trim();
  }
  const namedFnMatch = code.match(/^async\s+function\s+(\w+)\s*\(\s*\)\s*\{([\s\S]*)\}[;\s]*\1\s*\(\s*\)[;\s]*$/);
  if (namedFnMatch?.[2]) {
    code = namedFnMatch[2].trim();
  }
  return code;
}

const ERROR_PREFIX = "__ERROR__";
const DEFAULT_MAX_RESULT_SIZE = 102400;
const DEFAULT_MAX_REQUEST_BODY_BYTES = 1048576;
const DEFAULT_MAX_TOOL_RESPONSE_SIZE = 1048576;
const DEFAULT_WALL_TIME_LIMIT_MS = 6e4;
const DEFAULT_MAX_TOOL_CALLS = 200;
const MAX_LOG_ENTRIES = 200;
const MCP_BINDING = "mcp-rpc";
const RETURN_TOOL = "__return__";
const textDecoder = new TextDecoder();
let secureExecModule = null;
async function loadSecureExec() {
  if (secureExecModule) return secureExecModule;
  try {
    secureExecModule = await import('secure-exec');
    return secureExecModule;
  } catch (error) {
    console.error("[nuxt-mcp-toolkit] Failed to load secure-exec:", error);
    throw new Error(
      "[nuxt-mcp-toolkit] Code Mode requires `secure-exec`. Install it with: npm install secure-exec",
      { cause: error }
    );
  }
}
async function dispatchRpcCall(payload, state, token) {
  if (token !== state.token) {
    return { kind: "error", status: 403, message: "Forbidden" };
  }
  const { tool: name, args, execId } = payload;
  if (typeof execId !== "string" || execId.length === 0) {
    return { kind: "error", status: 400, message: "Missing execution id" };
  }
  const exec = state.executions.get(execId);
  if (!exec) {
    return { kind: "error", status: 400, message: `Unknown execution: ${execId}` };
  }
  if (Date.now() > exec.deadlineMs) {
    return { kind: "error", status: 408, message: "Execution wall-clock timeout exceeded" };
  }
  if (name === RETURN_TOOL) {
    if (!exec.onReturn) {
      return { kind: "error", status: 400, message: `Execution cannot accept return value: ${execId}` };
    }
    if (exec.returned) {
      return { kind: "error", status: 400, message: "Return value already received for this execution" };
    }
    exec.restoreContext(exec.onReturn, args);
    exec.returned = true;
    return { kind: "ok", result: { ok: true } };
  }
  const fn = exec.fns[name];
  if (!fn) {
    return { kind: "error", status: 400, message: `Unknown tool: ${name}` };
  }
  exec.rpcCallCount++;
  if (exec.rpcCallCount > exec.maxToolCalls) {
    return { kind: "error", status: 429, message: `Tool call limit exceeded (max ${exec.maxToolCalls})` };
  }
  const result = await exec.restoreContext(fn, args);
  const serialized = JSON.stringify(result);
  if (serialized.length > exec.maxToolResponseSize) {
    return { kind: "ok", result: truncateResult(result, serialized.length, exec.maxToolResponseSize) };
  }
  return { kind: "ok", result };
}
async function handleBindingRpc(input) {
  if (!rpcState) {
    throw new Error("Code mode RPC bridge is not ready");
  }
  const outcome = await dispatchRpcCall(
    { tool: input.tool, args: input.args, execId: input.execId },
    rpcState,
    input.token
  );
  if (outcome.kind === "error") {
    throw new Error(outcome.message);
  }
  return outcome.result;
}
let rpcState = null;
let rpcStatePromise = null;
function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function sanitizeErrorMessage(msg) {
  return msg.replace(/(?:\/[\w.][-\w.]*)+\.\w+/g, "[path]").replace(/(?:[A-Z]:\\[\w.][-\w.\\]*)+/g, "[path]").replace(/\n\s+at .+/g, "").slice(0, 500);
}
function sendJson(res, status, payload) {
  let serialized;
  try {
    serialized = JSON.stringify(payload);
  } catch (error) {
    console.warn("[nuxt-mcp-toolkit] Failed to serialize RPC response:", getErrorMessage(error));
    if (res.headersSent) {
      res.destroy();
      return;
    }
    serialized = JSON.stringify({ error: "Failed to serialize RPC response" });
    status = 500;
  }
  try {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(serialized);
  } catch (error) {
    console.warn("[nuxt-mcp-toolkit] Failed to write RPC response:", getErrorMessage(error));
    if (res.headersSent) {
      res.destroy();
      return;
    }
    try {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to send RPC response" }));
    } catch (innerError) {
      console.warn("[nuxt-mcp-toolkit] RPC response write failed, destroying socket:", getErrorMessage(innerError));
      res.destroy();
    }
  }
}
async function handleRpcRequest(req, res, state) {
  if (req.headers["x-rpc-token"] !== state.token) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  try {
    let body = "";
    let byteCount = 0;
    for await (const chunk of req) {
      const str = typeof chunk === "string" ? chunk : chunk.toString();
      byteCount += Buffer.byteLength(str);
      if (byteCount > state.maxRequestBodyBytes) {
        sendJson(res, 413, { error: "Request body exceeds size limit" });
        return;
      }
      body += str;
    }
    const { tool: name, args, execId } = JSON.parse(body);
    const outcome = await dispatchRpcCall({ tool: name, args, execId }, state, state.token);
    if (outcome.kind === "error") {
      sendJson(res, outcome.status, { error: outcome.message });
      return;
    }
    sendJson(res, 200, { result: outcome.result });
  } catch (error) {
    console.error("[nuxt-mcp-toolkit] RPC dispatch error:", error);
    sendJson(res, 500, { error: sanitizeErrorMessage(getErrorMessage(error)) });
  }
}
function ensureRpcServer(maxRequestBodyBytes) {
  if (rpcState) return Promise.resolve(rpcState);
  if (rpcStatePromise) return rpcStatePromise;
  rpcStatePromise = new Promise((resolve, reject) => {
    const token = randomBytes(32).toString("hex");
    const executions = /* @__PURE__ */ new Map();
    const stateRef = { token, executions, maxRequestBodyBytes };
    const server = createServer((req, res) => {
      handleRpcRequest(req, res, stateRef).catch((error) => {
        console.error("[nuxt-mcp-toolkit] Unhandled RPC error:", error);
        if (!res.headersSent) {
          try {
            sendJson(res, 500, { error: "Internal server error" });
          } catch {
            res.destroy();
          }
        }
      });
    });
    const onError = (error) => {
      rpcStatePromise = null;
      console.error("[nuxt-mcp-toolkit] RPC server startup failed:", error);
      try {
        server.close();
      } catch (closeError) {
        console.warn("[nuxt-mcp-toolkit] Failed to close RPC server during error cleanup:", getErrorMessage(closeError));
      }
      reject(error);
    };
    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      server.off("error", onError);
      const state = { server, port: addr.port, token, executions, maxRequestBodyBytes };
      rpcState = state;
      resolve(state);
    });
  });
  return rpcStatePromise;
}
let cachedProxyKey = "";
let cachedProxyCode = "";
const SAFE_IDENTIFIER = /^[\w$]+$/;
function getProxyBoilerplate(toolNames, token) {
  const key = `${token}:${toolNames.join(",")}`;
  if (key === cachedProxyKey) return cachedProxyCode;
  for (const name of toolNames) {
    if (!SAFE_IDENTIFIER.test(name)) {
      throw new Error(`[nuxt-mcp-toolkit] Unsafe tool name rejected: "${name}"`);
    }
  }
  const proxyMethods = toolNames.map((name) => `  ${name}: (input) => rpc('${name}', input)`).join(",\n");
  cachedProxyCode = `
import { execFileSync } from 'node:child_process';

async function rpc(toolName, args) {
  const raw = execFileSync('${MCP_BINDING}', ['${MCP_BINDING}', '--json', JSON.stringify({
    token: '${token}',
    tool: toolName,
    args,
    execId: __execId,
  })]);
  const data = JSON.parse(String(raw));
  if (!data.ok) throw new Error(data.error || 'RPC failed');
  const result = data.result;
  if (result && result.__toolError) {
    const err = new Error(result.message);
    err.tool = result.tool;
    err.isToolError = true;
    err.details = result.details;
    throw err;
  }
  return result;
}

const codemode = {
${proxyMethods}
};`;
  cachedProxyKey = key;
  return cachedProxyCode;
}
function buildSandboxCode(userCode, toolNames, token, execId) {
  const boilerplate = getProxyBoilerplate(toolNames, token);
  const cleaned = normalizeCode(userCode);
  return `const __execId = ${JSON.stringify(execId)};
${boilerplate}

const __fn = async () => {
${cleaned}
};
__fn().then(
  (r) => rpc('${RETURN_TOOL}', r === undefined ? null : r),
  (e) => console.error('${ERROR_PREFIX}' + (e && e.message ? e.message : String(e)))
).catch(
  (e) => console.error('${ERROR_PREFIX}' + 'Result delivery failed: ' + (e && e.message ? e.message : String(e)))
);
`;
}
let runtimeInstance = null;
async function ensureRuntime() {
  if (runtimeInstance) return runtimeInstance;
  const secureExec = await loadSecureExec();
  runtimeInstance = await secureExec.NodeRuntime.create({
    permissions: {
      binding: "allow"
    },
    bindings: {
      [MCP_BINDING]: {
        description: "Bridge sandboxed code mode calls back to the host MCP tool dispatcher",
        inputSchema: {
          type: "object",
          properties: {
            token: { type: "string" },
            tool: { type: "string" },
            args: {},
            execId: { type: "string" }
          },
          required: ["token", "tool", "execId"]
        },
        handler: (input) => handleBindingRpc(input)
      }
    }
  });
  return runtimeInstance;
}
function appendLog(logs, channel, message) {
  if (logs.length < MAX_LOG_ENTRIES) {
    logs.push(`[${channel}] ${message}`);
    return;
  }
  if (logs.length === MAX_LOG_ENTRIES) {
    logs.push(`... log output truncated at ${MAX_LOG_ENTRIES} entries`);
  }
}
function truncateResult(value, totalSize, maxSize) {
  if (Array.isArray(value)) {
    const keepCount = Math.max(1, Math.floor(value.length * maxSize / totalSize));
    return {
      _truncated: true,
      _totalItems: value.length,
      _shownItems: keepCount,
      _message: `Result truncated: ${totalSize} bytes exceeds ${maxSize} byte limit. Showing ${keepCount}/${value.length} items.`,
      data: value.slice(0, keepCount)
    };
  }
  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    const keepCount = Math.max(1, Math.floor(keys.length * maxSize / totalSize));
    const partial = {};
    for (const key of keys.slice(0, keepCount)) {
      partial[key] = value[key];
    }
    return {
      _truncated: true,
      _totalKeys: keys.length,
      _shownKeys: keepCount,
      _message: `Result truncated: ${totalSize} bytes exceeds ${maxSize} byte limit. Showing ${keepCount}/${keys.length} keys.`,
      data: partial
    };
  }
  return {
    _truncated: true,
    _totalBytes: totalSize,
    _message: `Result truncated: ${totalSize} bytes exceeds ${maxSize} byte limit.`,
    data: String(value).slice(0, maxSize)
  };
}
async function execute(code, fns, options) {
  const logs = [];
  if (typeof AsyncLocalStorage.snapshot !== "function") {
    return {
      result: void 0,
      error: "[nuxt-mcp-toolkit] Code Mode requires Node.js >=18.16.0 (AsyncLocalStorage.snapshot is unavailable).",
      logs
    };
  }
  let rpc;
  let execId;
  let returnedResult = { value: void 0, received: false };
  try {
    rpc = await ensureRpcServer(options?.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES);
    const runtime = await ensureRuntime();
    execId = randomBytes(8).toString("hex");
    const restoreContext = AsyncLocalStorage.snapshot();
    rpc.executions.set(execId, {
      fns: Object.freeze({ ...fns }),
      onReturn: (value) => {
        returnedResult = { value, received: true };
      },
      returned: false,
      restoreContext,
      deadlineMs: Date.now() + (options?.wallTimeLimitMs ?? DEFAULT_WALL_TIME_LIMIT_MS),
      rpcCallCount: 0,
      maxToolCalls: options?.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS,
      maxToolResponseSize: options?.maxToolResponseSize ?? DEFAULT_MAX_TOOL_RESPONSE_SIZE
    });
    const toolNames = Object.keys(fns);
    const sandboxCode = buildSandboxCode(code, toolNames, rpc.token, execId);
    let errorMsg;
    const execResult = await runtime.exec(sandboxCode, {
      timeout: options?.cpuTimeLimitMs ?? 1e4,
      onStdout: (chunk) => {
        appendLog(logs, "stdout", textDecoder.decode(chunk));
      },
      onStderr: (chunk) => {
        const message = textDecoder.decode(chunk);
        if (message.startsWith(ERROR_PREFIX)) {
          errorMsg = message.slice(ERROR_PREFIX.length);
          return;
        }
        appendLog(logs, "stderr", message);
      }
    });
    if (execResult.exitCode !== 0 || errorMsg) {
      return {
        result: void 0,
        error: errorMsg ?? (execResult.stderr.trim() || `Exit code ${execResult.exitCode}`),
        logs
      };
    }
    let result;
    if (returnedResult.received) {
      const maxSize = options?.maxResultSize ?? DEFAULT_MAX_RESULT_SIZE;
      const serialized = JSON.stringify(returnedResult.value);
      if (serialized.length <= maxSize) {
        result = returnedResult.value;
      } else {
        result = truncateResult(returnedResult.value, serialized.length, maxSize);
      }
    }
    return { result, logs };
  } catch (error) {
    console.error("[nuxt-mcp-toolkit] Execution error:", error);
    return {
      result: void 0,
      error: sanitizeErrorMessage(getErrorMessage(error)),
      logs
    };
  } finally {
    if (rpc && execId) {
      rpc.executions.delete(execId);
    }
  }
}

export { execute, normalizeCode };
//# sourceMappingURL=executor.mjs.map
