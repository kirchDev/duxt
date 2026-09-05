import { h as useAppConfig, i as useI18n, v as vue_exports } from '../virtual/entry.mjs';
import { toReactive } from '@vueuse/core';

//#region ../app/utils/duxt-text.ts
/**
* Config keys whose values are prose.
*
* An allowlist rather than a walk over every string: `to`, `icon`, `variant`,
* `prefix` and `collection` are also strings, and running a URL through a
* translation lookup is how a link silently becomes something else.
*/
var TEXT_KEYS = /* @__PURE__ */ new Set([
	"badge",
	"copyright",
	"description",
	"headline",
	"label",
	"title"
]);
/** One value: key if one is registered, own language, base language, or as written. */
function resolveDuxtText(value, locale, lookup) {
	if (typeof value === "string") return lookup(value) ?? value;
	if (value && typeof value === "object" && !Array.isArray(value)) {
		const record = value;
		if (Object.values(record).some((entry) => typeof entry !== "string")) return value;
		const base = locale.split("-")[0];
		const sameLanguage = Object.entries(record).find(([code]) => code.split("-")[0] === base);
		return record[locale] ?? sameLanguage?.[1] ?? Object.values(record)[0];
	}
	return value;
}
/** The same, over a whole config tree: only the keys above are touched. */
function resolveDuxtTexts(node, locale, lookup) {
	if (Array.isArray(node)) return node.map((entry) => resolveDuxtTexts(entry, locale, lookup));
	if (!node || typeof node !== "object") return node;
	const result = {};
	for (const [key, value] of Object.entries(node)) result[key] = TEXT_KEYS.has(key) ? resolveDuxtText(value, locale, lookup) : resolveDuxtTexts(value, locale, lookup);
	return result;
}
/**
* A text field where a plain string is required — an aria-label, a title
* attribute, a list key.
*
* The config type keeps `DuxtText` because that is what a consumer may WRITE;
* by the time a component reads the value, `useDuxtConfig` has resolved it.
* This states that narrowing without asserting it: an unresolved record yields
* undefined rather than `[object Object]` in the DOM.
*/
var asText = (value) => typeof value === "string" ? value : void 0;
//#endregion
//#region ../app/utils/duxt-config.ts
/**
* The layer's defaults, and how a consumer's config is merged over them.
*
* Nuxt merges app.config with defu, which CONCATENATES arrays: a consumer
* setting `navigation: [...]` would get its own entries plus the layer's, in
* that order, with no way to remove ours. Every list here would be unusable.
*
* So the layer ships no lists in app.config at all. It keeps them here and
* merges them itself, replacing arrays instead of appending to them — a
* consumer's list is the list. Objects still merge key by key, so overriding
* `footer.note` leaves `footer.columns` alone.
*/
var duxtDefaults = {
	title: "duxt",
	version: "v0.0.0",
	navigation: [{
		label: "duxt.defaults.navigation.docs",
		icon: "lucide:book-open-text"
	}, {
		label: "duxt.defaults.navigation.resources",
		icon: "lucide:library",
		children: [
			{
				label: "Nuxt",
				to: "https://nuxt.com",
				icon: "lucide:box",
				description: "duxt.defaults.resources.nuxt",
				external: true
			},
			{
				label: "Nuxt Content",
				to: "https://content.nuxt.com",
				icon: "lucide:file-text",
				description: "duxt.defaults.resources.content",
				external: true
			},
			{
				label: "shadcn-vue",
				to: "https://www.shadcn-vue.com",
				icon: "lucide:palette",
				description: "duxt.defaults.resources.shadcn",
				external: true
			},
			{
				label: "Tailwind CSS",
				to: "https://tailwindcss.com",
				icon: "lucide:paintbrush",
				description: "duxt.defaults.resources.tailwind",
				external: true
			},
			{
				label: "MDC syntax",
				to: "https://content.nuxt.com/docs/files/markdown",
				icon: "lucide:code",
				description: "duxt.defaults.resources.mdc",
				external: true
			}
		]
	}],
	sections: [
		{
			label: "duxt.defaults.sections.gettingStarted",
			to: "/getting-started",
			icon: "lucide:rocket"
		},
		{
			label: "duxt.defaults.sections.structure",
			to: "/structure",
			icon: "lucide:folder-tree"
		},
		{
			label: "duxt.defaults.sections.guide",
			to: "/guide",
			icon: "lucide:book-open"
		},
		{
			label: "duxt.defaults.sections.reference",
			to: "/reference",
			icon: "lucide:list"
		}
	],
	links: [{
		icon: "lucide:github",
		to: "https://github.com/kirchDev/duxt",
		label: "duxt.defaults.links.repository"
	}],
	/** Which package managers a command block offers, in the order it shows them. */
	packageManagers: [
		"pnpm",
		"npm",
		"yarn",
		"bun"
	],
	/** A flat docs tree gets a trail that only repeats its own section name. */
	breadcrumb: true,
	landing: {
		badge: "duxt.defaults.landing.badge",
		headline: "duxt.defaults.landing.headline",
		description: "duxt.defaults.landing.description",
		actions: [{
			label: "duxt.defaults.landing.actions.docs",
			to: "/getting-started",
			icon: "lucide:arrow-right"
		}, {
			label: "GitHub",
			to: "https://github.com/kirchDev/duxt",
			variant: "outline",
			external: true
		}],
		features: [
			{
				title: "duxt.defaults.landing.features.extend.title",
				description: "duxt.defaults.landing.features.extend.description",
				icon: "lucide:package"
			},
			{
				title: "duxt.defaults.landing.features.sources.title",
				description: "duxt.defaults.landing.features.sources.description",
				icon: "lucide:git-branch"
			},
			{
				title: "duxt.defaults.landing.features.git.title",
				description: "duxt.defaults.landing.features.git.description",
				icon: "lucide:git-merge"
			},
			{
				title: "duxt.defaults.landing.features.shadcn.title",
				description: "duxt.defaults.landing.features.shadcn.description",
				icon: "lucide:palette"
			},
			{
				title: "duxt.defaults.landing.features.mdc.title",
				description: "duxt.defaults.landing.features.mdc.description",
				icon: "lucide:code"
			},
			{
				title: "duxt.defaults.landing.features.machine.title",
				description: "duxt.defaults.landing.features.machine.description",
				icon: "lucide:bot"
			}
		]
	},
	aside: {
		title: "duxt.defaults.aside.title",
		links: [
			{
				label: "duxt.defaults.aside.star",
				to: "https://github.com/kirchDev/duxt",
				icon: "lucide:star",
				external: true
			},
			{
				label: "duxt.defaults.aside.issue",
				to: "https://github.com/kirchDev/duxt/issues/new/choose",
				icon: "lucide:circle-alert",
				external: true
			},
			{
				label: "duxt.defaults.aside.discord",
				to: "https://discord.kirch.dev/",
				icon: "lucide:message-circle",
				external: true
			},
			{
				label: "duxt.defaults.aside.docs",
				to: "/getting-started",
				icon: "lucide:book-open-text"
			}
		]
	}
};
var isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/** Merge objects key by key; an array on the left replaces the one on the right. */
function mergeDuxtConfig(over, base) {
	if (Array.isArray(over)) return over;
	if (over === void 0) return base;
	if (!isPlainObject(over) || !isPlainObject(base)) return over;
	const result = { ...base };
	for (const [key, value] of Object.entries(over)) result[key] = mergeDuxtConfig(value, base[key]);
	return result;
}
//#endregion
//#region ../app/composables/useDuxtConfig.ts
/**
* The layer's config, with the consumer's app.config merged over it and every
* text field resolved for the current locale.
*
* Two things happen here that a component should never have to know about:
*
*  - Nuxt's own app.config merge APPENDS arrays instead of replacing them, so
*    a consumer overriding `navigation` would get the layer's entries after
*    its own — see `duxt-config.ts`.
*  - a label may be a literal, an i18n key or a per-locale record, and
*    `resolveDuxtTexts` collapses all three to a string — see `duxt-text.ts`.
*
* Resolving here rather than at each call site is the point: `DuxtHeader`,
* `DuxtFooter` and the rest keep writing `{{ section.label }}` and none of them
* imports i18n. `toReactive` keeps the result live, so switching language
* updates the navbar without a full page load.
*/
function useDuxtConfig() {
	const appConfig = useAppConfig();
	const { t, te, locale } = useI18n();
	return toReactive((0, vue_exports.computed)(() => resolveDuxtTexts(mergeDuxtConfig(appConfig.duxt, duxtDefaults), locale.value, (key) => te(key) ? t(key) : void 0)));
}

export { asText as a, useDuxtConfig as u };
//# sourceMappingURL=useDuxtConfig-Cy2__zQL.mjs.map
