//#region ../app/utils/file-icons.ts
/**
* Icon for a filename or a language id.
*
* The vscode-icons collection is the one that actually has an icon per
* ecosystem; lucide covers the fallbacks. Used by both the code block header
* and the file tree, so a `.ts` file looks the same in either.
*/
var byExtension = {
	bash: "vscode-icons:file-type-shell",
	css: "vscode-icons:file-type-css",
	env: "vscode-icons:file-type-dotenv",
	go: "vscode-icons:file-type-go",
	html: "vscode-icons:file-type-html",
	jpg: "vscode-icons:file-type-image",
	js: "vscode-icons:file-type-js",
	json: "vscode-icons:file-type-json",
	jsonc: "vscode-icons:file-type-json",
	md: "vscode-icons:file-type-markdown",
	mdc: "vscode-icons:file-type-markdown",
	mjs: "vscode-icons:file-type-js",
	php: "vscode-icons:file-type-php",
	png: "vscode-icons:file-type-image",
	rs: "vscode-icons:file-type-rust",
	sh: "vscode-icons:file-type-shell",
	svg: "vscode-icons:file-type-svg",
	ts: "vscode-icons:file-type-typescript",
	toml: "vscode-icons:file-type-toml",
	vue: "vscode-icons:file-type-vue",
	yaml: "vscode-icons:file-type-yaml",
	yml: "vscode-icons:file-type-yaml"
};
/** Whole filenames worth their own icon, checked before the extension. */
var byName = {
	"package.json": "vscode-icons:file-type-npm",
	"pnpm-lock.yaml": "vscode-icons:file-type-pnpm",
	"pnpm-workspace.yaml": "vscode-icons:file-type-pnpm",
	"nuxt.config.ts": "vscode-icons:file-type-nuxt",
	"content.config.ts": "vscode-icons:file-type-nuxt",
	"app.config.ts": "vscode-icons:file-type-nuxt",
	"tsconfig.json": "vscode-icons:file-type-tsconfig",
	dockerfile: "vscode-icons:file-type-docker",
	".gitignore": "vscode-icons:file-type-git"
};
function fileIcon(input, fallback = "lucide:file") {
	if (!input) return fallback;
	const name = input.split("/").pop()?.toLowerCase() ?? "";
	if (byName[name]) return byName[name];
	return byExtension[name.includes(".") ? name.split(".").pop() : name] ?? fallback;
}

export { fileIcon as f };
//# sourceMappingURL=file-icons-Cw1-FMWv.mjs.map
