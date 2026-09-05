import { v as vue_exports, s as server_renderer_exports, f as components_default, g as cn } from '../virtual/entry.mjs';
import { cva } from 'class-variance-authority';
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

//#region ../app/components/ui/alert/Alert.vue?vue&type=script&setup=true&lang.ts
var Alert_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "Alert",
	__ssrInlineRender: true,
	props: {
		class: {},
		variant: {}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({
				"data-slot": "alert",
				class: (0, vue_exports.unref)(cn)((0, vue_exports.unref)(alertVariants)({ variant: __props.variant }), props.class),
				role: "alert"
			}, _attrs))}>`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/components/ui/alert/Alert.vue
var _sfc_setup$3 = Alert_vue_vue_type_script_setup_true_lang_default.setup;
Alert_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/alert/Alert.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var Alert_default = Alert_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/alert/AlertDescription.vue?vue&type=script&setup=true&lang.ts
var AlertDescription_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "AlertDescription",
	__ssrInlineRender: true,
	props: { class: {} },
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({
				"data-slot": "alert-description",
				class: (0, vue_exports.unref)(cn)("text-muted-foreground col-start-2 text-sm [&_p]:leading-relaxed", props.class)
			}, _attrs))}>`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/components/ui/alert/AlertDescription.vue
var _sfc_setup$2 = AlertDescription_vue_vue_type_script_setup_true_lang_default.setup;
AlertDescription_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/alert/AlertDescription.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var AlertDescription_default = AlertDescription_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/alert/AlertTitle.vue?vue&type=script&setup=true&lang.ts
var AlertTitle_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "AlertTitle",
	__ssrInlineRender: true,
	props: { class: {} },
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({
				"data-slot": "alert-title",
				class: (0, vue_exports.unref)(cn)("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", props.class)
			}, _attrs))}>`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/components/ui/alert/AlertTitle.vue
var _sfc_setup$1 = AlertTitle_vue_vue_type_script_setup_true_lang_default.setup;
AlertTitle_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/alert/AlertTitle.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var AlertTitle_default = AlertTitle_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/alert/index.ts
var alertVariants = cva("relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current", {
	variants: { variant: {
		default: "bg-card text-card-foreground",
		destructive: "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90"
	} },
	defaultVariants: { variant: "default" }
});
//#endregion
//#region ../app/components/content/Callout.vue?vue&type=script&setup=true&lang.ts
var Callout_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "Callout",
	__ssrInlineRender: true,
	props: {
		type: { default: "info" },
		title: {},
		icon: {}
	},
	setup(__props) {
		const props = __props;
		const variants = {
			info: {
				icon: "lucide:info",
				rule: "border-l-sky-500",
				text: "text-sky-500"
			},
			tip: {
				icon: "lucide:lightbulb",
				rule: "border-l-emerald-500",
				text: "text-emerald-500"
			},
			warning: {
				icon: "lucide:triangle-alert",
				rule: "border-l-amber-500",
				text: "text-amber-500"
			},
			danger: {
				icon: "lucide:octagon-alert",
				rule: "border-l-red-500",
				text: "text-red-500"
			}
		};
		const variant = (0, vue_exports.computed)(() => variants[props.type]);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Alert = Alert_default;
			const _component_Icon = components_default;
			const _component_AlertTitle = AlertTitle_default;
			const _component_AlertDescription = AlertDescription_default;
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_Alert, (0, vue_exports.mergeProps)({ class: ["my-5 flex items-start gap-2.5 rounded-md border border-l-2 bg-muted/30 px-3 py-2.5", (0, vue_exports.unref)(variant).rule] }, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
							name: __props.icon ?? (0, vue_exports.unref)(variant).icon,
							class: ["mt-[3px] size-4 shrink-0", (0, vue_exports.unref)(variant).text]
						}, null, _parent, _scopeId));
						_push(`<div class="min-w-0 flex-1"${_scopeId}>`);
						if (__props.title) _push((0, server_renderer_exports.ssrRenderComponent)(_component_AlertTitle, { class: "mb-0.5 font-medium text-foreground" }, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)(__props.title)}`);
								else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.title), 1)];
							}),
							_: 1
						}, _parent, _scopeId));
						else _push(`<!---->`);
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_AlertDescription, { class: "text-muted-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-foreground [&_code]:text-foreground [&_p]:my-1.5" }, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
								else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default")];
							}),
							_: 3
						}, _parent, _scopeId));
						_push(`</div>`);
					} else return [(0, vue_exports.createVNode)(_component_Icon, {
						name: __props.icon ?? (0, vue_exports.unref)(variant).icon,
						class: ["mt-[3px] size-4 shrink-0", (0, vue_exports.unref)(variant).text]
					}, null, 8, ["name", "class"]), (0, vue_exports.createVNode)("div", { class: "min-w-0 flex-1" }, [__props.title ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_AlertTitle, {
						key: 0,
						class: "mb-0.5 font-medium text-foreground"
					}, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.title), 1)]),
						_: 1
					})) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createVNode)(_component_AlertDescription, { class: "text-muted-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-foreground [&_code]:text-foreground [&_p]:my-1.5" }, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
						_: 3
					})])];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/content/Callout.vue
var _sfc_setup = Callout_vue_vue_type_script_setup_true_lang_default.setup;
Callout_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/content/Callout.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var Callout_default = Object.assign(Callout_vue_vue_type_script_setup_true_lang_default, { __name: "Callout" });

export { Callout_default as default };
//# sourceMappingURL=Callout-DaQKbOat.mjs.map
