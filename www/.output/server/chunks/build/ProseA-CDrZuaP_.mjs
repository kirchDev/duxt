import { s as server_renderer_exports, N as NuxtLink, v as vue_exports } from '../virtual/entry.mjs';
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

//#region ../node_modules/.pnpm/@nuxtjs+mdc@0.23.1_magic-string@0.30.21_magicast@0.5.4_oxc-parser@0.141.0_rolldown@1.2._82edceced79f34753b5a516fdfd94d58/node_modules/@nuxtjs/mdc/dist/runtime/components/prose/ProseA.vue
var _sfc_main = {
	__name: "ProseA",
	__ssrInlineRender: true,
	props: {
		href: {
			type: String,
			default: ""
		},
		target: {
			type: String,
			default: void 0,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)(NuxtLink, (0, vue_exports.mergeProps)({
				href: props.href,
				target: props.target
			}, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
					else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default")];
				}),
				_: 3
			}, _parent));
		};
	}
};
var _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/.pnpm/@nuxtjs+mdc@0.23.1_magic-string@0.30.21_magicast@0.5.4_oxc-parser@0.141.0_rolldown@1.2._82edceced79f34753b5a516fdfd94d58/node_modules/@nuxtjs/mdc/dist/runtime/components/prose/ProseA.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=ProseA-CDrZuaP_.mjs.map
