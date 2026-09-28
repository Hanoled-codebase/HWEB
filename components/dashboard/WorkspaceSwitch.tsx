"use client";

import { cn } from "@/lib/utils";
import { WORKSPACE_META, type WorkspaceKey } from "@/hooks/useWorkspace";

/**
 * Segmented switch between a staff member's workspaces ("Teaching · Bursary").
 * Rendered only for people who hold more than one; everyone else never sees it.
 */
export function WorkspaceSwitch({
  items,
  active,
  onChange,
  size = "md",
  className,
}: {
  items: WorkspaceKey[];
  active: WorkspaceKey;
  onChange: (workspace: WorkspaceKey) => void;
  /** md: 44px segments for phones and page headers. sm: the desktop sidebar. */
  size?: "md" | "sm";
  className?: string;
}) {
  if (items.length < 2) return null;
  return (
    <div
      role="group"
      aria-label="Switch workspace"
      className={cn("flex gap-1 rounded-xl bg-slate-100 p-1", className)}
    >
      {items.map((key) => {
        const { label, icon: Icon } = WORKSPACE_META[key];
        const selected = key === active;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (!selected) onChange(key);
            }}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg font-semibold transition-[background-color,color,box-shadow] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40",
              size === "md" ? "min-h-[44px] px-3 text-sm" : "min-h-[32px] px-2 text-xs",
              selected
                ? "bg-white text-blue-700 shadow-[0_1px_2px_rgba(11,18,32,0.08),0_2px_6px_-2px_rgba(11,18,32,0.12)]"
                : "text-slate-600 hover:text-slate-900 active:bg-white/60",
            )}
          >
            {/* The narrow sidebar keeps the words and drops the icons. */}
            {size === "md" && <Icon className="h-4 w-4 shrink-0" />}
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
