"use client";

import { useEffect } from "react";

export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    async function unregisterServiceWorkers() {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[ServiceWorkerCleanup] unregister failed:", error);
        }
      }
    }

    unregisterServiceWorkers();
  }, []);

  return null;
}
