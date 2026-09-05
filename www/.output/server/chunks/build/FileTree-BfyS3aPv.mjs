import { v as vue_exports, s as server_renderer_exports, f as components_default, P as Primitive } from '../virtual/entry.mjs';
import { d as useTypeahead, a as useDirection, R as RovingFocusGroup_default, b as useCollection, c as createContext, M as MAP_KEY_TO_FOCUS_INTENT, g as getActiveElement, l as injectRovingFocusGroupContext, u as useId, h as handleAndDispatchCustomEvent, j as findValuesBetween, f as getFocusIntent, w as wrapArray, m as focusFirst } from './RovingFocusGroup-9mfIdZPl.mjs';
import { f as fileIcon } from './file-icons-Cw1-FMWv.mjs';
import { createEventHook, useVModel } from '@vueuse/core';
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

//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useSelectionBehavior.js
function useSelectionBehavior(modelValue, props) {
	const firstValue = (0, vue_exports.ref)();
	const onSelectItem = (val, condition) => {
		if (props.multiple && Array.isArray(modelValue.value)) if (props.selectionBehavior === "replace") {
			modelValue.value = [val];
			firstValue.value = val;
		} else {
			const index = modelValue.value.findIndex((v) => condition(v));
			if (index !== -1) modelValue.value = modelValue.value.filter((_, i) => i !== index);
			else modelValue.value = [...modelValue.value, val];
		}
		else if (props.selectionBehavior === "replace") modelValue.value = { ...val };
		else if (!Array.isArray(modelValue.value) && condition(modelValue.value)) modelValue.value = void 0;
		else modelValue.value = { ...val };
		return modelValue.value;
	};
	function handleMultipleReplace(intent, currentElement, getItems, options) {
		if (!firstValue?.value || !props.multiple || !Array.isArray(modelValue.value)) return;
		const lastValue = getItems().filter((i) => i.ref.dataset.disabled !== "").find((i) => i.ref === currentElement)?.value;
		if (!lastValue) return;
		let value = null;
		switch (intent) {
			case "prev":
			case "next":
				value = findValuesBetween(options, firstValue.value, lastValue);
				break;
			case "first":
				value = findValuesBetween(options, firstValue.value, options?.[0]);
				break;
			case "last": value = findValuesBetween(options, firstValue.value, options.at(-1));
		}
		modelValue.value = value;
	}
	return {
		firstValue,
		onSelectItem,
		handleMultipleReplace
	};
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/RovingFocus/RovingFocusItem.js
var RovingFocusItem_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "RovingFocusItem",
	props: {
		tabStopId: {
			type: String,
			required: false
		},
		focusable: {
			type: Boolean,
			required: false,
			default: true
		},
		active: {
			type: Boolean,
			required: false
		},
		allowShiftKey: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const props = __props;
		const context = injectRovingFocusGroupContext();
		const randomId = useId();
		const id = (0, vue_exports.computed)(() => props.tabStopId || randomId);
		const isCurrentTabStop = (0, vue_exports.computed)(() => context.currentTabStopId.value === id.value);
		const { getItems, CollectionItem } = useCollection();
		(0, vue_exports.watch)(() => props.focusable, (newVal, oldVal) => {
			if (newVal === oldVal) return;
			if (newVal) context.onFocusableItemAdd();
			else context.onFocusableItemRemove();
		});
		function handleKeydown(event) {
			if (event.key === "Tab" && event.shiftKey) {
				context.onItemShiftTab();
				return;
			}
			if (event.target !== event.currentTarget) return;
			const focusIntent = getFocusIntent(event, context.orientation.value, context.dir.value);
			if (focusIntent !== void 0) {
				if (event.metaKey || event.ctrlKey || event.altKey || (props.allowShiftKey ? false : event.shiftKey)) return;
				event.preventDefault();
				let candidateNodes = [...getItems().map((i) => i.ref).filter((i) => i.dataset.disabled !== "")];
				if (focusIntent === "last") candidateNodes.reverse();
				else if (focusIntent === "prev" || focusIntent === "next") {
					if (focusIntent === "prev") candidateNodes.reverse();
					const currentIndex = candidateNodes.indexOf(event.currentTarget);
					candidateNodes = context.loop.value ? wrapArray(candidateNodes, currentIndex + 1) : candidateNodes.slice(currentIndex + 1);
				}
				(0, vue_exports.nextTick)(() => focusFirst(candidateNodes));
			}
		}
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(CollectionItem), null, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(Primitive), {
					tabindex: isCurrentTabStop.value ? 0 : -1,
					"data-orientation": (0, vue_exports.unref)(context).orientation.value,
					"data-active": _ctx.active ? "" : void 0,
					"data-disabled": !_ctx.focusable ? "" : void 0,
					as: _ctx.as,
					"as-child": _ctx.asChild,
					onMousedown: _cache[0] || (_cache[0] = (event) => {
						if (!_ctx.focusable) event.preventDefault();
						else (0, vue_exports.unref)(context).onItemFocus(id.value);
					}),
					onFocus: _cache[1] || (_cache[1] = ($event) => (0, vue_exports.unref)(context).onItemFocus(id.value)),
					onKeydown: handleKeydown
				}, {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"tabindex",
					"data-orientation",
					"data-active",
					"data-disabled",
					"as",
					"as-child"
				])]),
				_: 3
			});
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Tree/utils.js
function flatten(items) {
	return items.reduce((acc, item) => {
		acc.push(item);
		if (item.children) acc.push(...flatten(item.children));
		return acc;
	}, []);
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Tree/TreeRoot.js
var [injectTreeRootContext, provideTreeRootContext] = /*#__PURE__*/ createContext("TreeRoot");
var TreeRoot_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "TreeRoot",
	props: {
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		},
		items: {
			type: Array,
			required: false
		},
		expanded: {
			type: Array,
			required: false
		},
		defaultExpanded: {
			type: Array,
			required: false
		},
		getKey: {
			type: Function,
			required: true
		},
		getChildren: {
			type: Function,
			required: false,
			default: (val) => val.children
		},
		selectionBehavior: {
			type: String,
			required: false,
			default: "toggle"
		},
		multiple: {
			type: Boolean,
			required: false,
			skipCheck: true
		},
		dir: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		propagateSelect: {
			type: Boolean,
			required: false
		},
		bubbleSelect: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "ul"
		}
	},
	emits: ["update:modelValue", "update:expanded"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { items, multiple, disabled, propagateSelect, dir: propDir, bubbleSelect } = (0, vue_exports.toRefs)(props);
		const { handleTypeaheadSearch } = useTypeahead();
		const dir = useDirection(propDir);
		const rovingFocusGroupRef = (0, vue_exports.ref)();
		const isVirtual = (0, vue_exports.ref)(false);
		const virtualKeydownHook = createEventHook();
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? (multiple.value ? [] : void 0),
			passive: true,
			deep: true
		});
		const expanded = useVModel(props, "expanded", emits, {
			defaultValue: props.defaultExpanded ?? [],
			passive: props.expanded === void 0,
			deep: true
		});
		const { onSelectItem, handleMultipleReplace } = useSelectionBehavior(modelValue, props);
		const selectedKeys = (0, vue_exports.computed)(() => {
			if (multiple.value && Array.isArray(modelValue.value)) return modelValue.value.map((i) => props.getKey(i));
			else return [props.getKey(modelValue.value ?? {})];
		});
		function flattenItems(items$1, level = 1, parentItem) {
			return items$1.reduce((acc, item, index) => {
				const key = props.getKey(item);
				const children = props.getChildren(item);
				const isExpanded = expanded.value.includes(key);
				const flattenedItem = {
					_id: key,
					value: item,
					index,
					level,
					parentItem,
					hasChildren: !!children,
					bind: {
						"value": item,
						level,
						"aria-setsize": items$1.length,
						"aria-posinset": index + 1
					}
				};
				acc.push(flattenedItem);
				if (children && isExpanded) acc.push(...flattenItems(children, level + 1, item));
				return acc;
			}, []);
		}
		const expandedItems = (0, vue_exports.computed)(() => {
			const items$1 = props.items;
			expanded.value.map((i) => i);
			return flattenItems(items$1 ?? []);
		});
		function handleKeydown(event) {
			if (isVirtual.value) virtualKeydownHook.trigger(event);
			else {
				const collections = rovingFocusGroupRef.value?.getItems() ?? [];
				handleTypeaheadSearch(event.key, collections);
			}
		}
		function handleKeydownNavigation(event) {
			if (isVirtual.value) return;
			const intent = MAP_KEY_TO_FOCUS_INTENT[event.key];
			(0, vue_exports.nextTick)(() => {
				handleMultipleReplace(intent, getActiveElement(), rovingFocusGroupRef.value?.getItems, expandedItems.value.map((i) => i.value));
			});
		}
		function handleBubbleSelect(item) {
			if (item.parentItem != null && Array.isArray(modelValue.value) && props.multiple) {
				const parentItem = expandedItems.value.find((i) => {
					return item.parentItem != null && props.getKey(i.value) === props.getKey(item.parentItem);
				});
				if (parentItem != null) {
					if (props.getChildren(parentItem.value)?.every((i) => modelValue.value.find((v) => props.getKey(v) === props.getKey(i)))) modelValue.value = [...modelValue.value, parentItem.value];
					else modelValue.value = modelValue.value.filter((v) => props.getKey(v) !== props.getKey(parentItem.value));
					handleBubbleSelect(parentItem);
				}
			}
		}
		provideTreeRootContext({
			modelValue,
			selectedKeys,
			onSelect: (val) => {
				const condition = (baseValue) => props.getKey(baseValue ?? {}) === props.getKey(val);
				const exist = props.multiple && Array.isArray(modelValue.value) ? modelValue.value?.findIndex(condition) !== -1 : void 0;
				onSelectItem(val, condition);
				if (props.bubbleSelect && props.multiple && Array.isArray(modelValue.value)) {
					const item = expandedItems.value.find((i) => {
						return props.getKey(i.value) === props.getKey(val);
					});
					if (item != null) handleBubbleSelect(item);
				}
				if (props.propagateSelect && props.multiple && Array.isArray(modelValue.value)) {
					const children = flatten(props.getChildren(val) ?? []);
					if (exist) modelValue.value = [...modelValue.value].filter((i) => !children.some((child) => props.getKey(i ?? {}) === props.getKey(child)));
					else modelValue.value = [...modelValue.value, ...children];
				}
			},
			expanded,
			onToggle(val) {
				if (!(val ? props.getChildren(val) : void 0)) return;
				const key = props.getKey(val) ?? val;
				if (expanded.value.includes(key)) expanded.value = expanded.value.filter((val$1) => val$1 !== key);
				else expanded.value = [...expanded.value, key];
			},
			getKey: props.getKey,
			getChildren: props.getChildren,
			items,
			expandedItems,
			disabled,
			multiple,
			dir,
			propagateSelect,
			bubbleSelect,
			isVirtual,
			virtualKeydownHook,
			handleMultipleReplace
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(RovingFocusGroup_default), {
				ref_key: "rovingFocusGroupRef",
				ref: rovingFocusGroupRef,
				"as-child": "",
				orientation: "vertical",
				dir: (0, vue_exports.unref)(dir)
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(Primitive), {
					role: "tree",
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"aria-multiselectable": (0, vue_exports.unref)(multiple) ? true : void 0,
					onKeydown: [handleKeydown, (0, vue_exports.withKeys)((0, vue_exports.withModifiers)(handleKeydownNavigation, ["shift"]), ["up", "down"])]
				}, {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default", {
						flattenItems: expandedItems.value,
						modelValue: (0, vue_exports.unref)(modelValue),
						expanded: (0, vue_exports.unref)(expanded)
					})]),
					_: 3
				}, 8, [
					"as",
					"as-child",
					"aria-multiselectable",
					"onKeydown"
				])]),
				_: 3
			}, 8, ["dir"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Tree/TreeItem.js
var TREE_SELECT = "tree.select";
var TREE_TOGGLE = "tree.toggle";
var TreeItem_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "TreeItem",
	props: {
		value: {
			type: null,
			required: true
		},
		level: {
			type: Number,
			required: true
		},
		disabled: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "li"
		}
	},
	emits: ["select", "toggle"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = injectTreeRootContext();
		const { getItems } = useCollection();
		const hasChildren = (0, vue_exports.computed)(() => !!rootContext.getChildren(props.value));
		const isExpanded = (0, vue_exports.computed)(() => {
			const key = rootContext.getKey(props.value);
			return rootContext.expanded.value.includes(key);
		});
		const isSelected = (0, vue_exports.computed)(() => {
			const key = rootContext.getKey(props.value);
			return rootContext.selectedKeys.value.includes(key);
		});
		const isIndeterminate = (0, vue_exports.computed)(() => {
			if (rootContext.bubbleSelect.value && hasChildren.value && Array.isArray(rootContext.modelValue.value)) {
				const children = flatten(rootContext.getChildren(props.value) || []);
				return children.some((child) => rootContext.modelValue.value.find((v) => rootContext.getKey(v) === rootContext.getKey(child))) && !children.every((child) => rootContext.modelValue.value.find((v) => rootContext.getKey(v) === rootContext.getKey(child)));
			} else if (rootContext.propagateSelect.value && isSelected.value && hasChildren.value && Array.isArray(rootContext.modelValue.value)) return !flatten(rootContext.getChildren(props.value) || []).every((child) => rootContext.modelValue.value.find((v) => rootContext.getKey(v) === rootContext.getKey(child)));
			else return void 0;
		});
		const isDisabled = (0, vue_exports.computed)(() => rootContext.disabled.value || props.disabled);
		function handleKeydownRight(ev) {
			if (isDisabled.value) return;
			if (!hasChildren.value) return;
			if (isExpanded.value) {
				const collection = getItems().map((i) => i.ref);
				const currentElement = getActiveElement();
				const currentIndex = collection.indexOf(currentElement);
				const nextElement = [...collection].slice(currentIndex).find((el) => Number(el.getAttribute("data-indent")) === props.level + 1);
				if (nextElement) nextElement.focus();
			} else handleToggleCustomEvent(ev);
		}
		function handleKeydownLeft(ev) {
			if (isDisabled.value) return;
			if (isExpanded.value) handleToggleCustomEvent(ev);
			else {
				const collection = getItems().map((i) => i.ref);
				const currentElement = getActiveElement();
				const currentIndex = collection.indexOf(currentElement);
				const parentElement = [...collection].slice(0, currentIndex).reverse().find((el) => Number(el.getAttribute("data-indent")) === props.level - 1);
				if (parentElement) parentElement.focus();
			}
		}
		async function handleSelect(ev) {
			if (isDisabled.value) return;
			emits("select", ev);
			if (ev?.defaultPrevented) return;
			rootContext.onSelect(props.value);
		}
		async function handleToggle(ev) {
			if (isDisabled.value) return;
			emits("toggle", ev);
			if (ev?.defaultPrevented) return;
			rootContext.onToggle(props.value);
		}
		async function handleSelectCustomEvent(ev) {
			if (!ev) return;
			const eventDetail = {
				originalEvent: ev,
				value: props.value,
				isExpanded: isExpanded.value,
				isSelected: isSelected.value
			};
			handleAndDispatchCustomEvent(TREE_SELECT, handleSelect, eventDetail);
		}
		async function handleToggleCustomEvent(ev) {
			if (!ev) return;
			const eventDetail = {
				originalEvent: ev,
				value: props.value,
				isExpanded: isExpanded.value,
				isSelected: isSelected.value
			};
			handleAndDispatchCustomEvent(TREE_TOGGLE, handleToggle, eventDetail);
		}
		__expose({
			isExpanded,
			isSelected,
			isIndeterminate,
			isDisabled,
			handleToggle: () => rootContext.onToggle(props.value),
			handleSelect: () => rootContext.onSelect(props.value)
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(RovingFocusItem_default), {
				"as-child": "",
				value: _ctx.value,
				"allow-shift-key": "",
				focusable: !isDisabled.value
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)(_ctx.$attrs, {
					role: "treeitem",
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"aria-selected": isSelected.value,
					"aria-expanded": hasChildren.value ? isExpanded.value : void 0,
					"aria-level": _ctx.level,
					"aria-disabled": isDisabled.value ? true : void 0,
					"data-indent": _ctx.level,
					"data-selected": isSelected.value ? "" : void 0,
					"data-expanded": isExpanded.value ? "" : void 0,
					"data-disabled": isDisabled.value ? "" : void 0,
					onKeydown: [
						(0, vue_exports.withKeys)((0, vue_exports.withModifiers)(handleSelectCustomEvent, ["self", "prevent"]), ["enter", "space"]),
						_cache[0] || (_cache[0] = (0, vue_exports.withKeys)((0, vue_exports.withModifiers)((ev) => (0, vue_exports.unref)(rootContext).dir.value === "ltr" ? handleKeydownRight(ev) : handleKeydownLeft(ev), ["prevent"]), ["right"])),
						_cache[1] || (_cache[1] = (0, vue_exports.withKeys)((0, vue_exports.withModifiers)((ev) => (0, vue_exports.unref)(rootContext).dir.value === "ltr" ? handleKeydownLeft(ev) : handleKeydownRight(ev), ["prevent"]), ["left"]))
					],
					onClick: _cache[2] || (_cache[2] = (0, vue_exports.withModifiers)((ev) => {
						handleSelectCustomEvent(ev);
						handleToggleCustomEvent(ev);
					}, ["stop"]))
				}), {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default", {
						isExpanded: isExpanded.value,
						isSelected: isSelected.value,
						isIndeterminate: isIndeterminate.value,
						isDisabled: isDisabled.value,
						handleSelect: () => (0, vue_exports.unref)(rootContext).onSelect(_ctx.value),
						handleToggle: () => (0, vue_exports.unref)(rootContext).onToggle(_ctx.value)
					})]),
					_: 3
				}, 16, [
					"as",
					"as-child",
					"aria-selected",
					"aria-expanded",
					"aria-level",
					"aria-disabled",
					"data-indent",
					"data-selected",
					"data-expanded",
					"data-disabled",
					"onKeydown"
				])]),
				_: 3
			}, 8, ["value", "focusable"]);
		};
	}
});
//#endregion
//#region ../app/components/content/FileTree.vue?vue&type=script&setup=true&lang.ts
var FileTree_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "FileTree",
	__ssrInlineRender: true,
	props: {
		tree: {},
		title: {}
	},
	setup(__props) {
		const props = __props;
		const items = (0, vue_exports.computed)(() => props.tree ?? []);
		const isDirectory = (entry) => Boolean(entry.children?.length) || entry.name.endsWith("/");
		const label = (entry) => entry.name.replace(/\/$/, "");
		/** Unique per node: names repeat across branches, paths do not. */
		function key(entry) {
			return entry.name;
		}
		/** Everything open on first render — a docs tree is there to be read, not explored. */
		const expanded = (0, vue_exports.computed)(() => {
			const keys = [];
			const walk = (entries) => {
				for (const entry of entries) if (entry.children?.length) {
					keys.push(key(entry));
					walk(entry.children);
				}
			};
			walk(items.value);
			return keys;
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Icon = components_default;
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({ class: "not-typeset my-6 overflow-hidden rounded-lg border bg-card" }, _attrs))}>`);
			if (__props.title) {
				_push(`<div class="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">`);
				_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
					name: "lucide:folder-tree",
					class: "size-4"
				}, null, _parent));
				_push(`<span class="font-mono">${(0, server_renderer_exports.ssrInterpolate)(__props.title)}</span></div>`);
			} else _push(`<!---->`);
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(TreeRoot_default), {
				items: (0, vue_exports.unref)(items),
				"get-key": key,
				"get-children": (entry) => entry.children,
				"default-expanded": (0, vue_exports.unref)(expanded),
				class: "overflow-x-auto p-3 font-mono text-[13px] leading-6 select-none"
			}, {
				default: (0, vue_exports.withCtx)(({ flattenItems }, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<!--[-->`);
						(0, server_renderer_exports.ssrRenderList)(flattenItems, (item) => {
							_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(TreeItem_default), (0, vue_exports.mergeProps)({ key: item._id }, { ref_for: true }, item.bind, {
								style: { paddingLeft: `${item.level - 1}rem` },
								class: "flex items-center gap-1.5 rounded px-1 py-[3px] outline-none focus:bg-accent data-[selected]:bg-accent/60"
							}), {
								default: (0, vue_exports.withCtx)(({ isExpanded }, _push, _parent, _scopeId) => {
									if (_push) {
										if (isDirectory(item.value)) {
											_push(`<!--[-->`);
											_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
												name: "lucide:chevron-right",
												class: ["size-3 shrink-0 text-muted-foreground transition-transform", { "rotate-90": isExpanded }]
											}, null, _parent, _scopeId));
											_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
												name: isExpanded ? "lucide:folder-open" : "lucide:folder",
												class: "size-4 shrink-0 text-muted-foreground/70"
											}, null, _parent, _scopeId));
											_push(`<span class="text-foreground"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(label(item.value))}</span><!--]-->`);
										} else {
											_push(`<!--[--><span class="w-3 shrink-0"${_scopeId}></span>`);
											_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
												name: ("fileIcon" in _ctx ? _ctx.fileIcon : (0, vue_exports.unref)(fileIcon))(item.value.name),
												class: "size-4 shrink-0"
											}, null, _parent, _scopeId));
											_push(`<span class="text-muted-foreground"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(label(item.value))}</span><!--]-->`);
										}
									} else return [isDirectory(item.value) ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(vue_exports.Fragment, { key: 0 }, [
										(0, vue_exports.createVNode)(_component_Icon, {
											name: "lucide:chevron-right",
											class: ["size-3 shrink-0 text-muted-foreground transition-transform", { "rotate-90": isExpanded }]
										}, null, 8, ["class"]),
										(0, vue_exports.createVNode)(_component_Icon, {
											name: isExpanded ? "lucide:folder-open" : "lucide:folder",
											class: "size-4 shrink-0 text-muted-foreground/70"
										}, null, 8, ["name"]),
										(0, vue_exports.createVNode)("span", { class: "text-foreground" }, (0, vue_exports.toDisplayString)(label(item.value)), 1)
									], 64)) : ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(vue_exports.Fragment, { key: 1 }, [
										(0, vue_exports.createVNode)("span", { class: "w-3 shrink-0" }),
										(0, vue_exports.createVNode)(_component_Icon, {
											name: ("fileIcon" in _ctx ? _ctx.fileIcon : (0, vue_exports.unref)(fileIcon))(item.value.name),
											class: "size-4 shrink-0"
										}, null, 8, ["name"]),
										(0, vue_exports.createVNode)("span", { class: "text-muted-foreground" }, (0, vue_exports.toDisplayString)(label(item.value)), 1)
									], 64))];
								}),
								_: 2
							}, _parent, _scopeId));
						});
						_push(`<!--]-->`);
					} else return [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(flattenItems, (item) => {
						return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(TreeItem_default), (0, vue_exports.mergeProps)({ key: item._id }, { ref_for: true }, item.bind, {
							style: { paddingLeft: `${item.level - 1}rem` },
							class: "flex items-center gap-1.5 rounded px-1 py-[3px] outline-none focus:bg-accent data-[selected]:bg-accent/60"
						}), {
							default: (0, vue_exports.withCtx)(({ isExpanded }) => [isDirectory(item.value) ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(vue_exports.Fragment, { key: 0 }, [
								(0, vue_exports.createVNode)(_component_Icon, {
									name: "lucide:chevron-right",
									class: ["size-3 shrink-0 text-muted-foreground transition-transform", { "rotate-90": isExpanded }]
								}, null, 8, ["class"]),
								(0, vue_exports.createVNode)(_component_Icon, {
									name: isExpanded ? "lucide:folder-open" : "lucide:folder",
									class: "size-4 shrink-0 text-muted-foreground/70"
								}, null, 8, ["name"]),
								(0, vue_exports.createVNode)("span", { class: "text-foreground" }, (0, vue_exports.toDisplayString)(label(item.value)), 1)
							], 64)) : ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(vue_exports.Fragment, { key: 1 }, [
								(0, vue_exports.createVNode)("span", { class: "w-3 shrink-0" }),
								(0, vue_exports.createVNode)(_component_Icon, {
									name: ("fileIcon" in _ctx ? _ctx.fileIcon : (0, vue_exports.unref)(fileIcon))(item.value.name),
									class: "size-4 shrink-0"
								}, null, 8, ["name"]),
								(0, vue_exports.createVNode)("span", { class: "text-muted-foreground" }, (0, vue_exports.toDisplayString)(label(item.value)), 1)
							], 64))]),
							_: 2
						}, 1040, ["style"]);
					}), 128))];
				}),
				_: 1
			}, _parent));
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/components/content/FileTree.vue
var _sfc_setup = FileTree_vue_vue_type_script_setup_true_lang_default.setup;
FileTree_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/content/FileTree.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var FileTree_default = Object.assign(FileTree_vue_vue_type_script_setup_true_lang_default, { __name: "FileTree" });

export { FileTree_default as default };
//# sourceMappingURL=FileTree-BfyS3aPv.mjs.map
