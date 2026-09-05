import { v as vue_exports, s as server_renderer_exports, f as components_default, u as useDuxtPath, e as useDuxtLink, B as Button_default, N as NuxtLink, j as useState, g as cn, P as Primitive, k as useRouter, i as useI18n, l as useSwitchLocalePath, r as renderSlotFragments, _ as __exportAll, m as __reExport } from '../virtual/entry.mjs';
import { u as useId, a as useDirection, c as createContext, i as injectConfigProviderContext, b as useCollection, r as refAutoReset, t as tryOnBeforeUnmount, g as getActiveElement, d as useTypeahead, R as RovingFocusGroup_default, e as usePrimitiveElement, h as handleAndDispatchCustomEvent, f as getFocusIntent, j as findValuesBetween, k as reactiveOmit$1 } from './RovingFocusGroup-9mfIdZPl.mjs';
import { u as useDuxtConfig, a as asText } from './useDuxtConfig-Cy2__zQL.mjs';
import { T as Toaster_default } from './lib-Dnm-N0w-.mjs';
import { b as useDuxtNavigation, c as useDuxtSection, u as useDuxtCollection, e as useSearchCollection, a as useRecentPages, f as queryCollectionSearchSections } from './useDuxtSection-DeDrPvwO.mjs';
import { B as Badge_default } from './badge-8_fEuCAp.mjs';
import { K as isEqual } from '../nitro/nitro.mjs';
import { reactiveOmit, useVModel, useEventListener, unrefElement, useMounted, useCurrentElement, defaultWindow, createSharedComposable, onKeyStroke, createEventHook, createGlobalState } from '@vueuse/core';

//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/nullish.js
function isNullish(value) {
	return value === null || value === void 0;
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useArrowNavigation.js
var ignoredElement = ["INPUT", "TEXTAREA"];
/**
* Allow arrow navigation for every html element with data-reka-collection-item tag
*
* @param e               Keyboard event
* @param currentElement  Event initiator element or any element that wants to handle the navigation
* @param parentElement   Parent element where contains all the collection items, this will collect every item to be used when nav
* @param options         further options
* @returns               the navigated html element or null if none
*/
function useArrowNavigation(e, currentElement, parentElement, options = {}) {
	if (!currentElement || options.enableIgnoredElement && ignoredElement.includes(currentElement.nodeName)) return null;
	const { arrowKeyOptions = "both", attributeName = "[data-reka-collection-item]", itemsArray = [], loop = true, dir = "ltr", preventScroll = true, focus = false } = options;
	const [right, left, up, down, home, end] = [
		e.key === "ArrowRight",
		e.key === "ArrowLeft",
		e.key === "ArrowUp",
		e.key === "ArrowDown",
		e.key === "Home",
		e.key === "End"
	];
	const goingVertical = up || down;
	const goingHorizontal = right || left;
	if (!home && !end && (!goingVertical && !goingHorizontal || arrowKeyOptions === "vertical" && goingHorizontal || arrowKeyOptions === "horizontal" && goingVertical)) return null;
	const allCollectionItems = parentElement ? Array.from(parentElement.querySelectorAll(attributeName)) : itemsArray;
	if (!allCollectionItems.length) return null;
	if (preventScroll) e.preventDefault();
	let item = null;
	if (goingHorizontal || goingVertical) item = findNextFocusableElement(allCollectionItems, currentElement, {
		goForward: goingVertical ? down : dir === "ltr" ? right : left,
		loop
	});
	else if (home) item = allCollectionItems.at(0) || null;
	else if (end) item = allCollectionItems.at(-1) || null;
	if (focus) item?.focus();
	return item;
}
/**
* Recursive function to find the next focusable element to avoid disabled elements
*
* @param elements Elements to navigate
* @param currentElement Current active element
* @param options
* @returns next focusable element
*/
function findNextFocusableElement(elements, currentElement, options, iterations = !elements.includes(currentElement) ? elements.length + 1 : elements.length) {
	if (--iterations === 0) return null;
	const index = elements.indexOf(currentElement);
	let newIndex;
	if (index === -1) newIndex = options.goForward ? 0 : elements.length - 1;
	else newIndex = options.goForward ? index + 1 : index - 1;
	if (!options.loop && (newIndex < 0 || newIndex >= elements.length)) return null;
	const candidate = elements[(newIndex + elements.length) % elements.length];
	if (!candidate) return null;
	if (candidate.hasAttribute("disabled") && candidate.getAttribute("disabled") !== "false") return findNextFocusableElement(elements, candidate, options, iterations);
	return candidate;
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DismissableLayer/context.js
var context = /*#__PURE__*/ (0, vue_exports.reactive)({
	layersRoot: /* @__PURE__ */ new Set(),
	layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
	originalBodyPointerEvents: void 0,
	branches: /* @__PURE__ */ new Set()
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useBodyScrollLock.js
var useBodyLockStackCount = createSharedComposable(() => {
	const map = (0, vue_exports.ref)(/* @__PURE__ */ new Map());
	(0, vue_exports.ref)();
	const locked = (0, vue_exports.computed)(() => {
		for (const value of map.value.values()) if (value) return true;
		return false;
	});
	injectConfigProviderContext({ scrollBody: (0, vue_exports.ref)(true) });
	(0, vue_exports.watch)(locked, (val, oldVal) => {}, {
		immediate: true,
		flush: "sync"
	});
	return map;
});
function useBodyScrollLock(initialState) {
	const id = Math.random().toString(36).substring(2, 7);
	const map = useBodyLockStackCount();
	map.value.set(id, initialState ?? false);
	const locked = (0, vue_exports.computed)({
		get: () => map.value.get(id) ?? false,
		set: (value) => map.value.set(id, value)
	});
	tryOnBeforeUnmount();
	return locked;
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useComposing.js
var imeScriptRE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}]/u;
function useComposing(onEnd) {
	const isComposing = (0, vue_exports.ref)(false);
	const isImeComposition = (0, vue_exports.ref)(true);
	const sawImeScript = (0, vue_exports.ref)(false);
	const shouldDeferInput = (0, vue_exports.computed)(() => isComposing.value && isImeComposition.value);
	function handleCompositionStart() {
		isComposing.value = true;
		isImeComposition.value = true;
		sawImeScript.value = false;
	}
	function handleCompositionUpdate(event) {
		if (!event.data) return;
		if (imeScriptRE.test(event.data)) {
			isImeComposition.value = true;
			sawImeScript.value = true;
		}
	}
	function handleCompositionEnd(event) {
		(0, vue_exports.nextTick)(() => {
			isComposing.value = false;
			onEnd?.(event);
		});
	}
	return {
		isComposing,
		shouldDeferInput,
		handleCompositionStart,
		handleCompositionUpdate,
		handleCompositionEnd
	};
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useEmitAsProps.js
/**
* The `useEmitAsProps` function is a TypeScript utility that converts emitted events into props for a
* Vue component.
*
* @template Name - The event name string union type.
* @template Fn - The emit function type.
*
* @param emit - The `emit` parameter is a function that is used to emit events from a component. It
*
* takes two parameters: `name` which is the name of the event to be emitted, and `...args` which are
* the arguments to be passed along with the event.
* @returns The function `useEmitAsProps` returns an object that maps event names to functions that
* call the `emit` function with the corresponding event name and arguments.
*/
function useEmitAsProps(emit) {
	const vm = (0, vue_exports.getCurrentInstance)();
	const events = vm?.type.emits;
	const result = {};
	if (!events?.length) console.warn(`No emitted event found. Please check component: ${vm?.type.__name}`);
	events?.forEach((ev) => {
		result[(0, vue_exports.toHandlerKey)((0, vue_exports.camelize)(ev))] = (...arg) => emit(ev, ...arg);
	});
	return result;
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useFilter.js
/**
* Provides locale-aware string filtering functions.
* Uses `Intl.Collator` for comparison to ensure proper Unicode handling.
*
* @param options - Optional collator options to customize comparison behavior.
*   See [Intl.CollatorOptions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator/Collator#options) for details.
* @returns An object with methods to check if a string starts with, ends with, or contains a substring.
*
* @example
* const { startsWith, endsWith, contains } = useFilter();
*
* startsWith('hello', 'he'); // true
* endsWith('hello', 'lo'); // true
* contains('hello', 'ell'); // true
*/
function useFilter(options) {
	const computedOptions = (0, vue_exports.computed)(() => (0, vue_exports.unref)(options));
	const collator = (0, vue_exports.computed)(() => new Intl.Collator("en", {
		usage: "search",
		...computedOptions.value
	}));
	const startsWith = (string, substring) => {
		if (substring.length === 0) return true;
		string = string.normalize("NFC");
		substring = substring.normalize("NFC");
		return collator.value.compare(string.slice(0, substring.length), substring) === 0;
	};
	const endsWith = (string, substring) => {
		if (substring.length === 0) return true;
		string = string.normalize("NFC");
		substring = substring.normalize("NFC");
		return collator.value.compare(string.slice(-substring.length), substring) === 0;
	};
	const contains = (string, substring) => {
		if (substring.length === 0) return true;
		string = string.normalize("NFC");
		substring = substring.normalize("NFC");
		let scan = 0;
		const sliceLen = substring.length;
		for (; scan + sliceLen <= string.length; scan++) {
			const slice = string.slice(scan, scan + sliceLen);
			if (collator.value.compare(substring, slice) === 0) return true;
		}
		return false;
	};
	return {
		startsWith,
		endsWith,
		contains
	};
}
/**
* Injects a pair of focus guards at the edges of the whole DOM tree
* to ensure `focusin` & `focusout` events can be caught consistently.
*/
function useFocusGuards() {
	(0, vue_exports.watchEffect)((cleanupFn) => {});
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useFormControl.js
function useFormControl(el) {
	return (0, vue_exports.computed)(() => (0, vue_exports.toValue)(el) ? Boolean(unrefElement(el)?.closest("form")) : true);
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useForwardExpose.js
function useForwardExpose() {
	const instance = (0, vue_exports.getCurrentInstance)();
	const currentRef = (0, vue_exports.ref)();
	const currentElement = (0, vue_exports.computed)(() => resolveCurrentElement());
	function resolveCurrentElement() {
		return currentRef.value && "$el" in currentRef.value && ["#text", "#comment"].includes(currentRef.value.$el.nodeName) ? currentRef.value.$el.nextElementSibling : unrefElement(currentRef);
	}
	const localExpose = Object.assign({}, instance.exposed);
	const ret = {};
	for (const key in instance.props) Object.defineProperty(ret, key, {
		enumerable: true,
		configurable: true,
		get: () => instance.props[key]
	});
	if (Object.keys(localExpose).length > 0) for (const key in localExpose) Object.defineProperty(ret, key, {
		enumerable: true,
		configurable: true,
		get: () => localExpose[key]
	});
	Object.defineProperty(ret, "$el", {
		enumerable: true,
		configurable: true,
		get: () => instance.vnode.el
	});
	instance.exposed = ret;
	function forwardRef(ref$1) {
		currentRef.value = ref$1;
		if (!ref$1) return;
		Object.defineProperty(ret, "$el", {
			enumerable: true,
			configurable: true,
			get: () => ref$1 instanceof Element ? ref$1 : ref$1.$el
		});
		if (!(ref$1 instanceof Element) && !Object.hasOwn(ref$1, "$el")) {
			const childExposed = ref$1.$.exposed;
			const merged = Object.assign({}, ret);
			for (const key in childExposed) Object.defineProperty(merged, key, {
				enumerable: true,
				configurable: true,
				get: () => childExposed[key]
			});
			instance.exposed = merged;
		}
	}
	return {
		forwardRef,
		currentRef,
		currentElement
	};
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useForwardProps.js
/**
* The `useForwardProps` function in TypeScript takes in a set of props and returns a computed value
* that combines default props with assigned props from the current instance.
* @param {T} props - The `props` parameter is an object that represents the props passed to a
* component.
* @returns computed value that combines the default props, preserved props, and assigned props.
*/
function useForwardProps(props) {
	const vm = (0, vue_exports.getCurrentInstance)();
	const defaultProps = Object.keys(vm?.type.props ?? {}).reduce((prev, curr) => {
		const defaultValue = (vm?.type.props[curr]).default;
		if (defaultValue !== void 0) prev[curr] = defaultValue;
		return prev;
	}, {});
	const refProps = (0, vue_exports.toRef)(props);
	return (0, vue_exports.computed)(() => {
		const preservedProps = {};
		const assignedProps = vm?.vnode.props ?? {};
		Object.keys(assignedProps).forEach((key) => {
			preservedProps[(0, vue_exports.camelize)(key)] = assignedProps[key];
		});
		return Object.keys({
			...defaultProps,
			...preservedProps
		}).reduce((prev, curr) => {
			if (refProps.value[curr] !== void 0) prev[curr] = refProps.value[curr];
			return prev;
		}, {});
	});
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useForwardPropsEmits.js
function useForwardPropsEmits(props, emit) {
	const parsedProps = useForwardProps(props);
	const emitsAsProps = emit ? useEmitAsProps(emit) : {};
	return (0, vue_exports.computed)(() => ({
		...parsedProps.value,
		...emitsAsProps
	}));
}
/**
* Marks everything except given node(or nodes) as aria-hidden
* @param {Element | Element[]} originalTarget - elements to keep on the page
* @param [parentNode] - top element, defaults to document.body
* @param {String} [markerName] - a special attribute to mark every node
* @return {Undo} undo command
*/
var hideOthers = function(originalTarget, parentNode, markerName) {
	Array.from(Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
	return function() {
		return null;
	};
};
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useHideOthers.js
/**
* The `useHideOthers` function is a TypeScript function that takes a target element reference and
* hides all other elements in ARIA when the target element is present, and restores the visibility of the
* hidden elements when the target element is removed.
* @param {MaybeElementRef} target - The `target` parameter is a reference to the element that you want
* to hide other elements when it is clicked or focused.
*/
function useHideOthers(target) {
	let undo;
	(0, vue_exports.watch)(() => unrefElement(target), (el) => {
		let isInsideClosedPopover = false;
		try {
			isInsideClosedPopover = !!el?.closest("[popover]:not(:popover-open)");
		} catch {}
		if (el && !isInsideClosedPopover) undo = hideOthers(el);
		else if (undo) undo();
	});
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useKbd.js
function useKbd() {
	return {
		ALT: "Alt",
		ARROW_DOWN: "ArrowDown",
		ARROW_LEFT: "ArrowLeft",
		ARROW_RIGHT: "ArrowRight",
		ARROW_UP: "ArrowUp",
		BACKSPACE: "Backspace",
		CAPS_LOCK: "CapsLock",
		CONTROL: "Control",
		DELETE: "Delete",
		END: "End",
		ENTER: "Enter",
		ESCAPE: "Escape",
		F1: "F1",
		F10: "F10",
		F11: "F11",
		F12: "F12",
		F2: "F2",
		F3: "F3",
		F4: "F4",
		F5: "F5",
		F6: "F6",
		F7: "F7",
		F8: "F8",
		F9: "F9",
		HOME: "Home",
		META: "Meta",
		PAGE_DOWN: "PageDown",
		PAGE_UP: "PageUp",
		SHIFT: "Shift",
		SPACE: " ",
		TAB: "Tab",
		CTRL: "Control",
		ASTERISK: "*",
		SPACE_CODE: "Space"
	};
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useSize.js
function useSize(element) {
	const size = (0, vue_exports.ref)();
	return {
		width: (0, vue_exports.computed)(() => size.value?.width ?? 0),
		height: (0, vue_exports.computed)(() => size.value?.height ?? 0)
	};
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useStateMachine.js
/**
* The `useStateMachine` function is a TypeScript function that creates a state machine and returns the
* current state and a dispatch function to update the state based on events.
* @param initialState - The `initialState` parameter is the initial state of the state machine. It
* represents the starting point of the state machine's state.
* @param machine - The `machine` parameter is an object that represents a state machine. It should
* have keys that correspond to the possible states of the machine, and the values should be objects
* that represent the possible events and their corresponding next states.
* @returns The `useStateMachine` function returns an object with two properties: `state` and
* `dispatch`.
*/
function useStateMachine(initialState, machine) {
	const state = (0, vue_exports.ref)(initialState);
	function reducer(event) {
		return machine[state.value][event] ?? state.value;
	}
	const dispatch = (event) => {
		state.value = reducer(event);
	};
	return {
		state,
		dispatch
	};
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Presence/usePresence.js
function usePresence(present, node) {
	const stylesRef = (0, vue_exports.ref)({});
	const prevAnimationNameRef = (0, vue_exports.ref)("none");
	const prevPresentRef = (0, vue_exports.ref)(present);
	const initialState = present.value ? "mounted" : "unmounted";
	let timeoutId;
	const ownerWindow = node.value?.ownerDocument.defaultView ?? defaultWindow;
	const { state, dispatch } = useStateMachine(initialState, {
		mounted: {
			UNMOUNT: "unmounted",
			ANIMATION_OUT: "unmountSuspended"
		},
		unmountSuspended: {
			MOUNT: "mounted",
			ANIMATION_END: "unmounted"
		},
		unmounted: { MOUNT: "mounted" }
	});
	(0, vue_exports.watch)(present, async (currentPresent, prevPresent) => {
		const hasPresentChanged = prevPresent !== currentPresent;
		await (0, vue_exports.nextTick)();
		if (hasPresentChanged) {
			const prevAnimationName = prevAnimationNameRef.value;
			const currentAnimationName = getAnimationName(node.value);
			if (currentPresent) {
				dispatch("MOUNT");
			} else if (currentAnimationName === "none" || currentAnimationName === "undefined" || stylesRef.value?.display === "none") dispatch("UNMOUNT");
			else if (prevPresent && prevAnimationName !== currentAnimationName) dispatch("ANIMATION_OUT");
			else dispatch("UNMOUNT");
		}
	}, { immediate: true });
	/**
	* Triggering an ANIMATION_OUT during an ANIMATION_IN will fire an `animationcancel`
	* event for ANIMATION_IN after we have entered `unmountSuspended` state. So, we
	* make sure we only trigger ANIMATION_END for the currently active animation.
	*/
	const handleAnimationEnd = (event) => {
		if (event.target !== node.value) return;
		const currentAnimationName = getAnimationName(node.value);
		const isCurrentAnimation = currentAnimationName.includes(CSS.escape(event.animationName));
		state.value === "mounted" ? "enter" : "leave";
		if (isCurrentAnimation) {
			dispatch("ANIMATION_END");
			if (!prevPresentRef.value) {
				const currentFillMode = node.value.style.animationFillMode;
				node.value.style.animationFillMode = "forwards";
				timeoutId = ownerWindow?.setTimeout(() => {
					if (node.value?.style.animationFillMode === "forwards") node.value.style.animationFillMode = currentFillMode;
				});
			}
		}
		if (currentAnimationName === "none") dispatch("ANIMATION_END");
	};
	const handleAnimationStart = (event) => {
		if (event.target === node.value) prevAnimationNameRef.value = getAnimationName(node.value);
	};
	(0, vue_exports.watch)(node, (newNode, oldNode) => {
		if (newNode) {
			stylesRef.value = getComputedStyle(newNode);
			newNode.addEventListener("animationstart", handleAnimationStart);
			newNode.addEventListener("animationcancel", handleAnimationEnd);
			newNode.addEventListener("animationend", handleAnimationEnd);
		} else {
			dispatch("ANIMATION_END");
			if (timeoutId !== void 0) ownerWindow?.clearTimeout(timeoutId);
			oldNode?.removeEventListener("animationstart", handleAnimationStart);
			oldNode?.removeEventListener("animationcancel", handleAnimationEnd);
			oldNode?.removeEventListener("animationend", handleAnimationEnd);
		}
	}, { immediate: true });
	(0, vue_exports.watch)(state, () => {
		const currentAnimationName = getAnimationName(node.value);
		prevAnimationNameRef.value = state.value === "mounted" ? currentAnimationName : "none";
	});
	return { isPresent: (0, vue_exports.computed)(() => ["mounted", "unmountSuspended"].includes(state.value)) };
}
function getAnimationName(node) {
	return node ? getComputedStyle(node).animationName || "none" : "none";
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Presence/Presence.js
var Presence_default = /*#__PURE__*/ (0, vue_exports.defineComponent)({
	name: "Presence",
	props: {
		present: {
			type: Boolean,
			required: true
		},
		forceMount: { type: Boolean }
	},
	slots: {},
	setup(props, { slots, expose }) {
		const { present, forceMount } = (0, vue_exports.toRefs)(props);
		const node = (0, vue_exports.ref)();
		const { isPresent } = usePresence(present, node);
		expose({ present: isPresent });
		let children = slots.default({ present: isPresent.value });
		children = renderSlotFragments(children || []);
		const instance = (0, vue_exports.getCurrentInstance)();
		if (children && children?.length > 1) {
			const componentName = instance?.parent?.type.name ? `<${instance.parent.type.name} />` : "component";
			throw new Error([
				`Detected an invalid children for \`${componentName}\` for  \`Presence\` component.`,
				"",
				"Note: Presence works similarly to `v-if` directly, but it waits for animation/transition to finished before unmounting. So it expect only one direct child of valid VNode type.",
				"You can apply a few solutions:",
				["Provide a single child element so that `presence` directive attach correctly.", "Ensure the first child is an actual element instead of a raw text node or comment node."].map((line) => `  - ${line}`).join("\n")
			].join("\n"));
		}
		return () => {
			if (forceMount.value || present.value || isPresent.value) return (0, vue_exports.h)(slots.default({ present: isPresent.value })[0], { ref: (v) => {
				const el = unrefElement(v);
				if (typeof el?.hasAttribute === "undefined") return el;
				if (el?.hasAttribute("data-reka-popper-content-wrapper")) node.value = el.firstElementChild;
				else node.value = el;
				return el;
			} });
			else return null;
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Collapsible/CollapsibleRoot.js
var [injectCollapsibleRootContext, provideCollapsibleRootContext] = /*#__PURE__*/ createContext("CollapsibleRoot");
var CollapsibleRoot_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "CollapsibleRoot",
	props: {
		defaultOpen: {
			type: Boolean,
			required: false,
			default: false
		},
		open: {
			type: Boolean,
			required: false,
			default: void 0
		},
		disabled: {
			type: Boolean,
			required: false
		},
		unmountOnHide: {
			type: Boolean,
			required: false,
			default: true
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
	emits: ["update:open"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const open = useVModel(props, "open", __emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const { disabled, unmountOnHide } = (0, vue_exports.toRefs)(props);
		provideCollapsibleRootContext({
			contentId: "",
			disabled,
			open,
			unmountOnHide,
			onOpenToggle: () => {
				if (disabled.value) return;
				open.value = !open.value;
			}
		});
		__expose({ open });
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), {
				as: _ctx.as,
				"as-child": props.asChild,
				"data-state": (0, vue_exports.unref)(open) ? "open" : "closed",
				"data-disabled": (0, vue_exports.unref)(disabled) ? "" : void 0
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default", { open: (0, vue_exports.unref)(open) })]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"data-state",
				"data-disabled"
			]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Collapsible/CollapsibleContent.js
var CollapsibleContent_default$1 = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "CollapsibleContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
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
	emits: ["contentFound"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = injectCollapsibleRootContext();
		rootContext.contentId ||= useId(void 0, "reka-collapsible-content");
		const presentRef = (0, vue_exports.ref)();
		const { forwardRef, currentElement } = useForwardExpose();
		const width = (0, vue_exports.ref)(0);
		const height = (0, vue_exports.ref)(0);
		const isOpen = (0, vue_exports.computed)(() => rootContext.open.value);
		const isMountAnimationPrevented = (0, vue_exports.ref)(isOpen.value);
		const currentStyle = (0, vue_exports.ref)();
		(0, vue_exports.watch)(() => [isOpen.value, presentRef.value?.present], async () => {
			await (0, vue_exports.nextTick)();
			const node = currentElement.value;
			if (!node) return;
			currentStyle.value = currentStyle.value || {
				transitionDuration: node.style.transitionDuration,
				animationName: node.style.animationName
			};
			node.style.transitionDuration = "0s";
			node.style.animationName = "none";
			const rect = node.getBoundingClientRect();
			height.value = rect.height;
			width.value = rect.width;
			if (!isMountAnimationPrevented.value) {
				node.style.transitionDuration = currentStyle.value.transitionDuration;
				node.style.animationName = currentStyle.value.animationName;
			}
		}, { immediate: true });
		const skipAnimation = (0, vue_exports.computed)(() => isMountAnimationPrevented.value && rootContext.open.value);
		useEventListener(currentElement, "beforematch", (ev) => {
			requestAnimationFrame(() => {
				rootContext.onOpenToggle();
				emits("contentFound");
			});
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Presence_default), {
				ref_key: "presentRef",
				ref: presentRef,
				present: _ctx.forceMount || (0, vue_exports.unref)(rootContext).open.value,
				"force-mount": true
			}, {
				default: (0, vue_exports.withCtx)(({ present }) => [(0, vue_exports.createVNode)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)(_ctx.$attrs, {
					id: (0, vue_exports.unref)(rootContext).contentId,
					ref: (0, vue_exports.unref)(forwardRef),
					"as-child": props.asChild,
					as: _ctx.as,
					hidden: !present ? (0, vue_exports.unref)(rootContext).unmountOnHide.value ? "" : "until-found" : void 0,
					"data-state": skipAnimation.value ? void 0 : (0, vue_exports.unref)(rootContext).open.value ? "open" : "closed",
					"data-disabled": (0, vue_exports.unref)(rootContext).disabled?.value ? "" : void 0,
					style: {
						[`--reka-collapsible-content-height`]: `${height.value}px`,
						[`--reka-collapsible-content-width`]: `${width.value}px`
					}
				}), {
					default: (0, vue_exports.withCtx)(() => [((0, vue_exports.unref)(rootContext).unmountOnHide.value ? present : true) ? (0, vue_exports.renderSlot)(_ctx.$slots, "default", { key: 0 }) : (0, vue_exports.createCommentVNode)("v-if", true)]),
					_: 2
				}, 1040, [
					"id",
					"as-child",
					"as",
					"hidden",
					"data-state",
					"data-disabled",
					"style"
				])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Collapsible/CollapsibleTrigger.js
var CollapsibleTrigger_default$1 = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "CollapsibleTrigger",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		useForwardExpose();
		const rootContext = injectCollapsibleRootContext();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), {
				type: _ctx.as === "button" ? "button" : void 0,
				as: _ctx.as,
				"as-child": props.asChild,
				"aria-controls": (0, vue_exports.unref)(rootContext).contentId,
				"aria-expanded": (0, vue_exports.unref)(rootContext).open.value,
				"data-state": (0, vue_exports.unref)(rootContext).open.value ? "open" : "closed",
				"data-disabled": (0, vue_exports.unref)(rootContext).disabled?.value ? "" : void 0,
				disabled: (0, vue_exports.unref)(rootContext).disabled?.value,
				onClick: (0, vue_exports.unref)(rootContext).onOpenToggle
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"type",
				"as",
				"as-child",
				"aria-controls",
				"aria-expanded",
				"data-state",
				"data-disabled",
				"disabled",
				"onClick"
			]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogRoot.js
var [injectDialogRootContext, provideDialogRootContext] = /*#__PURE__*/ createContext("DialogRoot");
var DialogRoot_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "DialogRoot",
	props: {
		open: {
			type: Boolean,
			required: false,
			default: void 0
		},
		defaultOpen: {
			type: Boolean,
			required: false,
			default: false
		},
		modal: {
			type: Boolean,
			required: false,
			default: true
		},
		unmountOnHide: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const open = useVModel(props, "open", __emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const triggerElement = (0, vue_exports.ref)();
		const contentElement = (0, vue_exports.ref)();
		const { modal, unmountOnHide } = (0, vue_exports.toRefs)(props);
		provideDialogRootContext({
			open,
			modal,
			unmountOnHide,
			openModal: () => {
				open.value = true;
			},
			onOpenChange: (value) => {
				open.value = value;
			},
			onOpenToggle: () => {
				open.value = !open.value;
			},
			contentId: "",
			titleId: "",
			descriptionId: "",
			triggerElement,
			contentElement
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.renderSlot)(_ctx.$slots, "default", {
				open: (0, vue_exports.unref)(open),
				close: () => open.value = false
			});
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogClose.js
var DialogClose_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DialogClose",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		useForwardExpose();
		const rootContext = injectDialogRootContext();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)(props, {
				type: _ctx.as === "button" ? "button" : void 0,
				onClick: _cache[0] || (_cache[0] = ($event) => (0, vue_exports.unref)(rootContext).onOpenChange(false))
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["type"]);
		};
	}
});
/**
* Listens for `pointerdown` outside a DOM subtree. We use `pointerdown` rather than `pointerup`
* to mimic layer dismissing behaviour present in OS.
* Returns props to pass to the node we want to check for outside events.
*/
function usePointerDownOutside(onPointerDownOutside, element, enabled = true) {
	element?.value?.ownerDocument ?? globalThis?.document;
	const isPointerInsideDOMTree = (0, vue_exports.ref)(false);
	(0, vue_exports.ref)(() => {});
	(0, vue_exports.watchEffect)((cleanupFn) => {});
	return { onPointerDownCapture: () => {
		if (!(0, vue_exports.toValue)(enabled)) return;
		isPointerInsideDOMTree.value = true;
	} };
}
/**
* Listens for when focus happens outside a DOM subtree.
* Returns props to pass to the root (node) of the subtree we want to check.
*/
function useFocusOutside(onFocusOutside, element, enabled = true) {
	element?.value?.ownerDocument ?? globalThis?.document;
	const isFocusInsideDOMTree = (0, vue_exports.ref)(false);
	(0, vue_exports.watchEffect)((cleanupFn) => {});
	return {
		onFocusCapture: () => {
			if (!(0, vue_exports.toValue)(enabled)) return;
			isFocusInsideDOMTree.value = true;
		},
		onBlurCapture: () => {
			if (!(0, vue_exports.toValue)(enabled)) return;
			isFocusInsideDOMTree.value = false;
		}
	};
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DismissableLayer/DismissableLayer.js
var DismissableLayer_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DismissableLayer",
	props: {
		disableOutsidePointerEvents: {
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
		},
		present: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"dismiss"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement: layerElement } = useForwardExpose();
		const ownerDocument = (0, vue_exports.computed)(() => layerElement.value?.ownerDocument ?? globalThis.document);
		const layers = (0, vue_exports.computed)(() => context.layersRoot);
		const index = (0, vue_exports.computed)(() => {
			return layerElement.value ? Array.from(layers.value).indexOf(layerElement.value) : -1;
		});
		const isBodyPointerEventsDisabled = (0, vue_exports.computed)(() => {
			return context.layersWithOutsidePointerEventsDisabled.size > 0;
		});
		const isPointerEventsEnabled = (0, vue_exports.computed)(() => {
			const localLayers = Array.from(layers.value);
			const [highestLayerWithOutsidePointerEventsDisabled] = [...context.layersWithOutsidePointerEventsDisabled].slice(-1);
			const highestLayerWithOutsidePointerEventsDisabledIndex = localLayers.indexOf(highestLayerWithOutsidePointerEventsDisabled);
			return index.value >= highestLayerWithOutsidePointerEventsDisabledIndex;
		});
		const pointerDownOutside = usePointerDownOutside(async (event) => {
			const isPointerDownOnBranch = [...context.branches].some((branch) => branch?.contains(event.target));
			if (!props.present || !isPointerEventsEnabled.value || isPointerDownOnBranch) return;
			emits("pointerDownOutside", event);
			emits("interactOutside", event);
			await (0, vue_exports.nextTick)();
			if (!event.defaultPrevented) emits("dismiss");
		}, layerElement, () => props.present);
		const focusOutside = useFocusOutside((event) => {
			const isFocusInBranch = [...context.branches].some((branch) => branch?.contains(event.target));
			if (!props.present || isFocusInBranch) return;
			emits("focusOutside", event);
			emits("interactOutside", event);
			if (!event.defaultPrevented) emits("dismiss");
		}, layerElement);
		onKeyStroke("Escape", (event) => {
			if (!props.present) return;
			if (!(index.value === layers.value.size - 1)) return;
			emits("escapeKeyDown", event);
			if (!event.defaultPrevented) emits("dismiss");
		});
		(0, vue_exports.watch)([
			layerElement,
			() => props.disableOutsidePointerEvents,
			() => props.present
		], ([element, disableOutsidePointerEvents, present], _, onCleanup) => {
			if (!element || !present) return;
			if (disableOutsidePointerEvents) {
				if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
					context.originalBodyPointerEvents = ownerDocument.value.body.style.pointerEvents;
					ownerDocument.value.body.style.pointerEvents = "none";
				}
				context.layersWithOutsidePointerEventsDisabled.add(element);
				onCleanup(() => {
					context.layersWithOutsidePointerEventsDisabled.delete(element);
					if (context.layersWithOutsidePointerEventsDisabled.size === 0 && !isNullish(context.originalBodyPointerEvents)) ownerDocument.value.body.style.pointerEvents = context.originalBodyPointerEvents;
				});
			}
		}, { immediate: true });
		(0, vue_exports.watch)([layerElement, () => props.present], ([element, present], _, onCleanup) => {
			if (!element || !present) return;
			layers.value.add(element);
			onCleanup(() => {
				layers.value.delete(element);
			});
		}, { immediate: true });
		(0, vue_exports.watchEffect)((cleanupFn) => {
			cleanupFn(() => {
				if (!layerElement.value) return;
				layers.value.delete(layerElement.value);
				context.layersWithOutsidePointerEventsDisabled.delete(layerElement.value);
			});
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), {
				ref: (0, vue_exports.unref)(forwardRef),
				"as-child": _ctx.asChild,
				as: _ctx.as,
				"data-dismissable-layer": "",
				style: (0, vue_exports.normalizeStyle)({ pointerEvents: isBodyPointerEventsDisabled.value ? isPointerEventsEnabled.value ? "auto" : "none" : void 0 }),
				onFocusCapture: (0, vue_exports.unref)(focusOutside).onFocusCapture,
				onBlurCapture: (0, vue_exports.unref)(focusOutside).onBlurCapture,
				onPointerdownCapture: (0, vue_exports.unref)(pointerDownOutside).onPointerDownCapture
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as-child",
				"as",
				"style",
				"onFocusCapture",
				"onBlurCapture",
				"onPointerdownCapture"
			]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/FocusScope/stack.js
var useFocusStackState = createGlobalState(() => {
	return (0, vue_exports.ref)([]);
});
function createFocusScopesStack() {
	/** A stack of focus scopes, with the active one at the top */
	const stack = useFocusStackState();
	return {
		add(focusScope) {
			const activeFocusScope = stack.value[0];
			if (focusScope !== activeFocusScope) activeFocusScope?.pause();
			stack.value = arrayRemove(stack.value, focusScope);
			stack.value.unshift(focusScope);
		},
		remove(focusScope) {
			stack.value = arrayRemove(stack.value, focusScope);
			stack.value[0]?.resume();
		}
	};
}
function arrayRemove(array, item) {
	const updatedArray = [...array];
	const index = updatedArray.indexOf(item);
	if (index !== -1) updatedArray.splice(index, 1);
	return updatedArray;
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/FocusScope/utils.js
var AUTOFOCUS_ON_MOUNT = "focusScope.autoFocusOnMount";
var AUTOFOCUS_ON_UNMOUNT = "focusScope.autoFocusOnUnmount";
var EVENT_OPTIONS = {
	bubbles: false,
	cancelable: true
};
/**
* Attempts focusing the first element in a list of candidates.
* Stops when focus has actually moved.
*/
function focusFirst$1(candidates, { select = false } = {}) {
	const previouslyFocusedElement = getActiveElement();
	for (const candidate of candidates) {
		focus(candidate, { select });
		if (getActiveElement() !== previouslyFocusedElement) return true;
	}
}
/**
* Returns the first and last tabbable elements inside a container.
*/
function getTabbableEdges(container) {
	const candidates = getTabbableCandidates(container);
	return [findVisible(candidates, container), findVisible(candidates.reverse(), container)];
}
/**
* Returns a list of potential tabbable candidates.
*
* NOTE: This is only a close approximation. For example it doesn't take into account cases like when
* elements are not visible. This cannot be worked out easily by just reading a property, but rather
* necessitate runtime knowledge (computed styles, etc). We deal with these cases separately.
*
* See: https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker
* Credit: https://github.com/discord/focus-layers/blob/master/src/util/wrapFocus.tsx#L1
*/
function getTabbableCandidates(container) {
	const nodes = [];
	const walker = (void 0).createTreeWalker(container, NodeFilter.SHOW_ELEMENT, { acceptNode: (node) => {
		const isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
		if (node.disabled || node.hidden || isHiddenInput) return NodeFilter.FILTER_SKIP;
		return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
	} });
	while (walker.nextNode()) nodes.push(walker.currentNode);
	return nodes;
}
/**
* Returns the first visible element in a list.
* NOTE: Only checks visibility up to the `container`.
*/
function findVisible(elements, container) {
	for (const element of elements) if (!isHidden(element, { upTo: container })) return element;
}
function isHidden(node, { upTo }) {
	if (getComputedStyle(node).visibility === "hidden") return true;
	while (node) {
		if (upTo !== void 0 && node === upTo) return false;
		if (getComputedStyle(node).display === "none") return true;
		node = node.parentElement;
	}
	return false;
}
function isSelectableInput(element) {
	return element instanceof HTMLInputElement && "select" in element;
}
function focus(element, { select = false } = {}) {
	if (element && element.focus) {
		const previouslyFocusedElement = getActiveElement();
		element.focus({ preventScroll: true });
		if (element !== previouslyFocusedElement && isSelectableInput(element) && select) element.select();
	}
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/FocusScope/FocusScope.js
var FocusScope_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "FocusScope",
	props: {
		loop: {
			type: Boolean,
			required: false,
			default: false
		},
		trapped: {
			type: Boolean,
			required: false,
			default: false
		},
		present: {
			type: Boolean,
			required: false,
			default: true
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
	emits: ["mountAutoFocus", "unmountAutoFocus"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { currentRef, currentElement } = useForwardExpose();
		(0, vue_exports.ref)(null);
		const focusScopesStack = createFocusScopesStack();
		const focusScope = /*#__PURE__*/ (0, vue_exports.reactive)({
			paused: false,
			pause() {
				this.paused = true;
			},
			resume() {
				this.paused = false;
			}
		});
		(0, vue_exports.watchEffect)((cleanupFn) => {});
		function dispatchMountAutoFocus(container, previouslyFocusedElement) {
			const mountEvent = new CustomEvent(AUTOFOCUS_ON_MOUNT, EVENT_OPTIONS);
			const handleMountAutoFocus = (ev) => emits("mountAutoFocus", ev);
			container.addEventListener(AUTOFOCUS_ON_MOUNT, handleMountAutoFocus);
			container.dispatchEvent(mountEvent);
			container.removeEventListener(AUTOFOCUS_ON_MOUNT, handleMountAutoFocus);
			if (!mountEvent.defaultPrevented) {
				focusFirst$1(getTabbableCandidates(container), { select: true });
				if (getActiveElement() === previouslyFocusedElement) focus(container);
			}
		}
		(0, vue_exports.watchEffect)(async (cleanupFn) => {
			const container = currentElement.value;
			await (0, vue_exports.nextTick)();
			if (!container) return;
			if (props.present !== false) focusScopesStack.add(focusScope);
			const previouslyFocusedElement = getActiveElement();
			if (!container.contains(previouslyFocusedElement) && props.present !== false) dispatchMountAutoFocus(container, previouslyFocusedElement);
			cleanupFn(() => {
				const unmountEvent = new CustomEvent(AUTOFOCUS_ON_UNMOUNT, EVENT_OPTIONS);
				const unmountEventHandler = (ev) => {
					emits("unmountAutoFocus", ev);
				};
				container.addEventListener(AUTOFOCUS_ON_UNMOUNT, unmountEventHandler);
				container.dispatchEvent(unmountEvent);
				container.setAttribute("data-focus-scope-unmounting", "");
				setTimeout(() => {
					if (!unmountEvent.defaultPrevented) focus(previouslyFocusedElement ?? (void 0).body, { select: true });
					container.removeEventListener(AUTOFOCUS_ON_UNMOUNT, unmountEventHandler);
					focusScopesStack.remove(focusScope);
					container.removeAttribute("data-focus-scope-unmounting");
				}, 0);
			});
		});
		(0, vue_exports.watch)(() => props.present, async (present, prevPresent) => {});
		function handleKeyDown(event) {
			if (!props.loop && !props.trapped) return;
			if (focusScope.paused) return;
			const isTabKey = event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey;
			const focusedElement = getActiveElement();
			if (isTabKey && focusedElement) {
				const container = event.currentTarget;
				const [first, last] = getTabbableEdges(container);
				if (!(first && last)) {
					if (focusedElement === container) event.preventDefault();
				} else if (!event.shiftKey && focusedElement === last) {
					event.preventDefault();
					if (props.loop) focus(first, { select: true });
				} else if (event.shiftKey && focusedElement === first) {
					event.preventDefault();
					if (props.loop) focus(last, { select: true });
				}
			}
		}
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), {
				ref_key: "currentRef",
				ref: currentRef,
				tabindex: "-1",
				"as-child": _ctx.asChild,
				as: _ctx.as,
				onKeydown: handleKeyDown
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["as-child", "as"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/utils.js
var ITEM_SELECT = "menu.itemSelect";
var SELECTION_KEYS = ["Enter", " "];
var FIRST_KEYS = [
	"ArrowDown",
	"PageUp",
	"Home"
];
var LAST_KEYS = [
	"ArrowUp",
	"PageDown",
	"End"
];
var FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
var SUB_OPEN_KEYS = {
	ltr: [...SELECTION_KEYS, "ArrowRight"],
	rtl: [...SELECTION_KEYS, "ArrowLeft"]
};
var SUB_CLOSE_KEYS = {
	ltr: ["ArrowLeft"],
	rtl: ["ArrowRight"]
};
function getOpenState(open) {
	return open ? "open" : "closed";
}
function isIndeterminate(checked) {
	return checked === "indeterminate";
}
function getCheckedState(checked) {
	return isIndeterminate(checked) ? "indeterminate" : checked ? "checked" : "unchecked";
}
function focusFirst(candidates) {
	const PREVIOUSLY_FOCUSED_ELEMENT = getActiveElement();
	for (const candidate of candidates) {
		if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
		candidate.focus();
		if (getActiveElement() !== PREVIOUSLY_FOCUSED_ELEMENT) return;
	}
}
function isPointInPolygon(point, polygon) {
	const { x, y } = point;
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i].x;
		const yi = polygon[i].y;
		const xj = polygon[j].x;
		const yj = polygon[j].y;
		if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}
function isPointerInGraceArea(event, area) {
	if (!area) return false;
	return isPointInPolygon({
		x: event.clientX,
		y: event.clientY
	}, area);
}
function isMouseEvent(event) {
	return event.pointerType === "mouse";
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogContentImpl.js
var DialogContentImpl_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DialogContentImpl",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		trapFocus: {
			type: Boolean,
			required: false
		},
		disableOutsidePointerEvents: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		present: {
			type: Boolean,
			required: false
		}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = injectDialogRootContext();
		const { forwardRef} = useForwardExpose();
		rootContext.titleId ||= useId(void 0, "reka-dialog-title");
		rootContext.descriptionId ||= useId(void 0, "reka-dialog-description");
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(FocusScope_default), {
				"as-child": "",
				loop: "",
				trapped: props.trapFocus,
				present: props.present,
				onMountAutoFocus: _cache[5] || (_cache[5] = ($event) => emits("openAutoFocus", $event)),
				onUnmountAutoFocus: _cache[6] || (_cache[6] = ($event) => emits("closeAutoFocus", $event))
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(DismissableLayer_default), (0, vue_exports.mergeProps)({
					id: (0, vue_exports.unref)(rootContext).contentId,
					ref: (0, vue_exports.unref)(forwardRef),
					as: _ctx.as,
					"as-child": _ctx.asChild,
					present: props.present,
					"disable-outside-pointer-events": _ctx.disableOutsidePointerEvents,
					role: "dialog",
					"aria-describedby": (0, vue_exports.unref)(rootContext).descriptionId,
					"aria-labelledby": (0, vue_exports.unref)(rootContext).titleId,
					"data-state": (0, vue_exports.unref)(getOpenState)((0, vue_exports.unref)(rootContext).open.value)
				}, _ctx.$attrs, {
					onDismiss: _cache[0] || (_cache[0] = ($event) => (0, vue_exports.unref)(rootContext).onOpenChange(false)),
					onEscapeKeyDown: _cache[1] || (_cache[1] = ($event) => emits("escapeKeyDown", $event)),
					onFocusOutside: _cache[2] || (_cache[2] = ($event) => emits("focusOutside", $event)),
					onInteractOutside: _cache[3] || (_cache[3] = ($event) => emits("interactOutside", $event)),
					onPointerDownOutside: _cache[4] || (_cache[4] = ($event) => emits("pointerDownOutside", $event))
				}), {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"as",
					"as-child",
					"present",
					"disable-outside-pointer-events",
					"aria-describedby",
					"aria-labelledby",
					"data-state"
				])]),
				_: 3
			}, 8, ["trapped", "present"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogContentModal.js
var DialogContentModal_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DialogContentModal",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		trapFocus: {
			type: Boolean,
			required: false
		},
		disableOutsidePointerEvents: {
			type: Boolean,
			required: false,
			default: true
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		present: {
			type: Boolean,
			required: true
		}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = injectDialogRootContext();
		const emitsAsProps = useEmitAsProps(emits);
		const { forwardRef, currentElement } = useForwardExpose();
		useHideOthers((0, vue_exports.computed)(() => props.present ? currentElement.value : void 0));
		const forwardedProps = (0, vue_exports.computed)(() => {
			const { present: _, ...rest } = props;
			return rest;
		});
		(0, vue_exports.watch)(() => props.present, (isPresent, wasPresent) => {
			if (!isPresent && wasPresent) rootContext.triggerElement.value?.focus();
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(DialogContentImpl_default, (0, vue_exports.mergeProps)({
				...forwardedProps.value,
				...(0, vue_exports.unref)(emitsAsProps)
			}, {
				ref: (0, vue_exports.unref)(forwardRef),
				present: _ctx.present,
				"trap-focus": (0, vue_exports.unref)(rootContext).open.value,
				"disable-outside-pointer-events": props.disableOutsidePointerEvents,
				onCloseAutoFocus: _cache[0] || (_cache[0] = (event) => {
					if (!event.defaultPrevented) {
						event.preventDefault();
						(0, vue_exports.unref)(rootContext).triggerElement.value?.focus();
					}
				}),
				onPointerDownOutside: _cache[1] || (_cache[1] = (event) => {
					const originalEvent = event.detail.originalEvent;
					const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
					if (originalEvent.button === 2 || ctrlLeftClick) event.preventDefault();
				}),
				onFocusOutside: _cache[2] || (_cache[2] = (event) => {
					event.preventDefault();
				})
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"present",
				"trap-focus",
				"disable-outside-pointer-events"
			]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogContentNonModal.js
var DialogContentNonModal_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DialogContentNonModal",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		trapFocus: {
			type: Boolean,
			required: false
		},
		disableOutsidePointerEvents: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		present: {
			type: Boolean,
			required: true
		}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emitsAsProps = useEmitAsProps(__emit);
		useForwardExpose();
		const rootContext = injectDialogRootContext();
		const hasInteractedOutsideRef = (0, vue_exports.ref)(false);
		const hasPointerDownOutsideRef = (0, vue_exports.ref)(false);
		const forwardedProps = (0, vue_exports.computed)(() => {
			const { present: _, ...rest } = props;
			return rest;
		});
		(0, vue_exports.watch)(() => props.present, (isPresent, wasPresent) => {
			if (!isPresent && wasPresent) {
				if (!hasInteractedOutsideRef.value) rootContext.triggerElement.value?.focus();
				hasInteractedOutsideRef.value = false;
				hasPointerDownOutsideRef.value = false;
			}
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(DialogContentImpl_default, (0, vue_exports.mergeProps)({
				...forwardedProps.value,
				...(0, vue_exports.unref)(emitsAsProps)
			}, {
				present: _ctx.present,
				"trap-focus": false,
				"disable-outside-pointer-events": false,
				onCloseAutoFocus: _cache[0] || (_cache[0] = (event) => {
					if (!event.defaultPrevented) {
						if (!hasInteractedOutsideRef.value) (0, vue_exports.unref)(rootContext).triggerElement.value?.focus();
						event.preventDefault();
					}
					hasInteractedOutsideRef.value = false;
					hasPointerDownOutsideRef.value = false;
				}),
				onInteractOutside: _cache[1] || (_cache[1] = (event) => {
					if (!event.defaultPrevented) {
						hasInteractedOutsideRef.value = true;
						if (event.detail.originalEvent.type === "pointerdown") hasPointerDownOutsideRef.value = true;
					}
					const target = event.target;
					if ((0, vue_exports.unref)(rootContext).triggerElement.value?.contains(target)) event.preventDefault();
					if (event.detail.originalEvent.type === "focusin" && hasPointerDownOutsideRef.value) event.preventDefault();
				})
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["present"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogContent.js
var DialogContent_default$1 = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DialogContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		disableOutsidePointerEvents: {
			type: Boolean,
			required: false,
			default: void 0
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = injectDialogRootContext();
		const emitsAsProps = useEmitAsProps(emits);
		const { forwardRef } = useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Presence_default), {
				present: _ctx.forceMount || (0, vue_exports.unref)(rootContext).open.value,
				"force-mount": _ctx.forceMount || !(0, vue_exports.unref)(rootContext).unmountOnHide.value
			}, {
				default: (0, vue_exports.withCtx)(({ present }) => [(0, vue_exports.unref)(rootContext).modal.value ? (0, vue_exports.withDirectives)(((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(DialogContentModal_default, (0, vue_exports.mergeProps)({
					key: 0,
					ref: (0, vue_exports.unref)(forwardRef),
					present: (0, vue_exports.unref)(rootContext).unmountOnHide.value || present
				}, {
					...props,
					...(0, vue_exports.unref)(emitsAsProps),
					..._ctx.$attrs
				}), {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 2
				}, 1040, ["present"])), [[vue_exports.vShow, (0, vue_exports.unref)(rootContext).unmountOnHide.value || present]]) : (0, vue_exports.withDirectives)(((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(DialogContentNonModal_default, (0, vue_exports.mergeProps)({
					key: 1,
					ref: (0, vue_exports.unref)(forwardRef),
					present: (0, vue_exports.unref)(rootContext).unmountOnHide.value || present
				}, {
					...props,
					...(0, vue_exports.unref)(emitsAsProps),
					..._ctx.$attrs
				}), {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 2
				}, 1040, ["present"])), [[vue_exports.vShow, (0, vue_exports.unref)(rootContext).unmountOnHide.value || present]])]),
				_: 3
			}, 8, ["present", "force-mount"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogDescription.js
var DialogDescription_default$1 = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DialogDescription",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "p"
		}
	},
	setup(__props) {
		const props = __props;
		useForwardExpose();
		const rootContext = injectDialogRootContext();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)(props, { id: (0, vue_exports.unref)(rootContext).descriptionId }), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogOverlayImpl.js
var DialogOverlayImpl_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DialogOverlayImpl",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		present: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectDialogRootContext();
		const scrollLocked = useBodyScrollLock(props.present);
		(0, vue_exports.watch)(() => props.present, (val) => scrollLocked.value = val);
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-state": (0, vue_exports.unref)(rootContext).open.value ? "open" : "closed",
				style: { "pointer-events": "auto" },
				onPointerdown: _cache[0] || (_cache[0] = (0, vue_exports.withModifiers)(() => {}, [
					"left",
					"self",
					"prevent"
				]))
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"data-state"
			]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogOverlay.js
var DialogOverlay_default$1 = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DialogOverlay",
	props: {
		forceMount: {
			type: Boolean,
			required: false
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
	setup(__props) {
		const rootContext = injectDialogRootContext();
		const { forwardRef } = useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.unref)(rootContext)?.modal.value ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Presence_default), {
				key: 0,
				present: _ctx.forceMount || (0, vue_exports.unref)(rootContext).open.value,
				"force-mount": _ctx.forceMount || !(0, vue_exports.unref)(rootContext).unmountOnHide.value
			}, {
				default: (0, vue_exports.withCtx)(({ present }) => [(0, vue_exports.withDirectives)((0, vue_exports.createVNode)(DialogOverlayImpl_default, (0, vue_exports.mergeProps)(_ctx.$attrs, {
					ref: (0, vue_exports.unref)(forwardRef),
					as: _ctx.as,
					"as-child": _ctx.asChild,
					present: (0, vue_exports.unref)(rootContext).unmountOnHide.value || present
				}), {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 2
				}, 1040, [
					"as",
					"as-child",
					"present"
				]), [[vue_exports.vShow, (0, vue_exports.unref)(rootContext).unmountOnHide.value || present]])]),
				_: 3
			}, 8, ["present", "force-mount"])) : (0, vue_exports.createCommentVNode)("v-if", true);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Teleport/Teleport.js
var Teleport_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "Teleport",
	props: {
		to: {
			type: null,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		defer: {
			type: Boolean,
			required: false
		},
		forceMount: {
			type: Boolean,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const configContext = injectConfigProviderContext({});
		const target = (0, vue_exports.computed)(() => props.to ?? configContext.teleportTo?.value ?? "body");
		const isMounted = useMounted();
		return (_ctx, _cache) => {
			return (0, vue_exports.unref)(isMounted) || _ctx.forceMount ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(vue_exports.Teleport, {
				key: 0,
				to: target.value,
				disabled: _ctx.disabled,
				defer: _ctx.defer
			}, [(0, vue_exports.renderSlot)(_ctx.$slots, "default")], 8, [
				"to",
				"disabled",
				"defer"
			])) : (0, vue_exports.createCommentVNode)("v-if", true);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogPortal.js
var DialogPortal_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DialogPortal",
	props: {
		to: {
			type: null,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		defer: {
			type: Boolean,
			required: false
		},
		forceMount: {
			type: Boolean,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Teleport_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)(props)), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogTitle.js
var DialogTitle_default$1 = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DialogTitle",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "h2"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectDialogRootContext();
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)(props, { id: (0, vue_exports.unref)(rootContext).titleId }), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Dialog/DialogTrigger.js
var DialogTrigger_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DialogTrigger",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectDialogRootContext();
		const { forwardRef} = useForwardExpose();
		rootContext.contentId ||= useId(void 0, "reka-dialog-content");
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)(props, {
				ref: (0, vue_exports.unref)(forwardRef),
				type: _ctx.as === "button" ? "button" : void 0,
				"aria-haspopup": "dialog",
				"aria-expanded": (0, vue_exports.unref)(rootContext).open.value || false,
				"aria-controls": (0, vue_exports.unref)(rootContext).open.value ? (0, vue_exports.unref)(rootContext).contentId : void 0,
				"data-state": (0, vue_exports.unref)(rootContext).open.value ? "open" : "closed",
				onClick: (0, vue_exports.unref)(rootContext).onOpenToggle
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"type",
				"aria-expanded",
				"aria-controls",
				"data-state",
				"onClick"
			]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/VisuallyHidden/VisuallyHidden.js
var VisuallyHidden_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "VisuallyHidden",
	props: {
		feature: {
			type: String,
			required: false,
			default: "focusable"
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
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"aria-hidden": _ctx.feature === "focusable" || _ctx.feature === "fully-hidden" ? "true" : void 0,
				"data-hidden": _ctx.feature === "fully-hidden" ? "" : void 0,
				tabindex: _ctx.feature === "fully-hidden" ? "-1" : void 0,
				style: {
					position: "absolute",
					border: 0,
					width: "1px",
					height: "1px",
					padding: 0,
					margin: "-1px",
					overflow: "hidden",
					clip: "rect(0, 0, 0, 0)",
					clipPath: "inset(50%)",
					whiteSpace: "nowrap",
					wordWrap: "normal",
					top: "-1px",
					left: "-1px"
				}
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"aria-hidden",
				"data-hidden",
				"tabindex"
			]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/VisuallyHidden/VisuallyHiddenInputBubble.js
var VisuallyHiddenInputBubble_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "VisuallyHiddenInputBubble",
	props: {
		name: {
			type: String,
			required: true
		},
		value: {
			type: null,
			required: true
		},
		checked: {
			type: Boolean,
			required: false,
			default: void 0
		},
		required: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		feature: {
			type: String,
			required: false,
			default: "fully-hidden"
		}
	},
	setup(__props) {
		const props = __props;
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const valueState = (0, vue_exports.computed)(() => props.checked ?? props.value);
		(0, vue_exports.watch)(valueState, (cur, prev) => {
			if (!currentElement.value) return;
			const input = currentElement.value;
			const inputProto = (void 0).HTMLInputElement.prototype;
			const setValue = Object.getOwnPropertyDescriptor(inputProto, "value").set;
			if (setValue && cur !== prev) {
				const inputEvent = new Event("input", { bubbles: true });
				const changeEvent = new Event("change", { bubbles: true });
				setValue.call(input, cur);
				input.dispatchEvent(inputEvent);
				input.dispatchEvent(changeEvent);
			}
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(VisuallyHidden_default, (0, vue_exports.mergeProps)({
				ref_key: "primitiveElement",
				ref: primitiveElement
			}, {
				...props,
				..._ctx.$attrs
			}, { as: "input" }), null, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/VisuallyHidden/VisuallyHiddenInput.js
var VisuallyHiddenInput_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "VisuallyHiddenInput",
	props: {
		name: {
			type: String,
			required: true
		},
		value: {
			type: null,
			required: true
		},
		checked: {
			type: Boolean,
			required: false,
			default: void 0
		},
		required: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		feature: {
			type: String,
			required: false,
			default: "fully-hidden"
		}
	},
	setup(__props) {
		const props = __props;
		const isFormArrayEmptyAndRequired = (0, vue_exports.computed)(() => typeof props.value === "object" && Array.isArray(props.value) && props.value.length === 0 && props.required);
		const parsedValue = (0, vue_exports.computed)(() => {
			if (typeof props.value === "string" || typeof props.value === "number" || typeof props.value === "boolean" || props.value === null || props.value === void 0) return [{
				name: props.name,
				value: props.value
			}];
			else if (typeof props.value === "object" && Array.isArray(props.value)) return props.value.flatMap((obj, index) => {
				if (typeof obj === "object") return Object.entries(obj).map(([key, value]) => ({
					name: `${props.name}[${index}][${key}]`,
					value
				}));
				else return {
					name: `${props.name}[${index}]`,
					value: obj
				};
			});
			else if (props.value !== null && typeof props.value === "object" && !Array.isArray(props.value)) return Object.entries(props.value).map(([key, value]) => ({
				name: `${props.name}[${key}]`,
				value
			}));
			return [];
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)(vue_exports.Fragment, null, [(0, vue_exports.createCommentVNode)(" We render single input if it's required "), isFormArrayEmptyAndRequired.value ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(VisuallyHiddenInputBubble_default, (0, vue_exports.mergeProps)({ key: _ctx.name }, {
				...props,
				..._ctx.$attrs
			}, {
				name: _ctx.name,
				value: _ctx.value
			}), null, 16, ["name", "value"])) : ((0, vue_exports.openBlock)(true), (0, vue_exports.createElementBlock)(vue_exports.Fragment, { key: 1 }, (0, vue_exports.renderList)(parsedValue.value, (parsed) => {
				return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(VisuallyHiddenInputBubble_default, (0, vue_exports.mergeProps)({ key: parsed.name }, { ref_for: true }, {
					...props,
					..._ctx.$attrs
				}, {
					name: parsed.name,
					value: parsed.value
				}), null, 16, ["name", "value"]);
			}), 128))], 2112);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Listbox/utils.js
function valueComparator(value, currentValue, comparator) {
	if (value === void 0) return false;
	else if (Array.isArray(value)) return value.some((val) => compare(val, currentValue, comparator));
	else return compare(value, currentValue, comparator);
}
function compare(value, currentValue, comparator) {
	if (value === void 0 || currentValue === void 0) return false;
	if (typeof value === "string") return value === currentValue;
	if (typeof comparator === "function") return comparator(value, currentValue);
	if (typeof comparator === "string") return value?.[comparator] === currentValue?.[comparator];
	return isEqual(value, currentValue);
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Listbox/ListboxRoot.js
var [injectListboxRootContext, provideListboxRootContext] = /*#__PURE__*/ createContext("ListboxRoot");
var [injectListboxHighlightScrollContext, provideListboxHighlightScrollContext] = /*#__PURE__*/ createContext("ListboxHighlightScroll");
var ListboxRoot_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "ListboxRoot",
	props: {
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		},
		multiple: {
			type: Boolean,
			required: false
		},
		orientation: {
			type: String,
			required: false,
			default: "vertical"
		},
		dir: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		selectionBehavior: {
			type: String,
			required: false,
			default: "toggle"
		},
		highlightOnHover: {
			type: Boolean,
			required: false
		},
		by: {
			type: [String, Function],
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		}
	},
	emits: [
		"update:modelValue",
		"highlight",
		"entryFocus",
		"leave"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { multiple, highlightOnHover, orientation, disabled, selectionBehavior, dir: propDir } = (0, vue_exports.toRefs)(props);
		const { getItems } = useCollection({ isProvider: true });
		const { handleTypeaheadSearch } = useTypeahead();
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const kbd = useKbd();
		const dir = useDirection(propDir);
		const highlightScrollContext = injectListboxHighlightScrollContext(null);
		provideListboxHighlightScrollContext({
			suppressHighlightScroll: (0, vue_exports.ref)(false),
			onHighlightScrollRequest: () => {}
		});
		const isFormControl = useFormControl(currentElement);
		const firstValue = (0, vue_exports.ref)();
		const isUserAction = (0, vue_exports.ref)(false);
		const focusable = (0, vue_exports.ref)(true);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? (multiple.value ? [] : void 0),
			passive: props.modelValue === void 0,
			deep: true
		});
		function onValueChange(val) {
			isUserAction.value = true;
			if (props.multiple) {
				const modelArray = Array.isArray(modelValue.value) ? [...modelValue.value] : [];
				const index = modelArray.findIndex((i) => compare(i, val, props.by));
				if (props.selectionBehavior === "toggle") {
					index === -1 ? modelArray.push(val) : modelArray.splice(index, 1);
					modelValue.value = modelArray;
				} else {
					modelValue.value = [val];
					firstValue.value = val;
				}
			} else if (props.selectionBehavior === "toggle") if (compare(modelValue.value, val, props.by)) modelValue.value = void 0;
			else modelValue.value = val;
			else modelValue.value = val;
			setTimeout(() => {
				isUserAction.value = false;
			}, 1);
		}
		const highlightedElement = (0, vue_exports.ref)(null);
		const previousElement = (0, vue_exports.ref)(null);
		const isVirtual = (0, vue_exports.ref)(false);
		const isComposing = (0, vue_exports.ref)(false);
		const virtualFocusHook = createEventHook();
		const virtualKeydownHook = createEventHook();
		const virtualHighlightHook = createEventHook();
		function getCollectionItem() {
			return getItems().map((i) => i.ref).filter((i) => i.dataset.disabled !== "");
		}
		function changeHighlight(el, scrollIntoView = true, focus) {
			if (!el) return;
			highlightedElement.value = el;
			const suppressHighlightScroll = highlightScrollContext?.suppressHighlightScroll.value ?? false;
			if (focus ?? focusable.value) if (suppressHighlightScroll) highlightedElement.value.focus({ preventScroll: true });
			else highlightedElement.value.focus();
			if (suppressHighlightScroll) highlightScrollContext?.onHighlightScrollRequest(scrollIntoView ? () => {
				const element = highlightedElement.value;
				if (element?.isConnected) element.scrollIntoView({ block: "nearest" });
			} : void 0);
			else if (scrollIntoView) highlightedElement.value.scrollIntoView({ block: "nearest" });
			const highlightedItem = getItems().find((i) => i.ref === el);
			emits("highlight", highlightedItem);
		}
		function highlightItem(value) {
			if (isVirtual.value) virtualHighlightHook.trigger(value);
			else {
				const item = getItems().find((i) => compare(i.value, value, props.by));
				if (item) {
					highlightedElement.value = item.ref;
					changeHighlight(item.ref);
				}
			}
		}
		function onKeydownEnter(event) {
			if (highlightedElement.value && highlightedElement.value.isConnected) {
				if (event.ctrlKey || event.metaKey || event.altKey) return;
				event.preventDefault();
				event.stopPropagation();
				if (!isComposing.value) highlightedElement.value.click();
			}
		}
		function onKeydownTypeAhead(event) {
			if (!focusable.value) return;
			isUserAction.value = true;
			if (isVirtual.value) virtualKeydownHook.trigger(event);
			else {
				const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;
				if (isMetaKey && event.key === "a" && multiple.value) {
					const collection = getItems();
					const values = collection.map((i) => i.value);
					modelValue.value = [...values];
					event.preventDefault();
					const lastItem = collection.at(-1);
					if (lastItem) changeHighlight(lastItem.ref);
				} else if (!isMetaKey) {
					const el = handleTypeaheadSearch(event.key, getItems());
					if (el) changeHighlight(el);
				}
			}
			setTimeout(() => {
				isUserAction.value = false;
			}, 1);
		}
		function onCompositionStart() {
			isComposing.value = true;
		}
		function onCompositionEnd() {
			(0, vue_exports.nextTick)(() => {
				isComposing.value = false;
			});
		}
		function highlightFirstItem() {
			(0, vue_exports.nextTick)(() => {
				onKeydownNavigation(new KeyboardEvent("keydown", { key: "PageUp" }));
			});
		}
		function onLeave(event) {
			const el = highlightedElement.value;
			if (el?.isConnected) previousElement.value = el;
			highlightedElement.value = null;
			emits("leave", event);
		}
		function onEnter(event) {
			const entryFocusEvent = new CustomEvent("listbox.entryFocus", {
				bubbles: false,
				cancelable: true
			});
			event.currentTarget?.dispatchEvent(entryFocusEvent);
			emits("entryFocus", entryFocusEvent);
			if (entryFocusEvent.defaultPrevented) return;
			if (previousElement.value) changeHighlight(previousElement.value);
			else {
				const el = getCollectionItem()?.[0];
				changeHighlight(el);
			}
		}
		function onKeydownNavigation(event) {
			const intent = getFocusIntent(event, orientation.value, dir.value);
			if (!intent) return;
			let collection = getCollectionItem();
			if (highlightedElement.value) {
				if (intent === "last") collection.reverse();
				else if (intent === "prev" || intent === "next") {
					if (intent === "prev") collection.reverse();
					const currentIndex = collection.indexOf(highlightedElement.value);
					collection = collection.slice(currentIndex + 1);
				}
				handleMultipleReplace(event, collection[0]);
			}
			if (collection.length) {
				const index = !highlightedElement.value && intent === "prev" ? collection.length - 1 : 0;
				changeHighlight(collection[index]);
			}
			if (isVirtual.value) return virtualKeydownHook.trigger(event);
		}
		function handleMultipleReplace(event, targetEl) {
			if (isVirtual.value || props.selectionBehavior !== "replace" || !multiple.value || !Array.isArray(modelValue.value)) return;
			if ((event.altKey || event.ctrlKey || event.metaKey) && !event.shiftKey) return;
			if (event.shiftKey) {
				const collection = getItems().filter((i) => i.ref.dataset.disabled !== "");
				let lastValue = collection.find((i) => i.ref === targetEl)?.value;
				if (event.key === kbd.END) lastValue = collection.at(-1)?.value;
				else if (event.key === kbd.HOME) lastValue = collection[0]?.value;
				if (!lastValue || !firstValue.value) return;
				const values = findValuesBetween(collection.map((i) => i.value), firstValue.value, lastValue);
				modelValue.value = values;
			}
		}
		async function highlightSelected(event, scroll = true) {}
		let hasHighlightedOnMount = false;
		(0, vue_exports.watch)(modelValue, () => {
			if (!isUserAction.value) {
				const scroll = hasHighlightedOnMount;
				hasHighlightedOnMount = true;
				(0, vue_exports.nextTick)(() => {
					highlightSelected(void 0, scroll);
				});
			}
		}, {
			immediate: true,
			deep: true
		});
		__expose({
			highlightedElement,
			highlightItem,
			highlightFirstItem,
			highlightSelected,
			getItems
		});
		provideListboxRootContext({
			modelValue,
			onValueChange,
			multiple,
			orientation,
			dir,
			disabled,
			highlightOnHover,
			highlightedElement,
			isVirtual,
			virtualFocusHook,
			virtualKeydownHook,
			virtualHighlightHook,
			by: props.by,
			firstValue,
			selectionBehavior,
			focusable,
			onLeave,
			onEnter,
			changeHighlight,
			onKeydownEnter,
			onKeydownNavigation,
			onKeydownTypeAhead,
			onCompositionStart,
			onCompositionEnd,
			highlightFirstItem
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				dir: (0, vue_exports.unref)(dir),
				"data-disabled": (0, vue_exports.unref)(disabled) ? "" : void 0,
				onPointerleave: onLeave,
				onFocusout: _cache[0] || (_cache[0] = async (event) => {
					const target = event.relatedTarget || event.target;
					await (0, vue_exports.nextTick)();
					if (highlightedElement.value && (0, vue_exports.unref)(currentElement) && !(0, vue_exports.unref)(currentElement).contains(target)) onLeave(event);
				})
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue_exports.unref)(modelValue) }), (0, vue_exports.unref)(isFormControl) && _ctx.name ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(VisuallyHiddenInput_default), {
					key: 0,
					name: _ctx.name,
					value: (0, vue_exports.unref)(modelValue),
					disabled: (0, vue_exports.unref)(disabled),
					required: _ctx.required
				}, null, 8, [
					"name",
					"value",
					"disabled",
					"required"
				])) : (0, vue_exports.createCommentVNode)("v-if", true)]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"dir",
				"data-disabled"
			]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Listbox/ListboxContent.js
var ListboxContent_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "ListboxContent",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const { CollectionSlot } = useCollection();
		const rootContext = injectListboxRootContext();
		const isClickFocus = refAutoReset(false, 10);
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(CollectionSlot), null, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(Primitive), {
					role: "listbox",
					as: _ctx.as,
					"as-child": _ctx.asChild,
					tabindex: (0, vue_exports.unref)(rootContext).focusable.value ? (0, vue_exports.unref)(rootContext).highlightedElement.value ? "-1" : "0" : "-1",
					"aria-orientation": (0, vue_exports.unref)(rootContext).orientation.value,
					"aria-multiselectable": !!(0, vue_exports.unref)(rootContext).multiple.value,
					"data-orientation": (0, vue_exports.unref)(rootContext).orientation.value,
					onMousedown: _cache[0] || (_cache[0] = (0, vue_exports.withModifiers)(($event) => isClickFocus.value = true, ["left"])),
					onFocus: _cache[1] || (_cache[1] = (ev) => {
						if ((0, vue_exports.unref)(isClickFocus)) return;
						(0, vue_exports.unref)(rootContext).onEnter(ev);
					}),
					onKeydown: [
						_cache[2] || (_cache[2] = (0, vue_exports.withKeys)((event) => {
							if ((0, vue_exports.unref)(rootContext).orientation.value === "vertical" && (event.key === "ArrowLeft" || event.key === "ArrowRight") || (0, vue_exports.unref)(rootContext).orientation.value === "horizontal" && (event.key === "ArrowUp" || event.key === "ArrowDown")) return;
							event.preventDefault();
							(0, vue_exports.unref)(rootContext).focusable.value && (0, vue_exports.unref)(rootContext).onKeydownNavigation(event);
						}, [
							"down",
							"up",
							"left",
							"right",
							"home",
							"end"
						])),
						(0, vue_exports.withKeys)((0, vue_exports.unref)(rootContext).onKeydownEnter, ["enter"]),
						(0, vue_exports.unref)(rootContext).onKeydownTypeAhead
					]
				}, {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"as",
					"as-child",
					"tabindex",
					"aria-orientation",
					"aria-multiselectable",
					"data-orientation",
					"onKeydown"
				])]),
				_: 3
			});
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Listbox/ListboxFilter.js
var ListboxFilter_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "ListboxFilter",
	props: {
		modelValue: {
			type: String,
			required: false
		},
		autoFocus: {
			type: Boolean,
			required: false
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
			default: "input"
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const modelValue = useVModel(props, "modelValue", __emit, {
			defaultValue: "",
			passive: props.modelValue === void 0
		});
		const rootContext = injectListboxRootContext();
		const { primitiveElement} = usePrimitiveElement();
		const disabled = (0, vue_exports.computed)(() => props.disabled || rootContext.disabled.value || false);
		const activedescendant = (0, vue_exports.ref)();
		(0, vue_exports.watchSyncEffect)(() => activedescendant.value = rootContext.highlightedElement.value?.id);
		const { isComposing, shouldDeferInput, handleCompositionStart, handleCompositionUpdate, handleCompositionEnd } = useComposing((event) => {
			modelValue.value = event.target.value;
			rootContext.onCompositionEnd();
			rootContext.highlightFirstItem();
		});
		function onCompositionStart() {
			rootContext.onCompositionStart();
			handleCompositionStart();
		}
		function handleInput(event) {
			if (shouldDeferInput.value) return;
			modelValue.value = event.target.value;
			rootContext.highlightFirstItem();
		}
		function handleKeydownNavigation(event) {
			if (isComposing.value) return;
			event.preventDefault();
			rootContext.onKeydownNavigation(event);
		}
		function handleKeydownEnter(event) {
			if (isComposing.value) return;
			rootContext.onKeydownEnter(event);
		}
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				value: (0, vue_exports.unref)(modelValue),
				disabled: disabled.value ? "" : void 0,
				"data-disabled": disabled.value ? "" : void 0,
				"aria-disabled": disabled.value ?? void 0,
				"aria-activedescendant": activedescendant.value,
				type: "text",
				onKeydown: [(0, vue_exports.withKeys)(handleKeydownNavigation, [
					"down",
					"up",
					"home",
					"end"
				]), (0, vue_exports.withKeys)(handleKeydownEnter, ["enter"])],
				onInput: handleInput,
				onCompositionstart: onCompositionStart,
				onCompositionupdate: (0, vue_exports.unref)(handleCompositionUpdate),
				onCompositionend: (0, vue_exports.unref)(handleCompositionEnd)
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue_exports.unref)(modelValue) })]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"value",
				"disabled",
				"data-disabled",
				"aria-disabled",
				"aria-activedescendant",
				"onCompositionupdate",
				"onCompositionend"
			]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Listbox/ListboxGroup.js
var [injectListboxGroupContext, provideListboxGroupContext] = /*#__PURE__*/ createContext("ListboxGroup");
var ListboxGroup_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "ListboxGroup",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const id = useId(void 0, "reka-listbox-group");
		provideListboxGroupContext({ id });
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)({ role: "group" }, props, { "aria-labelledby": (0, vue_exports.unref)(id) }), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["aria-labelledby"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Listbox/ListboxGroupLabel.js
var ListboxGroupLabel_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "ListboxGroupLabel",
	props: {
		for: {
			type: String,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "div"
		}
	},
	setup(__props) {
		const props = __props;
		const groupContext = injectListboxGroupContext({ id: "" });
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)(props, { id: (0, vue_exports.unref)(groupContext).id }), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Listbox/ListboxItem.js
var LISTBOX_SELECT = "listbox.select";
var [injectListboxItemContext, provideListboxItemContext] = /*#__PURE__*/ createContext("ListboxItem");
var ListboxItem_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "ListboxItem",
	props: {
		value: {
			type: null,
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
			default: "div"
		}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const id = useId(void 0, "reka-listbox-item");
		const { CollectionItem } = useCollection();
		const { forwardRef, currentElement } = useForwardExpose();
		const rootContext = injectListboxRootContext();
		const isHighlighted = (0, vue_exports.computed)(() => currentElement.value != null && currentElement.value === rootContext.highlightedElement.value);
		const isSelected = (0, vue_exports.computed)(() => valueComparator(rootContext.modelValue.value, props.value, rootContext.by));
		const disabled = (0, vue_exports.computed)(() => rootContext.disabled.value || props.disabled);
		async function handleSelect(ev) {
			emits("select", ev);
			if (ev?.defaultPrevented) return;
			if (!disabled.value && ev) {
				rootContext.onValueChange(props.value);
				rootContext.changeHighlight(currentElement.value);
			}
		}
		function handleSelectCustomEvent(ev) {
			const eventDetail = {
				originalEvent: ev,
				value: props.value
			};
			handleAndDispatchCustomEvent(LISTBOX_SELECT, handleSelect, eventDetail);
		}
		provideListboxItemContext({ isSelected });
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(CollectionItem), { value: _ctx.value }, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.withMemo)([
					isHighlighted.value,
					isSelected.value,
					disabled.value,
					(0, vue_exports.unref)(rootContext).focusable.value
				], () => (0, vue_exports.createVNode)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)({ id: (0, vue_exports.unref)(id) }, _ctx.$attrs, {
					ref: (0, vue_exports.unref)(forwardRef),
					role: "option",
					tabindex: (0, vue_exports.unref)(rootContext).focusable.value ? isHighlighted.value ? "0" : "-1" : -1,
					"aria-selected": isSelected.value,
					as: _ctx.as,
					"as-child": _ctx.asChild,
					disabled: disabled.value ? "" : void 0,
					"data-disabled": disabled.value ? "" : void 0,
					"data-highlighted": isHighlighted.value ? "" : void 0,
					"data-state": isSelected.value ? "checked" : "unchecked",
					onClick: handleSelectCustomEvent,
					onKeydown: (0, vue_exports.withKeys)((0, vue_exports.withModifiers)(handleSelectCustomEvent, ["prevent"]), ["space"]),
					onPointermove: _cache[0] || (_cache[0] = () => {
						if ((0, vue_exports.unref)(rootContext).highlightedElement.value === (0, vue_exports.unref)(currentElement)) return;
						if ((0, vue_exports.unref)(rootContext).highlightOnHover.value) (0, vue_exports.unref)(rootContext).changeHighlight((0, vue_exports.unref)(currentElement), false, false);
					})
				}), {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"tabindex",
					"aria-selected",
					"as",
					"as-child",
					"disabled",
					"data-disabled",
					"data-highlighted",
					"data-state",
					"onKeydown"
				]), _cache, 1)]),
				_: 3
			}, 8, ["value"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Popper/PopperRoot.js
var [injectPopperRootContext, providePopperRootContext] = /*#__PURE__*/ createContext("PopperRoot");
var PopperRoot_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "PopperRoot",
	setup(__props) {
		const anchor = (0, vue_exports.ref)();
		providePopperRootContext({
			anchor,
			onAnchorChange: (element) => anchor.value = element
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.renderSlot)(_ctx.$slots, "default");
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Popper/PopperAnchor.js
var PopperAnchor_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "PopperAnchor",
	props: {
		reference: {
			type: null,
			required: false
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
	setup(__props) {
		const props = __props;
		const { forwardRef, currentElement } = useForwardExpose();
		const rootContext = injectPopperRootContext();
		(0, vue_exports.watchPostEffect)(() => {
			rootContext.onAnchorChange(props.reference ?? currentElement.value);
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), {
				ref: (0, vue_exports.unref)(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["as", "as-child"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Popper/utils.js
function isNotNull(value) {
	return value !== null;
}
function transformOrigin(options) {
	return {
		name: "transformOrigin",
		options,
		fn(data) {
			const { placement, rects, middlewareData } = data;
			const isArrowHidden = middlewareData.arrow?.centerOffset !== 0;
			const arrowWidth = isArrowHidden ? 0 : options.arrowWidth;
			const arrowHeight = isArrowHidden ? 0 : options.arrowHeight;
			const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement);
			const noArrowAlignX = {
				start: options.dir === "rtl" ? "100%" : "0%",
				center: "50%",
				end: options.dir === "rtl" ? "0%" : "100%"
			}[placedAlign];
			const noArrowAlignY = {
				start: "0%",
				center: "50%",
				end: "100%"
			}[placedAlign];
			const arrowXCenter = (middlewareData.arrow?.x ?? 0) + arrowWidth / 2;
			const arrowYCenter = (middlewareData.arrow?.y ?? 0) + arrowHeight / 2;
			let x = "";
			let y = "";
			if (placedSide === "bottom") {
				x = isArrowHidden ? noArrowAlignX : `${arrowXCenter}px`;
				y = `${-arrowHeight}px`;
			} else if (placedSide === "top") {
				x = isArrowHidden ? noArrowAlignX : `${arrowXCenter}px`;
				y = `${rects.floating.height + arrowHeight}px`;
			} else if (placedSide === "right") {
				x = `${-arrowHeight}px`;
				y = isArrowHidden ? noArrowAlignY : `${arrowYCenter}px`;
			} else if (placedSide === "left") {
				x = `${rects.floating.width + arrowHeight}px`;
				y = isArrowHidden ? noArrowAlignY : `${arrowYCenter}px`;
			}
			return { data: {
				x,
				y
			} };
		}
	};
}
function getSideAndAlignFromPlacement(placement) {
	const [side, align = "center"] = placement.split("-");
	return [side, align];
}
//#endregion
//#region ../node_modules/.pnpm/@floating-ui+utils@0.2.12/node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
/**
* Custom positioning reference element.
* @see https://floating-ui.com/docs/virtual-elements
*/
var sides = [
	"top",
	"right",
	"bottom",
	"left"
];
var min = Math.min;
var max = Math.max;
var round = Math.round;
var floor = Math.floor;
var createCoords = (v) => ({
	x: v,
	y: v
});
var oppositeSideMap = {
	left: "right",
	right: "left",
	bottom: "top",
	top: "bottom"
};
function clamp(start, value, end) {
	return max(start, min(value, end));
}
function evaluate(value, param) {
	return typeof value === "function" ? value(param) : value;
}
function getSide(placement) {
	return placement.split("-")[0];
}
function getAlignment(placement) {
	return placement.split("-")[1];
}
function getOppositeAxis(axis) {
	return axis === "x" ? "y" : "x";
}
function getAxisLength(axis) {
	return axis === "y" ? "height" : "width";
}
function getSideAxis(placement) {
	const firstChar = placement[0];
	return firstChar === "t" || firstChar === "b" ? "y" : "x";
}
function getAlignmentAxis(placement) {
	return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
	if (rtl === void 0) rtl = false;
	const alignment = getAlignment(placement);
	const alignmentAxis = getAlignmentAxis(placement);
	const length = getAxisLength(alignmentAxis);
	let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
	if (rects.reference[length] > rects.floating[length]) mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
	return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
	const oppositePlacement = getOppositePlacement(placement);
	return [
		getOppositeAlignmentPlacement(placement),
		oppositePlacement,
		getOppositeAlignmentPlacement(oppositePlacement)
	];
}
function getOppositeAlignmentPlacement(placement) {
	return placement.includes("start") ? placement.replace("start", "end") : placement.replace("end", "start");
}
var lrPlacement = ["left", "right"];
var rlPlacement = ["right", "left"];
var tbPlacement = ["top", "bottom"];
var btPlacement = ["bottom", "top"];
function getSideList(side, isStart, rtl) {
	switch (side) {
		case "top":
		case "bottom":
			if (rtl) return isStart ? rlPlacement : lrPlacement;
			return isStart ? lrPlacement : rlPlacement;
		case "left":
		case "right": return isStart ? tbPlacement : btPlacement;
		default: return [];
	}
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
	const alignment = getAlignment(placement);
	let list = getSideList(getSide(placement), direction === "start", rtl);
	if (alignment) {
		list = list.map((side) => side + "-" + alignment);
		if (flipAlignment) list = list.concat(list.map(getOppositeAlignmentPlacement));
	}
	return list;
}
function getOppositePlacement(placement) {
	const side = getSide(placement);
	return oppositeSideMap[side] + placement.slice(side.length);
}
function expandPaddingObject(padding) {
	var _padding$top, _padding$right, _padding$bottom, _padding$left;
	return {
		top: (_padding$top = padding.top) != null ? _padding$top : 0,
		right: (_padding$right = padding.right) != null ? _padding$right : 0,
		bottom: (_padding$bottom = padding.bottom) != null ? _padding$bottom : 0,
		left: (_padding$left = padding.left) != null ? _padding$left : 0
	};
}
function getPaddingObject(padding) {
	return typeof padding !== "number" ? expandPaddingObject(padding) : {
		top: padding,
		right: padding,
		bottom: padding,
		left: padding
	};
}
function rectToClientRect(rect) {
	const { x, y, width, height } = rect;
	return {
		width,
		height,
		top: y,
		left: x,
		right: x + width,
		bottom: y + height,
		x,
		y
	};
}
//#endregion
//#region ../node_modules/.pnpm/@floating-ui+core@1.8.0/node_modules/@floating-ui/core/dist/floating-ui.core.mjs
function computeCoordsFromPlacement(_ref, placement, rtl) {
	let { reference, floating } = _ref;
	const sideAxis = getSideAxis(placement);
	const alignmentAxis = getAlignmentAxis(placement);
	const alignLength = getAxisLength(alignmentAxis);
	const side = getSide(placement);
	const isVertical = sideAxis === "y";
	const commonX = reference.x + reference.width / 2 - floating.width / 2;
	const commonY = reference.y + reference.height / 2 - floating.height / 2;
	const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
	let coords;
	switch (side) {
		case "top":
			coords = {
				x: commonX,
				y: reference.y - floating.height
			};
			break;
		case "bottom":
			coords = {
				x: commonX,
				y: reference.y + reference.height
			};
			break;
		case "right":
			coords = {
				x: reference.x + reference.width,
				y: commonY
			};
			break;
		case "left":
			coords = {
				x: reference.x - floating.width,
				y: commonY
			};
			break;
		default: coords = {
			x: reference.x,
			y: reference.y
		};
	}
	const alignment = getAlignment(placement);
	if (alignment) coords[alignmentAxis] += commonAlign * (alignment === "end" ? 1 : -1) * (rtl && isVertical ? -1 : 1);
	return coords;
}
/**
* Resolves with an object of overflow side offsets that determine how much the
* element is overflowing a given clipping boundary on each side.
* - positive = overflowing the boundary by that number of pixels
* - negative = how many pixels left before it will overflow
* - 0 = lies flush with the boundary
* @see https://floating-ui.com/docs/detectOverflow
*/
async function detectOverflow(state, options) {
	var _await$platform$isEle;
	if (options === void 0) options = {};
	const { x, y, platform, rects, elements, strategy } = state;
	const { boundary = "clippingAncestors", rootBoundary = "viewport", elementContext = "floating", altBoundary = false, padding = 0 } = evaluate(options, state);
	const paddingObject = getPaddingObject(padding);
	const element = elements[altBoundary ? elementContext === "floating" ? "reference" : "floating" : elementContext];
	const clippingClientRect = rectToClientRect(await platform.getClippingRect({
		element: ((_await$platform$isEle = await (platform.isElement == null ? void 0 : platform.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform.getDocumentElement == null ? void 0 : platform.getDocumentElement(elements.floating)),
		boundary,
		rootBoundary,
		strategy
	}));
	const rect = elementContext === "floating" ? {
		x,
		y,
		width: rects.floating.width,
		height: rects.floating.height
	} : rects.reference;
	const offsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(elements.floating));
	const offsetScale = await (platform.isElement == null ? void 0 : platform.isElement(offsetParent)) && await (platform.getScale == null ? void 0 : platform.getScale(offsetParent)) || {
		x: 1,
		y: 1
	};
	const elementClientRect = rectToClientRect(platform.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform.convertOffsetParentRelativeRectToViewportRelativeRect({
		elements,
		rect,
		offsetParent,
		strategy
	}) : rect);
	return {
		top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
		bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
		left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
		right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
	};
}
var MAX_RESET_COUNT = 50;
/**
* Computes the `x` and `y` coordinates that will place the floating element
* next to a given reference element.
*
* This export does not have any `platform` interface logic. You will need to
* write one for the platform you are using Floating UI with.
*/
var computePosition$1 = async (reference, floating, config) => {
	const { placement = "bottom", strategy = "absolute", middleware = [], platform } = config;
	const platformWithDetectOverflow = platform.detectOverflow ? platform : {
		...platform,
		detectOverflow
	};
	const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(floating));
	let rects = await platform.getElementRects({
		reference,
		floating,
		strategy
	});
	let { x, y } = computeCoordsFromPlacement(rects, placement, rtl);
	let statefulPlacement = placement;
	let resetCount = 0;
	const middlewareData = {};
	for (let i = 0; i < middleware.length; i++) {
		const currentMiddleware = middleware[i];
		if (!currentMiddleware) continue;
		const { name, fn } = currentMiddleware;
		const { x: nextX, y: nextY, data, reset } = await fn({
			x,
			y,
			initialPlacement: placement,
			placement: statefulPlacement,
			strategy,
			middlewareData,
			rects,
			platform: platformWithDetectOverflow,
			elements: {
				reference,
				floating
			}
		});
		x = nextX != null ? nextX : x;
		y = nextY != null ? nextY : y;
		middlewareData[name] = {
			...middlewareData[name],
			...data
		};
		if (reset && resetCount < MAX_RESET_COUNT) {
			resetCount++;
			if (typeof reset === "object") {
				if (reset.placement) statefulPlacement = reset.placement;
				if (reset.rects) rects = reset.rects === true ? await platform.getElementRects({
					reference,
					floating,
					strategy
				}) : reset.rects;
				({x, y} = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
			}
			i = -1;
		}
	}
	return {
		x,
		y,
		placement: statefulPlacement,
		strategy,
		middlewareData
	};
};
/**
* Provides data to position an inner element of the floating element so that it
* appears centered to the reference element.
* @see https://floating-ui.com/docs/arrow
*/
var arrow$2 = (options) => ({
	name: "arrow",
	options,
	async fn(state) {
		const { x, y, placement, rects, platform, elements, middlewareData } = state;
		const { element, padding = 0 } = evaluate(options, state) || {};
		if (element == null) return {};
		const paddingObject = getPaddingObject(padding);
		const coords = {
			x,
			y
		};
		const axis = getAlignmentAxis(placement);
		const length = getAxisLength(axis);
		const arrowDimensions = await platform.getDimensions(element);
		const isYAxis = axis === "y";
		const minProp = isYAxis ? "top" : "left";
		const maxProp = isYAxis ? "bottom" : "right";
		const clientProp = isYAxis ? "clientHeight" : "clientWidth";
		const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
		const startDiff = coords[axis] - rects.reference[axis];
		const arrowOffsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(element));
		let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
		if (!clientSize || !await (platform.isElement == null ? void 0 : platform.isElement(arrowOffsetParent))) clientSize = elements.floating[clientProp] || rects.floating[length];
		const centerToReference = endDiff / 2 - startDiff / 2;
		const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
		const minPadding = min(paddingObject[minProp], largestPossiblePadding);
		const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);
		const max = clientSize - arrowDimensions[length] - maxPadding;
		const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
		const offset = clamp(minPadding, center, max);
		const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center !== offset && rects.reference[length] / 2 - (center < minPadding ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
		const alignmentOffset = shouldAddOffset ? center < minPadding ? center - minPadding : center - max : 0;
		return {
			[axis]: coords[axis] + alignmentOffset,
			data: {
				[axis]: offset,
				centerOffset: center - offset - alignmentOffset,
				...shouldAddOffset && { alignmentOffset }
			},
			reset: shouldAddOffset
		};
	}
});
/**
* Optimizes the visibility of the floating element by flipping the `placement`
* in order to keep it in view when the preferred placement(s) will overflow the
* clipping boundary. Alternative to `autoPlacement`.
* @see https://floating-ui.com/docs/flip
*/
var flip$1 = function(options) {
	if (options === void 0) options = {};
	return {
		name: "flip",
		options,
		async fn(state) {
			var _middlewareData$arrow, _middlewareData$flip;
			const { placement, middlewareData, rects, initialPlacement, platform, elements } = state;
			const { mainAxis: checkMainAxis = true, crossAxis: checkCrossAxis = true, fallbackPlacements: specifiedFallbackPlacements, fallbackStrategy = "bestFit", fallbackAxisSideDirection = "none", flipAlignment = true, ...detectOverflowOptions } = evaluate(options, state);
			if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) return {};
			const side = getSide(placement);
			const initialSideAxis = getSideAxis(initialPlacement);
			const isBasePlacement = getSide(initialPlacement) === initialPlacement;
			const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
			const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
			const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== "none";
			if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
			const placements = [initialPlacement, ...fallbackPlacements];
			const overflow = await platform.detectOverflow(state, detectOverflowOptions);
			const overflows = [];
			let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
			if (checkMainAxis) overflows.push(overflow[side]);
			if (checkCrossAxis) {
				const sides = getAlignmentSides(placement, rects, rtl);
				overflows.push(overflow[sides[0]], overflow[sides[1]]);
			}
			overflowsData = [...overflowsData, {
				placement,
				overflows
			}];
			if (!overflows.every((side) => side <= 0)) {
				var _middlewareData$flip2, _overflowsData$filter;
				const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
				const nextPlacement = placements[nextIndex];
				if (nextPlacement) {
					if (!(checkCrossAxis === "alignment" ? initialSideAxis !== getSideAxis(nextPlacement) : false) || overflowsData.every((d) => getSideAxis(d.placement) === initialSideAxis ? d.overflows[0] > 0 : true)) return {
						data: {
							index: nextIndex,
							overflows: overflowsData
						},
						reset: { placement: nextPlacement }
					};
				}
				let resetPlacement = (_overflowsData$filter = overflowsData.filter((d) => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
				if (!resetPlacement) switch (fallbackStrategy) {
					case "bestFit": {
						var _overflowsData$filter2;
						const placement = (_overflowsData$filter2 = overflowsData.filter((d) => {
							if (hasFallbackAxisSideDirection) {
								const currentSideAxis = getSideAxis(d.placement);
								return currentSideAxis === initialSideAxis || currentSideAxis === "y";
							}
							return true;
						}).map((d) => [d.placement, d.overflows.filter((overflow) => overflow > 0).reduce((acc, overflow) => acc + overflow, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
						if (placement) resetPlacement = placement;
						break;
					}
					case "initialPlacement": resetPlacement = initialPlacement;
				}
				if (placement !== resetPlacement) return { reset: { placement: resetPlacement } };
			}
			return {};
		}
	};
};
function getSideOffsets(overflow, rect) {
	return {
		top: overflow.top - rect.height,
		right: overflow.right - rect.width,
		bottom: overflow.bottom - rect.height,
		left: overflow.left - rect.width
	};
}
function isAnySideFullyClipped(overflow) {
	return sides.some((side) => overflow[side] >= 0);
}
/**
* Provides data to hide the floating element in applicable situations, such as
* when it is not in the same clipping context as the reference element.
* @see https://floating-ui.com/docs/hide
*/
var hide$1 = function(options) {
	if (options === void 0) options = {};
	return {
		name: "hide",
		options,
		async fn(state) {
			const { rects, platform } = state;
			const { strategy = "referenceHidden", ...detectOverflowOptions } = evaluate(options, state);
			switch (strategy) {
				case "referenceHidden": {
					const offsets = getSideOffsets(await platform.detectOverflow(state, {
						...detectOverflowOptions,
						elementContext: "reference"
					}), rects.reference);
					return { data: {
						referenceHiddenOffsets: offsets,
						referenceHidden: isAnySideFullyClipped(offsets)
					} };
				}
				case "escaped": {
					const offsets = getSideOffsets(await platform.detectOverflow(state, {
						...detectOverflowOptions,
						altBoundary: true
					}), rects.floating);
					return { data: {
						escapedOffsets: offsets,
						escaped: isAnySideFullyClipped(offsets)
					} };
				}
				default: return {};
			}
		}
	};
};
var originSides = /*#__PURE__*/ new Set(["left", "top"]);
async function convertValueToCoords(state, options) {
	const { placement, platform, elements } = state;
	const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
	const side = getSide(placement);
	const alignment = getAlignment(placement);
	const isVertical = getSideAxis(placement) === "y";
	const mainAxisMulti = originSides.has(side) ? -1 : 1;
	const crossAxisMulti = rtl && isVertical ? -1 : 1;
	const rawValue = evaluate(options, state);
	let { mainAxis, crossAxis, alignmentAxis } = typeof rawValue === "number" ? {
		mainAxis: rawValue,
		crossAxis: 0,
		alignmentAxis: null
	} : {
		mainAxis: rawValue.mainAxis || 0,
		crossAxis: rawValue.crossAxis || 0,
		alignmentAxis: rawValue.alignmentAxis
	};
	if (alignment && typeof alignmentAxis === "number") crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
	return isVertical ? {
		x: crossAxis * crossAxisMulti,
		y: mainAxis * mainAxisMulti
	} : {
		x: mainAxis * mainAxisMulti,
		y: crossAxis * crossAxisMulti
	};
}
/**
* Modifies the placement by translating the floating element along the
* specified axes.
* A number (shorthand for `mainAxis` or distance), or an axes configuration
* object may be passed.
* @see https://floating-ui.com/docs/offset
*/
var offset$1 = function(options) {
	if (options === void 0) options = 0;
	return {
		name: "offset",
		options,
		async fn(state) {
			var _middlewareData$offse, _middlewareData$arrow;
			const { x, y, placement, middlewareData } = state;
			const diffCoords = await convertValueToCoords(state, options);
			if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) return {};
			return {
				x: x + diffCoords.x,
				y: y + diffCoords.y,
				data: {
					...diffCoords,
					placement
				}
			};
		}
	};
};
/**
* Optimizes the visibility of the floating element by shifting it in order to
* keep it in view when it will overflow the clipping boundary.
* @see https://floating-ui.com/docs/shift
*/
var shift$1 = function(options) {
	if (options === void 0) options = {};
	return {
		name: "shift",
		options,
		async fn(state) {
			const { x, y, placement, platform } = state;
			const { mainAxis: checkMainAxis = true, crossAxis: checkCrossAxis = false, limiter = { fn: (_ref) => {
				let { x, y } = _ref;
				return {
					x,
					y
				};
			} }, ...detectOverflowOptions } = evaluate(options, state);
			const coords = {
				x,
				y
			};
			const overflow = await platform.detectOverflow(state, detectOverflowOptions);
			const crossAxis = getSideAxis(placement);
			const mainAxis = getOppositeAxis(crossAxis);
			let mainAxisCoord = coords[mainAxis];
			let crossAxisCoord = coords[crossAxis];
			const clampCoord = (axis, coord) => clamp(coord + overflow[axis === "y" ? "top" : "left"], coord, coord - overflow[axis === "y" ? "bottom" : "right"]);
			if (checkMainAxis) mainAxisCoord = clampCoord(mainAxis, mainAxisCoord);
			if (checkCrossAxis) crossAxisCoord = clampCoord(crossAxis, crossAxisCoord);
			const limitedCoords = limiter.fn({
				...state,
				[mainAxis]: mainAxisCoord,
				[crossAxis]: crossAxisCoord
			});
			return {
				...limitedCoords,
				data: {
					x: limitedCoords.x - x,
					y: limitedCoords.y - y,
					enabled: {
						[mainAxis]: checkMainAxis,
						[crossAxis]: checkCrossAxis
					}
				}
			};
		}
	};
};
/**
* Built-in `limiter` that will stop `shift()` at a certain point.
*/
var limitShift$1 = function(options) {
	if (options === void 0) options = {};
	return {
		options,
		fn(state) {
			var _rawOffset$mainAxis, _rawOffset$crossAxis;
			const { x, y, placement, rects, middlewareData } = state;
			const { offset = 0, mainAxis: checkMainAxis = true, crossAxis: checkCrossAxis = true } = evaluate(options, state);
			const coords = {
				x,
				y
			};
			const crossAxis = getSideAxis(placement);
			const mainAxis = getOppositeAxis(crossAxis);
			let mainAxisCoord = coords[mainAxis];
			let crossAxisCoord = coords[crossAxis];
			const rawOffset = evaluate(offset, state);
			const computedOffset = typeof rawOffset === "number" ? {
				mainAxis: rawOffset,
				crossAxis: 0
			} : {
				mainAxis: (_rawOffset$mainAxis = rawOffset.mainAxis) != null ? _rawOffset$mainAxis : 0,
				crossAxis: (_rawOffset$crossAxis = rawOffset.crossAxis) != null ? _rawOffset$crossAxis : 0
			};
			if (checkMainAxis) {
				const len = mainAxis === "y" ? "height" : "width";
				const limitMin = rects.reference[mainAxis] - rects.floating[len] + computedOffset.mainAxis;
				const limitMax = rects.reference[mainAxis] + rects.reference[len] - computedOffset.mainAxis;
				if (mainAxisCoord < limitMin) mainAxisCoord = limitMin;
				else if (mainAxisCoord > limitMax) mainAxisCoord = limitMax;
			}
			if (checkCrossAxis) {
				var _middlewareData$offse, _middlewareData$offse2;
				const len = mainAxis === "y" ? "width" : "height";
				const isOriginSide = originSides.has(getSide(placement));
				const limitMin = rects.reference[crossAxis] - rects.floating[len] + (isOriginSide ? ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse[crossAxis]) || 0 : 0) + (isOriginSide ? 0 : computedOffset.crossAxis);
				const limitMax = rects.reference[crossAxis] + rects.reference[len] + (isOriginSide ? 0 : ((_middlewareData$offse2 = middlewareData.offset) == null ? void 0 : _middlewareData$offse2[crossAxis]) || 0) - (isOriginSide ? computedOffset.crossAxis : 0);
				if (crossAxisCoord < limitMin) crossAxisCoord = limitMin;
				else if (crossAxisCoord > limitMax) crossAxisCoord = limitMax;
			}
			return {
				[mainAxis]: mainAxisCoord,
				[crossAxis]: crossAxisCoord
			};
		}
	};
};
/**
* Provides data that allows you to change the size of the floating element —
* for instance, prevent it from overflowing the clipping boundary or match the
* width of the reference element.
* @see https://floating-ui.com/docs/size
*/
var size$1 = function(options) {
	if (options === void 0) options = {};
	return {
		name: "size",
		options,
		async fn(state) {
			const { placement, rects, platform, elements } = state;
			const { apply = () => {}, ...detectOverflowOptions } = evaluate(options, state);
			const overflow = await platform.detectOverflow(state, detectOverflowOptions);
			const side = getSide(placement);
			const alignment = getAlignment(placement);
			const isYAxis = getSideAxis(placement) === "y";
			const { width, height } = rects.floating;
			let heightSide;
			let widthSide;
			if (side === "top" || side === "bottom") {
				heightSide = side;
				widthSide = alignment === (await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating)) ? "start" : "end") ? "left" : "right";
			} else {
				widthSide = side;
				heightSide = alignment === "end" ? "top" : "bottom";
			}
			const maximumClippingHeight = height - overflow.top - overflow.bottom;
			const maximumClippingWidth = width - overflow.left - overflow.right;
			const overflowAvailableHeight = min(height - overflow[heightSide], maximumClippingHeight);
			const overflowAvailableWidth = min(width - overflow[widthSide], maximumClippingWidth);
			const shiftData = state.middlewareData.shift;
			const noShift = !shiftData;
			let availableHeight = overflowAvailableHeight;
			let availableWidth = overflowAvailableWidth;
			if (shiftData != null && shiftData.enabled.x) availableWidth = maximumClippingWidth;
			if (shiftData != null && shiftData.enabled.y) availableHeight = maximumClippingHeight;
			if (noShift && !alignment) {
				if (isYAxis) availableWidth = width - 2 * max(overflow.left, overflow.right);
				else availableHeight = height - 2 * max(overflow.top, overflow.bottom);
			}
			await apply({
				...state,
				availableWidth,
				availableHeight
			});
			const nextDimensions = await platform.getDimensions(elements.floating);
			if (width !== nextDimensions.width || height !== nextDimensions.height) return { reset: { rects: true } };
			return {};
		}
	};
};
function getNodeName(node) {
	if (isNode()) return (node.nodeName || "").toLowerCase();
	return "#document";
}
function getWindow(node) {
	var _node$ownerDocument;
	return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || void 0;
}
function getDocumentElement(node) {
	var _ref;
	return (_ref = (isNode() ? node.ownerDocument : node.document) || (void 0).document) == null ? void 0 : _ref.documentElement;
}
function isNode(value) {
	return false;
}
function isElement(value) {
	return false;
}
function isHTMLElement(value) {
	return false;
}
function isShadowRoot(value) {
	return false;
}
function isOverflowElement(element) {
	const { overflow, overflowX, overflowY, display } = getComputedStyle$1(element);
	return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents";
}
function isTableElement(element) {
	return /^(table|td|th)$/.test(getNodeName(element));
}
function isTopLayer(element) {
	try {
		if (element.matches(":popover-open")) return true;
	} catch (_e) {}
	try {
		return element.matches(":modal");
	} catch (_e) {
		return false;
	}
}
var willChangeRe = /transform|translate|scale|rotate|perspective|filter/;
var containRe = /paint|layout|strict|content/;
var isNotNone = (value) => !!value && value !== "none";
var isWebKitValue;
function isContainingBlock(elementOrCss) {
	const css = isElement() ? getComputedStyle$1(elementOrCss) : elementOrCss;
	return isNotNone(css.transform) || isNotNone(css.translate) || isNotNone(css.scale) || isNotNone(css.rotate) || isNotNone(css.perspective) || !isWebKit() && (isNotNone(css.backdropFilter) || isNotNone(css.filter)) || willChangeRe.test(css.willChange || "") || containRe.test(css.contain || "");
}
function getContainingBlock(element) {
	let currentNode = getParentNode(element);
	while (isHTMLElement() && !isLastTraversableNode(currentNode)) {
		if (isContainingBlock(currentNode)) return currentNode;
		else if (isTopLayer(currentNode)) return null;
		currentNode = getParentNode(currentNode);
	}
	return null;
}
function isWebKit() {
	if (isWebKitValue == null) isWebKitValue = typeof CSS !== "undefined" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none");
	return isWebKitValue;
}
function isLastTraversableNode(node) {
	return /^(html|body|#document)$/.test(getNodeName(node));
}
function getComputedStyle$1(element) {
	return getWindow(element).getComputedStyle(element);
}
function getNodeScroll(element) {
	if (isElement()) return {
		scrollLeft: element.scrollLeft,
		scrollTop: element.scrollTop
	};
	return {
		scrollLeft: element.scrollX,
		scrollTop: element.scrollY
	};
}
function getParentNode(node) {
	if (getNodeName(node) === "html") return node;
	const result = node.assignedSlot || node.parentNode || isShadowRoot() && node.host || getDocumentElement(node);
	return isShadowRoot() ? result.host : result;
}
function getNearestOverflowAncestor(node) {
	const parentNode = getParentNode(node);
	if (isLastTraversableNode(parentNode)) return (node.ownerDocument || node).body;
	if (isHTMLElement() && isOverflowElement(parentNode)) return parentNode;
	return getNearestOverflowAncestor(parentNode);
}
function getOverflowAncestors(node, list, traverseIframes) {
	var _node$ownerDocument2;
	if (list === void 0) list = [];
	if (traverseIframes === void 0) traverseIframes = true;
	const scrollableAncestor = getNearestOverflowAncestor(node);
	const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
	const win = getWindow(scrollableAncestor);
	if (isBody) {
		const frameElement = getFrameElement(win);
		return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], frameElement && traverseIframes ? getOverflowAncestors(frameElement) : []);
	} else return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
}
function getFrameElement(win) {
	return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
}
//#endregion
//#region ../node_modules/.pnpm/@floating-ui+dom@1.8.0/node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
function getCssDimensions(element) {
	const css = getComputedStyle$1(element);
	let width = parseFloat(css.width) || 0;
	let height = parseFloat(css.height) || 0;
	const hasOffset = isHTMLElement();
	const offsetWidth = hasOffset ? element.offsetWidth : width;
	const offsetHeight = hasOffset ? element.offsetHeight : height;
	const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
	if (shouldFallback) {
		width = offsetWidth;
		height = offsetHeight;
	}
	return {
		width,
		height,
		$: shouldFallback
	};
}
function unwrapElement$1(element) {
	return !isElement() ? element.contextElement : element;
}
function getScale(element) {
	const domElement = unwrapElement$1(element);
	if (!isHTMLElement()) return createCoords(1);
	const rect = domElement.getBoundingClientRect();
	const { width, height, $ } = getCssDimensions(domElement);
	let x = ($ ? round(rect.width) : rect.width) / width;
	let y = ($ ? round(rect.height) : rect.height) / height;
	if (!x || !Number.isFinite(x)) x = 1;
	if (!y || !Number.isFinite(y)) y = 1;
	return {
		x,
		y
	};
}
var noOffsets = /*#__PURE__*/ createCoords(0);
function getVisualOffsets(element) {
	const win = getWindow(element);
	if (!isWebKit() || !win.visualViewport) return noOffsets;
	return {
		x: win.visualViewport.offsetLeft,
		y: win.visualViewport.offsetTop
	};
}
function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
	if (isFixed === void 0) isFixed = false;
	return !!floatingOffsetParent && isFixed && floatingOffsetParent === getWindow(element);
}
function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
	if (includeScale === void 0) includeScale = false;
	if (isFixedStrategy === void 0) isFixedStrategy = false;
	const clientRect = element.getBoundingClientRect();
	const domElement = unwrapElement$1(element);
	let scale = createCoords(1);
	if (includeScale) {
		if (offsetParent) {
			if (isElement()) scale = getScale(offsetParent);
		} else scale = getScale(element);
	}
	const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
	let x = (clientRect.left + visualOffsets.x) / scale.x;
	let y = (clientRect.top + visualOffsets.y) / scale.y;
	let width = clientRect.width / scale.x;
	let height = clientRect.height / scale.y;
	if (domElement && offsetParent) {
		const win = getWindow(domElement);
		const offsetWin = isElement() ? getWindow(offsetParent) : offsetParent;
		let currentWin = win;
		let currentIFrame = getFrameElement(currentWin);
		while (currentIFrame && offsetWin !== currentWin) {
			const iframeScale = getScale(currentIFrame);
			const iframeRect = currentIFrame.getBoundingClientRect();
			const css = getComputedStyle$1(currentIFrame);
			const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
			const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
			x *= iframeScale.x;
			y *= iframeScale.y;
			width *= iframeScale.x;
			height *= iframeScale.y;
			x += left;
			y += top;
			currentWin = getWindow(currentIFrame);
			currentIFrame = getFrameElement(currentWin);
		}
	}
	return rectToClientRect({
		width,
		height,
		x,
		y
	});
}
function getWindowScrollBarX(element, rect) {
	const leftScroll = getNodeScroll(element).scrollLeft;
	if (!rect) return getBoundingClientRect(getDocumentElement(element)).left + leftScroll;
	return rect.left + leftScroll;
}
function getHTMLOffset(documentElement, scroll) {
	const htmlRect = documentElement.getBoundingClientRect();
	return {
		x: htmlRect.left + scroll.scrollLeft - getWindowScrollBarX(documentElement, htmlRect),
		y: htmlRect.top + scroll.scrollTop
	};
}
function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
	let { elements, rect, offsetParent, strategy } = _ref;
	const isFixed = strategy === "fixed";
	const documentElement = getDocumentElement(offsetParent);
	const topLayer = elements ? isTopLayer(elements.floating) : false;
	if (offsetParent === documentElement || topLayer && isFixed) return rect;
	let scroll = {
		scrollLeft: 0,
		scrollTop: 0
	};
	let scale = createCoords(1);
	const offsets = createCoords(0);
	const isOffsetParentAnElement = isHTMLElement();
	if (isOffsetParentAnElement || !isFixed) {
		if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) scroll = getNodeScroll(offsetParent);
		if (isOffsetParentAnElement) {
			const offsetRect = getBoundingClientRect(offsetParent);
			scale = getScale(offsetParent);
			offsets.x = offsetRect.x + offsetParent.clientLeft;
			offsets.y = offsetRect.y + offsetParent.clientTop;
		}
	}
	const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
	return {
		width: rect.width * scale.x,
		height: rect.height * scale.y,
		x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x + htmlOffset.x,
		y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y + htmlOffset.y
	};
}
function getClientRects(element) {
	return element.getClientRects ? Array.from(element.getClientRects()) : [];
}
function getDocumentRect(html) {
	const scroll = getNodeScroll(html);
	const body = html.ownerDocument.body;
	const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
	const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
	let x = -scroll.scrollLeft + getWindowScrollBarX(html);
	const y = -scroll.scrollTop;
	if (getComputedStyle$1(body).direction === "rtl") x += max(html.clientWidth, body.clientWidth) - width;
	return {
		width,
		height,
		x,
		y
	};
}
var SCROLLBAR_MAX = 25;
function getViewportRect(element, strategy, rootBoundary) {
	if (rootBoundary === void 0) rootBoundary = "viewport";
	const isLayoutViewport = rootBoundary === "layoutViewport";
	const win = getWindow(element);
	const html = getDocumentElement(element);
	const visualViewport = win.visualViewport;
	let width = html.clientWidth;
	let height = html.clientHeight;
	let x = 0;
	let y = 0;
	if (visualViewport) {
		const layoutRelativeClientCoords = !isWebKit() || strategy === "fixed";
		if (isLayoutViewport) {
			if (!layoutRelativeClientCoords) {
				x = -visualViewport.offsetLeft;
				y = -visualViewport.offsetTop;
			}
		} else {
			width = visualViewport.width;
			height = visualViewport.height;
			if (layoutRelativeClientCoords) {
				x = visualViewport.offsetLeft;
				y = visualViewport.offsetTop;
			}
		}
	}
	if (getWindowScrollBarX(html) <= 0) {
		const doc = html.ownerDocument;
		const body = doc.body;
		const bodyStyles = getComputedStyle(body);
		const bodyMarginInline = doc.compatMode === "CSS1Compat" ? parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight) || 0 : 0;
		const reservedWidth = Math.abs(html.clientWidth - body.clientWidth - bodyMarginInline);
		const gutter = getComputedStyle(html).scrollbarGutter === "stable both-edges" ? reservedWidth / 2 : reservedWidth;
		if (gutter <= SCROLLBAR_MAX) width -= gutter;
	}
	return {
		width,
		height,
		x,
		y
	};
}
function getInnerBoundingClientRect(element, strategy) {
	const clientRect = getBoundingClientRect(element, true, strategy === "fixed");
	const top = clientRect.top + element.clientTop;
	const left = clientRect.left + element.clientLeft;
	const scale = getScale(element);
	return {
		width: element.clientWidth * scale.x,
		height: element.clientHeight * scale.y,
		x: left * scale.x,
		y: top * scale.y
	};
}
function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
	let rect;
	if (clippingAncestor === "viewport" || clippingAncestor === "layoutViewport") rect = getViewportRect(element, strategy, clippingAncestor);
	else if (clippingAncestor === "document") rect = getDocumentRect(getDocumentElement(element));
	else if (isElement()) rect = getInnerBoundingClientRect(clippingAncestor, strategy);
	else {
		const visualOffsets = getVisualOffsets(element);
		rect = {
			x: clippingAncestor.x - visualOffsets.x,
			y: clippingAncestor.y - visualOffsets.y,
			width: clippingAncestor.width,
			height: clippingAncestor.height
		};
	}
	return rectToClientRect(rect);
}
function getClippingElementAncestors(element, cache) {
	const cachedResult = cache.get(element);
	if (cachedResult) return cachedResult;
	let result = getOverflowAncestors(element, [], false).filter((el) => isElement() && getNodeName(el) !== "body");
	let lastKeptComputedStyle = null;
	const elementIsFixed = getComputedStyle$1(element).position === "fixed";
	let currentNode = elementIsFixed ? getParentNode(element) : element;
	while (isElement() && !isLastTraversableNode(currentNode)) {
		const computedStyle = getComputedStyle$1(currentNode);
		const currentNodeIsContaining = isContainingBlock(currentNode);
		const lastPosition = lastKeptComputedStyle ? lastKeptComputedStyle.position : elementIsFixed ? "fixed" : "";
		if (!currentNodeIsContaining && (lastPosition === "fixed" || lastPosition === "absolute" && computedStyle.position === "static")) result = result.filter((ancestor) => ancestor !== currentNode);
		else lastKeptComputedStyle = computedStyle;
		currentNode = getParentNode(currentNode);
	}
	cache.set(element, result);
	return result;
}
function getClippingRect(_ref) {
	let { element, boundary, rootBoundary, strategy } = _ref;
	const clippingAncestors = [...boundary === "clippingAncestors" ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary), rootBoundary];
	const firstRect = getClientRectFromClippingAncestor(element, clippingAncestors[0], strategy);
	let top = firstRect.top;
	let right = firstRect.right;
	let bottom = firstRect.bottom;
	let left = firstRect.left;
	for (let i = 1; i < clippingAncestors.length; i++) {
		const rect = getClientRectFromClippingAncestor(element, clippingAncestors[i], strategy);
		top = max(rect.top, top);
		right = min(rect.right, right);
		bottom = min(rect.bottom, bottom);
		left = max(rect.left, left);
	}
	return {
		width: right - left,
		height: bottom - top,
		x: left,
		y: top
	};
}
function getDimensions(element) {
	const { width, height } = getCssDimensions(element);
	return {
		width,
		height
	};
}
function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
	const isOffsetParentAnElement = isHTMLElement();
	const documentElement = getDocumentElement(offsetParent);
	const isFixed = strategy === "fixed";
	const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
	let scroll = {
		scrollLeft: 0,
		scrollTop: 0
	};
	const offsets = createCoords(0);
	if (isOffsetParentAnElement || !isFixed) {
		if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) scroll = getNodeScroll(offsetParent);
		if (isOffsetParentAnElement) {
			const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
			offsets.x = offsetRect.x + offsetParent.clientLeft;
			offsets.y = offsetRect.y + offsetParent.clientTop;
		}
	}
	if (!isOffsetParentAnElement && documentElement) offsets.x = getWindowScrollBarX(documentElement);
	const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
	return {
		x: rect.left + scroll.scrollLeft - offsets.x - htmlOffset.x,
		y: rect.top + scroll.scrollTop - offsets.y - htmlOffset.y,
		width: rect.width,
		height: rect.height
	};
}
function isStaticPositioned(element) {
	return getComputedStyle$1(element).position === "static";
}
function getTrueOffsetParent(element, polyfill) {
	if (!isHTMLElement() || getComputedStyle$1(element).position === "fixed") return null;
	if (polyfill) return polyfill(element);
	let rawOffsetParent = element.offsetParent;
	if (getDocumentElement(element) === rawOffsetParent) rawOffsetParent = rawOffsetParent.ownerDocument.body;
	return rawOffsetParent;
}
function getOffsetParent(element, polyfill) {
	const win = getWindow(element);
	if (isTopLayer(element)) return win;
	if (!isHTMLElement()) {
		let svgOffsetParent = getParentNode(element);
		while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
			if (isElement() && !isStaticPositioned(svgOffsetParent)) return svgOffsetParent;
			svgOffsetParent = getParentNode(svgOffsetParent);
		}
		return win;
	}
	let offsetParent = getTrueOffsetParent(element, polyfill);
	while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) offsetParent = getTrueOffsetParent(offsetParent, polyfill);
	if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) return win;
	return offsetParent || getContainingBlock(element) || win;
}
var getElementRects = async function(data) {
	const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
	const getDimensionsFn = this.getDimensions;
	const floatingDimensions = await getDimensionsFn(data.floating);
	return {
		reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
		floating: {
			x: 0,
			y: 0,
			width: floatingDimensions.width,
			height: floatingDimensions.height
		}
	};
};
function isRTL(element) {
	return getComputedStyle$1(element).direction === "rtl";
}
var platform = {
	convertOffsetParentRelativeRectToViewportRelativeRect,
	getDocumentElement,
	getClippingRect,
	getOffsetParent,
	getElementRects,
	getClientRects,
	getDimensions,
	getScale,
	isElement,
	isRTL
};
function rectsAreEqual(a, b) {
	return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
function observeMove(element, onMove, ancestorResize) {
	let io = null;
	let timeoutId;
	const root = getDocumentElement(element);
	function cleanup() {
		var _io;
		clearTimeout(timeoutId);
		(_io = io) == null || _io.disconnect();
		io = null;
	}
	function refresh(skip, threshold) {
		if (skip === void 0) skip = false;
		if (threshold === void 0) threshold = 1;
		cleanup();
		const elementRectForRootMargin = element.getBoundingClientRect();
		const { left, top, width, height } = elementRectForRootMargin;
		if (!skip) onMove();
		if (!width || !height) return;
		const insetTop = floor(top);
		const insetRight = floor(root.clientWidth - (left + width));
		const insetBottom = floor(root.clientHeight - (top + height));
		const insetLeft = floor(left);
		const options = {
			rootMargin: -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px",
			threshold: max(0, min(1, threshold)) || 1
		};
		let isFirstUpdate = true;
		function handleObserve(entries) {
			const ratio = entries[0].intersectionRatio;
			if (!rectsAreEqual(elementRectForRootMargin, element.getBoundingClientRect())) return refresh();
			if (ratio !== threshold) {
				if (!isFirstUpdate) return refresh();
				if (!ratio) timeoutId = setTimeout(() => {
					refresh(false, 1e-7);
				}, 1e3);
				else refresh(false, ratio);
			}
			isFirstUpdate = false;
		}
		try {
			io = new IntersectionObserver(handleObserve, {
				...options,
				root: root.ownerDocument
			});
		} catch (_e) {
			io = new IntersectionObserver(handleObserve, options);
		}
		io.observe(element);
	}
	const win = getWindow(element);
	const handleResize = () => refresh(ancestorResize);
	win.addEventListener("resize", handleResize);
	refresh(true);
	return () => {
		win.removeEventListener("resize", handleResize);
		cleanup();
	};
}
/**
* Automatically updates the position of the floating element when necessary.
* Should only be called when the floating element is mounted on the DOM or
* visible on the screen.
* @returns cleanup function that should be invoked when the floating element is
* removed from the DOM or hidden from the screen.
* @see https://floating-ui.com/docs/autoUpdate
*/
function autoUpdate(reference, floating, update, options) {
	if (options === void 0) options = {};
	const { ancestorScroll = true, ancestorResize = true, elementResize = typeof ResizeObserver === "function", layoutShift = typeof IntersectionObserver === "function", animationFrame = false } = options;
	const referenceEl = unwrapElement$1(reference);
	const ancestors = ancestorScroll || ancestorResize ? [...referenceEl ? getOverflowAncestors(referenceEl) : [], ...floating ? getOverflowAncestors(floating) : []] : [];
	ancestors.forEach((ancestor) => {
		ancestorScroll && ancestor.addEventListener("scroll", update);
		ancestorResize && ancestor.addEventListener("resize", update);
	});
	const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update, ancestorResize) : null;
	let reobserveFrame = -1;
	let resizeObserver = null;
	if (elementResize) {
		resizeObserver = new ResizeObserver((_ref) => {
			let [firstEntry] = _ref;
			if (firstEntry && firstEntry.target === referenceEl && resizeObserver && floating) {
				resizeObserver.unobserve(floating);
				cancelAnimationFrame(reobserveFrame);
				reobserveFrame = requestAnimationFrame(() => {
					var _resizeObserver;
					(_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
				});
			}
			update();
		});
		if (referenceEl && !animationFrame) resizeObserver.observe(referenceEl);
		if (floating) resizeObserver.observe(floating);
	}
	let frameId;
	let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
	if (animationFrame) frameLoop();
	function frameLoop() {
		const nextRefRect = getBoundingClientRect(reference);
		if (prevRefRect && !rectsAreEqual(prevRefRect, nextRefRect)) update();
		prevRefRect = nextRefRect;
		frameId = requestAnimationFrame(frameLoop);
	}
	update();
	return () => {
		var _resizeObserver2;
		ancestors.forEach((ancestor) => {
			ancestorScroll && ancestor.removeEventListener("scroll", update);
			ancestorResize && ancestor.removeEventListener("resize", update);
		});
		cleanupIo?.();
		(_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
		resizeObserver = null;
		if (animationFrame) cancelAnimationFrame(frameId);
	};
}
/**
* Modifies the placement by translating the floating element along the
* specified axes.
* A number (shorthand for `mainAxis` or distance), or an axes configuration
* object may be passed.
* @see https://floating-ui.com/docs/offset
*/
var offset = offset$1;
/**
* Optimizes the visibility of the floating element by shifting it in order to
* keep it in view when it will overflow the clipping boundary.
* @see https://floating-ui.com/docs/shift
*/
var shift = shift$1;
/**
* Optimizes the visibility of the floating element by flipping the `placement`
* in order to keep it in view when the preferred placement(s) will overflow the
* clipping boundary. Alternative to `autoPlacement`.
* @see https://floating-ui.com/docs/flip
*/
var flip = flip$1;
/**
* Provides data that allows you to change the size of the floating element —
* for instance, prevent it from overflowing the clipping boundary or match the
* width of the reference element.
* @see https://floating-ui.com/docs/size
*/
var size = size$1;
/**
* Provides data to hide the floating element in applicable situations, such as
* when it is not in the same clipping context as the reference element.
* @see https://floating-ui.com/docs/hide
*/
var hide = hide$1;
/**
* Provides data to position an inner element of the floating element so that it
* appears centered to the reference element.
* @see https://floating-ui.com/docs/arrow
*/
var arrow$1 = arrow$2;
/**
* Built-in `limiter` that will stop `shift()` at a certain point.
*/
var limitShift = limitShift$1;
/**
* Computes the `x` and `y` coordinates that will place the floating element
* next to a given reference element.
*/
var computePosition = (reference, floating, options) => {
	const cache = /* @__PURE__ */ new Map();
	const mergedOptions = options != null ? options : {};
	const platformWithCache = {
		...platform,
		...mergedOptions.platform,
		_c: cache
	};
	return computePosition$1(reference, floating, {
		...mergedOptions,
		platform: platformWithCache
	});
};
__reExport(/* @__PURE__ */ __exportAll({
	del: () => del,
	install: () => install,
	set: () => set
}), vue_exports);
var install = () => {};
function set(target, key, val) {
	if (Array.isArray(target)) {
		target.length = Math.max(target.length, key);
		target.splice(key, 1, val);
		return val;
	}
	target[key] = val;
	return val;
}
function del(target, key) {
	if (Array.isArray(target)) {
		target.splice(key, 1);
		return;
	}
	delete target[key];
}
//#endregion
//#region ../node_modules/.pnpm/nuxt@4.5.2_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7_supports-color@10.2.2___@_6a8ec549e9d470ce05bfc037ea662c04/node_modules/nuxt/dist/app/compat/vue-demi.js
var vue_demi_exports = /* @__PURE__ */ __exportAll({
	Vue2: () => void 0,
	del: () => del,
	install: () => install,
	isVue2: () => false,
	isVue3: () => true,
	set: () => set
});
__reExport(vue_demi_exports, vue_exports);
//#endregion
//#region ../node_modules/.pnpm/@floating-ui+vue@1.1.11_vue@3.5.42_typescript@6.0.3_/node_modules/@floating-ui/vue/dist/floating-ui.vue.mjs
function isComponentPublicInstance(target) {
	return target != null && typeof target === "object" && "$el" in target;
}
function unwrapElement(target) {
	if (isComponentPublicInstance(target)) {
		const element = target.$el;
		return isNode() && getNodeName(element) === "#comment" ? null : element;
	}
	return target;
}
function toValue$1(source) {
	return typeof source === "function" ? source() : (0, vue_demi_exports.unref)(source);
}
/**
* Positions an inner element of the floating element such that it is centered to the reference element.
* @param options The arrow options.
* @see https://floating-ui.com/docs/arrow
*/
function arrow(options) {
	return {
		name: "arrow",
		options,
		fn(args) {
			const element = unwrapElement(toValue$1(options.element));
			if (element == null) return {};
			return arrow$1({
				element,
				padding: options.padding
			}).fn(args);
		}
	};
}
function getDPR(element) {
	return 1;
}
function roundByDPR(element, value) {
	const dpr = getDPR();
	return Math.round(value * dpr) / dpr;
}
/**
* Computes the `x` and `y` coordinates that will place the floating element next to a reference element when it is given a certain CSS positioning strategy.
* @param reference The reference template ref.
* @param floating The floating template ref.
* @param options The floating options.
* @see https://floating-ui.com/docs/vue
*/
function useFloating(reference, floating, options) {
	if (options === void 0) options = {};
	const whileElementsMountedOption = options.whileElementsMounted;
	const openOption = (0, vue_demi_exports.computed)(() => {
		var _toValue;
		return (_toValue = toValue$1(options.open)) != null ? _toValue : true;
	});
	const middlewareOption = (0, vue_demi_exports.computed)(() => toValue$1(options.middleware));
	const placementOption = (0, vue_demi_exports.computed)(() => {
		var _toValue2;
		return (_toValue2 = toValue$1(options.placement)) != null ? _toValue2 : "bottom";
	});
	const strategyOption = (0, vue_demi_exports.computed)(() => {
		var _toValue3;
		return (_toValue3 = toValue$1(options.strategy)) != null ? _toValue3 : "absolute";
	});
	const transformOption = (0, vue_demi_exports.computed)(() => {
		var _toValue4;
		return (_toValue4 = toValue$1(options.transform)) != null ? _toValue4 : true;
	});
	const referenceElement = (0, vue_demi_exports.computed)(() => unwrapElement(reference.value));
	const floatingElement = (0, vue_demi_exports.computed)(() => unwrapElement(floating.value));
	const x = (0, vue_demi_exports.ref)(0);
	const y = (0, vue_demi_exports.ref)(0);
	const strategy = (0, vue_demi_exports.ref)(strategyOption.value);
	const placement = (0, vue_demi_exports.ref)(placementOption.value);
	const middlewareData = (0, vue_demi_exports.shallowRef)({});
	const isPositioned = (0, vue_demi_exports.ref)(false);
	const floatingStyles = (0, vue_demi_exports.computed)(() => {
		const initialStyles = {
			position: strategy.value,
			left: "0",
			top: "0"
		};
		if (!floatingElement.value) return initialStyles;
		const xVal = roundByDPR(floatingElement.value, x.value);
		const yVal = roundByDPR(floatingElement.value, y.value);
		if (transformOption.value) return {
			...initialStyles,
			transform: "translate(" + xVal + "px, " + yVal + "px)",
			...getDPR(floatingElement.value) >= 1.5
		};
		return {
			position: strategy.value,
			left: xVal + "px",
			top: yVal + "px"
		};
	});
	let whileElementsMountedCleanup;
	function update() {
		if (referenceElement.value == null || floatingElement.value == null) return;
		const open = openOption.value;
		computePosition(referenceElement.value, floatingElement.value, {
			middleware: middlewareOption.value,
			placement: placementOption.value,
			strategy: strategyOption.value
		}).then((position) => {
			x.value = position.x;
			y.value = position.y;
			strategy.value = position.strategy;
			placement.value = position.placement;
			middlewareData.value = position.middlewareData;
			/**
			* The floating element's position may be recomputed while it's closed
			* but still mounted (such as when transitioning out). To ensure
			* `isPositioned` will be `false` initially on the next open, avoid
			* setting it to `true` when `open === false` (must be specified).
			*/
			isPositioned.value = open !== false;
		});
	}
	function cleanup() {
		if (typeof whileElementsMountedCleanup === "function") {
			whileElementsMountedCleanup();
			whileElementsMountedCleanup = void 0;
		}
	}
	function attach() {
		cleanup();
		if (whileElementsMountedOption === void 0) {
			update();
			return;
		}
		if (referenceElement.value != null && floatingElement.value != null) {
			whileElementsMountedCleanup = whileElementsMountedOption(referenceElement.value, floatingElement.value, update);
			return;
		}
	}
	function reset() {
		if (!openOption.value) isPositioned.value = false;
	}
	(0, vue_demi_exports.watch)([
		middlewareOption,
		placementOption,
		strategyOption,
		openOption
	], update, { flush: "sync" });
	(0, vue_demi_exports.watch)([referenceElement, floatingElement], attach, { flush: "sync" });
	(0, vue_demi_exports.watch)(openOption, reset, { flush: "sync" });
	if ((0, vue_demi_exports.getCurrentScope)()) (0, vue_demi_exports.onScopeDispose)(cleanup);
	return {
		x: (0, vue_demi_exports.shallowReadonly)(x),
		y: (0, vue_demi_exports.shallowReadonly)(y),
		strategy: (0, vue_demi_exports.shallowReadonly)(strategy),
		placement: (0, vue_demi_exports.shallowReadonly)(placement),
		middlewareData: (0, vue_demi_exports.shallowReadonly)(middlewareData),
		isPositioned: (0, vue_demi_exports.shallowReadonly)(isPositioned),
		floatingStyles,
		update
	};
}
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Popper/PopperContent.js
var _hoisted_1 = ["dir"];
var PopperContentPropsDefaultValue = {
	side: "bottom",
	sideOffset: 0,
	sideFlip: true,
	align: "center",
	alignOffset: 0,
	alignFlip: true,
	arrowPadding: 0,
	hideShiftedArrow: true,
	avoidCollisions: true,
	collisionBoundary: () => [],
	collisionPadding: 0,
	sticky: "partial",
	hideWhenDetached: false,
	positionStrategy: "fixed",
	updatePositionStrategy: "optimized",
	prioritizePosition: false
};
var [injectPopperContentContext, providePopperContentContext] = /*#__PURE__*/ createContext("PopperContent");
var PopperContent_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "PopperContent",
	props: /* @__PURE__ */ (0, vue_exports.mergeDefaults)({
		memoDependencies: {
			type: Array,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		hideShiftedArrow: {
			type: Boolean,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
		reference: {
			type: null,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	}, { ...PopperContentPropsDefaultValue }),
	emits: ["placed"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = injectPopperRootContext();
		const { forwardRef, currentElement: contentElement } = useForwardExpose();
		const dir = useDirection((0, vue_exports.computed)(() => props.dir));
		const floatingRef = (0, vue_exports.ref)();
		const arrow$1 = (0, vue_exports.ref)();
		const { width: arrowWidth, height: arrowHeight } = useSize();
		const desiredPlacement = (0, vue_exports.computed)(() => props.side + (props.align !== "center" ? `-${props.align}` : ""));
		const collisionPadding = (0, vue_exports.computed)(() => {
			return typeof props.collisionPadding === "number" ? props.collisionPadding : {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				...props.collisionPadding
			};
		});
		const boundary = (0, vue_exports.computed)(() => {
			return Array.isArray(props.collisionBoundary) ? props.collisionBoundary : [props.collisionBoundary];
		});
		const detectOverflowOptions = (0, vue_exports.computed)(() => {
			return {
				padding: collisionPadding.value,
				boundary: boundary.value.filter(isNotNull),
				altBoundary: boundary.value.length > 0
			};
		});
		const flipOptions = (0, vue_exports.computed)(() => {
			return {
				mainAxis: props.sideFlip,
				crossAxis: props.alignFlip
			};
		});
		const computedMiddleware = (0, vue_exports.computed)(() => {
			return [
				offset({
					mainAxis: props.sideOffset + arrowHeight.value,
					alignmentAxis: props.alignOffset
				}),
				props.prioritizePosition && props.avoidCollisions && flip({
					...detectOverflowOptions.value,
					...flipOptions.value
				}),
				props.avoidCollisions && shift({
					mainAxis: true,
					crossAxis: !!props.prioritizePosition,
					limiter: props.sticky === "partial" ? limitShift() : void 0,
					...detectOverflowOptions.value
				}),
				!props.prioritizePosition && props.avoidCollisions && flip({
					...detectOverflowOptions.value,
					...flipOptions.value
				}),
				size({
					...detectOverflowOptions.value,
					apply: ({ elements, rects, availableWidth, availableHeight }) => {
						const { width: anchorWidth, height: anchorHeight } = rects.reference;
						const contentStyle = elements.floating.style;
						contentStyle.setProperty("--reka-popper-available-width", `${availableWidth}px`);
						contentStyle.setProperty("--reka-popper-available-height", `${availableHeight}px`);
						contentStyle.setProperty("--reka-popper-anchor-width", `${anchorWidth}px`);
						contentStyle.setProperty("--reka-popper-anchor-height", `${anchorHeight}px`);
					}
				}),
				arrow$1.value && arrow({
					element: arrow$1.value,
					padding: props.arrowPadding
				}),
				transformOrigin({
					arrowWidth: arrowWidth.value,
					arrowHeight: arrowHeight.value,
					dir: dir.value
				}),
				props.hideWhenDetached && hide({
					strategy: "referenceHidden",
					...detectOverflowOptions.value
				})
			];
		});
		const { floatingStyles, placement, isPositioned, middlewareData} = useFloating((0, vue_exports.computed)(() => props.reference ?? rootContext.anchor.value), floatingRef, {
			strategy: props.positionStrategy,
			placement: desiredPlacement,
			whileElementsMounted: (...args) => {
				return autoUpdate(...args, {
					layoutShift: !props.disableUpdateOnLayoutShift,
					animationFrame: props.updatePositionStrategy === "always"
				});
			},
			middleware: computedMiddleware
		});
		const placedSide = (0, vue_exports.computed)(() => getSideAndAlignFromPlacement(placement.value)[0]);
		const placedAlign = (0, vue_exports.computed)(() => getSideAndAlignFromPlacement(placement.value)[1]);
		(0, vue_exports.watchPostEffect)(() => {
			if (isPositioned.value) emits("placed");
		});
		const shouldHideArrow = (0, vue_exports.computed)(() => {
			const cannotCenterArrow = middlewareData.value.arrow?.centerOffset !== 0;
			return props.hideShiftedArrow && cannotCenterArrow;
		});
		const contentZIndex = (0, vue_exports.ref)("");
		(0, vue_exports.watchEffect)(() => {
			if (contentElement.value) contentZIndex.value = (void 0).getComputedStyle(contentElement.value).zIndex;
		});
		providePopperContentContext({
			placedSide,
			onArrowChange: (element) => arrow$1.value = element,
			arrowX: (0, vue_exports.computed)(() => middlewareData.value.arrow?.x ?? 0),
			arrowY: (0, vue_exports.computed)(() => middlewareData.value.arrow?.y ?? 0),
			shouldHideArrow
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("div", {
				ref_key: "floatingRef",
				ref: floatingRef,
				"data-reka-popper-content-wrapper": "",
				dir: (0, vue_exports.unref)(dir),
				style: (0, vue_exports.normalizeStyle)({
					...(0, vue_exports.unref)(floatingStyles),
					transform: (0, vue_exports.unref)(isPositioned) ? (0, vue_exports.unref)(floatingStyles).transform : "translate(0, -200%)",
					minWidth: "max-content",
					zIndex: contentZIndex.value,
					["--reka-popper-transform-origin"]: [(0, vue_exports.unref)(middlewareData).transformOrigin?.x, (0, vue_exports.unref)(middlewareData).transformOrigin?.y].join(" "),
					...(0, vue_exports.unref)(middlewareData).hide?.referenceHidden && {
						visibility: "hidden",
						pointerEvents: "none"
					}
				})
			}, [props.memoDependencies ? (0, vue_exports.withMemo)([
				props.asChild,
				props.as,
				placedSide.value,
				placedAlign.value,
				(0, vue_exports.unref)(isPositioned),
				...Object.values(_ctx.$attrs),
				...props.memoDependencies
			], () => ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)({
				key: 0,
				ref: (0, vue_exports.unref)(forwardRef)
			}, _ctx.$attrs, {
				"as-child": props.asChild,
				as: props.as,
				"data-side": placedSide.value,
				"data-align": placedAlign.value,
				style: { animation: !(0, vue_exports.unref)(isPositioned) ? "none" : void 0 }
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"as-child",
				"as",
				"data-side",
				"data-align",
				"style"
			])), _cache, 0) : ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)({
				key: 1,
				ref: (0, vue_exports.unref)(forwardRef)
			}, _ctx.$attrs, {
				"as-child": props.asChild,
				as: props.as,
				"data-side": placedSide.value,
				"data-align": placedAlign.value,
				dir: (0, vue_exports.unref)(dir),
				style: { animation: !(0, vue_exports.unref)(isPositioned) ? "none" : void 0 }
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"as-child",
				"as",
				"data-side",
				"data-align",
				"dir",
				"style"
			]))], 12, _hoisted_1);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuAnchor.js
var MenuAnchor_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuAnchor",
	props: {
		reference: {
			type: null,
			required: false
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
	setup(__props) {
		const props = __props;
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(PopperAnchor_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)(props)), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/shared/useIsUsingKeyboard.js
function useIsUsingKeyboardImpl() {
	return (0, vue_exports.ref)(false);
}
var useIsUsingKeyboard = createSharedComposable(useIsUsingKeyboardImpl);
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuRoot.js
var [injectMenuContext, provideMenuContext] = /*#__PURE__*/ createContext(["MenuRoot", "MenuSub"], "MenuContext");
var [injectMenuRootContext, provideMenuRootContext] = /*#__PURE__*/ createContext("MenuRoot");
var MenuRoot_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuRoot",
	props: {
		open: {
			type: Boolean,
			required: false,
			default: false
		},
		dir: {
			type: String,
			required: false
		},
		modal: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { modal, dir: propDir } = (0, vue_exports.toRefs)(props);
		const dir = useDirection(propDir);
		const open = useVModel(props, "open", emits);
		const content = (0, vue_exports.ref)();
		const isUsingKeyboardRef = useIsUsingKeyboard();
		provideMenuContext({
			open,
			onOpenChange: (value) => {
				open.value = value;
			},
			content,
			onContentChange: (element) => {
				content.value = element;
			}
		});
		provideMenuRootContext({
			onClose: () => {
				open.value = false;
			},
			isUsingKeyboardRef,
			dir,
			modal
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(PopperRoot_default), null, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			});
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuContentImpl.js
var [injectMenuContentContext, provideMenuContentContext] = /*#__PURE__*/ createContext("MenuContent");
var MenuContentImpl_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuContentImpl",
	props: /* @__PURE__ */ (0, vue_exports.mergeDefaults)({
		loop: {
			type: Boolean,
			required: false
		},
		disableOutsidePointerEvents: {
			type: Boolean,
			required: false
		},
		disableOutsideScroll: {
			type: Boolean,
			required: false
		},
		trapFocus: {
			type: Boolean,
			required: false
		},
		memoDependencies: {
			type: Array,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		hideShiftedArrow: {
			type: Boolean,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
		reference: {
			type: null,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	}, { ...PopperContentPropsDefaultValue }),
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"entryFocus",
		"openAutoFocus",
		"closeAutoFocus",
		"dismiss"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const menuContext = injectMenuContext();
		const rootContext = injectMenuRootContext();
		const { trapFocus, disableOutsidePointerEvents, loop } = (0, vue_exports.toRefs)(props);
		useFocusGuards();
		useBodyScrollLock(disableOutsidePointerEvents.value);
		const searchRef = (0, vue_exports.ref)("");
		const timerRef = (0, vue_exports.ref)(0);
		const pointerGraceTimerRef = (0, vue_exports.ref)(0);
		const pointerGraceIntentRef = (0, vue_exports.ref)(null);
		const pointerDirRef = (0, vue_exports.ref)("right");
		const lastPointerXRef = (0, vue_exports.ref)(0);
		const currentItemId = (0, vue_exports.ref)(null);
		const rovingFocusGroupRef = (0, vue_exports.ref)();
		const { forwardRef, currentElement: contentElement } = useForwardExpose();
		const { handleTypeaheadSearch } = useTypeahead();
		const highlightedElement = (0, vue_exports.ref)();
		function onKeydownNavigation(event) {
			const el = useArrowNavigation(event, highlightedElement.value || getActiveElement(), contentElement.value, {
				loop: loop.value,
				arrowKeyOptions: "vertical",
				dir: rootContext?.dir.value,
				focus: false,
				attributeName: "[data-reka-collection-item]:not([data-disabled])"
			});
			if (el) {
				highlightedElement.value = el;
				el.scrollIntoView({ block: "nearest" });
			}
		}
		function onKeydownEnter() {
			if (highlightedElement.value) highlightedElement.value.click();
		}
		const filterElement = (0, vue_exports.ref)();
		const activeSubmenuContext = (0, vue_exports.ref)();
		(0, vue_exports.watch)(highlightedElement, (el) => {
			if (activeSubmenuContext.value && (el === void 0 || el !== activeSubmenuContext.value.trigger.value)) {
				if (el === void 0) return;
				activeSubmenuContext.value.onOpenChange(false);
				activeSubmenuContext.value = void 0;
			}
		});
		(0, vue_exports.watch)(contentElement, (el) => {
			menuContext.onContentChange(el);
		});
		function isPointerMovingToSubmenu(event) {
			return pointerDirRef.value === pointerGraceIntentRef.value?.side && isPointerInGraceArea(event, pointerGraceIntentRef.value?.area);
		}
		async function handleMountAutoFocus(event) {
			emits("openAutoFocus", event);
			if (event.defaultPrevented) return;
			event.preventDefault();
			contentElement.value?.focus({ preventScroll: true });
		}
		function handleKeyDown(event) {
			if (event.defaultPrevented) return;
			const target = event.target;
			const isKeyDownInside = target.closest("[data-reka-menu-content]") === event.currentTarget;
			const isKeyDownInTextField = ["input", "textarea"].includes(target.tagName.toLowerCase());
			const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
			const isCharacterKey = event.key.length === 1;
			const el = useArrowNavigation(event, getActiveElement(), contentElement.value, {
				loop: loop.value,
				arrowKeyOptions: "vertical",
				dir: rootContext?.dir.value,
				focus: true,
				attributeName: "[data-reka-collection-item]:not([data-disabled])"
			});
			if (el) return el?.focus();
			if (event.code === "Space") return;
			const collectionItems = rovingFocusGroupRef.value?.getItems() ?? [];
			if (isKeyDownInside) {
				if (event.key === "Tab" && rootContext.modal.value) event.preventDefault();
				if (!isModifierKey && isCharacterKey && !isKeyDownInTextField) handleTypeaheadSearch(event.key, collectionItems);
			}
			if (event.target !== contentElement.value) return;
			if (!FIRST_LAST_KEYS.includes(event.key)) return;
			event.preventDefault();
			const candidateNodes = [...collectionItems.map((item) => item.ref)];
			if (LAST_KEYS.includes(event.key)) candidateNodes.reverse();
			focusFirst(candidateNodes);
		}
		function handleBlur(event) {
			if (!event?.currentTarget?.contains?.(event.target)) {
				(void 0).clearTimeout(timerRef.value);
				searchRef.value = "";
			}
		}
		function handlePointerMove(event) {
			if (!isMouseEvent(event)) return;
			const target = event.target;
			const pointerXHasChanged = lastPointerXRef.value !== event.clientX;
			if ((event?.currentTarget)?.contains(target) && pointerXHasChanged) {
				const newDir = event.clientX > lastPointerXRef.value ? "right" : "left";
				pointerDirRef.value = newDir;
				lastPointerXRef.value = event.clientX;
			}
		}
		function handlePointerEnter(event) {
			if (!isMouseEvent(event)) return;
			if (filterElement.value) filterElement.value.focus();
		}
		provideMenuContentContext({
			onItemEnter: (event) => {
				if (isPointerMovingToSubmenu(event)) return true;
				else return false;
			},
			onItemLeave: (event) => {
				if (isPointerMovingToSubmenu(event)) return true;
				if (!["INPUT", "TEXTAREA"].includes(getActiveElement()?.tagName || "")) contentElement.value?.focus();
				currentItemId.value = null;
				return false;
			},
			onTriggerLeave: (event) => {
				if (isPointerMovingToSubmenu(event)) return true;
				else return false;
			},
			searchRef,
			highlightedElement,
			onKeydownNavigation,
			onKeydownEnter,
			filterElement,
			onFilterElementChange: (el) => {
				filterElement.value = el;
			},
			activeSubmenuContext,
			pointerGraceTimerRef,
			onPointerGraceIntentChange: (intent) => {
				pointerGraceIntentRef.value = intent;
			}
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(FocusScope_default), {
				"as-child": "",
				trapped: (0, vue_exports.unref)(trapFocus),
				onMountAutoFocus: handleMountAutoFocus,
				onUnmountAutoFocus: _cache[7] || (_cache[7] = ($event) => emits("closeAutoFocus", $event))
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(DismissableLayer_default), {
					"as-child": "",
					"disable-outside-pointer-events": (0, vue_exports.unref)(disableOutsidePointerEvents),
					onEscapeKeyDown: _cache[2] || (_cache[2] = ($event) => emits("escapeKeyDown", $event)),
					onPointerDownOutside: _cache[3] || (_cache[3] = ($event) => emits("pointerDownOutside", $event)),
					onFocusOutside: _cache[4] || (_cache[4] = ($event) => emits("focusOutside", $event)),
					onInteractOutside: _cache[5] || (_cache[5] = ($event) => emits("interactOutside", $event)),
					onDismiss: _cache[6] || (_cache[6] = ($event) => emits("dismiss"))
				}, {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(RovingFocusGroup_default), {
						ref_key: "rovingFocusGroupRef",
						ref: rovingFocusGroupRef,
						"current-tab-stop-id": currentItemId.value,
						"onUpdate:currentTabStopId": _cache[0] || (_cache[0] = ($event) => currentItemId.value = $event),
						"as-child": "",
						orientation: "vertical",
						dir: (0, vue_exports.unref)(rootContext).dir.value,
						loop: (0, vue_exports.unref)(loop),
						onEntryFocus: _cache[1] || (_cache[1] = (event) => {
							emits("entryFocus", event);
							if (!(0, vue_exports.unref)(rootContext).isUsingKeyboardRef.value) event.preventDefault();
						})
					}, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(PopperContent_default), {
							ref: (0, vue_exports.unref)(forwardRef),
							role: "menu",
							as: _ctx.as,
							"as-child": _ctx.asChild,
							"aria-orientation": "vertical",
							"data-reka-menu-content": "",
							"data-state": (0, vue_exports.unref)(getOpenState)((0, vue_exports.unref)(menuContext).open.value),
							dir: (0, vue_exports.unref)(rootContext).dir.value,
							side: _ctx.side,
							"side-offset": _ctx.sideOffset,
							align: _ctx.align,
							"align-offset": _ctx.alignOffset,
							"avoid-collisions": _ctx.avoidCollisions,
							"collision-boundary": _ctx.collisionBoundary,
							"collision-padding": _ctx.collisionPadding,
							"arrow-padding": _ctx.arrowPadding,
							"prioritize-position": _ctx.prioritizePosition,
							"position-strategy": _ctx.positionStrategy,
							"update-position-strategy": _ctx.updatePositionStrategy,
							sticky: _ctx.sticky,
							"hide-when-detached": _ctx.hideWhenDetached,
							reference: _ctx.reference,
							onKeydown: handleKeyDown,
							onBlur: handleBlur,
							onPointermove: handlePointerMove,
							onPointerenter: handlePointerEnter
						}, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
							_: 3
						}, 8, [
							"as",
							"as-child",
							"data-state",
							"dir",
							"side",
							"side-offset",
							"align",
							"align-offset",
							"avoid-collisions",
							"collision-boundary",
							"collision-padding",
							"arrow-padding",
							"prioritize-position",
							"position-strategy",
							"update-position-strategy",
							"sticky",
							"hide-when-detached",
							"reference"
						])]),
						_: 3
					}, 8, [
						"current-tab-stop-id",
						"dir",
						"loop"
					])]),
					_: 3
				}, 8, ["disable-outside-pointer-events"])]),
				_: 3
			}, 8, ["trapped"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuItemImpl.js
var MenuItemImpl_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "MenuItemImpl",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
			required: false
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
	setup(__props) {
		const props = __props;
		const contentContext = injectMenuContentContext();
		const { forwardRef, currentElement } = useForwardExpose();
		const { CollectionItem } = useCollection();
		const isFocused = (0, vue_exports.ref)(false);
		const isHighlighted = (0, vue_exports.computed)(() => isFocused.value || currentElement.value != null && contentContext.highlightedElement.value === currentElement.value);
		async function handlePointerMove(event) {
			if (event.defaultPrevented || !isMouseEvent(event)) return;
			if (props.disabled) contentContext.onItemLeave(event);
			else if (!contentContext.onItemEnter(event)) {
				const item = event.currentTarget;
				contentContext.highlightedElement.value = item;
				if (!["INPUT", "TEXTAREA"].includes(getActiveElement()?.tagName || "")) item.focus({ preventScroll: true });
			}
		}
		async function handlePointerLeave(event) {
			await (0, vue_exports.nextTick)();
			if (event.defaultPrevented) return;
			if (!isMouseEvent(event)) return;
			if (contentContext.highlightedElement.value !== currentElement.value) return;
			if (!contentContext.onItemLeave(event) && contentContext.highlightedElement.value === currentElement.value) contentContext.highlightedElement.value = void 0;
		}
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(CollectionItem), { value: { textValue: _ctx.textValue } }, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)({
					ref: (0, vue_exports.unref)(forwardRef),
					role: "menuitem",
					tabindex: "-1"
				}, _ctx.$attrs, {
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"aria-disabled": _ctx.disabled || void 0,
					"data-disabled": _ctx.disabled ? "" : void 0,
					"data-highlighted": isHighlighted.value ? "" : void 0,
					onPointermove: handlePointerMove,
					onPointerleave: handlePointerLeave,
					onFocus: _cache[0] || (_cache[0] = async (event) => {
						await (0, vue_exports.nextTick)();
						if (event.defaultPrevented || _ctx.disabled) return;
						isFocused.value = true;
						(0, vue_exports.unref)(contentContext).highlightedElement.value = event.currentTarget;
					}),
					onBlur: _cache[1] || (_cache[1] = async (event) => {
						await (0, vue_exports.nextTick)();
						if (event.defaultPrevented) return;
						isFocused.value = false;
					})
				}), {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"as",
					"as-child",
					"aria-disabled",
					"data-disabled",
					"data-highlighted"
				])]),
				_: 3
			}, 8, ["value"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuItem.js
var MenuItem_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuItem",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
			required: false
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
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement } = useForwardExpose();
		const rootContext = injectMenuRootContext();
		const contentContext = injectMenuContentContext();
		const isPointerDownRef = (0, vue_exports.ref)(false);
		async function handleSelect() {
			const menuItem = currentElement.value;
			if (!props.disabled && menuItem) {
				const itemSelectEvent = new CustomEvent(ITEM_SELECT, {
					bubbles: true,
					cancelable: true
				});
				emits("select", itemSelectEvent);
				await (0, vue_exports.nextTick)();
				if (itemSelectEvent.defaultPrevented) isPointerDownRef.value = false;
				else rootContext.onClose();
			}
		}
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(MenuItemImpl_default, (0, vue_exports.mergeProps)(props, {
				ref: (0, vue_exports.unref)(forwardRef),
				onClick: handleSelect,
				onPointerdown: _cache[0] || (_cache[0] = () => {
					isPointerDownRef.value = true;
				}),
				onPointerup: _cache[1] || (_cache[1] = async (event) => {
					await (0, vue_exports.nextTick)();
					if (event.defaultPrevented) return;
					if (!isPointerDownRef.value) event.currentTarget?.click();
				}),
				onKeydown: _cache[2] || (_cache[2] = async (event) => {
					const isTypingAhead = (0, vue_exports.unref)(contentContext).searchRef.value !== "";
					if (_ctx.disabled || isTypingAhead && event.key === " ") return;
					if ((0, vue_exports.unref)(SELECTION_KEYS).includes(event.key)) {
						event.currentTarget?.click();
						/**
						* We prevent default browser behaviour for selection keys as they should trigger
						* a selection only:
						* - prevents space from scrolling the page.
						* - if keydown causes focus to move, prevents keydown from firing on the new target.
						*/
						event.preventDefault();
					}
				})
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuItemIndicator.js
var [injectMenuItemIndicatorContext, provideMenuItemIndicatorContext] = /*#__PURE__*/ createContext(["MenuCheckboxItem", "MenuRadioItem"], "MenuItemIndicatorContext");
var MenuItemIndicator_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuItemIndicator",
	props: {
		forceMount: {
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
		const indicatorContext = injectMenuItemIndicatorContext({ modelValue: (0, vue_exports.ref)(false) });
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Presence_default), { present: _ctx.forceMount || (0, vue_exports.unref)(isIndeterminate)((0, vue_exports.unref)(indicatorContext).modelValue.value) || (0, vue_exports.unref)(indicatorContext).modelValue.value === true }, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(Primitive), {
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"data-state": (0, vue_exports.unref)(getCheckedState)((0, vue_exports.unref)(indicatorContext).modelValue.value)
				}, {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"as",
					"as-child",
					"data-state"
				])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuCheckboxItem.js
var MenuCheckboxItem_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuCheckboxItem",
	props: {
		modelValue: {
			type: [Boolean, String],
			required: false,
			default: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
			required: false
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
	emits: ["select", "update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardProps(reactiveOmit(props, ["modelValue"]));
		const modelValue = useVModel(props, "modelValue", emits);
		provideMenuItemIndicatorContext({ modelValue });
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(MenuItem_default, (0, vue_exports.mergeProps)({ role: "menuitemcheckbox" }, (0, vue_exports.unref)(forwarded), {
				"aria-checked": (0, vue_exports.unref)(isIndeterminate)((0, vue_exports.unref)(modelValue)) ? "mixed" : (0, vue_exports.unref)(modelValue),
				"data-state": (0, vue_exports.unref)(getCheckedState)((0, vue_exports.unref)(modelValue)),
				onSelect: _cache[0] || (_cache[0] = async (event) => {
					emits("select", event);
					if ((0, vue_exports.unref)(isIndeterminate)((0, vue_exports.unref)(modelValue))) modelValue.value = true;
					else modelValue.value = !(0, vue_exports.unref)(modelValue);
				})
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue_exports.unref)(modelValue) })]),
				_: 3
			}, 16, ["aria-checked", "data-state"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuRootContentModal.js
var MenuRootContentModal_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuRootContentModal",
	props: {
		loop: {
			type: Boolean,
			required: false
		},
		memoDependencies: {
			type: Array,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		hideShiftedArrow: {
			type: Boolean,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
		reference: {
			type: null,
			required: false
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"entryFocus",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(props, emits);
		const menuContext = injectMenuContext();
		const { forwardRef, currentElement } = useForwardExpose();
		useHideOthers(currentElement);
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(MenuContentImpl_default, (0, vue_exports.mergeProps)((0, vue_exports.unref)(forwarded), {
				ref: (0, vue_exports.unref)(forwardRef),
				"trap-focus": (0, vue_exports.unref)(menuContext).open.value,
				"disable-outside-pointer-events": (0, vue_exports.unref)(menuContext).open.value,
				"disable-outside-scroll": true,
				onDismiss: _cache[0] || (_cache[0] = ($event) => (0, vue_exports.unref)(menuContext).onOpenChange(false)),
				onFocusOutside: _cache[1] || (_cache[1] = (0, vue_exports.withModifiers)(($event) => emits("focusOutside", $event), ["prevent"]))
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["trap-focus", "disable-outside-pointer-events"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuRootContentNonModal.js
var MenuRootContentNonModal_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuRootContentNonModal",
	props: {
		loop: {
			type: Boolean,
			required: false
		},
		memoDependencies: {
			type: Array,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		hideShiftedArrow: {
			type: Boolean,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
		reference: {
			type: null,
			required: false
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"entryFocus",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		const menuContext = injectMenuContext();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(MenuContentImpl_default, (0, vue_exports.mergeProps)((0, vue_exports.unref)(forwarded), {
				"trap-focus": false,
				"disable-outside-pointer-events": false,
				"disable-outside-scroll": false,
				onDismiss: _cache[0] || (_cache[0] = ($event) => (0, vue_exports.unref)(menuContext).onOpenChange(false))
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuContent.js
var MenuContent_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		loop: {
			type: Boolean,
			required: false
		},
		memoDependencies: {
			type: Array,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		hideShiftedArrow: {
			type: Boolean,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
		reference: {
			type: null,
			required: false
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"entryFocus",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		const menuContext = injectMenuContext();
		const rootContext = injectMenuRootContext();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Presence_default), { present: _ctx.forceMount || (0, vue_exports.unref)(menuContext).open.value }, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.unref)(rootContext).modal.value ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(MenuRootContentModal_default, (0, vue_exports.normalizeProps)((0, vue_exports.mergeProps)({ key: 0 }, {
					..._ctx.$attrs,
					...(0, vue_exports.unref)(forwarded)
				})), {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16)) : ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(MenuRootContentNonModal_default, (0, vue_exports.normalizeProps)((0, vue_exports.mergeProps)({ key: 1 }, {
					..._ctx.$attrs,
					...(0, vue_exports.unref)(forwarded)
				})), {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16))]),
				_: 3
			}, 8, ["present"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuGroup.js
var [injectMenuGroupContext, provideMenuGroupContext] = /*#__PURE__*/ createContext("MenuGroup");
var MenuGroup_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuGroup",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const id = useId(void 0, "reka-menu-group");
		provideMenuGroupContext({ id });
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)({ role: "group" }, props, { "aria-labelledby": (0, vue_exports.unref)(id) }), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["aria-labelledby"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuLabel.js
var MenuLabel_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuLabel",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "div"
		}
	},
	setup(__props) {
		const props = __props;
		const groupContext = injectMenuGroupContext({ id: "" });
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)(props, { id: (0, vue_exports.unref)(groupContext).id || void 0 }), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuPortal.js
var MenuPortal_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuPortal",
	props: {
		to: {
			type: null,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		defer: {
			type: Boolean,
			required: false
		},
		forceMount: {
			type: Boolean,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Teleport_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)(props)), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuRadioGroup.js
var [injectMenuRadioGroupContext, provideMenuRadioGroupContext] = /*#__PURE__*/ createContext("MenuRadioGroup");
var MenuRadioGroup_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuRadioGroup",
	props: {
		modelValue: {
			type: null,
			required: false,
			default: ""
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
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardProps(reactiveOmit(props, ["modelValue"]));
		const modelValue = useVModel(props, "modelValue", emits);
		provideMenuRadioGroupContext({
			modelValue,
			onValueChange: (payload) => {
				modelValue.value = payload;
			}
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(MenuGroup_default, (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)((0, vue_exports.unref)(forwarded))), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue_exports.unref)(modelValue) })]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuRadioItem.js
var MenuRadioItem_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuRadioItem",
	props: {
		value: {
			type: null,
			required: true
		},
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
			required: false
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
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardProps(reactiveOmit$1(props, ["value"]));
		const { value } = (0, vue_exports.toRefs)(props);
		const radioGroupContext = injectMenuRadioGroupContext();
		const modelValue = (0, vue_exports.computed)(() => radioGroupContext.modelValue.value === value?.value);
		provideMenuItemIndicatorContext({ modelValue });
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(MenuItem_default, (0, vue_exports.mergeProps)({ role: "menuitemradio" }, (0, vue_exports.unref)(forwarded), {
				"aria-checked": modelValue.value,
				"data-state": (0, vue_exports.unref)(getCheckedState)(modelValue.value),
				onSelect: _cache[0] || (_cache[0] = async (event) => {
					emits("select", event);
					(0, vue_exports.unref)(radioGroupContext).onValueChange((0, vue_exports.unref)(value));
				})
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["aria-checked", "data-state"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuSeparator.js
var MenuSeparator_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuSeparator",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)(props, {
				role: "separator",
				"aria-orientation": "horizontal"
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuSub.js
var [injectMenuSubContext, provideMenuSubContext] = /*#__PURE__*/ createContext("MenuSub");
var MenuSub_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuSub",
	props: { open: {
		type: Boolean,
		required: false,
		default: void 0
	} },
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const open = useVModel(props, "open", __emit, {
			defaultValue: false,
			passive: props.open === void 0
		});
		const parentMenuContext = injectMenuContext();
		const trigger = (0, vue_exports.ref)();
		const content = (0, vue_exports.ref)();
		(0, vue_exports.watchEffect)((cleanupFn) => {
			if (parentMenuContext?.open.value === false) open.value = false;
			cleanupFn(() => open.value = false);
		});
		provideMenuContext({
			open,
			onOpenChange: (value) => {
				open.value = value;
			},
			content,
			onContentChange: (element) => {
				content.value = element;
			}
		});
		provideMenuSubContext({
			triggerId: "",
			contentId: "",
			trigger,
			onTriggerChange: (element) => {
				trigger.value = element;
			}
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(PopperRoot_default), null, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			});
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuSubContent.js
var MenuSubContent_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuSubContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		loop: {
			type: Boolean,
			required: false
		},
		memoDependencies: {
			type: Array,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		hideShiftedArrow: {
			type: Boolean,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false,
			default: true
		},
		reference: {
			type: null,
			required: false
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"entryFocus",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		const menuContext = injectMenuContext();
		const rootContext = injectMenuRootContext();
		const menuSubContext = injectMenuSubContext();
		const parentContentContext = injectMenuContentContext();
		const { forwardRef, currentElement: subContentElement } = useForwardExpose();
		menuSubContext.contentId ||= useId(void 0, "reka-menu-sub-content");
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Presence_default), { present: _ctx.forceMount || (0, vue_exports.unref)(menuContext).open.value }, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(MenuContentImpl_default, (0, vue_exports.mergeProps)((0, vue_exports.unref)(forwarded), {
					id: (0, vue_exports.unref)(menuSubContext).contentId,
					ref: (0, vue_exports.unref)(forwardRef),
					"aria-labelledby": (0, vue_exports.unref)(menuSubContext).triggerId,
					align: "start",
					side: (0, vue_exports.unref)(rootContext).dir.value === "rtl" ? "left" : "right",
					"disable-outside-pointer-events": false,
					"disable-outside-scroll": false,
					"trap-focus": false,
					onOpenAutoFocus: _cache[0] || (_cache[0] = (0, vue_exports.withModifiers)((event) => {
						if ((0, vue_exports.unref)(rootContext).isUsingKeyboardRef.value) (0, vue_exports.unref)(subContentElement)?.focus();
					}, ["prevent"])),
					onCloseAutoFocus: _cache[1] || (_cache[1] = (0, vue_exports.withModifiers)(() => {}, ["prevent"])),
					onFocusOutside: _cache[2] || (_cache[2] = (event) => {
						if (event.defaultPrevented) return;
						const isMovingToParentContent = (0, vue_exports.unref)(parentContentContext).filterElement.value?.contains(event.target);
						if (event.target !== (0, vue_exports.unref)(menuSubContext).trigger.value && !isMovingToParentContent) (0, vue_exports.unref)(menuContext).onOpenChange(false);
					}),
					onEscapeKeyDown: _cache[3] || (_cache[3] = (event) => {
						(0, vue_exports.unref)(rootContext).onClose();
						event.preventDefault();
					}),
					onKeydown: _cache[4] || (_cache[4] = (event) => {
						const isKeyDownInside = event.currentTarget?.contains(event.target);
						const isCloseKey = (0, vue_exports.unref)(SUB_CLOSE_KEYS)[(0, vue_exports.unref)(rootContext).dir.value].includes(event.key);
						if (isKeyDownInside && isCloseKey) {
							(0, vue_exports.unref)(menuContext).onOpenChange(false);
							if ((0, vue_exports.unref)(parentContentContext).filterElement.value) {
								(0, vue_exports.unref)(parentContentContext).filterElement.value.focus();
								(0, vue_exports.unref)(parentContentContext).highlightedElement.value = (0, vue_exports.unref)(menuSubContext).trigger.value;
								(0, vue_exports.unref)(menuSubContext).trigger.value?.scrollIntoView({ block: "nearest" });
							} else (0, vue_exports.unref)(menuSubContext).trigger.value?.focus();
							event.preventDefault();
						}
					})
				}), {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"aria-labelledby",
					"side"
				])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Menu/MenuSubTrigger.js
var MenuSubTrigger_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "MenuSubTrigger",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
			required: false
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
	setup(__props) {
		const props = __props;
		const menuContext = injectMenuContext();
		const rootContext = injectMenuRootContext();
		const subContext = injectMenuSubContext();
		const contentContext = injectMenuContentContext();
		(0, vue_exports.watch)(menuContext.open, (open) => {
			if (open) contentContext.activeSubmenuContext.value = {
				onOpenChange: menuContext.onOpenChange,
				trigger: subContext.trigger
			};
			else if (contentContext.activeSubmenuContext.value?.trigger.value === subContext.trigger.value) contentContext.activeSubmenuContext.value = void 0;
		});
		const openTimerRef = (0, vue_exports.ref)(null);
		subContext.triggerId ||= useId(void 0, "reka-menu-sub-trigger");
		function clearOpenTimer() {
			if (openTimerRef.value) (void 0).clearTimeout(openTimerRef.value);
			openTimerRef.value = null;
		}
		function handlePointerMove(event) {
			if (!isMouseEvent(event)) return;
			if (contentContext.onItemEnter(event)) return;
			if (!props.disabled && !menuContext.open.value && !openTimerRef.value) {
				contentContext.onPointerGraceIntentChange(null);
				openTimerRef.value = (void 0).setTimeout(() => {
					menuContext.onOpenChange(true);
					clearOpenTimer();
				}, 100);
			}
		}
		async function handlePointerLeave(event) {
			if (!isMouseEvent(event)) return;
			clearOpenTimer();
			const contentRect = menuContext.content.value?.getBoundingClientRect();
			if (contentRect?.width) {
				const side = menuContext.content.value?.dataset.side;
				const rightSide = side === "right";
				const bleed = rightSide ? -5 : 5;
				const contentNearEdge = contentRect[rightSide ? "left" : "right"];
				const contentFarEdge = contentRect[rightSide ? "right" : "left"];
				contentContext.onPointerGraceIntentChange({
					area: [
						{
							x: event.clientX + bleed,
							y: event.clientY
						},
						{
							x: contentNearEdge,
							y: contentRect.top
						},
						{
							x: contentFarEdge,
							y: contentRect.top
						},
						{
							x: contentFarEdge,
							y: contentRect.bottom
						},
						{
							x: contentNearEdge,
							y: contentRect.bottom
						}
					],
					side
				});
				(void 0).clearTimeout(contentContext.pointerGraceTimerRef.value);
				contentContext.pointerGraceTimerRef.value = (void 0).setTimeout(() => contentContext.onPointerGraceIntentChange(null), 300);
			} else {
				if (contentContext.onTriggerLeave(event)) return;
				contentContext.onPointerGraceIntentChange(null);
			}
		}
		async function handleKeyDown(event) {
			const isTypingAhead = contentContext.searchRef.value !== "";
			if (props.disabled || isTypingAhead && event.key === " ") return;
			if (SUB_OPEN_KEYS[rootContext.dir.value].includes(event.key)) {
				menuContext.onOpenChange(true);
				await (0, vue_exports.nextTick)();
				menuContext.content.value?.focus();
				event.preventDefault();
			}
		}
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(MenuAnchor_default, { "as-child": "" }, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(MenuItemImpl_default, (0, vue_exports.mergeProps)(props, {
					id: (0, vue_exports.unref)(subContext).triggerId,
					ref: (vnode) => {
						if (!vnode) return void 0;
						(0, vue_exports.unref)(subContext)?.onTriggerChange(vnode?.$el);
					},
					"aria-haspopup": "menu",
					"aria-expanded": (0, vue_exports.unref)(menuContext).open.value,
					"aria-controls": (0, vue_exports.unref)(subContext).contentId,
					"data-state": (0, vue_exports.unref)(getOpenState)((0, vue_exports.unref)(menuContext).open.value),
					onClick: _cache[0] || (_cache[0] = async (event) => {
						if (props.disabled || event.defaultPrevented) return;
						/**
						* We manually focus because iOS Safari doesn't always focus on click (e.g. buttons)
						* and we rely heavily on `onFocusOutside` for submenus to close when switching
						* between separate submenus.
						*/
						event.currentTarget?.focus();
						if (!(0, vue_exports.unref)(menuContext).open.value) (0, vue_exports.unref)(menuContext).onOpenChange(true);
					}),
					onPointermove: handlePointerMove,
					onPointerleave: handlePointerLeave,
					onKeydown: handleKeyDown
				}), {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"aria-expanded",
					"aria-controls",
					"data-state"
				])]),
				_: 3
			});
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuCheckboxItem.js
var DropdownMenuCheckboxItem_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuCheckboxItem",
	props: {
		modelValue: {
			type: [Boolean, String],
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
			required: false
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
	emits: ["select", "update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emitsAsProps = useEmitAsProps(__emit);
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuCheckboxItem_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)({
				...props,
				...(0, vue_exports.unref)(emitsAsProps)
			})), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuRoot.js
var [injectDropdownMenuRootContext, provideDropdownMenuRootContext] = /*#__PURE__*/ createContext("DropdownMenuRoot");
var DropdownMenuRoot_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuRoot",
	props: {
		defaultOpen: {
			type: Boolean,
			required: false
		},
		open: {
			type: Boolean,
			required: false,
			default: void 0
		},
		dir: {
			type: String,
			required: false
		},
		modal: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		useForwardExpose();
		const open = useVModel(props, "open", emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const triggerElement = (0, vue_exports.ref)();
		const { modal, dir: propDir } = (0, vue_exports.toRefs)(props);
		const dir = useDirection(propDir);
		provideDropdownMenuRootContext({
			open,
			onOpenChange: (value) => {
				open.value = value;
			},
			onOpenToggle: () => {
				open.value = !open.value;
			},
			triggerId: "",
			triggerElement,
			contentId: "",
			modal,
			dir
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuRoot_default), {
				open: (0, vue_exports.unref)(open),
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => (0, vue_exports.isRef)(open) ? open.value = $event : null),
				dir: (0, vue_exports.unref)(dir),
				modal: (0, vue_exports.unref)(modal)
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default", { open: (0, vue_exports.unref)(open) })]),
				_: 3
			}, 8, [
				"open",
				"dir",
				"modal"
			]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuContent.js
var DropdownMenuContent_default$1 = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		loop: {
			type: Boolean,
			required: false
		},
		memoDependencies: {
			type: Array,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		hideShiftedArrow: {
			type: Boolean,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
		reference: {
			type: null,
			required: false
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		useForwardExpose();
		const rootContext = injectDropdownMenuRootContext();
		const hasInteractedOutsideRef = (0, vue_exports.ref)(false);
		function handleCloseAutoFocus(event) {
			if (event.defaultPrevented) return;
			if (!hasInteractedOutsideRef.value) setTimeout(() => {
				rootContext.triggerElement.value?.focus();
			}, 0);
			hasInteractedOutsideRef.value = false;
			event.preventDefault();
		}
		rootContext.contentId ||= useId(void 0, "reka-dropdown-menu-content");
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuContent_default), (0, vue_exports.mergeProps)((0, vue_exports.unref)(forwarded), {
				id: (0, vue_exports.unref)(rootContext).contentId,
				"aria-labelledby": (0, vue_exports.unref)(rootContext)?.triggerId,
				style: {
					"--reka-dropdown-menu-content-transform-origin": "var(--reka-popper-transform-origin)",
					"--reka-dropdown-menu-content-available-width": "var(--reka-popper-available-width)",
					"--reka-dropdown-menu-content-available-height": "var(--reka-popper-available-height)",
					"--reka-dropdown-menu-trigger-width": "var(--reka-popper-anchor-width)",
					"--reka-dropdown-menu-trigger-height": "var(--reka-popper-anchor-height)"
				},
				onCloseAutoFocus: handleCloseAutoFocus,
				onInteractOutside: _cache[0] || (_cache[0] = (event) => {
					if (event.defaultPrevented) return;
					const originalEvent = event.detail.originalEvent;
					const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
					const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
					if (!(0, vue_exports.unref)(rootContext).modal.value || isRightClick) hasInteractedOutsideRef.value = true;
					if ((0, vue_exports.unref)(rootContext).triggerElement.value?.contains(event.target)) event.preventDefault();
				})
			}), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id", "aria-labelledby"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuGroup.js
var DropdownMenuGroup_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuGroup",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuGroup_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)(props)), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuItem.js
var DropdownMenuItem_default$1 = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuItem",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
			required: false
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
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emitsAsProps = useEmitAsProps(__emit);
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuItem_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)({
				...props,
				...(0, vue_exports.unref)(emitsAsProps)
			})), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuItemIndicator.js
var DropdownMenuItemIndicator_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuItemIndicator",
	props: {
		forceMount: {
			type: Boolean,
			required: false
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
	setup(__props) {
		const props = __props;
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuItemIndicator_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)(props)), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuLabel.js
var DropdownMenuLabel_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuLabel",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuLabel_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)(props)), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuPortal.js
var DropdownMenuPortal_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuPortal",
	props: {
		to: {
			type: null,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		defer: {
			type: Boolean,
			required: false
		},
		forceMount: {
			type: Boolean,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuPortal_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)(props)), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuRadioGroup.js
var DropdownMenuRadioGroup_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuRadioGroup",
	props: {
		modelValue: {
			type: null,
			required: false
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
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emitsAsProps = useEmitAsProps(__emit);
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuRadioGroup_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)({
				...props,
				...(0, vue_exports.unref)(emitsAsProps)
			})), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuRadioItem.js
var DropdownMenuRadioItem_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuRadioItem",
	props: {
		value: {
			type: null,
			required: true
		},
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
			required: false
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
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuRadioItem_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)((0, vue_exports.unref)(forwarded))), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuSeparator.js
var DropdownMenuSeparator_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuSeparator",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuSeparator_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)(props)), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuSub.js
var DropdownMenuSub_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuSub",
	props: {
		defaultOpen: {
			type: Boolean,
			required: false
		},
		open: {
			type: Boolean,
			required: false,
			default: void 0
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const open = useVModel(props, "open", __emit, {
			passive: props.open === void 0,
			defaultValue: props.defaultOpen ?? false
		});
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuSub_default), {
				open: (0, vue_exports.unref)(open),
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => (0, vue_exports.isRef)(open) ? open.value = $event : null)
			}, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default", { open: (0, vue_exports.unref)(open) })]),
				_: 3
			}, 8, ["open"]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuSubContent.js
var DropdownMenuSubContent_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuSubContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		loop: {
			type: Boolean,
			required: false
		},
		memoDependencies: {
			type: Array,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		hideShiftedArrow: {
			type: Boolean,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
		reference: {
			type: null,
			required: false
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"entryFocus",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuSubContent_default), (0, vue_exports.mergeProps)((0, vue_exports.unref)(forwarded), { style: {
				"--reka-dropdown-menu-content-transform-origin": "var(--reka-popper-transform-origin)",
				"--reka-dropdown-menu-content-available-width": "var(--reka-popper-available-width)",
				"--reka-dropdown-menu-content-available-height": "var(--reka-popper-available-height)",
				"--reka-dropdown-menu-trigger-width": "var(--reka-popper-anchor-width)",
				"--reka-dropdown-menu-trigger-height": "var(--reka-popper-anchor-height)"
			} }), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuSubTrigger.js
var DropdownMenuSubTrigger_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuSubTrigger",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
			required: false
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
	setup(__props) {
		const props = __props;
		useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuSubTrigger_default), (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)(props)), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/DropdownMenu/DropdownMenuTrigger.js
var DropdownMenuTrigger_default$1 = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuTrigger",
	props: {
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
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectDropdownMenuRootContext();
		const { forwardRef} = useForwardExpose();
		rootContext.triggerId ||= useId(void 0, "reka-dropdown-menu-trigger");
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(MenuAnchor_default), { "as-child": "" }, {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(Primitive), {
					id: (0, vue_exports.unref)(rootContext).triggerId,
					ref: (0, vue_exports.unref)(forwardRef),
					type: _ctx.as === "button" ? "button" : void 0,
					"as-child": props.asChild,
					as: _ctx.as,
					"aria-haspopup": "menu",
					"aria-expanded": (0, vue_exports.unref)(rootContext).open.value,
					"aria-controls": (0, vue_exports.unref)(rootContext).open.value ? (0, vue_exports.unref)(rootContext).contentId : void 0,
					"data-disabled": _ctx.disabled ? "" : void 0,
					disabled: _ctx.disabled,
					"data-state": (0, vue_exports.unref)(rootContext).open.value ? "open" : "closed",
					onClick: _cache[0] || (_cache[0] = async (event) => {
						if (!_ctx.disabled && event.button === 0 && event.ctrlKey === false) {
							(0, vue_exports.unref)(rootContext)?.onOpenToggle();
							await (0, vue_exports.nextTick)();
							if ((0, vue_exports.unref)(rootContext).open.value) event.preventDefault();
						}
					}),
					onKeydown: _cache[1] || (_cache[1] = (0, vue_exports.withKeys)((event) => {
						if (_ctx.disabled) return;
						if (["Enter", " "].includes(event.key)) (0, vue_exports.unref)(rootContext).onOpenToggle();
						if (event.key === "ArrowDown") (0, vue_exports.unref)(rootContext).onOpenChange(true);
						if ([
							"Enter",
							" ",
							"ArrowDown"
						].includes(event.key)) event.preventDefault();
					}, [
						"enter",
						"space",
						"arrow-down"
					]))
				}, {
					default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"id",
					"type",
					"as-child",
					"as",
					"aria-expanded",
					"aria-controls",
					"data-disabled",
					"disabled",
					"data-state"
				])]),
				_: 3
			});
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/component/BaseSeparator.js
var BaseSeparator_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "BaseSeparator",
	props: {
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		decorative: {
			type: Boolean,
			required: false
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
	setup(__props) {
		const props = __props;
		const ORIENTATIONS = ["horizontal", "vertical"];
		function isValidOrientation(orientation) {
			return ORIENTATIONS.includes(orientation);
		}
		const computedOrientation = (0, vue_exports.computed)(() => isValidOrientation(props.orientation) ? props.orientation : "horizontal");
		const ariaOrientation = (0, vue_exports.computed)(() => computedOrientation.value === "vertical" ? props.orientation : void 0);
		const semanticProps = (0, vue_exports.computed)(() => props.decorative ? { role: "none" } : {
			"aria-orientation": ariaOrientation.value,
			"role": "separator"
		});
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)({
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-orientation": computedOrientation.value
			}, semanticProps.value), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"as",
				"as-child",
				"data-orientation"
			]);
		};
	}
});
//#endregion
//#region ../node_modules/.pnpm/reka-ui@2.10.4_vue@3.5.42_typescript@6.0.3_/node_modules/reka-ui/dist/Separator/Separator.js
var Separator_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "Separator",
	props: {
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		decorative: {
			type: Boolean,
			required: false
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
	setup(__props) {
		const props = __props;
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(BaseSeparator_default, (0, vue_exports.normalizeProps)((0, vue_exports.guardReactiveProps)(props)), {
				default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});
//#endregion
//#region ../app/components/ui/sheet/Sheet.vue?vue&type=script&setup=true&lang.ts
var Sheet_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "Sheet",
	__ssrInlineRender: true,
	props: {
		open: { type: Boolean },
		defaultOpen: { type: Boolean },
		modal: { type: Boolean },
		unmountOnHide: { type: Boolean }
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogRoot_default), (0, vue_exports.mergeProps)({ "data-slot": "sheet" }, (0, vue_exports.unref)(forwarded), _attrs), {
				default: (0, vue_exports.withCtx)((slotProps, _push, _parent, _scopeId) => {
					if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", slotProps, null, _push, _parent, _scopeId);
					else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default", slotProps)];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/sheet/Sheet.vue
var _sfc_setup$52 = Sheet_vue_vue_type_script_setup_true_lang_default.setup;
Sheet_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/sheet/Sheet.vue");
	return _sfc_setup$52 ? _sfc_setup$52(props, ctx) : void 0;
};
var Sheet_default = Sheet_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/sheet/SheetClose.vue?vue&type=script&setup=true&lang.ts
var SheetClose_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "SheetClose",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogClose_default), (0, vue_exports.mergeProps)({ "data-slot": "sheet-close" }, props, _attrs), {
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
//#region ../app/components/ui/sheet/SheetClose.vue
var _sfc_setup$51 = SheetClose_vue_vue_type_script_setup_true_lang_default.setup;
SheetClose_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/sheet/SheetClose.vue");
	return _sfc_setup$51 ? _sfc_setup$51(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/sheet/SheetOverlay.vue?vue&type=script&setup=true&lang.ts
var SheetOverlay_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "SheetOverlay",
	__ssrInlineRender: true,
	props: {
		forceMount: { type: Boolean },
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const delegatedProps = reactiveOmit(props, "class");
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogOverlay_default$1), (0, vue_exports.mergeProps)({
				"data-slot": "sheet-overlay",
				class: (0, vue_exports.unref)(cn)("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80", props.class)
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
//#region ../app/components/ui/sheet/SheetOverlay.vue
var _sfc_setup$50 = SheetOverlay_vue_vue_type_script_setup_true_lang_default.setup;
SheetOverlay_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/sheet/SheetOverlay.vue");
	return _sfc_setup$50 ? _sfc_setup$50(props, ctx) : void 0;
};
var SheetOverlay_default = SheetOverlay_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/sheet/SheetContent.vue?vue&type=script&setup=true&lang.ts
var SheetContent_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "SheetContent",
	__ssrInlineRender: true,
	props: {
		class: {},
		side: { default: "right" },
		forceMount: { type: Boolean },
		disableOutsidePointerEvents: { type: Boolean },
		asChild: { type: Boolean },
		as: {}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(reactiveOmit(props, "class", "side"), emits);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Icon = components_default;
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogPortal_default), _attrs, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push((0, server_renderer_exports.ssrRenderComponent)(SheetOverlay_default, null, null, _parent, _scopeId));
						_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogContent_default$1), (0, vue_exports.mergeProps)({
							"data-slot": "sheet-content",
							class: (0, vue_exports.unref)(cn)("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500", __props.side === "right" && "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm", __props.side === "left" && "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm", __props.side === "top" && "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b", __props.side === "bottom" && "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t", props.class)
						}, {
							..._ctx.$attrs,
							...(0, vue_exports.unref)(forwarded)
						}), {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) {
									(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
									_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogClose_default), { class: "ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none" }, {
										default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
											if (_push) {
												_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
													name: "lucide:x",
													class: "size-4"
												}, null, _parent, _scopeId));
												_push(`<span class="sr-only"${_scopeId}>Close</span>`);
											} else return [(0, vue_exports.createVNode)(_component_Icon, {
												name: "lucide:x",
												class: "size-4"
											}), (0, vue_exports.createVNode)("span", { class: "sr-only" }, "Close")];
										}),
										_: 1
									}, _parent, _scopeId));
								} else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default"), (0, vue_exports.createVNode)((0, vue_exports.unref)(DialogClose_default), { class: "ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none" }, {
									default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
										name: "lucide:x",
										class: "size-4"
									}), (0, vue_exports.createVNode)("span", { class: "sr-only" }, "Close")]),
									_: 1
								})];
							}),
							_: 3
						}, _parent, _scopeId));
					} else return [(0, vue_exports.createVNode)(SheetOverlay_default), (0, vue_exports.createVNode)((0, vue_exports.unref)(DialogContent_default$1), (0, vue_exports.mergeProps)({
						"data-slot": "sheet-content",
						class: (0, vue_exports.unref)(cn)("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500", __props.side === "right" && "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm", __props.side === "left" && "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm", __props.side === "top" && "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b", __props.side === "bottom" && "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t", props.class)
					}, {
						..._ctx.$attrs,
						...(0, vue_exports.unref)(forwarded)
					}), {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default"), (0, vue_exports.createVNode)((0, vue_exports.unref)(DialogClose_default), { class: "ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none" }, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
								name: "lucide:x",
								class: "size-4"
							}), (0, vue_exports.createVNode)("span", { class: "sr-only" }, "Close")]),
							_: 1
						})]),
						_: 3
					}, 16, ["class"])];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/sheet/SheetContent.vue
var _sfc_setup$49 = SheetContent_vue_vue_type_script_setup_true_lang_default.setup;
SheetContent_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/sheet/SheetContent.vue");
	return _sfc_setup$49 ? _sfc_setup$49(props, ctx) : void 0;
};
var SheetContent_default = SheetContent_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/sheet/SheetDescription.vue?vue&type=script&setup=true&lang.ts
var SheetDescription_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "SheetDescription",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const delegatedProps = reactiveOmit(props, "class");
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogDescription_default$1), (0, vue_exports.mergeProps)({
				"data-slot": "sheet-description",
				class: (0, vue_exports.unref)(cn)("text-muted-foreground text-sm", props.class)
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
//#region ../app/components/ui/sheet/SheetDescription.vue
var _sfc_setup$48 = SheetDescription_vue_vue_type_script_setup_true_lang_default.setup;
SheetDescription_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/sheet/SheetDescription.vue");
	return _sfc_setup$48 ? _sfc_setup$48(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/sheet/SheetFooter.vue?vue&type=script&setup=true&lang.ts
var SheetFooter_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "SheetFooter",
	__ssrInlineRender: true,
	props: { class: {} },
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({
				"data-slot": "sheet-footer",
				class: (0, vue_exports.unref)(cn)("mt-auto flex flex-col gap-2 p-4", props.class)
			}, _attrs))}>`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/components/ui/sheet/SheetFooter.vue
var _sfc_setup$47 = SheetFooter_vue_vue_type_script_setup_true_lang_default.setup;
SheetFooter_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/sheet/SheetFooter.vue");
	return _sfc_setup$47 ? _sfc_setup$47(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/sheet/SheetHeader.vue?vue&type=script&setup=true&lang.ts
var SheetHeader_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "SheetHeader",
	__ssrInlineRender: true,
	props: { class: {} },
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({
				"data-slot": "sheet-header",
				class: (0, vue_exports.unref)(cn)("flex flex-col gap-1.5 p-4", props.class)
			}, _attrs))}>`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/components/ui/sheet/SheetHeader.vue
var _sfc_setup$46 = SheetHeader_vue_vue_type_script_setup_true_lang_default.setup;
SheetHeader_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/sheet/SheetHeader.vue");
	return _sfc_setup$46 ? _sfc_setup$46(props, ctx) : void 0;
};
var SheetHeader_default = SheetHeader_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/sheet/SheetTitle.vue?vue&type=script&setup=true&lang.ts
var SheetTitle_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "SheetTitle",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const delegatedProps = reactiveOmit(props, "class");
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogTitle_default$1), (0, vue_exports.mergeProps)({
				"data-slot": "sheet-title",
				class: (0, vue_exports.unref)(cn)("text-foreground font-semibold", props.class)
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
//#region ../app/components/ui/sheet/SheetTitle.vue
var _sfc_setup$45 = SheetTitle_vue_vue_type_script_setup_true_lang_default.setup;
SheetTitle_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/sheet/SheetTitle.vue");
	return _sfc_setup$45 ? _sfc_setup$45(props, ctx) : void 0;
};
var SheetTitle_default = SheetTitle_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/sheet/SheetTrigger.vue?vue&type=script&setup=true&lang.ts
var SheetTrigger_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "SheetTrigger",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogTrigger_default), (0, vue_exports.mergeProps)({ "data-slot": "sheet-trigger" }, props, _attrs), {
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
//#region ../app/components/ui/sheet/SheetTrigger.vue
var _sfc_setup$44 = SheetTrigger_vue_vue_type_script_setup_true_lang_default.setup;
SheetTrigger_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/sheet/SheetTrigger.vue");
	return _sfc_setup$44 ? _sfc_setup$44(props, ctx) : void 0;
};
var SheetTrigger_default = SheetTrigger_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/collapsible/Collapsible.vue?vue&type=script&setup=true&lang.ts
var Collapsible_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "Collapsible",
	__ssrInlineRender: true,
	props: {
		defaultOpen: { type: Boolean },
		open: { type: Boolean },
		disabled: { type: Boolean },
		unmountOnHide: { type: Boolean },
		asChild: { type: Boolean },
		as: {}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(CollapsibleRoot_default), (0, vue_exports.mergeProps)({ "data-slot": "collapsible" }, (0, vue_exports.unref)(forwarded), _attrs), {
				default: (0, vue_exports.withCtx)((slotProps, _push, _parent, _scopeId) => {
					if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", slotProps, null, _push, _parent, _scopeId);
					else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default", slotProps)];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/collapsible/Collapsible.vue
var _sfc_setup$43 = Collapsible_vue_vue_type_script_setup_true_lang_default.setup;
Collapsible_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/collapsible/Collapsible.vue");
	return _sfc_setup$43 ? _sfc_setup$43(props, ctx) : void 0;
};
var Collapsible_default = Collapsible_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/collapsible/CollapsibleContent.vue?vue&type=script&setup=true&lang.ts
var CollapsibleContent_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "CollapsibleContent",
	__ssrInlineRender: true,
	props: {
		forceMount: { type: Boolean },
		asChild: { type: Boolean },
		as: {}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(CollapsibleContent_default$1), (0, vue_exports.mergeProps)({ "data-slot": "collapsible-content" }, props, _attrs), {
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
//#region ../app/components/ui/collapsible/CollapsibleContent.vue
var _sfc_setup$42 = CollapsibleContent_vue_vue_type_script_setup_true_lang_default.setup;
CollapsibleContent_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/collapsible/CollapsibleContent.vue");
	return _sfc_setup$42 ? _sfc_setup$42(props, ctx) : void 0;
};
var CollapsibleContent_default = CollapsibleContent_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/collapsible/CollapsibleTrigger.vue?vue&type=script&setup=true&lang.ts
var CollapsibleTrigger_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "CollapsibleTrigger",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(CollapsibleTrigger_default$1), (0, vue_exports.mergeProps)({ "data-slot": "collapsible-trigger" }, props, _attrs), {
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
//#region ../app/components/ui/collapsible/CollapsibleTrigger.vue
var _sfc_setup$41 = CollapsibleTrigger_vue_vue_type_script_setup_true_lang_default.setup;
CollapsibleTrigger_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/collapsible/CollapsibleTrigger.vue");
	return _sfc_setup$41 ? _sfc_setup$41(props, ctx) : void 0;
};
var CollapsibleTrigger_default = CollapsibleTrigger_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/DuxtNavigationLink.vue?vue&type=script&setup=true&lang.ts
var DuxtNavigationLink_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DuxtNavigationLink",
	__ssrInlineRender: true,
	props: { item: {} },
	setup(__props) {
		const path = useDuxtPath();
		const localeLink = useDuxtLink();
		const iconOf = (item) => typeof item.icon === "string" ? item.icon : void 0;
		return (_ctx, _push, _parent, _attrs) => {
			const _component_DuxtNavigation = DuxtNavigation_default;
			const _component_NuxtLink = NuxtLink;
			const _component_Icon = components_default;
			if (__props.item.children?.length) _push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtNavigation, (0, vue_exports.mergeProps)({ items: [__props.item] }, _attrs), null, _parent));
			else _push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, (0, vue_exports.mergeProps)({
				to: (0, vue_exports.unref)(localeLink)(__props.item.path),
				class: ["flex items-center gap-2 rounded-md px-2 py-1.5 leading-5 transition-colors", (0, vue_exports.unref)(path) === __props.item.path ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"]
			}, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						if (iconOf(__props.item)) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
							name: iconOf(__props.item),
							class: "size-4 shrink-0"
						}, null, _parent, _scopeId));
						else _push(`<!---->`);
						_push(`<span class="min-w-0"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(__props.item.title)}</span>`);
					} else return [iconOf(__props.item) ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
						key: 0,
						name: iconOf(__props.item),
						class: "size-4 shrink-0"
					}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createVNode)("span", { class: "min-w-0" }, (0, vue_exports.toDisplayString)(__props.item.title), 1)];
				}),
				_: 1
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/DuxtNavigationLink.vue
var _sfc_setup$40 = DuxtNavigationLink_vue_vue_type_script_setup_true_lang_default.setup;
DuxtNavigationLink_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/DuxtNavigationLink.vue");
	return _sfc_setup$40 ? _sfc_setup$40(props, ctx) : void 0;
};
var DuxtNavigationLink_default = Object.assign(DuxtNavigationLink_vue_vue_type_script_setup_true_lang_default, { __name: "DuxtNavigationLink" });
//#endregion
//#region ../app/components/DuxtNavigation.vue?vue&type=script&setup=true&lang.ts
var DuxtNavigation_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DuxtNavigation",
	__ssrInlineRender: true,
	props: { items: {} },
	setup(__props) {
		const props = __props;
		const path = useDuxtPath();
		const iconOf = (item) => typeof item.icon === "string" ? item.icon : void 0;
		const contains = (item) => path.value === item.path || Boolean(item.children?.some((child) => contains(child)));
		const open = (0, vue_exports.ref)({});
		(0, vue_exports.watchEffect)(() => {
			for (const item of props.items) if (item.path && contains(item)) open.value[item.path] = true;
		});
		function isOpen(item) {
			return open.value[item.path ?? ""] ?? false;
		}
		function setOpen(item, value) {
			open.value[item.path ?? ""] = value;
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Collapsible = Collapsible_default;
			const _component_CollapsibleTrigger = CollapsibleTrigger_default;
			const _component_Icon = components_default;
			const _component_CollapsibleContent = CollapsibleContent_default;
			const _component_DuxtNavigationLink = DuxtNavigationLink_default;
			_push(`<nav${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({ class: "text-[13px]" }, _attrs))}><ul class="space-y-0.5"><!--[-->`);
			(0, server_renderer_exports.ssrRenderList)(__props.items, (item) => {
				_push(`<li>`);
				if (item.children?.length) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Collapsible, {
					open: isOpen(item),
					"onUpdate:open": (value) => setOpen(item, value)
				}, {
					default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push((0, server_renderer_exports.ssrRenderComponent)(_component_CollapsibleTrigger, { class: "group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 font-medium text-foreground transition-colors hover:bg-accent" }, {
								default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
									if (_push) {
										if (iconOf(item)) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
											name: iconOf(item),
											class: "size-4 text-muted-foreground"
										}, null, _parent, _scopeId));
										else _push(`<!---->`);
										_push(`<span class="truncate"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(item.title)}</span>`);
										_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
											name: "lucide:chevron-right",
											class: "ml-auto size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
										}, null, _parent, _scopeId));
									} else return [
										iconOf(item) ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
											key: 0,
											name: iconOf(item),
											class: "size-4 text-muted-foreground"
										}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
										(0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(item.title), 1),
										(0, vue_exports.createVNode)(_component_Icon, {
											name: "lucide:chevron-right",
											class: "ml-auto size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
										})
									];
								}),
								_: 2
							}, _parent, _scopeId));
							_push((0, server_renderer_exports.ssrRenderComponent)(_component_CollapsibleContent, null, {
								default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`<ul class="mt-0.5 ml-3.5 space-y-0.5 border-l pl-2.5"${_scopeId}><!--[-->`);
										(0, server_renderer_exports.ssrRenderList)(item.children, (child) => {
											_push(`<li${_scopeId}>`);
											_push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtNavigationLink, { item: child }, null, _parent, _scopeId));
											_push(`</li>`);
										});
										_push(`<!--]--></ul>`);
									} else return [(0, vue_exports.createVNode)("ul", { class: "mt-0.5 ml-3.5 space-y-0.5 border-l pl-2.5" }, [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(item.children, (child) => {
										return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("li", { key: child.path }, [(0, vue_exports.createVNode)(_component_DuxtNavigationLink, { item: child }, null, 8, ["item"])]);
									}), 128))])];
								}),
								_: 2
							}, _parent, _scopeId));
						} else return [(0, vue_exports.createVNode)(_component_CollapsibleTrigger, { class: "group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 font-medium text-foreground transition-colors hover:bg-accent" }, {
							default: (0, vue_exports.withCtx)(() => [
								iconOf(item) ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
									key: 0,
									name: iconOf(item),
									class: "size-4 text-muted-foreground"
								}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
								(0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(item.title), 1),
								(0, vue_exports.createVNode)(_component_Icon, {
									name: "lucide:chevron-right",
									class: "ml-auto size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
								})
							]),
							_: 2
						}, 1024), (0, vue_exports.createVNode)(_component_CollapsibleContent, null, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)("ul", { class: "mt-0.5 ml-3.5 space-y-0.5 border-l pl-2.5" }, [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(item.children, (child) => {
								return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("li", { key: child.path }, [(0, vue_exports.createVNode)(_component_DuxtNavigationLink, { item: child }, null, 8, ["item"])]);
							}), 128))])]),
							_: 2
						}, 1024)];
					}),
					_: 2
				}, _parent));
				else _push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtNavigationLink, { item }, null, _parent));
				_push(`</li>`);
			});
			_push(`<!--]--></ul></nav>`);
		};
	}
});
//#endregion
//#region ../app/components/DuxtNavigation.vue
var _sfc_setup$39 = DuxtNavigation_vue_vue_type_script_setup_true_lang_default.setup;
DuxtNavigation_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/DuxtNavigation.vue");
	return _sfc_setup$39 ? _sfc_setup$39(props, ctx) : void 0;
};
var DuxtNavigation_default = Object.assign(DuxtNavigation_vue_vue_type_script_setup_true_lang_default, { __name: "DuxtNavigation" });
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenu.vue?vue&type=script&setup=true&lang.ts
var DropdownMenu_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenu",
	__ssrInlineRender: true,
	props: {
		defaultOpen: { type: Boolean },
		open: { type: Boolean },
		dir: {},
		modal: { type: Boolean }
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuRoot_default), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu" }, (0, vue_exports.unref)(forwarded), _attrs), {
				default: (0, vue_exports.withCtx)((slotProps, _push, _parent, _scopeId) => {
					if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", slotProps, null, _push, _parent, _scopeId);
					else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default", slotProps)];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenu.vue
var _sfc_setup$38 = DropdownMenu_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenu_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenu.vue");
	return _sfc_setup$38 ? _sfc_setup$38(props, ctx) : void 0;
};
var DropdownMenu_default = DropdownMenu_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuCheckboxItem.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuCheckboxItem_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuCheckboxItem",
	__ssrInlineRender: true,
	props: {
		modelValue: { type: [Boolean, String] },
		disabled: { type: Boolean },
		textValue: {},
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	emits: ["select", "update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(reactiveOmit(props, "class"), emits);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Icon = components_default;
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuCheckboxItem_default), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu-checkbox-item" }, (0, vue_exports.unref)(forwarded), { class: (0, vue_exports.unref)(cn)(`focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`, props.class) }, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center"${_scopeId}>`);
						_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuItemIndicator_default), null, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "indicator-icon", {}, () => {
									_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
										name: "lucide:check",
										class: "size-4"
									}, null, _parent, _scopeId));
								}, _push, _parent, _scopeId);
								else return [(0, vue_exports.renderSlot)(_ctx.$slots, "indicator-icon", {}, () => [(0, vue_exports.createVNode)(_component_Icon, {
									name: "lucide:check",
									class: "size-4"
								})])];
							}),
							_: 3
						}, _parent, _scopeId));
						_push(`</span>`);
						(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
					} else return [(0, vue_exports.createVNode)("span", { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" }, [(0, vue_exports.createVNode)((0, vue_exports.unref)(DropdownMenuItemIndicator_default), null, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "indicator-icon", {}, () => [(0, vue_exports.createVNode)(_component_Icon, {
							name: "lucide:check",
							class: "size-4"
						})])]),
						_: 3
					})]), (0, vue_exports.renderSlot)(_ctx.$slots, "default")];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuCheckboxItem.vue
var _sfc_setup$37 = DropdownMenuCheckboxItem_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuCheckboxItem_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuCheckboxItem.vue");
	return _sfc_setup$37 ? _sfc_setup$37(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuContent.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuContent_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "DropdownMenuContent",
	__ssrInlineRender: true,
	props: {
		forceMount: { type: Boolean },
		loop: { type: Boolean },
		memoDependencies: {},
		side: {},
		sideOffset: { default: 4 },
		sideFlip: { type: Boolean },
		align: {},
		alignOffset: {},
		alignFlip: { type: Boolean },
		avoidCollisions: { type: Boolean },
		collisionBoundary: {},
		collisionPadding: {},
		arrowPadding: {},
		hideShiftedArrow: { type: Boolean },
		sticky: {},
		hideWhenDetached: { type: Boolean },
		positionStrategy: {},
		updatePositionStrategy: {},
		disableUpdateOnLayoutShift: { type: Boolean },
		prioritizePosition: { type: Boolean },
		reference: {},
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(reactiveOmit(props, "class"), emits);
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuPortal_default), _attrs, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuContent_default$1), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu-content" }, {
						..._ctx.$attrs,
						...(0, vue_exports.unref)(forwarded)
					}, { class: (0, vue_exports.unref)(cn)("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--reka-dropdown-menu-content-available-height) min-w-[8rem] origin-(--reka-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md", props.class) }), {
						default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
							if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
							else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default")];
						}),
						_: 3
					}, _parent, _scopeId));
					else return [(0, vue_exports.createVNode)((0, vue_exports.unref)(DropdownMenuContent_default$1), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu-content" }, {
						..._ctx.$attrs,
						...(0, vue_exports.unref)(forwarded)
					}, { class: (0, vue_exports.unref)(cn)("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--reka-dropdown-menu-content-available-height) min-w-[8rem] origin-(--reka-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md", props.class) }), {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default")]),
						_: 3
					}, 16, ["class"])];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuContent.vue
var _sfc_setup$36 = DropdownMenuContent_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuContent_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuContent.vue");
	return _sfc_setup$36 ? _sfc_setup$36(props, ctx) : void 0;
};
var DropdownMenuContent_default = DropdownMenuContent_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuGroup.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuGroup_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuGroup",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuGroup_default), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu-group" }, props, _attrs), {
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
//#region ../app/components/ui/dropdown-menu/DropdownMenuGroup.vue
var _sfc_setup$35 = DropdownMenuGroup_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuGroup_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuGroup.vue");
	return _sfc_setup$35 ? _sfc_setup$35(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuItem.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuItem_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuItem",
	__ssrInlineRender: true,
	props: {
		disabled: { type: Boolean },
		textValue: {},
		asChild: { type: Boolean },
		as: {},
		class: {},
		inset: { type: Boolean },
		variant: { default: "default" }
	},
	setup(__props) {
		const props = __props;
		const forwardedProps = useForwardProps(reactiveOmit(props, "inset", "variant", "class"));
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuItem_default$1), (0, vue_exports.mergeProps)({
				"data-slot": "dropdown-menu-item",
				"data-inset": __props.inset ? "" : void 0,
				"data-variant": __props.variant
			}, (0, vue_exports.unref)(forwardedProps), { class: (0, vue_exports.unref)(cn)(`relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!`, props.class) }, _attrs), {
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
//#region ../app/components/ui/dropdown-menu/DropdownMenuItem.vue
var _sfc_setup$34 = DropdownMenuItem_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuItem_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuItem.vue");
	return _sfc_setup$34 ? _sfc_setup$34(props, ctx) : void 0;
};
var DropdownMenuItem_default = DropdownMenuItem_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuLabel.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuLabel_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuLabel",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {},
		class: {},
		inset: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const forwardedProps = useForwardProps(reactiveOmit(props, "class", "inset"));
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuLabel_default), (0, vue_exports.mergeProps)({
				"data-slot": "dropdown-menu-label",
				"data-inset": __props.inset ? "" : void 0
			}, (0, vue_exports.unref)(forwardedProps), { class: (0, vue_exports.unref)(cn)("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", props.class) }, _attrs), {
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
//#region ../app/components/ui/dropdown-menu/DropdownMenuLabel.vue
var _sfc_setup$33 = DropdownMenuLabel_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuLabel_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuLabel.vue");
	return _sfc_setup$33 ? _sfc_setup$33(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuRadioGroup.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuRadioGroup_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuRadioGroup",
	__ssrInlineRender: true,
	props: {
		modelValue: {},
		asChild: { type: Boolean },
		as: {}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuRadioGroup_default), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu-radio-group" }, (0, vue_exports.unref)(forwarded), _attrs), {
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
//#region ../app/components/ui/dropdown-menu/DropdownMenuRadioGroup.vue
var _sfc_setup$32 = DropdownMenuRadioGroup_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuRadioGroup_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuRadioGroup.vue");
	return _sfc_setup$32 ? _sfc_setup$32(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuRadioItem.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuRadioItem_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuRadioItem",
	__ssrInlineRender: true,
	props: {
		value: {},
		disabled: { type: Boolean },
		textValue: {},
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(reactiveOmit(props, "class"), emits);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Icon = components_default;
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuRadioItem_default), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu-radio-item" }, (0, vue_exports.unref)(forwarded), { class: (0, vue_exports.unref)(cn)(`focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`, props.class) }, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center"${_scopeId}>`);
						_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuItemIndicator_default), null, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "indicator-icon", {}, () => {
									_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
										name: "lucide:circle",
										class: "size-2 fill-current"
									}, null, _parent, _scopeId));
								}, _push, _parent, _scopeId);
								else return [(0, vue_exports.renderSlot)(_ctx.$slots, "indicator-icon", {}, () => [(0, vue_exports.createVNode)(_component_Icon, {
									name: "lucide:circle",
									class: "size-2 fill-current"
								})])];
							}),
							_: 3
						}, _parent, _scopeId));
						_push(`</span>`);
						(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
					} else return [(0, vue_exports.createVNode)("span", { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" }, [(0, vue_exports.createVNode)((0, vue_exports.unref)(DropdownMenuItemIndicator_default), null, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "indicator-icon", {}, () => [(0, vue_exports.createVNode)(_component_Icon, {
							name: "lucide:circle",
							class: "size-2 fill-current"
						})])]),
						_: 3
					})]), (0, vue_exports.renderSlot)(_ctx.$slots, "default")];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuRadioItem.vue
var _sfc_setup$31 = DropdownMenuRadioItem_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuRadioItem_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuRadioItem.vue");
	return _sfc_setup$31 ? _sfc_setup$31(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuSeparator.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuSeparator_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuSeparator",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const delegatedProps = reactiveOmit(props, "class");
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuSeparator_default), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu-separator" }, (0, vue_exports.unref)(delegatedProps), { class: (0, vue_exports.unref)(cn)("bg-border -mx-1 my-1 h-px", props.class) }, _attrs), null, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuSeparator.vue
var _sfc_setup$30 = DropdownMenuSeparator_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuSeparator_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuSeparator.vue");
	return _sfc_setup$30 ? _sfc_setup$30(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuShortcut.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuShortcut_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuShortcut",
	__ssrInlineRender: true,
	props: { class: {} },
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<span${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({
				"data-slot": "dropdown-menu-shortcut",
				class: (0, vue_exports.unref)(cn)("text-muted-foreground ml-auto text-xs tracking-widest", props.class)
			}, _attrs))}>`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</span>`);
		};
	}
});
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuShortcut.vue
var _sfc_setup$29 = DropdownMenuShortcut_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuShortcut_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuShortcut.vue");
	return _sfc_setup$29 ? _sfc_setup$29(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuSub.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuSub_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuSub",
	__ssrInlineRender: true,
	props: {
		defaultOpen: { type: Boolean },
		open: { type: Boolean }
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuSub_default), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu-sub" }, (0, vue_exports.unref)(forwarded), _attrs), {
				default: (0, vue_exports.withCtx)((slotProps, _push, _parent, _scopeId) => {
					if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", slotProps, null, _push, _parent, _scopeId);
					else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default", slotProps)];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuSub.vue
var _sfc_setup$28 = DropdownMenuSub_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuSub_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuSub.vue");
	return _sfc_setup$28 ? _sfc_setup$28(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuSubContent.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuSubContent_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuSubContent",
	__ssrInlineRender: true,
	props: {
		forceMount: { type: Boolean },
		loop: { type: Boolean },
		memoDependencies: {},
		sideOffset: {},
		sideFlip: { type: Boolean },
		alignOffset: {},
		alignFlip: { type: Boolean },
		avoidCollisions: { type: Boolean },
		collisionBoundary: {},
		collisionPadding: {},
		arrowPadding: {},
		hideShiftedArrow: { type: Boolean },
		sticky: {},
		hideWhenDetached: { type: Boolean },
		positionStrategy: {},
		updatePositionStrategy: {},
		disableUpdateOnLayoutShift: { type: Boolean },
		prioritizePosition: { type: Boolean },
		reference: {},
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"entryFocus",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(reactiveOmit(props, "class"), emits);
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuSubContent_default), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu-sub-content" }, (0, vue_exports.unref)(forwarded), { class: (0, vue_exports.unref)(cn)("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] max-w-(--reka-dropdown-menu-content-available-width) origin-(--reka-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg", props.class) }, _attrs), {
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
//#region ../app/components/ui/dropdown-menu/DropdownMenuSubContent.vue
var _sfc_setup$27 = DropdownMenuSubContent_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuSubContent_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuSubContent.vue");
	return _sfc_setup$27 ? _sfc_setup$27(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuSubTrigger.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuSubTrigger_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuSubTrigger",
	__ssrInlineRender: true,
	props: {
		disabled: { type: Boolean },
		textValue: {},
		asChild: { type: Boolean },
		as: {},
		class: {},
		inset: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const forwardedProps = useForwardProps(reactiveOmit(props, "class", "inset"));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Icon = components_default;
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuSubTrigger_default), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu-sub-trigger" }, (0, vue_exports.unref)(forwardedProps), {
				"data-inset": __props.inset ? "" : void 0,
				class: (0, vue_exports.unref)(cn)(`relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!`, props.class)
			}, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
							name: "lucide:chevron-right",
							class: "ml-auto size-4"
						}, null, _parent, _scopeId));
					} else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default"), (0, vue_exports.createVNode)(_component_Icon, {
						name: "lucide:chevron-right",
						class: "ml-auto size-4"
					})];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuSubTrigger.vue
var _sfc_setup$26 = DropdownMenuSubTrigger_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuSubTrigger_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuSubTrigger.vue");
	return _sfc_setup$26 ? _sfc_setup$26(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dropdown-menu/DropdownMenuTrigger.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuTrigger_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DropdownMenuTrigger",
	__ssrInlineRender: true,
	props: {
		disabled: { type: Boolean },
		asChild: { type: Boolean },
		as: {}
	},
	setup(__props) {
		const forwardedProps = useForwardProps(__props);
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DropdownMenuTrigger_default$1), (0, vue_exports.mergeProps)({ "data-slot": "dropdown-menu-trigger" }, (0, vue_exports.unref)(forwardedProps), _attrs), {
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
//#region ../app/components/ui/dropdown-menu/DropdownMenuTrigger.vue
var _sfc_setup$25 = DropdownMenuTrigger_vue_vue_type_script_setup_true_lang_default.setup;
DropdownMenuTrigger_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dropdown-menu/DropdownMenuTrigger.vue");
	return _sfc_setup$25 ? _sfc_setup$25(props, ctx) : void 0;
};
var DropdownMenuTrigger_default = DropdownMenuTrigger_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/utils/version-paths.ts
/**
* Which source serves a path, and how to move a path between versions.
*
* Pure functions, deliberately: every version bug this layer has had came from
* prefix arithmetic done inline in a component, where it could only be checked
* by clicking. `/workflows/v0.7.0` starts with `/workflows` as well, so taking
* the *first* matching prefix said "main" while reading the tag — and swapping
* versions then appended instead of replacing, turning /workflows/v0.7.0 into
* /workflows/v0.7.0/v0.7.0 on every click.
*/
/** The source whose prefix the path is inside. Longest prefix wins. */
function sourceForPath(path, sources) {
	return [...sources].sort((a, b) => b.prefix.length - a.prefix.length).find((source) => !source.prefix || isInside(path, source.prefix)) ?? sources.find((source) => !source.prefix);
}
/**
* Is `path` inside `prefix`?
*
* Segment-aware: `/workflows-old` is not inside `/workflows`, though it starts
* with it.
*/
function isInside(path, prefix) {
	if (!prefix) return true;
	return path === prefix || path.startsWith(`${prefix}/`);
}
/**
* The same page in another version.
*
* Strips the current version's prefix and applies the target's, so a page keeps
* its place instead of dropping the reader at the version's root.
*/
function versionPath(path, from, to) {
	const rest = from && from !== "/" && isInside(path, from) ? path.slice(from.length) : path;
	return `${to === "/" ? "" : to}${rest}` || "/";
}
//#endregion
//#region ../app/components/DuxtVersion.vue?vue&type=script&setup=true&lang.ts
var DuxtVersion_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DuxtVersion",
	__ssrInlineRender: true,
	setup(__props) {
		/**
		* The one place a version is shown.
		*
		* Before, the project's version sat as a badge beside the title while the
		* documentation's versions lived in a separate dropdown on the far right —
		* two controls saying different things, and the right-hand one appeared only
		* on sources that have versions, so the icons beside it shifted as you moved
		* between repositories.
		*
		* Now it is one element next to the title: a badge when there is nothing to
		* choose, the same badge as a trigger when there is.
		*/
		const duxt = useDuxtConfig();
		const path = useDuxtPath();
		const localeLink = useDuxtLink();
		/**
		* Versions come from the resolved source manifest, so the control can only
		* offer what has a collection behind it, and only for the repository being
		* read — one project's versions say nothing about another's.
		*
		* `versions` in the config still wins where a label needs to read differently
		* from the URL segment.
		*/
		const versions = (0, vue_exports.computed)(() => {
			if (duxt.versions?.length) return duxt.versions;
			const sources = duxt.resolvedSources ?? [];
			const currentSource = sourceForPath(path.value, sources);
			return sources.filter((source) => source.version && source.repo === currentSource?.repo).map((source) => ({
				label: source.version,
				to: source.prefix || "/",
				description: source.isDefault ? "default" : void 0
			}));
		});
		const current = (0, vue_exports.computed)(() => sourceForPath(path.value, versions.value.map((version) => ({
			...version,
			prefix: version.to ?? ""
		}))));
		/** Same page, other version: swap the prefix rather than jumping to its root. */
		function pathIn(version) {
			return localeLink(versionPath(path.value, current.value?.to, version.to ?? "/"));
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_DropdownMenu = DropdownMenu_default;
			const _component_DropdownMenuTrigger = DropdownMenuTrigger_default;
			const _component_Badge = Badge_default;
			const _component_Icon = components_default;
			const _component_DropdownMenuContent = DropdownMenuContent_default;
			const _component_DropdownMenuItem = DropdownMenuItem_default;
			const _component_NuxtLink = NuxtLink;
			if ((0, vue_exports.unref)(versions).length > 1) _push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenu, _attrs, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenuTrigger, { "as-child": "" }, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Badge, {
									variant: "secondary",
									class: "cursor-pointer gap-1 font-mono text-[10px] hover:bg-accent"
								}, {
									default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
										if (_push) {
											_push(`${(0, server_renderer_exports.ssrInterpolate)((0, vue_exports.unref)(current)?.label ?? (0, vue_exports.unref)(duxt).version)} `);
											_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
												name: "lucide:chevron-down",
												class: "size-3 opacity-60"
											}, null, _parent, _scopeId));
										} else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)((0, vue_exports.unref)(current)?.label ?? (0, vue_exports.unref)(duxt).version) + " ", 1), (0, vue_exports.createVNode)(_component_Icon, {
											name: "lucide:chevron-down",
											class: "size-3 opacity-60"
										})];
									}),
									_: 1
								}, _parent, _scopeId));
								else return [(0, vue_exports.createVNode)(_component_Badge, {
									variant: "secondary",
									class: "cursor-pointer gap-1 font-mono text-[10px] hover:bg-accent"
								}, {
									default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)((0, vue_exports.unref)(current)?.label ?? (0, vue_exports.unref)(duxt).version) + " ", 1), (0, vue_exports.createVNode)(_component_Icon, {
										name: "lucide:chevron-down",
										class: "size-3 opacity-60"
									})]),
									_: 1
								})];
							}),
							_: 1
						}, _parent, _scopeId));
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenuContent, {
							align: "start",
							class: "w-44"
						}, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`<!--[-->`);
									(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(versions), (version) => {
										_push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenuItem, {
											key: version.to,
											"as-child": ""
										}, {
											default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
												if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
													to: pathIn(version),
													class: "flex items-center gap-2"
												}, {
													default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
														if (_push) {
															_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
																name: "lucide:check",
																class: ["size-3.5", version.label === (0, vue_exports.unref)(current)?.label ? "" : "opacity-0"]
															}, null, _parent, _scopeId));
															_push(`<span class="font-mono text-xs"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(version.label)}</span>`);
															if (version.description) _push(`<span class="ml-auto text-xs text-muted-foreground"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(version.description)}</span>`);
															else _push(`<!---->`);
														} else return [
															(0, vue_exports.createVNode)(_component_Icon, {
																name: "lucide:check",
																class: ["size-3.5", version.label === (0, vue_exports.unref)(current)?.label ? "" : "opacity-0"]
															}, null, 8, ["class"]),
															(0, vue_exports.createVNode)("span", { class: "font-mono text-xs" }, (0, vue_exports.toDisplayString)(version.label), 1),
															version.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("span", {
																key: 0,
																class: "ml-auto text-xs text-muted-foreground"
															}, (0, vue_exports.toDisplayString)(version.description), 1)) : (0, vue_exports.createCommentVNode)("", true)
														];
													}),
													_: 2
												}, _parent, _scopeId));
												else return [(0, vue_exports.createVNode)(_component_NuxtLink, {
													to: pathIn(version),
													class: "flex items-center gap-2"
												}, {
													default: (0, vue_exports.withCtx)(() => [
														(0, vue_exports.createVNode)(_component_Icon, {
															name: "lucide:check",
															class: ["size-3.5", version.label === (0, vue_exports.unref)(current)?.label ? "" : "opacity-0"]
														}, null, 8, ["class"]),
														(0, vue_exports.createVNode)("span", { class: "font-mono text-xs" }, (0, vue_exports.toDisplayString)(version.label), 1),
														version.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("span", {
															key: 0,
															class: "ml-auto text-xs text-muted-foreground"
														}, (0, vue_exports.toDisplayString)(version.description), 1)) : (0, vue_exports.createCommentVNode)("", true)
													]),
													_: 2
												}, 1032, ["to"])];
											}),
											_: 2
										}, _parent, _scopeId));
									});
									_push(`<!--]-->`);
								} else return [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(versions), (version) => {
									return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_DropdownMenuItem, {
										key: version.to,
										"as-child": ""
									}, {
										default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_NuxtLink, {
											to: pathIn(version),
											class: "flex items-center gap-2"
										}, {
											default: (0, vue_exports.withCtx)(() => [
												(0, vue_exports.createVNode)(_component_Icon, {
													name: "lucide:check",
													class: ["size-3.5", version.label === (0, vue_exports.unref)(current)?.label ? "" : "opacity-0"]
												}, null, 8, ["class"]),
												(0, vue_exports.createVNode)("span", { class: "font-mono text-xs" }, (0, vue_exports.toDisplayString)(version.label), 1),
												version.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("span", {
													key: 0,
													class: "ml-auto text-xs text-muted-foreground"
												}, (0, vue_exports.toDisplayString)(version.description), 1)) : (0, vue_exports.createCommentVNode)("", true)
											]),
											_: 2
										}, 1032, ["to"])]),
										_: 2
									}, 1024);
								}), 128))];
							}),
							_: 1
						}, _parent, _scopeId));
					} else return [(0, vue_exports.createVNode)(_component_DropdownMenuTrigger, { "as-child": "" }, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Badge, {
							variant: "secondary",
							class: "cursor-pointer gap-1 font-mono text-[10px] hover:bg-accent"
						}, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)((0, vue_exports.unref)(current)?.label ?? (0, vue_exports.unref)(duxt).version) + " ", 1), (0, vue_exports.createVNode)(_component_Icon, {
								name: "lucide:chevron-down",
								class: "size-3 opacity-60"
							})]),
							_: 1
						})]),
						_: 1
					}), (0, vue_exports.createVNode)(_component_DropdownMenuContent, {
						align: "start",
						class: "w-44"
					}, {
						default: (0, vue_exports.withCtx)(() => [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(versions), (version) => {
							return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_DropdownMenuItem, {
								key: version.to,
								"as-child": ""
							}, {
								default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_NuxtLink, {
									to: pathIn(version),
									class: "flex items-center gap-2"
								}, {
									default: (0, vue_exports.withCtx)(() => [
										(0, vue_exports.createVNode)(_component_Icon, {
											name: "lucide:check",
											class: ["size-3.5", version.label === (0, vue_exports.unref)(current)?.label ? "" : "opacity-0"]
										}, null, 8, ["class"]),
										(0, vue_exports.createVNode)("span", { class: "font-mono text-xs" }, (0, vue_exports.toDisplayString)(version.label), 1),
										version.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("span", {
											key: 0,
											class: "ml-auto text-xs text-muted-foreground"
										}, (0, vue_exports.toDisplayString)(version.description), 1)) : (0, vue_exports.createCommentVNode)("", true)
									]),
									_: 2
								}, 1032, ["to"])]),
								_: 2
							}, 1024);
						}), 128))]),
						_: 1
					})];
				}),
				_: 1
			}, _parent));
			else if ((0, vue_exports.unref)(duxt).version) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Badge, (0, vue_exports.mergeProps)({
				variant: "secondary",
				class: "font-mono text-[10px]"
			}, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)((0, vue_exports.unref)(duxt).version)}`);
					else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)((0, vue_exports.unref)(duxt).version), 1)];
				}),
				_: 1
			}, _parent));
			else _push(`<!---->`);
		};
	}
});
//#endregion
//#region ../app/components/DuxtVersion.vue
var _sfc_setup$24 = DuxtVersion_vue_vue_type_script_setup_true_lang_default.setup;
DuxtVersion_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/DuxtVersion.vue");
	return _sfc_setup$24 ? _sfc_setup$24(props, ctx) : void 0;
};
var DuxtVersion_default = Object.assign(DuxtVersion_vue_vue_type_script_setup_true_lang_default, { __name: "DuxtVersion" });
//#endregion
//#region ../app/components/ui/command/Command.vue?vue&type=script&setup=true&lang.ts
var Command_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "Command",
	__ssrInlineRender: true,
	props: {
		modelValue: { default: "" },
		defaultValue: {},
		multiple: { type: Boolean },
		orientation: {},
		dir: {},
		disabled: { type: Boolean },
		selectionBehavior: {},
		highlightOnHover: {
			type: Boolean,
			default: true
		},
		by: {},
		asChild: { type: Boolean },
		as: {},
		name: {},
		required: { type: Boolean },
		class: {}
	},
	emits: [
		"update:modelValue",
		"highlight",
		"entryFocus",
		"leave"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(reactiveOmit(props, "class"), emits);
		const allItems = (0, vue_exports.ref)(/* @__PURE__ */ new Map());
		const allGroups = (0, vue_exports.ref)(/* @__PURE__ */ new Map());
		const { contains } = useFilter({ sensitivity: "base" });
		const filterState = (0, vue_exports.reactive)({
			search: "",
			filtered: {
				/** The count of all visible items. */
				count: 0,
				/** Map from visible item id to its search score. */
				items: /* @__PURE__ */ new Map(),
				/** Set of groups with at least one visible item. */
				groups: /* @__PURE__ */ new Set()
			}
		});
		function filterItems() {
			if (!filterState.search) {
				filterState.filtered.count = allItems.value.size;
				return;
			}
			filterState.filtered.groups = /* @__PURE__ */ new Set();
			let itemCount = 0;
			for (const [id, value] of allItems.value) {
				const score = contains(value, filterState.search);
				filterState.filtered.items.set(id, score ? 1 : 0);
				if (score) itemCount++;
			}
			for (const [groupId, group] of allGroups.value) for (const itemId of group) if (filterState.filtered.items.get(itemId) > 0) {
				filterState.filtered.groups.add(groupId);
				break;
			}
			filterState.filtered.count = itemCount;
		}
		(0, vue_exports.watch)(() => filterState.search, () => {
			filterItems();
		});
		provideCommandContext({
			allItems,
			allGroups,
			filterState
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(ListboxRoot_default), (0, vue_exports.mergeProps)({ "data-slot": "command" }, (0, vue_exports.unref)(forwarded), { class: (0, vue_exports.unref)(cn)("bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md", props.class) }, _attrs), {
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
//#region ../app/components/ui/command/Command.vue
var _sfc_setup$23 = Command_vue_vue_type_script_setup_true_lang_default.setup;
Command_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/command/Command.vue");
	return _sfc_setup$23 ? _sfc_setup$23(props, ctx) : void 0;
};
var Command_default = Command_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/dialog/Dialog.vue?vue&type=script&setup=true&lang.ts
var Dialog_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "Dialog",
	__ssrInlineRender: true,
	props: {
		open: { type: Boolean },
		defaultOpen: { type: Boolean },
		modal: { type: Boolean },
		unmountOnHide: { type: Boolean }
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogRoot_default), (0, vue_exports.mergeProps)({ "data-slot": "dialog" }, (0, vue_exports.unref)(forwarded), _attrs), {
				default: (0, vue_exports.withCtx)((slotProps, _push, _parent, _scopeId) => {
					if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", slotProps, null, _push, _parent, _scopeId);
					else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default", slotProps)];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/dialog/Dialog.vue
var _sfc_setup$22 = Dialog_vue_vue_type_script_setup_true_lang_default.setup;
Dialog_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dialog/Dialog.vue");
	return _sfc_setup$22 ? _sfc_setup$22(props, ctx) : void 0;
};
var Dialog_default = Dialog_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/dialog/DialogClose.vue?vue&type=script&setup=true&lang.ts
var DialogClose_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DialogClose",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogClose_default), (0, vue_exports.mergeProps)({ "data-slot": "dialog-close" }, props, _attrs), {
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
//#region ../app/components/ui/dialog/DialogClose.vue
var _sfc_setup$21 = DialogClose_vue_vue_type_script_setup_true_lang_default.setup;
DialogClose_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dialog/DialogClose.vue");
	return _sfc_setup$21 ? _sfc_setup$21(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dialog/DialogOverlay.vue?vue&type=script&setup=true&lang.ts
var DialogOverlay_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DialogOverlay",
	__ssrInlineRender: true,
	props: {
		forceMount: { type: Boolean },
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const delegatedProps = reactiveOmit(props, "class");
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogOverlay_default$1), (0, vue_exports.mergeProps)({ "data-slot": "dialog-overlay" }, (0, vue_exports.unref)(delegatedProps), { class: (0, vue_exports.unref)(cn)("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80", props.class) }, _attrs), {
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
//#region ../app/components/ui/dialog/DialogOverlay.vue
var _sfc_setup$20 = DialogOverlay_vue_vue_type_script_setup_true_lang_default.setup;
DialogOverlay_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dialog/DialogOverlay.vue");
	return _sfc_setup$20 ? _sfc_setup$20(props, ctx) : void 0;
};
var DialogOverlay_default = DialogOverlay_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/dialog/DialogContent.vue?vue&type=script&setup=true&lang.ts
var DialogContent_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "DialogContent",
	__ssrInlineRender: true,
	props: {
		forceMount: { type: Boolean },
		disableOutsidePointerEvents: { type: Boolean },
		asChild: { type: Boolean },
		as: {},
		class: {},
		showCloseButton: {
			type: Boolean,
			default: true
		}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(reactiveOmit(props, "class"), emits);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Icon = components_default;
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogPortal_default), _attrs, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push((0, server_renderer_exports.ssrRenderComponent)(DialogOverlay_default, null, null, _parent, _scopeId));
						_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogContent_default$1), (0, vue_exports.mergeProps)({ "data-slot": "dialog-content" }, {
							..._ctx.$attrs,
							...(0, vue_exports.unref)(forwarded)
						}, { class: (0, vue_exports.unref)(cn)("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg", props.class) }), {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) {
									(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
									if (__props.showCloseButton) _push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogClose_default), {
										"data-slot": "dialog-close",
										class: "ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
									}, {
										default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
											if (_push) {
												_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, { name: "lucide:x" }, null, _parent, _scopeId));
												_push(`<span class="sr-only"${_scopeId}>Close</span>`);
											} else return [(0, vue_exports.createVNode)(_component_Icon, { name: "lucide:x" }), (0, vue_exports.createVNode)("span", { class: "sr-only" }, "Close")];
										}),
										_: 1
									}, _parent, _scopeId));
									else _push(`<!---->`);
								} else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default"), __props.showCloseButton ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(DialogClose_default), {
									key: 0,
									"data-slot": "dialog-close",
									class: "ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
								}, {
									default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, { name: "lucide:x" }), (0, vue_exports.createVNode)("span", { class: "sr-only" }, "Close")]),
									_: 1
								})) : (0, vue_exports.createCommentVNode)("", true)];
							}),
							_: 3
						}, _parent, _scopeId));
					} else return [(0, vue_exports.createVNode)(DialogOverlay_default), (0, vue_exports.createVNode)((0, vue_exports.unref)(DialogContent_default$1), (0, vue_exports.mergeProps)({ "data-slot": "dialog-content" }, {
						..._ctx.$attrs,
						...(0, vue_exports.unref)(forwarded)
					}, { class: (0, vue_exports.unref)(cn)("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg", props.class) }), {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default"), __props.showCloseButton ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(DialogClose_default), {
							key: 0,
							"data-slot": "dialog-close",
							class: "ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
						}, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, { name: "lucide:x" }), (0, vue_exports.createVNode)("span", { class: "sr-only" }, "Close")]),
							_: 1
						})) : (0, vue_exports.createCommentVNode)("", true)]),
						_: 3
					}, 16, ["class"])];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/dialog/DialogContent.vue
var _sfc_setup$19 = DialogContent_vue_vue_type_script_setup_true_lang_default.setup;
DialogContent_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dialog/DialogContent.vue");
	return _sfc_setup$19 ? _sfc_setup$19(props, ctx) : void 0;
};
var DialogContent_default = DialogContent_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/dialog/DialogDescription.vue?vue&type=script&setup=true&lang.ts
var DialogDescription_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DialogDescription",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const forwardedProps = useForwardProps(reactiveOmit(props, "class"));
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogDescription_default$1), (0, vue_exports.mergeProps)({ "data-slot": "dialog-description" }, (0, vue_exports.unref)(forwardedProps), { class: (0, vue_exports.unref)(cn)("text-muted-foreground text-sm", props.class) }, _attrs), {
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
//#region ../app/components/ui/dialog/DialogDescription.vue
var _sfc_setup$18 = DialogDescription_vue_vue_type_script_setup_true_lang_default.setup;
DialogDescription_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dialog/DialogDescription.vue");
	return _sfc_setup$18 ? _sfc_setup$18(props, ctx) : void 0;
};
var DialogDescription_default = DialogDescription_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/dialog/DialogFooter.vue?vue&type=script&setup=true&lang.ts
var DialogFooter_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DialogFooter",
	__ssrInlineRender: true,
	props: {
		class: {},
		showCloseButton: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({
				"data-slot": "dialog-footer",
				class: (0, vue_exports.unref)(cn)("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", props.class)
			}, _attrs))}>`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			if (__props.showCloseButton) _push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogClose_default), { "as-child": "" }, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(Button_default), { variant: "outline" }, {
						default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
							if (_push) _push(` Close `);
							else return [(0, vue_exports.createTextVNode)(" Close ")];
						}),
						_: 1
					}, _parent, _scopeId));
					else return [(0, vue_exports.createVNode)((0, vue_exports.unref)(Button_default), { variant: "outline" }, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)(" Close ")]),
						_: 1
					})];
				}),
				_: 1
			}, _parent));
			else _push(`<!---->`);
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/components/ui/dialog/DialogFooter.vue
var _sfc_setup$17 = DialogFooter_vue_vue_type_script_setup_true_lang_default.setup;
DialogFooter_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dialog/DialogFooter.vue");
	return _sfc_setup$17 ? _sfc_setup$17(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dialog/DialogHeader.vue?vue&type=script&setup=true&lang.ts
var DialogHeader_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DialogHeader",
	__ssrInlineRender: true,
	props: { class: {} },
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({
				"data-slot": "dialog-header",
				class: (0, vue_exports.unref)(cn)("flex flex-col gap-2 text-center sm:text-left", props.class)
			}, _attrs))}>`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/components/ui/dialog/DialogHeader.vue
var _sfc_setup$16 = DialogHeader_vue_vue_type_script_setup_true_lang_default.setup;
DialogHeader_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dialog/DialogHeader.vue");
	return _sfc_setup$16 ? _sfc_setup$16(props, ctx) : void 0;
};
var DialogHeader_default = DialogHeader_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/dialog/DialogScrollContent.vue?vue&type=script&setup=true&lang.ts
var DialogScrollContent_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "DialogScrollContent",
	__ssrInlineRender: true,
	props: {
		forceMount: { type: Boolean },
		disableOutsidePointerEvents: { type: Boolean },
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(reactiveOmit(props, "class"), emits);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Icon = components_default;
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogPortal_default), _attrs, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogOverlay_default$1), { class: "fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" }, {
						default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
							if (_push) _push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogContent_default$1), (0, vue_exports.mergeProps)({ class: (0, vue_exports.unref)(cn)("relative z-50 grid w-full max-w-lg my-8 gap-4 border border-border bg-background p-6 shadow-lg duration-200 sm:rounded-lg md:w-full", props.class) }, {
								..._ctx.$attrs,
								...(0, vue_exports.unref)(forwarded)
							}, { onPointerDownOutside: (event) => {
								const originalEvent = event.detail.originalEvent;
								const target = originalEvent.target;
								if (originalEvent.offsetX > target.clientWidth || originalEvent.offsetY > target.clientHeight) event.preventDefault();
							} }), {
								default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
									if (_push) {
										(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
										_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogClose_default), { class: "absolute top-4 right-4 p-0.5 transition-colors rounded-md hover:bg-secondary" }, {
											default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
												if (_push) {
													_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
														name: "lucide:x",
														class: "w-4 h-4"
													}, null, _parent, _scopeId));
													_push(`<span class="sr-only"${_scopeId}>Close</span>`);
												} else return [(0, vue_exports.createVNode)(_component_Icon, {
													name: "lucide:x",
													class: "w-4 h-4"
												}), (0, vue_exports.createVNode)("span", { class: "sr-only" }, "Close")];
											}),
											_: 1
										}, _parent, _scopeId));
									} else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default"), (0, vue_exports.createVNode)((0, vue_exports.unref)(DialogClose_default), { class: "absolute top-4 right-4 p-0.5 transition-colors rounded-md hover:bg-secondary" }, {
										default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
											name: "lucide:x",
											class: "w-4 h-4"
										}), (0, vue_exports.createVNode)("span", { class: "sr-only" }, "Close")]),
										_: 1
									})];
								}),
								_: 3
							}, _parent, _scopeId));
							else return [(0, vue_exports.createVNode)((0, vue_exports.unref)(DialogContent_default$1), (0, vue_exports.mergeProps)({ class: (0, vue_exports.unref)(cn)("relative z-50 grid w-full max-w-lg my-8 gap-4 border border-border bg-background p-6 shadow-lg duration-200 sm:rounded-lg md:w-full", props.class) }, {
								..._ctx.$attrs,
								...(0, vue_exports.unref)(forwarded)
							}, { onPointerDownOutside: (event) => {
								const originalEvent = event.detail.originalEvent;
								const target = originalEvent.target;
								if (originalEvent.offsetX > target.clientWidth || originalEvent.offsetY > target.clientHeight) event.preventDefault();
							} }), {
								default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default"), (0, vue_exports.createVNode)((0, vue_exports.unref)(DialogClose_default), { class: "absolute top-4 right-4 p-0.5 transition-colors rounded-md hover:bg-secondary" }, {
									default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
										name: "lucide:x",
										class: "w-4 h-4"
									}), (0, vue_exports.createVNode)("span", { class: "sr-only" }, "Close")]),
									_: 1
								})]),
								_: 3
							}, 16, ["class", "onPointerDownOutside"])];
						}),
						_: 3
					}, _parent, _scopeId));
					else return [(0, vue_exports.createVNode)((0, vue_exports.unref)(DialogOverlay_default$1), { class: "fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" }, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(DialogContent_default$1), (0, vue_exports.mergeProps)({ class: (0, vue_exports.unref)(cn)("relative z-50 grid w-full max-w-lg my-8 gap-4 border border-border bg-background p-6 shadow-lg duration-200 sm:rounded-lg md:w-full", props.class) }, {
							..._ctx.$attrs,
							...(0, vue_exports.unref)(forwarded)
						}, { onPointerDownOutside: (event) => {
							const originalEvent = event.detail.originalEvent;
							const target = originalEvent.target;
							if (originalEvent.offsetX > target.clientWidth || originalEvent.offsetY > target.clientHeight) event.preventDefault();
						} }), {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default"), (0, vue_exports.createVNode)((0, vue_exports.unref)(DialogClose_default), { class: "absolute top-4 right-4 p-0.5 transition-colors rounded-md hover:bg-secondary" }, {
								default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
									name: "lucide:x",
									class: "w-4 h-4"
								}), (0, vue_exports.createVNode)("span", { class: "sr-only" }, "Close")]),
								_: 1
							})]),
							_: 3
						}, 16, ["class", "onPointerDownOutside"])]),
						_: 3
					})];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/dialog/DialogScrollContent.vue
var _sfc_setup$15 = DialogScrollContent_vue_vue_type_script_setup_true_lang_default.setup;
DialogScrollContent_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dialog/DialogScrollContent.vue");
	return _sfc_setup$15 ? _sfc_setup$15(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/dialog/DialogTitle.vue?vue&type=script&setup=true&lang.ts
var DialogTitle_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DialogTitle",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const forwardedProps = useForwardProps(reactiveOmit(props, "class"));
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogTitle_default$1), (0, vue_exports.mergeProps)({ "data-slot": "dialog-title" }, (0, vue_exports.unref)(forwardedProps), { class: (0, vue_exports.unref)(cn)("text-lg leading-none font-semibold", props.class) }, _attrs), {
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
//#region ../app/components/ui/dialog/DialogTitle.vue
var _sfc_setup$14 = DialogTitle_vue_vue_type_script_setup_true_lang_default.setup;
DialogTitle_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dialog/DialogTitle.vue");
	return _sfc_setup$14 ? _sfc_setup$14(props, ctx) : void 0;
};
var DialogTitle_default = DialogTitle_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/dialog/DialogTrigger.vue?vue&type=script&setup=true&lang.ts
var DialogTrigger_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DialogTrigger",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogTrigger_default), (0, vue_exports.mergeProps)({ "data-slot": "dialog-trigger" }, props, _attrs), {
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
//#region ../app/components/ui/dialog/DialogTrigger.vue
var _sfc_setup$13 = DialogTrigger_vue_vue_type_script_setup_true_lang_default.setup;
DialogTrigger_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/dialog/DialogTrigger.vue");
	return _sfc_setup$13 ? _sfc_setup$13(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/command/CommandDialog.vue?vue&type=script&setup=true&lang.ts
var CommandDialog_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "CommandDialog",
	__ssrInlineRender: true,
	props: {
		open: { type: Boolean },
		defaultOpen: { type: Boolean },
		modal: { type: Boolean },
		unmountOnHide: { type: Boolean },
		title: { default: "Command Palette" },
		description: { default: "Search for a command to run..." }
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const forwarded = useForwardPropsEmits(__props, __emit);
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(Dialog_default), (0, vue_exports.mergeProps)((0, vue_exports.unref)(forwarded), _attrs), {
				default: (0, vue_exports.withCtx)((slotProps, _push, _parent, _scopeId) => {
					if (_push) _push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogContent_default), { class: "overflow-hidden p-0" }, {
						default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogHeader_default), { class: "sr-only" }, {
									default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
										if (_push) {
											_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogTitle_default), null, {
												default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
													if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)(__props.title)}`);
													else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.title), 1)];
												}),
												_: 2
											}, _parent, _scopeId));
											_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(DialogDescription_default), null, {
												default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
													if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)(__props.description)}`);
													else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.description), 1)];
												}),
												_: 2
											}, _parent, _scopeId));
										} else return [(0, vue_exports.createVNode)((0, vue_exports.unref)(DialogTitle_default), null, {
											default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.title), 1)]),
											_: 1
										}), (0, vue_exports.createVNode)((0, vue_exports.unref)(DialogDescription_default), null, {
											default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.description), 1)]),
											_: 1
										})];
									}),
									_: 2
								}, _parent, _scopeId));
								_push((0, server_renderer_exports.ssrRenderComponent)(Command_default, null, {
									default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
										if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", slotProps, null, _push, _parent, _scopeId);
										else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default", slotProps)];
									}),
									_: 2
								}, _parent, _scopeId));
							} else return [(0, vue_exports.createVNode)((0, vue_exports.unref)(DialogHeader_default), { class: "sr-only" }, {
								default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(DialogTitle_default), null, {
									default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.title), 1)]),
									_: 1
								}), (0, vue_exports.createVNode)((0, vue_exports.unref)(DialogDescription_default), null, {
									default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.description), 1)]),
									_: 1
								})]),
								_: 1
							}), (0, vue_exports.createVNode)(Command_default, null, {
								default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default", slotProps)]),
								_: 2
							}, 1024)];
						}),
						_: 2
					}, _parent, _scopeId));
					else return [(0, vue_exports.createVNode)((0, vue_exports.unref)(DialogContent_default), { class: "overflow-hidden p-0" }, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(DialogHeader_default), { class: "sr-only" }, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)((0, vue_exports.unref)(DialogTitle_default), null, {
								default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.title), 1)]),
								_: 1
							}), (0, vue_exports.createVNode)((0, vue_exports.unref)(DialogDescription_default), null, {
								default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.description), 1)]),
								_: 1
							})]),
							_: 1
						}), (0, vue_exports.createVNode)(Command_default, null, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "default", slotProps)]),
							_: 2
						}, 1024)]),
						_: 2
					}, 1024)];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/command/CommandDialog.vue
var _sfc_setup$12 = CommandDialog_vue_vue_type_script_setup_true_lang_default.setup;
CommandDialog_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/command/CommandDialog.vue");
	return _sfc_setup$12 ? _sfc_setup$12(props, ctx) : void 0;
};
var CommandDialog_default = CommandDialog_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/command/CommandEmpty.vue?vue&type=script&setup=true&lang.ts
var CommandEmpty_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "CommandEmpty",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const delegatedProps = reactiveOmit(props, "class");
		const { filterState } = useCommand();
		const isRender = (0, vue_exports.computed)(() => !!filterState.search && filterState.filtered.count === 0);
		return (_ctx, _push, _parent, _attrs) => {
			if (isRender.value) _push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(Primitive), (0, vue_exports.mergeProps)({ "data-slot": "command-empty" }, (0, vue_exports.unref)(delegatedProps), { class: (0, vue_exports.unref)(cn)("py-6 text-center text-sm", props.class) }, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
					else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default")];
				}),
				_: 3
			}, _parent));
			else _push(`<!---->`);
		};
	}
});
//#endregion
//#region ../app/components/ui/command/CommandEmpty.vue
var _sfc_setup$11 = CommandEmpty_vue_vue_type_script_setup_true_lang_default.setup;
CommandEmpty_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/command/CommandEmpty.vue");
	return _sfc_setup$11 ? _sfc_setup$11(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/command/CommandGroup.vue?vue&type=script&setup=true&lang.ts
var CommandGroup_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "CommandGroup",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {},
		class: {},
		heading: {}
	},
	setup(__props) {
		const props = __props;
		const delegatedProps = reactiveOmit(props, "class");
		const { allGroups, filterState } = useCommand();
		const id = useId();
		const isRender = (0, vue_exports.computed)(() => !filterState.search ? true : filterState.filtered.groups.has(id));
		provideCommandGroupContext({ id });
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(ListboxGroup_default), (0, vue_exports.mergeProps)((0, vue_exports.unref)(delegatedProps), {
				id: (0, vue_exports.unref)(id),
				"data-slot": "command-group",
				class: (0, vue_exports.unref)(cn)("text-foreground overflow-hidden p-1", props.class),
				hidden: isRender.value ? void 0 : true
			}, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						if (__props.heading) _push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(ListboxGroupLabel_default), {
							"data-slot": "command-group-heading",
							class: "px-2 py-1.5 text-xs font-medium text-muted-foreground"
						}, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)(__props.heading)}`);
								else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.heading), 1)];
							}),
							_: 1
						}, _parent, _scopeId));
						else _push(`<!---->`);
						(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
					} else return [__props.heading ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.unref)(ListboxGroupLabel_default), {
						key: 0,
						"data-slot": "command-group-heading",
						class: "px-2 py-1.5 text-xs font-medium text-muted-foreground"
					}, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(__props.heading), 1)]),
						_: 1
					})) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.renderSlot)(_ctx.$slots, "default")];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/command/CommandGroup.vue
var _sfc_setup$10 = CommandGroup_vue_vue_type_script_setup_true_lang_default.setup;
CommandGroup_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/command/CommandGroup.vue");
	return _sfc_setup$10 ? _sfc_setup$10(props, ctx) : void 0;
};
var CommandGroup_default = CommandGroup_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/command/CommandInput.vue?vue&type=script&setup=true&lang.ts
var CommandInput_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "CommandInput",
	__ssrInlineRender: true,
	props: {
		modelValue: {},
		autoFocus: { type: Boolean },
		disabled: { type: Boolean },
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const forwardedProps = useForwardProps(reactiveOmit(props, "class"));
		const { filterState } = useCommand();
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Icon = components_default;
			_push(`<div${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({
				"data-slot": "command-input-wrapper",
				class: "flex h-9 items-center gap-2 border-b px-3"
			}, _attrs))}>`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
				name: "lucide:search",
				class: "size-4 shrink-0 opacity-50"
			}, null, _parent));
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(ListboxFilter_default), (0, vue_exports.mergeProps)({
				...(0, vue_exports.unref)(forwardedProps),
				..._ctx.$attrs
			}, {
				modelValue: (0, vue_exports.unref)(filterState).search,
				"onUpdate:modelValue": ($event) => (0, vue_exports.unref)(filterState).search = $event,
				"data-slot": "command-input",
				"auto-focus": "",
				class: (0, vue_exports.unref)(cn)("placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50", props.class)
			}), null, _parent));
			_push(`</div>`);
		};
	}
});
//#endregion
//#region ../app/components/ui/command/CommandInput.vue
var _sfc_setup$9 = CommandInput_vue_vue_type_script_setup_true_lang_default.setup;
CommandInput_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/command/CommandInput.vue");
	return _sfc_setup$9 ? _sfc_setup$9(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/command/CommandItem.vue?vue&type=script&setup=true&lang.ts
var CommandItem_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "CommandItem",
	__ssrInlineRender: true,
	props: {
		value: {},
		disabled: { type: Boolean },
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(reactiveOmit(props, "class"), emits);
		const id = useId();
		const { filterState, allItems, allGroups } = useCommand();
		useCommandGroup();
		const isRender = (0, vue_exports.computed)(() => {
			if (!filterState.search) return true;
			else {
				const filteredCurrentItem = filterState.filtered.items.get(id);
				if (filteredCurrentItem === void 0) return true;
				return filteredCurrentItem > 0;
			}
		});
		const itemRef = (0, vue_exports.ref)();
		useCurrentElement(itemRef);
		return (_ctx, _push, _parent, _attrs) => {
			if (isRender.value) _push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(ListboxItem_default), (0, vue_exports.mergeProps)((0, vue_exports.unref)(forwarded), {
				id: (0, vue_exports.unref)(id),
				ref_key: "itemRef",
				ref: itemRef,
				"data-slot": "command-item",
				class: (0, vue_exports.unref)(cn)(`data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`, props.class),
				onSelect: () => {
					(0, vue_exports.unref)(filterState).search = "";
				}
			}, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) (0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
					else return [(0, vue_exports.renderSlot)(_ctx.$slots, "default")];
				}),
				_: 3
			}, _parent));
			else _push(`<!---->`);
		};
	}
});
//#endregion
//#region ../app/components/ui/command/CommandItem.vue
var _sfc_setup$8 = CommandItem_vue_vue_type_script_setup_true_lang_default.setup;
CommandItem_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/command/CommandItem.vue");
	return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
var CommandItem_default = CommandItem_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/command/CommandList.vue?vue&type=script&setup=true&lang.ts
var CommandList_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "CommandList",
	__ssrInlineRender: true,
	props: {
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const forwarded = useForwardProps(reactiveOmit(props, "class"));
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(ListboxContent_default), (0, vue_exports.mergeProps)({ "data-slot": "command-list" }, (0, vue_exports.unref)(forwarded), { class: (0, vue_exports.unref)(cn)("max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto", props.class) }, _attrs), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<div role="presentation"${_scopeId}>`);
						(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent, _scopeId);
						_push(`</div>`);
					} else return [(0, vue_exports.createVNode)("div", { role: "presentation" }, [(0, vue_exports.renderSlot)(_ctx.$slots, "default")])];
				}),
				_: 3
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/command/CommandList.vue
var _sfc_setup$7 = CommandList_vue_vue_type_script_setup_true_lang_default.setup;
CommandList_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/command/CommandList.vue");
	return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
var CommandList_default = CommandList_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region ../app/components/ui/command/CommandSeparator.vue?vue&type=script&setup=true&lang.ts
var CommandSeparator_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "CommandSeparator",
	__ssrInlineRender: true,
	props: {
		orientation: {},
		decorative: { type: Boolean },
		asChild: { type: Boolean },
		as: {},
		class: {}
	},
	setup(__props) {
		const props = __props;
		const delegatedProps = reactiveOmit(props, "class");
		return (_ctx, _push, _parent, _attrs) => {
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(Separator_default), (0, vue_exports.mergeProps)({ "data-slot": "command-separator" }, (0, vue_exports.unref)(delegatedProps), { class: (0, vue_exports.unref)(cn)("bg-border -mx-1 h-px", props.class) }, _attrs), {
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
//#region ../app/components/ui/command/CommandSeparator.vue
var _sfc_setup$6 = CommandSeparator_vue_vue_type_script_setup_true_lang_default.setup;
CommandSeparator_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/command/CommandSeparator.vue");
	return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/command/CommandShortcut.vue?vue&type=script&setup=true&lang.ts
var CommandShortcut_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "CommandShortcut",
	__ssrInlineRender: true,
	props: { class: {} },
	setup(__props) {
		const props = __props;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<span${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({
				"data-slot": "command-shortcut",
				class: (0, vue_exports.unref)(cn)("text-muted-foreground ml-auto text-xs tracking-widest", props.class)
			}, _attrs))}>`);
			(0, server_renderer_exports.ssrRenderSlot)(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</span>`);
		};
	}
});
//#endregion
//#region ../app/components/ui/command/CommandShortcut.vue
var _sfc_setup$5 = CommandShortcut_vue_vue_type_script_setup_true_lang_default.setup;
CommandShortcut_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/command/CommandShortcut.vue");
	return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
//#endregion
//#region ../app/components/ui/command/index.ts
var [useCommand, provideCommandContext] = createContext("Command");
var [useCommandGroup, provideCommandGroupContext] = createContext("CommandGroup");
//#endregion
//#region ../app/composables/useFuzzySearch.ts
/**
* Typo tolerance beside Content's FTS index.
*
* FTS5 matches terms and prefixes, never near-misses, so a single wrong letter
* returns nothing at all. Fuse matches approximately over the same sections the
* database indexes.
*
* Both the library and the sections are loaded on the first query the database
* cannot answer, not when the dialog opens: a reader who types accurately never
* downloads either. The sections come through Content's client database, which
* the FTS index has already loaded by then, so the fallback costs no second
* payload — only Fuse itself.
*/
function useFuzzySearch(collection = "docs", options) {
	let index;
	let indexedFor;
	async function build(name) {
		const [{ default: Fuse }, sections] = await Promise.all([import('fuse.js'), queryCollectionSearchSections(name, options)]);
		return new Fuse(sections, {
			keys: [
				{
					name: "title",
					weight: 3
				},
				{
					name: "titles",
					weight: 2
				},
				{
					name: "content",
					weight: 1
				}
			],
			ignoreLocation: true,
			threshold: .35,
			minMatchCharLength: 3
		});
	}
	async function search(term, limit = 20) {
		const name = (0, vue_exports.toValue)(collection);
		if (!index || name !== indexedFor) {
			indexedFor = name;
			index = build(name);
		}
		return (await index).search(term, { limit }).map((hit) => hit.item);
	}
	return { search };
}
//#endregion
//#region ../app/components/DuxtSearch.vue?vue&type=script&setup=true&lang.ts
var DuxtSearch_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	inheritAttrs: false,
	__name: "DuxtSearch",
	__ssrInlineRender: true,
	setup(__props) {
		const { collection } = useDuxtCollection();
		const open = (0, vue_exports.ref)(false);
		const query = (0, vue_exports.ref)("");
		const router = useRouter();
		const localeLink = useDuxtLink();
		const { search, status, init } = useSearchCollection(collection, {
			ignoredTags: ["table"],
			immediate: false
		});
		const { search: searchApproximately } = useFuzzySearch(collection, { ignoredTags: ["table"] });
		const results = (0, vue_exports.ref)([]);
		/** True while the list shows near-misses rather than actual matches. */
		const approximate = (0, vue_exports.ref)(false);
		let pending;
		let run = 0;
		(0, vue_exports.watch)(query, (term) => {
			clearTimeout(pending);
			pending = setTimeout(async () => {
				const current = ++run;
				const settle = (hits, fuzzy) => {
					if (current !== run) return;
					results.value = hits;
					approximate.value = fuzzy;
				};
				if (!term.trim()) return settle([], false);
				const hits = await search(term, { limit: 20 });
				if (hits.length || current !== run) return settle(hits, false);
				settle(await searchApproximately(term, 20), true);
			}, 120);
		});
		const duxt = useDuxtConfig();
		const { recent} = useRecentPages();
		/** Which section a path belongs to, for grouping the hits. */
		function sectionOf(path) {
			return duxt.sections?.find((section) => section.to && path.startsWith(section.to))?.label ?? "Documentation";
		}
		/**
		* Hits grouped by section rather than by page. Grouping by page produced one
		* heading per result; a section groups many, which is what a heading is for —
		* and the reader already thinks in sections, because the navbar shows them.
		*/
		const grouped = (0, vue_exports.computed)(() => {
			const bySection = /* @__PURE__ */ new Map();
			for (const hit of results.value) {
				const label = asText(sectionOf(hit.id)) ?? "Documentation";
				bySection.set(label, [...bySection.get(label) ?? [], hit]);
			}
			return [...bySection.entries()].map(([label, hits]) => ({
				label,
				hits
			}));
		});
		async function show() {
			open.value = true;
			if (status.value === "idle") await init();
		}
		function go(id) {
			open.value = false;
			query.value = "";
			results.value = [];
			approximate.value = false;
			router.push(localeLink(id));
		}
		/** Where a hit sits: the page, and the headings above it inside that page. */
		function context(result) {
			return [result.titles[0], ...result.titles.slice(1)].filter(Boolean).join(" › ");
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Button = Button_default;
			const _component_Icon = components_default;
			const _component_CommandDialog = CommandDialog_default;
			const _component_CommandList = CommandList_default;
			const _component_CommandGroup = CommandGroup_default;
			const _component_CommandItem = CommandItem_default;
			_push(`<!--[-->`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, (0, vue_exports.mergeProps)(_ctx.$attrs, {
				variant: "outline",
				size: "sm",
				class: "w-full justify-start gap-2 text-muted-foreground sm:w-56",
				onClick: show
			}), {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
							name: "lucide:search",
							class: "size-4"
						}, null, _parent, _scopeId));
						_push(`<span class="text-sm"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(_ctx.$t("duxt.search.label"))}</span><kbd class="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline-block"${_scopeId}> ⌘K </kbd>`);
					} else return [
						(0, vue_exports.createVNode)(_component_Icon, {
							name: "lucide:search",
							class: "size-4"
						}),
						(0, vue_exports.createVNode)("span", { class: "text-sm" }, (0, vue_exports.toDisplayString)(_ctx.$t("duxt.search.label")), 1),
						(0, vue_exports.createVNode)("kbd", { class: "ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline-block" }, " ⌘K ")
					];
				}),
				_: 1
			}, _parent));
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_CommandDialog, {
				open: (0, vue_exports.unref)(open),
				"onUpdate:open": ($event) => (0, vue_exports.isRef)(open) ? open.value = $event : null
			}, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<div class="flex items-center gap-2 border-b px-3"${_scopeId}>`);
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
							name: "lucide:search",
							class: "size-4 shrink-0 text-muted-foreground"
						}, null, _parent, _scopeId));
						_push(`<input${(0, server_renderer_exports.ssrRenderAttr)("value", (0, vue_exports.unref)(query))} class="flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"${(0, server_renderer_exports.ssrRenderAttr)("placeholder", _ctx.$t("duxt.search.placeholder"))} autofocus${_scopeId}></div>`);
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_CommandList, { class: "max-h-[60vh]" }, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) {
									if (!(0, vue_exports.unref)(query).trim()) {
										_push(`<!--[-->`);
										if ((0, vue_exports.unref)(recent).length) _push((0, server_renderer_exports.ssrRenderComponent)(_component_CommandGroup, { heading: _ctx.$t("duxt.search.recent") }, {
											default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
												if (_push) {
													_push(`<!--[-->`);
													(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(recent), (page) => {
														_push((0, server_renderer_exports.ssrRenderComponent)(_component_CommandItem, {
															key: page.path,
															value: `recent ${page.path}`,
															class: "gap-2",
															onSelect: ($event) => go(page.path)
														}, {
															default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
																if (_push) {
																	_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
																		name: "lucide:history",
																		class: "size-3.5 shrink-0 text-muted-foreground"
																	}, null, _parent, _scopeId));
																	_push(`<span class="truncate"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(page.title)}</span><span class="ml-auto truncate pl-3 text-xs text-muted-foreground"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(sectionOf(page.path))}</span>`);
																} else return [
																	(0, vue_exports.createVNode)(_component_Icon, {
																		name: "lucide:history",
																		class: "size-3.5 shrink-0 text-muted-foreground"
																	}),
																	(0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(page.title), 1),
																	(0, vue_exports.createVNode)("span", { class: "ml-auto truncate pl-3 text-xs text-muted-foreground" }, (0, vue_exports.toDisplayString)(sectionOf(page.path)), 1)
																];
															}),
															_: 2
														}, _parent, _scopeId));
													});
													_push(`<!--]-->`);
												} else return [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(recent), (page) => {
													return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandItem, {
														key: page.path,
														value: `recent ${page.path}`,
														class: "gap-2",
														onSelect: ($event) => go(page.path)
													}, {
														default: (0, vue_exports.withCtx)(() => [
															(0, vue_exports.createVNode)(_component_Icon, {
																name: "lucide:history",
																class: "size-3.5 shrink-0 text-muted-foreground"
															}),
															(0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(page.title), 1),
															(0, vue_exports.createVNode)("span", { class: "ml-auto truncate pl-3 text-xs text-muted-foreground" }, (0, vue_exports.toDisplayString)(sectionOf(page.path)), 1)
														]),
														_: 2
													}, 1032, ["value", "onSelect"]);
												}), 128))];
											}),
											_: 1
										}, _parent, _scopeId));
										else _push(`<!---->`);
										_push((0, server_renderer_exports.ssrRenderComponent)(_component_CommandGroup, { heading: _ctx.$t("duxt.search.sections") }, {
											default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
												if (_push) {
													_push(`<!--[-->`);
													(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(duxt).sections ?? [], (section) => {
														_push((0, server_renderer_exports.ssrRenderComponent)(_component_CommandItem, {
															key: section.to,
															value: `section ${section.label}`,
															class: "gap-2",
															onSelect: ($event) => go(section.to ?? "/")
														}, {
															default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
																if (_push) {
																	_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
																		name: section.icon ?? "lucide:book-open",
																		class: "size-3.5 shrink-0 text-muted-foreground"
																	}, null, _parent, _scopeId));
																	_push(`<span class="truncate"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(section.label)}</span>`);
																} else return [(0, vue_exports.createVNode)(_component_Icon, {
																	name: section.icon ?? "lucide:book-open",
																	class: "size-3.5 shrink-0 text-muted-foreground"
																}, null, 8, ["name"]), (0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(section.label), 1)];
															}),
															_: 2
														}, _parent, _scopeId));
													});
													_push(`<!--]-->`);
												} else return [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(duxt).sections ?? [], (section) => {
													return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandItem, {
														key: section.to,
														value: `section ${section.label}`,
														class: "gap-2",
														onSelect: ($event) => go(section.to ?? "/")
													}, {
														default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
															name: section.icon ?? "lucide:book-open",
															class: "size-3.5 shrink-0 text-muted-foreground"
														}, null, 8, ["name"]), (0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(section.label), 1)]),
														_: 2
													}, 1032, ["value", "onSelect"]);
												}), 128))];
											}),
											_: 1
										}, _parent, _scopeId));
										_push(`<!--]-->`);
									} else if (!(0, vue_exports.unref)(results).length) {
										_push(`<div class="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground"${_scopeId}>`);
										_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
											name: "lucide:search-x",
											class: "size-5 opacity-60"
										}, null, _parent, _scopeId));
										_push(` ${(0, server_renderer_exports.ssrInterpolate)(_ctx.$t("duxt.search.empty", { query: (0, vue_exports.unref)(query) }))}</div>`);
									} else _push(`<!---->`);
									if ((0, vue_exports.unref)(approximate)) {
										_push(`<div class="flex items-center gap-2 px-3 pt-3 pb-1 text-xs text-muted-foreground"${_scopeId}>`);
										_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
											name: "lucide:sparkles",
											class: "size-3.5 shrink-0"
										}, null, _parent, _scopeId));
										_push(` ${(0, server_renderer_exports.ssrInterpolate)(_ctx.$t("duxt.search.approximate", { query: (0, vue_exports.unref)(query) }))}</div>`);
									} else _push(`<!---->`);
									_push(`<!--[-->`);
									(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(grouped), (group) => {
										_push((0, server_renderer_exports.ssrRenderComponent)(_component_CommandGroup, {
											key: group.label,
											heading: group.label
										}, {
											default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
												if (_push) {
													_push(`<!--[-->`);
													(0, server_renderer_exports.ssrRenderList)(group.hits, (hit) => {
														_push((0, server_renderer_exports.ssrRenderComponent)(_component_CommandItem, {
															key: hit.id,
															value: hit.id,
															class: "gap-2",
															onSelect: ($event) => go(hit.id)
														}, {
															default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
																if (_push) {
																	_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
																		name: hit.level > 1 ? "lucide:hash" : "lucide:file-text",
																		class: "size-3.5 shrink-0 text-muted-foreground"
																	}, null, _parent, _scopeId));
																	_push(`<span class="truncate"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(hit.title)}</span><span class="ml-auto truncate pl-3 text-xs text-muted-foreground"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(context(hit))}</span>`);
																} else return [
																	(0, vue_exports.createVNode)(_component_Icon, {
																		name: hit.level > 1 ? "lucide:hash" : "lucide:file-text",
																		class: "size-3.5 shrink-0 text-muted-foreground"
																	}, null, 8, ["name"]),
																	(0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(hit.title), 1),
																	(0, vue_exports.createVNode)("span", { class: "ml-auto truncate pl-3 text-xs text-muted-foreground" }, (0, vue_exports.toDisplayString)(context(hit)), 1)
																];
															}),
															_: 2
														}, _parent, _scopeId));
													});
													_push(`<!--]-->`);
												} else return [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(group.hits, (hit) => {
													return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandItem, {
														key: hit.id,
														value: hit.id,
														class: "gap-2",
														onSelect: ($event) => go(hit.id)
													}, {
														default: (0, vue_exports.withCtx)(() => [
															(0, vue_exports.createVNode)(_component_Icon, {
																name: hit.level > 1 ? "lucide:hash" : "lucide:file-text",
																class: "size-3.5 shrink-0 text-muted-foreground"
															}, null, 8, ["name"]),
															(0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(hit.title), 1),
															(0, vue_exports.createVNode)("span", { class: "ml-auto truncate pl-3 text-xs text-muted-foreground" }, (0, vue_exports.toDisplayString)(context(hit)), 1)
														]),
														_: 2
													}, 1032, ["value", "onSelect"]);
												}), 128))];
											}),
											_: 2
										}, _parent, _scopeId));
									});
									_push(`<!--]-->`);
								} else return [
									!(0, vue_exports.unref)(query).trim() ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(vue_exports.Fragment, { key: 0 }, [(0, vue_exports.unref)(recent).length ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandGroup, {
										key: 0,
										heading: _ctx.$t("duxt.search.recent")
									}, {
										default: (0, vue_exports.withCtx)(() => [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(recent), (page) => {
											return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandItem, {
												key: page.path,
												value: `recent ${page.path}`,
												class: "gap-2",
												onSelect: ($event) => go(page.path)
											}, {
												default: (0, vue_exports.withCtx)(() => [
													(0, vue_exports.createVNode)(_component_Icon, {
														name: "lucide:history",
														class: "size-3.5 shrink-0 text-muted-foreground"
													}),
													(0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(page.title), 1),
													(0, vue_exports.createVNode)("span", { class: "ml-auto truncate pl-3 text-xs text-muted-foreground" }, (0, vue_exports.toDisplayString)(sectionOf(page.path)), 1)
												]),
												_: 2
											}, 1032, ["value", "onSelect"]);
										}), 128))]),
										_: 1
									}, 8, ["heading"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createVNode)(_component_CommandGroup, { heading: _ctx.$t("duxt.search.sections") }, {
										default: (0, vue_exports.withCtx)(() => [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(duxt).sections ?? [], (section) => {
											return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandItem, {
												key: section.to,
												value: `section ${section.label}`,
												class: "gap-2",
												onSelect: ($event) => go(section.to ?? "/")
											}, {
												default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
													name: section.icon ?? "lucide:book-open",
													class: "size-3.5 shrink-0 text-muted-foreground"
												}, null, 8, ["name"]), (0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(section.label), 1)]),
												_: 2
											}, 1032, ["value", "onSelect"]);
										}), 128))]),
										_: 1
									}, 8, ["heading"])], 64)) : !(0, vue_exports.unref)(results).length ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("div", {
										key: 1,
										class: "flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground"
									}, [(0, vue_exports.createVNode)(_component_Icon, {
										name: "lucide:search-x",
										class: "size-5 opacity-60"
									}), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(_ctx.$t("duxt.search.empty", { query: (0, vue_exports.unref)(query) })), 1)])) : (0, vue_exports.createCommentVNode)("", true),
									(0, vue_exports.unref)(approximate) ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("div", {
										key: 2,
										class: "flex items-center gap-2 px-3 pt-3 pb-1 text-xs text-muted-foreground"
									}, [(0, vue_exports.createVNode)(_component_Icon, {
										name: "lucide:sparkles",
										class: "size-3.5 shrink-0"
									}), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(_ctx.$t("duxt.search.approximate", { query: (0, vue_exports.unref)(query) })), 1)])) : (0, vue_exports.createCommentVNode)("", true),
									((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(grouped), (group) => {
										return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandGroup, {
											key: group.label,
											heading: group.label
										}, {
											default: (0, vue_exports.withCtx)(() => [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(group.hits, (hit) => {
												return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandItem, {
													key: hit.id,
													value: hit.id,
													class: "gap-2",
													onSelect: ($event) => go(hit.id)
												}, {
													default: (0, vue_exports.withCtx)(() => [
														(0, vue_exports.createVNode)(_component_Icon, {
															name: hit.level > 1 ? "lucide:hash" : "lucide:file-text",
															class: "size-3.5 shrink-0 text-muted-foreground"
														}, null, 8, ["name"]),
														(0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(hit.title), 1),
														(0, vue_exports.createVNode)("span", { class: "ml-auto truncate pl-3 text-xs text-muted-foreground" }, (0, vue_exports.toDisplayString)(context(hit)), 1)
													]),
													_: 2
												}, 1032, ["value", "onSelect"]);
											}), 128))]),
											_: 2
										}, 1032, ["heading"]);
									}), 128))
								];
							}),
							_: 1
						}, _parent, _scopeId));
					} else return [(0, vue_exports.createVNode)("div", { class: "flex items-center gap-2 border-b px-3" }, [(0, vue_exports.createVNode)(_component_Icon, {
						name: "lucide:search",
						class: "size-4 shrink-0 text-muted-foreground"
					}), (0, vue_exports.withDirectives)((0, vue_exports.createVNode)("input", {
						"onUpdate:modelValue": ($event) => (0, vue_exports.isRef)(query) ? query.value = $event : null,
						class: "flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
						placeholder: _ctx.$t("duxt.search.placeholder"),
						autofocus: ""
					}, null, 8, ["onUpdate:modelValue", "placeholder"]), [[vue_exports.vModelText, (0, vue_exports.unref)(query)]])]), (0, vue_exports.createVNode)(_component_CommandList, { class: "max-h-[60vh]" }, {
						default: (0, vue_exports.withCtx)(() => [
							!(0, vue_exports.unref)(query).trim() ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(vue_exports.Fragment, { key: 0 }, [(0, vue_exports.unref)(recent).length ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandGroup, {
								key: 0,
								heading: _ctx.$t("duxt.search.recent")
							}, {
								default: (0, vue_exports.withCtx)(() => [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(recent), (page) => {
									return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandItem, {
										key: page.path,
										value: `recent ${page.path}`,
										class: "gap-2",
										onSelect: ($event) => go(page.path)
									}, {
										default: (0, vue_exports.withCtx)(() => [
											(0, vue_exports.createVNode)(_component_Icon, {
												name: "lucide:history",
												class: "size-3.5 shrink-0 text-muted-foreground"
											}),
											(0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(page.title), 1),
											(0, vue_exports.createVNode)("span", { class: "ml-auto truncate pl-3 text-xs text-muted-foreground" }, (0, vue_exports.toDisplayString)(sectionOf(page.path)), 1)
										]),
										_: 2
									}, 1032, ["value", "onSelect"]);
								}), 128))]),
								_: 1
							}, 8, ["heading"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createVNode)(_component_CommandGroup, { heading: _ctx.$t("duxt.search.sections") }, {
								default: (0, vue_exports.withCtx)(() => [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(duxt).sections ?? [], (section) => {
									return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandItem, {
										key: section.to,
										value: `section ${section.label}`,
										class: "gap-2",
										onSelect: ($event) => go(section.to ?? "/")
									}, {
										default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
											name: section.icon ?? "lucide:book-open",
											class: "size-3.5 shrink-0 text-muted-foreground"
										}, null, 8, ["name"]), (0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(section.label), 1)]),
										_: 2
									}, 1032, ["value", "onSelect"]);
								}), 128))]),
								_: 1
							}, 8, ["heading"])], 64)) : !(0, vue_exports.unref)(results).length ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("div", {
								key: 1,
								class: "flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground"
							}, [(0, vue_exports.createVNode)(_component_Icon, {
								name: "lucide:search-x",
								class: "size-5 opacity-60"
							}), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(_ctx.$t("duxt.search.empty", { query: (0, vue_exports.unref)(query) })), 1)])) : (0, vue_exports.createCommentVNode)("", true),
							(0, vue_exports.unref)(approximate) ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("div", {
								key: 2,
								class: "flex items-center gap-2 px-3 pt-3 pb-1 text-xs text-muted-foreground"
							}, [(0, vue_exports.createVNode)(_component_Icon, {
								name: "lucide:sparkles",
								class: "size-3.5 shrink-0"
							}), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(_ctx.$t("duxt.search.approximate", { query: (0, vue_exports.unref)(query) })), 1)])) : (0, vue_exports.createCommentVNode)("", true),
							((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(grouped), (group) => {
								return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandGroup, {
									key: group.label,
									heading: group.label
								}, {
									default: (0, vue_exports.withCtx)(() => [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(group.hits, (hit) => {
										return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_CommandItem, {
											key: hit.id,
											value: hit.id,
											class: "gap-2",
											onSelect: ($event) => go(hit.id)
										}, {
											default: (0, vue_exports.withCtx)(() => [
												(0, vue_exports.createVNode)(_component_Icon, {
													name: hit.level > 1 ? "lucide:hash" : "lucide:file-text",
													class: "size-3.5 shrink-0 text-muted-foreground"
												}, null, 8, ["name"]),
												(0, vue_exports.createVNode)("span", { class: "truncate" }, (0, vue_exports.toDisplayString)(hit.title), 1),
												(0, vue_exports.createVNode)("span", { class: "ml-auto truncate pl-3 text-xs text-muted-foreground" }, (0, vue_exports.toDisplayString)(context(hit)), 1)
											]),
											_: 2
										}, 1032, ["value", "onSelect"]);
									}), 128))]),
									_: 2
								}, 1032, ["heading"]);
							}), 128))
						]),
						_: 1
					})];
				}),
				_: 1
			}, _parent));
			_push(`<!--]-->`);
		};
	}
});
//#endregion
//#region ../app/components/DuxtSearch.vue
var _sfc_setup$4 = DuxtSearch_vue_vue_type_script_setup_true_lang_default.setup;
DuxtSearch_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/DuxtSearch.vue");
	return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
var DuxtSearch_default = Object.assign(DuxtSearch_vue_vue_type_script_setup_true_lang_default, { __name: "DuxtSearch" });
//#endregion
//#region ../app/components/DuxtLocale.vue?vue&type=script&setup=true&lang.ts
var DuxtLocale_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DuxtLocale",
	__ssrInlineRender: true,
	setup(__props) {
		/**
		* The language switcher, built like DuxtVersion beside it: nothing at all when
		* there is only one choice, a dropdown when there are several. A single-locale
		* consumer therefore never sees that duxt speaks seven languages.
		*
		* `switchLocalePath` rather than a link to the locale's root — switching
		* language on a page about deploying should land on that same page in the new
		* language, not throw the reader back to the front door.
		*/
		const { locale, locales } = useI18n();
		const switchLocalePath = useSwitchLocalePath();
		const available = (0, vue_exports.computed)(() => locales.value.map((entry) => ({
			code: entry.code,
			label: entry.name ?? entry.code,
			flag: flagFor(entry.code)
		})));
		const current = (0, vue_exports.computed)(() => available.value.find((entry) => entry.code === locale.value));
		/**
		* `flag:xx-4x3`, from the region half of the code — the same derivation the
		* icon client bundle in nuxt.config.ts uses, so every flag this renders is one
		* that was inlined at build time.
		*
		* Null for a locale that names no region (`ja`, `he`): there is no country to
		* show, and a flag guessed from a language is wrong more often than it is
		* right. The dropdown then simply shows the name.
		*/
		function flagFor(code) {
			const region = code.split("-")[1];
			return region && /^[a-z]{2}$/i.test(region) ? `flag:${region.toLowerCase()}-4x3` : null;
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_DropdownMenu = DropdownMenu_default;
			const _component_DropdownMenuTrigger = DropdownMenuTrigger_default;
			const _component_Button = Button_default;
			const _component_Icon = components_default;
			const _component_DropdownMenuContent = DropdownMenuContent_default;
			const _component_DropdownMenuItem = DropdownMenuItem_default;
			const _component_NuxtLink = NuxtLink;
			if ((0, vue_exports.unref)(available).length > 1) _push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenu, _attrs, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenuTrigger, { "as-child": "" }, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, {
									variant: "ghost",
									size: "icon",
									"aria-label": _ctx.$t("duxt.locale.switch")
								}, {
									default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
										if (_push) {
											if ((0, vue_exports.unref)(current)?.flag) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
												name: (0, vue_exports.unref)(current).flag,
												class: "size-4 rounded-[2px]"
											}, null, _parent, _scopeId));
											else _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
												name: "lucide:languages",
												class: "size-4"
											}, null, _parent, _scopeId));
										} else return [(0, vue_exports.unref)(current)?.flag ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
											key: 0,
											name: (0, vue_exports.unref)(current).flag,
											class: "size-4 rounded-[2px]"
										}, null, 8, ["name"])) : ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
											key: 1,
											name: "lucide:languages",
											class: "size-4"
										}))];
									}),
									_: 1
								}, _parent, _scopeId));
								else return [(0, vue_exports.createVNode)(_component_Button, {
									variant: "ghost",
									size: "icon",
									"aria-label": _ctx.$t("duxt.locale.switch")
								}, {
									default: (0, vue_exports.withCtx)(() => [(0, vue_exports.unref)(current)?.flag ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
										key: 0,
										name: (0, vue_exports.unref)(current).flag,
										class: "size-4 rounded-[2px]"
									}, null, 8, ["name"])) : ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
										key: 1,
										name: "lucide:languages",
										class: "size-4"
									}))]),
									_: 1
								}, 8, ["aria-label"])];
							}),
							_: 1
						}, _parent, _scopeId));
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenuContent, {
							align: "end",
							class: "w-48"
						}, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`<!--[-->`);
									(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(available), (entry) => {
										_push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenuItem, {
											key: entry.code,
											"as-child": ""
										}, {
											default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
												if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
													to: (0, vue_exports.unref)(switchLocalePath)(entry.code),
													class: "flex items-center gap-2"
												}, {
													default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
														if (_push) {
															if (entry.flag) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
																name: entry.flag,
																class: "size-4 shrink-0 rounded-[2px]"
															}, null, _parent, _scopeId));
															else _push(`<!---->`);
															_push(`<span class="truncate text-sm"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(entry.label)}</span>`);
															_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
																name: "lucide:check",
																class: ["ml-auto size-3.5 shrink-0", entry.code === (0, vue_exports.unref)(locale) ? "" : "opacity-0"]
															}, null, _parent, _scopeId));
														} else return [
															entry.flag ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
																key: 0,
																name: entry.flag,
																class: "size-4 shrink-0 rounded-[2px]"
															}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
															(0, vue_exports.createVNode)("span", { class: "truncate text-sm" }, (0, vue_exports.toDisplayString)(entry.label), 1),
															(0, vue_exports.createVNode)(_component_Icon, {
																name: "lucide:check",
																class: ["ml-auto size-3.5 shrink-0", entry.code === (0, vue_exports.unref)(locale) ? "" : "opacity-0"]
															}, null, 8, ["class"])
														];
													}),
													_: 2
												}, _parent, _scopeId));
												else return [(0, vue_exports.createVNode)(_component_NuxtLink, {
													to: (0, vue_exports.unref)(switchLocalePath)(entry.code),
													class: "flex items-center gap-2"
												}, {
													default: (0, vue_exports.withCtx)(() => [
														entry.flag ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
															key: 0,
															name: entry.flag,
															class: "size-4 shrink-0 rounded-[2px]"
														}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
														(0, vue_exports.createVNode)("span", { class: "truncate text-sm" }, (0, vue_exports.toDisplayString)(entry.label), 1),
														(0, vue_exports.createVNode)(_component_Icon, {
															name: "lucide:check",
															class: ["ml-auto size-3.5 shrink-0", entry.code === (0, vue_exports.unref)(locale) ? "" : "opacity-0"]
														}, null, 8, ["class"])
													]),
													_: 2
												}, 1032, ["to"])];
											}),
											_: 2
										}, _parent, _scopeId));
									});
									_push(`<!--]-->`);
								} else return [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(available), (entry) => {
									return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_DropdownMenuItem, {
										key: entry.code,
										"as-child": ""
									}, {
										default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_NuxtLink, {
											to: (0, vue_exports.unref)(switchLocalePath)(entry.code),
											class: "flex items-center gap-2"
										}, {
											default: (0, vue_exports.withCtx)(() => [
												entry.flag ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
													key: 0,
													name: entry.flag,
													class: "size-4 shrink-0 rounded-[2px]"
												}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
												(0, vue_exports.createVNode)("span", { class: "truncate text-sm" }, (0, vue_exports.toDisplayString)(entry.label), 1),
												(0, vue_exports.createVNode)(_component_Icon, {
													name: "lucide:check",
													class: ["ml-auto size-3.5 shrink-0", entry.code === (0, vue_exports.unref)(locale) ? "" : "opacity-0"]
												}, null, 8, ["class"])
											]),
											_: 2
										}, 1032, ["to"])]),
										_: 2
									}, 1024);
								}), 128))];
							}),
							_: 1
						}, _parent, _scopeId));
					} else return [(0, vue_exports.createVNode)(_component_DropdownMenuTrigger, { "as-child": "" }, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Button, {
							variant: "ghost",
							size: "icon",
							"aria-label": _ctx.$t("duxt.locale.switch")
						}, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.unref)(current)?.flag ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
								key: 0,
								name: (0, vue_exports.unref)(current).flag,
								class: "size-4 rounded-[2px]"
							}, null, 8, ["name"])) : ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
								key: 1,
								name: "lucide:languages",
								class: "size-4"
							}))]),
							_: 1
						}, 8, ["aria-label"])]),
						_: 1
					}), (0, vue_exports.createVNode)(_component_DropdownMenuContent, {
						align: "end",
						class: "w-48"
					}, {
						default: (0, vue_exports.withCtx)(() => [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(available), (entry) => {
							return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_DropdownMenuItem, {
								key: entry.code,
								"as-child": ""
							}, {
								default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_NuxtLink, {
									to: (0, vue_exports.unref)(switchLocalePath)(entry.code),
									class: "flex items-center gap-2"
								}, {
									default: (0, vue_exports.withCtx)(() => [
										entry.flag ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
											key: 0,
											name: entry.flag,
											class: "size-4 shrink-0 rounded-[2px]"
										}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
										(0, vue_exports.createVNode)("span", { class: "truncate text-sm" }, (0, vue_exports.toDisplayString)(entry.label), 1),
										(0, vue_exports.createVNode)(_component_Icon, {
											name: "lucide:check",
											class: ["ml-auto size-3.5 shrink-0", entry.code === (0, vue_exports.unref)(locale) ? "" : "opacity-0"]
										}, null, 8, ["class"])
									]),
									_: 2
								}, 1032, ["to"])]),
								_: 2
							}, 1024);
						}), 128))]),
						_: 1
					})];
				}),
				_: 1
			}, _parent));
			else _push(`<!---->`);
		};
	}
});
//#endregion
//#region ../app/components/DuxtLocale.vue
var _sfc_setup$3 = DuxtLocale_vue_vue_type_script_setup_true_lang_default.setup;
DuxtLocale_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/DuxtLocale.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var DuxtLocale_default = Object.assign(DuxtLocale_vue_vue_type_script_setup_true_lang_default, { __name: "DuxtLocale" });
//#endregion
//#region ../node_modules/.pnpm/@nuxtjs+color-mode@4.0.1_magic-string@0.30.21_magicast@0.5.4_oxc-parser@0.141.0_rolldow_3bc1c2a09afa5e491ed4c9ef841d05a3/node_modules/@nuxtjs/color-mode/dist/runtime/composables.js
var useColorMode = () => {
	return useState("color-mode").value;
};
//#endregion
//#region ../app/components/DuxtHeader.vue?vue&type=script&setup=true&lang.ts
var DuxtHeader_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DuxtHeader",
	__ssrInlineRender: true,
	async setup(__props) {
		let __temp, __restore;
		const duxt = useDuxtConfig();
		const colorMode = useColorMode();
		const path = useDuxtPath();
		const localeLink = useDuxtLink();
		const { data: navigation } = ([__temp, __restore] = (0, vue_exports.withAsyncContext)(() => useDuxtNavigation()), __temp = await __temp, __restore(), __temp);
		const { items } = useDuxtSection(navigation);
		function toggleTheme() {
			colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
		}
		function isActive(to) {
			return Boolean(to && to !== "/" && path.value.startsWith(to));
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Sheet = Sheet_default;
			const _component_SheetTrigger = SheetTrigger_default;
			const _component_Button = Button_default;
			const _component_Icon = components_default;
			const _component_SheetContent = SheetContent_default;
			const _component_SheetHeader = SheetHeader_default;
			const _component_SheetTitle = SheetTitle_default;
			const _component_NuxtLink = NuxtLink;
			const _component_DuxtNavigation = DuxtNavigation_default;
			const _component_DropdownMenu = DropdownMenu_default;
			const _component_DropdownMenuTrigger = DropdownMenuTrigger_default;
			const _component_DropdownMenuContent = DropdownMenuContent_default;
			const _component_DropdownMenuItem = DropdownMenuItem_default;
			const _component_DuxtVersion = DuxtVersion_default;
			const _component_DuxtSearch = DuxtSearch_default;
			const _component_DuxtLocale = DuxtLocale_default;
			_push(`<header${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({ class: "sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm" }, _attrs))}><div class="mx-auto grid h-14 max-w-[90rem] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 lg:px-8"><div class="flex items-center gap-2">`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_Sheet, null, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_SheetTrigger, { "as-child": "" }, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, {
									variant: "ghost",
									size: "icon",
									class: "lg:hidden",
									"aria-label": _ctx.$t("duxt.nav.open")
								}, {
									default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
										if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
											name: "lucide:menu",
											class: "size-5"
										}, null, _parent, _scopeId));
										else return [(0, vue_exports.createVNode)(_component_Icon, {
											name: "lucide:menu",
											class: "size-5"
										})];
									}),
									_: 1
								}, _parent, _scopeId));
								else return [(0, vue_exports.createVNode)(_component_Button, {
									variant: "ghost",
									size: "icon",
									class: "lg:hidden",
									"aria-label": _ctx.$t("duxt.nav.open")
								}, {
									default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
										name: "lucide:menu",
										class: "size-5"
									})]),
									_: 1
								}, 8, ["aria-label"])];
							}),
							_: 1
						}, _parent, _scopeId));
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_SheetContent, {
							side: "left",
							class: "flex w-80 flex-col gap-0 overflow-y-auto p-0"
						}, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push((0, server_renderer_exports.ssrRenderComponent)(_component_SheetHeader, { class: "border-b" }, {
										default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
											if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_SheetTitle, { class: "flex items-center gap-2" }, {
												default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
													if (_push) {
														_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
															name: "lucide:book-open-text",
															class: "size-5 text-primary"
														}, null, _parent, _scopeId));
														_push(` ${(0, server_renderer_exports.ssrInterpolate)((0, vue_exports.unref)(duxt).title)}`);
													} else return [(0, vue_exports.createVNode)(_component_Icon, {
														name: "lucide:book-open-text",
														class: "size-5 text-primary"
													}), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)((0, vue_exports.unref)(duxt).title), 1)];
												}),
												_: 1
											}, _parent, _scopeId));
											else return [(0, vue_exports.createVNode)(_component_SheetTitle, { class: "flex items-center gap-2" }, {
												default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
													name: "lucide:book-open-text",
													class: "size-5 text-primary"
												}), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)((0, vue_exports.unref)(duxt).title), 1)]),
												_: 1
											})];
										}),
										_: 1
									}, _parent, _scopeId));
									_push(`<div class="flex-1 overflow-y-auto p-4"${_scopeId}>`);
									if ((0, vue_exports.unref)(duxt).sections?.length) _push(`<p class="mb-2 text-xs font-medium text-muted-foreground"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(_ctx.$t("duxt.nav.sections"))}</p>`);
									else _push(`<!---->`);
									if ((0, vue_exports.unref)(duxt).sections?.length) {
										_push(`<ul class="mb-6 space-y-0.5 text-sm"${_scopeId}><!--[-->`);
										(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(duxt).sections, (section) => {
											_push(`<li${_scopeId}>`);
											_push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
												to: (0, vue_exports.unref)(localeLink)(section.to),
												class: ["flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors", isActive(section.to) ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"]
											}, {
												default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
													if (_push) {
														if (section.icon) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
															name: section.icon,
															class: "size-4"
														}, null, _parent, _scopeId));
														else _push(`<!---->`);
														_push(` ${(0, server_renderer_exports.ssrInterpolate)(section.label)}`);
													} else return [section.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
														key: 0,
														name: section.icon,
														class: "size-4"
													}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(section.label), 1)];
												}),
												_: 2
											}, _parent, _scopeId));
											_push(`</li>`);
										});
										_push(`<!--]--></ul>`);
									} else _push(`<!---->`);
									_push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtNavigation, { items: (0, vue_exports.unref)(items) }, null, _parent, _scopeId));
									_push(`<div class="mt-6 border-t pt-4"${_scopeId}><ul class="space-y-0.5 text-sm"${_scopeId}><!--[-->`);
									(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(duxt).navigation ?? [], (link) => {
										_push(`<!--[--><!--[-->`);
										(0, server_renderer_exports.ssrRenderList)(link.children ?? [link], (entry) => {
											_push(`<li${_scopeId}>`);
											_push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
												to: (0, vue_exports.unref)(localeLink)(entry.to),
												target: entry.external ? "_blank" : void 0,
												class: "flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
											}, {
												default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
													if (_push) {
														if (entry.icon) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
															name: entry.icon,
															class: "size-4"
														}, null, _parent, _scopeId));
														else _push(`<!---->`);
														_push(` ${(0, server_renderer_exports.ssrInterpolate)(entry.label)} `);
														if (entry.external) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
															name: "lucide:arrow-up-right",
															class: "size-3 opacity-50"
														}, null, _parent, _scopeId));
														else _push(`<!---->`);
													} else return [
														entry.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
															key: 0,
															name: entry.icon,
															class: "size-4"
														}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
														(0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(entry.label) + " ", 1),
														entry.external ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
															key: 1,
															name: "lucide:arrow-up-right",
															class: "size-3 opacity-50"
														})) : (0, vue_exports.createCommentVNode)("", true)
													];
												}),
												_: 2
											}, _parent, _scopeId));
											_push(`</li>`);
										});
										_push(`<!--]--><!--]-->`);
									});
									_push(`<!--]--></ul></div></div>`);
								} else return [(0, vue_exports.createVNode)(_component_SheetHeader, { class: "border-b" }, {
									default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_SheetTitle, { class: "flex items-center gap-2" }, {
										default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
											name: "lucide:book-open-text",
											class: "size-5 text-primary"
										}), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)((0, vue_exports.unref)(duxt).title), 1)]),
										_: 1
									})]),
									_: 1
								}), (0, vue_exports.createVNode)("div", { class: "flex-1 overflow-y-auto p-4" }, [
									(0, vue_exports.unref)(duxt).sections?.length ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("p", {
										key: 0,
										class: "mb-2 text-xs font-medium text-muted-foreground"
									}, (0, vue_exports.toDisplayString)(_ctx.$t("duxt.nav.sections")), 1)) : (0, vue_exports.createCommentVNode)("", true),
									(0, vue_exports.unref)(duxt).sections?.length ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("ul", {
										key: 1,
										class: "mb-6 space-y-0.5 text-sm"
									}, [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(duxt).sections, (section) => {
										return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("li", { key: section.label }, [(0, vue_exports.createVNode)(_component_NuxtLink, {
											to: (0, vue_exports.unref)(localeLink)(section.to),
											class: ["flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors", isActive(section.to) ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"]
										}, {
											default: (0, vue_exports.withCtx)(() => [section.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
												key: 0,
												name: section.icon,
												class: "size-4"
											}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(section.label), 1)]),
											_: 2
										}, 1032, ["to", "class"])]);
									}), 128))])) : (0, vue_exports.createCommentVNode)("", true),
									(0, vue_exports.createVNode)(_component_DuxtNavigation, { items: (0, vue_exports.unref)(items) }, null, 8, ["items"]),
									(0, vue_exports.createVNode)("div", { class: "mt-6 border-t pt-4" }, [(0, vue_exports.createVNode)("ul", { class: "space-y-0.5 text-sm" }, [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(duxt).navigation ?? [], (link) => {
										return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(vue_exports.Fragment, { key: link.label }, [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(link.children ?? [link], (entry) => {
											return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("li", { key: entry.label }, [(0, vue_exports.createVNode)(_component_NuxtLink, {
												to: (0, vue_exports.unref)(localeLink)(entry.to),
												target: entry.external ? "_blank" : void 0,
												class: "flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
											}, {
												default: (0, vue_exports.withCtx)(() => [
													entry.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
														key: 0,
														name: entry.icon,
														class: "size-4"
													}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
													(0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(entry.label) + " ", 1),
													entry.external ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
														key: 1,
														name: "lucide:arrow-up-right",
														class: "size-3 opacity-50"
													})) : (0, vue_exports.createCommentVNode)("", true)
												]),
												_: 2
											}, 1032, ["to", "target"])]);
										}), 128))], 64);
									}), 128))])])
								])];
							}),
							_: 1
						}, _parent, _scopeId));
					} else return [(0, vue_exports.createVNode)(_component_SheetTrigger, { "as-child": "" }, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Button, {
							variant: "ghost",
							size: "icon",
							class: "lg:hidden",
							"aria-label": _ctx.$t("duxt.nav.open")
						}, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
								name: "lucide:menu",
								class: "size-5"
							})]),
							_: 1
						}, 8, ["aria-label"])]),
						_: 1
					}), (0, vue_exports.createVNode)(_component_SheetContent, {
						side: "left",
						class: "flex w-80 flex-col gap-0 overflow-y-auto p-0"
					}, {
						default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_SheetHeader, { class: "border-b" }, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_SheetTitle, { class: "flex items-center gap-2" }, {
								default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Icon, {
									name: "lucide:book-open-text",
									class: "size-5 text-primary"
								}), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)((0, vue_exports.unref)(duxt).title), 1)]),
								_: 1
							})]),
							_: 1
						}), (0, vue_exports.createVNode)("div", { class: "flex-1 overflow-y-auto p-4" }, [
							(0, vue_exports.unref)(duxt).sections?.length ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("p", {
								key: 0,
								class: "mb-2 text-xs font-medium text-muted-foreground"
							}, (0, vue_exports.toDisplayString)(_ctx.$t("duxt.nav.sections")), 1)) : (0, vue_exports.createCommentVNode)("", true),
							(0, vue_exports.unref)(duxt).sections?.length ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("ul", {
								key: 1,
								class: "mb-6 space-y-0.5 text-sm"
							}, [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(duxt).sections, (section) => {
								return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("li", { key: section.label }, [(0, vue_exports.createVNode)(_component_NuxtLink, {
									to: (0, vue_exports.unref)(localeLink)(section.to),
									class: ["flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors", isActive(section.to) ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"]
								}, {
									default: (0, vue_exports.withCtx)(() => [section.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
										key: 0,
										name: section.icon,
										class: "size-4"
									}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(section.label), 1)]),
									_: 2
								}, 1032, ["to", "class"])]);
							}), 128))])) : (0, vue_exports.createCommentVNode)("", true),
							(0, vue_exports.createVNode)(_component_DuxtNavigation, { items: (0, vue_exports.unref)(items) }, null, 8, ["items"]),
							(0, vue_exports.createVNode)("div", { class: "mt-6 border-t pt-4" }, [(0, vue_exports.createVNode)("ul", { class: "space-y-0.5 text-sm" }, [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(duxt).navigation ?? [], (link) => {
								return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(vue_exports.Fragment, { key: link.label }, [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(link.children ?? [link], (entry) => {
									return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("li", { key: entry.label }, [(0, vue_exports.createVNode)(_component_NuxtLink, {
										to: (0, vue_exports.unref)(localeLink)(entry.to),
										target: entry.external ? "_blank" : void 0,
										class: "flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
									}, {
										default: (0, vue_exports.withCtx)(() => [
											entry.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
												key: 0,
												name: entry.icon,
												class: "size-4"
											}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true),
											(0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)(entry.label) + " ", 1),
											entry.external ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
												key: 1,
												name: "lucide:arrow-up-right",
												class: "size-3 opacity-50"
											})) : (0, vue_exports.createCommentVNode)("", true)
										]),
										_: 2
									}, 1032, ["to", "target"])]);
								}), 128))], 64);
							}), 128))])])
						])]),
						_: 1
					})];
				}),
				_: 1
			}, _parent));
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
				to: (0, vue_exports.unref)(localeLink)("/"),
				class: "flex items-center gap-2 text-[15px] font-semibold tracking-tight"
			}, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
							name: "lucide:book-open-text",
							class: "size-5 text-primary"
						}, null, _parent, _scopeId));
						_push(` ${(0, server_renderer_exports.ssrInterpolate)((0, vue_exports.unref)(duxt).title)}`);
					} else return [(0, vue_exports.createVNode)(_component_Icon, {
						name: "lucide:book-open-text",
						class: "size-5 text-primary"
					}), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)((0, vue_exports.unref)(duxt).title), 1)];
				}),
				_: 1
			}, _parent));
			_push(`</div><nav class="hidden items-center gap-0.5 text-sm md:flex"><!--[-->`);
			(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(duxt).navigation, (link) => {
				_push(`<!--[-->`);
				if (link.children?.length) _push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenu, null, {
					default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenuTrigger, { "as-child": "" }, {
								default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
									if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, {
										variant: "ghost",
										size: "sm",
										class: "gap-1.5 font-medium text-muted-foreground"
									}, {
										default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
											if (_push) {
												_push(`${(0, server_renderer_exports.ssrInterpolate)(link.label)} `);
												_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
													name: "lucide:chevron-down",
													class: "size-3.5 opacity-60"
												}, null, _parent, _scopeId));
											} else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(link.label) + " ", 1), (0, vue_exports.createVNode)(_component_Icon, {
												name: "lucide:chevron-down",
												class: "size-3.5 opacity-60"
											})];
										}),
										_: 2
									}, _parent, _scopeId));
									else return [(0, vue_exports.createVNode)(_component_Button, {
										variant: "ghost",
										size: "sm",
										class: "gap-1.5 font-medium text-muted-foreground"
									}, {
										default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(link.label) + " ", 1), (0, vue_exports.createVNode)(_component_Icon, {
											name: "lucide:chevron-down",
											class: "size-3.5 opacity-60"
										})]),
										_: 2
									}, 1024)];
								}),
								_: 2
							}, _parent, _scopeId));
							_push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenuContent, {
								align: "center",
								class: "w-64"
							}, {
								default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`<!--[-->`);
										(0, server_renderer_exports.ssrRenderList)(link.children, (child) => {
											_push((0, server_renderer_exports.ssrRenderComponent)(_component_DropdownMenuItem, {
												key: child.to,
												"as-child": ""
											}, {
												default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
													if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
														to: (0, vue_exports.unref)(localeLink)(child.to),
														target: child.external ? "_blank" : void 0,
														class: "flex items-start gap-2.5"
													}, {
														default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
															if (_push) {
																if (child.icon) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
																	name: child.icon,
																	class: "mt-0.5 size-4 shrink-0"
																}, null, _parent, _scopeId));
																else _push(`<!---->`);
																_push(`<span class="min-w-0"${_scopeId}><span class="block font-medium"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(child.label)}</span>`);
																if (child.description) _push(`<span class="block text-xs text-muted-foreground"${_scopeId}>${(0, server_renderer_exports.ssrInterpolate)(child.description)}</span>`);
																else _push(`<!---->`);
																_push(`</span>`);
															} else return [child.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
																key: 0,
																name: child.icon,
																class: "mt-0.5 size-4 shrink-0"
															}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createVNode)("span", { class: "min-w-0" }, [(0, vue_exports.createVNode)("span", { class: "block font-medium" }, (0, vue_exports.toDisplayString)(child.label), 1), child.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("span", {
																key: 0,
																class: "block text-xs text-muted-foreground"
															}, (0, vue_exports.toDisplayString)(child.description), 1)) : (0, vue_exports.createCommentVNode)("", true)])];
														}),
														_: 2
													}, _parent, _scopeId));
													else return [(0, vue_exports.createVNode)(_component_NuxtLink, {
														to: (0, vue_exports.unref)(localeLink)(child.to),
														target: child.external ? "_blank" : void 0,
														class: "flex items-start gap-2.5"
													}, {
														default: (0, vue_exports.withCtx)(() => [child.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
															key: 0,
															name: child.icon,
															class: "mt-0.5 size-4 shrink-0"
														}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createVNode)("span", { class: "min-w-0" }, [(0, vue_exports.createVNode)("span", { class: "block font-medium" }, (0, vue_exports.toDisplayString)(child.label), 1), child.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("span", {
															key: 0,
															class: "block text-xs text-muted-foreground"
														}, (0, vue_exports.toDisplayString)(child.description), 1)) : (0, vue_exports.createCommentVNode)("", true)])]),
														_: 2
													}, 1032, ["to", "target"])];
												}),
												_: 2
											}, _parent, _scopeId));
										});
										_push(`<!--]-->`);
									} else return [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(link.children, (child) => {
										return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_DropdownMenuItem, {
											key: child.to,
											"as-child": ""
										}, {
											default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_NuxtLink, {
												to: (0, vue_exports.unref)(localeLink)(child.to),
												target: child.external ? "_blank" : void 0,
												class: "flex items-start gap-2.5"
											}, {
												default: (0, vue_exports.withCtx)(() => [child.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
													key: 0,
													name: child.icon,
													class: "mt-0.5 size-4 shrink-0"
												}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createVNode)("span", { class: "min-w-0" }, [(0, vue_exports.createVNode)("span", { class: "block font-medium" }, (0, vue_exports.toDisplayString)(child.label), 1), child.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("span", {
													key: 0,
													class: "block text-xs text-muted-foreground"
												}, (0, vue_exports.toDisplayString)(child.description), 1)) : (0, vue_exports.createCommentVNode)("", true)])]),
												_: 2
											}, 1032, ["to", "target"])]),
											_: 2
										}, 1024);
									}), 128))];
								}),
								_: 2
							}, _parent, _scopeId));
						} else return [(0, vue_exports.createVNode)(_component_DropdownMenuTrigger, { "as-child": "" }, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_Button, {
								variant: "ghost",
								size: "sm",
								class: "gap-1.5 font-medium text-muted-foreground"
							}, {
								default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(link.label) + " ", 1), (0, vue_exports.createVNode)(_component_Icon, {
									name: "lucide:chevron-down",
									class: "size-3.5 opacity-60"
								})]),
								_: 2
							}, 1024)]),
							_: 2
						}, 1024), (0, vue_exports.createVNode)(_component_DropdownMenuContent, {
							align: "center",
							class: "w-64"
						}, {
							default: (0, vue_exports.withCtx)(() => [((0, vue_exports.openBlock)(true), (0, vue_exports.createBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(link.children, (child) => {
								return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_DropdownMenuItem, {
									key: child.to,
									"as-child": ""
								}, {
									default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createVNode)(_component_NuxtLink, {
										to: (0, vue_exports.unref)(localeLink)(child.to),
										target: child.external ? "_blank" : void 0,
										class: "flex items-start gap-2.5"
									}, {
										default: (0, vue_exports.withCtx)(() => [child.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
											key: 0,
											name: child.icon,
											class: "mt-0.5 size-4 shrink-0"
										}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true), (0, vue_exports.createVNode)("span", { class: "min-w-0" }, [(0, vue_exports.createVNode)("span", { class: "block font-medium" }, (0, vue_exports.toDisplayString)(child.label), 1), child.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)("span", {
											key: 0,
											class: "block text-xs text-muted-foreground"
										}, (0, vue_exports.toDisplayString)(child.description), 1)) : (0, vue_exports.createCommentVNode)("", true)])]),
										_: 2
									}, 1032, ["to", "target"])]),
									_: 2
								}, 1024);
							}), 128))]),
							_: 2
						}, 1024)];
					}),
					_: 2
				}, _parent));
				else _push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, {
					"as-child": "",
					variant: "ghost",
					size: "sm",
					class: ["font-medium", isActive(link.to) ? "text-foreground" : "text-muted-foreground"]
				}, {
					default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
						if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
							to: (0, vue_exports.unref)(localeLink)(link.to),
							target: link.external ? "_blank" : void 0
						}, {
							default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
								if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)(link.label)}`);
								else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(link.label), 1)];
							}),
							_: 2
						}, _parent, _scopeId));
						else return [(0, vue_exports.createVNode)(_component_NuxtLink, {
							to: (0, vue_exports.unref)(localeLink)(link.to),
							target: link.external ? "_blank" : void 0
						}, {
							default: (0, vue_exports.withCtx)(() => [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(link.label), 1)]),
							_: 2
						}, 1032, ["to", "target"])];
					}),
					_: 2
				}, _parent));
				_push(`<!--]-->`);
			});
			_push(`<!--]--></nav><div class="flex items-center justify-end gap-2">`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtVersion, null, null, _parent));
			_push(`<div class="hidden sm:block">`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtSearch, null, null, _parent));
			_push(`</div><!--[-->`);
			(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(duxt).links ?? [], (link) => {
				_push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, {
					key: link.to,
					"as-child": "",
					variant: "ghost",
					size: "icon",
					"aria-label": link.label
				}, {
					default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`<a${(0, server_renderer_exports.ssrRenderAttr)("href", link.to)} target="_blank" rel="noopener"${_scopeId}>`);
							if (link.icon) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
								name: link.icon,
								class: "size-4"
							}, null, _parent, _scopeId));
							else _push(`<!---->`);
							_push(`</a>`);
						} else return [(0, vue_exports.createVNode)("a", {
							href: link.to,
							target: "_blank",
							rel: "noopener"
						}, [link.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
							key: 0,
							name: link.icon,
							class: "size-4"
						}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true)], 8, ["href"])];
					}),
					_: 2
				}, _parent));
			});
			_push(`<!--]-->`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_DuxtLocale, null, null, _parent));
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, {
				variant: "ghost",
				size: "icon",
				"aria-label": _ctx.$t("duxt.theme.toggle"),
				onClick: toggleTheme
			}, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
						name: (0, vue_exports.unref)(colorMode).value === "dark" ? "lucide:sun" : "lucide:moon",
						class: "size-4"
					}, null, _parent, _scopeId));
					else return [(0, vue_exports.createVNode)(_component_Icon, {
						name: (0, vue_exports.unref)(colorMode).value === "dark" ? "lucide:sun" : "lucide:moon",
						class: "size-4"
					}, null, 8, ["name"])];
				}),
				_: 1
			}, _parent));
			_push(`</div></div></header>`);
		};
	}
});
//#endregion
//#region ../app/components/DuxtHeader.vue
var _sfc_setup$2 = DuxtHeader_vue_vue_type_script_setup_true_lang_default.setup;
DuxtHeader_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/DuxtHeader.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var DuxtHeader_default = Object.assign(DuxtHeader_vue_vue_type_script_setup_true_lang_default, { __name: "DuxtHeader" });
//#endregion
//#region ../app/components/DuxtFooter.vue?vue&type=script&setup=true&lang.ts
var DuxtFooter_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "DuxtFooter",
	__ssrInlineRender: true,
	setup(__props) {
		const duxt = useDuxtConfig();
		const localeLink = useDuxtLink();
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_Icon = components_default;
			const _component_Button = Button_default;
			_push(`<footer${(0, server_renderer_exports.ssrRenderAttrs)((0, vue_exports.mergeProps)({ class: "mt-16 border-t" }, _attrs))}><div class="mx-auto flex max-w-[90rem] flex-col gap-3 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8"><div class="flex flex-wrap items-center gap-x-4 gap-y-1">`);
			_push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
				to: (0, vue_exports.unref)(localeLink)("/"),
				class: "inline-flex items-center gap-2 font-medium text-foreground"
			}, {
				default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
							name: "lucide:book-open-text",
							class: "size-4 text-primary"
						}, null, _parent, _scopeId));
						_push(` ${(0, server_renderer_exports.ssrInterpolate)((0, vue_exports.unref)(duxt).title)}`);
					} else return [(0, vue_exports.createVNode)(_component_Icon, {
						name: "lucide:book-open-text",
						class: "size-4 text-primary"
					}), (0, vue_exports.createTextVNode)(" " + (0, vue_exports.toDisplayString)((0, vue_exports.unref)(duxt).title), 1)];
				}),
				_: 1
			}, _parent));
			if ((0, vue_exports.unref)(duxt).footer?.copyright) _push(`<span>${(0, server_renderer_exports.ssrInterpolate)((0, vue_exports.unref)(duxt).footer.copyright)}</span>`);
			else _push(`<!---->`);
			_push(`</div><div class="flex flex-wrap items-center gap-x-4 gap-y-1"><!--[-->`);
			(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(duxt).footer?.legal ?? [], (link) => {
				_push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
					key: link.to,
					to: (0, vue_exports.unref)(localeLink)(link.to),
					target: link.external ? "_blank" : void 0,
					rel: link.external ? "noopener" : void 0,
					class: "transition-colors hover:text-foreground"
				}, {
					default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
						if (_push) _push(`${(0, server_renderer_exports.ssrInterpolate)(link.label)}`);
						else return [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(link.label), 1)];
					}),
					_: 2
				}, _parent));
			});
			_push(`<!--]-->`);
			if ((0, vue_exports.unref)(duxt).links?.length) {
				_push(`<div class="-mr-2 flex items-center gap-1"><!--[-->`);
				(0, server_renderer_exports.ssrRenderList)((0, vue_exports.unref)(duxt).links, (link) => {
					_push((0, server_renderer_exports.ssrRenderComponent)(_component_Button, {
						key: link.to,
						"as-child": "",
						variant: "ghost",
						size: "icon",
						class: "size-8 text-muted-foreground"
					}, {
						default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
							if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_NuxtLink, {
								to: link.to,
								"aria-label": ("asText" in _ctx ? _ctx.asText : (0, vue_exports.unref)(asText))(link.label),
								title: ("asText" in _ctx ? _ctx.asText : (0, vue_exports.unref)(asText))(link.label),
								target: "_blank",
								rel: "noopener"
							}, {
								default: (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
									if (_push) {
										if (link.icon) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
											name: link.icon,
											class: "size-4"
										}, null, _parent, _scopeId));
										else _push(`<!---->`);
									} else return [link.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
										key: 0,
										name: link.icon,
										class: "size-4"
									}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true)];
								}),
								_: 2
							}, _parent, _scopeId));
							else return [(0, vue_exports.createVNode)(_component_NuxtLink, {
								to: link.to,
								"aria-label": ("asText" in _ctx ? _ctx.asText : (0, vue_exports.unref)(asText))(link.label),
								title: ("asText" in _ctx ? _ctx.asText : (0, vue_exports.unref)(asText))(link.label),
								target: "_blank",
								rel: "noopener"
							}, {
								default: (0, vue_exports.withCtx)(() => [link.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(_component_Icon, {
									key: 0,
									name: link.icon,
									class: "size-4"
								}, null, 8, ["name"])) : (0, vue_exports.createCommentVNode)("", true)]),
								_: 2
							}, 1032, [
								"to",
								"aria-label",
								"title"
							])];
						}),
						_: 2
					}, _parent));
				});
				_push(`<!--]--></div>`);
			} else _push(`<!---->`);
			_push(`</div></div></footer>`);
		};
	}
});
//#endregion
//#region ../app/components/DuxtFooter.vue
var _sfc_setup$1 = DuxtFooter_vue_vue_type_script_setup_true_lang_default.setup;
DuxtFooter_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/DuxtFooter.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var DuxtFooter_default = Object.assign(DuxtFooter_vue_vue_type_script_setup_true_lang_default, { __name: "DuxtFooter" });
//#endregion
//#region ../app/components/ui/sonner/Sonner.vue?vue&type=script&setup=true&lang.ts
var Sonner_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ (0, vue_exports.defineComponent)({
	__name: "Sonner",
	__ssrInlineRender: true,
	props: {
		id: {},
		invert: { type: Boolean },
		theme: {},
		position: { default: "bottom-right" },
		closeButtonPosition: {},
		hotkey: {},
		richColors: { type: Boolean },
		expand: { type: Boolean },
		duration: { default: 4e3 },
		gap: {},
		visibleToasts: {},
		closeButton: {
			type: Boolean,
			default: true
		},
		toastOptions: {},
		class: {},
		style: {},
		offset: {},
		mobileOffset: {},
		dir: {},
		swipeDirections: {},
		icons: {},
		containerAriaLabel: {}
	},
	setup(__props) {
		const colorMode = useColorMode();
		const forwarded = (0, vue_exports.createPropsRestProxy)(__props, [
			"theme",
			"closeButton",
			"duration",
			"position"
		]);
		const theme = (0, vue_exports.computed)(() => colorMode.value === "dark" ? "dark" : "light");
		return (_ctx, _push, _parent, _attrs) => {
			const _component_Icon = components_default;
			_push((0, server_renderer_exports.ssrRenderComponent)((0, vue_exports.unref)(Toaster_default), (0, vue_exports.mergeProps)({
				class: "toaster group",
				theme: (0, vue_exports.unref)(theme),
				"close-button": __props.closeButton,
				duration: __props.duration,
				position: __props.position
			}, forwarded, { "toast-options": { classes: {
				toast: "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:gap-3",
				icon: "self-start mt-0.5",
				content: "grid gap-0.5",
				title: "font-medium leading-tight text-foreground",
				description: "text-sm leading-relaxed group-[.toast]:text-muted-foreground",
				closeButton: "group-[.toast]:border-border group-[.toast]:bg-popover group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground",
				actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
				cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
			} } }, _attrs), {
				"success-icon": (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
						name: "lucide:circle-check",
						class: "size-4 text-success"
					}, null, _parent, _scopeId));
					else return [(0, vue_exports.createVNode)(_component_Icon, {
						name: "lucide:circle-check",
						class: "size-4 text-success"
					})];
				}),
				"info-icon": (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
						name: "lucide:info",
						class: "size-4 text-info"
					}, null, _parent, _scopeId));
					else return [(0, vue_exports.createVNode)(_component_Icon, {
						name: "lucide:info",
						class: "size-4 text-info"
					})];
				}),
				"warning-icon": (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
						name: "lucide:triangle-alert",
						class: "size-4 text-warning"
					}, null, _parent, _scopeId));
					else return [(0, vue_exports.createVNode)(_component_Icon, {
						name: "lucide:triangle-alert",
						class: "size-4 text-warning"
					})];
				}),
				"error-icon": (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
						name: "lucide:circle-x",
						class: "size-4 text-destructive"
					}, null, _parent, _scopeId));
					else return [(0, vue_exports.createVNode)(_component_Icon, {
						name: "lucide:circle-x",
						class: "size-4 text-destructive"
					})];
				}),
				"loading-icon": (0, vue_exports.withCtx)((_, _push, _parent, _scopeId) => {
					if (_push) _push((0, server_renderer_exports.ssrRenderComponent)(_component_Icon, {
						name: "lucide:loader-circle",
						class: "size-4 animate-spin text-muted-foreground"
					}, null, _parent, _scopeId));
					else return [(0, vue_exports.createVNode)(_component_Icon, {
						name: "lucide:loader-circle",
						class: "size-4 animate-spin text-muted-foreground"
					})];
				}),
				_: 1
			}, _parent));
		};
	}
});
//#endregion
//#region ../app/components/ui/sonner/Sonner.vue
var _sfc_setup = Sonner_vue_vue_type_script_setup_true_lang_default.setup;
Sonner_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = (0, vue_exports.useSSRContext)();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../app/components/ui/sonner/Sonner.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var Sonner_default = Sonner_vue_vue_type_script_setup_true_lang_default;

export { DuxtHeader_default as D, Sonner_default as S, DuxtFooter_default as a, DuxtNavigation_default as b };
//# sourceMappingURL=sonner-duN5B4PW.mjs.map
