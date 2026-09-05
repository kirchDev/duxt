import { t as toast } from './lib-Dnm-N0w-.mjs';

//#region ../app/composables/useDuxtToast.ts
/**
* Toasts, wrapped so components never import vue-sonner directly.
*
* The wrapper is the seam: a consumer that wants a different notification
* system replaces this one composable instead of every call site, and the
* layer's own components keep working. Each level maps to Sonner's own type,
* which picks the icon and its status colour.
*/
function useDuxtToast() {
	return {
		success: (message, description) => toast.success(message, { description }),
		info: (message, description) => toast.info(message, { description }),
		warning: (message, description) => toast.warning(message, { description }),
		error: (message, description) => toast.error(message, { description }),
		/** A toast that stays until the promise settles. */
		loading: (message) => toast.loading(message),
		dismiss: (id) => toast.dismiss(id)
	};
}

export { useDuxtToast as u };
//# sourceMappingURL=useDuxtToast-CcCLDiC4.mjs.map
