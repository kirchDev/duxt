import { v as vue_exports, s as server_renderer_exports } from '../virtual/entry.mjs';
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

//#region ../app/components/content/ProseH3.vue?vue&type=script&setup=true&lang.ts
var ProseH3_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "ProseH3",
	__ssrInlineRender: true,
	props: { id: {} },
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<h3${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({
				id: __props.id,
				class: "group scroll-mt-20"
			}, _attrs))}>`);
			if (__props.id) _push(`<a${(0, server_renderer_exports.ssrRenderAttr)("href", `#${__props.id}`)} class="duxt-anchor"${(0, server_renderer_exports.ssrRenderAttr)("aria-label", _ctx.$t("duxt.nav.anchor"))}>#</a>`);
			else _push(`<!---->`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</h3>`);
		};
	}
});
//#endregion
//#region ../app/components/content/ProseH3.vue
var _sfc_setup = ProseH3_vue_vue_type_script_setup_true_lang_default.setup;
ProseH3_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/content/ProseH3.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var ProseH3_default = Object.assign(ProseH3_vue_vue_type_script_setup_true_lang_default, { __name: "ProseH3" });

export { ProseH3_default as default };
//# sourceMappingURL=ProseH3-BRrAJQy3.mjs.map
