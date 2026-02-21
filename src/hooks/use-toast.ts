import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

/**
 * Wrapper around sonner toast to support shadcn/ui-style API
 */
export function toast(options: ToastOptions | string) {
  if (typeof options === "string") {
    return sonnerToast(options);
  }

  const { title, description, variant } = options;
  const message = title ?? description ?? "";

  if (variant === "destructive") {
    return sonnerToast.error(message, {
      description: title ? description : undefined,
    });
  }

  return sonnerToast.success(message, {
    description: title ? description : undefined,
  });
}

export function useToast() {
  return { toast };
}
