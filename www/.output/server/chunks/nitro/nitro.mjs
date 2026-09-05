import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import http, { Server as Server$1 } from 'node:http';
import https, { Server } from 'node:https';
import { EventEmitter } from 'node:events';
import { Buffer as Buffer$1 } from 'node:buffer';
import { promises, existsSync, mkdirSync } from 'node:fs';
import { resolve as resolve$1, dirname as dirname$1, join, sep, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { createRouterMatcher } from 'vue-router';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { getIcons } from '@iconify/utils';
import { consola } from 'consola';
import { SetLevelRequestSchema, LoggingLevelSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFile as readFile$1 } from 'node:fs/promises';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const IM_RE = /\?/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
const ENC_ENC_SLASH_RE = /%252f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function encodePath(text) {
  return encode(text).replace(HASH_RE, "%23").replace(IM_RE, "%3F").replace(ENC_ENC_SLASH_RE, "%2F").replace(AMPERSAND_RE, "%26").replace(PLUS_RE, "%2B");
}
function decode$1(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode$1(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const PROTOCOL_SCRIPT_RE = /^[\s\0]*(blob|data|javascript|vbscript):$/i;
const TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function isScriptProtocol(protocol) {
  return !!protocol && PROTOCOL_SCRIPT_RE.test(protocol);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/");
  }
  return TRAILING_SLASH_RE.test(input);
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
  if (!hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
  }
  const [s0, ...s] = path.split("?");
  const cleanPath = s0.endsWith("/") ? s0.slice(0, -1) : s0;
  return (cleanPath || "/") + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/") ? input : input + "/";
  }
  if (hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
    if (!path) {
      return fragment;
    }
  }
  const [s0, ...s] = path.split("?");
  return s0 + "/" + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    const nextChar = input[_base.length];
    if (!nextChar || nextChar === "/" || nextChar === "?") {
      return input;
    }
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const nextChar = input[_base.length];
  if (nextChar && nextChar !== "/" && nextChar !== "?") {
    return input;
  }
  const trimmed = input.slice(_base.length).replace(/^\/+/, "");
  return "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery$1(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}
function joinRelativeURL(..._input) {
  const JOIN_SEGMENT_SPLIT_RE = /\/(?!\/)/;
  const input = _input.filter(Boolean);
  const segments = [];
  let segmentsDepth = 0;
  for (const i of input) {
    if (!i || i === "/") {
      continue;
    }
    for (const [sindex, s] of i.split(JOIN_SEGMENT_SPLIT_RE).entries()) {
      if (!s || s === ".") {
        continue;
      }
      if (s === "..") {
        if (segments.length === 1 && hasProtocol(segments[0])) {
          continue;
        }
        segments.pop();
        segmentsDepth--;
        continue;
      }
      if (sindex === 1 && segments[segments.length - 1]?.endsWith(":/")) {
        segments[segments.length - 1] += "/" + s;
        continue;
      }
      segments.push(s);
      segmentsDepth++;
    }
  }
  let url = segments.join("/");
  if (segmentsDepth >= 0) {
    if (input[0]?.startsWith("/") && !url.startsWith("/")) {
      url = "/" + url;
    } else if (input[0]?.startsWith("./") && !url.startsWith("./")) {
      url = "./" + url;
    }
  } else {
    url = "../".repeat(-1 * segmentsDepth) + url;
  }
  if (input[input.length - 1]?.endsWith("/") && !url.endsWith("/")) {
    url += "/";
  }
  return url;
}
function isEqual$1(a, b, options = {}) {
  if (!options.trailingSlash) {
    a = withTrailingSlash(a);
    b = withTrailingSlash(b);
  }
  if (!options.leadingSlash) {
    a = withLeadingSlash(a);
    b = withLeadingSlash(b);
  }
  if (!options.encoding) {
    a = decode$1(a);
    b = decode$1(b);
  }
  return a === b;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

const NullObject = /* @__PURE__ */ (() => {
  const C = function() {
  };
  C.prototype = /* @__PURE__ */ Object.create(null);
  return C;
})();
function parse(str, options) {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }
  const obj = new NullObject();
  const opt = {};
  const dec = opt.decode || decode;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) {
      break;
    }
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (opt?.filter && !opt?.filter(key)) {
      index = endIdx + 1;
      continue;
    }
    if (void 0 === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.codePointAt(0) === 34) {
        val = val.slice(1, -1);
      }
      obj[key] = tryDecode(val, dec);
    }
    index = endIdx + 1;
  }
  return obj;
}
function decode(str) {
  return str.includes("%") ? decodeURIComponent(str) : str;
}
function tryDecode(str, decode2) {
  try {
    return decode2(str);
  } catch {
    return str;
  }
}

const fieldContentRegExp = /^[\u0009\u0020-\u007E\u0080-\u00FF]+$/;
function serialize$2(name, value, options) {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;
  if (typeof enc !== "function") {
    throw new TypeError("option encode is invalid");
  }
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError("argument name is invalid");
  }
  const encodedValue = enc(value);
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    throw new TypeError("argument val is invalid");
  }
  let str = name + "=" + encodedValue;
  if (void 0 !== opt.maxAge && opt.maxAge !== null) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }
    str += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError("option domain is invalid");
    }
    str += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError("option path is invalid");
    }
    str += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (!isDate(opt.expires) || Number.isNaN(opt.expires.valueOf())) {
      throw new TypeError("option expires is invalid");
    }
    str += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    str += "; HttpOnly";
  }
  if (opt.secure) {
    str += "; Secure";
  }
  if (opt.priority) {
    const priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
    switch (priority) {
      case "low": {
        str += "; Priority=Low";
        break;
      }
      case "medium": {
        str += "; Priority=Medium";
        break;
      }
      case "high": {
        str += "; Priority=High";
        break;
      }
      default: {
        throw new TypeError("option priority is invalid");
      }
    }
  }
  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true: {
        str += "; SameSite=Strict";
        break;
      }
      case "lax": {
        str += "; SameSite=Lax";
        break;
      }
      case "strict": {
        str += "; SameSite=Strict";
        break;
      }
      case "none": {
        str += "; SameSite=None";
        break;
      }
      default: {
        throw new TypeError("option sameSite is invalid");
      }
    }
  }
  if (opt.partitioned) {
    str += "; Partitioned";
  }
  return str;
}
function isDate(val) {
  return Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date;
}

function parseSetCookie(setCookieValue, options) {
  const parts = (setCookieValue || "").split(";").filter((str) => typeof str === "string" && !!str.trim());
  const nameValuePairStr = parts.shift() || "";
  const parsed = _parseNameValuePair(nameValuePairStr);
  const name = parsed.name;
  let value = parsed.value;
  try {
    value = options?.decode === false ? value : (options?.decode || decodeURIComponent)(value);
  } catch {
  }
  const cookie = {
    name,
    value
  };
  for (const part of parts) {
    const sides = part.split("=");
    const partKey = (sides.shift() || "").trimStart().toLowerCase();
    const partValue = sides.join("=");
    switch (partKey) {
      case "expires": {
        cookie.expires = new Date(partValue);
        break;
      }
      case "max-age": {
        cookie.maxAge = Number.parseInt(partValue, 10);
        break;
      }
      case "secure": {
        cookie.secure = true;
        break;
      }
      case "httponly": {
        cookie.httpOnly = true;
        break;
      }
      case "samesite": {
        cookie.sameSite = partValue;
        break;
      }
      default: {
        cookie[partKey] = partValue;
      }
    }
  }
  return cookie;
}
function _parseNameValuePair(nameValuePairStr) {
  let name = "";
  let value = "";
  const nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject$1(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject$1(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = { ...defaults };
  for (const key of Object.keys(baseObject)) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject$1(value) && isPlainObject$1(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function o(n){throw new Error(`${n} is not implemented yet!`)}let i$1 = class i extends EventEmitter{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}};let l$1 = class l extends EventEmitter{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),s&&s(),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return Promise.resolve()}};const c=class{allowHalfOpen=true;_destroy;constructor(e=new i$1,t=new l$1){Object.assign(this,e),Object.assign(this,t),this._destroy=m(e._destroy,t._destroy);}};function _(){return Object.assign(c.prototype,i$1.prototype),Object.assign(c.prototype,l$1.prototype),c}function m(...n){return function(...e){for(const t of n)t(...e);}}const g=_();class A extends g{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}}class y extends i$1{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}}function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}class w extends l$1{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}}const E=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R(n={}){const e=new E,t=Array.isArray(n)||H(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H(n){return typeof n?.entries=="function"}function v(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S=new Set([101,204,205,304]);async function b(n,e){const t=new y,r=new w(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C(n,e,t={}){try{const r=await b(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, void 0, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}

function getQuery(event) {
  return getQuery$1(event.path || "");
}
function getRouterParams(event, opts = {}) {
  let params = event.context.params || {};
  if (opts.decode) {
    params = { ...params };
    for (const key in params) {
      params[key] = decode$1(params[key]);
    }
  }
  return params;
}
function getRouterParam(event, name, opts = {}) {
  const params = getRouterParams(event, opts);
  return params[name];
}
function getMethod(event, defaultMethod = "GET") {
  return (event.node.req.method || defaultMethod).toUpperCase();
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
function getRequestHost$1(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.node.req.headers["x-forwarded-host"];
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost$1(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}

const RawBodySymbol = Symbol.for("h3RawBody");
const ParsedBodySymbol = Symbol.for("h3ParsedBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      if (_resolved instanceof FormData) {
        return new Response(_resolved).bytes().then((uint8arr) => Buffer.from(uint8arr));
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !/\bchunked\b/i.test(
    String(event.node.req.headers["transfer-encoding"] ?? "")
  )) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
async function readBody(event, options = {}) {
  const request = event.node.req;
  if (hasProp(request, ParsedBodySymbol)) {
    return request[ParsedBodySymbol];
  }
  const contentType = request.headers["content-type"] || "";
  const body = await readRawBody(event);
  let parsed;
  if (contentType === "application/json") {
    parsed = _parseJSON(body, options.strict ?? true);
  } else if (contentType.startsWith("application/x-www-form-urlencoded")) {
    parsed = _parseURLEncodedBody(body);
  } else if (contentType.startsWith("text/")) {
    parsed = body;
  } else {
    parsed = _parseJSON(body, options.strict ?? false);
  }
  request[ParsedBodySymbol] = parsed;
  return parsed;
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}
function _parseJSON(body = "", strict) {
  if (!body) {
    return void 0;
  }
  try {
    return destr(body, { strict });
  } catch {
    throw createError$1({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Invalid JSON body"
    });
  }
}
function _parseURLEncodedBody(body) {
  const form = new URLSearchParams(body);
  const parsedForm = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of form.entries()) {
    if (hasProp(parsedForm, key)) {
      if (!Array.isArray(parsedForm[key])) {
        parsedForm[key] = [parsedForm[key]];
      }
      parsedForm[key].push(value);
    } else {
      parsedForm[key] = value;
    }
  }
  return parsedForm;
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== void 0) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}

function getDistinctCookieKey(name, opts) {
  return [name, opts.domain || "", opts.path || "/"].join(";");
}

function parseCookies(event) {
  return parse(event.node.req.headers.cookie || "");
}
function getCookie(event, name) {
  return parseCookies(event)[name];
}
function setCookie(event, name, value, serializeOptions = {}) {
  if (!serializeOptions.path) {
    serializeOptions = { path: "/", ...serializeOptions };
  }
  const newCookie = serialize$2(name, value, serializeOptions);
  const currentCookies = splitCookiesString(
    event.node.res.getHeader("set-cookie")
  );
  if (currentCookies.length === 0) {
    event.node.res.setHeader("set-cookie", newCookie);
    return;
  }
  const newCookieKey = getDistinctCookieKey(name, serializeOptions);
  event.node.res.removeHeader("set-cookie");
  for (const cookie of currentCookies) {
    const parsed = parseSetCookie(cookie);
    const key = getDistinctCookieKey(parsed.name, parsed);
    if (key === newCookieKey) {
      continue;
    }
    event.node.res.appendHeader("set-cookie", cookie);
  }
  event.node.res.appendHeader("set-cookie", newCookie);
}
function deleteCookie(event, name, serializeOptions) {
  setCookie(event, name, "", {
    ...serializeOptions,
    maxAge: 0
  });
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function getResponseStatus(event) {
  return event.node.res.statusCode;
}
function getResponseStatusText(event) {
  return event.node.res.statusMessage;
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
const setHeader = setResponseHeader;
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function removeResponseHeader(event, name) {
  return event.node.res.removeHeader(name);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => void 0);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== void 0) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
    for (const [key, value] of entries) {
      if (value !== void 0) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : void 0;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _rawReqUrl = event.node.req.url || "/";
    const _reqPath = _decodePath(event._path || _rawReqUrl);
    event._path = _reqPath;
    const _needsRawUrl = _reqPath !== _rawReqUrl;
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _needsRawUrl ? layer.route.length > 1 ? _rawReqUrl.slice(layer.route.length) || "/" : _rawReqUrl : _layerPath;
      const val = await layer.handler(event);
      const _body = val === void 0 ? void 0 : await val;
      if (_body !== void 0) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, void 0);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, void 0);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, void 0)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, void 0, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, void 0, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function _decodePath(url) {
  const qIndex = url.indexOf("?");
  const path = qIndex === -1 ? url : url.slice(0, qIndex);
  const query = qIndex === -1 ? "" : url.slice(qIndex);
  const decodedPath = path.includes("%25") ? decodePath(path.replace(/%25/g, "%2525")) : decodePath(path);
  return decodedPath + query;
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === void 0 && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const s=globalThis.Headers,i=globalThis.AbortController,l=globalThis.fetch||(()=>{throw new Error("[node-fetch-native] Failed to fetch: `globalThis.fetch` is not available!")});

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  if (value instanceof FormData || value instanceof URLSearchParams) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (contentType === "text/event-stream") {
    return "stream";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
      if (!(context.options.headers instanceof Headers)) {
        context.options.headers = new Headers(
          context.options.headers || {}
          /* compat */
        );
      }
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        const contentType = context.options.headers.get("content-type");
        if (typeof context.options.body !== "string") {
          context.options.body = contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(
            context.options.body
          ).toString() : JSON.stringify(context.options.body);
        }
        if (!contentType) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return l;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return l(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch$1 = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s;
const AbortController = globalThis.AbortController || i;
const ofetch = createFetch({ fetch: fetch$1, Headers: Headers$1, AbortController });
const $fetch$1 = ofetch;

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.keys = nsStorage.getKeys;
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {
  ["i18n:04367822.json"]: {
    import: () => import('../raw/04367822.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"5d-KxjyyUpUgh0IzUnNNMUx+jRpPns\"","mtime":"2026-09-05T15:25:15.118Z"}
  },
  ["i18n:0b32e43e.json"]: {
    import: () => import('../raw/0b32e43e.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"f8-YafOs/Bk5DFYrfB4VhvxxJrhXQc\"","mtime":"2026-09-05T15:25:15.118Z"}
  },
  ["i18n:0b4a9867.json"]: {
    import: () => import('../raw/0b4a9867.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"2c-fGiOQZTIBMQd84haULKlSv/NiOY\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:1bf88aba.json"]: {
    import: () => import('../raw/1bf88aba.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"11f-YGn02YUIg8nNzV4BVjRTOrQ6km0\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:1cc9c2ef.json"]: {
    import: () => import('../raw/1cc9c2ef.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"667-nm4JcBVZHAtUQNaRsN5YueLpJI8\"","mtime":"2026-09-05T15:25:15.117Z"}
  },
  ["i18n:27c16556.json"]: {
    import: () => import('../raw/27c16556.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"2c-8Lc7z422uqYC8a+nrCafsY3qtAc\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:341972ef.json"]: {
    import: () => import('../raw/341972ef.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"704-+VgJkNu6R7Z9XbWbigryp2nAJvU\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:3490030b.json"]: {
    import: () => import('../raw/3490030b.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"63-Un0S50qjbkDrTsEdZ0XeKSpWOdQ\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:3c19bf57.json"]: {
    import: () => import('../raw/3c19bf57.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"72-W+jd7JyYqomJTpPlIpXxgjiuNXQ\"","mtime":"2026-09-05T15:25:15.117Z"}
  },
  ["i18n:3f4a84e8.json"]: {
    import: () => import('../raw/3f4a84e8.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"11b-cUKqtoQoxnTVTQSRRdHsZP4kHIM\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:41b41db8.json"]: {
    import: () => import('../raw/41b41db8.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"117-bkhHdpnjVOqgvf82Ljpu3SjzjVc\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:4e063045.json"]: {
    import: () => import('../raw/4e063045.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"30-qDQTa+vkAuBB2bWDoVhGutiFCl0\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:538d5ecc.json"]: {
    import: () => import('../raw/538d5ecc.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"2d-UmEs2xC1RJ1ZTzd6y2jXdGp3B0Y\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:543a10e2.json"]: {
    import: () => import('../raw/543a10e2.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"2f-8lgI88Mm0cfT9wjbsKpDQJWDmko\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:55212f98.json"]: {
    import: () => import('../raw/55212f98.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"70a-Euy9O7gTRmqX3Ai3/eL8/gWyjSg\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:557a3b8a.json"]: {
    import: () => import('../raw/557a3b8a.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"39-fB4/i+j60v4EqdnNIjiA6korkVA\"","mtime":"2026-09-05T15:25:15.118Z"}
  },
  ["i18n:5e7c2339.json"]: {
    import: () => import('../raw/5e7c2339.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"2c-tzmr91XH9rOWthTbP0Ze+T0yct0\"","mtime":"2026-09-05T15:25:15.118Z"}
  },
  ["i18n:66d884d3.json"]: {
    import: () => import('../raw/66d884d3.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"96-2zaH4Ob8/3tcFEO1YUefsWpEOE0\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:71354937.json"]: {
    import: () => import('../raw/71354937.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"6e9-dFCOPHWugLaBn/JpHO06LeprOY8\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:784641fe.json"]: {
    import: () => import('../raw/784641fe.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"76-YgNkWoW/JX0bKeGtZv473MRIHT8\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:84c1d671.json"]: {
    import: () => import('../raw/84c1d671.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"92-xplmuexIlLNTe78e2QMlO4+DKeE\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:8604f29b.json"]: {
    import: () => import('../raw/8604f29b.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"8d-V0T4ewx+YQI7+XQlAepWndrgtpY\"","mtime":"2026-09-05T15:25:15.118Z"}
  },
  ["i18n:8776d6f2.json"]: {
    import: () => import('../raw/8776d6f2.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"60-0YWU+pGbZsFmioR/CZJiLo5yry0\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:88845ae4.json"]: {
    import: () => import('../raw/88845ae4.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"31-RhtdS+9YJ47pVWkUxGaUTu5VAwE\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:9b7cf1af.json"]: {
    import: () => import('../raw/9b7cf1af.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"2b-80R8ndDO/IIKNP//7Xdcx7R16mQ\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:a1f3dd56.json"]: {
    import: () => import('../raw/a1f3dd56.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"29-+1+TU+TwLwRT0/a/RH5jufhbByU\"","mtime":"2026-09-05T15:25:15.118Z"}
  },
  ["i18n:a89a20d9.json"]: {
    import: () => import('../raw/a89a20d9.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"32-i1cmwLnm6QH298XrhMe/Z5/wLeQ\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:aa47aaec.json"]: {
    import: () => import('../raw/aa47aaec.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"30-i/OTW5yXU/7FOnRzs2S9hs98sro\"","mtime":"2026-09-05T15:25:15.117Z"}
  },
  ["i18n:b6dd698b.json"]: {
    import: () => import('../raw/b6dd698b.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"2a-Wd1n2+ywuZUFPRHKV0dMlcCl4mk\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:becdb054.json"]: {
    import: () => import('../raw/becdb054.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"32-d/ltaDCuu4anFMp8j39zHlLD5U4\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:c665ac72.json"]: {
    import: () => import('../raw/c665ac72.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"69-MXXnG0r6mb4hlDAXLUhlMKXs+mU\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:c8a19e3d.json"]: {
    import: () => import('../raw/c8a19e3d.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"31-eo7OjUw3FwMUgrr+L0GzJXGhkBs\"","mtime":"2026-09-05T15:25:15.118Z"}
  },
  ["i18n:c988819d.json"]: {
    import: () => import('../raw/c988819d.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"5c-67L3aDu9PpSbn6ZSrXRS3zQBKYA\"","mtime":"2026-09-05T15:25:15.123Z"}
  },
  ["i18n:d0981e13.json"]: {
    import: () => import('../raw/d0981e13.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"2e-ZaTScjUeR9UTrb9wIANcVbyVUCc\"","mtime":"2026-09-05T15:25:15.123Z"}
  },
  ["i18n:df933674.json"]: {
    import: () => import('../raw/df933674.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"6e-cLVJKYYh3BSjLo/RgIu4sYgvxCg\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:e42a6267.json"]: {
    import: () => import('../raw/e42a6267.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"61-9mYpNXjnBR6LN2iYhuWRrka6ihk\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:e4e22c19.json"]: {
    import: () => import('../raw/e4e22c19.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"f5-7IzRTuKuEfdjPqw6n05DrIejdp0\"","mtime":"2026-09-05T15:25:15.123Z"}
  },
  ["i18n:e6b409a0.json"]: {
    import: () => import('../raw/e6b409a0.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"117-2WTYQz3IYY/CQCS/ryhGvj0yH6I\"","mtime":"2026-09-05T15:25:15.118Z"}
  },
  ["i18n:f1343414.json"]: {
    import: () => import('../raw/f1343414.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"76-CFEOMej1oU46orOe+kSao/nG7Uo\"","mtime":"2026-09-05T15:25:15.118Z"}
  },
  ["i18n:f5068ad8.json"]: {
    import: () => import('../raw/f5068ad8.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"93-YaPwp2fbpvt9H039Wuw07kyygT0\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:f589c5a6.json"]: {
    import: () => import('../raw/f589c5a6.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"55-dCFMis9v2pOnRZL/ulvv3bfM0Ho\"","mtime":"2026-09-05T15:25:15.117Z"}
  },
  ["i18n:f60e371f.json"]: {
    import: () => import('../raw/f60e371f.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"187-lndAdXeKEVC5kQu1KUy56KMwHWA\"","mtime":"2026-09-05T15:25:15.119Z"}
  },
  ["i18n:f8bdfe7a.json"]: {
    import: () => import('../raw/f8bdfe7a.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"85-knByLYAbxOeEy5wrGBcHv6J1BBo\"","mtime":"2026-09-05T15:25:15.117Z"}
  },
  ["i18n:fce8bca2.json"]: {
    import: () => import('../raw/fce8bca2.mjs').then(r => r.default || r),
    meta: {"type":"application/json","etag":"\"6e2-FhPPzt+sgdnHQs81pmZOUstc7RI\"","mtime":"2026-09-05T15:25:15.118Z"}
  }
};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage$1 = createStorage({});

storage$1.mount('/assets', assets$1);

storage$1.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage$1, base) : storage$1;
}

function serialize$1(input) {
	if (typeof input === "string") return `'${input}'`;
	return new Serializer().serialize(input);
}
const asciiOrder = " _-,;:!?.'\"()[]{}@*/\\&#%`^+<=>|~$0123456789abcdefghijklmnopqrstuvwxyz";
const asciiWeights = /*@__PURE__*/ (function() {
	const weights = /* @__PURE__ */ new Uint8Array(128);
	for (let i = 0; i < 69; i++) weights[asciiOrder.charCodeAt(i)] = i + 1;
	for (let code = 65; code <= 90; code++) weights[code] = weights[code + 32];
	return weights;
})();
function compareStrings(a, b) {
	if (a === b) return 0;
	const length = Math.min(a.length, b.length);
	let tieBreaker = 0;
	for (let i = 0; i < length; i++) {
		const codeA = a.charCodeAt(i);
		const codeB = b.charCodeAt(i);
		if (codeA === codeB) continue;
		const weightA = codeA < 128 && asciiWeights[codeA] ? asciiWeights[codeA] : codeA + 128;
		const weightB = codeB < 128 && asciiWeights[codeB] ? asciiWeights[codeB] : codeB + 128;
		if (weightA !== weightB) return weightA < weightB ? -1 : 1;
		if (tieBreaker === 0) tieBreaker = codeA > codeB ? -1 : 1;
	}
	if (a.length !== b.length) return a.length < b.length ? -1 : 1;
	return tieBreaker;
}
const Serializer = /*@__PURE__*/ (function() {
	class Serializer {
		#context = /* @__PURE__ */ new Map();
		compare(a, b) {
			const typeA = typeof a;
			const typeB = typeof b;
			if (typeA === "string" && typeB === "string") return compareStrings(a, b);
			if (typeA === "number" && typeB === "number") return a - b;
			return compareStrings(this.serialize(a, true), this.serialize(b, true));
		}
		serialize(value, noQuotes) {
			if (value === null) return "null";
			switch (typeof value) {
				case "string": return noQuotes ? value : `'${value}'`;
				case "bigint": return `${value}n`;
				case "object": return this.$object(value);
				case "function": return this.$function(value);
			}
			return String(value);
		}
		serializeObject(object) {
			const objString = Object.prototype.toString.call(object);
			if (objString !== "[object Object]") return this.serializeBuiltInType(objString.length < 10 ? `unknown:${objString}` : objString.slice(8, -1), object);
			const constructor = object.constructor;
			const objName = constructor === Object || constructor === void 0 ? "" : constructor.name;
			if (objName !== "" && globalThis[objName] === constructor) return this.serializeBuiltInType(objName, object);
			if ("toJSON" in object && typeof object.toJSON === "function") {
				const json = object.toJSON();
				return objName + (json !== null && typeof json === "object" ? this.$object(json) : `(${this.serialize(json)})`);
			}
			const keys = Object.keys(object).sort(compareStrings);
			let content = `${objName}{`;
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				content += `${key}:${this.serialize(object[key])}`;
				if (i < keys.length - 1) content += ",";
			}
			return content + "}";
		}
		serializeBuiltInType(type, object) {
			const handler = this["$" + type];
			if (handler) return handler.call(this, object);
			if (typeof object.entries === "function") return this.serializeObjectEntries(type, object.entries());
			throw new Error(`Cannot serialize ${type}`);
		}
		serializeObjectEntries(type, entries) {
			const sortedEntries = Array.from(entries).sort((a, b) => this.compare(a[0], b[0]));
			let content = `${type}{`;
			for (let i = 0; i < sortedEntries.length; i++) {
				const [key, value] = sortedEntries[i];
				content += `${this.serialize(key, true)}:${this.serialize(value)}`;
				if (i < sortedEntries.length - 1) content += ",";
			}
			return content + "}";
		}
		$object(object) {
			let content = this.#context.get(object);
			if (content === void 0) {
				this.#context.set(object, `#${this.#context.size}`);
				content = this.serializeObject(object);
				this.#context.set(object, content);
			}
			return content;
		}
		$function(fn) {
			const fnStr = Function.prototype.toString.call(fn);
			if (fnStr.slice(-15) === "[native code] }") return `${fn.name || ""}()[native]`;
			return `${fn.name}(${fn.length})${fnStr.replace(/\s*\n\s*/g, "")}`;
		}
		$Array(arr) {
			let content = "[";
			for (let i = 0; i < arr.length; i++) {
				content += this.serialize(arr[i]);
				if (i < arr.length - 1) content += ",";
			}
			return content + "]";
		}
		$Date(date) {
			try {
				return `Date(${date.toISOString()})`;
			} catch {
				return `Date(null)`;
			}
		}
		$ArrayBuffer(arr) {
			return `ArrayBuffer[${new Uint8Array(arr).join(",")}]`;
		}
		$Set(set) {
			return `Set${this.$Array(Array.from(set).sort((a, b) => this.compare(a, b)))}`;
		}
		$Map(map) {
			return this.serializeObjectEntries("Map", map.entries());
		}
	}
	for (const type of [
		"Error",
		"RegExp",
		"URL"
	]) Serializer.prototype["$" + type] = function(val) {
		return `${type}(${val})`;
	};
	for (const type of [
		"Int8Array",
		"Uint8Array",
		"Uint8ClampedArray",
		"Int16Array",
		"Uint16Array",
		"Int32Array",
		"Uint32Array",
		"Float32Array",
		"Float64Array"
	]) Serializer.prototype["$" + type] = function(arr) {
		return `${type}[${arr.join(",")}]`;
	};
	for (const type of ["BigInt64Array", "BigUint64Array"]) Serializer.prototype["$" + type] = function(arr) {
		return `${type}[${arr.join("n,")}${arr.length > 0 ? "n" : ""}]`;
	};
	return Serializer;
})();
function isEqual(object1, object2) {
	if (object1 === object2) return true;
	if (serialize$1(object1) === serialize$1(object2)) return true;
	return false;
}

const fastHash = /*@__PURE__*/ (() => globalThis.process?.getBuiltinModule?.("crypto")?.hash)();
const algorithm = "sha256";
const encoding = "base64url";
function digest(data) {
	if (fastHash) return fastHash(algorithm, data, encoding);
	const h = createHash(algorithm).update(data);
	return globalThis.process?.versions?.webcontainer ? h.digest().toString(encoding) : h.digest(encoding);
}

function hash$1(input) {
	return digest(serialize$1(input));
}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const inlineAppConfig = {};



const appConfig = defuFn(inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function upperFirst(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : "";
}
function pascalCase(str, opts) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => upperFirst(opts?.normalize ? p.toLowerCase() : p)).join("") : "";
}
function kebabCase$1(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner ?? "-") : "";
}
function snakeCase(str) {
  return kebabCase$1(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/",
    "buildId": "6d7065f5-cf70-4bcb-929b-8527688103e6",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false
      },
      "/__nuxt_content/**": {
        "robots": false,
        "cache": false
      },
      "/__nuxt_content/docs_duxt/sql_dump.txt": {
        "prerender": true
      },
      "/__nuxt_content/docs_workflows/sql_dump.txt": {
        "prerender": true
      },
      "/__nuxt_content/docs_workflows_v0_7_0/sql_dump.txt": {
        "prerender": true
      },
      "/_nuxt/builds/meta/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
      "/_nuxt/builds/**": {
        "headers": {
          "cache-control": "public, max-age=1, immutable"
        }
      },
      "/_nuxt/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    }
  },
  "public": {
    "mdc": {
      "components": {
        "prose": true,
        "map": {},
        "customElements": []
      },
      "headings": {
        "anchorLinks": {
          "h1": false,
          "h2": true,
          "h3": true,
          "h4": true,
          "h5": false,
          "h6": false
        }
      },
      "highlight": {
        "noApiRoute": true,
        "theme": {
          "default": "github-light",
          "dark": "github-dark"
        },
        "langs": [
          "bash",
          "css",
          "diff",
          "html",
          "json",
          "js",
          "jsonc",
          "md",
          "mdc",
          "php",
          "sh",
          "ts",
          "vue",
          "yaml"
        ],
        "highlighter": "shiki",
        "shikiEngine": "oniguruma"
      }
    },
    "content": {
      "wsUrl": ""
    },
    "i18n": {
      "baseUrl": "",
      "defaultLocale": "en-GB",
      "rootRedirect": "",
      "redirectStatusCode": 302,
      "skipSettingLocaleOnNavigate": false,
      "locales": [
        {
          "code": "en-GB",
          "language": "en-GB",
          "name": "English (UK)",
          "domains": [],
          "defaultForDomains": []
        },
        {
          "code": "en-US",
          "language": "en-US",
          "name": "English (US)",
          "domains": [],
          "defaultForDomains": []
        },
        {
          "code": "de-DE",
          "language": "de-DE",
          "name": "Deutsch",
          "domains": [],
          "defaultForDomains": []
        },
        {
          "code": "es-ES",
          "language": "es-ES",
          "name": "Español",
          "domains": [],
          "defaultForDomains": []
        },
        {
          "code": "fr-FR",
          "language": "fr-FR",
          "name": "Français",
          "domains": [],
          "defaultForDomains": []
        },
        {
          "code": "pt-PT",
          "language": "pt-PT",
          "name": "Português",
          "domains": [],
          "defaultForDomains": []
        },
        {
          "code": "pt-BR",
          "language": "pt-BR",
          "name": "Português (Brasil)",
          "domains": [],
          "defaultForDomains": []
        }
      ],
      "detectBrowserLanguage": {
        "alwaysRedirect": false,
        "cookieCrossOrigin": false,
        "cookieDomain": "",
        "cookieKey": "duxt_locale",
        "cookieSecure": true,
        "fallbackLocale": "en-GB",
        "redirectOn": "root",
        "useCookie": true
      },
      "experimental": {
        "localeDetector": "",
        "typedPages": true,
        "typedOptionsAndMessages": false,
        "alternateLinkCanonicalQueries": true,
        "devCache": false,
        "cacheLifetime": "",
        "stripMessagesPayload": false,
        "preload": false,
        "strictSeo": false,
        "nitroContextDetection": true,
        "httpCacheDuration": 10,
        "compactRoutes": false,
        "prerenderMessages": false,
        "optimizeMessageBundling": true
      },
      "domainLocales": {
        "en-GB": {
          "domain": ""
        },
        "en-US": {
          "domain": ""
        },
        "de-DE": {
          "domain": ""
        },
        "es-ES": {
          "domain": ""
        },
        "fr-FR": {
          "domain": ""
        },
        "pt-PT": {
          "domain": ""
        },
        "pt-BR": {
          "domain": ""
        }
      }
    }
  },
  "icon": {
    "serverKnownCssClasses": []
  },
  "content": {
    "databaseVersion": "v3.5.0",
    "version": "3.16.0",
    "database": {
      "type": "sqlite",
      "filename": "./contents.sqlite"
    },
    "localDatabase": {
      "type": "sqlite",
      "filename": "/root/projects/comGithub/kirchDev/duxt/www/.data/content/contents.sqlite"
    },
    "integrityCheck": true
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze$1(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  applyEnv(runtimeConfig, envOptions);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
_deepFreeze$1(klona(appConfig));
function _deepFreeze$1(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze$1(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());

const nitroAsyncContext = getContext("nitro-app", {
  asyncContext: false,
  AsyncLocalStorage: void 0
});
function useEvent() {
  try {
    return nitroAsyncContext.use().event;
  } catch {
    const hint = "Enable the experimental flag using `experimental.asyncContext: true`.";
    throw createError$1({
      message: `Nitro request context is not available. ${hint}`
    });
  }
}

function isPathInScope(pathname, base) {
  let canonical;
  try {
    const pre = pathname.replace(/%2f/gi, "/").replace(/%5c/gi, "\\");
    canonical = new URL(pre, "http://_").pathname;
  } catch {
    return false;
  }
  return !base || canonical === base || canonical.startsWith(base + "/");
}

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

//#region src/runtime/utils/error.ts
/**
* Nitro internal functions extracted from https://github.com/nitrojs/nitro/blob/v2/src/runtime/internal/utils.ts
*/
function isJsonRequest(event) {
	if (hasReqHeader(event, "accept", "text/html")) return false;
	return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function hasReqHeader(event, name, includes) {
	const value = getRequestHeader(event, name);
	return !!(value && typeof value === "string" && value.toLowerCase().includes(includes));
}

//#region src/runtime/handlers/error.ts
var error_default = async function errorhandler(error, event, { defaultHandler }) {
	if (event.handled || isJsonRequest(event)) return;
	const defaultRes = await defaultHandler(error, event, { json: true });
	const status = error.status || error.statusCode || 500;
	if (status === 404 && defaultRes.status === 302) {
		setResponseHeaders(event, defaultRes.headers);
		setResponseStatus(event, defaultRes.status, defaultRes.statusText);
		return send(event, JSON.stringify(defaultRes.body, null, 2));
	}
	const errorObject = defaultRes.body;
	const url = new URL(errorObject.url);
	errorObject.url = withoutBase(url.pathname, useRuntimeConfig(event).app.baseURL) + url.search + url.hash;
	errorObject.message = error.unhandled ? errorObject.message || "Server Error" : error.message || errorObject.message || "Server Error";
	errorObject.data ||= error.data;
	errorObject.statusText ||= error.statusText || error.statusMessage;
	delete defaultRes.headers["content-type"];
	delete defaultRes.headers["content-security-policy"];
	setResponseHeaders(event, defaultRes.headers);
	const reqHeaders = getRequestHeaders(event);
	const res = event.path.startsWith("/__nuxt_error") || !!reqHeaders["x-nuxt-error"] ? null : await useNitroApp().localFetch(withQuery(joinURL(useRuntimeConfig(event).app.baseURL, "/__nuxt_error"), errorObject), {
		headers: {
			...reqHeaders,
			"x-nuxt-error": "true"
		},
		redirect: "manual"
	}).catch(() => null);
	if (event.handled) return;
	if (!res) {
		const { template } = await import('../_/error-500.mjs');
		setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
		return send(event, template(errorObject));
	}
	const html = await res.text();
	for (const [header, value] of res.headers.entries()) {
		if (header === "set-cookie") {
			appendResponseHeader(event, header, value);
			continue;
		}
		setResponseHeader(event, header, value);
	}
	setResponseStatus(event, res.status && res.status !== 200 ? res.status : defaultRes.status, res.statusText || defaultRes.statusText);
	return send(event, html);
};

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$1 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    setResponseHeaders(event, res.headers);
    setResponseStatus(event, res.status, res.statusText);
    return send(event, JSON.stringify(res.body, null, 2));
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.method}] ${url}
`, error);
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  setResponseStatus(event, statusCode, statusMessage);
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    statusCode,
    statusMessage,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}

const errorHandlers = [error_default, errorHandler$1];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

/*!
  * shared v11.4.10
  * (c) 2026 kazuya kawaguchi
  * Released under the MIT License.
  */
/**
 * Original Utilities
 * written by kazuya kawaguchi
 */
const _create = Object.create;
const create = (obj = null) => _create(obj);
/* eslint-enable */
/**
 * Useful Utilities By Evan you
 * Modified by kazuya kawaguchi
 * MIT License
 * https://github.com/vuejs/vue-next/blob/master/packages/shared/src/index.ts
 * https://github.com/vuejs/vue-next/blob/master/packages/shared/src/codeframe.ts
 */
const isArray = Array.isArray;
const isFunction = (val) => typeof val === 'function';
const isString = (val) => typeof val === 'string';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isObject = (val) => val !== null && typeof val === 'object';
const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);

const isNotObjectOrIsArray = (val) => !isObject(val) || isArray(val);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepCopy(src, des) {
    // src and des should both be objects, and none of them can be a array
    if (isNotObjectOrIsArray(src) || isNotObjectOrIsArray(des)) {
        throw new Error('Invalid value');
    }
    const stack = [{ src, des }];
    while (stack.length) {
        const { src, des } = stack.pop();
        // using `Object.keys` which skips prototype properties
        Object.keys(src).forEach(key => {
            if (key === '__proto__') {
                return;
            }
            const value = src[key];
            if (isArray(value)) {
                // replace arrays instead of merging them, without retaining source references
                const copied = [];
                copied.length = value.length;
                des[key] = copied;
                stack.push({ src: value, des: copied });
            }
            else if (isObject(value)) {
                if (!isObject(des[key]) || isArray(des[key])) {
                    des[key] = create();
                }
                stack.push({ src: value, des: des[key] });
            }
            else {
                des[key] = value;
            }
        });
    }
}

const __nuxtMock = { runWithContext: async (fn) => await fn() };
function cloneDeep(value) {
  if (value == null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneDeep);
  }
  const out = create(null);
  for (const key of Object.keys(value)) {
    out[key] = cloneDeep(value[key]);
  }
  return out;
}
const merger = createDefu((obj, key, value) => {
  if (key === "messages" || key === "datetimeFormats" || key === "numberFormats") {
    obj[key] ??= create(null);
    deepCopy(value, obj[key]);
    return true;
  }
});
async function loadVueI18nOptions(vueI18nConfigs) {
  const nuxtApp = __nuxtMock;
  let vueI18nOptions = { messages: create(null) };
  for (const configFile of vueI18nConfigs) {
    const resolver = await configFile().then((x) => isModule(x) ? x.default : x);
    const resolved = isFunction(resolver) ? await nuxtApp.runWithContext(() => resolver()) : resolver;
    vueI18nOptions = merger(create(null), resolved, vueI18nOptions);
  }
  vueI18nOptions.fallbackLocale ??= false;
  return vueI18nOptions;
}
const isModule = (val) => toTypeString(val) === "[object Module]";
async function getLocaleMessages(locale, loader) {
  const nuxtApp = __nuxtMock;
  try {
    const getter = await nuxtApp.runWithContext(loader.load).then((x) => isModule(x) ? x.default : x);
    return isFunction(getter) ? await nuxtApp.runWithContext(() => getter(locale)) : getter;
  } catch (e) {
    throw new Error(`Failed loading locale (${locale}): ` + e.message, { cause: e });
  }
}
async function getLocaleMessagesMerged(locale, loaders = []) {
  const nuxtApp = __nuxtMock;
  const messages = await Promise.all(
    loaders.map((loader) => nuxtApp.runWithContext(() => getLocaleMessages(locale, loader)))
  );
  const merged = {};
  for (const message of messages) {
    deepCopy(message, merged);
  }
  return merged;
}

const parsed = /* @__PURE__ */ new Map();
function readI18nAsset(key) {
  if (!parsed.has(key)) {
    const promise = useStorage("assets/i18n").getItemRaw(key).then((raw) => {
      if (raw == null) {
        throw new Error(`Missing messages asset '${key}' - the server build may be stale, try rebuilding.`);
      }
      return JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    });
    parsed.set(key, promise);
    promise.catch(() => parsed.delete(key));
  }
  return parsed.get(key);
}

const config_i18n_46config_46ts_4bf70daa = () => ({
  legacy: false,
  fallbackLocale: "en-GB"
});

// @ts-nocheck
const localeCodes =  [
  "en-GB",
  "en-US",
  "de-DE",
  "es-ES",
  "fr-FR",
  "pt-PT",
  "pt-BR"
];
const localeLoaders = {
  "en-GB": [
    {
      key: "locale_code_46json_f589c5a6",
      load: () => readI18nAsset("f589c5a6.json"),
      cache: true
    },
    {
      key: "locale_defaults_46json_1cc9c2ef",
      load: () => readI18nAsset("1cc9c2ef.json"),
      cache: true
    },
    {
      key: "locale_error_46json_3c19bf57",
      load: () => readI18nAsset("3c19bf57.json"),
      cache: true
    },
    {
      key: "locale_locale_46json_aa47aaec",
      load: () => readI18nAsset("aa47aaec.json"),
      cache: true
    },
    {
      key: "locale_nav_46json_f8bdfe7a",
      load: () => readI18nAsset("f8bdfe7a.json"),
      cache: true
    },
    {
      key: "locale_search_46json_0b32e43e",
      load: () => readI18nAsset("0b32e43e.json"),
      cache: true
    },
    {
      key: "locale_theme_46json_5e7c2339",
      load: () => readI18nAsset("5e7c2339.json"),
      cache: true
    },
    {
      key: "locale_toc_46json_a1f3dd56",
      load: () => readI18nAsset("a1f3dd56.json"),
      cache: true
    }
  ],
  "en-US": [
    {
      key: "locale_code_46json_f589c5a6",
      load: () => readI18nAsset("f589c5a6.json"),
      cache: true
    },
    {
      key: "locale_defaults_46json_1cc9c2ef",
      load: () => readI18nAsset("1cc9c2ef.json"),
      cache: true
    },
    {
      key: "locale_error_46json_3c19bf57",
      load: () => readI18nAsset("3c19bf57.json"),
      cache: true
    },
    {
      key: "locale_locale_46json_aa47aaec",
      load: () => readI18nAsset("aa47aaec.json"),
      cache: true
    },
    {
      key: "locale_nav_46json_f8bdfe7a",
      load: () => readI18nAsset("f8bdfe7a.json"),
      cache: true
    },
    {
      key: "locale_search_46json_0b32e43e",
      load: () => readI18nAsset("0b32e43e.json"),
      cache: true
    },
    {
      key: "locale_theme_46json_5e7c2339",
      load: () => readI18nAsset("5e7c2339.json"),
      cache: true
    },
    {
      key: "locale_toc_46json_a1f3dd56",
      load: () => readI18nAsset("a1f3dd56.json"),
      cache: true
    }
  ],
  "de-DE": [
    {
      key: "locale_code_46json_04367822",
      load: () => readI18nAsset("04367822.json"),
      cache: true
    },
    {
      key: "locale_defaults_46json_fce8bca2",
      load: () => readI18nAsset("fce8bca2.json"),
      cache: true
    },
    {
      key: "locale_error_46json_f1343414",
      load: () => readI18nAsset("f1343414.json"),
      cache: true
    },
    {
      key: "locale_locale_46json_c8a19e3d",
      load: () => readI18nAsset("c8a19e3d.json"),
      cache: true
    },
    {
      key: "locale_nav_46json_8604f29b",
      load: () => readI18nAsset("8604f29b.json"),
      cache: true
    },
    {
      key: "locale_search_46json_e6b409a0",
      load: () => readI18nAsset("e6b409a0.json"),
      cache: true
    },
    {
      key: "locale_theme_46json_557a3b8a",
      load: () => readI18nAsset("557a3b8a.json"),
      cache: true
    },
    {
      key: "locale_toc_46json_538d5ecc",
      load: () => readI18nAsset("538d5ecc.json"),
      cache: true
    }
  ],
  "es-ES": [
    {
      key: "locale_code_46json_3490030b",
      load: () => readI18nAsset("3490030b.json"),
      cache: true
    },
    {
      key: "locale_defaults_46json_341972ef",
      load: () => readI18nAsset("341972ef.json"),
      cache: true
    },
    {
      key: "locale_error_46json_df933674",
      load: () => readI18nAsset("df933674.json"),
      cache: true
    },
    {
      key: "locale_locale_46json_becdb054",
      load: () => readI18nAsset("becdb054.json"),
      cache: true
    },
    {
      key: "locale_nav_46json_84c1d671",
      load: () => readI18nAsset("84c1d671.json"),
      cache: true
    },
    {
      key: "locale_search_46json_3f4a84e8",
      load: () => readI18nAsset("3f4a84e8.json"),
      cache: true
    },
    {
      key: "locale_theme_46json_543a10e2",
      load: () => readI18nAsset("543a10e2.json"),
      cache: true
    },
    {
      key: "locale_toc_46json_27c16556",
      load: () => readI18nAsset("27c16556.json"),
      cache: true
    }
  ],
  "fr-FR": [
    {
      key: "locale_code_46json_8776d6f2",
      load: () => readI18nAsset("8776d6f2.json"),
      cache: true
    },
    {
      key: "locale_defaults_46json_55212f98",
      load: () => readI18nAsset("55212f98.json"),
      cache: true
    },
    {
      key: "locale_error_46json_784641fe",
      load: () => readI18nAsset("784641fe.json"),
      cache: true
    },
    {
      key: "locale_locale_46json_a89a20d9",
      load: () => readI18nAsset("a89a20d9.json"),
      cache: true
    },
    {
      key: "locale_nav_46json_f5068ad8",
      load: () => readI18nAsset("f5068ad8.json"),
      cache: true
    },
    {
      key: "locale_search_46json_1bf88aba",
      load: () => readI18nAsset("1bf88aba.json"),
      cache: true
    },
    {
      key: "locale_theme_46json_88845ae4",
      load: () => readI18nAsset("88845ae4.json"),
      cache: true
    },
    {
      key: "locale_toc_46json_9b7cf1af",
      load: () => readI18nAsset("9b7cf1af.json"),
      cache: true
    }
  ],
  "pt-PT": [
    {
      key: "locale_code_46json_e42a6267",
      load: () => readI18nAsset("e42a6267.json"),
      cache: true
    },
    {
      key: "locale_defaults_46json_71354937",
      load: () => readI18nAsset("71354937.json"),
      cache: true
    },
    {
      key: "locale_error_46json_c665ac72",
      load: () => readI18nAsset("c665ac72.json"),
      cache: true
    },
    {
      key: "locale_locale_46json_4e063045",
      load: () => readI18nAsset("4e063045.json"),
      cache: true
    },
    {
      key: "locale_nav_46json_66d884d3",
      load: () => readI18nAsset("66d884d3.json"),
      cache: true
    },
    {
      key: "locale_search_46json_41b41db8",
      load: () => readI18nAsset("41b41db8.json"),
      cache: true
    },
    {
      key: "locale_theme_46json_0b4a9867",
      load: () => readI18nAsset("0b4a9867.json"),
      cache: true
    },
    {
      key: "locale_toc_46json_b6dd698b",
      load: () => readI18nAsset("b6dd698b.json"),
      cache: true
    }
  ],
  "pt-BR": [
    {
      key: "locale_code_46json_e42a6267",
      load: () => readI18nAsset("e42a6267.json"),
      cache: true
    },
    {
      key: "locale_defaults_46json_71354937",
      load: () => readI18nAsset("71354937.json"),
      cache: true
    },
    {
      key: "locale_error_46json_c665ac72",
      load: () => readI18nAsset("c665ac72.json"),
      cache: true
    },
    {
      key: "locale_locale_46json_4e063045",
      load: () => readI18nAsset("4e063045.json"),
      cache: true
    },
    {
      key: "locale_nav_46json_66d884d3",
      load: () => readI18nAsset("66d884d3.json"),
      cache: true
    },
    {
      key: "locale_search_46json_41b41db8",
      load: () => readI18nAsset("41b41db8.json"),
      cache: true
    },
    {
      key: "locale_theme_46json_0b4a9867",
      load: () => readI18nAsset("0b4a9867.json"),
      cache: true
    },
    {
      key: "locale_toc_46json_b6dd698b",
      load: () => readI18nAsset("b6dd698b.json"),
      cache: true
    },
    {
      key: "locale_defaults_46json_f60e371f",
      load: () => readI18nAsset("f60e371f.json"),
      cache: true
    },
    {
      key: "locale_error_46json_d0981e13",
      load: () => readI18nAsset("d0981e13.json"),
      cache: true
    },
    {
      key: "locale_nav_46json_c988819d",
      load: () => readI18nAsset("c988819d.json"),
      cache: true
    },
    {
      key: "locale_search_46json_e4e22c19",
      load: () => readI18nAsset("e4e22c19.json"),
      cache: true
    }
  ]
};
const vueI18nConfigs = [
  () => Promise.resolve(config_i18n_46config_46ts_4bf70daa)
];
const normalizedLocales = [
  {
    code: "en-GB",
    language: "en-GB",
    name: "English (UK)",
    domains: [],
    defaultForDomains: []
  },
  {
    code: "en-US",
    language: "en-US",
    name: "English (US)",
    domains: [],
    defaultForDomains: []
  },
  {
    code: "de-DE",
    language: "de-DE",
    name: "Deutsch",
    domains: [],
    defaultForDomains: []
  },
  {
    code: "es-ES",
    language: "es-ES",
    name: "Español",
    domains: [],
    defaultForDomains: []
  },
  {
    code: "fr-FR",
    language: "fr-FR",
    name: "Français",
    domains: [],
    defaultForDomains: []
  },
  {
    code: "pt-PT",
    language: "pt-PT",
    name: "Português",
    domains: [],
    defaultForDomains: []
  },
  {
    code: "pt-BR",
    language: "pt-BR",
    name: "Português (Brasil)",
    domains: [],
    defaultForDomains: []
  }
];

const setupVueI18nOptions = async (defaultLocale) => {
  const options = await loadVueI18nOptions(vueI18nConfigs);
  options.locale = defaultLocale || options.locale || "en-US";
  options.defaultLocale = defaultLocale;
  options.fallbackLocale ??= false;
  options.messages ??= {};
  for (const locale of localeCodes) {
    options.messages[locale] ??= {};
  }
  return options;
};

function defineNitroPlugin(def) {
  return def;
}

function defineRenderHandler(render) {
  const runtimeConfig = useRuntimeConfig();
  return eventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const ctx = { event, render, response: void 0 };
    await nitroApp.hooks.callHook("render:before", ctx);
    if (!ctx.response) {
      if (event.path === `${runtimeConfig.app.baseURL}favicon.ico`) {
        setResponseHeader(event, "Content-Type", "image/x-icon");
        return send(
          event,
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
      }
      ctx.response = await ctx.render(event);
      if (!ctx.response) {
        const _currentStatus = getResponseStatus(event);
        setResponseStatus(event, _currentStatus === 200 ? 500 : _currentStatus);
        return send(
          event,
          "No response returned from render handler: " + event.path
        );
      }
    }
    await nitroApp.hooks.callHook("render:response", ctx.response, ctx);
    if (ctx.response.headers) {
      setResponseHeaders(event, ctx.response.headers);
    }
    if (ctx.response.statusCode || ctx.response.statusMessage) {
      setResponseStatus(
        event,
        ctx.response.statusCode,
        ctx.response.statusMessage
      );
    }
    return ctx.response.body;
  });
}

//#region src/runtime/utils/paths.ts
function baseURL() {
	return useRuntimeConfig().app.baseURL;
}
function buildAssetsDir() {
	return useRuntimeConfig().app.buildAssetsDir;
}
function buildAssetsURL(...path) {
	return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path);
}
function publicAssetsURL(...path) {
	const app = useRuntimeConfig().app;
	const publicBase = app.cdnURL || app.baseURL;
	return path.length ? joinRelativeURL(publicBase, ...path) : publicBase;
}

//#region src/runtime/utils/config.ts
const defineAppConfig = (config) => config;

const cfg0 = defineAppConfig({
  duxt: {
    /**
     * Deliberately the awkward case, so every branch of the resolver is
     * exercised by the site the layer is built against: a repository segment
     * appears because there is more than one repository, a version segment
     * because `workflows` is published at two refs. A consumer with one
     * unversioned folder declares none of this and gets none of it.
     */
    sources: [
      // This repository's own documentation.
      { path: "docs", slug: "duxt" },
      // Another repository, at a branch and at a tag. kirchDev/workflows is
      // used because it has a real docs/ tree and a real tag to read from.
      {
        repo: "kirchDev/workflows",
        path: "docs",
        refs: ["main", { tag: "v0.7.0" }]
      }
    ],
    sourceOptions: { defaultRef: "main" },
    // Two repositories means every path carries a repository segment, so the
    // navigation the layer ships — which assumes a single unprefixed source —
    // no longer matches. A consumer with prefixes has to name its own.
    // Both forms a label may take, side by side on purpose — this site is the
    // example a consumer reads. The first four reuse the layer's OWN keys,
    // which are translated in every language duxt ships. `Workflows` is this
    // site's alone, so it carries its translations inline rather than earning
    // a locale file of its own for one word.
    sections: [
      {
        label: "duxt.defaults.sections.gettingStarted",
        to: "/duxt/getting-started",
        icon: "lucide:rocket"
      },
      {
        label: "duxt.defaults.sections.structure",
        to: "/duxt/structure",
        icon: "lucide:folder-tree"
      },
      {
        label: "duxt.defaults.sections.guide",
        to: "/duxt/guide",
        icon: "lucide:book-open"
      },
      {
        label: "duxt.defaults.sections.reference",
        to: "/duxt/reference",
        icon: "lucide:list"
      },
      {
        label: {
          "en-GB": "Workflows",
          "de-DE": "Workflows",
          "es-ES": "Flujos de trabajo",
          "fr-FR": "Flux de travail",
          "pt-PT": "Fluxos de trabalho"
        },
        to: "/workflows",
        icon: "lucide:workflow"
      }
    ],
    landing: {
      actions: [
        {
          label: "duxt.defaults.landing.actions.docs",
          to: "/duxt/getting-started",
          icon: "lucide:arrow-right"
        },
        {
          label: "GitHub",
          to: "https://github.com/kirchDev/duxt",
          variant: "outline",
          external: true
        }
      ]
    },
    footer: {
      copyright: `\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} IT-Dienstleistungen Titus Kirch`,
      // The footer is where the record form earns its keep: two labels a
      // German company must show, needed in every language the site serves,
      // and not worth a locale file each.
      legal: [
        {
          label: {
            "en-GB": "Legal notice",
            "de-DE": "Impressum",
            "es-ES": "Aviso legal",
            "fr-FR": "Mentions l\xE9gales",
            "pt-PT": "Informa\xE7\xE3o legal"
          },
          to: "https://kirch.dev/impressum",
          external: true
        },
        {
          label: {
            "en-GB": "Privacy",
            "de-DE": "Datenschutz",
            "es-ES": "Privacidad",
            "fr-FR": "Confidentialit\xE9",
            "pt-PT": "Privacidade"
          },
          to: "https://kirch.dev/datenschutz",
          external: true
        }
      ]
    }
  }
});

const cfg1 = defineAppConfig({
  duxt: {}
});

const inlineConfig = {
  "nuxt": {},
  "duxt": {
    "resolvedSources": [
      {
        "collection": "docs_duxt",
        "prefix": "/duxt",
        "repo": "duxt",
        "isDefault": true
      },
      {
        "collection": "docs_workflows",
        "prefix": "/workflows",
        "repo": "workflows",
        "version": "main",
        "isDefault": true
      },
      {
        "collection": "docs_workflows_v0_7_0",
        "prefix": "/workflows/v0.7.0",
        "repo": "workflows",
        "version": "v0.7.0",
        "isDefault": false
      }
    ]
  },
  "icon": {
    "provider": "server",
    "class": "",
    "aliases": {},
    "iconifyApiEndpoint": "https://api.iconify.design",
    "localApiEndpoint": "/api/_nuxt_icon",
    "fallbackToApi": true,
    "cssSelectorPrefix": "i-",
    "cssWherePseudo": true,
    "mode": "svg",
    "attrs": {
      "aria-hidden": true
    },
    "collections": [
      "academicons",
      "akar-icons",
      "ant-design",
      "arcticons",
      "basil",
      "bi",
      "bitcoin-icons",
      "bpmn",
      "brandico",
      "bx",
      "bxl",
      "bxs",
      "bytesize",
      "carbon",
      "catppuccin",
      "cbi",
      "charm",
      "ci",
      "cib",
      "cif",
      "cil",
      "circle-flags",
      "circum",
      "clarity",
      "codex",
      "codicon",
      "covid",
      "cryptocurrency",
      "cryptocurrency-color",
      "cuida",
      "dashicons",
      "devicon",
      "devicon-plain",
      "dinkie-icons",
      "duo-icons",
      "ei",
      "el",
      "emojione",
      "emojione-monotone",
      "emojione-v1",
      "entypo",
      "entypo-social",
      "eos-icons",
      "ep",
      "et",
      "eva",
      "f7",
      "fa",
      "fa-brands",
      "fa-regular",
      "fa-solid",
      "fa6-brands",
      "fa6-regular",
      "fa6-solid",
      "fa7-brands",
      "fa7-regular",
      "fa7-solid",
      "fad",
      "famicons",
      "fe",
      "feather",
      "file-icons",
      "flag",
      "flagpack",
      "flat-color-icons",
      "flat-ui",
      "flowbite",
      "fluent",
      "fluent-color",
      "fluent-emoji",
      "fluent-emoji-flat",
      "fluent-emoji-high-contrast",
      "fluent-mdl2",
      "fontelico",
      "fontisto",
      "formkit",
      "foundation",
      "fxemoji",
      "gala",
      "game-icons",
      "garden",
      "geo",
      "gg",
      "gis",
      "gravity-ui",
      "gridicons",
      "grommet-icons",
      "guidance",
      "healthicons",
      "heroicons",
      "heroicons-outline",
      "heroicons-solid",
      "hugeicons",
      "humbleicons",
      "ic",
      "icomoon-free",
      "icon-park",
      "icon-park-outline",
      "icon-park-solid",
      "icon-park-twotone",
      "iconamoon",
      "iconoir",
      "icons8",
      "il",
      "ion",
      "iwwa",
      "ix",
      "jam",
      "la",
      "lets-icons",
      "line-md",
      "lineicons",
      "logos",
      "ls",
      "lsicon",
      "lucide",
      "lucide-lab",
      "mage",
      "majesticons",
      "maki",
      "map",
      "marketeq",
      "material-icon-theme",
      "material-symbols",
      "material-symbols-light",
      "mdi",
      "mdi-light",
      "medical-icon",
      "memory",
      "meteocons",
      "meteor-icons",
      "mi",
      "mingcute",
      "mono-icons",
      "mynaui",
      "nimbus",
      "nonicons",
      "noto",
      "noto-v1",
      "nrk",
      "octicon",
      "oi",
      "ooui",
      "openmoji",
      "oui",
      "pajamas",
      "pepicons",
      "pepicons-pencil",
      "pepicons-pop",
      "pepicons-print",
      "ph",
      "picon",
      "pixel",
      "pixelarticons",
      "prime",
      "proicons",
      "ps",
      "qlementine-icons",
      "quill",
      "radix-icons",
      "raphael",
      "ri",
      "rivet-icons",
      "roentgen",
      "si",
      "si-glyph",
      "sidekickicons",
      "simple-icons",
      "simple-line-icons",
      "skill-icons",
      "solar",
      "stash",
      "streamline",
      "streamline-block",
      "streamline-color",
      "streamline-cyber",
      "streamline-cyber-color",
      "streamline-emojis",
      "streamline-flex",
      "streamline-flex-color",
      "streamline-freehand",
      "streamline-freehand-color",
      "streamline-kameleon-color",
      "streamline-logos",
      "streamline-pixel",
      "streamline-plump",
      "streamline-plump-color",
      "streamline-sharp",
      "streamline-sharp-color",
      "streamline-stickies-color",
      "streamline-ultimate",
      "streamline-ultimate-color",
      "subway",
      "svg-spinners",
      "system-uicons",
      "tabler",
      "tdesign",
      "teenyicons",
      "temaki",
      "token",
      "token-branded",
      "topcoat",
      "twemoji",
      "typcn",
      "uil",
      "uim",
      "uis",
      "uit",
      "uiw",
      "unjs",
      "vaadin",
      "vs",
      "vscode-icons",
      "websymbol",
      "weui",
      "whh",
      "wi",
      "wpf",
      "zmdi",
      "zondicons"
    ],
    "fetchTimeout": 1500
  }
};

const _inlineAppConfig = /*@__PURE__*/ defuFn(cfg0, cfg1, inlineConfig);

//#region src/runtime/utils/app-config.ts
const _sharedAppConfig = _deepFreeze(klona(_inlineAppConfig));
function useAppConfig(event) {
	return _sharedAppConfig;
}
function _deepFreeze(object) {
	const propNames = Object.getOwnPropertyNames(object);
	for (const name of propNames) {
		const value = object[name];
		if (value && typeof value === "object") _deepFreeze(value);
	}
	return Object.freeze(object);
}

const checksums = {
  "docs_duxt": "v3.5.0--Z5sCT9gGa-RAe6nnMqlaoWtD_9oNnR7HOERNc81MTWA",
  "docs_workflows": "v3.5.0--TQ9_dTvO8Uv4LqgMQLAay8DXVPhEp9ahKul3KNGtDQ4",
  "docs_workflows_v0_7_0": "v3.5.0--gyTLYQ0MVuqj_MoAN7sY-gvt61s3lKmNU2w7azTxNdA"
};
const checksumsStructure = {
  "docs_duxt": "cY12jdAnkQwUxmGB3I0V0TTXMveP9ssYvCz5VOrpPfY",
  "docs_workflows": "cshF33POG6AtTmLe-IjziL3JiGGPCJgs5avQ1OmFtj4",
  "docs_workflows_v0_7_0": "Pt9fhgX_otrmnFQYPHSGuqExdlY7qwABOOtjCErIPtg"
};

const tables = {
  "docs_duxt": "_content_docs_duxt",
  "docs_workflows": "_content_docs_workflows",
  "docs_workflows_v0_7_0": "_content_docs_workflows_v0_7_0",
  "info": "_content_info"
};

const contentManifest = {
  "docs_duxt": {
    "type": "page",
    "fields": {
      "id": "string",
      "title": "string",
      "body": "json",
      "description": "string",
      "extension": "string",
      "icon": "string",
      "layout": "string",
      "meta": "json",
      "navigation": "boolean",
      "path": "string",
      "seo": "json",
      "stem": "string"
    }
  },
  "docs_workflows": {
    "type": "page",
    "fields": {
      "id": "string",
      "title": "string",
      "body": "json",
      "description": "string",
      "extension": "string",
      "icon": "string",
      "layout": "string",
      "meta": "json",
      "navigation": "boolean",
      "path": "string",
      "seo": "json",
      "stem": "string"
    }
  },
  "docs_workflows_v0_7_0": {
    "type": "page",
    "fields": {
      "id": "string",
      "title": "string",
      "body": "json",
      "description": "string",
      "extension": "string",
      "icon": "string",
      "layout": "string",
      "meta": "json",
      "navigation": "boolean",
      "path": "string",
      "seo": "json",
      "stem": "string"
    }
  },
  "info": {
    "type": "data",
    "fields": {}
  }
};

const buildGroup = (group, type) => {
  const conditions = group._conditions;
  return conditions.length > 0 ? `(${conditions.join(` ${type} `)})` : "";
};
const collectionQueryGroup = (collection) => {
  const conditions = [];
  const query = {
    // @ts-expect-error -- internal
    _conditions: conditions,
    where(field, operator, value) {
      let condition;
      switch (operator.toUpperCase()) {
        case "IN":
        case "NOT IN":
          if (Array.isArray(value)) {
            const values = value.map((val) => singleQuote(val)).join(", ");
            condition = `"${String(field)}" ${operator.toUpperCase()} (${values})`;
          } else {
            throw new TypeError(`Value for ${operator} must be an array`);
          }
          break;
        case "BETWEEN":
        case "NOT BETWEEN":
          if (Array.isArray(value) && value.length === 2) {
            condition = `"${String(field)}" ${operator.toUpperCase()} ${singleQuote(value[0])} AND ${singleQuote(value[1])}`;
          } else {
            throw new Error(`Value for ${operator} must be an array with two elements`);
          }
          break;
        case "IS NULL":
        case "IS NOT NULL":
          condition = `"${String(field)}" ${operator.toUpperCase()}`;
          break;
        case "LIKE":
        case "NOT LIKE":
          condition = `"${String(field)}" ${operator.toUpperCase()} ${singleQuote(value)}`;
          break;
        default:
          condition = `"${String(field)}" ${operator} ${singleQuote(typeof value === "boolean" ? Number(value) : value)}`;
      }
      conditions.push(`${condition}`);
      return query;
    },
    andWhere(groupFactory) {
      const group = groupFactory(collectionQueryGroup());
      conditions.push(buildGroup(group, "AND"));
      return query;
    },
    orWhere(groupFactory) {
      const group = groupFactory(collectionQueryGroup());
      conditions.push(buildGroup(group, "OR"));
      return query;
    }
  };
  return query;
};
const collectionQueryBuilder = (collection, fetch) => {
  const params = {
    conditions: [],
    selectedFields: [],
    offset: 0,
    limit: 0,
    orderBy: [],
    // Count query
    count: {
      field: "",
      distinct: false
    }
  };
  const query = {
    // @ts-expect-error -- internal
    __params: params,
    andWhere(groupFactory) {
      const group = groupFactory(collectionQueryGroup());
      params.conditions.push(buildGroup(group, "AND"));
      return query;
    },
    orWhere(groupFactory) {
      const group = groupFactory(collectionQueryGroup());
      params.conditions.push(buildGroup(group, "OR"));
      return query;
    },
    path(path) {
      return query.where("path", "=", withoutTrailingSlash(path));
    },
    skip(skip) {
      params.offset = skip;
      return query;
    },
    where(field, operator, value) {
      query.andWhere((group) => group.where(String(field), operator, value));
      return query;
    },
    limit(limit) {
      params.limit = limit;
      return query;
    },
    select(...fields) {
      if (fields.length) {
        params.selectedFields.push(...fields);
      }
      return query;
    },
    order(field, direction) {
      params.orderBy.push(`"${String(field)}" ${direction}`);
      return query;
    },
    async all() {
      return fetch(collection, buildQuery()).then((res) => res || []);
    },
    async first() {
      return fetch(collection, buildQuery({ limit: 1 })).then((res) => res[0] || null);
    },
    async count(field = "*", distinct = false) {
      return fetch(collection, buildQuery({
        count: { field: String(field), distinct }
      })).then((m) => m[0].count);
    }
  };
  function buildQuery(opts = {}) {
    let query2 = "SELECT ";
    if (opts?.count) {
      query2 += `COUNT(${opts.count.distinct ? "DISTINCT " : ""}${opts.count.field}) as count`;
    } else {
      const fields = Array.from(new Set(params.selectedFields));
      query2 += fields.length > 0 ? fields.map((f) => `"${String(f)}"`).join(", ") : "*";
    }
    query2 += ` FROM ${tables[String(collection)]}`;
    if (params.conditions.length > 0) {
      query2 += ` WHERE ${params.conditions.join(" AND ")}`;
    }
    if (params.orderBy.length > 0) {
      query2 += ` ORDER BY ${params.orderBy.join(", ")}`;
    } else {
      query2 += ` ORDER BY stem ASC`;
    }
    const limit = opts?.limit || params.limit;
    if (limit > 0) {
      if (params.offset > 0) {
        query2 += ` LIMIT ${limit} OFFSET ${params.offset}`;
      } else {
        query2 += ` LIMIT ${limit}`;
      }
    }
    return query2;
  }
  return query;
};
function singleQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function fetchContent(event, collection, path, options) {
  const headers = event ? getRequestHeaders(event) : {};
  headers["accept-encoding"] = void 0;
  const url = `/__nuxt_content/${collection}/${path}`;
  const fetchOptions = {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    },
    query: { v: checksums[String(collection)], t: void 0 }
  };
  return event ? await event.$fetch(url, fetchOptions) : await $fetch(url, fetchOptions);
}
async function fetchDatabase(event, collection) {
  return fetchContent(event, collection, "sql_dump.txt", {
    responseType: "text",
    headers: {
      "content-type": "text/plain"
    }
  });
}
async function fetchQuery(event, collection, sql) {
  return fetchContent(event, collection, "query", {
    headers: {
      "content-type": "application/json"
    },
    method: "POST",
    body: {
      sql
    }
  });
}

const queryCollection$1 = (event, collection) => {
  return collectionQueryBuilder(collection, (collection2, sql) => fetchQuery(event, collection2, sql));
};

const queryCollection = (event, collection) => {
  return queryCollection$1(event, collection);
};

const DURATION_UNITS = {
  ms: 1,
  millisecond: 1,
  milliseconds: 1,
  s: 1e3,
  sec: 1e3,
  second: 1e3,
  seconds: 1e3,
  m: 6e4,
  min: 6e4,
  minute: 6e4,
  minutes: 6e4,
  h: 36e5,
  hr: 36e5,
  hour: 36e5,
  hours: 36e5,
  d: 864e5,
  day: 864e5,
  days: 864e5,
  w: 6048e5,
  week: 6048e5,
  weeks: 6048e5
};
function parseDurationToMs(str) {
  const match = str.trim().match(/^(\d+)\s*([a-z]+)$/i);
  if (!match) return void 0;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = DURATION_UNITS[unit];
  if (multiplier === void 0) return void 0;
  return value * multiplier;
}
function parseCacheDuration(duration) {
  if (typeof duration === "number") {
    return duration;
  }
  const parsed = parseDurationToMs(duration);
  if (parsed === void 0) {
    throw new Error(`Invalid cache duration: ${duration}`);
  }
  return Math.ceil(parsed / 1e3);
}
function createCacheOptions(cache, name, defaultGetKey) {
  if (typeof cache === "object") {
    return {
      getKey: defaultGetKey,
      swr: false,
      ...cache,
      maxAge: parseCacheDuration(cache.maxAge),
      name: cache.name ?? name,
      group: cache.group ?? "mcp"
    };
  }
  return {
    maxAge: parseCacheDuration(cache),
    name,
    group: "mcp",
    getKey: defaultGetKey,
    swr: false
  };
}
function wrapWithCache(fn, cacheOptions) {
  return defineCachedFunction(
    fn,
    cacheOptions
  );
}

function kebabCase(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[_\s]+/g, "-").toLowerCase();
}
function titleCase(str) {
  return str.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c) => c.toUpperCase());
}
function enrichNameTitle(options) {
  const { name, title, _meta, type } = options;
  const filename = _meta?.filename;
  let enrichedName = name;
  let enrichedTitle = title;
  if (filename) {
    const nameWithoutExt = filename.replace(/\.(ts|js|mts|mjs)$/, "");
    if (!enrichedName) {
      enrichedName = kebabCase(nameWithoutExt);
    }
    if (!enrichedTitle) {
      enrichedTitle = titleCase(nameWithoutExt);
    }
  }
  if (!enrichedName) {
    throw new Error(`Failed to auto-generate ${type} name from filename. Please provide a name explicitly.`);
  }
  return {
    name: enrichedName,
    title: enrichedTitle
  };
}

function isCallToolResult(value) {
  return "content" in value && Array.isArray(value.content) || "structuredContent" in value || "isError" in value;
}
function normalizeToolResult(result) {
  if (typeof result === "string") {
    return { content: [{ type: "text", text: result }] };
  }
  if (typeof result === "number" || typeof result === "boolean") {
    return { content: [{ type: "text", text: String(result) }] };
  }
  if (typeof result === "object" && result !== null && !isCallToolResult(result)) {
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
  const callResult = result;
  if (callResult.isError && !callResult.content?.length) {
    const fallbackText = callResult.structuredContent ? JSON.stringify(callResult.structuredContent) : "Tool execution failed";
    return { ...callResult, content: [{ type: "text", text: fallbackText }] };
  }
  if (callResult.structuredContent && !callResult.content?.length) {
    return {
      ...callResult,
      content: [{ type: "text", text: JSON.stringify(callResult.structuredContent) }]
    };
  }
  return callResult;
}

function getSdkServer(server) {
  return server.server;
}
function getEvlogLogger(event) {
  if (!event) return null;
  const candidate = event.context.log;
  if (candidate && typeof candidate.set === "function" && typeof candidate.info === "function") {
    return candidate;
  }
  return null;
}

const notifiers = /* @__PURE__ */ new WeakMap();
const floors = /* @__PURE__ */ new WeakMap();
new Map(LoggingLevelSchema.options.map((level, index) => [level, index]));
function currentEvent() {
  try {
    return useEvent();
  } catch {
    return null;
  }
}
function notifierOf(value) {
  if (typeof value !== "object" || value === null) return void 0;
  const candidate = value.sendNotification;
  return typeof candidate === "function" ? candidate : void 0;
}
function rememberRequestNotifier(args) {
  const notifier = notifierOf(args.at(-1));
  const event = currentEvent();
  if (notifier && event) {
    notifiers.set(event, notifier);
  }
}
function trackLoggingLevel(server) {
  getSdkServer(server).setRequestHandler(SetLevelRequestSchema, async (request) => {
    const parsed = LoggingLevelSchema.safeParse(request.params.level);
    if (parsed.success) {
      floors.set(server, parsed.data);
    }
    return {};
  });
}

function normalizeErrorToResult(error) {
  if (isError(error)) {
    let text = `[${error.statusCode}] ${error.message}`;
    if (error.data != null) {
      text += `
${JSON.stringify(error.data, null, 2)}`;
    }
    return { content: [{ type: "text", text }], isError: true };
  }
  if (error instanceof Error) {
    return { content: [{ type: "text", text: error.message }], isError: true };
  }
  return { content: [{ type: "text", text: String(error) }], isError: true };
}
function registerToolFromDefinition(server, tool) {
  const { name, title } = enrichNameTitle({
    name: tool.name,
    title: tool.title,
    _meta: tool._meta,
    type: "tool"
  });
  let handler = tool.handler;
  if (tool.cache !== void 0) {
    const defaultGetKey = tool.inputSchema ? (args) => {
      const values = Object.values(args);
      return values.map((v) => String(v).replace(/\//g, "-").replace(/^-/, "")).join(":");
    } : void 0;
    const cacheOptions = createCacheOptions(tool.cache, `mcp-tool:${name}`, defaultGetKey);
    handler = wrapWithCache(handler, cacheOptions);
  }
  const normalizedHandler = async (...args) => {
    rememberRequestNotifier(args);
    try {
      const result = await handler(...args);
      return normalizeToolResult(result);
    } catch (error) {
      return normalizeErrorToResult(error);
    }
  };
  const group = tool.group ?? tool._meta?.group;
  const options = {
    title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    annotations: tool.annotations,
    _meta: {
      ...tool._meta,
      ...tool.inputExamples && { inputExamples: tool.inputExamples },
      ...group != null && { group },
      ...tool.tags?.length && { tags: tool.tags }
    }
  };
  return server.registerTool(name, options, normalizedHandler);
}
function defineMcpTool(definition) {
  return definition;
}

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".md":
      return "text/markdown";
    case ".ts":
    case ".mts":
    case ".cts":
      return "text/typescript";
    case ".js":
    case ".mjs":
    case ".cjs":
      return "text/javascript";
    case ".json":
      return "application/json";
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".xml":
      return "text/xml";
    case ".csv":
      return "text/csv";
    case ".yaml":
    case ".yml":
      return "text/yaml";
    default:
      return "text/plain";
  }
}
function registerResourceFromDefinition(server, resource) {
  const { name, title } = enrichNameTitle({
    name: resource.name,
    title: resource.title,
    _meta: resource._meta,
    type: "resource"
  });
  const group = resource.group ?? resource._meta?.group;
  if (group != null || resource.tags?.length) {
    resource._meta = {
      ...resource._meta,
      ...group != null && { group },
      ...resource.tags?.length && { tags: resource.tags }
    };
  }
  let uri = resource.uri;
  let handler = resource.handler;
  const metadata = {
    ...resource.metadata,
    title: resource.title || resource.metadata?.title || title,
    description: resource.description || resource.metadata?.description
  };
  if ("file" in resource && resource.file) {
    const projectRoot = process.cwd();
    const filePath = resolve$1(projectRoot, resource.file);
    if (!filePath.startsWith(projectRoot + sep)) {
      throw new Error(`Resource file "${resource.file}" resolves outside project root`);
    }
    if (!uri) {
      uri = pathToFileURL(filePath).toString();
    }
    if (!handler) {
      handler = async (requestUri) => {
        try {
          const content = await readFile$1(filePath, "utf-8");
          return {
            contents: [{
              uri: requestUri.toString(),
              mimeType: resource.metadata?.mimeType || getMimeType(filePath),
              text: content
            }]
          };
        } catch (error) {
          throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }
      };
    }
  }
  if (!uri) {
    throw new Error(`Resource ${name} is missing a URI`);
  }
  if (!handler) {
    throw new Error(`Resource ${name} is missing a handler`);
  }
  if (resource.cache !== void 0) {
    const defaultGetKey = (requestUri) => requestUri.pathname.replace(/\//g, "-").replace(/^-/, "");
    const cacheOptions = createCacheOptions(resource.cache, `mcp-resource:${name}`, defaultGetKey);
    handler = wrapWithCache(
      handler,
      cacheOptions
    );
  }
  const readHandler = handler;
  const tracked = (...args) => {
    rememberRequestNotifier(args);
    return readHandler(...args);
  };
  if (typeof uri === "string") {
    return server.registerResource(
      name,
      uri,
      metadata,
      tracked
    );
  } else {
    return server.registerResource(
      name,
      uri,
      metadata,
      tracked
    );
  }
}

function normalizePromptResult(result, role = "user") {
  if (typeof result === "string") {
    return {
      messages: [{ role, content: { type: "text", text: result } }]
    };
  }
  return result;
}
function registerPromptFromDefinition(server, prompt) {
  const { name, title } = enrichNameTitle({
    name: prompt.name,
    title: prompt.title,
    _meta: prompt._meta,
    type: "prompt"
  });
  const group = prompt.group ?? prompt._meta?.group;
  if (group != null || prompt.tags?.length) {
    prompt._meta = {
      ...prompt._meta,
      ...group != null && { group },
      ...prompt.tags?.length && { tags: prompt.tags }
    };
  }
  const role = prompt.role ?? "user";
  const wrappedHandler = async (...args) => {
    rememberRequestNotifier(args);
    const result = await prompt.handler(...args);
    return normalizePromptResult(result, role);
  };
  if (prompt.inputSchema) {
    return server.registerPrompt(
      name,
      {
        title,
        description: prompt.description,
        argsSchema: prompt.inputSchema
      },
      wrappedHandler
    );
  } else {
    return server.registerPrompt(
      name,
      {
        title,
        description: prompt.description
      },
      wrappedHandler
    );
  }
}

function readHandler(def) {
  const value = def._meta?.handler;
  return typeof value === "string" ? value : void 0;
}
function toArray(value) {
  if (value == null) return void 0;
  return Array.isArray(value) ? [...value] : [value];
}
async function filterByEnabled$1(defs, event) {
  if (!event) return [...defs];
  const results = await Promise.all(
    defs.map(async (def) => {
      if (!def.enabled) return true;
      try {
        return await def.enabled(event);
      } catch {
        return false;
      }
    })
  );
  return defs.filter((_, i) => results[i]);
}
function matchesFilters(def, options) {
  const handler = readHandler(def);
  if (options.orphansOnly && handler) return false;
  const wantedHandlers = toArray(options.handler);
  if (wantedHandlers && (!handler || !wantedHandlers.includes(handler))) return false;
  const wantedGroups = toArray(options.group);
  if (wantedGroups) {
    const group = def.group ?? def._meta?.group;
    if (!group || !wantedGroups.includes(group)) return false;
  }
  const wantedTags = toArray(options.tags);
  if (wantedTags && !def.tags?.some((t) => wantedTags.includes(t))) return false;
  return true;
}
async function filterRawDefinitions(defs, options = {}) {
  const enabled = await filterByEnabled$1(defs, options.event);
  return enabled.filter((def) => matchesFilters(def, options));
}

const asCompat = (event) => event;
function getHeader(event, name) {
  const req = asCompat(event).req;
  const headers = req && "headers" in req ? req.headers : void 0;
  if (headers && typeof headers.get === "function") {
    return headers.get(name) ?? void 0;
  }
  const key = name.toLowerCase();
  const val = headers?.[key];
  return Array.isArray(val) ? val[0] : val;
}
function getRequestMethod(event) {
  const e = asCompat(event);
  return e.method ?? e.node?.req?.method ?? "GET";
}
function toWebRequest(event) {
  const e = asCompat(event);
  if (e.req instanceof Request) return e.req;
  if (e.web?.request instanceof Request) return e.web.request;
  if (e.req && typeof e.req.clone === "function") {
    return e.req;
  }
  const url = getRequestURL(event);
  const method = getMethod(event);
  const rawHeaders = getRequestHeaders(event);
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (value !== void 0) headers.set(key, String(value));
  }
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? getRequestWebStream(event) ?? null : null;
  return new Request(url.href, {
    method,
    headers,
    body,
    ...body ? { duplex: "half" } : {}
  });
}
function getNodeResponse(event) {
  const node = asCompat(event).node;
  return node?.res ?? null;
}

function normalizeOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
function validateOrigin(event, security) {
  if (security.allowedOrigins === "*") {
    return null;
  }
  const origin = getHeader(event, "origin");
  if (!origin) {
    return null;
  }
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Origin not allowed" },
      id: null
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (Array.isArray(security.allowedOrigins)) {
    if (security.allowedOrigins.some((allowedOrigin) => normalizeOrigin(allowedOrigin) === normalizedOrigin)) {
      return null;
    }
  } else {
    if (normalizedOrigin === getRequestURL(event).origin) {
      return null;
    }
  }
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    error: { code: -32600, message: "Origin not allowed" },
    id: null
  }), {
    status: 403,
    headers: { "Content-Type": "application/json" }
  });
}

function parseAcceptLanguage(value) {
  return value.split(",").map((tag) => tag.split(";")[0]).filter(
    (tag) => !(tag === "*" || tag === "")
  );
}
function createPathIndexLanguageParser(index = 0) {
  return (path) => {
    const rawPath = typeof path === "string" ? path : path.pathname;
    const normalizedPath = rawPath.split("?")[0];
    const parts = normalizedPath.split("/");
    if (parts[0] === "") {
      parts.shift();
    }
    return parts.length > index ? parts[index] || "" : "";
  };
}

function useRuntimeI18n(nuxtApp, event) {
  {
    const getRuntimeConfig = useRuntimeConfig;
    return getRuntimeConfig(event).public.i18n;
  }
}
function useI18nDetection(nuxtApp) {
  const detectBrowserLanguage = useRuntimeI18n().detectBrowserLanguage;
  const detect = detectBrowserLanguage || {};
  return {
    ...detect,
    enabled: !!detectBrowserLanguage,
    cookieKey: detect.cookieKey || "i18n_redirected"
  };
}
function resolveRootRedirect(config) {
  if (!config) {
    return void 0;
  }
  return {
    path: "/" + (isString(config) ? config : config.path).replace(/^\//, ""),
    code: !isString(config) && config.statusCode || 302
  };
}

const normalizeDomain = (domain = "") => domain.replace(/^https?:\/\//i, "").toLowerCase();
function isLocaleOnHost(locale, host) {
  return !!locale?.domains.some((x) => normalizeDomain(x) === host);
}
function resolveLocaleReach(locales, host, locale) {
  const target = locales.find((l) => l.code === locale);
  if (!target?.domains.length || isLocaleOnHost(target, host)) {
    return "here";
  }
  return locales.some((l) => isLocaleOnHost(l, host)) ? "other-domain" : "off-host";
}
function isLocaleServedOnHost(locales, host, locale) {
  return resolveLocaleReach(locales, host, locale) !== "other-domain";
}
function matchDomainLocale(locales, host, pathLocale) {
  const matches = locales.filter((locale) => isLocaleOnHost(locale, host));
  return (
    // match by current path locale
    (matches.find((l) => l.code === pathLocale) || matches.find((l) => l.defaultForDomains.some((domain) => normalizeDomain(domain) === host)) || matches[0])?.code
  );
}
function cookieSpansDomains(locales, cookieDomain) {
  const scope = cookieDomain.replace(/^\./, "").replace(/:\d+$/, "").toLowerCase();
  return locales.every(
    (l) => l.domains.concat(l.domain || []).every((domain) => {
      const host = normalizeDomain(domain).replace(/:\d+$/, "");
      return host === scope || host.endsWith("." + scope);
    })
  );
}
function withRuntimeDomain(locale, domainLocales) {
  if (typeof locale === "string") {
    return locale;
  }
  const properties = locale;
  const domain = domainLocales[properties.code]?.domain;
  if (!domain || domain === properties.domain) {
    return locale;
  }
  return {
    ...properties,
    domain,
    domains: [domain],
    defaultForDomains: properties.defaultForDomains.length ? [domain] : []
  };
}

function createLocaleConfigs(fallbackLocale) {
  const localeConfigs = {};
  for (const locale of localeCodes) {
    const fallbacks = getFallbackLocaleCodes(fallbackLocale, [locale]);
    const cacheable = isLocaleWithFallbacksCacheable(locale, fallbacks);
    localeConfigs[locale] = { fallbacks, cacheable };
  }
  return localeConfigs;
}
function getFallbackLocaleCodes(fallback, locales) {
  if (fallback === false) {
    return [];
  }
  if (isArray(fallback)) {
    return fallback;
  }
  let fallbackLocales = [];
  if (isString(fallback)) {
    if (locales.every((locale) => locale !== fallback)) {
      fallbackLocales.push(fallback);
    }
    return fallbackLocales;
  }
  const targets = [...locales, "default"];
  for (const locale of targets) {
    if (locale in fallback == false) {
      continue;
    }
    fallbackLocales = [...fallbackLocales, ...fallback[locale].filter(Boolean)];
  }
  return fallbackLocales;
}
function isLocaleCacheable(locale) {
  return localeLoaders[locale] != null && localeLoaders[locale].every((loader) => loader.cache !== false);
}
function isLocaleWithFallbacksCacheable(locale, fallbackLocales) {
  return isLocaleCacheable(locale) && fallbackLocales.every((fallbackLocale) => isLocaleCacheable(fallbackLocale));
}
function getDefaultLocaleForDomain(host, locales = normalizedLocales) {
  return locales.find((l) => l.defaultForDomains.some((domain) => normalizeDomain(domain) === host))?.code;
}
function resolveDefaultLocale(host, defaultLocale, locales = normalizedLocales) {
  const resolved = getDefaultLocaleForDomain(host, locales) || defaultLocale;
  if (resolved) {
    return resolved;
  }
  return (locales.some((l) => l.domains.length) ? locales[0]?.code : "") || "";
}
const isSupportedLocale = (locale) => localeCodes.includes(locale || "");

const storage = prefixStorage(useStorage(), "i18n");
function deepFreeze(value) {
  if (value == null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }
  return Object.freeze(value);
}
function cachedFunctionI18n(fn, opts) {
  opts = { maxAge: 1, ...opts };
  const pending = {};
  async function get(key, resolver) {
    const isPending = pending[key];
    if (!isPending) {
      pending[key] = Promise.resolve(resolver());
    }
    try {
      return await pending[key];
    } finally {
      delete pending[key];
    }
  }
  return async (...args) => {
    const key = [opts.name, opts.getKey(...args)].join(":").replace(/:\/$/, ":index");
    const maxAge = opts.maxAge ?? 1;
    const isCacheable = !opts.shouldBypassCache(...args) && maxAge >= 0;
    const cache = isCacheable && await storage.getItemRaw(key);
    if (!cache || cache.ttl < Date.now()) {
      pending[key] = Promise.resolve(fn(...args));
      const value = await get(key, () => fn(...args));
      if (isCacheable) {
        deepFreeze(value);
        await storage.setItemRaw(key, { ttl: Date.now() + maxAge * 1e3, value, mtime: Date.now() });
      }
      return value;
    }
    return cache.value;
  };
}

const _getMessages = async (locale) => {
  return { [locale]: await getLocaleMessagesMerged(locale, localeLoaders[locale]) };
};
const _getMessagesCached = cachedFunctionI18n(_getMessages, {
  name: "messages",
  maxAge: 60 * 60 * 24,
  getKey: (locale) => locale,
  shouldBypassCache: (locale) => !isLocaleCacheable(locale)
});
const getMessages = _getMessagesCached;
function appContextHint(e) {
  if (!/ is not defined|Nuxt instance unavailable/.test(e.message)) {
    return "";
  }
  return ". Locale loaders run outside the Nuxt app when the server produces messages, so Nuxt app composables (`useNuxtApp`, `useState`, `useCookie`, ...) are unavailable - call them in the locale file itself to have the build keep that locale in the app instead.";
}
const _getMergedMessages = async (locale, fallbackLocales) => {
  try {
    if (fallbackLocales.length === 0) {
      return await getMessages(locale) ?? {};
    }
    const merged = {};
    const messages = await Promise.all(fallbackLocales.map(getMessages));
    for (const message of messages) {
      deepCopy(message, merged);
    }
    deepCopy(await getMessages(locale), merged);
    return merged;
  } catch (e) {
    throw new Error("Failed to merge messages: " + e.message + appContextHint(e), { cause: e });
  }
};
const getMergedMessages = cachedFunctionI18n(_getMergedMessages, {
  name: "merged-single",
  maxAge: 60 * 60 * 24,
  getKey: (locale, fallbackLocales) => `${locale}-[${[...new Set(fallbackLocales)].sort().join("-")}]`,
  shouldBypassCache: (locale, fallbackLocales) => !isLocaleWithFallbacksCacheable(locale, fallbackLocales)
});

function useI18nContext(event) {
  if (event.context.nuxtI18n == null) {
    throw new Error("Nuxt I18n server context has not been set up yet.");
  }
  return event.context.nuxtI18n;
}
function tryUseI18nContext(event) {
  return event.context.nuxtI18n;
}
const getHost = (event) => getRequestURL(event, { xForwardedHost: true }).host;
async function initializeI18nContext(event) {
  const runtimeI18n = useRuntimeI18n(void 0, event);
  const defaultLocale = runtimeI18n.defaultLocale || "";
  const options = await setupVueI18nOptions(resolveDefaultLocale(getHost(event), defaultLocale));
  const localeConfigs = createLocaleConfigs(options.fallbackLocale);
  const ctx = createI18nContext();
  ctx.vueI18nOptions = options;
  ctx.localeConfigs = localeConfigs;
  event.context.nuxtI18n = ctx;
  return ctx;
}
function createI18nContext() {
  return {
    messages: {},
    slp: {},
    localeConfigs: {},
    trackMap: {},
    vueI18nOptions: void 0,
    trackKey(key, locale) {
      this.trackMap[locale] ??= /* @__PURE__ */ new Set();
      this.trackMap[locale].add(key);
    },
    async loadMessages(locale) {
      const messages = await getMergedMessages(locale, this.localeConfigs?.[locale]?.fallbacks ?? []) ?? {};
      return this.vueI18nOptions?.flatJson ? cloneDeep(messages) : messages;
    }
  };
}

const appHead = {"meta":[{"name":"viewport","content":"width=device-width, initial-scale=1"},{"charset":"utf-8"}],"link":[],"style":[],"script":[],"noscript":[]};

const appRootTag = "div";

const appRootAttrs = {"id":"__nuxt"};

const appTeleportTag = "div";

const appTeleportAttrs = {"id":"teleports"};

const appSpaLoaderTag = "div";

const appSpaLoaderAttrs = {"id":"__nuxt-loader"};

const appId = "nuxt-app";

const separator = "___";
const createTrailingSlashFormatter = (trailingSlash) => trailingSlash ? withTrailingSlash : withoutTrailingSlash;
function prefixable(currentLocale, defaultLocale, options) {
  return (currentLocale !== defaultLocale || options.strategy === "prefix");
}
const pathLanguageParser = createPathIndexLanguageParser(0);
const getLocaleFromRoutePath = (path) => pathLanguageParser(path);
const getLocaleFromRouteName = (name) => name.split(separator).at(1) ?? "";
function normalizeInput(input) {
  return typeof input !== "object" ? String(input) : String(input?.name || input?.path || "");
}
function getLocaleFromRoute(route) {
  const input = normalizeInput(route);
  if (input[0] === "/") {
    return getLocaleFromRoutePath(input);
  }
  const fromName = getLocaleFromRouteName(input);
  if (fromName) {
    return fromName;
  }
  if (typeof route === "object" && route?.path) {
    return getLocaleFromRoutePath(String(route.path));
  }
  return "";
}

function matchBrowserLocale(locales, browserLocales) {
  const matchedLocales = [];
  for (const [index, browserCode] of browserLocales.entries()) {
    const matchedLocale = locales.find((l) => l.language?.toLowerCase() === browserCode.toLowerCase());
    if (matchedLocale) {
      matchedLocales.push({ code: matchedLocale.code, score: 1 - index / browserLocales.length });
      break;
    }
  }
  for (const [index, browserCode] of browserLocales.entries()) {
    const languageCode = browserCode.split("-")[0].toLowerCase();
    const matchedLocale = locales.find((l) => l.language?.split("-")[0].toLowerCase() === languageCode);
    if (matchedLocale) {
      matchedLocales.push({ code: matchedLocale.code, score: 0.999 - index / browserLocales.length });
      break;
    }
  }
  return matchedLocales;
}
function compareBrowserLocale(a, b) {
  if (a.score === b.score) {
    return b.code.length - a.code.length;
  }
  return b.score - a.score;
}
function findBrowserLocale(locales, browserLocales) {
  const matchedLocales = matchBrowserLocale(
    locales.map((l) => ({ code: l.code, language: l.language || l.code })),
    browserLocales
  );
  return matchedLocales.sort(compareBrowserLocale).at(0)?.code ?? "";
}

const getCookieLocale = (event, cookieName) => (getCookie(event, cookieName)) || void 0;
const getRouteLocale = (event, route) => getLocaleFromRoute(route);
const getHeaderLocale = (event) => findBrowserLocale(normalizedLocales, parseAcceptLanguage(getRequestHeader(event, "accept-language") || ""));
const getRequestHost = (event) => getRequestURL(event, { xForwardedHost: true }).host;
const getRefererHost = (event) => {
  const referer = getRequestHeader(event, "referer");
  try {
    return referer && new URL(referer).host || void 0;
  } catch {
    return void 0;
  }
};
const getDomainLocales = (domainLocales) => normalizedLocales.map((l) => withRuntimeDomain(l, domainLocales));
const useDetectors = (event, config, nuxtApp) => {
  if (!event) {
    throw new Error("H3Event is required for server-side locale detection");
  }
  const runtimeI18n = useRuntimeI18n();
  let host;
  let locales;
  const getHost = () => host ??= getRequestHost(event);
  const getLocales = () => locales ??= getDomainLocales(runtimeI18n.domainLocales);
  return {
    cookie: () => getCookieLocale(event, config.cookieKey),
    header: () => getHeaderLocale(event) ,
    navigator: () => void 0,
    host: (path) => matchDomainLocale(getLocales(), getHost(), getLocaleFromRoutePath(path)),
    route: (path) => getRouteLocale(event, path),
    /** Passes the locale through when the current host serves it, `undefined` otherwise */
    onHost: (locale) => !locale || isLocaleServedOnHost(getLocales(), getHost(), locale) ? locale : void 0,
    /** Whether the visitor arrived from one of the configured domains */
    fromOwnDomain: () => {
      const referer = getRefererHost(event);
      return !!referer && getLocales().some((l) => isLocaleOnHost(l, referer));
    },
    /** Whether a cookie scoped to the configured `cookieDomain` is readable on every domain */
    cookieSpans: () => !!config.cookieDomain && cookieSpansDomains(getLocales(), config.cookieDomain)
  };
};
function createLocaleDetector(config) {
  const { detection} = config;
  const isSupported = config.isSupportedLocale ?? isSupportedLocale;
  function skipDetect(path, pathLocale) {
    if (detection.redirectOn === "root" && path !== "/") {
      return true;
    }
    if (detection.redirectOn === "no prefix" && !detection.alwaysRedirect && isSupported(pathLocale)) {
      return true;
    }
    return false;
  }
  return function detectLocale(detectors, route, initial) {
    const path = isString(route) ? parsePath(route).pathname : route.path;
    const pass = (locale) => locale;
    const onHost = pass;
    function* detect() {
      const detecting = initial && detection.enabled && !skipDetect(path, detectors.route(path));
      if (detecting) {
        const cookie = onHost;
        const browser = onHost;
        yield cookie(detectors.cookie());
        yield browser(detectors.header());
        yield browser(detectors.navigator());
      }
      {
        yield detectors.route(route);
      }
      if (detecting) {
        yield onHost(detection.fallbackLocale);
      }
    }
    for (const detected of detect()) {
      if (detected && isSupported(detected)) {
        return detected;
      }
    }
    return "";
  };
}

// Generated by @nuxtjs/i18n
const localizedPaths = [
  "/:slug(.*)*",
  "/"
];
const pathToI18nConfig = {};
const i18nPathToPath = {};
const disabledPaths = [];

const emptyRoute = { path: "/", name: "", matched: [], params: {}, meta: {} };
function createPathMatcher(resources, config) {
  const matcher = createRouterMatcher([], {});
  for (const path of [...resources.localizedPaths, ...Object.keys(resources.i18nPathToPath)]) {
    matcher.addRoute({ path, component: () => "", meta: {} });
  }
  const disabledI18nMatcher = createRouterMatcher([], {});
  for (const path of resources.disabledPaths) {
    disabledI18nMatcher.addRoute({ path, component: () => "", meta: {} });
  }
  const formatTrailingSlash = createTrailingSlashFormatter(config.trailingSlash);
  const getI18nPathToI18nPath = (path, locale) => {
    if (!path || !locale) {
      return;
    }
    const plainPath = resources.i18nPathToPath[path] ?? path;
    const i18nConfig = resources.pathToI18nConfig[plainPath];
    if (i18nConfig == null || !(locale in i18nConfig)) {
      return plainPath;
    }
    return i18nConfig[locale] || void 0;
  };
  function isExistingNuxtRoute2(path) {
    if (path === "") {
      return;
    }
    if (path.endsWith("/__nuxt_error")) {
      return;
    }
    if (disabledI18nMatcher.resolve({ path }, emptyRoute).matched.length > 0) {
      return;
    }
    const resolvedMatch = matcher.resolve({ path }, emptyRoute);
    return resolvedMatch.matched.length > 0 ? resolvedMatch : void 0;
  }
  function matchLocalized2(path, locale, defaultLocale) {
    if (path === "") {
      return;
    }
    const parsed = parsePath(path);
    const resolvedMatch = matcher.resolve({ path: parsed.pathname || "/" }, emptyRoute);
    if (resolvedMatch.matched.length === 0) {
      return;
    }
    const alternate = getI18nPathToI18nPath(resolvedMatch.matched[0].path, locale);
    if (!alternate) {
      return;
    }
    const match = matcher.resolve({ params: resolvedMatch.params }, { ...emptyRoute, path: alternate });
    const isPrefixable = prefixable(locale, defaultLocale, config);
    return formatTrailingSlash(withLeadingSlash(joinURL(isPrefixable ? locale : "", match.path)), true);
  }
  return { isExistingNuxtRoute: isExistingNuxtRoute2, matchLocalized: matchLocalized2 };
}
const { isExistingNuxtRoute, matchLocalized } = createPathMatcher(
  { localizedPaths, i18nPathToPath, pathToI18nConfig, disabledPaths },
  { strategy: "prefix_except_default", trailingSlash: false }
);

function createRedirectResolver(config) {
  const { detection, rootRedirect, matchLocalized} = config;
  const isSupported = config.isSupportedLocale ?? isSupportedLocale;
  const detectLocale = createLocaleDetector({ detection, isSupportedLocale: isSupported});
  return function resolveRedirectPath(fullPath, path, pathLocale, defaultLocale, detectors, relocate) {
    let locale = detectLocale(detectors, fullPath, true) || defaultLocale;
    function getLocalizedMatch(locale2) {
      const res = matchLocalized(path || "/", locale2, defaultLocale);
      if (res && res !== fullPath) {
        return res;
      }
    }
    let resolvedPath = void 0;
    let redirectCode = 302;
    const pathname = parsePath(fullPath).pathname;
    if (rootRedirect && pathname === "/") {
      locale = detection.enabled && locale || defaultLocale;
      resolvedPath = isSupported(detectors.route(rootRedirect.path)) && rootRedirect.path || matchLocalized(rootRedirect.path, locale, defaultLocale);
      redirectCode = rootRedirect.code;
    } else if (config.redirectStatusCode) {
      redirectCode = config.redirectStatusCode;
    }
    switch (detection.redirectOn) {
      case "root":
        if (pathname !== "/") {
          break;
        }
      // fallthrough (root has no prefix)
      case "no prefix":
        if (pathLocale) {
          break;
        }
      // fallthrough to resolve
      case "all":
        resolvedPath ??= getLocalizedMatch(locale);
        break;
    }
    return { path: resolvedPath, code: redirectCode, locale };
  };
}

function createRedirectResponse(event, dest, code) {
  event.node.res.setHeader("location", dest);
  event.node.res.statusCode = sanitizeStatusCode(code, event.node.res.statusCode);
  return {
    headers: event.node.res.getHeaders(),
    statusCode: event.node.res.statusCode,
    body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${dest.replace(/"/g, "%22")}"></head></html>`
  };
}
const _wHO1gNbZWtu8ErSF_ck38KbRPvA_jBw6MjP3h9d0J1A = defineNitroPlugin(async (nitro) => {
  const runtimeI18n = useRuntimeI18n();
  const rootRedirect = resolveRootRedirect(runtimeI18n.rootRedirect);
  runtimeI18n.defaultLocale || "";
  try {
    const cacheStorage = useStorage("cache");
    const cachedKeys = await cacheStorage.getKeys("nitro:handlers:i18n");
    await Promise.all(cachedKeys.map((key) => cacheStorage.removeItem(key)));
  } catch {
  }
  const detection = useI18nDetection();
  const cookieOptions = {
    path: "/",
    domain: detection.cookieDomain || void 0,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: detection.cookieSecure
  };
  isFunction(runtimeI18n.baseUrl);
  const baseUrlGetter = (event) => {
    return "";
  };
  const resolveRedirectPath = createRedirectResolver({
    detection,
    rootRedirect,
    redirectStatusCode: runtimeI18n.redirectStatusCode,
    matchLocalized});
  nitro.hooks.hook("request", async (event) => {
    await initializeI18nContext(event);
  });
  nitro.hooks.hook("render:before", async (context) => {
    const { event } = context;
    const ctx = useI18nContext(event);
    const url = getRequestURL(event);
    const detector = useDetectors(event, detection);
    const localeSegment = detector.route(event.path);
    const pathLocale = isSupportedLocale(localeSegment) && localeSegment || void 0;
    const { pathname } = parsePath(event.path);
    const path = pathLocale ? pathname.slice(pathLocale.length + 1) || "/" : pathname;
    if (!url.pathname.includes("/_i18n") && !isExistingNuxtRoute(path)) {
      return;
    }
    const resolved = resolveRedirectPath(
      event.path,
      path,
      pathLocale,
      ctx.vueI18nOptions.defaultLocale,
      detector,
      void 0
    );
    if (resolved.path && (resolved.origin || resolved.path !== pathname)) {
      ctx.detectLocale = resolved.locale;
      detection.useCookie && (!resolved.origin || detection.cookieDomain) && setCookie(event, detection.cookieKey, resolved.locale, cookieOptions);
      context.response = createRedirectResponse(
        event,
        // the resolved path is base-free (matched against base-free routes), re-add `app.baseURL`
        joinURL(
          resolved.origin || baseUrlGetter(),
          useRuntimeConfig(event).app.baseURL,
          resolved.path + url.search
        ),
        resolved.code
      );
      return;
    }
  });
  nitro.hooks.hook("render:html", (htmlContext, { event }) => {
    tryUseI18nContext(event);
  });
});

const script = "\"use strict\";(()=>{const o=window,e=document.documentElement,c=[\"dark\",\"light\"],s=getStorageValue(\"localStorage\",\"nuxt-color-mode\")||\"system\";let r=s===\"system\"?f():s;const l=e.getAttribute(\"data-color-mode-forced\");l&&(r=l),i(r),o[\"__NUXT_COLOR_MODE__\"]={preference:s,value:r,getColorScheme:f,addColorScheme:i,removeColorScheme:d};function i(t){const a=\"\"+t+\"\",n=\"\";e.classList?e.classList.add(a):e.className+=\" \"+a,n&&e.setAttribute(\"data-\"+n,t)}function d(t){const a=\"\"+t+\"\",n=\"\";e.classList?e.classList.remove(a):e.className=e.className.replace(new RegExp(a,\"g\"),\"\"),n&&e.removeAttribute(\"data-\"+n)}function u(t){return o.matchMedia(\"(prefers-color-scheme\"+t+\")\")}function f(){if(o.matchMedia&&u(\"\").media!==\"not all\"){for(const t of c)if(u(\":\"+t).matches)return t}return\"light\"}})();function getStorageValue(o,e){switch(o){case\"localStorage\":try{return window.localStorage.getItem(e)}catch{return null}case\"sessionStorage\":try{return window.sessionStorage.getItem(e)}catch{return null}case\"cookie\":try{return getCookie(e)}catch{return null}default:return null}}function getCookie(o){const c=(\"; \"+window.document.cookie).split(\"; \"+o+\"=\");if(c.length===2){const s=c.pop();return s?s.split(\";\").shift():null}}";

const _L95nPgoKTKpVWZOAO0unO8rIIU1aunvV7FXurW_0ONg = (function(nitro) {
  nitro.hooks.hook("render:html", (htmlContext) => {
    htmlContext.head.push(`<script>${script}<\/script>`);
  });
});

const plugins = [
  _wHO1gNbZWtu8ErSF_ck38KbRPvA_jBw6MjP3h9d0J1A,
_L95nPgoKTKpVWZOAO0unO8rIIU1aunvV7FXurW_0ONg
];

const assets = {
  "/_nuxt/0XqUuWfO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"54c-6y306wiktTXOhC3g4IXzmXyIXHo\"",
    "mtime": "2026-09-05T15:25:32.540Z",
    "size": 1356,
    "path": "../public/_nuxt/0XqUuWfO.js"
  },
  "/_nuxt/1ar_Pkce.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c9-I4Ok7LRpCJXP0mnpBJKGaODoGYI\"",
    "mtime": "2026-09-05T15:25:32.540Z",
    "size": 201,
    "path": "../public/_nuxt/1ar_Pkce.js"
  },
  "/_nuxt/2IIEA8gg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"48c2-ZwQ2cwHD2zYmDKI7/nyy3ix4I+w\"",
    "mtime": "2026-09-05T15:25:32.540Z",
    "size": 18626,
    "path": "../public/_nuxt/2IIEA8gg.js"
  },
  "/_nuxt/4CJ0cIlV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"18d3-uvwpXPrbgtmIfA6mOERFv9nxDZs\"",
    "mtime": "2026-09-05T15:25:32.540Z",
    "size": 6355,
    "path": "../public/_nuxt/4CJ0cIlV.js"
  },
  "/_nuxt/4ECif3Ni.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"93d-/sVhb3SEHwtfydsivYVv/QYptE0\"",
    "mtime": "2026-09-05T15:25:32.540Z",
    "size": 2365,
    "path": "../public/_nuxt/4ECif3Ni.js"
  },
  "/_nuxt/4G7pJPwS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5122-EYbhSAFXfZmiSxaV0KYhluLTQbk\"",
    "mtime": "2026-09-05T15:25:32.540Z",
    "size": 20770,
    "path": "../public/_nuxt/4G7pJPwS.js"
  },
  "/_nuxt/4Rifxk1h.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"171a-TSYmEwuWOwqW2nRoQk9H5i8SMLM\"",
    "mtime": "2026-09-05T15:25:32.540Z",
    "size": 5914,
    "path": "../public/_nuxt/4Rifxk1h.js"
  },
  "/_nuxt/4ZHwLPI5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"102f-/qf7VwUwaR44/PoCwchNpsXBCig\"",
    "mtime": "2026-09-05T15:25:32.540Z",
    "size": 4143,
    "path": "../public/_nuxt/4ZHwLPI5.js"
  },
  "/_nuxt/5eyTD99u.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5251-9Gq8szTlwebZaIdJaM7IWiow7Es\"",
    "mtime": "2026-09-05T15:25:32.540Z",
    "size": 21073,
    "path": "../public/_nuxt/5eyTD99u.js"
  },
  "/_nuxt/63DygqXV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ec-w+m5E1uUxLl6bk+O58f52KYxlfs\"",
    "mtime": "2026-09-05T15:25:32.540Z",
    "size": 236,
    "path": "../public/_nuxt/63DygqXV.js"
  },
  "/_nuxt/7GGW24-e.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"39b8-NsVH2GZUf+a0eEAVHGmkKD5wFF0\"",
    "mtime": "2026-09-05T15:25:32.540Z",
    "size": 14776,
    "path": "../public/_nuxt/7GGW24-e.js"
  },
  "/_nuxt/8PwUyIlP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"54f5-yiUGHB9sDFtCdI18gVuaDAtc5aM\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 21749,
    "path": "../public/_nuxt/8PwUyIlP.js"
  },
  "/_nuxt/9MfHhQsQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6067-S/Gb5sJvTQjXT6tviZfFUA6q1QM\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 24679,
    "path": "../public/_nuxt/9MfHhQsQ.js"
  },
  "/_nuxt/B-GNTpdW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"965c-4ioAQx1GqbCPX+xYlA9Zs3HquLA\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 38492,
    "path": "../public/_nuxt/B-GNTpdW.js"
  },
  "/_nuxt/B-ZEM4O_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9896-FE5jdttC+0A1SGJleUB891dKIHk\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 39062,
    "path": "../public/_nuxt/B-ZEM4O_.js"
  },
  "/_nuxt/B0KNNn43.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"123-FYV0Lla/heYalKIUeNRCzg20yiE\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 291,
    "path": "../public/_nuxt/B0KNNn43.js"
  },
  "/_nuxt/7_athoDk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"29190-8PfN1Q3fAJGqDVYDNXjBO3+qdUA\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 168336,
    "path": "../public/_nuxt/7_athoDk.js"
  },
  "/_nuxt/B1ASEJ_x.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1211-cU3NYhZRMgBz28f75dC9Ju7f+fY\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 4625,
    "path": "../public/_nuxt/B1ASEJ_x.js"
  },
  "/_nuxt/B1RWQWA5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"407a-Brje/BhAM9695OV939aQLwEO8xk\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 16506,
    "path": "../public/_nuxt/B1RWQWA5.js"
  },
  "/_nuxt/B2OO5cIa.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"24d4-sz7O1eIH0kuOBZQ5jD3VYM+h1sw\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 9428,
    "path": "../public/_nuxt/B2OO5cIa.js"
  },
  "/_nuxt/B2gwz-sJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1900-w+tmhRD2tZNK/eOJJzYwW8039zE\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 6400,
    "path": "../public/_nuxt/B2gwz-sJ.js"
  },
  "/_nuxt/B3KkkTXl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"72bc-pmtqoqchEthKYVG2CmYceWhNxbM\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 29372,
    "path": "../public/_nuxt/B3KkkTXl.js"
  },
  "/_nuxt/B3gFvitq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"28e1-ntEV8+tcABChT5jabyTIHec2YNc\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 10465,
    "path": "../public/_nuxt/B3gFvitq.js"
  },
  "/_nuxt/B5B4dYe2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5be-byHokQUxiM0QaNofAgEtMRckSow\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 1470,
    "path": "../public/_nuxt/B5B4dYe2.js"
  },
  "/_nuxt/B5W6OYN7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"48c8-SDNS8UVEsG3XzDBMMNg66beFccE\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 18632,
    "path": "../public/_nuxt/B5W6OYN7.js"
  },
  "/_nuxt/B5eOa1yu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5ee-/FBfFAd4/5HdMZbilvdasyzSBpE\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 1518,
    "path": "../public/_nuxt/B5eOa1yu.js"
  },
  "/_nuxt/B68TUdTA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"37c0-zwlriwBvqZWNlUMcxaXvO6TEIEo\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 14272,
    "path": "../public/_nuxt/B68TUdTA.js"
  },
  "/_nuxt/B6D30XZt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"795b-Wwb4owmkn9ou845GJ+IUBLns8dY\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 31067,
    "path": "../public/_nuxt/B6D30XZt.js"
  },
  "/_nuxt/B7YBb3Hq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"119e2-QOZ6AsG+4wA7kLyS4QHAd0eNyfE\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 72162,
    "path": "../public/_nuxt/B7YBb3Hq.js"
  },
  "/_nuxt/B7ZEbQpA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e53e-W98II374XAcnlWi5Ffx6LrS7asc\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 58686,
    "path": "../public/_nuxt/B7ZEbQpA.js"
  },
  "/_nuxt/BAWPOn9u.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"586d-5THYyxYWxrgUBHTpU/2M5tL5Bg8\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 22637,
    "path": "../public/_nuxt/BAWPOn9u.js"
  },
  "/_nuxt/BAlpcs8r.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4e58-rm8lGTEFVymQ6WjbGcP5r8IJY/Q\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 20056,
    "path": "../public/_nuxt/BAlpcs8r.js"
  },
  "/_nuxt/BApYaJfA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6b31-fEBMKCHb+ApsLQuCGUdB/b3FJmk\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 27441,
    "path": "../public/_nuxt/BApYaJfA.js"
  },
  "/_nuxt/BC2Px7Mm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d65-3vWdp+yl3AuCLgA8m73djUsnsVo\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 3429,
    "path": "../public/_nuxt/BC2Px7Mm.js"
  },
  "/_nuxt/BCNUyKfg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1490-m4jbvpBy3MYfeZno/Nc0tV4h04Q\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 5264,
    "path": "../public/_nuxt/BCNUyKfg.js"
  },
  "/_nuxt/BCRDcNX_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2be-QDv4kvV8Jzry1e08jnzPqzyEqwA\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 702,
    "path": "../public/_nuxt/BCRDcNX_.js"
  },
  "/_nuxt/BC_s9l72.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5869-P5iGca6VEUolCJPN5+nBTkmVnAM\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 22633,
    "path": "../public/_nuxt/BC_s9l72.js"
  },
  "/_nuxt/BDNMzG2s.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"54-MasMfSk/A98C3Gn9uIOxtFxkWNw\"",
    "mtime": "2026-09-05T15:25:32.541Z",
    "size": 84,
    "path": "../public/_nuxt/BDNMzG2s.js"
  },
  "/_nuxt/BHWKrbxM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5247-mLN34V/Iy7/G5Zv04NhSqBuofAQ\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 21063,
    "path": "../public/_nuxt/BHWKrbxM.js"
  },
  "/_nuxt/BHpQb5nM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3727-otVupnpP84LUPAbYCoDAQVYP1CU\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 14119,
    "path": "../public/_nuxt/BHpQb5nM.js"
  },
  "/_nuxt/BJ5XuW7r.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2abd-md2mpj9Hgb6xqQhszrJEYBQkiro\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 10941,
    "path": "../public/_nuxt/BJ5XuW7r.js"
  },
  "/_nuxt/BJ7z_olH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f4-ow0J49CAYDHsn4dnJXT0zo51+II\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 244,
    "path": "../public/_nuxt/BJ7z_olH.js"
  },
  "/_nuxt/BJitypiv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"32e7-HjAkR2uOBogOmWhLBAsPBUUY3DA\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 13031,
    "path": "../public/_nuxt/BJitypiv.js"
  },
  "/_nuxt/BKPPkBW4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"22cf-BqxErofjogBFJaYZeke3Aqd5tH8\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 8911,
    "path": "../public/_nuxt/BKPPkBW4.js"
  },
  "/_nuxt/BLLp2fMj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"346-spnKUNkIWWN4vAkO2uAcfHvPlzw\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 838,
    "path": "../public/_nuxt/BLLp2fMj.js"
  },
  "/_nuxt/BML5mF2J.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"42dc-5onS72lXPoD4khTu8mVFIQNJJ20\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 17116,
    "path": "../public/_nuxt/BML5mF2J.js"
  },
  "/_nuxt/BMqwQI7S.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"cb4-6C/Xb9wrKKtR0Phw8mfpFb3bxKo\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 3252,
    "path": "../public/_nuxt/BMqwQI7S.js"
  },
  "/_nuxt/BNLmms1o.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b1d-E/CRJAfx+nG7+WvYdV7vyzw4ohI\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 2845,
    "path": "../public/_nuxt/BNLmms1o.js"
  },
  "/_nuxt/BPWYMyMF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"18c9-xft327ul2Q8VFr2Vrav+r67uUeA\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 6345,
    "path": "../public/_nuxt/BPWYMyMF.js"
  },
  "/_nuxt/BPjhmG05.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"586a-NgnqV52944OzW/PHcu2iOxQIwy8\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 22634,
    "path": "../public/_nuxt/BPjhmG05.js"
  },
  "/_nuxt/BR5RXkoi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"caf-BR2uSDrCUZKovN07NvZuHJFQ1Vg\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 3247,
    "path": "../public/_nuxt/BR5RXkoi.js"
  },
  "/_nuxt/BQ8TNH-l.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7904-j5snqDup9kH5XNNAxXzMiYDI+1c\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 30980,
    "path": "../public/_nuxt/BQ8TNH-l.js"
  },
  "/_nuxt/BRdr0IET.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"61ce-97f6qnjzLbN2CKedXA92urhzBx4\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 25038,
    "path": "../public/_nuxt/BRdr0IET.js"
  },
  "/_nuxt/BSMLrYjP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5869-J6mFswRAYsQQH0OdHq6hoPPMj4k\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 22633,
    "path": "../public/_nuxt/BSMLrYjP.js"
  },
  "/_nuxt/BSPImt4y.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bfc2-81cQq+0jaupeUYiD/6TwUTZ0aYk\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 49090,
    "path": "../public/_nuxt/BSPImt4y.js"
  },
  "/_nuxt/BSWPekZh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1890-MBvU563OqX//HRUnI0O1VxcUi5Y\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 6288,
    "path": "../public/_nuxt/BSWPekZh.js"
  },
  "/_nuxt/BUDT5pXO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b01-gVolUA/af9LbBXxQeGm5wFmBOcw\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 2817,
    "path": "../public/_nuxt/BUDT5pXO.js"
  },
  "/_nuxt/BWXHIvNe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"154e-a8hDb/wNHdS3SnO796+ZTjj52i0\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 5454,
    "path": "../public/_nuxt/BWXHIvNe.js"
  },
  "/_nuxt/BXViO-2h.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3749-VOioymMJ0jdjN0Ft18ZgSgJi+G4\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 14153,
    "path": "../public/_nuxt/BXViO-2h.js"
  },
  "/_nuxt/BXeXVLqQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"190a-0Sl99+V5NaHSG6Mr9rmENRxQ2ZE\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 6410,
    "path": "../public/_nuxt/BXeXVLqQ.js"
  },
  "/_nuxt/BXorSQgm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1d5d7-g+TN62XQxDhyfnz2/bzxCrHGBvs\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 120279,
    "path": "../public/_nuxt/BXorSQgm.js"
  },
  "/_nuxt/BYOwaDjH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e7c0-9dh2Uz0tzHthiPTPMvOO/XQXC7Q\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 59328,
    "path": "../public/_nuxt/BYOwaDjH.js"
  },
  "/_nuxt/BYnGhZoM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"44f2-P+MTtRNGujAGj2fSOosVRiGlZ5g\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 17650,
    "path": "../public/_nuxt/BYnGhZoM.js"
  },
  "/_nuxt/BYpltu6W.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"25d1-bE/b1GEZf9LCwpSnHIKkrJs2+ls\"",
    "mtime": "2026-09-05T15:25:32.542Z",
    "size": 9681,
    "path": "../public/_nuxt/BYpltu6W.js"
  },
  "/_nuxt/BZCL-v6S.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"35bc-fWhCXVoaGOQCCZxMrsVovDyZmug\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 13756,
    "path": "../public/_nuxt/BZCL-v6S.js"
  },
  "/_nuxt/BZKGQDc2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6375-9/hKviglAwr2t+H81kv2x0StT20\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 25461,
    "path": "../public/_nuxt/BZKGQDc2.js"
  },
  "/_nuxt/B_IxL0uk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a86e-D9WlSpBb47QqvDD09yIzXLsM+s8\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 43118,
    "path": "../public/_nuxt/B_IxL0uk.js"
  },
  "/_nuxt/B_bV9PQ9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f5d-NGTy3dwIazzks1UGQ1v6YH0efUU\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 8029,
    "path": "../public/_nuxt/B_bV9PQ9.js"
  },
  "/_nuxt/B_tTalzw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3900-hPk6jWbHt1SXFm77GNw7GnF7+BQ\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 14592,
    "path": "../public/_nuxt/B_tTalzw.js"
  },
  "/_nuxt/Bczc5xTa.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"75e-zYDlWd4MQsqRqQRe0vgnUVYXd3U\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 1886,
    "path": "../public/_nuxt/Bczc5xTa.js"
  },
  "/_nuxt/Bd__XmdH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f59a-Y0WbUeD5sEGeeDIOkLyOaL0DWCU\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 62874,
    "path": "../public/_nuxt/Bd__XmdH.js"
  },
  "/_nuxt/BgfXC-Er.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e1a-7sDG4Jfjip6JLJucm1uake40bO4\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 3610,
    "path": "../public/_nuxt/BgfXC-Er.js"
  },
  "/_nuxt/BhOFtLLF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13ca9-Cq6hjaVsUD/thyHEDUaPqFCFy34\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 81065,
    "path": "../public/_nuxt/BhOFtLLF.js"
  },
  "/_nuxt/BiFt_7mu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"70d2-RAOXvx5d+Vlx+pHJycEDU4gLuCQ\"",
    "mtime": "2026-09-05T15:25:32.544Z",
    "size": 28882,
    "path": "../public/_nuxt/BiFt_7mu.js"
  },
  "/_nuxt/Bd5PR4J-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bfc68-2LX1tIMZpCeNKXgKhb8d8bucAnc\"",
    "mtime": "2026-09-05T15:25:32.544Z",
    "size": 785512,
    "path": "../public/_nuxt/Bd5PR4J-.js"
  },
  "/_nuxt/BiJDBrnU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ca0-QG5Dqhyc2Qq/rLv53JNkaW6/f2Y\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 3232,
    "path": "../public/_nuxt/BiJDBrnU.js"
  },
  "/_nuxt/Bj61d0ZC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2678-XU6cpxsNKAcvJlnyqrIqHsnhXgg\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 9848,
    "path": "../public/_nuxt/Bj61d0ZC.js"
  },
  "/_nuxt/Bj7E1mRn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4010-hX8OcicMMcSfNxS3sguuaMzZE/s\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 16400,
    "path": "../public/_nuxt/Bj7E1mRn.js"
  },
  "/_nuxt/Bky6fOYQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"293b-YJkOa4hbUeC7oMBcXZdonz3UN1k\"",
    "mtime": "2026-09-05T15:25:32.543Z",
    "size": 10555,
    "path": "../public/_nuxt/Bky6fOYQ.js"
  },
  "/_nuxt/BkyTk9wS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14ee-If2BXIs/OJDydRr1PwwownK20Yw\"",
    "mtime": "2026-09-05T15:25:32.544Z",
    "size": 5358,
    "path": "../public/_nuxt/BkyTk9wS.js"
  },
  "/_nuxt/Bm3Qr25_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"48b4-l1JAQw2c0EzH7BrEqgTDyHZBbKs\"",
    "mtime": "2026-09-05T15:25:32.544Z",
    "size": 18612,
    "path": "../public/_nuxt/Bm3Qr25_.js"
  },
  "/_nuxt/BmoHmdaw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"66b9-aVBDr3AIpH92fBZtIzMWAeokVG8\"",
    "mtime": "2026-09-05T15:25:32.544Z",
    "size": 26297,
    "path": "../public/_nuxt/BmoHmdaw.js"
  },
  "/_nuxt/BmuOG9ZW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"42df-3d8cP80Wlh/s3V3o5x+kbNH/P/E\"",
    "mtime": "2026-09-05T15:25:32.544Z",
    "size": 17119,
    "path": "../public/_nuxt/BmuOG9ZW.js"
  },
  "/_nuxt/BnlCZFoB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f41-YyL86/2d9R43B30KRmjYiIxmSqc\"",
    "mtime": "2026-09-05T15:25:32.544Z",
    "size": 3905,
    "path": "../public/_nuxt/BnlCZFoB.js"
  },
  "/_nuxt/Bozd7klA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"42e0-56C+/BsRX/EwDZFOIQ2eLtVpQAE\"",
    "mtime": "2026-09-05T15:25:32.544Z",
    "size": 17120,
    "path": "../public/_nuxt/Bozd7klA.js"
  },
  "/_nuxt/BqSvPtSC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"326-S7syYSBc/AmV4nZAoNIZEoPdFxA\"",
    "mtime": "2026-09-05T15:25:32.544Z",
    "size": 806,
    "path": "../public/_nuxt/BqSvPtSC.js"
  },
  "/_nuxt/Bqwy1Gya.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4e72-Wocy1XobYE83FCI8Iv9gC13h92c\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 20082,
    "path": "../public/_nuxt/Bqwy1Gya.js"
  },
  "/_nuxt/BrPxG357.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3f83-wIiud5ethUaXPNWaGrfSq/OuUCs\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 16259,
    "path": "../public/_nuxt/BrPxG357.js"
  },
  "/_nuxt/BroJfC0k.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5ec1-Uhw8ZBosu9fF/KkIhXk5o9LnTOs\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 24257,
    "path": "../public/_nuxt/BroJfC0k.js"
  },
  "/_nuxt/BsKzXJz4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1411-IFR7J4+2EgZLEQTpbSJPJUooMjU\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 5137,
    "path": "../public/_nuxt/BsKzXJz4.js"
  },
  "/_nuxt/BsSzOQcm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"29fbd-XQYNiYAXR+SewqfDuJSny+JAejc\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 171965,
    "path": "../public/_nuxt/BsSzOQcm.js"
  },
  "/_nuxt/BtDbiS_P.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d21-Wx2y8LITQh5UIzJcl6fV8nt2C80\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 3361,
    "path": "../public/_nuxt/BtDbiS_P.js"
  },
  "/_nuxt/BuMHcmVP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4e54-xseu+OubNVTMuNkmO0ozgimPgv4\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 20052,
    "path": "../public/_nuxt/BuMHcmVP.js"
  },
  "/_nuxt/Bx1FflLF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"385e-FJH4zuEbdgE4QrMCEc/EbpgACks\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 14430,
    "path": "../public/_nuxt/Bx1FflLF.js"
  },
  "/_nuxt/Bx91Zils.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"daa-hvrmFIs/eFLu0CjJe37Qf9PTvi0\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 3498,
    "path": "../public/_nuxt/Bx91Zils.js"
  },
  "/_nuxt/BxMlprV5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1eb6-tOHbLdCPJP/8cAFGyUxQQFapf0s\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 7862,
    "path": "../public/_nuxt/BxMlprV5.js"
  },
  "/_nuxt/BxpfTIzt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d617-GyeYBLzagGbanIoOEfRj/9NzRl4\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 54807,
    "path": "../public/_nuxt/BxpfTIzt.js"
  },
  "/_nuxt/ByJddavk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e6d-CqWmfLhEn9h4o7j+z1L+2hzWTz8\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 3693,
    "path": "../public/_nuxt/ByJddavk.js"
  },
  "/_nuxt/BnjxR4X6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"97ef5-xKfG6MCFH311jWhLo+yJiElPNpc\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 622325,
    "path": "../public/_nuxt/BnjxR4X6.js"
  },
  "/_nuxt/ByWQv1Qj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ee0-TcUVKmgsPl1wW1UfMtBYk73YT20\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 12000,
    "path": "../public/_nuxt/ByWQv1Qj.js"
  },
  "/_nuxt/ByZLo-HZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"469c-0AWt8+jP5Gm4ECP7sr5aW+exeMk\"",
    "mtime": "2026-09-05T15:25:32.545Z",
    "size": 18076,
    "path": "../public/_nuxt/ByZLo-HZ.js"
  },
  "/_nuxt/BzHyRl2O.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"209d4-DeqH+2tzdCPHEYQvNSTlLk1HtGw\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 133588,
    "path": "../public/_nuxt/BzHyRl2O.js"
  },
  "/_nuxt/C-LZuMrd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2c8a-2nZhSj8ErhkYr+nffNmUkJ4WOZU\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 11402,
    "path": "../public/_nuxt/C-LZuMrd.js"
  },
  "/_nuxt/C03EYrpw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e13-Y2HQeskDkIYfEJR4S2vRYFcpBEQ\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 3603,
    "path": "../public/_nuxt/C03EYrpw.js"
  },
  "/_nuxt/C0MpOrj4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ce8-JkM6PKUFXl2FGWNSP80FlzBAzOQ\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 3304,
    "path": "../public/_nuxt/C0MpOrj4.js"
  },
  "/_nuxt/C1IUL_tW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19e1-xipbuT+ut55rsa6p2YWWnPXIQOA\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 6625,
    "path": "../public/_nuxt/C1IUL_tW.js"
  },
  "/_nuxt/C2pBCSgt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3f03-pCGuJXKFlwpPgAdys7OtNKo2CIQ\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 16131,
    "path": "../public/_nuxt/C2pBCSgt.js"
  },
  "/_nuxt/C3h-C4tm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4eb5-GPeeLiQcihxJyJ/XGNctks3buLA\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 20149,
    "path": "../public/_nuxt/C3h-C4tm.js"
  },
  "/_nuxt/C4cDjZDF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"170-dyLvzmYg7f4v49Jxs0RCgqODhiw\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 368,
    "path": "../public/_nuxt/C4cDjZDF.js"
  },
  "/_nuxt/C4mPaxYk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"214-vFdknHjtXHfvPVy342lsflhMCzw\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 532,
    "path": "../public/_nuxt/C4mPaxYk.js"
  },
  "/_nuxt/C5JeTiTv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"118b-E3AB6B0Uu6V4gOGHsTWthUrAWXs\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 4491,
    "path": "../public/_nuxt/C5JeTiTv.js"
  },
  "/_nuxt/C5qYipkI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bbcb-SSZ8N/N8J1L9xgeMKEqmVA7NooY\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 48075,
    "path": "../public/_nuxt/C5qYipkI.js"
  },
  "/_nuxt/C7UOKdEL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1238-65W5UQd8E8WOFG/ZDpSpBxGhBrY\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 4664,
    "path": "../public/_nuxt/C7UOKdEL.js"
  },
  "/_nuxt/C7mF5XQf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3b3e-YxIDCI6wb09FnashFrWp3g4Btiw\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 15166,
    "path": "../public/_nuxt/C7mF5XQf.js"
  },
  "/_nuxt/C820rvS2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5866-25HmDMu+rImMXCTGS5gZASgjtgM\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 22630,
    "path": "../public/_nuxt/C820rvS2.js"
  },
  "/_nuxt/C8oCnwJJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8c6a-S++56kzenQ5IH/jGKj7GqgAiDcc\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 35946,
    "path": "../public/_nuxt/C8oCnwJJ.js"
  },
  "/_nuxt/C8pVoKbM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"866-XPDAWlne8TZQVWYfZmmuI0fUOt8\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 2150,
    "path": "../public/_nuxt/C8pVoKbM.js"
  },
  "/_nuxt/C8r90Shi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"21c-qbjLJfjkyVbAI3pxvhH1QMhVVVQ\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 540,
    "path": "../public/_nuxt/C8r90Shi.js"
  },
  "/_nuxt/C8ufuNyb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b5c7-AHmc+Yth63GvqNf1IiVhPoK7EcU\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 46535,
    "path": "../public/_nuxt/C8ufuNyb.js"
  },
  "/_nuxt/C9Q5zVZY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c6a2-106r1j/vyCkFaXSsXjtL+puD61k\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 50850,
    "path": "../public/_nuxt/C9Q5zVZY.js"
  },
  "/_nuxt/C9uZIIAs.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ee-EKM6p6SF29GGOVcgHysHr4H1iMo\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 238,
    "path": "../public/_nuxt/C9uZIIAs.js"
  },
  "/_nuxt/C9xNZdZF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2f69-pEaLS1J8Kf3KO0sLSeAre5/mQA8\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 12137,
    "path": "../public/_nuxt/C9xNZdZF.js"
  },
  "/_nuxt/CA96_NUW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b6e-ped/d0BF6N2Hz5eBxOvbepzWy8E\"",
    "mtime": "2026-09-05T15:25:32.546Z",
    "size": 2926,
    "path": "../public/_nuxt/CA96_NUW.js"
  },
  "/_nuxt/CA9gdOdF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7ac8-cL2TMSsj3cj1vuVVC/GgtXWtGAk\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 31432,
    "path": "../public/_nuxt/CA9gdOdF.js"
  },
  "/_nuxt/CAekHB0j.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11a4-trxsM1/MbusU3Npaug6kanp6l7o\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 4516,
    "path": "../public/_nuxt/CAekHB0j.js"
  },
  "/_nuxt/CBce3t8t.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"18af-fkeyAYJZg9fRhUMMkAhTpJUefMc\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 6319,
    "path": "../public/_nuxt/CBce3t8t.js"
  },
  "/_nuxt/CCSX75yM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4eb7-e0L26qR6V8sjNoZsqyLvM0bHn8A\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 20151,
    "path": "../public/_nuxt/CCSX75yM.js"
  },
  "/_nuxt/CD0b4qGD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"455-Ahord+Roz2BYHxm5Xy472hlffcs\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 1109,
    "path": "../public/_nuxt/CD0b4qGD.js"
  },
  "/_nuxt/CCn79oCD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"737c-rV/bb8fsiZD6nfMIXLbhevdM8jU\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 29564,
    "path": "../public/_nuxt/CCn79oCD.js"
  },
  "/_nuxt/CDI4W71p.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19df-Xnbfirs9PvSuSHSXY30C+o45Bz4\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 6623,
    "path": "../public/_nuxt/CDI4W71p.js"
  },
  "/_nuxt/CDQGk31u.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"51b-CzyiOD3DMi2ucOikJ8+DSJO5N+4\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 1307,
    "path": "../public/_nuxt/CDQGk31u.js"
  },
  "/_nuxt/CDeNXAV0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3558-VB41LuZIl6XLzr7eJJ+jeN8s1Jw\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 13656,
    "path": "../public/_nuxt/CDeNXAV0.js"
  },
  "/_nuxt/CDv2pdJW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ca6-wNyCm1+qoFJRQxocdUGFzetBaW8\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 11430,
    "path": "../public/_nuxt/CDv2pdJW.js"
  },
  "/_nuxt/CE9AQfxI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3f45-Xbk8zADe+IwCdFl0bOC55/w3XRM\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 16197,
    "path": "../public/_nuxt/CE9AQfxI.js"
  },
  "/_nuxt/CE9ld1lL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2249-dqzPAxS+n2uEP0q2G/es3vODZXo\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 8777,
    "path": "../public/_nuxt/CE9ld1lL.js"
  },
  "/_nuxt/CEGMly9W.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"614d-dlczSnYqlp/T2H8E+hZFJ/oO+GI\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 24909,
    "path": "../public/_nuxt/CEGMly9W.js"
  },
  "/_nuxt/CHQ94UKr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"48c2-GxmsftmNhfPeLsGCjsaW+0AFQ+c\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 18626,
    "path": "../public/_nuxt/CHQ94UKr.js"
  },
  "/_nuxt/CFho3top.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2bd-nUHCCFRO1m3vHFxwB//vGcXWTk4\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 701,
    "path": "../public/_nuxt/CFho3top.js"
  },
  "/_nuxt/CJTPZ8u_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e1b-acID6vm5Ft7LpTfICSnvdXlkdgs\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 3611,
    "path": "../public/_nuxt/CJTPZ8u_.js"
  },
  "/_nuxt/CJptbzkE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ee-zLInqi4fLhyg+WhyzBD2dnz4OLs\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 238,
    "path": "../public/_nuxt/CJptbzkE.js"
  },
  "/_nuxt/CLvhMVsD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3de5-nqVyM9fju6Lh1Vt5YoeULewzVZg\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 15845,
    "path": "../public/_nuxt/CLvhMVsD.js"
  },
  "/_nuxt/CLwyXe_n.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"83f8-Q995dTLweQEs3bldb1Wza8deaw0\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 33784,
    "path": "../public/_nuxt/CLwyXe_n.js"
  },
  "/_nuxt/CMLA9XwU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14d5-cJGpDhdHidQa4W7pxuSRKTw/IuU\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 5333,
    "path": "../public/_nuxt/CMLA9XwU.js"
  },
  "/_nuxt/CN-kk2g8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"dfca-7RoaQq1kfBYNGFxuXMN/BK9ORHU\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 57290,
    "path": "../public/_nuxt/CN-kk2g8.js"
  },
  "/_nuxt/CP7-lDPc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ee-yRliKBb0Ar8QgY2xQuYWsN92kEM\"",
    "mtime": "2026-09-05T15:25:32.547Z",
    "size": 238,
    "path": "../public/_nuxt/CP7-lDPc.js"
  },
  "/_nuxt/CPBLT8Qm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9c9-GCpVn7crf7H5RCdDWTPszyv9OPs\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 2505,
    "path": "../public/_nuxt/CPBLT8Qm.js"
  },
  "/_nuxt/CQ2zXKGN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5c6e-Miu0DN9Zf+/txv1dd0XikyWw0Kk\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 23662,
    "path": "../public/_nuxt/CQ2zXKGN.js"
  },
  "/_nuxt/CQ30axUk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1d3-nl7A/BmQAXva73i1NN3SqE6WYsE\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 467,
    "path": "../public/_nuxt/CQ30axUk.js"
  },
  "/_nuxt/CRGYupPL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"922-oM0NCAjMggXnMDWsPO47rGADnic\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 2338,
    "path": "../public/_nuxt/CRGYupPL.js"
  },
  "/_nuxt/CSRkHgEL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a0a-Sa5CIrE3F7j3Tj8QpsTYZZbj5CU\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 2570,
    "path": "../public/_nuxt/CSRkHgEL.js"
  },
  "/_nuxt/CTte8Vi7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19c-7k4rPm6OileX5rj9bODJ4iJF3Mg\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 412,
    "path": "../public/_nuxt/CTte8Vi7.js"
  },
  "/_nuxt/CUHmPFLl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14ff-0lqK3zp+RxAMhXrI+Q6Ggd67V2M\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 5375,
    "path": "../public/_nuxt/CUHmPFLl.js"
  },
  "/_nuxt/CUNNN1IS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2804-AUlB+9XpKwQXWM338WkLDoKruZE\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 10244,
    "path": "../public/_nuxt/CUNNN1IS.js"
  },
  "/_nuxt/CV2tkWYe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d15-nPGQEXpTu0tTH1nidMtmNyjE850\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 3349,
    "path": "../public/_nuxt/CV2tkWYe.js"
  },
  "/_nuxt/CX3SVN5J.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"54c-Jc92ijR03SkMgDPww0DVYqf86l8\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 1356,
    "path": "../public/_nuxt/CX3SVN5J.js"
  },
  "/_nuxt/CXuKk5E8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"925c-Mdq1ru9OloXvvJR5ZokeF37Wl14\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 37468,
    "path": "../public/_nuxt/CXuKk5E8.js"
  },
  "/_nuxt/CYIUgYqB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9712-6r/It9/gwY/IiHXdctH/p0Qzu1A\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 38674,
    "path": "../public/_nuxt/CYIUgYqB.js"
  },
  "/_nuxt/CYNrtFtB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15b82-zZ3VRYx7HvonKiK/otjKHiG2gEM\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 88962,
    "path": "../public/_nuxt/CYNrtFtB.js"
  },
  "/_nuxt/CYpm1nAK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c1e-eUqUob+aYw+aqIbG8GXXRhY1PKo\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 3102,
    "path": "../public/_nuxt/CYpm1nAK.js"
  },
  "/_nuxt/CZbG8q4J.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a51-emIq5Sy1QQeXF+oHt5xXolwRges\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 2641,
    "path": "../public/_nuxt/CZbG8q4J.js"
  },
  "/_nuxt/CZd0xW_V.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1146-VOkG5dV0iKFeWLakLvIkBUrozxQ\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 4422,
    "path": "../public/_nuxt/CZd0xW_V.js"
  },
  "/_nuxt/C_8bwKvT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ce8-OTavWmhXSPIecWvZ/AE34ooGzxw\"",
    "mtime": "2026-09-05T15:25:32.548Z",
    "size": 11496,
    "path": "../public/_nuxt/C_8bwKvT.js"
  },
  "/_nuxt/CaODJcyn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14d75-aONd/bekLhFoZZSE5lQdYlune+g\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 85365,
    "path": "../public/_nuxt/CaODJcyn.js"
  },
  "/_nuxt/CacY0gHj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4ae4-NS3OntD85Fhfl6yxdzO4mSx0cjc\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 19172,
    "path": "../public/_nuxt/CacY0gHj.js"
  },
  "/_nuxt/Cb4Vim4T.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6860-itqzEX5I6bX93aFSnfySfBTr2Qk\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 26720,
    "path": "../public/_nuxt/Cb4Vim4T.js"
  },
  "/_nuxt/CcDslhWf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2b6b1-4jI6zIylJMFUrvuHR9i0tGipKmk\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 177841,
    "path": "../public/_nuxt/CcDslhWf.js"
  },
  "/_nuxt/CcmNWLt0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1913-jKLPtxNHqdgpIZDT2YJdBgHd5TE\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 6419,
    "path": "../public/_nuxt/CcmNWLt0.js"
  },
  "/_nuxt/CdMecpZ7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ee-je/qX5jV70rcEhSPqn9O0LwJox0\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 238,
    "path": "../public/_nuxt/CdMecpZ7.js"
  },
  "/_nuxt/CewbzKMR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1691-REuZTMss7UYPzBf8rfQ4lsY68D8\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 5777,
    "path": "../public/_nuxt/CewbzKMR.js"
  },
  "/_nuxt/Cfkwpbl8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3ad6-aGUfslBfsZDz6PuimKWjCHPGy5A\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 15062,
    "path": "../public/_nuxt/Cfkwpbl8.js"
  },
  "/_nuxt/Cg2SuelU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6a70-pbONa1hxGcvioXgkqynYYpgWE+A\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 27248,
    "path": "../public/_nuxt/Cg2SuelU.js"
  },
  "/_nuxt/CgoNMtux.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"12391-9lIhmtWnlYY86kIclw+q3hxDt0k\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 74641,
    "path": "../public/_nuxt/CgoNMtux.js"
  },
  "/_nuxt/ChRtAoqB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14cf-yFy4DAs7q1H5xVo7KFp+MUKVr9s\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 5327,
    "path": "../public/_nuxt/ChRtAoqB.js"
  },
  "/_nuxt/CiLtUuC3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"20e-E0+/ayFBljLMCpDP/nX9YUiIB4M\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 526,
    "path": "../public/_nuxt/CiLtUuC3.js"
  },
  "/_nuxt/Ci_nEsc7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"12b4-zpIi2NtF/Y8Gycq4k+vGEufRTl0\"",
    "mtime": "2026-09-05T15:25:32.549Z",
    "size": 4788,
    "path": "../public/_nuxt/Ci_nEsc7.js"
  },
  "/_nuxt/CjNLYCLg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"333f-GU8amRue0Kmpv39MsHM1pm5HbYM\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 13119,
    "path": "../public/_nuxt/CjNLYCLg.js"
  },
  "/_nuxt/Ck9IwBE1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f4-CGaSWuwWml2hCZwXZGFEzJcRK8g\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 244,
    "path": "../public/_nuxt/Ck9IwBE1.js"
  },
  "/_nuxt/CkJuzc1o.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6f4-6z0WYSbEUlmdEPYim/l7ov3kMWw\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 1780,
    "path": "../public/_nuxt/CkJuzc1o.js"
  },
  "/_nuxt/Ckw8ddFX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1afb-W9uORHVwO4OsNmg1Hi+7IHsd0Ao\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 6907,
    "path": "../public/_nuxt/Ckw8ddFX.js"
  },
  "/_nuxt/ClFFjSW2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"da46-ajearQKIJe5soFNAinbQM3vStuE\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 55878,
    "path": "../public/_nuxt/ClFFjSW2.js"
  },
  "/_nuxt/ClKdZ_lG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"173d-CIKqT70vO1Rj09ITTk00KFIoXDQ\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 5949,
    "path": "../public/_nuxt/ClKdZ_lG.js"
  },
  "/_nuxt/Cluzi2Zq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c30-c8/r7VYrcY38sazr5OcQ+RJ5KHI\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 3120,
    "path": "../public/_nuxt/Cluzi2Zq.js"
  },
  "/_nuxt/CmCQp5Yx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bbc-qgrktSfB89FcRppiqzOos5I7wcU\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 3004,
    "path": "../public/_nuxt/CmCQp5Yx.js"
  },
  "/_nuxt/Cmm7eHzH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9f06-KQaI2i6uVh4HUvLXwcUkkZDaJB4\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 40710,
    "path": "../public/_nuxt/Cmm7eHzH.js"
  },
  "/_nuxt/CnvKMtbv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"21a8-zGFJOuruz5iqv9/K7p5VwtdVT9k\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 8616,
    "path": "../public/_nuxt/CnvKMtbv.js"
  },
  "/_nuxt/CoRGU80-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15f7-pZW9s/lAJ/8U/a3lkDtcbyw2iM0\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 5623,
    "path": "../public/_nuxt/CoRGU80-.js"
  },
  "/_nuxt/CohzipZa.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a5e-MLODUk6AwykSea3LxePsioxCyV4\"",
    "mtime": "2026-09-05T15:25:32.550Z",
    "size": 6750,
    "path": "../public/_nuxt/CohzipZa.js"
  },
  "/_nuxt/ConPMQyx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"58f-yC+RMYJpQ97nT6I6+FwvvkzjOfU\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 1423,
    "path": "../public/_nuxt/ConPMQyx.js"
  },
  "/_nuxt/Cp5y-YJe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b39-5++IytzFrptWS37soDddCOWy2VI\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 2873,
    "path": "../public/_nuxt/Cp5y-YJe.js"
  },
  "/_nuxt/Cs2F2srj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2386-hwq31SHJL0qWXXMxVijTVonaFpQ\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 9094,
    "path": "../public/_nuxt/Cs2F2srj.js"
  },
  "/_nuxt/Cs6JJXT5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3cae-bmrgWM/Bp2CVfra3TQjeeuBMGhE\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 15534,
    "path": "../public/_nuxt/Cs6JJXT5.js"
  },
  "/_nuxt/CsD5j6eV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e26-K44hpuSZgkDBADE2dEC5170Fvfg\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 3622,
    "path": "../public/_nuxt/CsD5j6eV.js"
  },
  "/_nuxt/CsJ9-EYl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"27d3a-m6PGCKGY6WVdyulNCBs6qA0/8Ks\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 163130,
    "path": "../public/_nuxt/CsJ9-EYl.js"
  },
  "/_nuxt/CsvMBhTu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8a5b-v0Ous3YH1N6VhnM6GrVndHJwkec\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 35419,
    "path": "../public/_nuxt/CsvMBhTu.js"
  },
  "/_nuxt/CtfBBspg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3813-2LaWTLpad+3M+dqfr25N+K4WUzY\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 14355,
    "path": "../public/_nuxt/CtfBBspg.js"
  },
  "/_nuxt/CtsyrtPq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c6a0-kBSukoXan0FV4cGRqQMWe9NbQfg\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 50848,
    "path": "../public/_nuxt/CtsyrtPq.js"
  },
  "/_nuxt/Cv5bFMCO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"582e-uOxD3cJBd1fVgv27poRlklaTnFs\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 22574,
    "path": "../public/_nuxt/Cv5bFMCO.js"
  },
  "/_nuxt/CvHqhWa5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b99c-HXAfmzBbXXw+5Le2N9iifWTR5sk\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 113052,
    "path": "../public/_nuxt/CvHqhWa5.js"
  },
  "/_nuxt/CvII7bbI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2072-SIE7s4EiSpP2dP9fv6q0zVAVVXc\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 8306,
    "path": "../public/_nuxt/CvII7bbI.js"
  },
  "/_nuxt/Cvrh5tZx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1c59-PDWfDXBgZYhePXhNOgNTILXEwmI\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 7257,
    "path": "../public/_nuxt/Cvrh5tZx.js"
  },
  "/_nuxt/CxM7S82f.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1d345-Pryqe6VyPmWatQkKHeLMoj1hLuk\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 119621,
    "path": "../public/_nuxt/CxM7S82f.js"
  },
  "/_nuxt/CxZEssPk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2f0e-wy1hlfw526ddZjP2QCQWuqTHGg4\"",
    "mtime": "2026-09-05T15:25:32.551Z",
    "size": 12046,
    "path": "../public/_nuxt/CxZEssPk.js"
  },
  "/_nuxt/CyEgAFGc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"154b8-lNNUdTo87r9ClseLHHdoJM/BQ8E\"",
    "mtime": "2026-09-05T15:25:32.553Z",
    "size": 87224,
    "path": "../public/_nuxt/CyEgAFGc.js"
  },
  "/_nuxt/CzszQKcx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5df0-RtkMG+i2n55tnclnThFhZiPPwyA\"",
    "mtime": "2026-09-05T15:25:32.553Z",
    "size": 24048,
    "path": "../public/_nuxt/CzszQKcx.js"
  },
  "/_nuxt/D-usSTwE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"287e-7O4IOfrTD7ap4BCe0jpDmkQuP+E\"",
    "mtime": "2026-09-05T15:25:32.553Z",
    "size": 10366,
    "path": "../public/_nuxt/D-usSTwE.js"
  },
  "/_nuxt/D0apG41V.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"670b-5CmwbK3MZxfODX7NSEBO5WwVm64\"",
    "mtime": "2026-09-05T15:25:32.553Z",
    "size": 26379,
    "path": "../public/_nuxt/D0apG41V.js"
  },
  "/_nuxt/D0iMoLMB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f65-wFIsTXJVeRexlPrFGYkUF4kEIJs\"",
    "mtime": "2026-09-05T15:25:32.553Z",
    "size": 8037,
    "path": "../public/_nuxt/D0iMoLMB.js"
  },
  "/_nuxt/D1A_Heim.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19bbe-tE1/tqn49qoDhRKHMvX5mHGUJ44\"",
    "mtime": "2026-09-05T15:25:32.553Z",
    "size": 105406,
    "path": "../public/_nuxt/D1A_Heim.js"
  },
  "/_nuxt/D2LTy7AW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4727-qF3yZCx13Yuy9XkFxGM6PP1uzkQ\"",
    "mtime": "2026-09-05T15:25:32.553Z",
    "size": 18215,
    "path": "../public/_nuxt/D2LTy7AW.js"
  },
  "/_nuxt/D4DZuGyf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a80-oXzIkpLTcXr/fHMN/V03l+cTAkM\"",
    "mtime": "2026-09-05T15:25:32.553Z",
    "size": 6784,
    "path": "../public/_nuxt/D4DZuGyf.js"
  },
  "/_nuxt/D7Lr4KcI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"62d1-dGfS6B+MqLuTfPPT7cgz4/pl0N0\"",
    "mtime": "2026-09-05T15:25:32.554Z",
    "size": 25297,
    "path": "../public/_nuxt/D7Lr4KcI.js"
  },
  "/_nuxt/D7qyCx1q.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3ecf-5uiCnsn+dSiY7RpdaMacVUbejyo\"",
    "mtime": "2026-09-05T15:25:32.554Z",
    "size": 16079,
    "path": "../public/_nuxt/D7qyCx1q.js"
  },
  "/_nuxt/D8IpX4py.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a20b-08xViLRqBDw0U4yShrDMWAUwyts\"",
    "mtime": "2026-09-05T15:25:32.554Z",
    "size": 41483,
    "path": "../public/_nuxt/D8IpX4py.js"
  },
  "/_nuxt/D8VeW0ES.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2f12-3SU3L7HtlcylX3qrvsQH0sjklrk\"",
    "mtime": "2026-09-05T15:25:32.554Z",
    "size": 12050,
    "path": "../public/_nuxt/D8VeW0ES.js"
  },
  "/_nuxt/DANvH5hh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"214-QTD0woDm+0JMErBAm4+NcjQC5WI\"",
    "mtime": "2026-09-05T15:25:32.554Z",
    "size": 532,
    "path": "../public/_nuxt/DANvH5hh.js"
  },
  "/_nuxt/DB4EqR-F.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"198d-qn5LV4+MrrQV7lSzxtb6Nz9C0PU\"",
    "mtime": "2026-09-05T15:25:32.554Z",
    "size": 6541,
    "path": "../public/_nuxt/DB4EqR-F.js"
  },
  "/_nuxt/DBj4K9d_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"340b-RiWUgHOWsb2bFTXIYCt6oyzY5cc\"",
    "mtime": "2026-09-05T15:25:32.554Z",
    "size": 13323,
    "path": "../public/_nuxt/DBj4K9d_.js"
  },
  "/_nuxt/DCQb3MpD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3e3-olRH0KvWjmt9MR1H4JTEobwsNkk\"",
    "mtime": "2026-09-05T15:25:32.554Z",
    "size": 995,
    "path": "../public/_nuxt/DCQb3MpD.js"
  },
  "/_nuxt/DCvM94v7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5dae-OnANeAbSGqxZd1W/8cyJwoQVZ68\"",
    "mtime": "2026-09-05T15:25:32.554Z",
    "size": 23982,
    "path": "../public/_nuxt/DCvM94v7.js"
  },
  "/_nuxt/DDDFy-MD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6b15-TO0/GMLxD9as36gHzt8MSz3Ce28\"",
    "mtime": "2026-09-05T15:25:32.554Z",
    "size": 27413,
    "path": "../public/_nuxt/DDDFy-MD.js"
  },
  "/_nuxt/DDpmG2fV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b36-EBnuMLdK+eSqncJ5BGAc5dztr1I\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 6966,
    "path": "../public/_nuxt/DDpmG2fV.js"
  },
  "/_nuxt/DDqZBno9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4c6-9h2bCYsDEoaKVYwde+zg1rTq59o\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 1222,
    "path": "../public/_nuxt/DDqZBno9.js"
  },
  "/_nuxt/DExj1W_8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ea3-WYrY4MpjE6z/56+IbQwn0/ebClA\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 11939,
    "path": "../public/_nuxt/DExj1W_8.js"
  },
  "/_nuxt/DGHpHOYJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2139-BT2EyZ0d5C8IWhD9ngaL6WFNRGQ\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 8505,
    "path": "../public/_nuxt/DGHpHOYJ.js"
  },
  "/_nuxt/DHYfO66s.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"518b-KNvlY5JKua/jjjE9PTcGHvADscM\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 20875,
    "path": "../public/_nuxt/DHYfO66s.js"
  },
  "/_nuxt/DJMQeKeT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"28bf-nNM46RAgoK17uRpZ/VU2kWzjFCk\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 10431,
    "path": "../public/_nuxt/DJMQeKeT.js"
  },
  "/_nuxt/DK3Fl9T5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9e-/3ZreeJJ1QByVcY6NKPe1BzCjpo\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 158,
    "path": "../public/_nuxt/DK3Fl9T5.js"
  },
  "/_nuxt/DKDWkdEs.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"27b-jP756A2qDThLpjV9GDxmtBgITAI\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 635,
    "path": "../public/_nuxt/DKDWkdEs.js"
  },
  "/_nuxt/DKpUyyne.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bb6-btoTUQYWvS96eKJG8gMsDHEAjf8\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 2998,
    "path": "../public/_nuxt/DKpUyyne.js"
  },
  "/_nuxt/DKxQjsmF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ab1c-cmg4fKH+7sWDzHqyjoGDl6YHezY\"",
    "mtime": "2026-09-05T15:25:32.556Z",
    "size": 174876,
    "path": "../public/_nuxt/DKxQjsmF.js"
  },
  "/_nuxt/DLL8P-h_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"400f0-detXPauj/9uZWoXgu7PzMyVU5hM\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 262384,
    "path": "../public/_nuxt/DLL8P-h_.js"
  },
  "/_nuxt/DMgNhnYS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e39-FDt9QwiFGu68c3Ky3uf4tlUNS4k\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 7737,
    "path": "../public/_nuxt/DMgNhnYS.js"
  },
  "/_nuxt/DMhq2aVH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b07-ptIdqaTCFBmHvUEzaoMQQn5e/aM\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 6919,
    "path": "../public/_nuxt/DMhq2aVH.js"
  },
  "/_nuxt/DMoTqEGO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"cd1-vzoeMF3/jTX3grEQiK6ZOE7r3jU\"",
    "mtime": "2026-09-05T15:25:32.555Z",
    "size": 3281,
    "path": "../public/_nuxt/DMoTqEGO.js"
  },
  "/_nuxt/DNMTfnFr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1708-m9iKWk/6lQXZpPCgCLiEAHTzyFk\"",
    "mtime": "2026-09-05T15:25:32.556Z",
    "size": 5896,
    "path": "../public/_nuxt/DNMTfnFr.js"
  },
  "/_nuxt/DO-qXg-I.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"54f4-9EHCLHle0d8FXBUwBmkcKqYvvhU\"",
    "mtime": "2026-09-05T15:25:32.556Z",
    "size": 21748,
    "path": "../public/_nuxt/DO-qXg-I.js"
  },
  "/_nuxt/DOwzaHZ0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17b4-4/YJXgJ1njVPiACe3J8/eRSugTo\"",
    "mtime": "2026-09-05T15:25:32.556Z",
    "size": 6068,
    "path": "../public/_nuxt/DOwzaHZ0.js"
  },
  "/_nuxt/DQCgrYNe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1bfa-+6e+Ye3A5FuhIcPaiDxRtC/2DSo\"",
    "mtime": "2026-09-05T15:25:32.556Z",
    "size": 7162,
    "path": "../public/_nuxt/DQCgrYNe.js"
  },
  "/_nuxt/DQZ5AkYe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"213ab-yzKlH2lFYSQgcVilQXi7wRRUnbQ\"",
    "mtime": "2026-09-05T15:25:32.556Z",
    "size": 136107,
    "path": "../public/_nuxt/DQZ5AkYe.js"
  },
  "/_nuxt/DQwYfKfQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"244c-gsQR+gCal6NOYTLY10zZdTg/66c\"",
    "mtime": "2026-09-05T15:25:32.556Z",
    "size": 9292,
    "path": "../public/_nuxt/DQwYfKfQ.js"
  },
  "/_nuxt/DQxkIbk2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1299-soZQUKFnJNtlfnrLHojU9oQ8cZw\"",
    "mtime": "2026-09-05T15:25:32.556Z",
    "size": 4761,
    "path": "../public/_nuxt/DQxkIbk2.js"
  },
  "/_nuxt/DRFjx7u4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"82d3-sTXeZUpOqejjYgbUwkuTPar5OoI\"",
    "mtime": "2026-09-05T15:25:32.557Z",
    "size": 33491,
    "path": "../public/_nuxt/DRFjx7u4.js"
  },
  "/_nuxt/DRpR5_BG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5dc0-aik23vOVuL9x+Kqs00smtUwkeP0\"",
    "mtime": "2026-09-05T15:25:32.557Z",
    "size": 24000,
    "path": "../public/_nuxt/DRpR5_BG.js"
  },
  "/_nuxt/DSNQnXHK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2250-FgKcEw6T/JNsC5FubcOqX91SQFs\"",
    "mtime": "2026-09-05T15:25:32.557Z",
    "size": 8784,
    "path": "../public/_nuxt/DSNQnXHK.js"
  },
  "/_nuxt/DUlkwFs2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"fe-Y+sRLzJPamVYcNfNCvV/1Tdq9Qw\"",
    "mtime": "2026-09-05T15:25:32.557Z",
    "size": 254,
    "path": "../public/_nuxt/DUlkwFs2.js"
  },
  "/_nuxt/DV4VLySd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3605-s/Q//nBGzrLGL0nyMrCINLHdrjI\"",
    "mtime": "2026-09-05T15:25:32.557Z",
    "size": 13829,
    "path": "../public/_nuxt/DV4VLySd.js"
  },
  "/_nuxt/DVQuIRkW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"26d2-WW/nvsOfoUuIeX00pPtR85+QZ3s\"",
    "mtime": "2026-09-05T15:25:32.557Z",
    "size": 9938,
    "path": "../public/_nuxt/DVQuIRkW.js"
  },
  "/_nuxt/DVTAwKKz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17d5a-Ft5rmj2jYBSUE0PFwsjLRepYaJ8\"",
    "mtime": "2026-09-05T15:25:32.557Z",
    "size": 97626,
    "path": "../public/_nuxt/DVTAwKKz.js"
  },
  "/_nuxt/DW3nJb8Q.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"28de-1kA0ov/LPAH3L/kFqyZwEnln3Nw\"",
    "mtime": "2026-09-05T15:25:32.557Z",
    "size": 10462,
    "path": "../public/_nuxt/DW3nJb8Q.js"
  },
  "/_nuxt/DWted8aI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4678-6CI89NR3TbxoRsDCLx5zpdSDruk\"",
    "mtime": "2026-09-05T15:25:32.557Z",
    "size": 18040,
    "path": "../public/_nuxt/DWted8aI.js"
  },
  "/_nuxt/DX1BQOs8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"190f-MWIqMFi2IlpHDbpardGhivfaZYo\"",
    "mtime": "2026-09-05T15:25:32.557Z",
    "size": 6415,
    "path": "../public/_nuxt/DX1BQOs8.js"
  },
  "/_nuxt/DX3OCDL9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"117-14MQUkqEHsP4mlxqlX39iMiz+cc\"",
    "mtime": "2026-09-05T15:25:32.557Z",
    "size": 279,
    "path": "../public/_nuxt/DX3OCDL9.js"
  },
  "/_nuxt/DXG-b-1a.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3860-0fsSYYIbY/WEzKU2CxYtndJizmI\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 14432,
    "path": "../public/_nuxt/DXG-b-1a.js"
  },
  "/_nuxt/DXw9l8Rf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8b7-oxk5T4yFcv2MPmqzY+IkjMZpd7c\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 2231,
    "path": "../public/_nuxt/DXw9l8Rf.js"
  },
  "/_nuxt/DXrisJhu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2442-pndYSELAuwBohvkPJ/jUHzMNxH0\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 9282,
    "path": "../public/_nuxt/DXrisJhu.js"
  },
  "/_nuxt/DY-B0LvR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"578f-JX/OhkkM545tCXachIO7SM1ltn8\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 22415,
    "path": "../public/_nuxt/DY-B0LvR.js"
  },
  "/_nuxt/DYvRD3hg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4a89-ZCc1Jrc7BCP+ZX17zP+uaNcO3Ls\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 19081,
    "path": "../public/_nuxt/DYvRD3hg.js"
  },
  "/_nuxt/DYxiniQT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"44-ua/PuxX72rA/kuXhOsy7Xd4ViJA\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 68,
    "path": "../public/_nuxt/DYxiniQT.js"
  },
  "/_nuxt/DZXEPr72.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1533-tp4sG1xg47gDLODnbJxY7ZzlEJA\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 5427,
    "path": "../public/_nuxt/DZXEPr72.js"
  },
  "/_nuxt/D_oBsfn8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3cd-vtdJYnNzzhi1lS2bPt/sK00NmDI\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 973,
    "path": "../public/_nuxt/D_oBsfn8.js"
  },
  "/_nuxt/Db8ZRI78.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"25f3-igc2kxjga5y4uPks48mkmLmxSWE\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 9715,
    "path": "../public/_nuxt/Db8ZRI78.js"
  },
  "/_nuxt/DcIDlBhZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"168de-tMpxk9a3iwHJ8rOZs97LbzZ1UXk\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 92382,
    "path": "../public/_nuxt/DcIDlBhZ.js"
  },
  "/_nuxt/DcKNpsj9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"30aa-CPnfpqJkDUjnhuz9Z6qOC+Yfphk\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 12458,
    "path": "../public/_nuxt/DcKNpsj9.js"
  },
  "/_nuxt/DdrHHSXu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"31ba-Ix9J6MequIYmW4x50PScWfalSVc\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 12730,
    "path": "../public/_nuxt/DdrHHSXu.js"
  },
  "/_nuxt/DdvCle-K.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"53d4-rC6T5gQh7ix4TDq1f++lpZjD928\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 21460,
    "path": "../public/_nuxt/DdvCle-K.js"
  },
  "/_nuxt/De3T5VzI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8865-al9fyVysMVIo/g/gkGXDumFlkKE\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 34917,
    "path": "../public/_nuxt/De3T5VzI.js"
  },
  "/_nuxt/DeH7TEqX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"de9d-MV3g7mmXgiEwfnoOvoseS7kckw8\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 56989,
    "path": "../public/_nuxt/DeH7TEqX.js"
  },
  "/_nuxt/Df2xbC6M.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d1f1-jDiPRJNNvLQ+OyPFpf+5STMHYGY\"",
    "mtime": "2026-09-05T15:25:32.558Z",
    "size": 53745,
    "path": "../public/_nuxt/Df2xbC6M.js"
  },
  "/_nuxt/DfvsDSvi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3cdd-niBbxcB2CFl1YO2agGPXBmcgnzo\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 15581,
    "path": "../public/_nuxt/DfvsDSvi.js"
  },
  "/_nuxt/DgV8mo85.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5ea3-4OcxzSuk2TedCHOw5TrLv3nGOoA\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 24227,
    "path": "../public/_nuxt/DgV8mo85.js"
  },
  "/_nuxt/Dgaz7aur.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"23a7-l//zeojWeca/nPjFzm0CtrANU+U\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 9127,
    "path": "../public/_nuxt/Dgaz7aur.js"
  },
  "/_nuxt/DgjMoLWr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6164-MGGK75RlckyEROvyFiGkne41U5g\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 24932,
    "path": "../public/_nuxt/DgjMoLWr.js"
  },
  "/_nuxt/Dh228itO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"273e-tWFDKEYBvLSghtelPG2k55wZ9rE\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 10046,
    "path": "../public/_nuxt/Dh228itO.js"
  },
  "/_nuxt/Dh5ihWbf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"67b5-xXMHVBhWBB0Vwy/TQyoH7x54uQI\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 26549,
    "path": "../public/_nuxt/Dh5ihWbf.js"
  },
  "/_nuxt/DhhofPvG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"224a-DwvhkZpdGNketq3wjgsNMiZdqfY\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 8778,
    "path": "../public/_nuxt/DhhofPvG.js"
  },
  "/_nuxt/DhmEMT88.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"70ee-19yV1+ywmUyehgu4i0kEYmRTsAM\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 28910,
    "path": "../public/_nuxt/DhmEMT88.js"
  },
  "/_nuxt/Dixweg8N.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"22fa-A0D5j4YxnzAFu4pOrr8B9qAOSB0\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 8954,
    "path": "../public/_nuxt/Dixweg8N.js"
  },
  "/_nuxt/DjWxqDcA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"285-EbKbAihAOHmq9/R3VVGZ2kM18lQ\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 645,
    "path": "../public/_nuxt/DjWxqDcA.js"
  },
  "/_nuxt/DjuaAJKi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c69f-9covzuphinVWaLnI8+nCkKwD+7c\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 50847,
    "path": "../public/_nuxt/DjuaAJKi.js"
  },
  "/_nuxt/Dlh5hvp9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"722-QSz10ijbkThiZNYDB5kUwLutnNQ\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 1826,
    "path": "../public/_nuxt/Dlh5hvp9.js"
  },
  "/_nuxt/DluEY0Gj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4e6e-KywS5oCDaj/oVSshEZD0Ygn+d5g\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 20078,
    "path": "../public/_nuxt/DluEY0Gj.js"
  },
  "/_nuxt/DmSAzd2n.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"210f-P+j49inRgyh/vEN+nCAyCG5Mx5c\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 8463,
    "path": "../public/_nuxt/DmSAzd2n.js"
  },
  "/_nuxt/DnToyrRv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"239a-stBUpSDA4xp53z0haIgFt1FIHaU\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 9114,
    "path": "../public/_nuxt/DnToyrRv.js"
  },
  "/_nuxt/DoanWoRz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4077-olvkSr9VzZXmrVkcZUiBvOj3MYU\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 16503,
    "path": "../public/_nuxt/DoanWoRz.js"
  },
  "/_nuxt/DojpP95n.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6a7e-rehYKtt6GcJPoEspFNv2VomMQ30\"",
    "mtime": "2026-09-05T15:25:32.559Z",
    "size": 27262,
    "path": "../public/_nuxt/DojpP95n.js"
  },
  "/_nuxt/DqHOMS-s.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13a9-tNPQZpi7uLtdmHo0TxgvLMOfRiA\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 5033,
    "path": "../public/_nuxt/DqHOMS-s.js"
  },
  "/_nuxt/DqKBuwfJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1906-DVYX1wkKijaTp2/8KT5mx9MD3Rk\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 6406,
    "path": "../public/_nuxt/DqKBuwfJ.js"
  },
  "/_nuxt/DqYfTBBL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"199df-56Sf47ozjMq1QLYSPf8W6DAAhio\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 104927,
    "path": "../public/_nuxt/DqYfTBBL.js"
  },
  "/_nuxt/Ds2j86fC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e60-K9BNYZNuFx7HPZ6kvjq5/V+anOs\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 3680,
    "path": "../public/_nuxt/Ds2j86fC.js"
  },
  "/_nuxt/DsAllRJ7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"53e7-E4yP0seZr0xrdNhSxE4TCiAtEbU\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 21479,
    "path": "../public/_nuxt/DsAllRJ7.js"
  },
  "/_nuxt/DsUTQ-LC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c303-vnRqJZSyFY6PvHi1DSO9DHmukKw\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 49923,
    "path": "../public/_nuxt/DsUTQ-LC.js"
  },
  "/_nuxt/DswuEJGm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2c76-e8gq4gYnotTD+JZ9vQZn6KONl54\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 11382,
    "path": "../public/_nuxt/DswuEJGm.js"
  },
  "/_nuxt/DuBRPxYg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"178f-M23gozlYjgKCrPBDQw9glhKUYRA\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 6031,
    "path": "../public/_nuxt/DuBRPxYg.js"
  },
  "/_nuxt/DuGS1h6M.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"84e-9UgBLRSDO5EXKLgHu4T1DdpAopY\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 2126,
    "path": "../public/_nuxt/DuGS1h6M.js"
  },
  "/_nuxt/DvXPmvsu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4f86-vbdzCF5qJHftqyvrLCU3RaPaFC0\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 20358,
    "path": "../public/_nuxt/DvXPmvsu.js"
  },
  "/_nuxt/Dx-8-gkx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"470-yQ0eSeznIZAqBFQfp/Wzkn8v7No\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 1136,
    "path": "../public/_nuxt/Dx-8-gkx.js"
  },
  "/_nuxt/EUqPIrTm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2bad-IU2cu7fD+EZjgoCDkKq2BqKorEU\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 11181,
    "path": "../public/_nuxt/EUqPIrTm.js"
  },
  "/_nuxt/Eu7fqxDR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2e642-M4u63ywbm8v+wf9DBxLXI9MfnkQ\"",
    "mtime": "2026-09-05T15:25:32.560Z",
    "size": 190018,
    "path": "../public/_nuxt/Eu7fqxDR.js"
  },
  "/_nuxt/Fd0NR9zb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2364-YMrs76mUG9WTbh4poFTHs1sH/AQ\"",
    "mtime": "2026-09-05T15:25:32.561Z",
    "size": 9060,
    "path": "../public/_nuxt/Fd0NR9zb.js"
  },
  "/_nuxt/Fe1Jh2GI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1d29-Z/K9SYbAGNDP2QhrGRExyrywpjE\"",
    "mtime": "2026-09-05T15:25:32.561Z",
    "size": 7465,
    "path": "../public/_nuxt/Fe1Jh2GI.js"
  },
  "/_nuxt/H0vgBklw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ee-MbjEFXo/QRVtq3JIuF+b0uNeEjc\"",
    "mtime": "2026-09-05T15:25:32.561Z",
    "size": 238,
    "path": "../public/_nuxt/H0vgBklw.js"
  },
  "/_nuxt/HkrtbYu3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19c-QX7Vn5lrJ9lIrZxePgfRijBx+Cs\"",
    "mtime": "2026-09-05T15:25:32.561Z",
    "size": 412,
    "path": "../public/_nuxt/HkrtbYu3.js"
  },
  "/_nuxt/ITNYJIBc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8a14-nfFGGXQFGmMAicIdOOdPcgHq5Rs\"",
    "mtime": "2026-09-05T15:25:32.561Z",
    "size": 35348,
    "path": "../public/_nuxt/ITNYJIBc.js"
  },
  "/_nuxt/IvuFDN5E.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3c90-NN77Lc7keOQ9dPx7Q50LnlsY2nE\"",
    "mtime": "2026-09-05T15:25:32.561Z",
    "size": 15504,
    "path": "../public/_nuxt/IvuFDN5E.js"
  },
  "/_nuxt/IyjqRm3v.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6c6-/wei9melwRZHdyVBzsxgJCiirdA\"",
    "mtime": "2026-09-05T15:25:32.561Z",
    "size": 1734,
    "path": "../public/_nuxt/IyjqRm3v.js"
  },
  "/_nuxt/JfUyCp_c.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ee-SBzqxMd7TjrfgA5oUvF4QZ/KU6E\"",
    "mtime": "2026-09-05T15:25:32.561Z",
    "size": 238,
    "path": "../public/_nuxt/JfUyCp_c.js"
  },
  "/_nuxt/KFGFyKwG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bb0b-65mOgPr/KjF4LoWrsi8lS5y+kB8\"",
    "mtime": "2026-09-05T15:25:32.561Z",
    "size": 47883,
    "path": "../public/_nuxt/KFGFyKwG.js"
  },
  "/_nuxt/KYRAD2b_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8498-sZr6lNI0K2cSlm3mBCjZYeowul4\"",
    "mtime": "2026-09-05T15:25:32.561Z",
    "size": 33944,
    "path": "../public/_nuxt/KYRAD2b_.js"
  },
  "/_nuxt/LoGZLucS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"190-EJlAwVdLmtEorswlr7cCUVBJb5Y\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 400,
    "path": "../public/_nuxt/LoGZLucS.js"
  },
  "/_nuxt/MqsMv5Is.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6a84-fgVJbo2QkCbU32hlOIuF4K/Pqbo\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 27268,
    "path": "../public/_nuxt/MqsMv5Is.js"
  },
  "/_nuxt/MrdJrrXF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5866-2y1UrCJyzrtPyxw0pMnCL4OmmPk\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 22630,
    "path": "../public/_nuxt/MrdJrrXF.js"
  },
  "/_nuxt/O90oeIOV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f3ea-JNR4MgNkOH859INNfe3GRYUUcvo\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 62442,
    "path": "../public/_nuxt/O90oeIOV.js"
  },
  "/_nuxt/Og0Hsp47.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f2-5KAJCMO2p0mgLBd2GH6kEj56OcY\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 242,
    "path": "../public/_nuxt/Og0Hsp47.js"
  },
  "/_nuxt/Oin7G6kE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ec7-ryI+wX92ReQBnCJQumzYWPXpHBk\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 3783,
    "path": "../public/_nuxt/Oin7G6kE.js"
  },
  "/_nuxt/PQzR-riV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2cda1-lc15afamEiXzNJIeJIgqwYiyH9E\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 183713,
    "path": "../public/_nuxt/PQzR-riV.js"
  },
  "/_nuxt/PYXmkWQR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2c389-N2pF1vYQd9me+Mfnllbe1XPXAbs\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 181129,
    "path": "../public/_nuxt/PYXmkWQR.js"
  },
  "/_nuxt/R4sQ-3Hc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"66c-1FR6ZQuEphFiJ7MDjT3d3oH+z28\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 1644,
    "path": "../public/_nuxt/R4sQ-3Hc.js"
  },
  "/_nuxt/R8nAf1vR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c6a7-GY9fmc3vjp2WSj2umxgRYkGbIyo\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 50855,
    "path": "../public/_nuxt/R8nAf1vR.js"
  },
  "/_nuxt/SCjQUq34.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2136c-ZFGHBe2DKDdM/kY+QKlkcjswyuo\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 136044,
    "path": "../public/_nuxt/SCjQUq34.js"
  },
  "/_nuxt/T3cCP3-D.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"33967-JmSahJ1NEtgUhzyJySzRCVg1g8c\"",
    "mtime": "2026-09-05T15:25:32.562Z",
    "size": 211303,
    "path": "../public/_nuxt/T3cCP3-D.js"
  },
  "/_nuxt/TYx63Zh7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"819-aFVEmXbP7tF1aQmPFUeSJHqPV1c\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 2073,
    "path": "../public/_nuxt/TYx63Zh7.js"
  },
  "/_nuxt/U0d_L8uA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"30a1-qYlmOU7qrxQNeapQnNzwMFk5SKw\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 12449,
    "path": "../public/_nuxt/U0d_L8uA.js"
  },
  "/_nuxt/UW2ZBlb9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a238-1BKJKAbPujI6IbMDjLSwRmQQqa4\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 41528,
    "path": "../public/_nuxt/UW2ZBlb9.js"
  },
  "/_nuxt/UdsmMDCL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b55-Oyg7wwXw2AyqiBlJLQBBteYUcTY\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 6997,
    "path": "../public/_nuxt/UdsmMDCL.js"
  },
  "/_nuxt/UpS_fPjk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9b8-c0ZKogWbHia8LZavuCPKjDzj3OI\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 2488,
    "path": "../public/_nuxt/UpS_fPjk.js"
  },
  "/_nuxt/V2PzDzCX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8e2-ZhWpI0j0LbqHpO2n4Jq/zz0neYQ\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 2274,
    "path": "../public/_nuxt/V2PzDzCX.js"
  },
  "/_nuxt/VE6WKepZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2b26-NxIPb1nrDTw6clYbS4YbKk1FHJw\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 11046,
    "path": "../public/_nuxt/VE6WKepZ.js"
  },
  "/_nuxt/VUp2lXgN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f43-G27dPANqwrtXqafWjpbp3Q3JAr0\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 3907,
    "path": "../public/_nuxt/VUp2lXgN.js"
  },
  "/_nuxt/VbXTXTou.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"352d-dVgDUuP+l7spUl6JwpirlrpitcA\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 13613,
    "path": "../public/_nuxt/VbXTXTou.js"
  },
  "/_nuxt/Yf0g_uY-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"62cd-EWoAMZ7vuxZ2fDmVxAjpMSUiImA\"",
    "mtime": "2026-09-05T15:25:32.564Z",
    "size": 25293,
    "path": "../public/_nuxt/Yf0g_uY-.js"
  },
  "/_nuxt/_5a1GRtc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"587-f61N6RMaHbH7LhQUf6mFulo5g2Y\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 1415,
    "path": "../public/_nuxt/_5a1GRtc.js"
  },
  "/_nuxt/_6rzW9BS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b002-UAKoXspqCVwUBCIoc7fRgnuRIn4\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 45058,
    "path": "../public/_nuxt/_6rzW9BS.js"
  },
  "/_nuxt/_X_XdTYD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e51-DLDnzdjMWRSXZPLZmzXQgVMAp4I\"",
    "mtime": "2026-09-05T15:25:32.563Z",
    "size": 3665,
    "path": "../public/_nuxt/_X_XdTYD.js"
  },
  "/_nuxt/aMsaMD1D.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"54ea-BlynPeFHLOKv+7oxSIHIr6tzcE4\"",
    "mtime": "2026-09-05T15:25:32.564Z",
    "size": 21738,
    "path": "../public/_nuxt/aMsaMD1D.js"
  },
  "/_nuxt/bTVj8UrX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1257-VTmZXYG3etGn5NYPzfUlXB8O3/U\"",
    "mtime": "2026-09-05T15:25:32.564Z",
    "size": 4695,
    "path": "../public/_nuxt/bTVj8UrX.js"
  },
  "/_nuxt/eJ-hLW7d.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"652b-mwJXb0RTl4oBUsvK2ekUpLfsW94\"",
    "mtime": "2026-09-05T15:25:32.564Z",
    "size": 25899,
    "path": "../public/_nuxt/eJ-hLW7d.js"
  },
  "/_nuxt/entry.CWY55tU6.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"18c8d-cnReKOqyDNCcwPMUmgq7d9mqjWs\"",
    "mtime": "2026-09-05T15:25:32.564Z",
    "size": 101517,
    "path": "../public/_nuxt/entry.CWY55tU6.css"
  },
  "/_nuxt/f061FGWn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"34cc-G8HLW9JlZpHJ9K3wv+oyeZU34zk\"",
    "mtime": "2026-09-05T15:25:32.564Z",
    "size": 13516,
    "path": "../public/_nuxt/f061FGWn.js"
  },
  "/_nuxt/fCzbojIh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4e54-e9X1qjt/yr7zuaCWc6Nw3q6nqyA\"",
    "mtime": "2026-09-05T15:25:32.564Z",
    "size": 20052,
    "path": "../public/_nuxt/fCzbojIh.js"
  },
  "/_nuxt/fg40_ntQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10f86-8U8GeMDDYCDOfE5xbyDYozlFj+0\"",
    "mtime": "2026-09-05T15:25:32.565Z",
    "size": 69510,
    "path": "../public/_nuxt/fg40_ntQ.js"
  },
  "/_nuxt/fwtXNY1n.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"356a-iQTQ0FTamE4N4zUHrkwwEMkU+ik\"",
    "mtime": "2026-09-05T15:25:32.564Z",
    "size": 13674,
    "path": "../public/_nuxt/fwtXNY1n.js"
  },
  "/_nuxt/gaAr2yJe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5bb5-+irq9FpJvFYSByhIq0EDFu2WjS4\"",
    "mtime": "2026-09-05T15:25:32.564Z",
    "size": 23477,
    "path": "../public/_nuxt/gaAr2yJe.js"
  },
  "/_nuxt/gvVh-RSc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ac9-i3nK5zzNjoSOk7qb+gKGChTMqmE\"",
    "mtime": "2026-09-05T15:25:32.564Z",
    "size": 2761,
    "path": "../public/_nuxt/gvVh-RSc.js"
  },
  "/_nuxt/gzcpVVnB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11139-MdD7ECXD11/VRrnbZLBJ2K0rVNQ\"",
    "mtime": "2026-09-05T15:25:32.565Z",
    "size": 69945,
    "path": "../public/_nuxt/gzcpVVnB.js"
  },
  "/_nuxt/iXnhIJG7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2c55-gNNIJyUvsLb4Z8aT1tR9pJWb9tE\"",
    "mtime": "2026-09-05T15:25:32.565Z",
    "size": 11349,
    "path": "../public/_nuxt/iXnhIJG7.js"
  },
  "/_nuxt/iXq6mRRF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15b-8tnUe0tzZ9KQsKi78OmBIT5b/BE\"",
    "mtime": "2026-09-05T15:25:32.565Z",
    "size": 347,
    "path": "../public/_nuxt/iXq6mRRF.js"
  },
  "/_nuxt/ilITqXS6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f9b-qDbX8ZdtZFFdGKpzShig793Q9KM\"",
    "mtime": "2026-09-05T15:25:32.565Z",
    "size": 3995,
    "path": "../public/_nuxt/ilITqXS6.js"
  },
  "/_nuxt/c_oH4hRZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c0df0-RzkaCFQ1MhtCF4c5Juebk6aPVck\"",
    "mtime": "2026-09-05T15:25:32.564Z",
    "size": 790000,
    "path": "../public/_nuxt/c_oH4hRZ.js"
  },
  "/_nuxt/jWbiW1Ev.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f6-KKva+KoUmlg4dXaz7/GgimvaweQ\"",
    "mtime": "2026-09-05T15:25:32.565Z",
    "size": 246,
    "path": "../public/_nuxt/jWbiW1Ev.js"
  },
  "/_nuxt/kpZube0q.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ee-e2m3hWffvhvh7EJ7tc/+DYXvhA4\"",
    "mtime": "2026-09-05T15:25:32.565Z",
    "size": 238,
    "path": "../public/_nuxt/kpZube0q.js"
  },
  "/_nuxt/nFMaYfgc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"36d1-MALjaEQbaiYWitWkzLOR7rXtZ8Y\"",
    "mtime": "2026-09-05T15:25:32.565Z",
    "size": 14033,
    "path": "../public/_nuxt/nFMaYfgc.js"
  },
  "/_nuxt/oM2G3aXe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8b4e-qu+yk7iSNc4WT9MJszCyEvDUqPQ\"",
    "mtime": "2026-09-05T15:25:32.565Z",
    "size": 35662,
    "path": "../public/_nuxt/oM2G3aXe.js"
  },
  "/_nuxt/oWP401Qp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2a25-WuhD7mpvT6bKEQIluvX55pbD1ow\"",
    "mtime": "2026-09-05T15:25:32.565Z",
    "size": 10789,
    "path": "../public/_nuxt/oWP401Qp.js"
  },
  "/_nuxt/oeQT6MSM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"68fc-nYX8T4cHexonGzXEBGHmONUItTs\"",
    "mtime": "2026-09-05T15:25:32.566Z",
    "size": 26876,
    "path": "../public/_nuxt/oeQT6MSM.js"
  },
  "/_nuxt/oqKa8noW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"16046-uJY16xO0voaRvv3oSYhypFacQYc\"",
    "mtime": "2026-09-05T15:25:32.566Z",
    "size": 90182,
    "path": "../public/_nuxt/oqKa8noW.js"
  },
  "/_nuxt/q7bdLbId.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ade1-iuTYA6DlinGB6LvrbLEH5M3HcI8\"",
    "mtime": "2026-09-05T15:25:32.566Z",
    "size": 175585,
    "path": "../public/_nuxt/q7bdLbId.js"
  },
  "/_nuxt/ot-7Btpt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"287d-/W5/KLLKVwvzyjRlTOJUfpvdk3c\"",
    "mtime": "2026-09-05T15:25:32.566Z",
    "size": 10365,
    "path": "../public/_nuxt/ot-7Btpt.js"
  },
  "/_nuxt/qD-0Kul2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ab0c-sQ/vLk8rT8OIBVYEeB7f4+trAqA\"",
    "mtime": "2026-09-05T15:25:32.566Z",
    "size": 43788,
    "path": "../public/_nuxt/qD-0Kul2.js"
  },
  "/_nuxt/qdxAdBWQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3257-D6aRzipoz4caRR2rdnVt7HGy5Ak\"",
    "mtime": "2026-09-05T15:25:32.566Z",
    "size": 12887,
    "path": "../public/_nuxt/qdxAdBWQ.js"
  },
  "/_nuxt/rLFTqkRN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b6db-+68QKlnCP0zcnNEWx8ZM55HMBlA\"",
    "mtime": "2026-09-05T15:25:32.566Z",
    "size": 46811,
    "path": "../public/_nuxt/rLFTqkRN.js"
  },
  "/_nuxt/sB-x3p7T.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d1ee-tmLs6OUy9IPJ48K1arV9NLJYvrg\"",
    "mtime": "2026-09-05T15:25:32.566Z",
    "size": 53742,
    "path": "../public/_nuxt/sB-x3p7T.js"
  },
  "/_nuxt/sltzmVWM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2dc-McPnKWMEsnv3QbcEPqcY4nT1Few\"",
    "mtime": "2026-09-05T15:25:32.567Z",
    "size": 732,
    "path": "../public/_nuxt/sltzmVWM.js"
  },
  "/_nuxt/sqlite3-opfs-async-proxy.D_xnb1D8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7e21-4R5ZDbdF5ec+EAFWivBzFJ2TNSE\"",
    "mtime": "2026-09-05T15:25:32.566Z",
    "size": 32289,
    "path": "../public/_nuxt/sqlite3-opfs-async-proxy.D_xnb1D8.js"
  },
  "/_nuxt/sqlite3-worker1-Dla_zcLf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"33721-14PY1a9+9o/ziA1gzY5wWZROsmw\"",
    "mtime": "2026-09-05T15:25:32.566Z",
    "size": 210721,
    "path": "../public/_nuxt/sqlite3-worker1-Dla_zcLf.js"
  },
  "/_nuxt/uhdI0v04.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"48c7-7KyLqvrfmUe8KuCgxiJGFFPadFU\"",
    "mtime": "2026-09-05T15:25:32.567Z",
    "size": 18631,
    "path": "../public/_nuxt/uhdI0v04.js"
  },
  "/_nuxt/uy4dubMv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1123-COBr+fA3PfAHG58zJgLt2HNlCAI\"",
    "mtime": "2026-09-05T15:25:32.567Z",
    "size": 4387,
    "path": "../public/_nuxt/uy4dubMv.js"
  },
  "/_nuxt/vGVdxbeo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2334-h34C0yZGG6R/nTrwmftdW8G40T0\"",
    "mtime": "2026-09-05T15:25:32.567Z",
    "size": 9012,
    "path": "../public/_nuxt/vGVdxbeo.js"
  },
  "/_nuxt/woXpYk--.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a02-SU3rmQ7s+0f8o9PgDVmMiAbdU+M\"",
    "mtime": "2026-09-05T15:25:32.567Z",
    "size": 2562,
    "path": "../public/_nuxt/woXpYk--.js"
  },
  "/_nuxt/x1QpYndt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"57f6-Y1/g5B0opvB8nKOTPj/7ZCXjnYc\"",
    "mtime": "2026-09-05T15:25:32.567Z",
    "size": 22518,
    "path": "../public/_nuxt/x1QpYndt.js"
  },
  "/_nuxt/x7Oz0ub3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11cac-wlLzWkKbWB1SAD7oY7L347VUcWE\"",
    "mtime": "2026-09-05T15:25:32.567Z",
    "size": 72876,
    "path": "../public/_nuxt/x7Oz0ub3.js"
  },
  "/_nuxt/yck5y8x3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8c90-9wTQli/sN+FHgvM62/xz0gkZzEI\"",
    "mtime": "2026-09-05T15:25:32.567Z",
    "size": 35984,
    "path": "../public/_nuxt/yck5y8x3.js"
  },
  "/_nuxt/zf12oZj6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d23-/Viz80tPJurZ1Mr3BsNY1DIm13Q\"",
    "mtime": "2026-09-05T15:25:32.567Z",
    "size": 3363,
    "path": "../public/_nuxt/zf12oZj6.js"
  },
  "/__nuxt_content/docs_duxt/sql_dump.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"4724-d60AtswZOfa6NqfOCWwlxUmtKmo\"",
    "mtime": "2026-09-05T15:25:32.156Z",
    "size": 18212,
    "path": "../public/__nuxt_content/docs_duxt/sql_dump.txt"
  },
  "/_nuxt/sqlite3.BVKGSWc-.wasm": {
    "type": "application/wasm",
    "etag": "\"d31f0-xNUTn+1jr9fv4jbC8JYod+uTKH4\"",
    "mtime": "2026-09-05T15:25:32.567Z",
    "size": 864752,
    "path": "../public/_nuxt/sqlite3.BVKGSWc-.wasm"
  },
  "/__nuxt_content/docs_workflows/sql_dump.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"51d8-r+NAQOSXcujv4x0j9Vqn3645xU0\"",
    "mtime": "2026-09-05T15:25:32.156Z",
    "size": 20952,
    "path": "../public/__nuxt_content/docs_workflows/sql_dump.txt"
  },
  "/__nuxt_content/docs_workflows_v0_7_0/sql_dump.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"51f0-QvhZpFaj1pb73a6yfFiYGgEvTIo\"",
    "mtime": "2026-09-05T15:25:32.156Z",
    "size": 20976,
    "path": "../public/__nuxt_content/docs_workflows_v0_7_0/sql_dump.txt"
  },
  "/_nuxt/builds/latest.json": {
    "type": "application/json",
    "etag": "\"47-c8ud/RSHxMyHwrKQyWWeOZwUcqw\"",
    "mtime": "2026-09-05T15:25:32.232Z",
    "size": 71,
    "path": "../public/_nuxt/builds/latest.json"
  },
  "/_nuxt/builds/meta/6d7065f5-cf70-4bcb-929b-8527688103e6.json": {
    "type": "application/json",
    "etag": "\"58-Igb9ftVlqBb5eJir4U9o5HbMZqI\"",
    "mtime": "2026-09-05T15:25:32.224Z",
    "size": 88,
    "path": "../public/_nuxt/builds/meta/6d7065f5-cf70-4bcb-929b-8527688103e6.json"
  }
};

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
const _ROOT_FOLDER_RE = /^\/([A-Za-z]:)?$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const relative = function(from, to) {
  const _from = resolve(from).replace(_ROOT_FOLDER_RE, "$1").split("/");
  const _to = resolve(to).replace(_ROOT_FOLDER_RE, "$1").split("/");
  if (_to[0][1] === ":" && _from[0][1] === ":" && _from[0] !== _to[0]) {
    return _to.join("/");
  }
  const _fromCopy = [..._from];
  for (const segment of _fromCopy) {
    if (_to[0] !== segment) {
      break;
    }
    _from.shift();
    _to.shift();
  }
  return [..._from.map(() => ".."), ..._to].join("/");
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {"/_nuxt/builds/meta/":{"maxAge":31536000},"/_nuxt/builds/":{"maxAge":1},"/_nuxt/":{"maxAge":31536000}};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _vOaGnc = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError$1({ statusCode: 404 });
    }
    return;
  }
  if (asset.encoding !== void 0) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

const options = {"iconifyApiEndpoint":"https://api.iconify.design"};

const collections = {
  'flag': () => import('../_/icons.mjs').then(m => m.default),
  'lucide': () => import('../_/icons2.mjs').then(m => m.default),
  'simple-icons': () => import('../_/icons3.mjs').then(m => m.default),
  'vscode-icons': () => import('../_/icons4.mjs').then(m => m.default),
};

const _Op1g9F = defineCachedEventHandler(async (event) => {
  const collectionName = event.context.params?.collection?.replace(/\.json$/, "");
  const collection = collectionName && Object.hasOwn(collections, collectionName) ? await collections[collectionName]?.() : null;
  const apiEndPoint = options.iconifyApiEndpoint;
  const icons = String(parseQuery(parsePath(event.path).search).icons || "").split(",");
  if (!collectionName) return createError$1({ status: 400, message: "No collection specified" });
  if (!icons.length) return createError$1({ status: 400, message: "No icons specified" });
  if (collection) {
    const data = getIcons(
      collection,
      icons
    );
    consola.debug(`[Icon] serving ${icons.map((i) => "`" + collectionName + ":" + i + "`").join(",")} from bundled collection`);
    return data;
  }
  {
    const apiUrl = new URL(`./${collectionName}.json?icons=${icons.join(",")}`, apiEndPoint);
    consola.debug(`[Icon] fetching ${icons.map((i) => "`" + collectionName + ":" + i + "`").join(",")} from iconify api`);
    if (apiUrl.host !== new URL(apiEndPoint).host) {
      return createError$1({ status: 400, message: "Invalid icon request" });
    }
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        return response.status === 404 ? createError$1({ status: 404 }) : createError$1({ status: 500, message: "Failed to fetch fallback icon" });
      }
      return response.json();
    } catch (e) {
      consola.error(e);
      return createError$1({ status: 500, message: "Failed to fetch fallback icon" });
    }
  }
  return createError$1({ status: 404 });
}, {
  group: "nuxt",
  name: "icon",
  getKey(event) {
    const collection = event.context.params?.collection?.replace(/\.json$/, "") || "unknown";
    const icons = String(parseQuery(parsePath(event.path).search).icons || "").split(",");
    return `${collection}_${icons[0]}_${icons.length}_${hash$1(icons.join(","))}`;
  },
  swr: true,
  maxAge: 60 * 60 * 24 * 7
  // 1 week
});

const mcpConfig = {"route":"/mcp","browserRedirect":"/","name":"duxt documentation","version":"1.0.0","description":"The documentation this site publishes, readable by an agent.","instructions":"Call list_pages for the table of contents, search_docs to find a page by term, and read_page for the full text of one page.","security":{}};

function duxtCollections$2() {
  var _a;
  const { duxt } = useAppConfig();
  const names = ((_a = duxt == null ? void 0 : duxt.resolvedSources) == null ? void 0 : _a.length) ? duxt.resolvedSources.map((source) => source.collection) : ["docs"];
  return names;
}
const list_pages = defineMcpTool({
  name: "list_pages",
  title: "List documentation pages",
  description: "Every page of this documentation with its path, title and description. Start here, then read a page with `read_page`.",
  annotations: { readOnlyHint: true },
  // A tool without an `inputSchema` is called with ONE argument: the SDK hands
  // the handler `extra` directly rather than `(args, extra)`. Written the other
  // way round, `extra` was undefined and every call failed on `extra.event`.
  async handler(extra) {
    const pages = (await Promise.all(
      duxtCollections$2().map(
        (name) => queryCollection(extra.event, name).select("path", "title", "description").all()
      )
    )).flat();
    const listing = pages.filter((page) => page.path).sort((a, b) => a.path.localeCompare(b.path)).map(
      (page) => `- ${page.path} \u2014 ${page.title}${page.description ? `: ${page.description}` : ""}`
    ).join("\n");
    return { content: [{ type: "text", text: listing }] };
  }
});

function duxtCollections$1() {
  var _a;
  const { duxt } = useAppConfig();
  const names = ((_a = duxt == null ? void 0 : duxt.resolvedSources) == null ? void 0 : _a.length) ? duxt.resolvedSources.map((source) => source.collection) : ["docs"];
  return names;
}
const read_page = defineMcpTool({
  name: "read_page",
  title: "Read a documentation page",
  description: "The full content of one page. Paths come from `list_pages`.",
  annotations: { readOnlyHint: true },
  inputSchema: {
    path: z.string().describe("Page path, for example /guide/deploying")
  },
  async handler({ path }, extra) {
    var _a;
    const found = await Promise.all(
      duxtCollections$1().map(
        (name) => queryCollection(extra.event, name).path(path).first()
      )
    );
    const page = found.find(Boolean);
    if (!page) {
      return {
        content: [
          {
            type: "text",
            text: `No page at ${path}. Use \`list_pages\` for valid paths.`
          }
        ],
        isError: true
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `# ${page.title}

${(_a = page.description) != null ? _a : ""}

${JSON.stringify(page.body)}`
        }
      ]
    };
  }
});

function duxtCollections() {
  var _a;
  const { duxt } = useAppConfig();
  const names = ((_a = duxt == null ? void 0 : duxt.resolvedSources) == null ? void 0 : _a.length) ? duxt.resolvedSources.map((source) => source.collection) : ["docs"];
  return names;
}
const search_docs = defineMcpTool({
  name: "search_docs",
  title: "Search the documentation",
  description: "Find pages whose title or description matches a term.",
  annotations: { readOnlyHint: true },
  inputSchema: {
    query: z.string().describe("What to look for")
  },
  async handler({ query }, extra) {
    const term = `%${query}%`;
    const pages = (await Promise.all(
      duxtCollections().map(
        (name) => queryCollection(extra.event, name).select("path", "title", "description").orWhere(
          (group) => group.where("title", "LIKE", term).where("description", "LIKE", term)
        ).all()
      )
    )).flat();
    if (!pages.length) {
      return {
        content: [{ type: "text", text: `Nothing matches "${query}".` }]
      };
    }
    return {
      content: [
        {
          type: "text",
          text: pages.map(
            (page) => `- ${page.path} \u2014 ${page.title}${page.description ? `: ${page.description}` : ""}`
          ).join("\n")
        }
      ]
    };
  }
});

const tools = [
  (function() {
  const def = list_pages;
  return {
    ...def,
    _meta: {
      ...def._meta,
      filename: "list-pages.ts"
    }
  }
})(),
  (function() {
  const def = read_page;
  return {
    ...def,
    _meta: {
      ...def._meta,
      filename: "read-page.ts"
    }
  }
})(),
  (function() {
  const def = search_docs;
  return {
    ...def,
    _meta: {
      ...def._meta,
      filename: "search-docs.ts"
    }
  }
})()
];

const resources = [];

const prompts = [];

const handlers$1 = [];

function parseMcpToolsHeader(value) {
  if (value === void 0) {
    return void 0;
  }
  return new Set(value.split(",").map((name) => name.trim()).filter(Boolean));
}
function filterToolsByRequestedNames(tools, requested) {
  const resolved = tools.map((tool) => {
    const { name } = enrichNameTitle({
      name: tool.name,
      title: tool.title,
      _meta: tool._meta,
      type: "tool"
    });
    return { tool, name };
  });
  const known = new Set(resolved.map((entry) => entry.name));
  const unknownNames = [...requested].filter((name) => !known.has(name));
  return {
    tools: resolved.filter((entry) => requested.has(entry.name)).map((entry) => entry.tool),
    unknownNames
  };
}

const createMcpTransportHandler = (handler) => handler;

function createJsonRpcErrorResponse(status, code, message) {
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    error: { code, message },
    id: null
  }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
function onResponseClose(event, fn) {
  const nodeRes = getNodeResponse(event);
  if (nodeRes?.on) {
    nodeRes.on("close", fn);
  }
}
const handleMcpRequest = createMcpTransportHandler(async (createServer, event) => {
  const securityConfig = mcpConfig.security ?? {};
  const originError = validateOrigin(event, securityConfig);
  if (originError) return originError;
  const request = toWebRequest(event);
  {
    if (request.method === "GET") {
      return createJsonRpcErrorResponse(405, -32e3, "Method not allowed. Use POST for MCP requests.");
    }
    const server2 = createServer();
    event.context._mcpServer = server2;
    const transport2 = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: void 0,
      // In stateless mode, use JSON responses instead of SSE so that H3 can
      // fully await the response and afterResponse fires only after the tool
      // handler completes. With SSE the response stream is returned immediately
      // (before the handler runs), which causes serverless runtimes to fire
      // afterResponse too early and drops any log.set() calls made after async
      // work inside the handler.
      enableJsonResponse: true
    });
    onResponseClose(event, () => {
      transport2.close();
      server2.close();
    });
    await server2.connect(transport2);
    return transport2.handleRequest(request);
  }
});

function resolveConfig(config, event) {
  return typeof config === "function" ? config(event) : config;
}
async function filterByEnabled(definitions, event) {
  const results = await Promise.all(
    definitions.map(async (def) => {
      if (!def.enabled) return true;
      return def.enabled(event);
    })
  );
  return definitions.filter((_, i) => results[i]);
}
async function resolveDynamicDefinitions(config, event) {
  const tools = typeof config.tools === "function" ? await config.tools(event) : config.tools || [];
  const resources = typeof config.resources === "function" ? await config.resources(event) : config.resources || [];
  const prompts = typeof config.prompts === "function" ? await config.prompts(event) : config.prompts || [];
  return {
    name: config.name,
    version: config.version,
    description: config.description,
    instructions: config.instructions,
    icons: config.icons,
    tools: await filterByEnabled(tools, event),
    resources: await filterByEnabled(resources, event),
    prompts: await filterByEnabled(prompts, event),
    experimental_codeMode: config.experimental_codeMode
  };
}
function registerEmptyDefinitionFallbacks(server, config) {
  if (!config.tools.length) {
    server.registerTool("__init__", {}, async () => ({ content: [] })).remove();
  }
  if (!config.resources.length) {
    server.registerResource("__init__", "noop://init", {}, async () => ({ contents: [] })).remove();
  }
  if (!config.prompts.length) {
    server.registerPrompt("__init__", {}, async () => ({ messages: [] })).remove();
  }
}
async function createMcpServer(config) {
  const server = new McpServer({
    name: config.name,
    version: config.version,
    description: config.description,
    icons: config.icons
  }, {
    instructions: config.instructions,
    capabilities: {
      logging: {}
    }
  });
  trackLoggingLevel(server);
  let toolsToRegister = config.tools;
  if (config.experimental_codeMode && toolsToRegister.length > 0) {
    const { createCodemodeTools } = await import('../_/index.mjs');
    const codeModeOptions = typeof config.experimental_codeMode === "object" ? config.experimental_codeMode : void 0;
    toolsToRegister = createCodemodeTools(toolsToRegister, codeModeOptions);
  }
  for (const tool of toolsToRegister) {
    registerToolFromDefinition(server, tool);
  }
  for (const resource of config.resources) {
    registerResourceFromDefinition(server, resource);
  }
  for (const prompt of config.prompts) {
    registerPromptFromDefinition(server, prompt);
  }
  registerEmptyDefinitionFallbacks(server, { ...config, tools: toolsToRegister });
  return server;
}
function summarizeRpcBody(body) {
  if (!body) return void 0;
  const messages = Array.isArray(body) ? body : [body];
  const summary = {
    methods: [],
    ids: [],
    tools: [],
    resources: [],
    prompts: []
  };
  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue;
    if (typeof msg.method === "string") summary.methods.push(msg.method);
    if (typeof msg.id === "string" || typeof msg.id === "number") summary.ids.push(msg.id);
    const params = msg.params;
    if (params && typeof params === "object") {
      const name = typeof params.name === "string" ? params.name : void 0;
      const uri = typeof params.uri === "string" ? params.uri : void 0;
      if (msg.method === "tools/call" && name) summary.tools.push(name);
      if (msg.method === "resources/read" && uri) summary.resources.push(uri);
      if (msg.method === "prompts/get" && name) summary.prompts.push(name);
    }
  }
  if (!summary.methods.length && !summary.tools.length && !summary.resources.length && !summary.prompts.length && !summary.ids.length) return void 0;
  return summary;
}
function pickOne(values) {
  if (!values.length) return void 0;
  if (values.length === 1) return values[0];
  return values;
}
async function tagEvlogContext(event, route) {
  const log = getEvlogLogger(event);
  if (!log) return;
  const sessionId = getHeader(event, "mcp-session-id");
  const mcp = {
    transport: "streamable-http",
    route
  };
  if (sessionId) mcp.session_id = sessionId;
  const method = getRequestMethod(event);
  if (method.toUpperCase() === "POST") {
    let summary;
    try {
      summary = summarizeRpcBody(await readBody(event));
    } catch {
    }
    if (summary) {
      const m = pickOne(summary.methods);
      const id = pickOne(summary.ids);
      const tool = pickOne(summary.tools);
      const resource = pickOne(summary.resources);
      const prompt = pickOne(summary.prompts);
      if (m !== void 0) mcp[Array.isArray(m) ? "methods" : "method"] = m;
      if (id !== void 0) mcp[Array.isArray(id) ? "request_ids" : "request_id"] = id;
      if (tool !== void 0) mcp[Array.isArray(tool) ? "tools" : "tool"] = tool;
      if (resource !== void 0) mcp[Array.isArray(resource) ? "resources" : "resource"] = resource;
      if (prompt !== void 0) mcp[Array.isArray(prompt) ? "prompts" : "prompt"] = prompt;
    }
  }
  log.set({ mcp });
}
function applyMcpToolsHeader(config, event) {
  const requested = parseMcpToolsHeader(getHeader(event, "x-mcp-tools"));
  if (!requested) {
    return;
  }
  const { tools, unknownNames } = filterToolsByRequestedNames(config.tools, requested);
  if (unknownNames.length) {
    throw createError$1({
      statusCode: 400,
      message: `Unknown MCP tool${unknownNames.length > 1 ? "s" : ""}: ${unknownNames.join(", ")}`
    });
  }
  config.tools = tools;
}
function asString(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return void 0;
}
const hookLog = consola.withTag("mcp-toolkit");
async function callMcpHook(name, ctx) {
  try {
    const hooks = useNitroApp().hooks;
    await hooks.callHook(name, ctx);
  } catch (error) {
    hookLog.error(`Hook "${name}" threw \u2014 request continues`, error);
  }
}
function tagAuthContext(event) {
  const log = getEvlogLogger(event);
  if (!log) return;
  const ctx = event.context;
  const userObj = ctx.user && typeof ctx.user === "object" ? ctx.user : void 0;
  const userId = asString(ctx.userId) ?? asString(userObj?.id);
  if (userObj || userId) {
    const user = {};
    if (userId) user.id = userId;
    const email = asString(userObj?.email);
    if (email) user.email = email;
    const name = asString(userObj?.name);
    if (name) user.name = name;
    if (Object.keys(user).length > 0) log.set({ user });
  }
  const sessionObj = ctx.session && typeof ctx.session === "object" ? ctx.session : void 0;
  const sessionId = asString(sessionObj?.id) ?? asString(ctx.sessionId);
  if (sessionId) log.set({ session: { id: sessionId } });
}
function createMcpHandler(config) {
  return eventHandler(async (event) => {
    const resolvedConfig = resolveConfig(config, event);
    await tagEvlogContext(event, event.path?.split("?")[0] || "/mcp");
    if (getHeader(event, "accept")?.includes("text/html")) {
      return sendRedirect(event, resolvedConfig.browserRedirect);
    }
    const handler = async () => {
      tagAuthContext(event);
      const staticConfig = await resolveDynamicDefinitions(resolvedConfig, event);
      await callMcpHook("mcp:config:resolved", { config: staticConfig, event });
      applyMcpToolsHeader(staticConfig, event);
      const server = await createMcpServer(staticConfig);
      await callMcpHook("mcp:server:created", { server, event });
      return handleMcpRequest(() => server, event);
    };
    if (resolvedConfig.middleware) {
      let nextCalled = false;
      let handlerResult;
      const next = async () => {
        nextCalled = true;
        handlerResult = await handler();
        return handlerResult;
      };
      const middlewareResult = await resolvedConfig.middleware(event, next);
      if (middlewareResult !== void 0) {
        return middlewareResult;
      }
      if (nextCalled) {
        return handlerResult;
      }
      return handler();
    }
    return handler();
  });
}

function resolveField(field, pool, baseFilter) {
  if (Array.isArray(field)) return field;
  if (typeof field === "function") return field;
  return (event) => filterRawDefinitions(pool, { ...baseFilter, event });
}
function pickBaseFilter(handlerDef, handlerName) {
  if (handlerName === null) {
    return { orphansOnly: true } ;
  }
  const meta = handlerDef?._meta;
  const isFolderHandler = meta?.handler === handlerName;
  return isFolderHandler ? { handler: handlerName } : {};
}
function mergeMcpConfig(override, fallbackName, handlerName) {
  const baseFilter = pickBaseFilter(override, handlerName);
  return {
    name: override?.name ?? mcpConfig.name ?? fallbackName,
    version: override?.version ?? mcpConfig.version,
    description: override?.description ?? mcpConfig.description,
    instructions: override?.instructions ?? mcpConfig.instructions,
    icons: override?.icons ?? mcpConfig.icons,
    browserRedirect: override?.browserRedirect ?? mcpConfig.browserRedirect,
    tools: resolveField(override?.tools, tools, baseFilter),
    resources: resolveField(override?.resources, resources, baseFilter),
    prompts: resolveField(override?.prompts, prompts, baseFilter),
    middleware: override?.middleware,
    experimental_codeMode: override?.experimental_codeMode
  };
}
const _eRnPI4 = createMcpHandler((event) => {
  const handlerName = getRouterParam(event, "handler");
  if (handlerName) {
    const handlerDef = handlers$1.find((h) => h.name === handlerName);
    if (!handlerDef) {
      throw new Error(`Handler "${handlerName}" not found`);
    }
    return mergeMcpConfig(handlerDef, handlerName, handlerName);
  }
  return mergeMcpConfig(null, "MCP Server", null);
});

const IDE_CONFIGS = {
  cursor: {
    name: "Cursor",
    generateDeeplink: (serverName, mcpUrl) => {
      const config = { type: "http", url: mcpUrl };
      const configBase64 = Buffer.from(JSON.stringify(config)).toString("base64");
      return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(serverName)}&config=${encodeURIComponent(configBase64)}`;
    }
  },
  vscode: {
    name: "VS Code",
    generateDeeplink: (serverName, mcpUrl) => {
      const config = { name: serverName, type: "http", url: mcpUrl };
      return `vscode:mcp/install?${encodeURIComponent(JSON.stringify(config))}`;
    }
  }
};
function escapeHtmlAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeJs(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}
const _amtrvy = defineEventHandler((event) => {
  const requestUrl = getRequestURL(event);
  const query = getQuery(event);
  const ide = query.ide || "cursor";
  const ideConfig = IDE_CONFIGS[ide];
  if (!ideConfig) {
    setHeader(event, "Location", "/");
    return new Response(null, { status: 302 });
  }
  const serverName = query.name || mcpConfig.name;
  const mcpUrl = `${requestUrl.origin}${mcpConfig.route}`;
  const deeplink = ideConfig.generateDeeplink(serverName, mcpUrl);
  const htmlDeeplink = escapeHtmlAttr(deeplink);
  const jsDeeplink = escapeJs(deeplink);
  setHeader(event, "Content-Type", "text/html; charset=utf-8");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Opening ${ideConfig.name}...</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fff; }
    .container { text-align: center; padding: 2rem; }
    a { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <p>Opening ${ideConfig.name}...</p>
    <p>If nothing happens, <a href="${htmlDeeplink}">click here to install</a>.</p>
  </div>
  <script>window.location.href = "${jsDeeplink}";<\/script>
</body>
</html>`;
});

const IDE_CONFIG = {
  cursor: {
    defaultLabel: "Install MCP in Cursor"
  },
  vscode: {
    defaultLabel: "Install MCP in VS Code"
  }
};
function cursorIconSvg() {
  return `<g transform="translate(8,7) scale(0.75)">
    <path fill="#999" d="M11.925 24l10.425-6-10.425-6L1.5 18l10.425 6z"/>
    <path fill="#bbb" d="M22.35 18V6L11.925 0v12l10.425 6z"/>
    <path fill="#aaa" d="M11.925 0L1.5 6v12l10.425-6V0z"/>
    <path fill="#888" d="M22.35 6L11.925 24V12L22.35 6z"/>
    <path fill="#fff" d="M22.35 6l-10.425 6L1.5 6h20.85z"/>
  </g>`;
}
function vscodeIconSvg() {
  return `<g transform="translate(8,7) scale(0.75)">
    <path fill="#007ACC" d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63l-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12L.326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128l9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
  </g>`;
}
function estimateTextWidth(text, fontSize) {
  const ratio = fontSize / 13;
  let width = 0;
  for (const ch of text) {
    if (ch === " ") width += 3.6;
    else if ("iIl|1!:;.,".includes(ch)) width += 4.2;
    else if (`fjrt()[]{}'"/`.includes(ch)) width += 5.2;
    else if ("mwMW".includes(ch)) width += 10;
    else if (ch >= "A" && ch <= "Z") width += 8.5;
    else width += 7;
  }
  return width * ratio;
}
function generateBadgeSVG(options) {
  const { label, color, textColor, borderColor, showIcon, ide } = options;
  const iconWidth = showIcon ? 26 : 0;
  const textWidth = estimateTextWidth(label, 13);
  const padding = showIcon ? 24 : 22;
  const width = Math.ceil(iconWidth + textWidth + padding);
  const height = 32;
  const textX = showIcon ? 34 : width / 2;
  const textAnchor = showIcon ? "start" : "middle";
  const icon = showIcon ? ide === "vscode" ? vscodeIconSvg() : cursorIconSvg() : "";
  const escapedLabel = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="4" fill="#${color}" stroke="#${borderColor}"/>
  ${icon}
  <text x="${textX}" y="21" fill="#${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" text-anchor="${textAnchor}">${escapedLabel}</text>
</svg>`;
}
const _2qdqBL = defineEventHandler((event) => {
  const query = getQuery(event);
  const ide = query.ide || "cursor";
  const ideConfig = IDE_CONFIG[ide] || IDE_CONFIG.cursor;
  const options = {
    ide,
    label: query.label || ideConfig.defaultLabel,
    color: query.color || "171717",
    textColor: query.textColor || "ffffff",
    borderColor: query.borderColor || "404040",
    showIcon: query.icon !== "false"
  };
  const svg = generateBadgeSVG(options);
  setHeader(event, "Content-Type", "image/svg+xml");
  setHeader(event, "Cache-Control", "public, max-age=86400");
  return svg;
});

const _2AZEcZ = defineEventHandler((event) => {
  setResponseStatus(event, 404);
  setResponseHeader(event, "Content-Type", "application/json");
  setResponseHeader(event, "Cache-Control", "no-store");
  return { error: "not_found", error_description: "OAuth is not configured for this MCP server." };
});

const _5YczcZ = eventHandler(async (event) => {
  const collection = getRouterParam(event, "collection") || event.path?.split("/")?.[2] || "";
  setHeader(event, "Content-Type", "text/plain");
  const data = await useStorage().getItem(`build:content:database.compressed.mjs`) || "";
  if (data) {
    const lineStart = `export const ${collection} = "`;
    const content = String(data).split("\n").find((line) => line.startsWith(lineStart));
    if (content) {
      return content.substring(lineStart.length, content.length - 1);
    }
  }
  return await import('../build/database.compressed.mjs').then((m) => m[collection]);
});

const _messagesHandler = defineEventHandler(async (event) => {
  const locale = getRouterParam(event, "locale");
  if (!locale) {
    throw createError$1({ status: 400, message: "Locale not specified." });
  }
  const ctx = useI18nContext(event);
  if (ctx.localeConfigs && locale in ctx.localeConfigs === false) {
    throw createError$1({ status: 404, message: `Locale '${locale}' not found.` });
  }
  const messages = await ctx.loadMessages(locale);
  return messages;
});
const getCacheKey = (event) => [getRouterParam(event, "locale") ?? "null", getRouterParam(event, "hash") ?? "null"].join("-");
async function shouldBypassCache(event) {
  const locale = getRouterParam(event, "locale");
  if (locale == null) {
    return false;
  }
  const ctx = tryUseI18nContext(event) || await initializeI18nContext(event);
  return !ctx.localeConfigs?.[locale]?.cacheable;
}
const _cachedMessageLoader = defineCachedFunction(_messagesHandler, {
  name: "i18n:messages-internal",
  maxAge: 60 * 60 * 24,
  getKey: getCacheKey,
  shouldBypassCache
});
const _messagesHandlerCached = defineCachedEventHandler(_cachedMessageLoader, {
  name: "i18n:messages",
  maxAge: 10,
  swr: false,
  getKey: getCacheKey,
  shouldBypassCache
});
const _Wubmil = _messagesHandlerCached;

const _SxA8c9 = defineEventHandler(() => {});

const duxtDefaults = {
  title: "duxt",
  version: "v0.0.0",
  navigation: [
    // No `to`: the header resolves it to the first section, so the entry works
    // whether or not the consumer's URLs carry a prefix.
    { label: "duxt.defaults.navigation.docs", icon: "lucide:book-open-text" },
    {
      label: "duxt.defaults.navigation.resources",
      icon: "lucide:library",
      children: [
        {
          label: "Nuxt",
          to: "https://nuxt.com",
          icon: "lucide:box",
          description: "duxt.defaults.resources.nuxt",
          external: true
        },
        {
          label: "Nuxt Content",
          to: "https://content.nuxt.com",
          icon: "lucide:file-text",
          description: "duxt.defaults.resources.content",
          external: true
        },
        {
          label: "shadcn-vue",
          to: "https://www.shadcn-vue.com",
          icon: "lucide:palette",
          description: "duxt.defaults.resources.shadcn",
          external: true
        },
        {
          label: "Tailwind CSS",
          to: "https://tailwindcss.com",
          icon: "lucide:paintbrush",
          description: "duxt.defaults.resources.tailwind",
          external: true
        },
        {
          label: "MDC syntax",
          to: "https://content.nuxt.com/docs/files/markdown",
          icon: "lucide:code",
          description: "duxt.defaults.resources.mdc",
          external: true
        }
      ]
    }
  ],
  sections: [
    {
      label: "duxt.defaults.sections.gettingStarted",
      to: "/getting-started",
      icon: "lucide:rocket"
    },
    {
      label: "duxt.defaults.sections.structure",
      to: "/structure",
      icon: "lucide:folder-tree"
    },
    {
      label: "duxt.defaults.sections.guide",
      to: "/guide",
      icon: "lucide:book-open"
    },
    {
      label: "duxt.defaults.sections.reference",
      to: "/reference",
      icon: "lucide:list"
    }
  ],
  links: [
    {
      icon: "lucide:github",
      to: "https://github.com/kirchDev/duxt",
      label: "duxt.defaults.links.repository"
    }
  ],
  /** Which package managers a command block offers, in the order it shows them. */
  packageManagers: ["pnpm", "npm", "yarn", "bun"],
  /** A flat docs tree gets a trail that only repeats its own section name. */
  breadcrumb: true,
  landing: {
    badge: "duxt.defaults.landing.badge",
    headline: "duxt.defaults.landing.headline",
    description: "duxt.defaults.landing.description",
    actions: [
      {
        label: "duxt.defaults.landing.actions.docs",
        to: "/getting-started",
        icon: "lucide:arrow-right"
      },
      {
        label: "GitHub",
        to: "https://github.com/kirchDev/duxt",
        variant: "outline",
        external: true
      }
    ],
    features: [
      {
        title: "duxt.defaults.landing.features.extend.title",
        description: "duxt.defaults.landing.features.extend.description",
        icon: "lucide:package"
      },
      {
        title: "duxt.defaults.landing.features.sources.title",
        description: "duxt.defaults.landing.features.sources.description",
        icon: "lucide:git-branch"
      },
      {
        title: "duxt.defaults.landing.features.git.title",
        description: "duxt.defaults.landing.features.git.description",
        icon: "lucide:git-merge"
      },
      {
        title: "duxt.defaults.landing.features.shadcn.title",
        description: "duxt.defaults.landing.features.shadcn.description",
        icon: "lucide:palette"
      },
      {
        title: "duxt.defaults.landing.features.mdc.title",
        description: "duxt.defaults.landing.features.mdc.description",
        icon: "lucide:code"
      },
      {
        title: "duxt.defaults.landing.features.machine.title",
        description: "duxt.defaults.landing.features.machine.description",
        icon: "lucide:bot"
      }
    ]
  },
  aside: {
    title: "duxt.defaults.aside.title",
    links: [
      {
        label: "duxt.defaults.aside.star",
        to: "https://github.com/kirchDev/duxt",
        icon: "lucide:star",
        external: true
      },
      {
        label: "duxt.defaults.aside.issue",
        to: "https://github.com/kirchDev/duxt/issues/new/choose",
        icon: "lucide:circle-alert",
        external: true
      },
      {
        label: "duxt.defaults.aside.discord",
        to: "https://discord.kirch.dev/",
        icon: "lucide:message-circle",
        external: true
      },
      // TODO: point at duxt's own published documentation once it is deployed.
      {
        label: "duxt.defaults.aside.docs",
        to: "/getting-started",
        icon: "lucide:book-open-text"
      }
    ]
  }
};
const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function mergeDuxtConfig(over, base) {
  if (Array.isArray(over)) return over;
  if (over === void 0) return base;
  if (!isPlainObject(over) || !isPlainObject(base)) return over;
  const result = { ...base };
  for (const [key, value] of Object.entries(over)) {
    result[key] = mergeDuxtConfig(value, base[key]);
  }
  return result;
}

const _hCk4l8 = defineEventHandler(async (event) => {
  var _a, _b, _c;
  const appConfig = useAppConfig();
  const duxt = mergeDuxtConfig(appConfig.duxt, duxtDefaults);
  const collections = ((_a = duxt.resolvedSources) == null ? void 0 : _a.length) ? duxt.resolvedSources.map((source) => source.collection) : ["docs"];
  const pages = (await Promise.all(
    collections.map(
      (name) => queryCollection(event, name).select("path", "title", "description").all()
    )
  )).flat();
  const origin = getRequestURL(event).origin;
  const lines = [
    `# ${duxt.title}`,
    "",
    `> ${(_c = (_b = duxt.landing) == null ? void 0 : _b.description) != null ? _c : "Documentation."}`,
    "",
    "## Pages",
    "",
    ...pages.filter((page) => page.path).sort((a, b) => a.path.localeCompare(b.path)).map(
      (page) => {
        var _a2;
        return `- [${(_a2 = page.title) != null ? _a2 : page.path}](${origin}${page.path})` + (page.description ? `: ${page.description}` : "");
      }
    ),
    ""
  ];
  setHeader(event, "content-type", "text/plain; charset=utf-8");
  return lines.join("\n");
});

const llms_txt_get = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: _hCk4l8
}, Symbol.toStringTag, { value: 'Module' }));

async function decompressSQLDump(base64Str, compressionType = "gzip") {
  let binaryData;
  if (typeof Buffer !== "undefined") {
    const buffer = Buffer.from(base64Str, "base64");
    binaryData = Uint8Array.from(buffer);
  } else if (typeof atob !== "undefined") {
    binaryData = Uint8Array.from(atob(base64Str), (c) => c.charCodeAt(0));
  } else {
    throw new TypeError("No base64 decoding method available");
  }
  const response = new Response(new Blob([binaryData]));
  const decompressedStream = response.body?.pipeThrough(new DecompressionStream(compressionType));
  const text = await new Response(decompressedStream).text();
  return JSON.parse(text);
}

function refineContentFields(sql, doc) {
  const fields = findCollectionFields(sql);
  const item = { ...doc };
  for (const key in item) {
    if (fields[key] === "json" && item[key] && item[key] !== "undefined") {
      item[key] = JSON.parse(item[key]);
    }
    if (fields[key] === "boolean" && item[key] !== "undefined") {
      item[key] = Boolean(item[key]);
    }
  }
  for (const key in item) {
    if (item[key] === "NULL") {
      item[key] = void 0;
    }
  }
  return item;
}
function findCollectionFields(sql) {
  const table = sql.match(/FROM\s+(\w+)/);
  if (!table) {
    return {};
  }
  const info = contentManifest[getCollectionName(table[1])];
  return info?.fields || {};
}
function getCollectionName(table) {
  return table.replace(/^_content_/, "");
}

var BoundableStatement = class {
	_statement;
	constructor(rawStmt) {
		this._statement = rawStmt;
	}
	bind(...params) {
		return new BoundStatement(this, params);
	}
};
var BoundStatement = class BoundStatement {
	#statement;
	#params;
	constructor(statement, params) {
		this.#statement = statement;
		this.#params = params;
	}
	bind(...params) {
		return new BoundStatement(this.#statement, params);
	}
	all() {
		return this.#statement.all(...this.#params);
	}
	run() {
		return this.#statement.run(...this.#params);
	}
	get() {
		return this.#statement.get(...this.#params);
	}
};

function nodeSqlite3Connector(opts) {
	let _db;
	const getDB = () => {
		if (_db) return _db;
		const nodeSqlite = globalThis.process?.getBuiltinModule?.("node:sqlite");
		if (!nodeSqlite) throw new Error("`node:sqlite` module is not available. Please ensure you are running in Node.js >= 22.5 or Deno >= 2.2.");
		if (opts.name === ":memory:") {
			_db = new nodeSqlite.DatabaseSync(":memory:");
			return _db;
		}
		const filePath = resolve$1(opts.cwd || ".", opts.path || `.data/${opts.name || "db"}.sqlite`);
		mkdirSync(dirname$1(filePath), { recursive: true });
		_db = new nodeSqlite.DatabaseSync(filePath);
		return _db;
	};
	return {
		name: "node-sqlite",
		dialect: "sqlite",
		getInstance: () => getDB(),
		exec(sql) {
			getDB().exec(sql);
			return { success: true };
		},
		prepare: (sql) => new StatementWrapper(() => getDB().prepare(sql)),
		dispose: () => {
			_db?.close?.();
			_db = void 0;
		}
	};
}
var StatementWrapper = class extends BoundableStatement {
	async all(...params) {
		return this._statement().all(...params);
	}
	async run(...params) {
		return {
			success: true,
			...this._statement().run(...params)
		};
	}
	async get(...params) {
		return this._statement().get(...params);
	}
};

const originalEmit = process.emit;
process.emit = function(...args) {
  const name = args[0];
  const data = args[1];
  if (name === `warning` && typeof data === `object` && data.name === `ExperimentalWarning` && data.message.includes(`SQLite is an experimental feature`)) {
    return false;
  }
  return originalEmit.apply(process, args);
};

const nodeSqlite = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: nodeSqlite3Connector
}, Symbol.toStringTag, { value: 'Module' }));

let db;
let _adapterPromise;
let _databasePromise;
function getAdapter() {
  if (!_adapterPromise) {
    _adapterPromise = Promise.resolve().then(function () { return nodeSqlite; }).then((m) => m.default || m);
  }
  return _adapterPromise;
}
async function getDatabase(config) {
  if (db) {
    return db;
  }
  if (!_databasePromise) {
    _databasePromise = (async () => {
      const { database, localDatabase } = config;
      if (["nitro-prerender", "nitro-dev"].includes("node-server")) {
        return nodeSqlite3Connector(refineDatabaseConfig(localDatabase));
      }
      const adapter = await getAdapter();
      return adapter(refineDatabaseConfig(database));
    })().catch((error) => {
      _databasePromise = void 0;
      throw error;
    });
  }
  db = await _databasePromise;
  return db;
}
async function loadDatabaseAdapter(config) {
  await getDatabase(config);
  return {
    all: async (sql, params = []) => {
      return db.prepare(sql).all(...params).then((result) => (result || []).map((item) => refineContentFields(sql, item)));
    },
    first: async (sql, params = []) => {
      return db.prepare(sql).get(...params).then((item) => item ? refineContentFields(sql, item) : item);
    },
    exec: async (sql, params = []) => {
      return db.prepare(sql).run(...params);
    }
  };
}
const checkDatabaseIntegrity = /* @__PURE__ */ new Map();
const integrityCheckPromise = /* @__PURE__ */ new Map();
async function checkAndImportDatabaseIntegrity(event, collection, config) {
  if (checkDatabaseIntegrity.get(collection) !== false) {
    checkDatabaseIntegrity.set(collection, false);
    if (!integrityCheckPromise.has(collection)) {
      const _integrityCheck = _checkAndImportDatabaseIntegrity(event, collection, checksums[collection], checksumsStructure[collection], config).then((isValid) => {
        checkDatabaseIntegrity.set(collection, !isValid);
      }).catch((error) => {
        console.error("Database integrity check failed", error);
        checkDatabaseIntegrity.set(collection, true);
        integrityCheckPromise.delete(collection);
      });
      integrityCheckPromise.set(collection, _integrityCheck);
    }
  }
  if (integrityCheckPromise.has(collection)) {
    await integrityCheckPromise.get(collection);
  }
}
async function _checkAndImportDatabaseIntegrity(event, collection, integrityVersion, structureIntegrityVersion, config) {
  const db2 = await loadDatabaseAdapter(config);
  const before = await db2.first(`SELECT * FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]).catch(() => null);
  if (before?.version && !String(before.version)?.startsWith(`${config.databaseVersion}--`)) {
    await db2.exec(`DROP TABLE IF EXISTS ${tables.info}`);
    before.version = "";
  }
  const unchangedStructure = before?.structureVersion === structureIntegrityVersion;
  if (before?.version) {
    if (before.version === integrityVersion) {
      if (before.ready) {
        return true;
      }
      await waitUntilDatabaseIsReady(db2, collection);
      return true;
    }
    await db2.exec(`DELETE FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]);
    if (!unchangedStructure) {
      await db2.exec(`DROP TABLE IF EXISTS ${tables[collection]}`);
    }
  }
  const dump = await loadDatabaseDump(event, collection).then(decompressSQLDump);
  const dumpLinesHash = dump.map((row) => row.split(" -- ").pop());
  let hashesInDb = /* @__PURE__ */ new Set();
  if (unchangedStructure) {
    const hashListFromTheDump = new Set(dumpLinesHash);
    const hashesInDbRecords = await db2.all(`SELECT __hash__ FROM ${tables[collection]}`).catch(() => []);
    hashesInDb = new Set(hashesInDbRecords.map((r) => r.__hash__));
    const hashesToDelete = hashesInDb.difference(hashListFromTheDump);
    if (hashesToDelete.size) {
      await db2.exec(`DELETE FROM ${tables[collection]} WHERE __hash__ IN (${Array(hashesToDelete.size).fill("?").join(",")})`, Array.from(hashesToDelete));
    }
  }
  await dump.reduce(async (prev, sql, index) => {
    await prev;
    const hash = dumpLinesHash[index];
    const statement = sql.substring(0, sql.length - hash.length - 4);
    if (unchangedStructure) {
      if (hash === "structure") {
        return Promise.resolve();
      }
      if (hashesInDb.has(hash)) {
        return Promise.resolve();
      }
    }
    await db2.exec(statement).catch((err) => {
      const message = err.message || "Unknown error";
      console.error(`Failed to execute SQL ${sql}: ${message}`);
    });
  }, Promise.resolve());
  const after = await db2.first(`SELECT version FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]).catch(() => ({ version: "" }));
  return after?.version === integrityVersion;
}
const REQUEST_TIMEOUT = 90;
async function waitUntilDatabaseIsReady(db2, collection) {
  let iterationCount = 0;
  let interval;
  await new Promise((resolve, reject) => {
    interval = setInterval(async () => {
      const row = await db2.first(`SELECT ready FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]).catch(() => ({ ready: true }));
      if (row?.ready) {
        clearInterval(interval);
        resolve(0);
      }
      if (iterationCount++ > REQUEST_TIMEOUT) {
        clearInterval(interval);
        reject(new Error("Waiting for another database initialization timed out"));
      }
    }, 1e3);
  }).catch((e) => {
    throw e;
  }).finally(() => {
    if (interval) {
      clearInterval(interval);
    }
  });
}
async function loadDatabaseDump(event, collection) {
  return await fetchDatabase(event, collection).catch((e) => {
    console.error("Failed to fetch compressed dump", e);
    return "";
  });
}
function refineDatabaseConfig(config) {
  if (config.type === "d1") {
    return { ...config, bindingName: config.bindingName || config.binding };
  }
  if (config.type === "sqlite") {
    const _config = { ...config };
    if (config.filename === ":memory:") {
      return { name: ":memory:" };
    }
    if ("filename" in config) {
      const filename = isAbsolute(config?.filename || "") || config?.filename === ":memory:" ? config?.filename : new URL(config.filename, globalThis._importMeta_.url).pathname;
      _config.path = process.platform === "win32" && filename.startsWith("/") ? filename.slice(1) : filename;
    }
    return _config;
  }
  if (config.type === "pglite") {
    return {
      dataDir: config.dataDir,
      // Pass through any other PGlite-specific options
      ...config
    };
  }
  return config;
}

const SQL_COMMANDS = /SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|\$/i;
const SQL_COUNT_REGEX = /^COUNT\((DISTINCT )?([a-z_]\w+|\*)\) as count$/i;
const SQL_SELECT_REGEX = /^SELECT (.*) FROM (\w+)( WHERE .*)? ORDER BY (["\w,\s]+) (ASC|DESC)( LIMIT \d+)?( OFFSET \d+)?$/;
const SQL_WHERE_PAREN_KEYWORDS = /\b(?:WHERE|AND|OR|IN)\s*\(/gi;
const SQL_FUNCTION_CALL = /(?:\b[A-Z_]\w*|["`[][A-Z_]\w*["`\]])\s*\(/i;
function assertSafeQuery(sql, collection) {
  if (!sql) {
    throw new Error("Invalid query: Query cannot be empty");
  }
  const cleanedupQuery = cleanupQuery(sql);
  if (cleanedupQuery !== sql) {
    throw new Error("Invalid query: SQL comments are not allowed");
  }
  const match = sql.match(SQL_SELECT_REGEX);
  if (!match) {
    throw new Error("Invalid query: Query must be a valid SELECT statement with proper syntax");
  }
  const [_, select, from, where, orderBy, order, limit, offset] = match;
  const columns = select?.trim().split(", ") || [];
  if (columns.length === 1) {
    if (columns[0] !== "*" && !columns[0]?.match(SQL_COUNT_REGEX) && !columns[0]?.match(/^"[a-z_]\w+"$/i)) {
      throw new Error(`Invalid query: Column '${columns[0]}' has invalid format. Expected *, COUNT(), or a quoted column name`);
    }
  } else if (!columns.every((column) => column.match(/^"[a-z_]\w+"$/i))) {
    throw new Error("Invalid query: Multiple columns must be properly quoted and alphanumeric");
  }
  if (from !== `_content_${collection}`) {
    const collection2 = String(from || "").replace(/^_content_/, "");
    throw new Error(`Invalid query: Collection '${collection2}' does not exist`);
  }
  if (where) {
    if (!where.startsWith(" WHERE (") || !where.endsWith(")")) {
      throw new Error("Invalid query: WHERE clause must be properly enclosed in parentheses");
    }
    const noString = cleanupQuery(where, { removeString: true });
    if (noString.match(SQL_COMMANDS)) {
      throw new Error("Invalid query: WHERE clause contains unsafe SQL commands");
    }
    const noSingleQuoted = cleanupQuery(where, { removeSingleQuoted: true });
    const withoutGroupingParens = noSingleQuoted.replace(SQL_WHERE_PAREN_KEYWORDS, " ");
    if (SQL_FUNCTION_CALL.test(withoutGroupingParens)) {
      throw new Error("Invalid query: WHERE clause contains unsafe SQL expressions");
    }
  }
  const _order = (orderBy + " " + order).split(", ");
  if (!_order.every((column) => column.match(/^("[a-zA-Z_]+"|[a-zA-Z_]+) (ASC|DESC)$/))) {
    throw new Error("Invalid query: ORDER BY clause must contain valid column names followed by ASC or DESC");
  }
  if (limit !== void 0 && !limit.match(/^ LIMIT \d+$/)) {
    throw new Error("Invalid query: LIMIT clause must be a positive number");
  }
  if (offset !== void 0 && !offset.match(/^ OFFSET \d+$/)) {
    throw new Error("Invalid query: OFFSET clause must be a positive number");
  }
  return true;
}
function cleanupQuery(query, options = {}) {
  let fence = null;
  let result = "";
  const stripAll = Boolean(options.removeString);
  const stripSingle = Boolean(options.removeSingleQuoted) && !stripAll;
  const strippingFence = (active) => {
    if (stripAll) {
      return true;
    }
    return stripSingle && active === "'";
  };
  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    const nextChar = query[i + 1];
    if (fence) {
      if (fence === "[") {
        if (char === "]") {
          if (!strippingFence(fence)) {
            result += char;
          }
          fence = null;
        } else if (!strippingFence(fence)) {
          result += char;
        }
        continue;
      }
      if (char === fence) {
        if (nextChar === fence) {
          if (!strippingFence(fence)) {
            result += char + nextChar;
          }
          i += 1;
          continue;
        }
        if (!strippingFence(fence)) {
          result += char;
        }
        fence = null;
        continue;
      }
      if (!strippingFence(fence)) {
        result += char;
      }
      continue;
    }
    if (char === "'" || char === '"' || char === "`" || char === "[") {
      fence = char;
      if (!strippingFence(fence)) {
        result += char;
      }
      continue;
    }
    if (char === "-" && nextChar === "-") {
      return result;
    }
    if (char === "/" && nextChar === "*") {
      i += 2;
      while (i < query.length && !(query[i] === "*" && query[i + 1] === "/")) {
        i += 1;
      }
      i += 2;
      continue;
    }
    result += char;
  }
  return result;
}

const _uJDyU3 = eventHandler(async (event) => {
  const { sql } = await readBody(event);
  const collection = getRouterParam(event, "collection") || event.path?.split("/")?.[2] || "";
  assertSafeQuery(sql, collection);
  const conf = useRuntimeConfig().content;
  if (conf.integrityCheck) {
    await checkAndImportDatabaseIntegrity(event, collection, conf);
  }
  return (await loadDatabaseAdapter(conf)).all(sql);
});

const _lazy_hCk4l8 = () => Promise.resolve().then(function () { return llms_txt_get; });
const _lazy_5Jo3xp = () => import('../routes/renderer.mjs').then(function (n) { return n.r; });

const handlers = [
  { route: '', handler: _vOaGnc, lazy: false, middleware: true, method: undefined },
  { route: '/llms.txt', handler: _lazy_hCk4l8, lazy: true, middleware: false, method: "get" },
  { route: '/__nuxt_error', handler: _lazy_5Jo3xp, lazy: true, middleware: false, method: undefined },
  { route: '/api/_nuxt_icon/:collection', handler: _Op1g9F, lazy: false, middleware: false, method: undefined },
  { route: '/mcp', handler: _eRnPI4, lazy: false, middleware: false, method: undefined },
  { route: '/mcp/deeplink', handler: _amtrvy, lazy: false, middleware: false, method: undefined },
  { route: '/mcp/badge.svg', handler: _2qdqBL, lazy: false, middleware: false, method: undefined },
  { route: '/.well-known/oauth-protected-resource', handler: _2AZEcZ, lazy: false, middleware: false, method: undefined },
  { route: '/.well-known/oauth-protected-resource/**', handler: _2AZEcZ, lazy: false, middleware: false, method: undefined },
  { route: '/.well-known/oauth-authorization-server', handler: _2AZEcZ, lazy: false, middleware: false, method: undefined },
  { route: '/.well-known/oauth-authorization-server/**', handler: _2AZEcZ, lazy: false, middleware: false, method: undefined },
  { route: '/.well-known/openid-configuration', handler: _2AZEcZ, lazy: false, middleware: false, method: undefined },
  { route: '/.well-known/openid-configuration/**', handler: _2AZEcZ, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/docs_duxt/sql_dump.txt', handler: _5YczcZ, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/docs_workflows/sql_dump.txt', handler: _5YczcZ, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/docs_workflows_v0_7_0/sql_dump.txt', handler: _5YczcZ, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/info/sql_dump.txt', handler: _5YczcZ, lazy: false, middleware: false, method: undefined },
  { route: '/_i18n/:hash/:locale/messages.json', handler: _Wubmil, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_island/**', handler: _SxA8c9, lazy: false, middleware: false, method: undefined },
  { route: '/llms.txt', handler: _hCk4l8, lazy: false, middleware: false, method: "get" },
  { route: '/__nuxt_content/docs_duxt/query', handler: _uJDyU3, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/docs_workflows/query', handler: _uJDyU3, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/docs_workflows_v0_7_0/query', handler: _uJDyU3, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/info/query', handler: _uJDyU3, lazy: false, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_5Jo3xp, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp$1.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => b(
    nodeHandler,
    aRequest
  );
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return C(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp$1 = createNitroApp();
function useNitroApp() {
  return nitroApp$1;
}
runNitroPlugins(nitroApp$1);

const debug = (...args) => {
};
function GracefulShutdown(server, opts) {
  opts = opts || {};
  const options = Object.assign(
    {
      signals: "SIGINT SIGTERM",
      timeout: 3e4,
      development: false,
      forceExit: true,
      onShutdown: (signal) => Promise.resolve(signal),
      preShutdown: (signal) => Promise.resolve(signal)
    },
    opts
  );
  let isShuttingDown = false;
  const connections = {};
  let connectionCounter = 0;
  const secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;
  function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
      function call() {
        if (!called) {
          called = true;
          return Reflect.apply(callback, this, arguments);
        }
      }
      for (const e of events) {
        emitter.on(e, call);
      }
    };
  }
  const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
  const once = onceFactory();
  once(process, signals, (signal) => {
    debug("received shut down signal", signal);
    shutdown(signal).then(() => {
      if (options.forceExit) {
        process.exit(failed ? 1 : 0);
      }
    }).catch((error) => {
      debug("server shut down error occurred", error);
      process.exit(1);
    });
  });
  function isFunction(functionToCheck) {
    const getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
  }
  function destroy(socket, force = false) {
    if (socket._isIdle && isShuttingDown || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }
  function destroyAllConnections(force = false) {
    debug("Destroy Connections : " + (force ? "forced close" : "close"));
    let counter = 0;
    let secureCounter = 0;
    for (const key of Object.keys(connections)) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        counter++;
        destroy(socket);
      }
    }
    debug("Connections destroyed : " + counter);
    debug("Connection Counter    : " + connectionCounter);
    for (const key of Object.keys(secureConnections)) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        secureCounter++;
        destroy(socket);
      }
    }
    debug("Secure Connections destroyed : " + secureCounter);
    debug("Secure Connection Counter    : " + secureConnectionCounter);
  }
  server.on("request", (req, res) => {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader("connection", "close");
    }
    res.on("finish", () => {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });
  server.on("connection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;
      socket.once("close", () => {
        delete connections[socket._connectionId];
      });
    }
  });
  server.on("secureConnection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;
      socket.once("close", () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });
  process.on("close", () => {
    debug("closed");
  });
  function shutdown(sig) {
    function cleanupHttp() {
      destroyAllConnections();
      debug("Close http server");
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }
          return resolve(true);
        });
      });
    }
    debug("shutdown signal - " + sig);
    if (options.development) {
      debug("DEV-Mode - immediate forceful shutdown");
      return process.exit(0);
    }
    function finalHandler() {
      if (!finalRun) {
        finalRun = true;
        if (options.finally && isFunction(options.finally)) {
          debug("executing finally()");
          options.finally();
        }
      }
      return Promise.resolve();
    }
    function waitForReadyToShutDown(totalNumInterval) {
      debug(`waitForReadyToShutDown... ${totalNumInterval}`);
      if (totalNumInterval === 0) {
        debug(
          `Could not close connections in time (${options.timeout}ms), will forcefully shut down`
        );
        return Promise.resolve(true);
      }
      const allConnectionsClosed = Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0;
      if (allConnectionsClosed) {
        debug("All connections closed. Continue to shutting down");
        return Promise.resolve(false);
      }
      debug("Schedule the next waitForReadyToShutdown");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForReadyToShutDown(totalNumInterval - 1));
        }, 250);
      });
    }
    if (isShuttingDown) {
      return Promise.resolve();
    }
    debug("shutting down");
    return options.preShutdown(sig).then(() => {
      isShuttingDown = true;
      cleanupHttp();
    }).then(() => {
      const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
      return waitForReadyToShutDown(pollIterations);
    }).then((force) => {
      debug("Do onShutdown now");
      if (force) {
        destroyAllConnections(force);
      }
      return options.onShutdown(sig);
    }).then(finalHandler).catch((error) => {
      const errString = typeof error === "string" ? error : JSON.stringify(error);
      debug(errString);
      failed = true;
      throw errString;
    });
  }
  function shutdownManual() {
    return shutdown("manual");
  }
  return shutdownManual;
}

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  GracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((error) => {
          console.error(error);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;
const nitroApp = useNitroApp();
const server = cert && key ? new Server({ key, cert }, toNodeListener(nitroApp.h3App)) : new Server$1(toNodeListener(nitroApp.h3App));
const port = destr(process.env.NITRO_PORT || process.env.PORT) || 3e3;
const host = process.env.NITRO_HOST || process.env.HOST;
const path = process.env.NITRO_UNIX_SOCKET;
const listener = server.listen(path ? { path } : { port, host }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const protocol = cert && key ? "https" : "http";
  const addressInfo = listener.address();
  if (typeof addressInfo === "string") {
    console.log(`Listening on unix socket ${addressInfo}`);
    return;
  }
  const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
  const url = `${protocol}://${addressInfo.family === "IPv6" ? `[${addressInfo.address}]` : addressInfo.address}:${addressInfo.port}${baseURL}`;
  console.log(`Listening on ${url}`);
});
trapUnhandledNodeErrors();
setupGracefulShutdown(listener, nitroApp);
const nodeServer = {};

export { $fetch$1 as $, decodePath as A, withQuery as B, hasProtocol as C, isScriptProtocol as D, sanitizeStatusCode as E, klona as F, hash$1 as G, defuFn as H, baseURL as I, getRequestHeader as J, isEqual as K, setCookie as L, getCookie as M, deleteCookie as N, parseQuery as O, withBase as P, parsePath as Q, withTrailingSlash as R, withoutTrailingSlash as S, getRequestURL as T, createDefu as U, isEqual$1 as V, pascalCase as W, kebabCase$1 as X, getRequestHeaders as Y, withLeadingSlash as Z, nodeServer as _, appRootTag as a, buildAssetsURL as b, appRootAttrs as c, appSpaLoaderTag as d, encodePath as e, appSpaLoaderAttrs as f, appId as g, defineRenderHandler as h, appTeleportTag as i, appTeleportAttrs as j, getQuery as k, createError$1 as l, appHead as m, destr as n, getRouteRules as o, publicAssetsURL as p, joinURL as q, relative as r, getResponseStatusText as s, getResponseStatus as t, useRuntimeConfig as u, useNitroApp as v, enrichNameTitle as w, normalizeToolResult as x, defu as y, parseURL as z };
//# sourceMappingURL=nitro.mjs.map
