import { d as useRuntimeConfig, v as vue_exports, s as server_renderer_exports } from '../virtual/entry.mjs';
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

//#region ../node_modules/.pnpm/@nuxtjs+mdc@0.23.1_magic-string@0.30.21_magicast@0.5.4_oxc-parser@0.141.0_rolldown@1.2._82edceced79f34753b5a516fdfd94d58/node_modules/@nuxtjs/mdc/dist/runtime/components/prose/ProseH1.vue
var _sfc_main = {
	__name: "ProseH1",
	__ssrInlineRender: true,
	props: { id: {
		type: String,
		required: false
	} },
	setup(__props) {
		const props = __props;
		const { headings } = useRuntimeConfig().public.mdc;
		const generate = (0, vue_exports.computed)(() => props.id && (typeof headings?.anchorLinks === "boolean" && headings?.anchorLinks === true || typeof headings?.anchorLinks === "object" && headings?.anchorLinks?.h1));
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<h1${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({ id: props.id }, _attrs))}>`);
			if ((0, vue_exports.unref)(generate)) {
				_push(`<a${(0, server_renderer_exports.ssrRenderAttr)("href", `#${props.id}`)}>`);
				(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
				_push(`</a>`);
			} else (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</h1>`);
		};
	}
};
var _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/.pnpm/@nuxtjs+mdc@0.23.1_magic-string@0.30.21_magicast@0.5.4_oxc-parser@0.141.0_rolldown@1.2._82edceced79f34753b5a516fdfd94d58/node_modules/@nuxtjs/mdc/dist/runtime/components/prose/ProseH1.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=ProseH1-CVLZuK_r.mjs.map
