import { Suspense } from "react";
import OnlinePortal from "@/app/cbt/page";

// The online /cbt landing (portal + auto-redirect to the person's console)
// served by the appliance as well.
export default function EdgeCbtRoot() {
  return (
    <Suspense fallback={null}>
      <OnlinePortal />
    </Suspense>
  );
}
