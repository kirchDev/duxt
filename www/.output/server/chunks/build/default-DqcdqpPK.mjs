import { v as vue_exports, s as server_renderer_exports } from '../virtual/entry.mjs';
import { D as DuxtHeader_default, a as DuxtFooter_default, S as Sonner_default } from './sonner-duN5B4PW.mjs';
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
import './useDuxtConfig-Cy2__zQL.mjs';
import './lib-Dnm-N0w-.mjs';
import './useDuxtSection-DeDrPvwO.mjs';
import './badge-8_fEuCAp.mjs';

//#region ../app/layouts/default.vue?vue&type=script&setup=true&lang.ts
var default_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "default",
	__ssrInlineRender: true,
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			const _component_DuxtHeader = DuxtHeader_default;
			const _component_DuxtFooter = DuxtFooter_default;
			const _component_Toaster = Sonner_default;
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({ class: "flex min-h-[100dvh] flex-col bg-background text-foreground" }, _attrs))}>`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtHeader, null, null, _parent));
			_push(`<main class="flex-1">`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</main>`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtFooter, null, null, _parent));
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_Toaster, { position: "bottom-right" }, null, _parent));
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/layouts/default.vue
var _sfc_setup = default_vue_vue_type_script_setup_true_lang_default.setup;
default_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/layouts/default.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var default_default = default_vue_vue_type_script_setup_true_lang_default;

export { default_default as default };
//# sourceMappingURL=default-DqcdqpPK.mjs.map
