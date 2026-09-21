"use client";

import { useEffect } from "react";
import { cbtApi } from "@/lib/api-cbt";

// Landing route: send a signed-in person to their console, everyone else to sign-in.
export default function EdgeHome() {
  useEffect(() => {
    cbtApi
      .checkAuth()
      .then((res: any) => {
        if (!res?.authenticated) return window.location.replace("/signin/");
        const role = String(res.user?.role || "").toLowerCase();
        window.location.replace(role === "candidate" || role === "student" ? "/cbt/student/" : "/cbt/admin/");
      })
      .catch(() => window.location.replace("/signin/"));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}
