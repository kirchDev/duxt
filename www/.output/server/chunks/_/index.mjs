import { z } from 'zod';
import { w as enrichNameTitle, x as normalizeToolResult } from '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'vue-router';
import 'node:url';
import '@iconify/utils';
import 'consola';
import '@modelcontextprotocol/sdk/types.js';
import '@modelcontextprotocol/sdk/server/mcp.js';
import 'node:fs/promises';
import '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

const RESERVED_WORDS = /* @__PURE__ */ new Set([
  "break",
  "case",
  "catch",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "finally",
  "for",
  "function",
  "if",
  "in",
  "instanceof",
  "new",
  "return",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "class",
  "const",
  "enum",
  "export",
  "extends",
  "import",
  "super",
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
  "await",
  "async"
]);
function sanitizeToolName(name) {
  let sanitized = name.replace(/[^\w$]/g, "_");
  if (/^\d/.test(sanitized)) sanitized = `_${sanitized}`;
  if (RESERVED_WORDS.has(sanitized)) sanitized = `${sanitized}_`;
  return sanitized;
}
function pascalCase(str) {
  return str.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase());
}
function formatTsPropertyKey(key) {
  return /^[A-Z_$][\w$]*$/i.test(key) && !RESERVED_WORDS.has(key) ? key : JSON.stringify(key);
}
function jsonSchemaPropertyToTs(prop) {
  if (prop.enum && Array.isArray(prop.enum)) {
    return prop.enum.map((v) => typeof v === "string" ? `"${v}"` : String(v)).join(" | ");
  }
  const type = prop.type;
  if (Array.isArray(type)) {
    return type.map((t) => jsonSchemaPrimitiveToTs(t)).join(" | ");
  }
  if (type === "object" && prop.properties) {
    const props = prop.properties;
    const required = prop.required || [];
    const fields = Object.entries(props).map(([key, value]) => {
      const opt = required.includes(key) ? "" : "?";
      return `${key}${opt}: ${jsonSchemaPropertyToTs(value)}`;
    });
    return `{ ${fields.join("; ")} }`;
  }
  if (type === "array") {
    const items = prop.items;
    const itemType = items ? jsonSchemaPropertyToTs(items) : "unknown";
    return `${itemType}[]`;
  }
  return type ? jsonSchemaPrimitiveToTs(type) : "unknown";
}
function jsonSchemaPrimitiveToTs(type) {
  switch (type) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "object":
      return "Record<string, unknown>";
    case "array":
      return "unknown[]";
    default:
      return "unknown";
  }
}
const PRIMITIVE_TYPES = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean"]);
const INLINE_THRESHOLD = 3;
function isPrimitiveProp(prop) {
  if (prop.enum) return true;
  const type = prop.type;
  return !!type && PRIMITIVE_TYPES.has(type);
}
function generateSchemaTypeInfo(schema, typeName) {
  const jsonSchema = z.toJSONSchema(z.object(schema));
  const properties = jsonSchema.properties;
  const required = jsonSchema.required || [];
  if (!properties || Object.keys(properties).length === 0) {
    return null;
  }
  const entries = Object.entries(properties);
  const allPrimitive = entries.every(([, prop]) => isPrimitiveProp(prop));
  if (entries.length <= INLINE_THRESHOLD && allPrimitive) {
    const inlineFields = entries.map(([key, prop]) => {
      const opt = required.includes(key) ? "" : "?";
      return `${formatTsPropertyKey(key)}${opt}: ${jsonSchemaPropertyToTs(prop)}`;
    });
    return {
      interfaceDecl: null,
      typeExpression: `{ ${inlineFields.join("; ")} }`
    };
  }
  const fields = entries.map(([key, prop]) => {
    const opt = required.includes(key) ? "" : "?";
    const tsType = jsonSchemaPropertyToTs(prop);
    return `  ${formatTsPropertyKey(key)}${opt}: ${tsType};`;
  });
  return {
    interfaceDecl: `interface ${typeName} {
${fields.join("\n")}
}`,
    typeExpression: typeName
  };
}
function generateToolTypeInfo(tool) {
  const { name } = enrichNameTitle({
    name: tool.name,
    title: tool.title,
    _meta: tool._meta,
    type: "tool"
  });
  const sanitizedName = sanitizeToolName(name);
  const typeName = `${pascalCase(sanitizedName)}Input`;
  let interfaceDecl = null;
  let paramSignature = "";
  if (tool.inputSchema && Object.keys(tool.inputSchema).length > 0) {
    try {
      const schemaTypeInfo = generateSchemaTypeInfo(tool.inputSchema, typeName);
      if (schemaTypeInfo) {
        interfaceDecl = schemaTypeInfo.interfaceDecl;
        paramSignature = `input: ${schemaTypeInfo.typeExpression}`;
      }
    } catch {
      paramSignature = "input: Record<string, unknown>";
    }
  }
  let outputInterfaceDecl = null;
  let returnType = "unknown";
  const outputTypeName = `${pascalCase(sanitizedName)}Output`;
  if (tool.outputSchema && Object.keys(tool.outputSchema).length > 0) {
    try {
      const schemaTypeInfo = generateSchemaTypeInfo(tool.outputSchema, outputTypeName);
      if (schemaTypeInfo) {
        outputInterfaceDecl = schemaTypeInfo.interfaceDecl;
        returnType = schemaTypeInfo.typeExpression;
      }
    } catch {
    }
  }
  const desc = tool.description ? ` // ${tool.description}` : "";
  const methodSignature = `${sanitizedName}: (${paramSignature}) => Promise<${returnType}>;${desc}`;
  return {
    originalName: name,
    sanitizedName,
    typeName,
    interfaceDecl,
    outputInterfaceDecl,
    methodSignature
  };
}
function buildToolNameMap(infos) {
  const map = /* @__PURE__ */ new Map();
  for (const info of infos) {
    map.set(info.sanitizedName, info.originalName);
  }
  return map;
}
function generateTypesFromTools(tools) {
  const toolInfos = tools.map(generateToolTypeInfo);
  const interfaces = toolInfos.flatMap((t) => [t.interfaceDecl, t.outputInterfaceDecl]).filter(Boolean).join("\n\n");
  const methods = toolInfos.map((t) => `  ${t.methodSignature}`).join("\n");
  const codemodeDecl = `declare const codemode: {
${methods}
};`;
  const typeDefinitions = interfaces ? `${interfaces}

${codemodeDecl}` : codemodeDecl;
  return { typeDefinitions, toolNameMap: buildToolNameMap(toolInfos) };
}
function generateToolCatalog(tools) {
  const toolInfos = tools.map((tool) => {
    const info = generateToolTypeInfo(tool);
    return { ...info, description: tool.description || "" };
  });
  const entries = toolInfos.map((info) => ({
    name: info.sanitizedName,
    originalName: info.originalName,
    description: info.description,
    signature: info.methodSignature,
    interfaceDecl: [info.interfaceDecl, info.outputInterfaceDecl].filter(Boolean).join("\n\n") || void 0
  }));
  return { entries, toolNameMap: buildToolNameMap(toolInfos) };
}
function searchToolCatalog(entries, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return entries;
  const scored = [];
  for (const entry of entries) {
    const nameLower = entry.name.toLowerCase();
    const originalLower = entry.originalName.toLowerCase();
    const descLower = entry.description.toLowerCase();
    const allText = `${nameLower} ${originalLower} ${descLower}`;
    if (!terms.every((t) => allText.includes(t))) continue;
    let score = 0;
    for (const term of terms) {
      if (nameLower === term || originalLower === term) score += 10;
      else if (nameLower.startsWith(term) || originalLower.startsWith(term)) score += 5;
      else if (nameLower.includes(term) || originalLower.includes(term)) score += 3;
      else if (descLower.includes(term)) score += 1;
    }
    scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.entry);
}
function formatSearchResults(matches, query, total) {
  if (matches.length === 0) {
    return `No tools found matching "${query}". ${total} tools available \u2014 try a broader query.`;
  }
  const lines = matches.map((m) => {
    const sig = m.interfaceDecl ? `${m.interfaceDecl}

codemode.${m.signature}` : `codemode.${m.signature}`;
    return sig;
  });
  const header = matches.length === total ? `All ${total} tools:` : `Found ${matches.length}/${total} tools matching "${query}":`;
  return `${header}

${lines.join("\n\n")}`;
}

async function runExecute(code, fns, options) {
  const { execute } = await import('./executor.mjs');
  return execute(code, fns, options);
}
const CODE_TOOL_DESCRIPTION_TEMPLATE = `Execute JavaScript to orchestrate multiple tool calls in a SINGLE invocation. ALWAYS combine ALL related operations into one code block \u2014 never split into separate calls.

Write the body of an async function. Use \`return\` to return the final result.

Available tools via the \`codemode\` object:
\`\`\`typescript
{{types}}
\`\`\`

IMPORTANT: Combine sequential, parallel, and conditional logic in ONE code block:
\`\`\`javascript
// Sequential: chain dependent calls
const data = await codemode.get_data({ id: "123" });
const result = await codemode.process({ input: data.value });

// Parallel: use Promise.all for independent calls
const [a, b, c] = await Promise.all([
  codemode.task({ name: "a" }),
  codemode.task({ name: "b" }),
  codemode.task({ name: "c" }),
]);

// Conditional + loops
for (const item of items) {
  if (item.active) await codemode.handle({ id: item.id });
}

return result;
\`\`\``;
const PROGRESSIVE_CODE_DESCRIPTION_TEMPLATE = `Execute JavaScript to orchestrate tool calls in a SINGLE invocation. ALWAYS combine ALL related operations into one code block.

Write the body of an async function. Use \`return\` to return the final result.

{{count}} tools available via the \`codemode\` object. Use the \`search\` tool first to discover tool names and type signatures, then write code using \`codemode.toolName(input)\`.

IMPORTANT: Combine sequential, parallel, and conditional logic in ONE code block:
\`\`\`javascript
// Sequential
const data = await codemode.get_data({ id: "123" });
const result = await codemode.process({ input: data.value });

// Parallel
const [a, b] = await Promise.all([
  codemode.task_a(),
  codemode.task_b(),
]);

return result;
\`\`\``;
const SEARCH_TOOL_DESCRIPTION = `Search available tools by keyword. Returns tool names, descriptions, and type signatures you can use with the \`code\` tool.

Use this to discover which \`codemode.*\` methods are available before writing code.`;
function applyDescriptionTemplate(template, vars) {
  let result = template;
  if (vars.types !== void 0) result = result.replace("{{types}}", vars.types);
  if (vars.count !== void 0) result = result.replaceAll("{{count}}", String(vars.count));
  return result;
}
function createCodemodeTools(tools, options) {
  if (options?.progressive) {
    return createProgressiveTools(tools, options);
  }
  return createStandardTools(tools, options);
}
function createStandardTools(tools, options) {
  const { typeDefinitions, toolNameMap } = generateTypesFromTools(tools);
  const template = options?.description || CODE_TOOL_DESCRIPTION_TEMPLATE;
  const description = applyDescriptionTemplate(template, {
    types: typeDefinitions,
    count: tools.length
  });
  const fns = buildDispatchFunctions(tools, toolNameMap);
  const toolNames = [...toolNameMap.keys()];
  const codeTool = buildCodeTool(description, fns, toolNames, options);
  return [codeTool];
}
function createProgressiveTools(tools, options) {
  const { entries, toolNameMap } = generateToolCatalog(tools);
  const template = options?.description || PROGRESSIVE_CODE_DESCRIPTION_TEMPLATE;
  const description = applyDescriptionTemplate(template, { count: tools.length });
  const fns = buildDispatchFunctions(tools, toolNameMap);
  const toolNames = [...toolNameMap.keys()];
  const searchTool = buildSearchTool(entries);
  const codeTool = buildCodeTool(description, fns, toolNames, options);
  return [searchTool, codeTool];
}
function buildSearchTool(entries) {
  return {
    name: "search",
    title: "Search Tools",
    description: SEARCH_TOOL_DESCRIPTION,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    inputSchema: {
      query: z.string().describe('Keywords to search for (e.g. "user", "list", "create todo")')
    },
    handler: async ({ query }) => {
      const matches = searchToolCatalog(entries, query);
      const text = formatSearchResults(matches, query, entries.length);
      return { content: [{ type: "text", text }] };
    }
  };
}
function buildCodeTool(description, fns, toolNames, options) {
  return {
    name: "code",
    title: "Code Mode",
    description,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false
    },
    inputSchema: {
      code: z.string().describe("JavaScript code to execute. Write the body of an async function.")
    },
    handler: async ({ code }) => {
      const result = await runExecute(code, fns, options);
      const logSuffix = formatLogs(result.logs);
      if (result.error) {
        return {
          isError: true,
          content: [{ type: "text", text: formatError(result.error, code, toolNames, logSuffix) }]
        };
      }
      let resultText;
      if (result.result === void 0 || result.result === null) {
        resultText = "No return value.";
      } else if (typeof result.result === "string") {
        resultText = result.result;
      } else {
        try {
          resultText = JSON.stringify(result.result);
        } catch {
          resultText = String(result.result);
        }
      }
      return {
        content: [{ type: "text", text: `${resultText}${logSuffix}` }]
      };
    }
  };
}
function formatLogs(logs) {
  return logs.length > 0 ? `

Console output:
${logs.join("\n")}` : "";
}
function formatError(error, code, toolNames, logOutput) {
  const codePreview = code.length > 500 ? `${code.slice(0, 500)}...` : code;
  return `Execution error: ${error}

Code that failed:
\`\`\`javascript
${codePreview}
\`\`\`

Available tools: ${toolNames.join(", ")}
Fix the code and try again in a single combined block.${logOutput}`;
}
function buildDispatchFunctions(tools, toolNameMap) {
  const fns = {};
  const toolsByName = /* @__PURE__ */ new Map();
  for (const tool of tools) {
    const { name } = enrichNameTitle({
      name: tool.name,
      title: tool.title,
      _meta: tool._meta,
      type: "tool"
    });
    toolsByName.set(name, tool);
  }
  for (const [sanitized, original] of toolNameMap) {
    const tool = toolsByName.get(original);
    if (!tool) continue;
    fns[sanitized] = async (input) => {
      const args = input ?? {};
      const rawResult = tool.inputSchema && Object.keys(tool.inputSchema).length > 0 ? await tool.handler(args, {}) : await tool.handler({});
      const result = normalizeToolResult(rawResult);
      if (result.isError) {
        const errorText = result.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n") ?? "Tool execution failed";
        return {
          __toolError: true,
          message: errorText,
          tool: sanitized,
          details: result.structuredContent ?? void 0
        };
      }
      if (result.structuredContent != null) {
        return result.structuredContent;
      }
      if (result.content) {
        const textContent = result.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
        try {
          return JSON.parse(textContent);
        } catch {
          return textContent;
        }
      }
      return result;
    };
  }
  return fns;
}

export { buildDispatchFunctions, createCodemodeTools, sanitizeToolName };
//# sourceMappingURL=index.mjs.map
