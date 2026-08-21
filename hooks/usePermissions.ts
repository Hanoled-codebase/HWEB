"use client";

import { useMemo } from "react";
import { useOrganization, type Member } from "./useOrganization";

export type Capability =
  | "org.create"
  | "org.settings"
  | "members.manage"
  | "members.grant_admin"
  | "students.create"
  | "students.manage"
  | "parents.manage"
  | "assignments.assign"
  | "students.view"
  | "results.enter"
  | "results.approve"
  | "results.view_own_child"
  | "results.view_self"
  | "fee_structure.edit"
  | "payments.record"
  | "fee_status.view"
  | "fee_status.view_own"
  | "payments.make"
  | "messaging.send"
  | "messaging.receive"
  | "library.manage"
  | "timetable.view"
  | "timetable.edit"
  | "attendance.mark"
  | "attendance.view"
  | "reports.view"
  | "reports.view_financial"
  | "cbt.manage"
  | "cbt.take"
  | "homework.manage"
  | "hostel.manage"
  | "bus.manage"
  | "admissions.manage";

const PERMISSION_MATRIX: Record<string, Capability[]> = {
  owner: [
    "org.create", "org.settings", "members.manage", "members.grant_admin",
    "students.create", "students.manage", "parents.manage", "assignments.assign",
    "students.view", "results.enter", "results.approve",
    "fee_structure.edit", "payments.record", "fee_status.view",
    "messaging.send", "library.manage",
    "timetable.view", "timetable.edit",
    "attendance.mark", "attendance.view",
    "reports.view",
    "cbt.manage", "homework.manage",
    "hostel.manage", "bus.manage", "admissions.manage",
  ],
  admin: [
    "org.settings", "members.manage",
    "students.create", "students.manage", "parents.manage", "assignments.assign",
    "students.view", "results.enter", "results.approve",
    "fee_structure.edit", "payments.record", "fee_status.view",
    "messaging.send", "messaging.receive",
    "timetable.view", "timetable.edit",
    "attendance.mark", "attendance.view",
    "reports.view",
    "cbt.manage", "homework.manage",
    "hostel.manage", "bus.manage", "admissions.manage",
  ],
  member: [],
  parent: [
    "results.view_own_child", "fee_status.view_own", "payments.make",
    "messaging.send",
    "timetable.view", "attendance.view",
  ],
};

function getScopedCapabilities(assignments: Member["memberAssignments"]): Capability[] {
  if (!assignments || assignments.length === 0) return [];
  const activeAssignments = assignments.filter((a) => {
    if (!a || !a.type) return false;
    if (a.endDate && new Date(a.endDate) <= new Date()) return false;
    return true;
  });
  const caps = new Set<Capability>();
  for (const a of activeAssignments) {
    switch (a.type) {
      case "HOD":
        caps.add("students.view");
        caps.add("results.enter");
        caps.add("reports.view");
        caps.add("cbt.manage");
        caps.add("homework.manage");
        caps.add("attendance.view");
        caps.add("attendance.mark");
        caps.add("messaging.send");
        caps.add("timetable.view");
        caps.add("timetable.edit");
        break;
      case "CLASS_TEACHER":
        caps.add("students.view");
        caps.add("attendance.mark");
        caps.add("attendance.view");
        caps.add("timetable.view");
        caps.add("messaging.send");
        caps.add("results.view_self");
        break;
      case "SUBJECT_TEACHER":
        caps.add("results.enter");
        caps.add("cbt.manage");
        caps.add("homework.manage");
        caps.add("attendance.mark");
        caps.add("timetable.view");
        caps.add("messaging.send");
        caps.add("students.view");
        break;
      case "ACCOUNTANT":
        caps.add("fee_structure.edit");
        caps.add("payments.record");
        caps.add("fee_status.view");
        caps.add("reports.view_financial");
        break;
      case "LIBRARIAN":
        caps.add("library.manage");
        caps.add("students.view");
        break;
    }
  }
  return Array.from(caps);
}

export function usePermissions() {
  const { currentMember } = useOrganization();

  return useMemo(() => {
    if (!currentMember) return { can: () => false, capabilities: [] as Capability[] };

    const role = currentMember.role;
    const baseCaps = PERMISSION_MATRIX[role] || [];
    const activeAssignments = (currentMember.memberAssignments || []).filter(
      (a) => !a.endDate || new Date(a.endDate) > new Date()
    );
    const scopedCaps = getScopedCapabilities(activeAssignments);

    const allCaps = [...new Set([...baseCaps, ...scopedCaps])];

    return {
      capabilities: allCaps,
      can: (capability: Capability) => allCaps.includes(capability),
      role,
      isOwner: role === "owner",
      isAdmin: role === "admin",
      isMember: role === "member",
      isParent: role === "parent",
      isPrivileged: role === "owner" || role === "admin",
      assignments: activeAssignments,
    };
  }, [currentMember]);
}
