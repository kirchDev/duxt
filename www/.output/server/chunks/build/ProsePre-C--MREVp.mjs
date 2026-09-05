import { v as vue_exports, s as server_renderer_exports, f as components_default, B as Button_default } from '../virtual/entry.mjs';
import { f as fileIcon } from './file-icons-Cw1-FMWv.mjs';
import { u as useDuxtToast } from './useDuxtToast-CcCLDiC4.mjs';
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
import './lib-Dnm-N0w-.mjs';

//#region ../app/components/DuxtCodeBlock.vue?vue&type=script&setup=true&lang.ts
var DuxtCodeBlock_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DuxtCodeBlock",
	__ssrInlineRender: true,
	props: {
		code: {},
		language: {},
		filename: {}
	},
	setup(__props) {
		const props = __props;
		const slots = (0, vue_exports.useSlots)();
		const hasBody = (0, vue_exports.computed)(() => Boolean(slots.default));
		const icon = (0, vue_exports.computed)(() => fileIcon(props.filename ?? props.language, props.language ? "lucide:terminal" : "lucide:file"));
		const label = (0, vue_exports.computed)(() => props.filename ?? props.language);
		const copied = (0, vue_exports.ref)(false);
		const notify = useDuxtToast();
		const root = (0, vue_exports.useTemplateRef)("root");
		async function copy() {
			const text = props.code ?? root.value?.querySelector("code")?.textContent ?? "";
			try {
				await (void 0).clipboard.writeText(text);
				copied.value = true;
				notify.success("Copied to clipboard");
				setTimeout(() => copied.value = false, 2e3);
			} catch {
				notify.error("Could not copy", "The clipboard is unavailable in this context.");
			}
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Icon = components_default;
			const _component_Button = Button_default;
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({ class: "duxt-code group relative my-6 overflow-hidden rounded-lg border bg-card" }, _attrs))}>`);
			if ((0, vue_exports.unref)(label)) {
				_push(`<div class="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">`);
				_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
					name: (0, vue_exports.unref)(icon),
					class: "size-4 shrink-0"
				}, null, _parent));
				_push(`<span class="truncate font-mono">${(0, server_renderer_exports.ssrInterpolate)((0, vue_exports.unref)(label))}</span>`);
				_push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, {
					variant: "ghost",
					size: "icon",
					class: "ml-auto size-7 hover:bg-accent hover:text-foreground",
					"aria-label": (0, vue_exports.unref)(copied) ? _ctx.$t("duxt.code.copied") : _ctx.$t("duxt.code.copy"),
					onClick: copy
				}, {
					default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
						if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
							name: (0, vue_exports.unref)(copied) ? "lucide:check" : "lucide:copy",
							class: "size-3.5"
						}, null, _parent, _scopeId));
						else return [(0, vue_exports.createVNode)(_component_Icon, {
							name: (0, vue_exports.unref)(copied) ? "lucide:check" : "lucide:copy",
							class: "size-3.5"
						}, null, 8, ["name"])];
					}),
					_: 1
				}, _parent));
				_push(`</div>`);
			} else _push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, {
				variant: "ghost",
				size: "icon",
				class: ["absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent focus-visible:opacity-100", { "opacity-100": (0, vue_exports.unref)(copied) }],
				"aria-label": (0, vue_exports.unref)(copied) ? _ctx.$t("duxt.code.copied") : _ctx.$t("duxt.code.copy"),
				onClick: copy
			}, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
						name: (0, vue_exports.unref)(copied) ? "lucide:check" : "lucide:copy",
						class: "size-3.5"
					}, null, _parent, _scopeId));
					else return [(0, vue_exports.createVNode)(_component_Icon, {
						name: (0, vue_exports.unref)(copied) ? "lucide:check" : "lucide:copy",
						class: "size-3.5"
					}, null, 8, ["name"])];
				}),
				_: 1
			}, _parent));
			_push(`<div>`);
			if ((0, vue_exports.unref)(hasBody)) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			else _push(`<pre class="overflow-x-auto p-4 text-sm"><code>${(0, server_renderer_exports.ssrInterpolate)(__props.code)}</code></pre>`);
			_push(`</div></div>`);
		};
	}
});
//#endregion
//#region ../app/components/DuxtCodeBlock.vue
var _sfc_setup$1 = DuxtCodeBlock_vue_vue_type_script_setup_true_lang_default.setup;
DuxtCodeBlock_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/DuxtCodeBlock.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var DuxtCodeBlock_default = Object.assign(DuxtCodeBlock_vue_vue_type_script_setup_true_lang_default, { __name: "DuxtCodeBlock" });
//#endregion
//#region ../app/components/content/ProsePre.vue?vue&type=script&setup=true&lang.ts
var ProsePre_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "ProsePre",
	__ssrInlineRender: true,
	props: {
		code: {},
		language: {},
		filename: {},
		highlights: {},
		meta: {}
	},
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)(DuxtCodeBlock_default, (0, vue_exports.mergeProps)({
				code: __props.code,
				language: __props.language,
				filename: __props.filename
			}, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<pre${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)(_ctx.$attrs, { class: "overflow-x-auto p-4 text-sm" }))}${_scopeId}>`);
						(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
						_push(`</pre>`);
					} else return [(0, vue_exports.createVNode)("pre", (0, vue_exports.mergeProps)(_ctx.$attrs, { class: "overflow-x-auto p-4 text-sm" }), [(0, vue_exports.renderSlot)(_ctx.$slots, "default")], 16)];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/content/ProsePre.vue
var _sfc_setup = ProsePre_vue_vue_type_script_setup_true_lang_default.setup;
ProsePre_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/content/ProsePre.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var ProsePre_default = Object.assign(ProsePre_vue_vue_type_script_setup_true_lang_default, { __name: "ProsePre" });

export { ProsePre_default as default };
//# sourceMappingURL=ProsePre-C--MREVp.mjs.map
