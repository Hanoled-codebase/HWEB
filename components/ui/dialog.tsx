"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const DialogPopupContext = React.createContext(false);

export function useDialogPopupContext() {
  return React.useContext(DialogPopupContext);
}

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 overflow-hidden overscroll-contain bg-[#0B1220]/55 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// DialogContent: render a dedicated portal container inside the dialog portal.
// This container is used by SelectContent to mount floating popups inside the
// same stacking context as the dialog (queryable via [data-dialog-portal]).
// It helps ensure dropdowns align with their triggers and don't get closed by
// dialog outside-click handlers when portalled to document.body.
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(
  (
    {
      className,
      children,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      ...rest
    },
    ref,
  ) => {
    const isSelectPopup = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return !!(
        el.closest("[data-dialog-portal]") ||
        el.closest('[data-slot="select-content"]') ||
        el.closest('[data-slot="select-item"]')
      );
    };

    return (
      <DialogPortal>
        <DialogOverlay />
        <div data-dialog-portal className="fixed inset-0 z-[1100] pointer-events-none" />
        <DialogPrimitive.Content
          ref={ref}
          aria-describedby={undefined}
          data-slot="dialog-content"
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-[512px] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 sm:p-6 shadow-lg duration-200 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            // Phones: a bottom sheet the thumb can reach, clear of the home indicator (animation in globals.css).
            "max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:left-0 max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:max-h-[92dvh] max-md:rounded-b-none max-md:rounded-t-3xl max-md:border-x-0 max-md:border-b-0 max-md:px-5 max-md:pt-6 max-md:pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            className,
          )}
          onPointerDownOutside={(e) => {
            if (isSelectPopup(e.target)) {
              e.preventDefault();
            }
            onPointerDownOutside?.(e);
          }}
          onFocusOutside={(e) => {
            if (isSelectPopup(e.target)) {
              e.preventDefault();
            }
            onFocusOutside?.(e);
          }}
          onInteractOutside={(e) => {
            if (isSelectPopup(e.target)) {
              e.preventDefault();
            }
            onInteractOutside?.(e);
          }}
          {...rest}
        >
          <DialogPopupContext.Provider value={true}>
            <div
              aria-hidden="true"
              className="mx-auto -mt-3 mb-0.5 hidden h-1 w-10 shrink-0 rounded-full bg-slate-300 max-md:block"
            />
            {children}
            <DialogPrimitive.Close className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-slate-600 ring-offset-background transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none sm:right-3 sm:top-3">
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPopupContext.Provider>
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 pr-10 text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-bold leading-snug tracking-tight text-[#0B1220] text-balance",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
