"use client";

import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { clearAuthTokens } from "@/lib/auth-tokens";

export function SignOutForm({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <form
      action={logoutAction}
      className={className}
      onSubmit={() => {
        clearAuthTokens();
      }}
    >
      {children}
    </form>
  );
}
