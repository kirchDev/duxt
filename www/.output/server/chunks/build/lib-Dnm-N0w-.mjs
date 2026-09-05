import { v as vue_exports } from '../virtual/entry.mjs';

//#region ../node_modules/.pnpm/vue-sonner@2.0.9_@nuxt+kit@4.5.2_magic-string@1.2.3_magicast@0.5.4_oxc-parser@0.141.0_r_fa7c0689fbeea115650df4f73ddb5cbd/node_modules/vue-sonner/lib/index.js
var toastsCounter = 1;
var Observer = class {
	subscribers;
	toasts;
	dismissedToasts;
	constructor() {
		this.subscribers = [];
		this.toasts = [];
		this.dismissedToasts = /* @__PURE__ */ new Set();
	}
	subscribe = (subscriber) => {
		this.subscribers.push(subscriber);
		return () => {
			const index = this.subscribers.indexOf(subscriber);
			this.subscribers.splice(index, 1);
		};
	};
	publish = (data) => {
		this.subscribers.forEach((subscriber) => subscriber(data));
	};
	addToast = (data) => {
		this.publish(data);
		this.toasts = [...this.toasts, data];
	};
	create = (data) => {
		const { message, ...rest } = data;
		const id = typeof data.id === "number" || data.id && data.id?.length > 0 ? data.id : toastsCounter++;
		const alreadyExists = this.toasts.find((toast$1) => {
			return toast$1.id === id;
		});
		const dismissible = data.dismissible === void 0 ? true : data.dismissible;
		if (this.dismissedToasts.has(id)) this.dismissedToasts.delete(id);
		if (alreadyExists) this.toasts = this.toasts.map((toast$1) => {
			if (toast$1.id === id) {
				this.publish({
					...toast$1,
					...data,
					id,
					title: message
				});
				return {
					...toast$1,
					...data,
					id,
					dismissible,
					title: message
				};
			}
			return toast$1;
		});
		else this.addToast({
			title: message,
			...rest,
			dismissible,
			id
		});
		return id;
	};
	dismiss = (id) => {
		if (id) {
			this.dismissedToasts.add(id);
			requestAnimationFrame(() => this.subscribers.forEach((subscriber) => subscriber({
				id,
				dismiss: true
			})));
		} else this.toasts.forEach((toast$1) => {
			this.subscribers.forEach((subscriber) => subscriber({
				id: toast$1.id,
				dismiss: true
			}));
		});
		return id;
	};
	message = (message, data) => {
		return this.create({
			...data,
			message,
			type: "default"
		});
	};
	error = (message, data) => {
		return this.create({
			...data,
			type: "error",
			message
		});
	};
	success = (message, data) => {
		return this.create({
			...data,
			type: "success",
			message
		});
	};
	info = (message, data) => {
		return this.create({
			...data,
			type: "info",
			message
		});
	};
	warning = (message, data) => {
		return this.create({
			...data,
			type: "warning",
			message
		});
	};
	loading = (message, data) => {
		return this.create({
			...data,
			type: "loading",
			message
		});
	};
	promise = (promise, data) => {
		if (!data) return;
		let id;
		if (data.loading !== void 0) id = this.create({
			...data,
			promise,
			type: "loading",
			message: data.loading,
			description: typeof data.description !== "function" ? data.description : void 0
		});
		const p = Promise.resolve(promise instanceof Function ? promise() : promise);
		let shouldDismiss = id !== void 0;
		let result;
		const originalPromise = p.then(async (response) => {
			result = ["resolve", response];
			if ((0, vue_exports.isVNode)(response)) {
				shouldDismiss = false;
				this.create({
					id,
					type: "default",
					message: response
				});
			} else if (isHttpResponse(response) && !response.ok) {
				shouldDismiss = false;
				const promiseData = typeof data.error === "function" ? await data.error(`HTTP error! status: ${response.status}`) : data.error;
				const description = typeof data.description === "function" ? await data.description(`HTTP error! status: ${response.status}`) : data.description;
				const toastSettings = typeof promiseData === "object" && !(0, vue_exports.isVNode)(promiseData) ? promiseData : {
					message: promiseData || "",
					id: id || ""
				};
				this.create({
					id,
					type: "error",
					description,
					...toastSettings
				});
			} else if (response instanceof Error) {
				shouldDismiss = false;
				const promiseData = typeof data.error === "function" ? await data.error(response) : data.error;
				const description = typeof data.description === "function" ? await data.description(response) : data.description;
				const toastSettings = typeof promiseData === "object" && !(0, vue_exports.isVNode)(promiseData) ? promiseData : {
					message: promiseData || "",
					id: id || ""
				};
				this.create({
					id,
					type: "error",
					description,
					...toastSettings
				});
			} else if (data.success !== void 0) {
				shouldDismiss = false;
				const promiseData = typeof data.success === "function" ? await data.success(response) : data.success;
				const description = typeof data.description === "function" ? await data.description(response) : data.description;
				const toastSettings = typeof promiseData === "object" && !(0, vue_exports.isVNode)(promiseData) ? promiseData : {
					message: promiseData || "",
					id: id || ""
				};
				this.create({
					id,
					type: "success",
					description,
					...toastSettings
				});
			}
		}).catch(async (error) => {
			result = ["reject", error];
			if (data.error !== void 0) {
				shouldDismiss = false;
				const promiseData = typeof data.error === "function" ? await data.error(error) : data.error;
				const description = typeof data.description === "function" ? await data.description(error) : data.description;
				const toastSettings = typeof promiseData === "object" && !(0, vue_exports.isVNode)(promiseData) ? promiseData : {
					message: promiseData || "",
					id: id || ""
				};
				this.create({
					id,
					type: "error",
					description,
					...toastSettings
				});
			}
		}).finally(() => {
			if (shouldDismiss) {
				this.dismiss(id);
				id = void 0;
			}
			data.finally?.();
		});
		const unwrap = () => new Promise((resolve, reject) => originalPromise.then(() => result[0] === "reject" ? reject(result[1]) : resolve(result[1])).catch(reject));
		if (typeof id !== "string" && typeof id !== "number") return { unwrap };
		else return Object.assign(id, { unwrap });
	};
	custom = (component, data) => {
		const id = data?.id || toastsCounter++;
		const alreadyExists = this.toasts.find((toast$1) => {
			return toast$1.id === id;
		});
		const dismissible = data?.dismissible === void 0 ? true : data.dismissible;
		if (this.dismissedToasts.has(id)) this.dismissedToasts.delete(id);
		if (alreadyExists) this.toasts = this.toasts.map((toast$1) => {
			if (toast$1.id === id) {
				this.publish({
					...toast$1,
					component,
					dismissible,
					id,
					...data
				});
				return {
					...toast$1,
					component,
					dismissible,
					id,
					...data
				};
			}
			return toast$1;
		});
		else this.addToast({
			component,
			dismissible,
			id,
			...data
		});
		return id;
	};
	getActiveToasts = () => {
		return this.toasts.filter((toast$1) => !this.dismissedToasts.has(toast$1.id));
	};
};
var ToastState = new Observer();
function toastFunction(message, data) {
	const id = data?.id || toastsCounter++;
	ToastState.create({
		message,
		id,
		type: "default",
		...data
	});
	return id;
}
var isHttpResponse = (data) => {
	return data && typeof data === "object" && "ok" in data && typeof data.ok === "boolean" && "status" in data && typeof data.status === "number";
};
var basicToast = toastFunction;
var getHistory = () => ToastState.toasts;
var getToasts = () => ToastState.getActiveToasts();
var toast = Object.assign(basicToast, {
	success: ToastState.success,
	info: ToastState.info,
	warning: ToastState.warning,
	error: ToastState.error,
	custom: ToastState.custom,
	message: ToastState.message,
	promise: ToastState.promise,
	dismiss: ToastState.dismiss,
	loading: ToastState.loading
}, {
	getHistory,
	getToasts
});
function isAction(action) {
	return action.label !== void 0;
}
var VISIBLE_TOASTS_AMOUNT = 3;
var VIEWPORT_OFFSET = "24px";
var MOBILE_VIEWPORT_OFFSET = "16px";
var TOAST_LIFETIME = 4e3;
var TOAST_WIDTH = 356;
var GAP = 14;
var SWIPE_THRESHOLD = 45;
var TIME_BEFORE_UNMOUNT = 200;
function useIsDocumentHidden() {
	const isDocumentHidden = (0, vue_exports.ref)(false);
	(0, vue_exports.watchEffect)(() => {
		const callback = () => {
			isDocumentHidden.value = (void 0).hidden;
		};
		(void 0).addEventListener("visibilitychange", callback);
		return () => (void 0).removeEventListener("visibilitychange", callback);
	});
	return { isDocumentHidden };
}
function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}
function getDefaultSwipeDirections(position) {
	const [y, x] = position.split("-");
	const directions = [];
	if (y) directions.push(y);
	if (x) directions.push(x);
	return directions;
}
function assignOffset(defaultOffset, mobileOffset) {
	const styles = {};
	[defaultOffset, mobileOffset].forEach((offset, index) => {
		const isMobile = index === 1;
		const prefix = isMobile ? "--mobile-offset" : "--offset";
		const defaultValue = isMobile ? MOBILE_VIEWPORT_OFFSET : VIEWPORT_OFFSET;
		function assignAll(offset$1) {
			[
				"top",
				"right",
				"bottom",
				"left"
			].forEach((key) => {
				styles[`${prefix}-${key}`] = typeof offset$1 === "number" ? `${offset$1}px` : offset$1;
			});
		}
		if (typeof offset === "number" || typeof offset === "string") assignAll(offset);
		else if (typeof offset === "object") [
			"top",
			"right",
			"bottom",
			"left"
		].forEach((key) => {
			if (offset[key] === void 0) styles[`${prefix}-${key}`] = defaultValue;
			else styles[`${prefix}-${key}`] = typeof offset[key] === "number" ? `${offset[key]}px` : offset[key];
		});
		else assignAll(defaultValue);
	});
	return styles;
}
var _hoisted_1$7 = [
	"data-rich-colors",
	"data-styled",
	"data-mounted",
	"data-promise",
	"data-swiped",
	"data-removed",
	"data-visible",
	"data-y-position",
	"data-x-position",
	"data-index",
	"data-front",
	"data-swiping",
	"data-dismissible",
	"data-type",
	"data-invert",
	"data-swipe-out",
	"data-swipe-direction",
	"data-expanded",
	"data-testid"
];
var _hoisted_2$2 = [
	"aria-label",
	"data-disabled",
	"data-close-button-position"
];
var Toast_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "Toast",
	props: {
		toast: {},
		toasts: {},
		index: {},
		swipeDirections: {},
		expanded: { type: Boolean },
		invert: { type: Boolean },
		heights: {},
		gap: {},
		position: {},
		closeButtonPosition: {},
		visibleToasts: {},
		expandByDefault: { type: Boolean },
		closeButton: { type: Boolean },
		interacting: { type: Boolean },
		style: {},
		cancelButtonStyle: {},
		actionButtonStyle: {},
		duration: {},
		class: {},
		unstyled: { type: Boolean },
		descriptionClass: {},
		loadingIcon: {},
		classes: {},
		icons: {},
		closeButtonAriaLabel: {},
		defaultRichColors: { type: Boolean }
	},
	emits: [
		"update:heights",
		"update:height",
		"removeToast"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const swipeDirection = (0, vue_exports.ref)(null);
		const swipeOutDirection = (0, vue_exports.ref)(null);
		const mounted = (0, vue_exports.ref)(false);
		const removed = (0, vue_exports.ref)(false);
		const swiping = (0, vue_exports.ref)(false);
		const swipeOut = (0, vue_exports.ref)(false);
		const swiped = (0, vue_exports.ref)(false);
		const offsetBeforeRemove = (0, vue_exports.ref)(0);
		const initialHeight = (0, vue_exports.ref)(0);
		const remainingTime = (0, vue_exports.ref)(props.toast.duration || props.duration || TOAST_LIFETIME);
		const dragStartTime = (0, vue_exports.ref)(null);
		const toastRef = (0, vue_exports.ref)(null);
		const isFront = (0, vue_exports.computed)(() => props.index === 0);
		const isVisible = (0, vue_exports.computed)(() => props.index + 1 <= props.visibleToasts);
		const toastType = (0, vue_exports.computed)(() => props.toast.type);
		const dismissible = (0, vue_exports.computed)(() => props.toast.dismissible !== false);
		const toastClass = (0, vue_exports.computed)(() => props.toast.class || "");
		const toastDescriptionClass = (0, vue_exports.computed)(() => props.descriptionClass || "");
		const heightIndex = (0, vue_exports.computed)(() => {
			const currentPosition = props.toast.position || props.position;
			const index = props.heights.filter((h) => h.position === currentPosition).findIndex((height) => height.toastId === props.toast.id);
			return index >= 0 ? index : 0;
		});
		const toastsHeightBefore = (0, vue_exports.computed)(() => {
			const currentPosition = props.toast.position || props.position;
			return props.heights.filter((h) => h.position === currentPosition).reduce((prev, curr, reducerIndex) => {
				if (reducerIndex >= heightIndex.value) return prev;
				return prev + curr.height;
			}, 0);
		});
		const offset = (0, vue_exports.computed)(() => heightIndex.value * props.gap + toastsHeightBefore.value || 0);
		const closeButton = (0, vue_exports.computed)(() => props.toast.closeButton ?? props.closeButton);
		(0, vue_exports.computed)(() => props.toast.duration || props.duration || TOAST_LIFETIME);
		const closeTimerStartTimeRef = (0, vue_exports.ref)(0);
		const lastCloseTimerStartTimeRef = (0, vue_exports.ref)(0);
		const pointerStartRef = (0, vue_exports.ref)(null);
		const coords = (0, vue_exports.computed)(() => props.position.split("-"));
		const y = (0, vue_exports.computed)(() => coords.value[0]);
		const x = (0, vue_exports.computed)(() => coords.value[1]);
		const isStringOfTitle = (0, vue_exports.computed)(() => typeof props.toast.title !== "string");
		const isStringOfDescription = (0, vue_exports.computed)(() => typeof props.toast.description !== "string");
		const { isDocumentHidden } = useIsDocumentHidden();
		const disabled = (0, vue_exports.computed)(() => toastType.value && toastType.value === "loading");
		(0, vue_exports.watchEffect)(async () => {
			if (!mounted.value || !toastRef.value) return;
			await (0, vue_exports.nextTick)();
			const toastNode = toastRef.value;
			const originalHeight = toastNode.style.height;
			toastNode.style.height = "auto";
			const newHeight = toastNode.getBoundingClientRect().height;
			toastNode.style.height = originalHeight;
			initialHeight.value = newHeight;
			emit("update:height", {
				toastId: props.toast.id,
				height: newHeight,
				position: props.toast.position || props.position
			});
		});
		function deleteToast() {
			removed.value = true;
			offsetBeforeRemove.value = offset.value;
			setTimeout(() => {
				emit("removeToast", props.toast);
			}, TIME_BEFORE_UNMOUNT);
		}
		function handleCloseToast() {
			if (disabled.value || !dismissible.value) return {};
			deleteToast();
			props.toast.onDismiss?.(props.toast);
		}
		function onPointerDown(event) {
			if (event.button === 2) return;
			if (disabled.value || !dismissible.value) return;
			dragStartTime.value = /* @__PURE__ */ new Date();
			offsetBeforeRemove.value = offset.value;
			event.target.setPointerCapture(event.pointerId);
			if (event.target.tagName === "BUTTON") return;
			swiping.value = true;
			pointerStartRef.value = {
				x: event.clientX,
				y: event.clientY
			};
		}
		function onPointerUp() {
			if (swipeOut.value || !dismissible.value) return;
			pointerStartRef.value = null;
			const swipeAmountX = Number(toastRef.value?.style.getPropertyValue("--swipe-amount-x").replace("px", "") || 0);
			const swipeAmountY = Number(toastRef.value?.style.getPropertyValue("--swipe-amount-y").replace("px", "") || 0);
			const timeTaken = (/* @__PURE__ */ new Date()).getTime() - (dragStartTime.value?.getTime() || 0);
			const swipeAmount = swipeDirection.value === "x" ? swipeAmountX : swipeAmountY;
			const velocity = Math.abs(swipeAmount) / timeTaken;
			if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > .11) {
				offsetBeforeRemove.value = offset.value;
				props.toast.onDismiss?.(props.toast);
				if (swipeDirection.value === "x") swipeOutDirection.value = swipeAmountX > 0 ? "right" : "left";
				else swipeOutDirection.value = swipeAmountY > 0 ? "down" : "up";
				deleteToast();
				swipeOut.value = true;
				return;
			} else {
				toastRef.value?.style.setProperty("--swipe-amount-x", `0px`);
				toastRef.value?.style.setProperty("--swipe-amount-y", `0px`);
			}
			swiped.value = false;
			swiping.value = false;
			swipeDirection.value = null;
		}
		function onPointerMove(event) {
			if (!pointerStartRef.value || !dismissible.value) return;
			const yDelta = event.clientY - pointerStartRef.value.y;
			const xDelta = event.clientX - pointerStartRef.value.x;
			const swipeDirections = props.swipeDirections ?? getDefaultSwipeDirections(props.position);
			if (!swipeDirection.value && (Math.abs(xDelta) > 1 || Math.abs(yDelta) > 1)) swipeDirection.value = Math.abs(xDelta) > Math.abs(yDelta) ? "x" : "y";
			let swipeAmount = {
				x: 0,
				y: 0
			};
			const getDampening = (delta) => {
				return 1 / (1.5 + Math.abs(delta) / 20);
			};
			if (swipeDirection.value === "y") {
				if (swipeDirections.includes("top") || swipeDirections.includes("bottom")) if (swipeDirections.includes("top") && yDelta < 0 || swipeDirections.includes("bottom") && yDelta > 0) swipeAmount.y = yDelta;
				else {
					const dampenedDelta = yDelta * getDampening(yDelta);
					swipeAmount.y = Math.abs(dampenedDelta) < Math.abs(yDelta) ? dampenedDelta : yDelta;
				}
			} else if (swipeDirection.value === "x") {
				if (swipeDirections.includes("left") || swipeDirections.includes("right")) if (swipeDirections.includes("left") && xDelta < 0 || swipeDirections.includes("right") && xDelta > 0) swipeAmount.x = xDelta;
				else {
					const dampenedDelta = xDelta * getDampening(xDelta);
					swipeAmount.x = Math.abs(dampenedDelta) < Math.abs(xDelta) ? dampenedDelta : xDelta;
				}
			}
			if (Math.abs(swipeAmount.x) > 0 || Math.abs(swipeAmount.y) > 0) swiped.value = true;
			toastRef.value?.style.setProperty("--swipe-amount-x", `${swipeAmount.x}px`);
			toastRef.value?.style.setProperty("--swipe-amount-y", `${swipeAmount.y}px`);
		}
		(0, vue_exports.watchEffect)((onInvalidate) => {
			if (props.toast.promise && toastType.value === "loading" || props.toast.duration === Infinity || props.toast.type === "loading") return;
			let timeoutId;
			const pauseTimer = () => {
				if (lastCloseTimerStartTimeRef.value < closeTimerStartTimeRef.value) {
					const elapsedTime = (/* @__PURE__ */ new Date()).getTime() - closeTimerStartTimeRef.value;
					remainingTime.value = remainingTime.value - elapsedTime;
				}
				lastCloseTimerStartTimeRef.value = (/* @__PURE__ */ new Date()).getTime();
			};
			const startTimer = () => {
				if (remainingTime.value === Infinity) return;
				closeTimerStartTimeRef.value = (/* @__PURE__ */ new Date()).getTime();
				timeoutId = setTimeout(() => {
					props.toast.onAutoClose?.(props.toast);
					deleteToast();
				}, remainingTime.value);
			};
			if (props.expanded || props.interacting || isDocumentHidden.value) pauseTimer();
			else startTimer();
			onInvalidate(() => {
				clearTimeout(timeoutId);
			});
		});
		(0, vue_exports.watch)(() => props.toast.delete, (value) => {
			if (value !== void 0 && value) {
				deleteToast();
				props.toast.onDismiss?.(props.toast);
			}
		}, { deep: true });
		function handleDragEnd() {
			swiping.value = false;
			swipeDirection.value = null;
			pointerStartRef.value = null;
		}
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("li", {
				tabindex: "0",
				ref_key: "toastRef",
				ref: toastRef,
				class: (0, vue_exports.normalizeClass)((0, vue_exports.unref)(cn)(props.class, toastClass.value, _ctx.classes?.toast, _ctx.toast.classes?.toast, _ctx.classes?.[toastType.value], _ctx.toast?.classes?.[toastType.value])),
				"data-sonner-toast": "",
				"data-rich-colors": _ctx.toast.richColors ?? _ctx.defaultRichColors,
				"data-styled": !Boolean(_ctx.toast.component || _ctx.toast?.unstyled || _ctx.unstyled),
				"data-mounted": mounted.value,
				"data-promise": Boolean(_ctx.toast.promise),
				"data-swiped": swiped.value,
				"data-removed": removed.value,
				"data-visible": isVisible.value,
				"data-y-position": y.value,
				"data-x-position": x.value,
				"data-index": _ctx.index,
				"data-front": isFront.value,
				"data-swiping": swiping.value,
				"data-dismissible": dismissible.value,
				"data-type": toastType.value,
				"data-invert": _ctx.toast.invert || _ctx.invert,
				"data-swipe-out": swipeOut.value,
				"data-swipe-direction": swipeOutDirection.value,
				"data-expanded": Boolean(_ctx.expanded || _ctx.expandByDefault && mounted.value),
				"data-testid": _ctx.toast.testId,
				style: (0, vue_exports.normalizeStyle)({
					"--index": _ctx.index,
					"--toasts-before": _ctx.index,
					"--z-index": _ctx.toasts.length - _ctx.index,
					"--offset": `${removed.value ? offsetBeforeRemove.value : offset.value}px`,
					"--initial-height": _ctx.expandByDefault ? "auto" : `${initialHeight.value}px`,
					..._ctx.style,
					...props.toast.style
				}),
				onDragend: handleDragEnd,
				onPointerdown: onPointerDown,
				onPointerup: onPointerUp,
				onPointermove: onPointerMove
			}, [closeButton.value && !_ctx.toast.component && toastType.value !== "loading" ? ((0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("button", {
				key: 0,
				"aria-label": _ctx.closeButtonAriaLabel || "Close toast",
				"data-disabled": disabled.value,
				"data-close-button": "true",
				"data-close-button-position": _ctx.closeButtonPosition,
				class: (0, vue_exports.normalizeClass)((0, vue_exports.unref)(cn)(_ctx.classes?.closeButton, _ctx.toast?.classes?.closeButton)),
				onClick: handleCloseToast
			}, [_ctx.icons?.close ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.resolveDynamicComponent)(_ctx.icons?.close), { key: 0 })) : (0, vue_exports.renderSlot)(_ctx.$slots, "close-icon", { key: 1 })], 10, _hoisted_2$2)) : (0, vue_exports.createCommentVNode)("v-if", true), _ctx.toast.component ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.resolveDynamicComponent)(_ctx.toast.component), (0, vue_exports.mergeProps)({ key: 1 }, _ctx.toast.componentProps, {
				onCloseToast: handleCloseToast,
				isPaused: _ctx.$props.expanded || _ctx.$props.interacting || (0, vue_exports.unref)(isDocumentHidden)
			}), null, 16, ["isPaused"])) : ((0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)(vue_exports.Fragment, { key: 2 }, [
				toastType.value !== "default" || _ctx.toast.icon || _ctx.toast.promise ? ((0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("div", {
					key: 0,
					"data-icon": "",
					class: (0, vue_exports.normalizeClass)((0, vue_exports.unref)(cn)(_ctx.classes?.icon, _ctx.toast?.classes?.icon))
				}, [_ctx.toast.icon ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.resolveDynamicComponent)(_ctx.toast.icon), { key: 0 })) : ((0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)(vue_exports.Fragment, { key: 1 }, [toastType.value === "loading" ? (0, vue_exports.renderSlot)(_ctx.$slots, "loading-icon", { key: 0 }) : toastType.value === "success" ? (0, vue_exports.renderSlot)(_ctx.$slots, "success-icon", { key: 1 }) : toastType.value === "error" ? (0, vue_exports.renderSlot)(_ctx.$slots, "error-icon", { key: 2 }) : toastType.value === "warning" ? (0, vue_exports.renderSlot)(_ctx.$slots, "warning-icon", { key: 3 }) : toastType.value === "info" ? (0, vue_exports.renderSlot)(_ctx.$slots, "info-icon", { key: 4 }) : (0, vue_exports.createCommentVNode)("v-if", true)], 64))], 2)) : (0, vue_exports.createCommentVNode)("v-if", true),
				(0, vue_exports.createElementVNode)("div", {
					"data-content": "",
					class: (0, vue_exports.normalizeClass)((0, vue_exports.unref)(cn)(_ctx.classes?.content, _ctx.toast?.classes?.content))
				}, [(0, vue_exports.createElementVNode)("div", {
					"data-title": "",
					class: (0, vue_exports.normalizeClass)((0, vue_exports.unref)(cn)(_ctx.classes?.title, _ctx.toast.classes?.title))
				}, [isStringOfTitle.value ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.resolveDynamicComponent)(_ctx.toast.title), (0, vue_exports.normalizeProps)((0, vue_exports.mergeProps)({ key: 0 }, _ctx.toast.componentProps)), null, 16)) : ((0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)(vue_exports.Fragment, { key: 1 }, [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(_ctx.toast.title), 1)], 64))], 2), _ctx.toast.description ? ((0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("div", {
					key: 0,
					"data-description": "",
					class: (0, vue_exports.normalizeClass)((0, vue_exports.unref)(cn)(_ctx.descriptionClass, toastDescriptionClass.value, _ctx.classes?.description, _ctx.toast.classes?.description))
				}, [isStringOfDescription.value ? ((0, vue_exports.openBlock)(), (0, vue_exports.createBlock)((0, vue_exports.resolveDynamicComponent)(_ctx.toast.description), (0, vue_exports.normalizeProps)((0, vue_exports.mergeProps)({ key: 0 }, _ctx.toast.componentProps)), null, 16)) : ((0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)(vue_exports.Fragment, { key: 1 }, [(0, vue_exports.createTextVNode)((0, vue_exports.toDisplayString)(_ctx.toast.description), 1)], 64))], 2)) : (0, vue_exports.createCommentVNode)("v-if", true)], 2),
				_ctx.toast.cancel ? ((0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("button", {
					key: 1,
					style: (0, vue_exports.normalizeStyle)(_ctx.toast.cancelButtonStyle || _ctx.cancelButtonStyle),
					class: (0, vue_exports.normalizeClass)((0, vue_exports.unref)(cn)(_ctx.classes?.cancelButton, _ctx.toast.classes?.cancelButton)),
					"data-button": "",
					"data-cancel": "",
					onClick: _cache[0] || (_cache[0] = (event) => {
						if (!(0, vue_exports.unref)(isAction)(_ctx.toast.cancel)) return;
						if (!dismissible.value) return;
						_ctx.toast.cancel.onClick?.(event);
						deleteToast();
					})
				}, (0, vue_exports.toDisplayString)((0, vue_exports.unref)(isAction)(_ctx.toast.cancel) ? _ctx.toast.cancel?.label : _ctx.toast.cancel), 7)) : (0, vue_exports.createCommentVNode)("v-if", true),
				_ctx.toast.action ? ((0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("button", {
					key: 2,
					style: (0, vue_exports.normalizeStyle)(_ctx.toast.actionButtonStyle || _ctx.actionButtonStyle),
					class: (0, vue_exports.normalizeClass)((0, vue_exports.unref)(cn)(_ctx.classes?.actionButton, _ctx.toast.classes?.actionButton)),
					"data-button": "",
					"data-action": "",
					onClick: _cache[1] || (_cache[1] = (event) => {
						if (!(0, vue_exports.unref)(isAction)(_ctx.toast.action)) return;
						_ctx.toast.action.onClick?.(event);
						if (event.defaultPrevented) return;
						deleteToast();
					})
				}, (0, vue_exports.toDisplayString)((0, vue_exports.unref)(isAction)(_ctx.toast.action) ? _ctx.toast.action?.label : _ctx.toast.action), 7)) : (0, vue_exports.createCommentVNode)("v-if", true)
			], 64))], 46, _hoisted_1$7);
		};
	}
});
var export_helper_default = (sfc, props) => {
	const target = sfc.__vccOpts || sfc;
	for (const [key, val] of props) target[key] = val;
	return target;
};
var _sfc_main$4 = {};
var _hoisted_1$6 = {
	xmlns: "http://www.w3.org/2000/svg",
	width: "12",
	height: "12",
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	"stoke-width": "1.5",
	"stroke-linecap": "round",
	"stroke-linejoin": "round"
};
function _sfc_render$4(_ctx, _cache) {
	return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("svg", _hoisted_1$6, _cache[0] || (_cache[0] = [(0, vue_exports.createElementVNode)("line", {
		x1: "18",
		y1: "6",
		x2: "6",
		y2: "18"
	}, null, -1), (0, vue_exports.createElementVNode)("line", {
		x1: "6",
		y1: "6",
		x2: "18",
		y2: "18"
	}, null, -1)]));
}
var CloseIcon_default = /* @__PURE__ */ export_helper_default(_sfc_main$4, [["render", _sfc_render$4]]);
var _hoisted_1$5 = ["data-visible"];
var _hoisted_2$1 = { class: "sonner-spinner" };
var Loader_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	__name: "Loader",
	props: { visible: { type: Boolean } },
	setup(__props) {
		const bars = Array(12).fill(0);
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("div", {
				class: "sonner-loading-wrapper",
				"data-visible": _ctx.visible
			}, [(0, vue_exports.createElementVNode)("div", _hoisted_2$1, [((0, vue_exports.openBlock)(true), (0, vue_exports.createElementBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)((0, vue_exports.unref)(bars), (bar) => {
				return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("div", {
					key: `spinner-bar-${bar}`,
					class: "sonner-loading-bar"
				});
			}), 128))])], 8, _hoisted_1$5);
		};
	}
});
var _sfc_main$3 = {};
var _hoisted_1$4 = {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 20 20",
	fill: "currentColor",
	height: "20",
	width: "20"
};
function _sfc_render$3(_ctx, _cache) {
	return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("svg", _hoisted_1$4, _cache[0] || (_cache[0] = [(0, vue_exports.createElementVNode)("path", {
		"fill-rule": "evenodd",
		d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
		"clip-rule": "evenodd"
	}, null, -1)]));
}
var SuccessIcon_default = /* @__PURE__ */ export_helper_default(_sfc_main$3, [["render", _sfc_render$3]]);
var _sfc_main$2 = {};
var _hoisted_1$3 = {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 20 20",
	fill: "currentColor",
	height: "20",
	width: "20"
};
function _sfc_render$2(_ctx, _cache) {
	return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("svg", _hoisted_1$3, _cache[0] || (_cache[0] = [(0, vue_exports.createElementVNode)("path", {
		"fill-rule": "evenodd",
		d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
		"clip-rule": "evenodd"
	}, null, -1)]));
}
var InfoIcon_default = /* @__PURE__ */ export_helper_default(_sfc_main$2, [["render", _sfc_render$2]]);
var _sfc_main$1 = {};
var _hoisted_1$2 = {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 24 24",
	fill: "currentColor",
	height: "20",
	width: "20"
};
function _sfc_render$1(_ctx, _cache) {
	return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("svg", _hoisted_1$2, _cache[0] || (_cache[0] = [(0, vue_exports.createElementVNode)("path", {
		"fill-rule": "evenodd",
		d: "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z",
		"clip-rule": "evenodd"
	}, null, -1)]));
}
var WarningIcon_default = /* @__PURE__ */ export_helper_default(_sfc_main$1, [["render", _sfc_render$1]]);
var _sfc_main = {};
var _hoisted_1$1 = {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 20 20",
	fill: "currentColor",
	height: "20",
	width: "20"
};
function _sfc_render(_ctx, _cache) {
	return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("svg", _hoisted_1$1, _cache[0] || (_cache[0] = [(0, vue_exports.createElementVNode)("path", {
		"fill-rule": "evenodd",
		d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z",
		"clip-rule": "evenodd"
	}, null, -1)]));
}
var ErrorIcon_default = /* @__PURE__ */ export_helper_default(_sfc_main, [["render", _sfc_render]]);
var _hoisted_1 = ["aria-label"];
var _hoisted_2 = [
	"data-sonner-theme",
	"dir",
	"data-theme",
	"data-rich-colors",
	"data-y-position",
	"data-x-position"
];
function getDocumentDirection() {
	return "ltr";
}
var Toaster_default = /* @__PURE__ */ (0, vue_exports.defineComponent)({
	name: "Toaster",
	inheritAttrs: false,
	__name: "Toaster",
	props: {
		id: {},
		invert: {
			type: Boolean,
			default: false
		},
		theme: { default: "light" },
		position: { default: "bottom-right" },
		closeButtonPosition: { default: "top-left" },
		hotkey: { default: () => ["altKey", "KeyT"] },
		richColors: {
			type: Boolean,
			default: false
		},
		expand: {
			type: Boolean,
			default: false
		},
		duration: {},
		gap: { default: GAP },
		visibleToasts: { default: VISIBLE_TOASTS_AMOUNT },
		closeButton: {
			type: Boolean,
			default: false
		},
		toastOptions: { default: () => ({}) },
		class: { default: "" },
		style: {},
		offset: { default: VIEWPORT_OFFSET },
		mobileOffset: { default: MOBILE_VIEWPORT_OFFSET },
		dir: { default: "auto" },
		swipeDirections: {},
		icons: {},
		containerAriaLabel: { default: "Notifications" }
	},
	setup(__props) {
		const props = __props;
		const attrs = (0, vue_exports.useAttrs)();
		const toasts = (0, vue_exports.ref)([]);
		const filteredToastsById = (0, vue_exports.computed)(() => {
			if (props.id) return toasts.value.filter((toast$1) => toast$1.toasterId === props.id);
			return toasts.value.filter((toast$1) => !toast$1.toasterId);
		});
		function filteredToasts(pos, index) {
			return filteredToastsById.value.filter((toast$1) => !toast$1.position && index === 0 || toast$1.position === pos);
		}
		const possiblePositions = (0, vue_exports.computed)(() => {
			const posList = filteredToastsById.value.filter((toast$1) => toast$1.position).map((toast$1) => toast$1.position);
			return posList.length > 0 ? Array.from(new Set([props.position].concat(posList))) : [props.position];
		});
		const toastsByPosition = (0, vue_exports.computed)(() => {
			const result = {};
			possiblePositions.value.forEach((pos) => {
				result[pos] = toasts.value.filter((t) => t.position === pos);
			});
			return result;
		});
		const heights = (0, vue_exports.ref)([]);
		const expanded = (0, vue_exports.ref)({});
		const interacting = (0, vue_exports.ref)(false);
		(0, vue_exports.watchEffect)(() => {
			possiblePositions.value.forEach((pos) => {
				if (!(pos in expanded.value)) expanded.value[pos] = false;
			});
		});
		const actualTheme = (0, vue_exports.ref)(props.theme !== "system" ? props.theme : "light");
		const listRef = (0, vue_exports.ref)(null);
		const lastFocusedElementRef = (0, vue_exports.ref)(null);
		const isFocusWithinRef = (0, vue_exports.ref)(false);
		const hotkeyLabel = props.hotkey.join("+").replace(/Key/g, "").replace(/Digit/g, "");
		function removeToast(toastToRemove) {
			if (!toasts.value.find((toast$1) => toast$1.id === toastToRemove.id)?.delete) ToastState.dismiss(toastToRemove.id);
			toasts.value = toasts.value.filter(({ id }) => id !== toastToRemove.id);
			setTimeout(() => {
				if (!toasts.value.find((t) => t.id === toastToRemove.id)) heights.value = heights.value.filter((h) => h.toastId !== toastToRemove.id);
			}, 250);
		}
		function onBlur(event) {
			if (isFocusWithinRef.value && !event.currentTarget?.contains?.(event.relatedTarget)) {
				isFocusWithinRef.value = false;
				if (lastFocusedElementRef.value) {
					lastFocusedElementRef.value.focus({ preventScroll: true });
					lastFocusedElementRef.value = null;
				}
			}
		}
		function onFocus(event) {
			if (event.target instanceof HTMLElement && event.target.dataset.dismissible === "false") return;
			if (!isFocusWithinRef.value) {
				isFocusWithinRef.value = true;
				lastFocusedElementRef.value = event.relatedTarget;
			}
		}
		function onPointerDown(event) {
			if (event.target) {
				if (event.target instanceof HTMLElement && event.target.dataset.dismissible === "false") return;
			}
			interacting.value = true;
		}
		(0, vue_exports.watchEffect)((onInvalidate) => {
			onInvalidate(ToastState.subscribe((toast$1) => {
				if (toast$1.dismiss) {
					requestAnimationFrame(() => {
						toasts.value = toasts.value.map((t) => t.id === toast$1.id ? {
							...t,
							delete: true
						} : t);
					});
					return;
				}
				(0, vue_exports.nextTick)(() => {
					const indexOfExistingToast = toasts.value.findIndex((t) => t.id === toast$1.id);
					if (indexOfExistingToast !== -1) toasts.value = [
						...toasts.value.slice(0, indexOfExistingToast),
						{
							...toasts.value[indexOfExistingToast],
							...toast$1
						},
						...toasts.value.slice(indexOfExistingToast + 1)
					];
					else toasts.value = [toast$1, ...toasts.value];
				});
			}));
		});
		(0, vue_exports.watchEffect)((onInvalidate) => {});
		(0, vue_exports.watchEffect)(() => {
			if (listRef.value && lastFocusedElementRef.value) {
				lastFocusedElementRef.value.focus({ preventScroll: true });
				lastFocusedElementRef.value = null;
				isFocusWithinRef.value = false;
			}
		});
		(0, vue_exports.watchEffect)(() => {
			if (toasts.value.length <= 1) Object.keys(expanded.value).forEach((pos) => {
				expanded.value[pos] = false;
			});
		});
		(0, vue_exports.watchEffect)((onInvalidate) => {});
		function handleMouseEnter(event) {
			const target = event.currentTarget;
			const position = target.getAttribute("data-y-position") + "-" + target.getAttribute("data-x-position");
			expanded.value[position] = true;
		}
		function handleMouseLeave(event) {
			if (!interacting.value) {
				const target = event.currentTarget;
				const position = target.getAttribute("data-y-position") + "-" + target.getAttribute("data-x-position");
				expanded.value[position] = false;
			}
		}
		function handleDragEnd() {
			Object.keys(expanded.value).forEach((pos) => {
				expanded.value[pos] = false;
			});
		}
		function handlePointerUp() {
			interacting.value = false;
		}
		function updateHeights(h) {
			heights.value = h;
		}
		function updateHeight(h) {
			const index = heights.value.findIndex((item) => item.toastId === h.toastId);
			if (index !== -1) heights.value[index] = h;
			else {
				const samePositionIndex = heights.value.findIndex((item) => item.position === h.position);
				if (samePositionIndex !== -1) heights.value.splice(samePositionIndex, 0, h);
				else heights.value.unshift(h);
			}
		}
		return (_ctx, _cache) => {
			return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)(vue_exports.Fragment, null, [(0, vue_exports.createCommentVNode)(" Remove item from normal navigation flow, only available via hotkey "), (0, vue_exports.createElementVNode)("section", {
				"aria-label": `${_ctx.containerAriaLabel} ${(0, vue_exports.unref)(hotkeyLabel)}`,
				tabIndex: -1,
				"aria-live": "polite",
				"aria-relevant": "additions text",
				"aria-atomic": "false"
			}, [((0, vue_exports.openBlock)(true), (0, vue_exports.createElementBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(possiblePositions.value, (pos, index) => {
				return (0, vue_exports.openBlock)(), (0, vue_exports.createElementBlock)("ol", (0, vue_exports.mergeProps)({
					key: pos,
					ref_for: true,
					ref_key: "listRef",
					ref: listRef,
					"data-sonner-toaster": "",
					"data-sonner-theme": actualTheme.value,
					class: props.class,
					dir: _ctx.dir === "auto" ? getDocumentDirection() : _ctx.dir,
					tabIndex: -1,
					"data-theme": _ctx.theme,
					"data-rich-colors": _ctx.richColors,
					"data-y-position": pos.split("-")[0],
					"data-x-position": pos.split("-")[1],
					style: {
						"--front-toast-height": `${heights.value[0]?.height || 0}px`,
						"--width": `${(0, vue_exports.unref)(TOAST_WIDTH)}px`,
						"--gap": `${_ctx.gap}px`,
						..._ctx.style,
						...(0, vue_exports.unref)(attrs).style,
						...(0, vue_exports.unref)(assignOffset)(_ctx.offset, _ctx.mobileOffset)
					}
				}, { ref_for: true }, _ctx.$attrs, {
					onBlur,
					onFocus,
					onMouseenter: handleMouseEnter,
					onMousemove: handleMouseEnter,
					onMouseleave: handleMouseLeave,
					onDragend: handleDragEnd,
					onPointerdown: onPointerDown,
					onPointerup: handlePointerUp
				}), [((0, vue_exports.openBlock)(true), (0, vue_exports.createElementBlock)(vue_exports.Fragment, null, (0, vue_exports.renderList)(filteredToasts(pos, index), (toast$1, idx) => {
					return (0, vue_exports.openBlock)(), (0, vue_exports.createBlock)(Toast_default, {
						key: toast$1.id,
						heights: heights.value,
						icons: _ctx.icons,
						index: idx,
						toast: toast$1,
						defaultRichColors: _ctx.richColors,
						duration: _ctx.toastOptions?.duration ?? _ctx.duration,
						class: (0, vue_exports.normalizeClass)(_ctx.toastOptions?.class ?? ""),
						descriptionClass: _ctx.toastOptions?.descriptionClass,
						invert: _ctx.invert,
						visibleToasts: _ctx.visibleToasts,
						closeButton: _ctx.toastOptions?.closeButton ?? _ctx.closeButton,
						interacting: interacting.value,
						position: pos,
						closeButtonPosition: _ctx.toastOptions?.closeButtonPosition ?? _ctx.closeButtonPosition,
						style: (0, vue_exports.normalizeStyle)(_ctx.toastOptions?.style),
						unstyled: _ctx.toastOptions?.unstyled,
						classes: _ctx.toastOptions?.classes,
						cancelButtonStyle: _ctx.toastOptions?.cancelButtonStyle,
						actionButtonStyle: _ctx.toastOptions?.actionButtonStyle,
						"close-button-aria-label": _ctx.toastOptions?.closeButtonAriaLabel,
						toasts: toastsByPosition.value[pos],
						expandByDefault: _ctx.expand,
						gap: _ctx.gap,
						expanded: expanded.value[pos] || false,
						swipeDirections: props.swipeDirections,
						"onUpdate:heights": updateHeights,
						"onUpdate:height": updateHeight,
						onRemoveToast: removeToast
					}, {
						"close-icon": (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "close-icon", {}, () => [(0, vue_exports.createVNode)(CloseIcon_default)])]),
						"loading-icon": (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "loading-icon", {}, () => [(0, vue_exports.createVNode)(Loader_default, { visible: toast$1.type === "loading" }, null, 8, ["visible"])])]),
						"success-icon": (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "success-icon", {}, () => [(0, vue_exports.createVNode)(SuccessIcon_default)])]),
						"error-icon": (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "error-icon", {}, () => [(0, vue_exports.createVNode)(ErrorIcon_default)])]),
						"warning-icon": (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "warning-icon", {}, () => [(0, vue_exports.createVNode)(WarningIcon_default)])]),
						"info-icon": (0, vue_exports.withCtx)(() => [(0, vue_exports.renderSlot)(_ctx.$slots, "info-icon", {}, () => [(0, vue_exports.createVNode)(InfoIcon_default)])]),
						_: 2
					}, 1032, [
						"heights",
						"icons",
						"index",
						"toast",
						"defaultRichColors",
						"duration",
						"class",
						"descriptionClass",
						"invert",
						"visibleToasts",
						"closeButton",
						"interacting",
						"position",
						"closeButtonPosition",
						"style",
						"unstyled",
						"classes",
						"cancelButtonStyle",
						"actionButtonStyle",
						"close-button-aria-label",
						"toasts",
						"expandByDefault",
						"gap",
						"expanded",
						"swipeDirections"
					]);
				}), 128))], 16, _hoisted_2);
			}), 128))], 8, _hoisted_1)], 2112);
		};
	}
});

export { Toaster_default as T, toast as t };
//# sourceMappingURL=lib-Dnm-N0w-.mjs.map
