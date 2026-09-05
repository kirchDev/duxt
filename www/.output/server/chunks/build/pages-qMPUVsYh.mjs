import { v as vue_exports, e as useDuxtLink, b as useSeoMeta$1, s as server_renderer_exports, B as Button_default, N as NuxtLink, f as components_default } from '../virtual/entry.mjs';
import { u as useDuxtConfig } from './useDuxtConfig-Cy2__zQL.mjs';
import { C as Card_default, a as CardHeader_default, b as CardTitle_default, c as CardDescription_default } from './card-CLGKLW0U.mjs';
import { B as Badge_default } from './badge-8_fEuCAp.mjs';
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
import '@vueuse/core';

//#region ../app/pages/index.vue?vue&type=script&setup=true&lang.ts
var index_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "index",
	__ssrInlineRender: true,
	setup(__props) {
		const duxt = useDuxtConfig();
		const localeLink = useDuxtLink();
		useSeoMeta$1({
			title: duxt.title,
			description: duxt.landing?.description
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Badge = Badge_default;
			const _component_Button = Button_default;
			const _component_NuxtLink = NuxtLink;
			const _component_Icon = components_default;
			const _component_Card = Card_default;
			const _component_CardHeader = CardHeader_default;
			const _component_CardTitle = CardTitle_default;
			const _component_CardDescription = CardDescription_default;
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)(_attrs)}><section class="border-b"><div class="mx-auto max-w-5xl px-4 py-24 text-center sm:py-32">`);
			if ((0, vue_exports.unref)(duxt).landing?.badge) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Badge, {
				variant: "secondary",
				class: "mb-6"
			}, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)((0, vue_exports.unref)(duxt).landing.badge)}`);
					else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)((0, vue_exports.unref)(duxt).landing.badge), 1)];
				}),
				_: 1
			}, _parent));
			else _push(`<!---->`);
			_push(`<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">${(0, server_renderer_exports.ssrInterpolate)((0, vue_exports.unref)(duxt).landing?.headline ?? (0, vue_exports.unref)(duxt).title)}</h1>`);
			if ((0, vue_exports.unref)(duxt).landing?.description) _push(`<p class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">${(0, server_renderer_exports.ssrInterpolate)((0, vue_exports.unref)(duxt).landing.description)}</p>`);
			else _push(`<!---->`);
			_push(`<div class="mt-10 flex flex-wrap items-center justify-center gap-3"><!--[-->`);
			(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(duxt).landing?.actions ?? [], (action) => {
				_push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, {
					key: action.to,
					"as-child": "",
					size: "lg",
					variant: action.variant ?? "default"
				}, {
					default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
						if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
							to: (0, vue_exports.unref)(localeLink)(action.to),
							target: action.external ? "_blank" : void 0
						}, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) {
									if (action.icon) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
										name: action.icon,
										class: "size-4"
									}, null, _parent, _scopeId));
									else _push(`<!---->`);
									_push(` ${(0, server_renderer_exports.ssrInterpolate)(action.label)}`);
								} else return [action.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
									key: 0,
									name: action.icon,
									class: "size-4"
								}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(action.label), 1)];
							}),
							_: 2
						}, _parent, _scopeId));
						else return [(0, vue_exports.createVNode)(_component_NuxtLink, {
							to: (0, vue_exports.unref)(localeLink)(action.to),
							target: action.external ? "_blank" : void 0
						}, {
							default: (0, vue_exports.withCtx)(() => [action.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
								key: 0,
								name: action.icon,
								class: "size-4"
							}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(action.label), 1)]),
							_: 2
						}, 1032, ["to", "target"])];
					}),
					_: 2
				}, _parent));
			});
			_push(`<!--]--></div></div></section>`);
			if ((0, vue_exports.unref)(duxt).landing?.features?.length) {
				_push(`<section class="mx-auto max-w-7xl px-4 py-20"><div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><!--[-->`);
				(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(duxt).landing.features, (feature) => {
					_push((0, server_renderer_exports.ssrRenderComponent)(_component_Card, {
						key: feature.title,
						class: "h-full"
					}, {
						default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
							if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_CardHeader, null, {
								default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
									if (_push) {
										if (feature.icon) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
											name: feature.icon,
											class: "size-5 text-muted-foreground"
										}, null, _parent, _scopeId));
										else _push(`<!---->`);
										_push((0, server_renderer_exports.ssrRenderComponent)(_component_CardTitle, { class: "text-base" }, {
											default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
												if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)(feature.title)}`);
												else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(feature.title), 1)];
											}),
											_: 2
										}, _parent, _scopeId));
										_push((0, server_renderer_exports.ssrRenderComponent)(_component_CardDescription, null, {
											default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
												if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)(feature.description)}`);
												else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(feature.description), 1)];
											}),
											_: 2
										}, _parent, _scopeId));
									} else return [
										feature.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
											key: 0,
											name: feature.icon,
											class: "size-5 text-muted-foreground"
										}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
										(0, vue_exports.createVNode)(_component_CardTitle, { class: "text-base" }, {
											default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(feature.title), 1)]),
											_: 2
										}, 1024),
										(0, vue_exports.createVNode)(_component_CardDescription, null, {
											default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(feature.description), 1)]),
											_: 2
										}, 1024)
									];
								}),
								_: 2
							}, _parent, _scopeId));
							else return [(0, vue_exports.createVNode)(_component_CardHeader, null, {
								default: (0, vue_exports.withCtx)(() => [
									feature.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
										key: 0,
										name: feature.icon,
										class: "size-5 text-muted-foreground"
									}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
									(0, vue_exports.createVNode)(_component_CardTitle, { class: "text-base" }, {
										default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(feature.title), 1)]),
										_: 2
									}, 1024),
									(0, vue_exports.createVNode)(_component_CardDescription, null, {
										default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(feature.description), 1)]),
										_: 2
									}, 1024)
								]),
								_: 2
							}, 1024)];
						}),
						_: 2
					}, _parent));
				});
				_push(`<!--]--></div></section>`);
			} else _push(`<!---->`);
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/pages/index.vue
var _sfc_setup = index_vue_vue_type_script_setup_true_lang_default.setup;
index_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/pages/index.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var pages_default = index_vue_vue_type_script_setup_true_lang_default;

export { pages_default as default };
//# sourceMappingURL=pages-qMPUVsYh.mjs.map
