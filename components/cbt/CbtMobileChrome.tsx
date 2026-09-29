"use client";

import { ChevronLeft, LogOut } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

/**
 * Phone chrome shared by every HCBT dashboard (student, teacher, admin).
 * The account holder's name is always on screen: in the greeting at the top of
 * the page and in the account sheet behind the avatar.
 */

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "H"
  );
}

function timeOfDay() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export function CbtMobileTopBar({
  roleLabel,
  name,
  onOpenAccount,
}: {
  roleLabel: string;
  name: string;
  onOpenAccount: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 pt-safe backdrop-blur-md sm:hidden">
      <Logo className="h-7 w-7 shrink-0" size="sm" badgeText={roleLabel.toUpperCase()} textColor="text-[#0B1220]" />
      <button
        type="button"
        onClick={onOpenAccount}
        aria-label={name ? `Account: ${name}` : "Account"}
        className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100 active:bg-blue-100"
      >
        {initialsOf(name)}
      </button>
    </header>
  );
}

export function CbtGreeting({
  name,
  roleLabel,
  school,
  detail,
}: {
  name: string;
  roleLabel: string;
  school?: string;
  detail?: string;
}) {
  return (
    <section className="rounded-3xl bg-[#0B1220] px-5 pb-5 pt-4 text-white sm:hidden">
      <p className="text-xs font-medium text-white/60">{timeOfDay()},</p>
      <h2 className="mt-0.5 break-words text-2xl font-bold capitalize leading-tight tracking-tight">
        {name || "Welcome"}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="inline-flex items-center rounded-full bg-[#F5A623] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[#0B1220]">
          {roleLabel}
        </span>
        {school && <span className="min-w-0 truncate text-xs font-medium text-white/80">{school}</span>}
        {detail && <span className="text-xs text-white/60">{detail}</span>}
      </div>
    </section>
  );
}

export function CbtAccountSheet({
  open,
  onOpenChange,
  name,
  email,
  roleLabel,
  school,
  suiteHref,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email?: string;
  roleLabel: string;
  school?: string;
  /** Omit on the edge appliance, which has no suite to go back to. */
  suiteHref?: string;
  onSignOut: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="gap-0 rounded-t-[28px] border-t-0 bg-slate-50 p-0 duration-300 ease-[var(--ease-out-smooth)] sm:hidden"
      >
        <SheetTitle className="sr-only">Account</SheetTitle>
        <SheetDescription className="sr-only">Your account details and sign out</SheetDescription>
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />

        <div className="flex items-center gap-3.5 px-5 pb-4 pt-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
            {initialsOf(name)}
          </span>
          <div className="min-w-0">
            <p className="break-words text-base font-bold capitalize leading-tight text-[#0B1220]">{name || "Your account"}</p>
            {email && <p className="truncate text-xs text-slate-500">{email}</p>}
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-600">
              {roleLabel}
              {school ? ` · ${school}` : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-2 border-t border-slate-200/80 bg-white px-4 pb-safe pt-3">
          <div className="mb-3 grid gap-2">
            {suiteHref && (
              <a
                href={suiteHref}
                className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 active:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4 text-slate-500" /> Back to Suite
              </a>
            )}
            <button
              type="button"
              onClick={onSignOut}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-red-50 px-3 text-sm font-semibold text-[#F04438] active:bg-red-100"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
