"use client";

import { useCallback, useMemo } from "react";
import { create } from "zustand";
import { BookOpen, Library, Network, Wallet, type LucideIcon } from "lucide-react";
import { useOrganization } from "./useOrganization";
import { FINANCE_CAPABILITIES, usePermissions } from "./usePermissions";

/**
 * A staff member can wear more than one hat — a class teacher who also keeps
 * the bursary. Each hat is a workspace with its own home, tab bar and
 * sidebar order; the person switches between them instead of one role
 * silently hiding the other. Owners, admins and parents have one home, so
 * they never see a switch.
 */
export type WorkspaceKey = "teaching" | "department" | "finance" | "library";

export const WORKSPACE_META: Record<WorkspaceKey, { label: string; icon: LucideIcon }> = {
  teaching: { label: "Teaching", icon: BookOpen },
  department: { label: "Department", icon: Network },
  finance: { label: "Bursary", icon: Wallet },
  library: { label: "Library", icon: Library },
};

const STORAGE_KEY = "hanoled.workspace";

function readStored(): Record<string, WorkspaceKey> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

type WorkspaceState = {
  bySchool: Record<string, WorkspaceKey>;
  choose: (slug: string, workspace: WorkspaceKey) => void;
};

// The last workspace per school is a per-device convenience; losing it just
// means landing on the default one.
const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  bySchool: readStored(),
  choose: (slug, workspace) => {
    const bySchool = { ...get().bySchool, [slug]: workspace };
    set({ bySchool });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bySchool));
    } catch {
      /* private mode or storage full: the choice lasts for this visit */
    }
  },
}));

export function useWorkspace() {
  const { currentOrg } = useOrganization();
  const { role, can, isClassTeacher, isSubjectTeacher, isAccountant, isHOD, isLibrarian } = usePermissions();
  const slug = currentOrg?.slug ?? "";
  const stored = useWorkspaceStore((state) => state.bySchool[slug]);
  const choose = useWorkspaceStore((state) => state.choose);

  const available = useMemo(() => {
    if (role !== "member") return [] as WorkspaceKey[];
    const list: WorkspaceKey[] = [];
    if (isClassTeacher || isSubjectTeacher) list.push("teaching");
    if (can("department.oversee")) list.push("department");
    if (FINANCE_CAPABILITIES.some((capability) => can(capability))) list.push("finance");
    if (can("library.manage")) list.push("library");
    return list;
  }, [role, can, isClassTeacher, isSubjectTeacher]);

  // A person lands on the hat they were given on top of teaching (bursary,
  // department, library); the switch remembers whatever they pick after that.
  const preferred: WorkspaceKey | undefined = [
    isAccountant && "finance",
    isHOD && "department",
    isLibrarian && "library",
  ].find((key): key is WorkspaceKey => Boolean(key) && available.includes(key as WorkspaceKey));
  const fallback: WorkspaceKey | null = preferred ?? available[0] ?? null;
  const active: WorkspaceKey | null = stored && available.includes(stored) ? stored : fallback;

  const setActive = useCallback(
    (workspace: WorkspaceKey) => {
      if (slug) choose(slug, workspace);
    },
    [slug, choose],
  );

  return { available, active, setActive };
}
