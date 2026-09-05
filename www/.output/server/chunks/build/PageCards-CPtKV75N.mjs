import { v as vue_exports, u as useDuxtPath, e as useDuxtLink, s as server_renderer_exports, N as NuxtLink, f as components_default } from '../virtual/entry.mjs';
import { C as Card_default, a as CardHeader_default, b as CardTitle_default, c as CardDescription_default } from './card-CLGKLW0U.mjs';
import { b as useDuxtNavigation } from './useDuxtSection-DeDrPvwO.mjs';
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

//#region ../app/components/content/PageCards.vue?vue&type=script&setup=true&lang.ts
var PageCards_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "PageCards",
	__ssrInlineRender: true,
	props: { path: {} },
	async setup(__props) {
		let __temp, __restore;
		const props = __props;
		const path = useDuxtPath();
		const localeLink = useDuxtLink();
		const { data: navigation } = ([__temp, __restore] = (0, vue_exports.withAsyncContext)(() => useDuxtNavigation()), __temp = await __temp, __restore(), __temp);
		const base = (0, vue_exports.computed)(() => props.path ?? path.value);
		const items = (0, vue_exports.computed)(() => {
			return (navigation.value?.find((item) => item.path === base.value))?.children?.filter((child) => child.path !== base.value) ?? [];
		});
		/** `icon` comes from frontmatter, which Content types as unknown. */
		const iconOf = (item) => typeof item.icon === "string" ? item.icon : void 0;
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_Card = Card_default;
			const _component_CardHeader = CardHeader_default;
			const _component_Icon = components_default;
			const _component_CardTitle = CardTitle_default;
			const _component_CardDescription = CardDescription_default;
			if ((0, vue_exports.unref)(items).length) {
				_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({ class: "not-typeset my-8 grid gap-4 sm:grid-cols-2" }, _attrs))}><!--[-->`);
				(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(items), (item) => {
					_push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
						key: item.path,
						to: (0, vue_exports.unref)(localeLink)(item.path)
					}, {
						default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
							if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Card, { class: "h-full transition-colors hover:border-foreground/20 hover:bg-accent/30" }, {
								default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
									if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_CardHeader, null, {
										default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
											if (_push) {
												if (iconOf(item)) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
													name: iconOf(item),
													class: "size-5 text-muted-foreground"
												}, null, _parent, _scopeId));
												else _push(`<!---->`);
												_push((0, server_renderer_exports.ssrRenderComponent)(_component_CardTitle, { class: "text-base" }, {
													default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
														if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)(item.title)}`);
														else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(item.title), 1)];
													}),
													_: 2
												}, _parent, _scopeId));
												if (item.description) _push((0, server_renderer_exports.ssrRenderComponent)(_component_CardDescription, null, {
													default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
														if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)(item.description)}`);
														else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(item.description), 1)];
													}),
													_: 2
												}, _parent, _scopeId));
												else _push(`<!---->`);
											} else return [
												iconOf(item) ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
													key: 0,
													name: iconOf(item),
													class: "size-5 text-muted-foreground"
												}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
												(0, vue_exports.createVNode)(_component_CardTitle, { class: "text-base" }, {
													default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(item.title), 1)]),
													_: 2
												}, 1024),
												item.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CardDescription, { key: 1 }, {
													default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(item.description), 1)]),
													_: 2
												}, 1024)) : (0, vue_exports.createCommentVNode)("", true)
											];
										}),
										_: 2
									}, _parent, _scopeId));
									else return [(0, vue_exports.createVNode)(_component_CardHeader, null, {
										default: (0, vue_exports.withCtx)(() => [
											iconOf(item) ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
												key: 0,
												name: iconOf(item),
												class: "size-5 text-muted-foreground"
											}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
											(0, vue_exports.createVNode)(_component_CardTitle, { class: "text-base" }, {
												default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(item.title), 1)]),
												_: 2
											}, 1024),
											item.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CardDescription, { key: 1 }, {
												default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(item.description), 1)]),
												_: 2
											}, 1024)) : (0, vue_exports.createCommentVNode)("", true)
										]),
										_: 2
									}, 1024)];
								}),
								_: 2
							}, _parent, _scopeId));
							else return [(0, vue_exports.createVNode)(_component_Card, { class: "h-full transition-colors hover:border-foreground/20 hover:bg-accent/30" }, {
								default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_CardHeader, null, {
									default: (0, vue_exports.withCtx)(() => [
										iconOf(item) ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
											key: 0,
											name: iconOf(item),
											class: "size-5 text-muted-foreground"
										}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
										(0, vue_exports.createVNode)(_component_CardTitle, { class: "text-base" }, {
											default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(item.title), 1)]),
											_: 2
										}, 1024),
										item.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CardDescription, { key: 1 }, {
											default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(item.description), 1)]),
											_: 2
										}, 1024)) : (0, vue_exports.createCommentVNode)("", true)
									]),
									_: 2
								}, 1024)]),
								_: 2
							}, 1024)];
						}),
						_: 2
					}, _parent));
				});
				_push(`<!--]--></div>`);
			} else _push(`<!---->`);
		};
	}
});
//#endregion
//#region ../app/components/content/PageCards.vue
var _sfc_setup = PageCards_vue_vue_type_script_setup_true_lang_default.setup;
PageCards_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/content/PageCards.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var PageCards_default = Object.assign(PageCards_vue_vue_type_script_setup_true_lang_default, { __name: "PageCards" });

export { PageCards_default as default };
//# sourceMappingURL=PageCards-CPtKV75N.mjs.map
