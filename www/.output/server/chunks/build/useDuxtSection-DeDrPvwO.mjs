import { v as vue_exports, a as useAsyncData, u as useDuxtPath, t as tryUseNuxtApp, j as useState } from '../virtual/entry.mjs';
import { u as useDuxtConfig } from './useDuxtConfig-Cy2__zQL.mjs';
import { S as withoutTrailingSlash, W as pascalCase, Y as getRequestHeaders } from '../nitro/nitro.mjs';

//#region virtual:nuxt:node_modules%2F.cache%2Fnuxt%2F.nuxt%2Fcontent%2Fmanifest.ts
var checksums = {
	"docs_duxt": "v3.5.0--Z5sCT9gGa-RAe6nnMqlaoWtD_9oNnR7HOERNc81MTWA",
	"docs_workflows": "v3.5.0--TQ9_dTvO8Uv4LqgMQLAay8DXVPhEp9ahKul3KNGtDQ4",
	"docs_workflows_v0_7_0": "v3.5.0--gyTLYQ0MVuqj_MoAN7sY-gvt61s3lKmNU2w7azTxNdA"
};
var tables = {
	"docs_duxt": "_content_docs_duxt",
	"docs_workflows": "_content_docs_workflows",
	"docs_workflows_v0_7_0": "_content_docs_workflows_v0_7_0",
	"info": "_content_info"
};
var virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Fcontent_2Fmanifest_default = {
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
//#endregion
//#region ../node_modules/.pnpm/@nuxt+content@3.16.0_@oxc-project+types@0.147.0_esbuild@0.28.2_magic-string@0.30.21_mag_a1b8fcebb62d81318b5eaba6a646e180/node_modules/@nuxt/content/dist/runtime/internal/query.js
var buildGroup = (group, type) => {
	const conditions = group._conditions;
	return conditions.length > 0 ? `(${conditions.join(` ${type} `)})` : "";
};
var collectionQueryGroup = (collection) => {
	const conditions = [];
	const query = {
		_conditions: conditions,
		where(field, operator, value) {
			let condition;
			switch (operator.toUpperCase()) {
				case "IN":
				case "NOT IN":
					if (Array.isArray(value)) {
						const values = value.map((val) => singleQuote(val)).join(", ");
						condition = `"${String(field)}" ${operator.toUpperCase()} (${values})`;
					} else throw new TypeError(`Value for ${operator} must be an array`);
					break;
				case "BETWEEN":
				case "NOT BETWEEN":
					if (Array.isArray(value) && value.length === 2) condition = `"${String(field)}" ${operator.toUpperCase()} ${singleQuote(value[0])} AND ${singleQuote(value[1])}`;
					else throw new Error(`Value for ${operator} must be an array with two elements`);
					break;
				case "IS NULL":
				case "IS NOT NULL":
					condition = `"${String(field)}" ${operator.toUpperCase()}`;
					break;
				case "LIKE":
				case "NOT LIKE":
					condition = `"${String(field)}" ${operator.toUpperCase()} ${singleQuote(value)}`;
					break;
				default: condition = `"${String(field)}" ${operator} ${singleQuote(typeof value === "boolean" ? Number(value) : value)}`;
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
var collectionQueryBuilder = (collection, fetch) => {
	const params = {
		conditions: [],
		selectedFields: [],
		offset: 0,
		limit: 0,
		orderBy: [],
		count: {
			field: "",
			distinct: false
		}
	};
	const query = {
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
			if (fields.length) params.selectedFields.push(...fields);
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
			return fetch(collection, buildQuery({ count: {
				field: String(field),
				distinct
			} })).then((m) => m[0].count);
		}
	};
	function buildQuery(opts = {}) {
		let query2 = "SELECT ";
		if (opts?.count) query2 += `COUNT(${opts.count.distinct ? "DISTINCT " : ""}${opts.count.field}) as count`;
		else {
			const fields = Array.from(new Set(params.selectedFields));
			query2 += fields.length > 0 ? fields.map((f) => `"${String(f)}"`).join(", ") : "*";
		}
		query2 += ` FROM ${tables[String(collection)]}`;
		if (params.conditions.length > 0) query2 += ` WHERE ${params.conditions.join(" AND ")}`;
		if (params.orderBy.length > 0) query2 += ` ORDER BY ${params.orderBy.join(", ")}`;
		else query2 += ` ORDER BY stem ASC`;
		const limit = opts?.limit || params.limit;
		if (limit > 0) {
			if (params.offset > 0) query2 += ` LIMIT ${limit} OFFSET ${params.offset}`;
			else query2 += ` LIMIT ${limit}`;
		}
		return query2;
	}
	return query;
};
function singleQuote(value) {
	return `'${String(value).replace(/'/g, "''")}'`;
}
//#endregion
//#region ../node_modules/.pnpm/@nuxt+content@3.16.0_@oxc-project+types@0.147.0_esbuild@0.28.2_magic-string@0.30.21_mag_a1b8fcebb62d81318b5eaba6a646e180/node_modules/@nuxt/content/dist/runtime/internal/utils.js
function pick(keys) {
	return (obj) => {
		obj = obj || {};
		return (keys || []).filter((key) => typeof obj[key] !== "undefined").reduce((newObj, key) => Object.assign(newObj, { [key]: obj[key] }), {});
	};
}
//#endregion
//#region ../node_modules/.pnpm/@nuxt+content@3.16.0_@oxc-project+types@0.147.0_esbuild@0.28.2_magic-string@0.30.21_mag_a1b8fcebb62d81318b5eaba6a646e180/node_modules/@nuxt/content/dist/runtime/internal/navigation.js
async function generateNavigationTree(queryBuilder, extraFields = []) {
	if (!queryBuilder.__params?.orderBy?.length) queryBuilder = queryBuilder.order("stem", "ASC");
	const { contents, configs } = (await queryBuilder.orWhere((group) => group.where("navigation", "<>", "false").where("navigation", "IS NULL")).select("navigation", "stem", "path", "title", "meta", ...extraFields || []).all()).reduce((acc, c) => {
		if (String(c.stem).split("/").pop() === ".navigation") {
			c.title = c.title?.toLowerCase() === "navigation" ? "" : c.title;
			const key = c.path.split("/").slice(0, -1).join("/") || "/";
			acc.configs[key] = {
				...c,
				...c.body
			};
		} else acc.contents.push(c);
		return acc;
	}, {
		configs: {},
		contents: []
	});
	const pickConfigNavigationFields = (content) => ({
		...pick(["title", ...extraFields])(content),
		...content.meta,
		...isObject(content?.navigation) ? content.navigation : {}
	});
	const pickNavigationFields = (content) => ({
		...pick(["title", ...extraFields])(content),
		...isObject(content?.navigation) ? content.navigation : {}
	});
	return sortAndClear(contents.reduce((nav2, content) => {
		const parts = content.path.substring(1).split("/");
		const idParts = content.stem.split("/");
		const isIndex = !!idParts[idParts.length - 1]?.match(/([1-9]\d*\.)?index/g);
		const getNavItem = (content2) => ({
			title: content2.title,
			path: content2.path,
			stem: content2.stem,
			children: [],
			...pickNavigationFields(content2)
		});
		const navItem = getNavItem(content);
		if (isIndex) {
			const dirConfig = configs[navItem.path];
			if (typeof dirConfig?.navigation !== "undefined" && dirConfig?.navigation === false) return nav2;
			if (content.path !== "/") {
				const indexItem = getNavItem(content);
				navItem.children.push(indexItem);
			}
			if (dirConfig) Object.assign(navItem, pickConfigNavigationFields(dirConfig));
		}
		if (parts.length === 1) {
			const existed2 = nav2.find((item) => item.path === navItem.path && item.page === false);
			if (isIndex && existed2) Object.assign(existed2, {
				page: void 0,
				children: [...navItem.children || [], ...existed2.children || []]
			});
			else nav2.push(navItem);
			return nav2;
		}
		const siblings = parts.slice(0, -1).reduce((nodes, part, i) => {
			const currentPathPart = "/" + parts.slice(0, i + 1).join("/");
			const conf = configs[currentPathPart];
			if (typeof conf?.navigation !== "undefined" && conf.navigation === false) return [];
			let parent = nodes.find((n) => n.path === currentPathPart);
			if (!parent) {
				const navigationConfig = conf ? pickConfigNavigationFields(conf) : {};
				parent = {
					...navigationConfig,
					title: navigationConfig.title || generateTitle(part),
					path: currentPathPart,
					stem: idParts.slice(0, i + 1).join("/"),
					children: [],
					page: false
				};
				nodes.push(parent);
			}
			return parent.children;
		}, nav2);
		const existed = siblings.find((item) => item.path === navItem.path && item.page === false);
		if (existed) Object.assign(existed, {
			...navItem,
			page: void 0,
			children: [...navItem.children || [], ...existed.children || []]
		});
		else siblings.push(navItem);
		return nav2;
	}, []));
}
function sortAndClear(nav) {
	const sorted = nav;
	for (const item of sorted) if (item.children?.length) sortAndClear(item.children);
	else delete item.children;
	return nav;
}
function isObject(obj) {
	return obj !== null && Object.prototype.toString.call(obj) === "[object Object]";
}
var generateTitle = (path) => path.split(/[\s-]/g).map(pascalCase).join(" ");
//#endregion
//#region ../node_modules/.pnpm/minimark@0.2.0/node_modules/minimark/dist/hast.mjs
function toHast(tree) {
	return {
		type: "root",
		children: tree.value.map(minimarkToHastNode)
	};
}
function minimarkToHastNode(input) {
	if (typeof input === "string") return {
		type: "text",
		value: input
	};
	const [tag, props, ...children] = input;
	return {
		type: "element",
		tag,
		props,
		children: children.map(minimarkToHastNode)
	};
}
//#endregion
//#region ../node_modules/.pnpm/@nuxt+content@3.16.0_@oxc-project+types@0.147.0_esbuild@0.28.2_magic-string@0.30.21_mag_a1b8fcebb62d81318b5eaba6a646e180/node_modules/@nuxt/content/dist/runtime/internal/search.js
var HEADING = /^h([1-6])$/;
var headingLevel = (tag) => Number(tag.match(HEADING)?.[1] ?? 0);
async function generateSearchSections(queryBuilder, opts) {
	const { ignoredTags = [], extraFields = [], minHeading = "h1", maxHeading = "h6" } = opts || {};
	const minLevel = headingLevel(minHeading);
	const maxLevel = headingLevel(maxHeading);
	return (await queryBuilder.where("extension", "=", "md").select("path", "body", "description", "title", ...extraFields || []).all()).flatMap((doc) => splitPageIntoSections(doc, {
		ignoredTags,
		extraFields,
		minLevel,
		maxLevel
	}));
}
function splitPageIntoSections(page, { ignoredTags, extraFields, minLevel, maxLevel }) {
	const body = !page.body || page.body?.type === "root" ? page.body : toHast(page.body);
	const path = page.path ?? "";
	const extraFieldsData = pick(extraFields)(page);
	const sections = [{
		...extraFieldsData,
		id: path,
		title: page.title || "",
		titles: [],
		content: (page.description || "").trim(),
		level: 1
	}];
	if (!body?.children) return sections;
	let section = 1;
	let previousHeadingLevel = 0;
	const titles = [page.title ?? ""];
	for (const item of body.children) {
		const level = headingLevel(item.tag || "");
		if (level >= minLevel && level <= maxLevel) {
			const title = extractTextFromAst(item).trim();
			if (level === 1) titles.splice(0, titles.length);
			else if (level < previousHeadingLevel) titles.splice(level - 1, titles.length - 1);
			else if (level === previousHeadingLevel) titles.pop();
			sections.push({
				...extraFieldsData,
				id: `${path}#${item.props?.id}`,
				title,
				titles: [...titles],
				content: "",
				level
			});
			titles.push(title);
			previousHeadingLevel = level;
			section += 1;
		} else {
			const content = extractTextFromAst(item, ignoredTags).trim();
			if (section === 1 && sections[section - 1]?.content === content) continue;
			sections[section - 1].content = `${sections[section - 1].content} ${content}`.trim();
		}
	}
	return sections;
}
function extractTextFromAst(node, ignoredTags = []) {
	let text = "";
	if (node.type === "text") text += node.value || "";
	if (ignoredTags.includes(node.tag ?? "")) return "";
	if (node.children?.length) text += node.children.map((child) => extractTextFromAst(child, ignoredTags)).filter(Boolean).join("");
	return text;
}
var FTS_TABLE = "_fts_search";
var indexedCollections = /* @__PURE__ */ new Set();
var ftsTableCreated = false;
async function resetFTSIndex(db) {
	await db.exec(`DROP TABLE IF EXISTS ${FTS_TABLE}`);
	indexedCollections.clear();
	ftsTableCreated = false;
}
async function buildFTSIndex(db, collection, queryBuilder, opts) {
	if (indexedCollections.has(collection)) return;
	if (!ftsTableCreated) {
		await db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS ${FTS_TABLE} USING fts5(collection UNINDEXED, id UNINDEXED, title, title_normalized, titles UNINDEXED, content, level UNINDEXED)`);
		ftsTableCreated = true;
	}
	const sections = await generateSearchSections(queryBuilder, opts);
	for (const section of sections) {
		const titleNormalized = section.title.replace(/([a-z])([A-Z])/g, "$1 $2");
		await db.exec(`INSERT INTO ${FTS_TABLE} (collection, id, title, title_normalized, titles, content, level) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
			collection,
			section.id,
			section.title,
			titleNormalized,
			JSON.stringify(section.titles),
			section.content,
			section.level
		]);
	}
	indexedCollections.add(collection);
}
async function queryFTS(db, collections, query, opts) {
	const { limit = 20, snippet, fields, minTermLength = 1, weights } = opts || {};
	const titleWeight = weights?.title ?? 20;
	const contentWeight = weights?.content ?? 5;
	const headingExponent = weights?.heading ?? .5;
	const tag = (snippet?.tag ?? "mark").replace(/[^a-z0-9]/gi, "");
	const pre = `<${tag}>`;
	const post = `</${tag}>`;
	const collectionFilter = `collection IN (${collections.map(() => "?").join(", ")})`;
	const bm25Expr = `bm25(${FTS_TABLE}, 0, 0, ${titleWeight}, ${titleWeight}, 0, ${contentWeight}, 0)`;
	let selectClause = `collection, id, title, titles, content, level, ${headingExponent > 0 ? `(${bm25Expr} / pow(level, ${headingExponent}))` : bm25Expr} as rank`;
	const snippetColumns = snippet?.columns ?? (snippet ? ["content"] : []);
	const around = Number(snippet?.around) || 30;
	const wantContentSnippet = snippetColumns.includes("content");
	if (wantContentSnippet) selectClause += `, snippet(${FTS_TABLE}, 5, '${pre}', '${post}', '...', ${around}) as snippet_content`;
	const terms = query.split(/\s+/).filter((t) => t.length >= minTermLength);
	if (!terms.length) return [];
	const ftsQuery = terms.map((term) => {
		const escaped = term.replace(/"/g, "\"\"");
		if (fields?.length) return fields.map((f) => `${f} : "${escaped}"*`).join(" OR ");
		return `"${escaped}"*`;
	}).join(" ");
	const sql = `SELECT ${selectClause} FROM ${FTS_TABLE} WHERE ${FTS_TABLE} MATCH ? AND ${collectionFilter} ORDER BY rank LIMIT ?`;
	const params = [
		ftsQuery,
		...collections,
		limit
	];
	let rows;
	try {
		rows = await db.all(sql, params);
	} catch (err) {
		return [];
	}
	const wantTitleSnippet = snippetColumns.includes("title");
	const titleRegex = wantTitleSnippet ? new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi") : null;
	return rows.map((row) => ({
		collection: row.collection,
		id: row.id,
		title: row.title,
		titles: JSON.parse(row.titles || "[]"),
		level: row.level,
		content: row.content,
		rank: row.rank,
		...snippetColumns.length && { snippets: {
			...wantTitleSnippet && { title: row.title.replace(titleRegex, `${pre}$1${post}`) },
			...wantContentSnippet && { content: row.snippet_content }
		} }
	}));
}
//#endregion
//#region ../node_modules/.pnpm/@nuxt+content@3.16.0_@oxc-project+types@0.147.0_esbuild@0.28.2_magic-string@0.30.21_mag_a1b8fcebb62d81318b5eaba6a646e180/node_modules/@nuxt/content/dist/runtime/internal/api.js
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
		query: {
			v: checksums[String(collection)],
			t: void 0
		}
	};
	return event ? await event.$fetch(url, fetchOptions) : await $fetch(url, fetchOptions);
}
async function fetchDatabase(event, collection) {
	return fetchContent(event, collection, "sql_dump.txt", {
		responseType: "text",
		headers: { "content-type": "text/plain" }
	});
}
async function fetchQuery(event, collection, sql) {
	return fetchContent(event, collection, "query", {
		headers: { "content-type": "application/json" },
		method: "POST",
		body: { sql }
	});
}
//#endregion
//#region ../node_modules/.pnpm/@nuxt+content@3.16.0_@oxc-project+types@0.147.0_esbuild@0.28.2_magic-string@0.30.21_mag_a1b8fcebb62d81318b5eaba6a646e180/node_modules/@nuxt/content/dist/runtime/client.js
var queryCollection = (collection) => {
	const event = tryUseNuxtApp()?.ssrContext?.event;
	return collectionQueryBuilder(collection, (collection2, sql) => executeContentQuery(event, collection2, sql));
};
function queryCollectionNavigation(collection, fields) {
	return chainablePromise(collection, (qb) => generateNavigationTree(qb, fields));
}
function queryCollectionSearchSections(collection, opts) {
	return chainablePromise(collection, (qb) => generateSearchSections(qb, opts));
}
function useSearchCollection(collection, opts) {
	const { immediate = true, ...indexOpts } = opts || {};
	const status = (0, vue_exports.ref)(immediate ? "loading" : "idle");
	let db;
	let initPromise;
	let indexedFor = [];
	function resolveCollections() {
		const val = (0, vue_exports.toValue)(collection);
		return (Array.isArray(val) ? val : [val]).map(String);
	}
	async function init() {
		const collections = resolveCollections();
		if (!collections.length) return initPromise ?? (db ? Promise.resolve(db) : Promise.reject(/* @__PURE__ */ new Error("No collections to search")));
		const hasRemovedCollections = indexedFor.some((c) => !collections.includes(c));
		const newCollections = collections.filter((c) => !indexedFor.includes(c));
		if (!newCollections.length && !hasRemovedCollections && initPromise) return initPromise;
		status.value = "loading";
		initPromise = import('./database.client-Dp6oEOCa.mjs').then((m) => m.loadDatabaseAdapter(collections[0])).then(async (_db) => {
			db = _db;
			if (hasRemovedCollections) await resetFTSIndex(_db);
			const toIndex = hasRemovedCollections ? collections : newCollections;
			await Promise.all(toIndex.map((col) => {
				return buildFTSIndex(_db, col, queryCollection(col), indexOpts);
			}));
			indexedFor = [...collections];
			status.value = "ready";
			return _db;
		}).catch((err) => {
			status.value = "error";
			throw err;
		});
		return initPromise;
	}
	async function search(query, searchOpts) {
		if (!db) await init();
		return queryFTS(db, indexedFor, query, searchOpts);
	}
	return {
		status,
		search,
		init
	};
}
async function executeContentQuery(event, collection, sql) {
	return fetchQuery(event, String(collection), sql);
}
function chainablePromise(collection, fn) {
	const queryBuilder = queryCollection(collection);
	const chainable = {
		where(field, operator, value) {
			queryBuilder.where(String(field), operator, value);
			return chainable;
		},
		andWhere(groupFactory) {
			queryBuilder.andWhere(groupFactory);
			return chainable;
		},
		orWhere(groupFactory) {
			queryBuilder.orWhere(groupFactory);
			return chainable;
		},
		order(field, direction) {
			queryBuilder.order(String(field), direction);
			return chainable;
		},
		then(onfulfilled, onrejected) {
			return fn(queryBuilder).then(onfulfilled, onrejected);
		},
		catch(onrejected) {
			return this.then(void 0, onrejected);
		},
		finally(onfinally) {
			return this.then(void 0, void 0).finally(onfinally);
		},
		get [Symbol.toStringTag]() {
			return "Promise";
		}
	};
	return chainable;
}
//#endregion
//#region ../app/composables/useDuxtCollection.ts
/**
* Which collection serves the current route.
*
* `duxtSources` generates one collection per source and version, named after
* the URL prefix it serves. Every query in the theme has to ask the right one,
* or a site with two sources shows nothing at all — the collection a single
* source produces is called `docs`, and the ones a versioned site produces are
* not.
*
* The manifest reaches the app through `app.config.ts`, because Content loads
* `content.config.ts` in its own pass and the app never sees the result. Both
* come from one call site; see the Sources reference.
*/
function useDuxtCollection() {
	const duxt = useDuxtConfig();
	const path = useDuxtPath();
	/** Longest matching prefix wins: `/app/v2` beats `/app` on `/app/v2/guide`. */
	const current = (0, vue_exports.computed)(() => {
		const sources = duxt.resolvedSources ?? [];
		return [...sources].sort((a, b) => b.prefix.length - a.prefix.length).find((source) => !source.prefix || path.value.startsWith(source.prefix)) ?? sources.find((source) => !source.prefix);
	});
	return {
		collection: (0, vue_exports.computed)(() => current.value?.collection ?? "docs"),
		source: current,
		sources: (0, vue_exports.computed)(() => duxt.resolvedSources ?? [])
	};
}
//#endregion
//#region ../app/composables/useDuxtNavigation.ts
/**
* The collection whose navigation is being fetched.
*
* The handler below has to stay one stable function — Nuxt compares handlers
* by reference and warns when callers of a shared key pass different ones —
* but it must also follow the route. So it reads the name at call time from
* here rather than closing over it: binding the name into the closure meant a
* client-side move from one repository to another refetched under the old
* collection, and the sidebar kept showing the previous project's pages.
*/
var active = (0, vue_exports.shallowRef)("docs");
var handler = () => queryCollectionNavigation(active.value, ["icon", "description"]);
/**
* The navigation tree for the collection serving this route.
*
* The key is a getter, so it tracks the collection: two sources are two trees
* and must not share one cache entry.
*/
function useDuxtNavigation() {
	const { collection } = useDuxtCollection();
	(0, vue_exports.watchEffect)(() => {
		active.value = collection.value;
	});
	return useAsyncData(() => `duxt-navigation-${collection.value}`, handler, { watch: [collection] });
}
//#endregion
//#region ../app/composables/useRecentPages.ts
/**
* The pages this reader visited last, for the search dialog's empty state.
*
* localStorage, not a cookie: unlike the package-manager choice this is never
* needed during server rendering, so it has no business travelling with every
* request. It stays in the browser, identifies nobody, and clearing site data
* forgets it.
*/
function useRecentPages() {
	const recent = useState("duxt-recent-pages", () => []);
	function remember(page) {}
	function load() {}
	return {
		recent,
		remember,
		load
	};
}
//#endregion
//#region ../app/utils/navigation-tree.ts
/** Find a node by path, anywhere in the tree. */
function findByPath(items, path) {
	for (const item of items) {
		if (item.path === path) return item;
		const inside = item.children?.length ? findByPath(item.children, path) : void 0;
		if (inside) return inside;
	}
}
/**
* The entries a section's sidebar should show.
*
* A multi-segment prefix makes Content wrap the tree in intermediate nodes —
* `/workflows/v0.7.0` gets a `/workflows` node above it — and rendering those
* gave a collapsible group whose only child was itself. So after picking the
* section's branch, walk down while there is exactly one node the route is
* still inside.
*/
function sectionItems(tree, sectionPath, routePath) {
	const branch = sectionPath ? findByPath(tree, sectionPath) : void 0;
	let items = branch?.children?.length ? branch.children : branch ? [branch] : tree;
	while (items.length === 1) {
		const [only] = items;
		if (!only?.children?.length || !only.path || !routePath.startsWith(only.path)) break;
		items = only.children;
	}
	return items;
}
/**
* The crumbs between the section and the page.
*
* Anything at or above the source's own prefix is one of those wrapper nodes,
* not a page anyone navigates to — it showed up as an extra crumb on a
* versioned URL that the unversioned one did not have.
*/
function trailBelowPrefix(tree, path, prefix) {
	const found = [];
	const walk = (items, ancestors) => {
		for (const item of items) {
			const chain = [...ancestors, item];
			if (item.path === path) {
				found.push(...chain);
				return true;
			}
			if (item.children?.length && walk(item.children, chain)) return true;
		}
		return false;
	};
	walk(tree, []);
	return found.filter((item) => (item.path?.length ?? 0) > prefix.length);
}
//#endregion
//#region ../app/composables/useDuxtSection.ts
/**
* The documentation is split into sections, each owning a branch of the tree —
* so the sidebar shows one branch, not everything. Which branch follows from
* the path, falling back to the whole tree so a page outside any section still
* has a sidebar.
*/
function useDuxtSection(navigation) {
	const path = useDuxtPath();
	const duxt = useDuxtConfig();
	const section = (0, vue_exports.computed)(() => duxt.sections?.find((candidate) => candidate.to && path.value.startsWith(candidate.to)));
	return {
		section,
		items: (0, vue_exports.computed)(() => sectionItems(navigation.value ?? [], section.value?.to, path.value))
	};
}

export { useRecentPages as a, useDuxtNavigation as b, useDuxtSection as c, trailBelowPrefix as d, useSearchCollection as e, queryCollectionSearchSections as f, tables as g, checksums as h, fetchDatabase as i, queryCollection as q, toHast as t, useDuxtCollection as u, virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Fcontent_2Fmanifest_default as v };
//# sourceMappingURL=useDuxtSection-DeDrPvwO.mjs.map
