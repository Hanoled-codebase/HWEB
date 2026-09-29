"use client";
import { Toaster } from "sonner";

// The app's only Toaster. Top-center so it never covers a back button or the notification bell;
// on phones it drops below the 56px top bar. Colour comes from the brand status ramps only
// (sonner's richColors palette is off-brand).
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        offset={16}
        mobileOffset={{ top: "calc(env(safe-area-inset-top) + 64px)", left: 12, right: 12 }}
        toastOptions={{
          classNames: {
            toast: "!rounded-2xl !border-slate-200 !bg-white !text-slate-900 !shadow-lg !font-[inherit]",
            title: "!font-semibold",
            description: "!text-slate-600",
            success: "[&_[data-icon]]:!text-emerald-600",
            error: "[&_[data-icon]]:!text-red-600",
            warning: "[&_[data-icon]]:!text-amber-600",
            info: "[&_[data-icon]]:!text-blue-600",
          },
        }}
      />
    </>
  );
}
