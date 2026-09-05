import { v as vue_exports, a as useAsyncData, s as server_renderer_exports, f as components_default, B as Button_default, n as useCookie } from '../virtual/entry.mjs';
import { u as useDuxtConfig } from './useDuxtConfig-Cy2__zQL.mjs';
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
import '@vueuse/core';
import './lib-Dnm-N0w-.mjs';

//#region ../app/composables/usePackageManager.ts
/**
* The package manager the reader picked, remembered across pages.
*
* A cookie rather than localStorage, and the reason is the jump: storage is
* readable only in the browser, so the server always renders the default and
* the tab visibly switches after hydration. Reading it earlier does not help —
* the server has already sent the wrong markup. A cookie travels with the
* request, so the first byte is already correct.
*
* Still privacy-clean: first-party, no identifier, no analytics, a value the
* reader set by clicking a tab. Under GDPR/ePrivacy that is a functional
* preference the reader asked for, not something needing consent — the same
* category as a language or theme choice. SameSite=Lax keeps it off
* cross-site requests, and it expires after a year.
*/
function usePackageManager() {
	return useCookie("duxt-package-manager", {
		sameSite: "lax",
		maxAge: 31536e3,
		default: () => void 0
	});
}
//#endregion
//#region ../app/utils/shell-highlight.ts
/**
* Highlight a shell command with the same themes the Markdown fences use.
*
* The package-manager block builds its command at runtime from a prop, so it
* never passes through Content's pipeline and came out as flat text beside
* fences that were coloured. This runs on the server through useAsyncData, so
* Shiki stays out of the client bundle and the result ships as markup.
*
* `defaultColor: false` emits both themes as custom properties per token,
* matching how Content's own output is styled.
*/
var highlighter;
async function highlightShell(code) {
	const { createHighlighter } = await import('shiki');
	highlighter ??= createHighlighter({
		langs: ["bash"],
		themes: ["github-light", "github-dark"]
	});
	return (await highlighter).codeToHtml(code, {
		lang: "bash",
		themes: {
			light: "github-light",
			dark: "github-dark"
		},
		defaultColor: false
	});
}
//#endregion
//#region ../app/components/content/PackageManagers.vue?vue&type=script&setup=true&lang.ts
var PackageManagers_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "PackageManagers",
	__ssrInlineRender: true,
	props: {
		command: {},
		managers: {}
	},
	async setup(__props) {
		let __temp, __restore;
		const props = __props;
		const duxt = useDuxtConfig();
		const managers = (0, vue_exports.computed)(() => props.managers ?? duxt.packageManagers ?? [
			"pnpm",
			"npm",
			"yarn",
			"bun"
		]);
		const managerBrands = {
			npm: {
				icon: "simple-icons:npm",
				light: "#CB3837",
				dark: "#F1554C"
			},
			pnpm: {
				icon: "simple-icons:pnpm",
				light: "#F69220",
				dark: "#F9AD00"
			},
			yarn: {
				icon: "simple-icons:yarn",
				light: "#2C8EBB",
				dark: "#4FA8D8"
			},
			bun: {
				icon: "simple-icons:bun",
				light: "#14151A",
				dark: "#FBF0DF"
			}
		};
		function render(manager) {
			const command = props.command;
			if (manager === "npm") {
				if (command.startsWith("add ")) return `npm install ${command.slice(4)}`;
				if (command.startsWith("dlx ")) return `npx ${command.slice(4)}`;
			}
			if (manager === "yarn" && command.startsWith("dlx ")) return `yarn dlx ${command.slice(4)}`;
			if (manager === "bun" && command.startsWith("dlx ")) return `bunx ${command.slice(4)}`;
			return `${manager} ${command}`;
		}
		const commands = (0, vue_exports.computed)(() => Object.fromEntries(managers.value.map((manager) => [manager, render(manager)])));
		const { data: highlighted } = ([__temp, __restore] = (0, vue_exports.withAsyncContext)(async () => useAsyncData(`package-managers-${props.command}`, async () => {
			const entries = await Promise.all(Object.entries(commands.value).map(async ([manager, command]) => [manager, await highlightShell(command)]));
			return Object.fromEntries(entries);
		})), __temp = await __temp, __restore(), __temp);
		const stored = usePackageManager();
		const active = (0, vue_exports.computed)({
			get: () => managers.value.includes(stored.value ?? "") ? stored.value : managers.value[0],
			set: (value) => {
				stored.value = value;
			}
		});
		const copied = (0, vue_exports.ref)(false);
		const notify = useDuxtToast();
		async function copy() {
			try {
				await (void 0).clipboard.writeText(render(active.value));
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
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({ class: "duxt-code my-6 overflow-hidden rounded-lg border bg-card" }, _attrs))}><div class="flex items-center gap-1 border-b bg-muted/40 px-2 py-1.5"><!--[-->`);
			(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(managers), (manager) => {
				_push(`<button type="button" class="${(0, server_renderer_exports.ssrRenderClass)([(0, vue_exports.unref)(active) === manager ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground", "flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"])}">`);
				_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
					name: managerBrands[manager]?.icon ?? "lucide:terminal",
					class: "duxt-brand size-3.5",
					style: {
						"--brand": managerBrands[manager]?.light,
						"--brand-dark": managerBrands[manager]?.dark
					}
				}, null, _parent));
				_push(` ${(0, server_renderer_exports.ssrInterpolate)(manager)}</button>`);
			});
			_push(`<!--]-->`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, {
				variant: "ghost",
				size: "icon",
				class: "ml-auto size-7",
				"aria-label": (0, vue_exports.unref)(copied) ? _ctx.$t("duxt.code.copied") : _ctx.$t("duxt.code.copyCommand"),
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
			if ((0, vue_exports.unref)(highlighted)?.[(0, vue_exports.unref)(active)]) _push(`<div class="duxt-shell overflow-x-auto px-4 py-3 font-mono text-sm">${(0, vue_exports.unref)(highlighted)[(0, vue_exports.unref)(active)] ?? ""}</div>`);
			else _push(`<pre class="overflow-x-auto px-4 py-3 font-mono text-sm"><code>${(0, server_renderer_exports.ssrInterpolate)(render((0, vue_exports.unref)(active)))}</code></pre>`);
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/components/content/PackageManagers.vue
var _sfc_setup = PackageManagers_vue_vue_type_script_setup_true_lang_default.setup;
PackageManagers_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/content/PackageManagers.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var PackageManagers_default = Object.assign(PackageManagers_vue_vue_type_script_setup_true_lang_default, { __name: "PackageManagers" });

export { PackageManagers_default as default };
//# sourceMappingURL=PackageManagers-K25fRqGP.mjs.map
