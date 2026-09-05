//#region ../i18n/i18n.config.ts
/**
* vue-i18n's own options, the half `nuxt.config.ts` does not cover.
*
* `fallbackLocale` is the one gildstone does not have and duxt cannot do
* without. gildstone sets a fallback under `detectBrowserLanguage`, but that
* answers a different question — which locale a VISITOR gets when their browser
* asks for one the site has not got. This one answers which locale supplies a
* MISSING KEY, and for a published layer that is the everyday case: a consumer
* activates a language duxt ships no strings for, and without this the
* interface renders `duxt.search.placeholder` into the search box instead of
* a word.
*/
var i18n_config_default = () => ({
	legacy: false,
	fallbackLocale: "en-GB"
});

export { i18n_config_default as default };
//# sourceMappingURL=i18n.config-BZiWaRAp.mjs.map
