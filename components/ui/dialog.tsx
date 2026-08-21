"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DismissableLayerBranch } from "@radix-ui/react-dismissable-layer";
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
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
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
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-[512px] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 sm:p-6 shadow-lg duration-200 max-h-[85vh] overflow-y-auto rounded-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
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
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:Text-muted-foreground">
              <X className="h-4 w-4" />
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
      "flex flex-col space-y-1.5 text-center sm:text-left",
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
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
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
      "text-lg font-semibold leading-none tracking-tight",
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
