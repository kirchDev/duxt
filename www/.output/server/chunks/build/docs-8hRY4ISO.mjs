import { v as vue_exports, s as server_renderer_exports, u as useDuxtPath, e as useDuxtLink, N as NuxtLink, f as components_default } from '../virtual/entry.mjs';
import { D as DuxtHeader_default, b as DuxtNavigation_default, a as DuxtFooter_default, S as Sonner_default } from './sonner-duN5B4PW.mjs';
import { u as useDuxtConfig } from './useDuxtConfig-Cy2__zQL.mjs';
import { b as useDuxtNavigation, c as useDuxtSection } from './useDuxtSection-DeDrPvwO.mjs';
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
import './RovingFocusGroup-9mfIdZPl.mjs';
import '@vueuse/core';
import './lib-Dnm-N0w-.mjs';
import './badge-8_fEuCAp.mjs';

//#region ../app/components/DuxtSections.vue?vue&type=script&setup=true&lang.ts
var DuxtSections_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DuxtSections",
	__ssrInlineRender: true,
	setup(__props) {
		const duxt = useDuxtConfig();
		const path = useDuxtPath();
		const localeLink = useDuxtLink();
		function isActive(to) {
			return Boolean(to && path.value.startsWith(to));
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_Icon = components_default;
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({ class: "sticky top-14 z-40 hidden border-b bg-background/80 backdrop-blur-sm lg:block" }, _attrs))}><nav class="mx-auto flex max-w-[90rem] items-center gap-1 overflow-x-auto px-4 lg:px-8"><!--[-->`);
			(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(duxt).sections, (section) => {
				_push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
					key: section.to,
					to: (0, vue_exports.unref)(localeLink)(section.to),
					class: ["my-1.5 flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors", isActive(section.to) ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"]
				}, {
					default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
						if (_push) {
							if (section.icon) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
								name: section.icon,
								class: "size-4"
							}, null, _parent, _scopeId));
							else _push(`<!---->`);
							_push(` ${(0, server_renderer_exports.ssrInterpolate)(section.label)}`);
						} else return [section.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
							key: 0,
							name: section.icon,
							class: "size-4"
						}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(section.label), 1)];
					}),
					_: 2
				}, _parent));
			});
			_push(`<!--]--></nav></div>`);
		};
	}
});
//#endregion
//#region ../app/components/DuxtSections.vue
var _sfc_setup$1 = DuxtSections_vue_vue_type_script_setup_true_lang_default.setup;
DuxtSections_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/DuxtSections.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var DuxtSections_default = Object.assign(DuxtSections_vue_vue_type_script_setup_true_lang_default, { __name: "DuxtSections" });
//#endregion
//#region ../app/layouts/docs.vue?vue&type=script&setup=true&lang.ts
var docs_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "docs",
	__ssrInlineRender: true,
	async setup(__props) {
		let __temp, __restore;
		const { data: navigation } = ([__temp, __restore] = (0, vue_exports.withAsyncContext)(() => useDuxtNavigation()), __temp = await __temp, __restore(), __temp);
		const { items } = useDuxtSection(navigation);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_DuxtHeader = DuxtHeader_default;
			const _component_DuxtSections = DuxtSections_default;
			const _component_DuxtNavigation = DuxtNavigation_default;
			const _component_DuxtFooter = DuxtFooter_default;
			const _component_Toaster = Sonner_default;
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({ class: "flex min-h-[100dvh] flex-col bg-background text-foreground" }, _attrs))}>`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtHeader, null, null, _parent));
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtSections, null, null, _parent));
			_push(`<div class="mx-auto flex w-full max-w-[90rem] flex-1 gap-8 px-4 lg:px-8"><aside class="hidden w-56 shrink-0 lg:block"><div class="sticky top-[6.5rem] max-h-[calc(100vh-8rem)] overflow-y-auto py-8 pr-2">`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtNavigation, { items: (0, vue_exports.unref)(items) }, null, _parent));
			_push(`</div></aside>`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</div>`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtFooter, null, null, _parent));
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_Toaster, { position: "bottom-right" }, null, _parent));
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/layouts/docs.vue
var _sfc_setup = docs_vue_vue_type_script_setup_true_lang_default.setup;
docs_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/layouts/docs.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var docs_default = docs_vue_vue_type_script_setup_true_lang_default;

export { docs_default as default };
//# sourceMappingURL=docs-8hRY4ISO.mjs.map
