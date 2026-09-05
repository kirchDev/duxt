import { g as tables, h as checksums, i as fetchDatabase, v as virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Fcontent_2Fmanifest_default } from './useDuxtSection-DeDrPvwO.mjs';
import '../virtual/entry.mjs';
import '../nitro/nitro.mjs';
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
import 'zod';
import '@modelcontextprotocol/sdk/server/mcp.js';
import 'node:fs/promises';
import '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import 'unhead/plugins';
import 'unhead/utils';
import 'vue';
import '../routes/renderer.mjs';
import 'unhead/server';
import 'unhead/legacy';
import 'nostics';
import 'vue-bundle-renderer/runtime';
import 'vue/server-renderer';
import 'devalue';
import 'clsx';
import 'tailwind-merge';
import 'fnv1a-64';
import 'object-identity';
import 'class-variance-authority';
import './useDuxtConfig-Cy2__zQL.mjs';
import '@vueuse/core';

//#region ../node_modules/.pnpm/@nuxt+content@3.16.0_@oxc-project+types@0.147.0_esbuild@0.28.2_magic-string@0.30.21_mag_a1b8fcebb62d81318b5eaba6a646e180/node_modules/@nuxt/content/dist/runtime/internal/dump.js
async function decompressSQLDump(base64Str, compressionType = "gzip") {
	let binaryData;
	if (typeof Buffer !== "undefined") {
		const buffer = Buffer.from(base64Str, "base64");
		binaryData = Uint8Array.from(buffer);
	} else if (typeof atob !== "undefined") binaryData = Uint8Array.from(atob(base64Str), (c) => c.charCodeAt(0));
	else throw new TypeError("No base64 decoding method available");
	const decompressedStream = new Response(new Blob([binaryData])).body?.pipeThrough(new DecompressionStream(compressionType));
	const text = await new Response(decompressedStream).text();
	return JSON.parse(text);
}
//#endregion
//#region ../node_modules/.pnpm/@nuxt+content@3.16.0_@oxc-project+types@0.147.0_esbuild@0.28.2_magic-string@0.30.21_mag_a1b8fcebb62d81318b5eaba6a646e180/node_modules/@nuxt/content/dist/runtime/internal/collection.js
function refineContentFields(sql, doc) {
	const fields = findCollectionFields(sql);
	const item = { ...doc };
	for (const key in item) {
		if (fields[key] === "json" && item[key] && item[key] !== "undefined") item[key] = JSON.parse(item[key]);
		if (fields[key] === "boolean" && item[key] !== "undefined") item[key] = Boolean(item[key]);
	}
	for (const key in item) if (item[key] === "NULL") item[key] = void 0;
	return item;
}
function findCollectionFields(sql) {
	const table = sql.match(/FROM\s+(\w+)/);
	if (!table) return {};
	return virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Fcontent_2Fmanifest_default[getCollectionName(table[1])]?.fields || {};
}
function getCollectionName(table) {
	return table.replace(/^_content_/, "");
}
//#endregion
//#region ../node_modules/.pnpm/@nuxt+content@3.16.0_@oxc-project+types@0.147.0_esbuild@0.28.2_magic-string@0.30.21_mag_a1b8fcebb62d81318b5eaba6a646e180/node_modules/@nuxt/content/dist/runtime/internal/database.client.js
var db;
var loadedCollections = /* @__PURE__ */ new Map();
var dbPromises = /* @__PURE__ */ new Map();
function loadDatabaseAdapter(collection) {
	async function loadAdapter(collection2) {
		const collectionKey = String(collection2);
		if (!db) {
			if (!dbPromises.has("_")) dbPromises.set("_", initializeDatabase());
			db = await dbPromises.get("_");
			dbPromises.delete("_");
		}
		if (!loadedCollections.has(collectionKey)) {
			if (!dbPromises.has(collectionKey)) dbPromises.set(collectionKey, loadCollectionDatabase(collection2));
			await dbPromises.get(collectionKey);
			loadedCollections.set(collectionKey, "loaded");
			dbPromises.delete(collectionKey);
		}
		return db;
	}
	return {
		all: async (sql, params) => {
			await loadAdapter(collection);
			return db.exec({
				sql,
				bind: params,
				rowMode: "object",
				returnValue: "resultRows"
			}).map((row) => refineContentFields(sql, row));
		},
		first: async (sql, params) => {
			await loadAdapter(collection);
			return refineContentFields(sql, db.exec({
				sql,
				bind: params,
				rowMode: "object",
				returnValue: "resultRows"
			}).shift());
		},
		exec: async (sql, params) => {
			await loadAdapter(collection);
			await db.exec({
				sql,
				bind: params
			});
		}
	};
}
async function initializeDatabase() {
	if (!db) {
		const sqlite3InitModule = await import('./node-C4VTx5qK.mjs').then((m) => m.default);
		globalThis.sqlite3ApiConfig = {
			silent: true,
			debug: (...args) => console.debug(...args),
			warn: (...args) => {
				if (String(args[0]).includes("OPFS sqlite3_vfs")) return;
				console.warn(...args);
			},
			error: (...args) => console.error(...args),
			log: (...args) => console.log(...args)
		};
		db = new (await (sqlite3InitModule())).oo1.DB();
	}
	return db;
}
async function loadCollectionDatabase(collection) {
	if ((void 0).sessionStorage.getItem("previewToken")) return db;
	let compressedDump = null;
	const checksumId = `checksum_${collection}`;
	const dumpId = `collection_${collection}`;
	let checksumState = "matched";
	try {
		if (db.exec({
			sql: `SELECT * FROM ${tables.info} where id = '${checksumId}'`,
			rowMode: "object",
			returnValue: "resultRows"
		}).shift()?.version !== checksums[String(collection)]) checksumState = "mismatch";
	} catch {
		checksumState = "missing";
	}
	if (checksumState !== "matched") {
		if ((void 0).localStorage.getItem(`content_${checksumId}`) === checksums[String(collection)]) compressedDump = (void 0).localStorage.getItem(`content_${dumpId}`);
		if (!compressedDump) {
			compressedDump = await fetchDatabase(void 0, String(collection));
			try {
				(void 0).localStorage.setItem(`content_${checksumId}`, checksums[String(collection)]);
				(void 0).localStorage.setItem(`content_${dumpId}`, compressedDump);
			} catch (error) {
				console.error("Database integrity check failed, rebuilding database", error);
			}
		}
		const dump = await decompressSQLDump(compressedDump);
		await db.exec({ sql: `DROP TABLE IF EXISTS ${tables[String(collection)]}` });
		if (checksumState === "mismatch") await db.exec({ sql: `DELETE FROM ${tables.info} WHERE id = '${checksumId}'` });
		for (const command of dump) try {
			await db.exec(command);
		} catch (error) {
			console.error("Error executing command", error);
		}
	}
	return db;
}

export { loadDatabaseAdapter };
//# sourceMappingURL=database.client-Dp6oEOCa.mjs.map
