"use client";

import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { signOutEverywhere } from "@/lib/sign-out";

export function SignOutForm({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <form
      action={logoutAction}
      className={className}
      onSubmit={(event) => {
        // logoutAction only clears Hweb's cookies; the HCORE, HCBT and HSMS
        // sessions need the browser's own logout calls. It stays as the no-JS
        // fallback.
        event.preventDefault();
        void signOutEverywhere();
      }}
    >
      {children}
    </form>
  );
}
