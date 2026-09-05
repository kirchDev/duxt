import { v as vue_exports, s as server_renderer_exports, P as Primitive, g as cn } from '../virtual/entry.mjs';
import { cva } from 'class-variance-authority';
import { reactiveOmit } from '@vueuse/core';

//#region ../app/components/ui/badge/Badge.vue?vue&type=script&setup=true&lang.ts
var Badge_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "Badge",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {},
		variant: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const delegatedProps = reactiveOmit(props, "class");
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)({
				"data-slot": "badge",
				class: (0, vue_exports.unref)(cn)((0, vue_exports.unref)(badgeVariants)({ variant: __props.variant }), props.class)
			}, (0, vue_exports.unref)(delegatedProps), _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
					else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default")];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/badge/Badge.vue
var _sfc_setup = Badge_vue_vue_type_script_setup_true_lang_default.setup;
Badge_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/badge/Badge.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var Badge_default = Badge_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/badge/index.ts
var badgeVariants = cva("inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden", {
	variants: { variant: {
		default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
		secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
		destructive: "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
		outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"
	} },
	defaultVariants: { variant: "default" }
});

export { Badge_default as B };
//# sourceMappingURL=badge-8_fEuCAp.mjs.map
