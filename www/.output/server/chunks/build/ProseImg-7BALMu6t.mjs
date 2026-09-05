import { v as vue_exports, d as useRuntimeConfig, s as server_renderer_exports } from '../virtual/entry.mjs';
import { Z as withLeadingSlash, R as withTrailingSlash, q as joinURL } from '../nitro/nitro.mjs';
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

//#region ../node_modules/.pnpm/@nuxtjs+mdc@0.23.1_magic-string@0.30.21_magicast@0.5.4_oxc-parser@0.141.0_rolldown@1.2._82edceced79f34753b5a516fdfd94d58/node_modules/@nuxtjs/mdc/dist/runtime/components/prose/ProseImg.vue
var _sfc_main = {
	__name: "ProseImg",
	__ssrInlineRender: true,
	props: {
		src: {
			type: String,
			default: ""
		},
		alt: {
			type: String,
			default: ""
		},
		width: {
			type: [String, Number],
			default: void 0
		},
		height: {
			type: [String, Number],
			default: void 0
		}
	},
	setup(__props) {
		const props = __props;
		const refinedSrc = (0, vue_exports.computed)(() => {
			if (props.src?.startsWith("/") && !props.src.startsWith("//")) {
				const _base = withLeadingSlash(withTrailingSlash(useRuntimeConfig().app.baseURL));
				if (_base !== "/" && !props.src.startsWith(_base)) return joinURL(_base, props.src);
			}
			return props.src;
		});
		return (_ctx, _push, _parent, _attrs) => {
			(0, server_renderer_exports.ssrRenderVNode)(_push, (0, vue_exports.createVNode)((0, vue_exports.resolveDynamicComponent)((0, vue_exports.unref)("img")), (0, vue_exports.mergeProps)({
				src: (0, vue_exports.unref)(refinedSrc),
				alt: props.alt,
				width: props.width,
				height: props.height
			}, _attrs), null), _parent);
		};
	}
};
var _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/.pnpm/@nuxtjs+mdc@0.23.1_magic-string@0.30.21_magicast@0.5.4_oxc-parser@0.141.0_rolldown@1.2._82edceced79f34753b5a516fdfd94d58/node_modules/@nuxtjs/mdc/dist/runtime/components/prose/ProseImg.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=ProseImg-7BALMu6t.mjs.map
