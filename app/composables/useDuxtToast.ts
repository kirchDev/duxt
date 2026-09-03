import { toast } from 'vue-sonner';

/**
 * Toasts, wrapped so components never import vue-sonner directly.
 *
 * The wrapper is the seam: a consumer that wants a different notification
 * system replaces this one composable instead of every call site, and the
 * layer's own components keep working. Each level maps to Sonner's own type,
 * which picks the icon and its status colour.
 */
export function useDuxtToast() {
  return {
    success: (message: string, description?: string) =>
      toast.success(message, { description }),
    info: (message: string, description?: string) =>
      toast.info(message, { description }),
    warning: (message: string, description?: string) =>
      toast.warning(message, { description }),
    error: (message: string, description?: string) =>
      toast.error(message, { description }),
    /** A toast that stays until the promise settles. */
    loading: (message: string) => toast.loading(message),
    dismiss: (id?: number | string) => toast.dismiss(id)
  };
}
