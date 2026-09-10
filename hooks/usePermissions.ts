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
    "fee_structure.edit", "payments.record", "fee_status.view", "reports.view_financial",
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
    "fee_structure.edit", "payments.record", "fee_status.view", "reports.view_financial",
    "messaging.send", "messaging.receive",
    "timetable.view", "timetable.edit",
    "attendance.mark", "attendance.view",
    "reports.view",
    "cbt.manage", "homework.manage",
    "hostel.manage", "bus.manage", "admissions.manage",
  ],
  member: ["timetable.view", "messaging.send", "attendance.view", "students.view"],
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
  // Hierarchy: HOD > Class Teacher > Subject Teacher; Accountant/Librarian are vertical (finance/library)
  const hasHOD = activeAssignments.some((a) => a.type === "HOD");
  const hasClassTeacher = activeAssignments.some((a) => a.type === "CLASS_TEACHER");
  const hasSubjectTeacher = activeAssignments.some((a) => a.type === "SUBJECT_TEACHER");
  for (const a of activeAssignments) {
    switch (a.type) {
      case "HOD":
        // HOD inherits Class + Subject caps plus department management (row: own department).
        // Attendance-marking is deliberately excluded — that's the Class
        // Teacher's job specifically, not implied by department oversight.
        caps.add("students.view");
        caps.add("students.manage");
        caps.add("parents.manage");
        caps.add("results.enter");
        caps.add("results.approve");
        caps.add("reports.view");
        caps.add("cbt.manage");
        caps.add("homework.manage");
        caps.add("attendance.view");
        caps.add("messaging.send");
        caps.add("timetable.view");
        caps.add("timetable.edit");
        caps.add("assignments.assign");
        caps.add("members.manage");
        break;
      case "CLASS_TEACHER":
        // Row: own class only (40 students) — tightly coupled via classLevelId
        caps.add("students.view");
        caps.add("students.manage");
        caps.add("parents.manage");
        caps.add("attendance.mark");
        caps.add("attendance.view");
        caps.add("timetable.view");
        caps.add("messaging.send");
        caps.add("results.view_self");
        caps.add("homework.manage");
        break;
      case "SUBJECT_TEACHER":
        // Row: own subject + assigned classes only. No attendance.mark —
        // taking the class register is the Class Teacher's job, not the
        // subject teacher's, even for a class they teach into.
        caps.add("results.enter");
        caps.add("cbt.manage");
        caps.add("homework.manage");
        caps.add("attendance.view");
        caps.add("timetable.view");
        caps.add("messaging.send");
        caps.add("students.view");
        break;
      case "ACCOUNTANT":
        // Vertical: finance only (row: school-wide fee ledger, field: fee-status, not academic marks)
        caps.add("fee_structure.edit");
        caps.add("payments.record");
        caps.add("fee_status.view");
        caps.add("reports.view_financial");
        caps.add("students.view");
        caps.add("messaging.send");
        break;
      case "LIBRARIAN":
        caps.add("library.manage");
        caps.add("students.view");
        caps.add("timetable.view");
        break;
    }
  }
  // Hierarchy inheritance: HOD gets Class + Subject capabilities (department scope)
  if (hasHOD) {
    if (!hasClassTeacher) {
      // Deliberately no attendance.mark here — see the HOD case above.
      caps.add("students.view"); caps.add("students.manage"); caps.add("parents.manage");
      caps.add("attendance.view"); caps.add("results.view_self");
    }
    if (!hasSubjectTeacher) {
      caps.add("results.enter"); caps.add("cbt.manage"); caps.add("homework.manage");
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

    const isAccountant = activeAssignments.some((a) => a.type === "ACCOUNTANT")
    const isHOD = activeAssignments.some((a) => a.type === "HOD")
    const isLibrarian = activeAssignments.some((a) => a.type === "LIBRARIAN")
    const isClassTeacher = activeAssignments.some((a) => a.type === "CLASS_TEACHER")
    const isSubjectTeacher = activeAssignments.some((a) => a.type === "SUBJECT_TEACHER")

    return {
      capabilities: allCaps,
      can: (capability: Capability) => allCaps.includes(capability),
      role,
      isOwner: role === "owner",
      isAdmin: role === "admin",
      isMember: role === "member",
      isParent: role === "parent",
      isPrivileged: role === "owner" || role === "admin",
      isAccountant,
      isHOD,
      isLibrarian,
      isClassTeacher,
      isSubjectTeacher,
      isTeacher: isClassTeacher || isSubjectTeacher || isHOD,
      assignments: activeAssignments,
    };
  }, [currentMember]);
}
