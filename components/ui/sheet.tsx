"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";

/**
 * A dialog styled as a bottom sheet on mobile and a centered dialog from
 * `sm:` up. Thin wrapper over @base-ui/react's Dialog so every "tap to pick
 * a box" / "box detail" / "add box" flow shares one interaction pattern.
 */
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetPortal({ children, ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal {...props}>{children}</SheetPrimitive.Portal>;
}

function SheetBackdrop({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/60 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

function SheetContent({ className, children, ...props }: SheetPrimitive.Popup.Props) {
  return (
    <SheetPortal>
      <SheetBackdrop />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-2xl border-t border-border/60 bg-card p-5 outline-none",
          "transition-transform data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full",
          "sm:inset-x-auto sm:inset-y-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:max-h-[80dvh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border",
          "sm:data-[ending-style]:translate-y-[calc(-50%+8px)] sm:data-[starting-style]:translate-y-[calc(-50%+8px)] sm:data-[ending-style]:opacity-0 sm:data-[starting-style]:opacity-0",
          className
        )}
        {...props}
      >
        <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden />
        {children}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetPortal, SheetBackdrop, SheetContent, SheetTitle, SheetDescription };
