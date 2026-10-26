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
  | "invoices.manage"
  | "payments.record"
  | "fee_status.view"
  | "fee_status.view_own"
  | "debt.view"
  | "payroll.manage"
  | "scratch_cards.manage"
  | "staff_attendance.view"
  | "department.oversee"
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

/** Roles a school can reshape. STAFF is what every staff member starts with. */
export type StaffRoleCode = "STAFF" | "ACCOUNTANT" | "LIBRARIAN" | "HOD" | "CLASS_TEACHER" | "SUBJECT_TEACHER";

/** Capabilities that make up the bursary; holding any of them opens the finance workspace. */
export const FINANCE_CAPABILITIES: Capability[] = [
  "payments.record",
  "fee_status.view",
  "debt.view",
  "reports.view_financial",
  "fee_structure.edit",
  "invoices.manage",
  "payroll.manage",
  "scratch_cards.manage",
];

const FINANCE_ALL: Capability[] = [...FINANCE_CAPABILITIES, "staff_attendance.view"];

// Owners, admins and parents are fixed; schools cannot edit them.
const FIXED_ROLE_CAPABILITIES: Record<"owner" | "admin" | "parent", Capability[]> = {
  owner: [
    "org.create", "org.settings", "members.manage", "members.grant_admin",
    "students.create", "students.manage", "parents.manage", "assignments.assign",
    "students.view", "results.enter", "results.approve", "department.oversee",
    ...FINANCE_ALL,
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
    "students.view", "results.enter", "results.approve", "department.oversee",
    ...FINANCE_ALL,
    "messaging.send", "messaging.receive", "library.manage",
    "timetable.view", "timetable.edit",
    "attendance.mark", "attendance.view",
    "reports.view",
    "cbt.manage", "homework.manage",
    "hostel.manage", "bus.manage", "admissions.manage",
  ],
  parent: [
    "results.view_own_child", "fee_status.view_own", "payments.make",
    "messaging.send",
    "timetable.view", "attendance.view",
  ],
};

/**
 * Defaults for the editable roles — the same lists as ROLE_DEFAULTS in the
 * HSMS backend (src/lib/access.js). They apply only until the school's own
 * policy arrives with the HSMS member profile, or if that fetch fails.
 */
const DEFAULT_ROLE_CAPABILITIES: Record<StaffRoleCode, Capability[]> = {
  // Seeing a register comes from teaching (Class or Subject Teacher), not
  // from being staff, so a bursar with no class doesn't get Attendance.
  STAFF: ["timetable.view", "messaging.send", "students.view"],
  ACCOUNTANT: [
    "fee_structure.edit", "invoices.manage", "payments.record", "fee_status.view",
    "debt.view", "reports.view_financial", "payroll.manage", "scratch_cards.manage",
    "staff_attendance.view", "students.view", "messaging.send",
  ],
  LIBRARIAN: ["library.manage", "students.view", "timetable.view"],
  // HOD carries the class and subject teacher capabilities of their
  // department; marking the register stays with the class teacher.
  HOD: [
    "students.view", "students.manage", "parents.manage",
    "results.enter", "results.approve", "results.view_self",
    "reports.view", "cbt.manage", "homework.manage",
    "attendance.view", "messaging.send",
    "timetable.view", "timetable.edit",
    "assignments.assign", "members.manage", "staff_attendance.view", "department.oversee",
  ],
  CLASS_TEACHER: [
    "students.view", "students.manage", "parents.manage",
    "attendance.mark", "attendance.view",
    "timetable.view", "messaging.send", "results.view_self", "homework.manage",
  ],
  SUBJECT_TEACHER: [
    "results.enter", "cbt.manage", "homework.manage",
    "attendance.view", "timetable.view", "messaging.send", "students.view",
  ],
};

function activeAssignmentsOf(member: Member) {
  const now = Date.now();
  return (member.memberAssignments || []).filter(
    (a) => a?.type && (!a.endDate || new Date(a.endDate).getTime() > now),
  );
}

function staffCapabilities(member: Member): Capability[] {
  const policy = member.access?.roleCapabilities;
  const forRole = (code: StaffRoleCode) =>
    (policy?.[code] as Capability[] | undefined) ?? DEFAULT_ROLE_CAPABILITIES[code];

  const caps = new Set<Capability>(forRole("STAFF"));
  for (const assignment of activeAssignmentsOf(member)) {
    for (const cap of forRole(assignment.type as StaffRoleCode) ?? []) caps.add(cap);
  }
  return [...caps];
}

export function usePermissions() {
  const { currentMember } = useOrganization();

  return useMemo(() => {
    if (!currentMember) return { can: () => false, capabilities: [] as Capability[] };

    const role = currentMember.role;
    const activeAssignments = activeAssignmentsOf(currentMember);
    const capabilities =
      role === "member" ? staffCapabilities(currentMember) : [...(FIXED_ROLE_CAPABILITIES[role] ?? [])];
    const held = new Set(capabilities);

    const holds = (type: string) => activeAssignments.some((a) => a.type === type);
    const isAccountant = holds("ACCOUNTANT");
    const isHOD = holds("HOD");
    const isLibrarian = holds("LIBRARIAN");
    // Two stores mean "class teacher": a CLASS_TEACHER assignment (HCORE's
    // teaching-assignment projection) or the class's own form-teacher field
    // (the Classes screen), which lands in assignedClasses. Reading only the
    // first hid the class, and therefore the register, from a teacher the
    // school had made form teacher from the Classes screen.
    const isClassTeacher =
      holds("CLASS_TEACHER") || (currentMember.assignedClasses?.length ?? 0) > 0;
    const isSubjectTeacher = holds("SUBJECT_TEACHER");

    return {
      capabilities,
      can: (capability: Capability) => held.has(capability),
      role,
      isOwner: role === "owner",
      isAdmin: role === "admin",
      isMember: role === "member",
      isParent: role === "parent",
      isPrivileged: role === "owner" || role === "admin",
      // Role facts (which assignments this person holds). What they may do
      // comes from can(); a school can reshape any of these roles.
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
