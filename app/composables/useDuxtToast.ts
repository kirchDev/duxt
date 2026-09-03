import { toast } from 'vue-sonner';

/**
 * Toasts, wrapped so components never import vue-sonner directly.
 *
 * The wrapper is the seam: a consumer that wants a different notification
 * system replaces this one composable instead of every call site, and the
 * layer's own components keep working.
 */
export function useDuxtToast() {
  return {
    /** A short confirmation for something the reader just did. */
    success: (message: string, description?: string) =>
      toast.success(message, { description }),
    error: (message: string, description?: string) =>
      toast.error(message, { description }),
    info: (message: string, description?: string) =>
      toast(message, { description })
  };
}
