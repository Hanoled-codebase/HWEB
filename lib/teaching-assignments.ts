import { api, type TeachingAssignmentInput } from "@/services/api";
import { staffAccessApi } from "@/lib/staff-access";

/**
 * Class and subject teaching duties live in HCORE. Hanoled keeps a copy
 * (memberAssignments) keyed by its own class/subject rows, which mirror
 * HCORE's and carry the HCORE id when linked.
 */

export const teachingKey = (a: TeachingAssignmentInput) =>
  `${a.assignmentType}:${a.classGroupId}:${a.subjectId ?? ""}`;

export type HcoreIds = { classIds: Map<string, string>; subjectIds: Map<string, string> };

/** Hanoled class/subject id → HCORE id, for rows linked to HCORE. */
export function hcoreIds(
  classes: Array<{ id: string; hcoreClassGroupId?: string | null }>,
  subjects: Array<{ id: string; hcoreSubjectId?: string | null }>,
): HcoreIds {
  return {
    classIds: new Map(classes.flatMap((c) => (c.hcoreClassGroupId ? [[c.id, c.hcoreClassGroupId] as const] : []))),
    subjectIds: new Map(subjects.flatMap((s) => (s.hcoreSubjectId ? [[s.id, s.hcoreSubjectId] as const] : []))),
  };
}

/** A Hanoled teaching row as HCORE would hold it, or null if HCORE can't (not teaching, or unlinked). */
export function toHcoreTeaching(
  row: { type: string; classLevel?: { id?: string } | null; subject?: { id?: string } | null },
  ids: HcoreIds,
): TeachingAssignmentInput | null {
  if (row.type !== "SUBJECT_TEACHER" && row.type !== "CLASS_TEACHER") return null;
  const classGroupId = row.classLevel?.id ? ids.classIds.get(row.classLevel.id) : undefined;
  const subjectId = row.subject?.id ? ids.subjectIds.get(row.subject.id) : null;
  if (!classGroupId || subjectId === undefined) return null;
  return { classGroupId, subjectId, assignmentType: row.type };
}

/**
 * HCORE's teacher-assignments endpoint replaces the teacher's whole set,
 * class-teacher duties included. Read what HCORE holds now, let `edit`
 * change it in place (keyed by teachingKey), write it all back, then have
 * Hanoled re-read this person so its copy is current.
 */
export async function editTeachingAssignments(
  org: { id: string; slug: string },
  affiliationId: string,
  edit: (current: Map<string, TeachingAssignmentInput>) => void,
) {
  const { assignments } = await api.getTeacherAssignments(org.id, affiliationId);
  const current = new Map<string, TeachingAssignmentInput>();
  for (const { classGroupId, subjectId, assignmentType } of assignments) {
    const item = { classGroupId, subjectId: subjectId ?? null, assignmentType };
    current.set(teachingKey(item), item);
  }
  edit(current);
  await api.updateTeacherAssignments(org.id, affiliationId, [...current.values()]);
  await staffAccessApi.refreshProjection(org.slug, affiliationId, { teachingChanged: true });
}
