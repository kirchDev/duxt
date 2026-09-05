import { v as vue_exports, P as Primitive, S as Slot } from '../virtual/entry.mjs';
import { K as isEqual } from '../nitro/nitro.mjs';
import { useVModel, unrefElement } from '@vueuse/core';

//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/arrays.js
/**
* The function `findValuesBetween` takes an array and two values, then returns a subarray containing
* elements between the first occurrence of the start value and the first occurrence of the end value
* in the array.
* @param {T[]} array - The `array` parameter is an array of values of type `T`.
* @param {T} start - The `start` parameter is the value that marks the beginning of the range you want
* to find in the array.
* @param {T} end - The `end` parameter in the `findValuesBetween` function represents the end value
* that you want to find in the array. This function will return a subarray of values that are between
* the `start` and `end` values in the original array.
* @returns The `findValuesBetween` function returns an array of values from the input array that are
* between the `start` and `end` values (inclusive). If either the `start` or `end` values are not
* found in the input array, an empty array is returned.
*/
function findValuesBetween(array, start, end) {
	const startIndex = array.findIndex((i) => isEqual(i, start));
	const endIndex = array.findIndex((i) => isEqual(i, end));
	if (startIndex === -1 || endIndex === -1) return [];
	const [minIndex, maxIndex] = [startIndex, endIndex].sort((a, b) => a - b);
	return array.slice(minIndex, maxIndex + 1);
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/createContext.js
/**
* @param providerComponentName - The name(s) of the component(s) providing the context.
*
* There are situations where context can come from multiple components. In such cases, you might need to give an array of component names to provide your context, instead of just a single string.
*
* @param contextName The description for injection key symbol.
*/
function createContext(providerComponentName, contextName) {
	const symbolDescription = typeof providerComponentName === "string" && !contextName ? `${providerComponentName}Context` : contextName;
	const injectionKey = Symbol(symbolDescription);
	/**
	* @param fallback The context value to return if the injection fails.
	*
	* @throws When context injection failed and no fallback is specified.
	* This happens when the component injecting the context is not a child of the root component providing the context.
	*/
	const injectContext = (fallback) => {
		const context = (0, vue_exports.inject)(injectionKey, fallback);
		if (context) return context;
		if (context === null) return context;
		throw new Error(`Injection \`${injectionKey.toString()}\` not found. Component must be used within ${Array.isArray(providerComponentName) ? `one of the following components: ${providerComponentName.join(", ")}` : `\`${providerComponentName}\``}`);
	};
	const provideContext = (contextValue) => {
		(0, vue_exports.provide)(injectionKey, contextValue);
		return contextValue;
	};
	return [injectContext, provideContext];
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/getActiveElement.js
function getActiveElement() {
	let activeElement = (void 0).activeElement;
	if (activeElement == null) return null;
	while (activeElement != null && activeElement.shadowRoot != null && activeElement.shadowRoot.activeElement != null) activeElement = activeElement.shadowRoot.activeElement;
	return activeElement;
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/handleAndDispatchCustomEvent.js
function handleAndDispatchCustomEvent(name, handler, detail) {
	const target = detail.originalEvent.target;
	const event = new CustomEvent(name, {
		bubbles: false,
		cancelable: true,
		detail
	});
	if (handler) target.addEventListener(name, handler, { once: true });
	target.dispatchEvent(event);
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/ConfigProvider/ConfigProvider.js
var [injectConfigProviderContext] = /*#__PURE__*/ createContext("ConfigProvider");
//#endregion
//#region ../node_modules/.pnpm/@vueuse+shared@14.4.0_vue@3.5.42_typescript@6.0.3_/node_modules/@vueuse/shared/dist/index.js
/**
* Call onScopeDispose() if it's inside an effect scope lifecycle, if not, do nothing
*
* @param fn
*/
function tryOnScopeDispose(fn, failSilently) {
	if ((0, vue_exports.getCurrentScope)()) {
		(0, vue_exports.onScopeDispose)(fn, failSilently);
		return true;
	}
	return false;
}
typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope;
function getLifeCycleTarget(target) {
	return (0, vue_exports.getCurrentInstance)();
}
/**
* Converts ref to reactive.
*
* @see https://vueuse.org/toReactive
* @param objectRef A ref of object
*/
function toReactive$1(objectRef) {
	if (!(0, vue_exports.isRef)(objectRef)) return (0, vue_exports.reactive)(objectRef);
	return (0, vue_exports.reactive)(new Proxy({}, {
		get(_, p, receiver) {
			return (0, vue_exports.unref)(Reflect.get(objectRef.value, p, receiver));
		},
		set(_, p, value) {
			if ((0, vue_exports.isRef)(objectRef.value[p]) && !(0, vue_exports.isRef)(value)) objectRef.value[p].value = value;
			else objectRef.value[p] = value;
			return true;
		},
		deleteProperty(_, p) {
			return Reflect.deleteProperty(objectRef.value, p);
		},
		has(_, p) {
			return Reflect.has(objectRef.value, p);
		},
		ownKeys() {
			return Object.keys(objectRef.value);
		},
		getOwnPropertyDescriptor() {
			return {
				enumerable: true,
				configurable: true
			};
		}
	}));
}
/**
* Computed reactive object.
*/
function reactiveComputed(fn) {
	return toReactive$1((0, vue_exports.computed)(fn));
}
/**
* Reactively omit fields from a reactive object
*
* @see https://vueuse.org/reactiveOmit
*/
function reactiveOmit$1(obj, ...keys) {
	const flatKeys = keys.flat();
	const predicate = flatKeys[0];
	return reactiveComputed(() => typeof predicate === "function" ? Object.fromEntries(Object.entries((0, vue_exports.toRefs)(obj)).filter(([k, v]) => !predicate((0, vue_exports.toValue)(v), k))) : Object.fromEntries(Object.entries((0, vue_exports.toRefs)(obj)).filter((e) => !flatKeys.includes(e[0]))));
}
/**
* Create a ref which will be reset to the default value after some time.
*
* @see https://vueuse.org/refAutoReset
* @param defaultValue The value which will be set.
* @param afterMs      A zero-or-greater delay in milliseconds.
*/
function refAutoReset(defaultValue, afterMs = 1e4) {
	return (0, vue_exports.customRef)((track, trigger) => {
		let value = (0, vue_exports.toValue)(defaultValue);
		let timer;
		const resetAfter = () => setTimeout(() => {
			value = (0, vue_exports.toValue)(defaultValue);
			trigger();
		}, (0, vue_exports.toValue)(afterMs));
		tryOnScopeDispose(() => {
			clearTimeout(timer);
		});
		return {
			get() {
				track();
				return value;
			},
			set(newValue) {
				value = newValue;
				trigger();
				clearTimeout(timer);
				timer = resetAfter();
			}
		};
	});
}
/**
* Call onBeforeUnmount() if it's inside a component lifecycle, if not, do nothing
*
* @param fn
* @param target
*/
function tryOnBeforeUnmount(fn, target) {
	if (getLifeCycleTarget());
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useDirection.js
/**
* The `useDirection` function provides a way to access the current direction in your application.
* @param {Ref<Direction | undefined>} [dir] - An optional ref containing the direction (ltr or rtl).
* @returns  computed value that combines with the resolved direction.
*/
function useDirection(dir) {
	const context = injectConfigProviderContext({ dir: (0, vue_exports.ref)("ltr") });
	return (0, vue_exports.computed)(() => dir?.value || context.dir?.value || "ltr");
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useId.js
var count = 0;
/**
* The `useId` function generates a unique identifier using a provided deterministic ID,
* a configured `<ConfigProvider>` ID source, Vue's native `useId`, or a fallback counter.
* @param {string | null | undefined} [deterministicId] - The `useId` function you provided takes an
* optional parameter `deterministicId`, which can be a string, null, or undefined. If
* `deterministicId` is provided, the function will return it. Otherwise, it will generate an id using
* the configured ID source.
*/
function useId(deterministicId, prefix = "reka") {
	let id;
	const configProviderContext = injectConfigProviderContext({ useId: void 0 });
	if (configProviderContext.useId) id = configProviderContext.useId();
	else if ("useId" in vue_exports) id = vue_exports.useId?.();
	else id = `${++count}`;
	return prefix ? `${prefix}-${id}` : id;
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useTypeahead.js
function useTypeahead(callback) {
	const search = refAutoReset("", 1e3);
	const handleTypeaheadSearch = (key, items) => {
		search.value = search.value + key;
		{
			const currentItem = getActiveElement();
			const itemsWithTextValue = items.map((item) => ({
				...item,
				textValue: item.value?.textValue ?? item.ref.textContent?.trim() ?? ""
			}));
			const currentMatch = itemsWithTextValue.find((item) => item.ref === currentItem);
			const nextMatch = getNextMatch(itemsWithTextValue.map((item) => item.textValue), search.value, currentMatch?.textValue);
			const newItem = itemsWithTextValue.find((item) => item.textValue === nextMatch);
			if (newItem) newItem.ref.focus();
			return newItem?.ref;
		}
	};
	const resetTypeahead = () => {
		search.value = "";
	};
	return {
		search,
		handleTypeaheadSearch,
		resetTypeahead
	};
}
/**
* Wraps an array around itself at a given start index
* Example: `wrapArray(['a', 'b', 'c', 'd'], 2) === ['c', 'd', 'a', 'b']`
*/
function wrapArray$1(array, startIndex) {
	return array.map((_, index) => array[(startIndex + index) % array.length]);
}
/**
* This is the "meat" of the typeahead matching logic. It takes in all the values,
* the search and the current match, and returns the next match (or `undefined`).
*
* We normalize the search because if a user has repeatedly pressed a character,
* we want the exact same behavior as if we only had that one character
* (ie. cycle through options starting with that character)
*
* We also reorder the values by wrapping the array around the current match.
* This is so we always look forward from the current match, and picking the first
* match will always be the correct one.
*
* Finally, if the normalized search is exactly one character, we exclude the
* current match from the values because otherwise it would be the first to match always
* and focus would never move. This is as opposed to the regular case, where we
* don't want focus to move if the current match still matches.
*/
function getNextMatch(values, search, currentMatch) {
	const normalizedSearch = search.length > 1 && Array.from(search).every((char) => char === search[0]) ? search[0] : search;
	const currentMatchIndex = currentMatch ? values.indexOf(currentMatch) : -1;
	let wrappedValues = wrapArray$1(values, Math.max(currentMatchIndex, 0));
	if (normalizedSearch.length === 1) wrappedValues = wrappedValues.filter((v) => v !== currentMatch);
	const nextMatch = wrappedValues.find((value) => value.toLowerCase().startsWith(normalizedSearch.toLowerCase()));
	return nextMatch !== currentMatch ? nextMatch : void 0;
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Primitive/usePrimitiveElement.js
function usePrimitiveElement() {
	const primitiveElement = (0, vue_exports.ref)();
	return {
		primitiveElement,
		currentElement: (0, vue_exports.computed)(() => ["#text", "#comment"].includes(primitiveElement.value?.$el.nodeName) ? primitiveElement.value?.$el.nextElementSibling : unrefElement(primitiveElement))
	};
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Collection/Collection.js
var ITEM_DATA_ATTR = "data-reka-collection-item";
function useCollection(options = {}) {
	const { key = "", isProvider = false } = options;
	const injectionKey = `${key}CollectionProvider`;
	let context;
	if (isProvider) {
		const itemMap = (0, vue_exports.ref)(/* @__PURE__ */ new Map());
		context = {
			collectionRef: (0, vue_exports.ref)(),
			itemMap
		};
		(0, vue_exports.provide)(injectionKey, context);
	} else context = (0, vue_exports.inject)(injectionKey);
	const getItems = (includeDisabledItem = false) => {
		const collectionNode = context.collectionRef.value;
		if (!collectionNode) return [];
		const orderedNodes = Array.from(collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`));
		const orderMap = new Map(orderedNodes.map((node, index) => [node, index]));
		const orderedItems = Array.from(context.itemMap.value.values()).sort((a, b) => (orderMap.get(a.ref) ?? -1) - (orderMap.get(b.ref) ?? -1));
		if (includeDisabledItem) return orderedItems;
		else return orderedItems.filter((i) => i.ref.dataset.disabled !== "");
	};
	const CollectionSlot = /*#__PURE__*/ (0, vue_exports.defineComponent)({
		name: "CollectionSlot",
		inheritAttrs: false,
		setup(_, { slots, attrs }) {
			const { primitiveElement, currentElement } = usePrimitiveElement();
			(0, vue_exports.watch)(currentElement, () => {
				context.collectionRef.value = currentElement.value;
			});
			return () => (0, vue_exports.h)(Slot, {
				ref: primitiveElement,
				...attrs
			}, slots);
		}
	});
	const CollectionItem = /*#__PURE__*/ (0, vue_exports.defineComponent)({
		name: "CollectionItem",
		inheritAttrs: false,
		props: { value: { validator: () => true } },
		setup(props, { slots, attrs }) {
			const { primitiveElement, currentElement } = usePrimitiveElement();
			(0, vue_exports.watchEffect)((cleanupFn) => {
				if (currentElement.value) {
					const key$1 = (0, vue_exports.markRaw)(currentElement.value);
					context.itemMap.value.set(key$1, {
						ref: currentElement.value,
						value: props.value
					});
					cleanupFn(() => context.itemMap.value.delete(key$1));
				}
			});
			return () => (0, vue_exports.h)(Slot, {
				...attrs,
				[ITEM_DATA_ATTR]: "",
				ref: primitiveElement
			}, slots);
		}
	});
	return {
		getItems,
		reactiveItems: (0, vue_exports.computed)(() => Array.from(context.itemMap.value.values())),
		itemMapSize: (0, vue_exports.computed)(() => context.itemMap.value.size),
		CollectionSlot,
		CollectionItem
	};
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/RovingFocus/utils.js
var ENTRY_FOCUS = "rovingFocusGroup.onEntryFocus";
var EVENT_OPTIONS = {
	bubbles: false,
	cancelable: true
};
var MAP_KEY_TO_FOCUS_INTENT = {
	ArrowLeft: "prev",
	ArrowUp: "prev",
	ArrowRight: "next",
	ArrowDown: "next",
	PageUp: "first",
	Home: "first",
	PageDown: "last",
	End: "last"
};
function getDirectionAwareKey(key, dir) {
	if (dir !== "rtl") return key;
	return key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key;
}
function getFocusIntent(event, orientation, dir) {
	const key = getDirectionAwareKey(event.key, dir);
	if (orientation === "vertical" && ["ArrowLeft", "ArrowRight"].includes(key)) return void 0;
	if (orientation === "horizontal" && ["ArrowUp", "ArrowDown"].includes(key)) return void 0;
	return MAP_KEY_TO_FOCUS_INTENT[key];
}
function focusFirst(candidates, preventScroll = false) {
	const PREVIOUSLY_FOCUSED_ELEMENT = getActiveElement();
	for (const candidate of candidates) {
		if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
		candidate.focus({ preventScroll });
		if (getActiveElement() !== PREVIOUSLY_FOCUSED_ELEMENT) return;
	}
}
/**
* Wraps an array around itself at a given start index
* Example: `wrapArray(['a', 'b', 'c', 'd'], 2) === ['c', 'd', 'a', 'b']`
*/
function wrapArray(array, startIndex) {
	return array.map((_, index) => array[(startIndex + index) % array.length]);
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/RovingFocus/RovingFocusGroup.js
var [injectRovingFocusGroupContext, provideRovingFocusGroupContext] = /*#__PURE__*/ createContext("RovingFocusGroup");
var RovingFocusGroup_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "RovingFocusGroup",
	props: {
		orientation: {
			type: String,
			required: false,
			default: void 0
		},
		dir: {
			type: String,
			required: false
		},
		loop: {
			type: Boolean,
			required: false,
			default: false
		},
		currentTabStopId: {
			type: [String, null],
			required: false
		},
		defaultCurrentTabStopId: {
			type: String,
			required: false
		},
		preventScrollOnEntryFocus: {
			type: Boolean,
			required: false,
			default: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	emits: ["entryFocus", "update:currentTabStopId"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { loop, orientation, dir: propDir } = (0, vue_exports.toRefs)(props);
		const dir = useDirection(propDir);
		const currentTabStopId = useVModel(props, "currentTabStopId", emits, {
			defaultValue: props.defaultCurrentTabStopId,
			passive: props.currentTabStopId === void 0
		});
		const isTabbingBackOut = (0, vue_exports.ref)(false);
		const isClickFocus = (0, vue_exports.ref)(false);
		const focusableItemsCount = (0, vue_exports.ref)(0);
		const { getItems, CollectionSlot } = useCollection({ isProvider: true });
		function handleFocus(event) {
			const isKeyboardFocus = !isClickFocus.value;
			if (event.currentTarget && event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut.value) {
				const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
				event.currentTarget.dispatchEvent(entryFocusEvent);
				emits("entryFocus", entryFocusEvent);
				if (!entryFocusEvent.defaultPrevented) {
					const items = getItems().map((i) => i.ref).filter((i) => i.dataset.disabled !== "");
					focusFirst([
						items.find((item) => item.getAttribute("data-active") === ""),
						items.find((item) => item.getAttribute("data-highlighted") === ""),
						items.find((item) => item.id === currentTabStopId.value),
						...items
					].filter(Boolean), props.preventScrollOnEntryFocus);
				}
			}
			isClickFocus.value = false;
		}
		function handleMouseUp() {
			setTimeout(() => {
				isClickFocus.value = false;
			}, 1);
		}
		__expose({ getItems });
		provideRovingFocusGroupContext({
			loop,
			dir,
			orientation,
			currentTabStopId,
			onItemFocus: (tabStopId) => {
				currentTabStopId.value = tabStopId;
			},
			onItemShiftTab: () => {
				isTabbingBackOut.value = true;
			},
			onFocusableItemAdd: () => {
				focusableItemsCount.value++;
			},
			onFocusableItemRemove: () => {
				focusableItemsCount.value--;
			}
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(CollectionSlot), null, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(Primitive), {
					tabindex: isTabbingBackOut.value || focusableItemsCount.value === 0 ? -1 : 0,
					"data-orientation": (0, vue_exports.unref)(orientation),
					as: _ctx.as,
					"as-child": _ctx.asChild,
					dir: (0, vue_exports.unref)(dir),
					style: { "outline": "none" },
					onMousedown: _cache[0] || (_cache[0] = ($event) => isClickFocus.value = true),
					onMouseup: handleMouseUp,
					onFocus: handleFocus,
					onBlur: _cache[1] || (_cache[1] = ($event) => isTabbingBackOut.value = false)
				}, {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"tabindex",
					"data-orientation",
					"as",
					"as-child",
					"dir"
				])]),
				_: 3
			});
		};
	}
});

export { MAP_KEY_TO_FOCUS_INTENT as M, RovingFocusGroup_default as R, useDirection as a, useCollection as b, createContext as c, useTypeahead as d, usePrimitiveElement as e, getFocusIntent as f, getActiveElement as g, handleAndDispatchCustomEvent as h, injectConfigProviderContext as i, findValuesBetween as j, reactiveOmit$1 as k, injectRovingFocusGroupContext as l, focusFirst as m, refAutoReset as r, tryOnBeforeUnmount as t, useId as u, wrapArray as w };
//# sourceMappingURL=RovingFocusGroup-9mfIdZPl.mjs.map
