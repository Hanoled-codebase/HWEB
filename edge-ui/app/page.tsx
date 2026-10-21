// The online /cbt portal ALWAYS redirects: authenticated people go straight
// to their console, unauthenticated ones get the sign-in prompt. Instead of
// copying it, import the real page so the appliance can never drift.
import OnlinePortal from "@/app/cbt/page";

export default function EdgeEntry() {
  return <OnlinePortal />;
}
