"use client";

import { useState, useEffect, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api";
import { staffAccessApi } from "@/lib/staff-access";
import { type TeachingAssignmentInput } from "@/services/api";
import { editTeachingAssignments, hcoreIds, teachingKey, toHcoreTeaching } from "@/lib/teaching-assignments";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  Loader2,
  Mail,
  BookOpen,
  GraduationCap,
  Banknote,
  ClipboardCheck,
  Target,
  Eye,
  Star,
  Clock,
  FileText,
  Plus,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  Building2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { EntityHeader, SearchInput } from "@/components/dashboard/shared";

// ── Types ─────────────────────────────────────────────────────────────

type TeacherSubject = { id: string; name: string };
type TeacherClass = { id: string; name: string };
type TeacherAssignment = {
  classLevel?: TeacherClass | null;
  subject?: TeacherSubject | null;
};

type MemberUser = { id: string; name: string; email: string };

type Department = {
  id: string;
  name: string;
  description?: string;
  headMemberId?: string | null;
  createdAt: string;
};

type AssignmentTypeOption = "SUBJECT_TEACHER" | "CLASS_TEACHER" | "HOD" | "ACCOUNTANT" | "LIBRARIAN";

type MemberAssignmentItem = {
  id: string;
  type: AssignmentTypeOption;
  classLevel?: { id?: string; name?: string; level?: string } | null;
  subject?: { id?: string; name?: string; code?: string } | null;
  department?: { id?: string; name?: string } | null;
  startDate?: string;
  endDate?: string | null;
  /** Set once HCORE backs the row; null on rows written before HCORE owned them. */
  hcoreStatus?: string | null;
};

type Appraisal = {
  id: string;
  scorePacing: number;
  scoreClarity: number;
  scorePedagogy: number;
  observerNotes?: string;
  evaluator: { user: { name: string } };
  createdAt: string;
};

type PDULog = {
  id: string;
  activityTitle: string;
  provider: string;
  hoursCompleted: number;
  dateCompleted: string;
  certificateUrl?: string;
  createdAt: string;
};

type TeacherProfile = {
  id: string;
  memberId: string;
  trcnNumber?: string;
  employeeCode?: string;
  dateOfHire?: string;
  salaryBase?: number;
  bankName?: string;
  accountNumber?: string;
  member: {
    id: string;
    role: string;
    hcoreAffiliationId?: string | null;
    user: MemberUser;
    teachingAssignments?: TeacherAssignment[];
    memberAssignments?: MemberAssignmentItem[];
  };
  appraisals: Appraisal[];
  pduLogs: PDULog[];
};

type OrgMember = {
  id: string;
  role: string;
  user: MemberUser;
};

// ── Schemas ───────────────────────────────────────────────────────────

const createProfileSchema = z.object({
  memberId: z.string().min(1, "Select a member"),
  trcnNumber: z.string().optional(),
  employeeCode: z.string().optional(),
  dateOfHire: z.string().optional(),
  salaryBase: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
});

const appraisalSchema = z.object({
  scorePacing: z.string().min(1, "Required"),
  scoreClarity: z.string().min(1, "Required"),
  scorePedagogy: z.string().min(1, "Required"),
  observerNotes: z.string().optional(),
});

const pduSchema = z.object({
  activityTitle: z.string().min(2, "Title is required"),
  provider: z.string().min(2, "Provider is required"),
  hoursCompleted: z.string().min(1, "Hours required"),
  dateCompleted: z.string().min(1, "Date required"),
  certificateUrl: z.string().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────

function getInitials(name?: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function averageScore(appraisals: Appraisal[]) {
  if (!appraisals.length) return 0;
  const total = appraisals.reduce(
    (s, a) => s + a.scorePacing + a.scoreClarity + a.scorePedagogy,
    0,
  );
  return (total / (appraisals.length * 3)).toFixed(1);
}

// ── Page ──────────────────────────────────────────────────────────────

export default function HRPage() {
  const { currentOrg, currentMember } = useOrganization();
  const [activeTab, setActiveTab] = useState("profiles");

  // Tab 1 — Profiles
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [profileSearch, setProfileSearch] = useState("");
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Tab 2 — Appraisals
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [isLoadingAppraisals, setIsLoadingAppraisals] = useState(false);
  const [isAppraisalOpen, setIsAppraisalOpen] = useState(false);
  const [isSubmittingAppraisal, setIsSubmittingAppraisal] = useState(false);

  // Tab 3 — PDU
  const [pduTeacherId, setPduTeacherId] = useState<string>("");
  const [pduLogs, setPduLogs] = useState<PDULog[]>([]);
  const [isLoadingPdu, setIsLoadingPdu] = useState(false);
  const [isPduOpen, setIsPduOpen] = useState(false);
  const [isSubmittingPdu, setIsSubmittingPdu] = useState(false);

  // ── Departments ──────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepts, setIsLoadingDepts] = useState(false);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [isSavingDept, setIsSavingDept] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

  // ── Assignments ─────────────────────────────────────────────────────
  const [assignTarget, setAssignTarget] = useState<TeacherProfile | null>(null);
  const [assignType, setAssignType] = useState<AssignmentTypeOption>("SUBJECT_TEACHER");
  const [assignDeptId, setAssignDeptId] = useState("");
  const [assignClassId, setAssignClassId] = useState("");
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [allClasses, setAllClasses] = useState<Array<{ id: string; name: string; hcoreClassGroupId?: string | null }>>([]);
  const [allSubjects, setAllSubjects] = useState<Array<{ id: string; name: string; code?: string; hcoreSubjectId?: string | null }>>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ profile: TeacherProfile; assignment: MemberAssignmentItem } | null>(null);
  const [isRemovingAssign, setIsRemovingAssign] = useState(false);

  const ASSIGNMENT_LABELS: Record<AssignmentTypeOption, string> = {
    SUBJECT_TEACHER: "Subject Teacher",
    CLASS_TEACHER: "Class Teacher",
    HOD: "Head of Dept",
    ACCOUNTANT: "Accountant",
    LIBRARIAN: "Librarian",
  };

  const ASSIGNMENT_BADGE_STYLES: Record<AssignmentTypeOption, string> = {
    SUBJECT_TEACHER: "bg-blue-50 text-blue-700 border-blue-200",
    CLASS_TEACHER: "bg-purple-50 text-purple-700 border-purple-200",
    HOD: "bg-amber-50 text-amber-700 border-amber-200",
    ACCOUNTANT: "bg-emerald-50 text-emerald-700 border-emerald-200",
    LIBRARIAN: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const { can } = usePermissions();
  const isPrivileged = can("members.manage");

  const profileForm = useForm<z.infer<typeof createProfileSchema>>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      memberId: "",
      trcnNumber: "",
      employeeCode: "",
      dateOfHire: "",
      salaryBase: "",
      bankName: "",
      accountNumber: "",
    },
  });

  const appraisalForm = useForm<z.infer<typeof appraisalSchema>>({
    resolver: zodResolver(appraisalSchema),
    defaultValues: {
      scorePacing: "3",
      scoreClarity: "3",
      scorePedagogy: "3",
      observerNotes: "",
    },
  });

  const pduForm = useForm<z.infer<typeof pduSchema>>({
    resolver: zodResolver(pduSchema),
    defaultValues: {
      activityTitle: "",
      provider: "",
      hoursCompleted: "",
      dateCompleted: format(new Date(), "yyyy-MM-dd"),
      certificateUrl: "",
    },
  });

  // ── Fetch Profiles ─────────────────────────────────────────────────

  useEffect(() => {
    async function fetchProfiles() {
      if (!currentOrg) return;
      try {
        setIsLoadingProfiles(true);
        const data = await apiFetch<TeacherProfile[]>(
          `/hr/${currentOrg.slug}/teachers`,
        );
        setProfiles(data);
      } catch {
        toast.error("Failed to load teacher profiles");
      } finally {
        setIsLoadingProfiles(false);
      }
    }
    fetchProfiles();
  }, [currentOrg]);

  // ── Fetch Members (for create dialog) ──────────────────────────────

  useEffect(() => {
    async function fetchMembers() {
      if (!currentOrg) return;
      try {
        const data = await apiFetch<OrgMember[]>(
          `/organizations/${currentOrg.slug}/members`,
        );
        setMembers(data);
      } catch {
        // silent
      }
    }
    fetchMembers();
  }, [currentOrg]);

  // ── Fetch Appraisals ───────────────────────────────────────────────

  useEffect(() => {
    async function fetchAppraisals() {
      if (!selectedTeacherId || !currentOrg) return;
      try {
        setIsLoadingAppraisals(true);
        const data = await apiFetch<Appraisal[]>(
          `/hr/${currentOrg.slug}/teachers/${selectedTeacherId}/appraisals`,
        );
        setAppraisals(data);
      } catch {
        toast.error("Failed to load appraisals");
      } finally {
        setIsLoadingAppraisals(false);
      }
    }
    fetchAppraisals();
  }, [selectedTeacherId, currentOrg]);

  // ── Fetch PDU Logs ─────────────────────────────────────────────────

  useEffect(() => {
    async function fetchPduLogs() {
      if (!pduTeacherId || !currentOrg) return;
      try {
        setIsLoadingPdu(true);
        const data = await apiFetch<PDULog[]>(
          `/hr/${currentOrg.slug}/teachers/${pduTeacherId}/pdu`,
        );
        setPduLogs(data);
      } catch {
        toast.error("Failed to load PDU logs");
      } finally {
        setIsLoadingPdu(false);
      }
    }
    fetchPduLogs();
  }, [pduTeacherId, currentOrg]);

  // ── Create Profile ─────────────────────────────────────────────────

  async function onCreateProfile(values: z.infer<typeof createProfileSchema>) {
    if (!currentOrg) return;
    setIsCreating(true);
    try {
      const payload: Record<string, unknown> = {
        memberId: values.memberId,
      };
      if (values.trcnNumber) payload.trcnNumber = values.trcnNumber;
      if (values.employeeCode) payload.employeeCode = values.employeeCode;
      if (values.dateOfHire) payload.dateOfHire = values.dateOfHire;
      if (values.salaryBase) payload.salaryBase = parseFloat(values.salaryBase);
      if (values.bankName) payload.bankName = values.bankName;
      if (values.accountNumber) payload.accountNumber = values.accountNumber;

      await apiFetch(
        `/hr/${currentOrg.slug}/teachers`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      // Refresh profiles to get full data
      const data = await apiFetch<TeacherProfile[]>(
        `/hr/${currentOrg.slug}/teachers`,
      );
      setProfiles(data);

      toast.success("Teacher profile created");
      setIsCreateOpen(false);
      profileForm.reset();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create teacher profile",
      );
    } finally {
      setIsCreating(false);
    }
  }

  // ── Submit Appraisal ────────────────────────────────────────────────

  async function onAppraise(values: z.infer<typeof appraisalSchema>) {
    if (!currentOrg || !selectedTeacherId) return;
    setIsSubmittingAppraisal(true);
    try {
      await apiFetch(
        `/hr/${currentOrg.slug}/teachers/${selectedTeacherId}/appraisals`,
        {
          method: "POST",
          body: JSON.stringify({
            scorePacing: parseInt(values.scorePacing),
            scoreClarity: parseInt(values.scoreClarity),
            scorePedagogy: parseInt(values.scorePedagogy),
            observerNotes: values.observerNotes || "",
          }),
        },
      );

      const data = await apiFetch<Appraisal[]>(
        `/hr/${currentOrg.slug}/teachers/${selectedTeacherId}/appraisals`,
      );
      setAppraisals(data);

      toast.success("Appraisal recorded");
      setIsAppraisalOpen(false);
      appraisalForm.reset({
        scorePacing: "3",
        scoreClarity: "3",
        scorePedagogy: "3",
        observerNotes: "",
      });
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit appraisal",
      );
    } finally {
      setIsSubmittingAppraisal(false);
    }
  }

  // ── Submit PDU Log ──────────────────────────────────────────────────

  async function onLogPdu(values: z.infer<typeof pduSchema>) {
    if (!currentOrg || !pduTeacherId) return;
    setIsSubmittingPdu(true);
    try {
      await apiFetch(
        `/hr/${currentOrg.slug}/teachers/${pduTeacherId}/pdu`,
        {
          method: "POST",
          body: JSON.stringify({
            activityTitle: values.activityTitle,
            provider: values.provider,
            hoursCompleted: parseFloat(values.hoursCompleted),
            dateCompleted: values.dateCompleted,
            certificateUrl: values.certificateUrl || undefined,
          }),
        },
      );

      const data = await apiFetch<PDULog[]>(
        `/hr/${currentOrg.slug}/teachers/${pduTeacherId}/pdu`,
      );
      setPduLogs(data);

      toast.success("PDU activity logged");
      setIsPduOpen(false);
      pduForm.reset({
        activityTitle: "",
        provider: "",
        hoursCompleted: "",
        dateCompleted: format(new Date(), "yyyy-MM-dd"),
        certificateUrl: "",
      });
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to log PDU activity",
      );
    } finally {
      setIsSubmittingPdu(false);
    }
  }

  // ── Fetch Departments ──────────────────────────────────────────────

  useEffect(() => {
    async function fetchDepartments() {
      if (!currentOrg) return;
      try {
        setIsLoadingDepts(true);
        const data = await apiFetch<Department[]>(
          `/hr/${currentOrg.slug}/departments`,
        );
        setDepartments(data);
      } catch {
        // silent
      } finally {
        setIsLoadingDepts(false);
      }
    }
    fetchDepartments();
  }, [currentOrg]);

  // ── Fetch Classes & Subjects (for assignment dialog) ───────────────

  useEffect(() => {
    async function fetchRefs() {
      if (!currentOrg) return;
      try {
        const [cls, subs] = await Promise.all([
          apiFetch<Array<{ id: string; name: string; hcoreClassGroupId?: string | null }>>(`/classes/${currentOrg.slug}`),
          apiFetch<Array<{ id: string; name: string; code?: string; hcoreSubjectId?: string | null }>>(`/subjects/${currentOrg.slug}`),
        ]);
        setAllClasses(cls);
        setAllSubjects(subs);
      } catch {
        // silent
      }
    }
    fetchRefs();
  }, [currentOrg]);

  // ── Department CRUD ────────────────────────────────────────────────

  async function onCreateDepartment() {
    if (!currentOrg || !deptName.trim()) return;
    setIsSavingDept(true);
    try {
      const data = await apiFetch<Department>(
        `/hr/${currentOrg.slug}/departments`,
        {
          method: "POST",
          body: JSON.stringify({ name: deptName.trim(), description: deptDesc.trim() || undefined }),
        },
      );
      setDepartments((prev) => [...prev, data]);
      toast.success("Department created");
      setDeptDialogOpen(false);
      setDeptName("");
      setDeptDesc("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create department");
    } finally {
      setIsSavingDept(false);
    }
  }

  async function onDeleteDepartment(dept: Department) {
    if (!currentOrg) return;
    try {
      await apiFetch(`/hr/${currentOrg.slug}/departments`, {
        method: "DELETE",
        body: JSON.stringify({ departmentId: dept.id }),
      });
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
      toast.success("Department deleted");
      setDeptToDelete(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete department");
    }
  }

  // ── Assignment CRUD ────────────────────────────────────────────────
  // Who holds a duty lives in HCORE, so every product agrees: Accountant,
  // Librarian and HOD through the staff-roles API (the same path as
  // Settings → Staff access), class and subject teaching through the
  // teacher-assignments API. Which departments an HOD leads is Hanoled's own.
  // After each change Hanoled re-reads the person from HCORE, so the list
  // below (Hanoled's copy) is current when it reloads.

  // Only classes and subjects linked to HCORE can go into a teaching assignment.
  const ids = useMemo(() => hcoreIds(allClasses, allSubjects), [allClasses, allSubjects]);

  function affiliationOf(profile: TeacherProfile) {
    const affiliationId = profile.member.hcoreAffiliationId;
    if (!affiliationId) {
      throw new Error("This staff member isn't linked to the school directory yet. Try again in a minute.");
    }
    return affiliationId;
  }

  function hodDepartmentIds(profile: TeacherProfile) {
    return (profile.member.memberAssignments ?? []).flatMap((a) =>
      a.type === "HOD" && a.department?.id ? [a.department.id] : [],
    );
  }

  // Apply one change to HCORE's set, first carrying over rows only Hanoled
  // has (written before HCORE owned teaching) so a first edit keeps them.
  async function editTeaching(
    org: { id: string; slug: string },
    profile: TeacherProfile,
    change: (current: Map<string, TeachingAssignmentInput>) => void,
  ) {
    await editTeachingAssignments(org, affiliationOf(profile), (current) => {
      for (const a of profile.member.memberAssignments ?? []) {
        const item = a.hcoreStatus ? null : toHcoreTeaching(a, ids);
        if (item) current.set(teachingKey(item), item);
      }
      change(current);
    });
  }

  async function reloadProfiles(slug: string) {
    setProfiles(await apiFetch<TeacherProfile[]>(`/hr/${slug}/teachers`));
  }

  async function onCreateAssignment() {
    if (!currentOrg || !assignTarget) return;
    const profile = assignTarget;
    const name = profile.member.user.name;
    setIsSavingAssign(true);
    try {
      const affiliationId = affiliationOf(profile);
      if (assignType === "ACCOUNTANT" || assignType === "LIBRARIAN" || assignType === "HOD") {
        await staffAccessApi.setRole(currentOrg.id, affiliationId, assignType, true);
        const { roles } = await staffAccessApi.refreshProjection(currentOrg.slug, affiliationId);
        if (assignType === "HOD" && assignDeptId) {
          // Leading a department needs the HOD role already in Hanoled's copy.
          if (!roles) {
            throw new Error(`${name} is now a Head of Department, but the department couldn't be linked yet. Try again in a minute.`);
          }
          await staffAccessApi.setHodDepartments(
            currentOrg.slug,
            affiliationId,
            [...new Set([...hodDepartmentIds(profile), assignDeptId])],
          );
        }
      } else {
        const classGroupId = ids.classIds.get(assignClassId);
        const subjectId = assignType === "SUBJECT_TEACHER" ? ids.subjectIds.get(assignSubjectId) : null;
        if (!classGroupId) throw new Error("Choose a class");
        if (subjectId === undefined) throw new Error("Choose a subject");
        const added: TeachingAssignmentInput = { classGroupId, subjectId, assignmentType: assignType };
        await editTeaching(currentOrg, profile, (current) => {
          if (current.has(teachingKey(added))) throw new Error(`${name} already has this assignment`);
          current.set(teachingKey(added), added);
        });
      }
      await reloadProfiles(currentOrg.slug);
      toast.success(`${ASSIGNMENT_LABELS[assignType]} role given to ${name}`);
      setAssignDialogOpen(false);
      setAssignTarget(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create assignment");
    } finally {
      setIsSavingAssign(false);
    }
  }

  async function onRemoveAssignment() {
    if (!currentOrg || !removeTarget) return;
    const { profile, assignment } = removeTarget;
    setIsRemovingAssign(true);
    try {
      const affiliationId = affiliationOf(profile);
      const departmentId = assignment.department?.id;
      if (assignment.type === "HOD" && departmentId) {
        // Only this department link ends; they stay Head of Department.
        await staffAccessApi.setHodDepartments(
          currentOrg.slug,
          affiliationId,
          hodDepartmentIds(profile).filter((id) => id !== departmentId),
        );
      } else if (assignment.type === "HOD" || assignment.type === "ACCOUNTANT" || assignment.type === "LIBRARIAN") {
        await staffAccessApi.setRole(currentOrg.id, affiliationId, assignment.type, false);
        await staffAccessApi.refreshProjection(currentOrg.slug, affiliationId);
      } else {
        // A row HCORE can't hold (its class isn't in the directory) is simply
        // left out; the refresh then ends it here too.
        const removed = toHcoreTeaching(assignment, ids);
        await editTeaching(currentOrg, profile, (current) => {
          if (removed) current.delete(teachingKey(removed));
        });
      }
      await reloadProfiles(currentOrg.slug);
      toast.success("Assignment removed");
      setRemoveTarget(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to remove assignment");
    } finally {
      setIsRemovingAssign(false);
    }
  }

  // ── Filtered Profiles ───────────────────────────────────────────────

  const filteredProfiles = useMemo(() => {
    const q = profileSearch.toLowerCase().trim();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const name = p.member.user.name?.toLowerCase() || "";
      const email = p.member.user.email?.toLowerCase() || "";
      const code = p.employeeCode?.toLowerCase() || "";
      const trcn = p.trcnNumber?.toLowerCase() || "";
      return (
        name.includes(q) ||
        email.includes(q) ||
        code.includes(q) ||
        trcn.includes(q)
      );
    });
  }, [profiles, profileSearch]);

  // ── Profile Card ────────────────────────────────────────────────────

  function ProfileCard({
    profile,
    isExpanded,
    onToggle,
  }: {
    profile: TeacherProfile;
    isExpanded: boolean;
    onToggle: () => void;
  }) {
    const { member } = profile;
    const teachingAssignments = member.teachingAssignments || [];
    const memberAssignments = member.memberAssignments || [];
    const avgScore = averageScore(profile.appraisals);
    const totalPduHours = profile.pduLogs.reduce(
      (sum, log) => sum + log.hoursCompleted,
      0,
    );

    return (
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3 transition-colors">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          className="flex min-h-11 items-start justify-between cursor-pointer select-none"
          onClick={onToggle}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggle();
            }
          }}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border border-slate-100 shrink-0">
              <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold text-xs">
                {getInitials(member.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm truncate capitalize">
                {member.user.name}
              </h3>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {member.user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {profile.employeeCode && (
              <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                {profile.employeeCode}
              </span>
            )}
            {profile.trcnNumber && !profile.employeeCode && (
              <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                {profile.trcnNumber}
              </span>
            )}
            <span aria-hidden="true" className="p-1 text-slate-500">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="pt-2 space-y-3 border-t border-slate-50">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {profile.bankName && (
                <span>
                  {profile.bankName}
                  {profile.accountNumber && ` · ${profile.accountNumber}`}
                </span>
              )}
              {profile.salaryBase !== null && profile.salaryBase !== undefined && (
                <span>Salary: ₦{Number(profile.salaryBase).toLocaleString()}</span>
              )}
            </div>

            {profile.dateOfHire && (
              <p className="text-xs text-slate-500">
                Hired: {format(new Date(profile.dateOfHire), "MMM yyyy")}
              </p>
            )}

            <div className="space-y-1.5 pt-1">
              {memberAssignments.map((a) => (
                <div
                  key={a.id}
                  className="bg-blue-50 text-blue-700 text-xs font-medium pl-3 pr-1.5 py-1.5 rounded-xl flex items-center justify-between gap-2"
                >
                  <span>
                    {ASSIGNMENT_LABELS[a.type]}
                    {a.department && ` – ${a.department.name}`}
                    {a.subject && ` – ${a.subject.name}`}
                    {a.classLevel && ` – ${a.classLevel.name}`}
                  </span>
                  {isPrivileged && (
                    <button
                      type="button"
                      aria-label={`Remove ${ASSIGNMENT_LABELS[a.type]}`}
                      className="shrink-0 rounded-lg p-0.5 text-[#1447E6]/70 hover:bg-[#1447E6]/10 hover:text-[#1447E6]"
                      onClick={() => setRemoveTarget({ profile, assignment: a })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {memberAssignments.length === 0 && teachingAssignments.length > 0 && (
                teachingAssignments.map((a, i) => (
                  <div
                    key={i}
                    className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-xl block"
                  >
                    Teacher – {a.subject?.name || "Subject"} – {a.classLevel?.name || "Class"}
                  </div>
                ))
              )}
            </div>

            {/* Quick Stats Row */}
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                Avg {avgScore}/5
              </span>
              <span className="flex items-center gap-1">
                <ClipboardCheck className="h-3.5 w-3.5 text-slate-400" />
                {profile.appraisals.length} appraisal{profile.appraisals.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {totalPduHours}h PDU
              </span>
            </div>

            {isPrivileged && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs"
                  onClick={() => {
                    setAssignTarget(profile);
                    setAssignType("SUBJECT_TEACHER");
                    setAssignDeptId("");
                    setAssignClassId("");
                    setAssignSubjectId("");
                    setAssignDialogOpen(true);
                  }}
                >
                  Assign Role
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────

  if (!currentOrg || !currentMember) return null;

  return (
    <div className="space-y-4 pb-28 md:pb-10">
      <div className="hidden md:block">
        <p className="text-sm text-slate-500 font-medium">Manage teacher profiles, appraisals &amp; PD logs.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 md:h-11 md:grid-cols-4 md:gap-0">
          <TabsTrigger value="profiles" className="flex-1 rounded-xl text-sm font-semibold md:text-xs data-active:bg-white data-active:text-slate-900 data-active:shadow-sm py-2">Profiles</TabsTrigger>
          <TabsTrigger value="departments" className="flex-1 rounded-xl text-sm font-semibold md:text-xs data-active:bg-white data-active:text-slate-900 data-active:shadow-sm py-2">Departments</TabsTrigger>
          <TabsTrigger value="appraisals" className="flex-1 rounded-xl text-sm font-semibold md:text-xs data-active:bg-white data-active:text-slate-900 data-active:shadow-sm py-2">Appraisals</TabsTrigger>
          <TabsTrigger value="pdu" className="flex-1 rounded-xl text-sm font-semibold md:text-xs data-active:bg-white data-active:text-slate-900 data-active:shadow-sm py-2">PD log</TabsTrigger>
        </TabsList>

        {/* TAB 1 — TEACHER PROFILES */}
        <TabsContent value="profiles" className="pt-4 space-y-4">
          <SearchInput
            value={profileSearch}
            onChange={setProfileSearch}
            placeholder="Search by name, email, TRCN..."
          />

          {isPrivileged && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Profile
                </Button>
              </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>Create Teacher Profile</DialogTitle>
                    <DialogDescription>
                      Set up HR profile for a teacher in {currentOrg.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...profileForm}>
                    <form
                      onSubmit={profileForm.handleSubmit(onCreateProfile)}
                      className="space-y-4 py-4"
                    >
                      <FormField
                        control={profileForm.control}
                        name="memberId"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel>Member *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a member" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[280px] sm:min-w-[360px]">
                                {members
                                  .filter((m) => m.role !== "parent")
                                  .map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      <div className="flex flex-col text-left py-0.5 min-w-0">
                                        <span className="font-semibold text-slate-900 text-sm">{m.user.name}</span>
                                        <span className="text-xs text-slate-500 truncate">{m.user.email}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="trcnNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>TRCN Number</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. TRCN/2024/001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="employeeCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Employee Code</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. EMP-001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={profileForm.control}
                        name="dateOfHire"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Hire</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="salaryBase"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Salary (₦)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g. 150000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bank Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Access Bank" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 0123456789" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter className="pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-blue-600"
                          disabled={isCreating}
                        >
                          {isCreating && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create Profile
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}

          {isLoadingProfiles ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="shadow-sm border-slate-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-[180px]" />
                        <Skeleton className="h-4 w-[220px]" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-[300px]" />
                    <Skeleton className="h-4 w-[200px] mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="rounded-lg bg-white p-14 text-center shadow-sm border border-slate-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-800">
                {profileSearch ? "No matches" : "No teacher profiles yet"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {profileSearch
                  ? "Try a different search term."
                  : "Create a teacher profile to track HR information, appraisals, and PDU logs."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProfiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isExpanded={expandedProfile === profile.id}
                  onToggle={() =>
                    setExpandedProfile(
                      expandedProfile === profile.id ? null : profile.id,
                    )
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
           TAB 2 — DEPARTMENTS
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="departments" className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Departments</h3>
              <p className="text-sm text-slate-500">
                Manage academic departments and their heads.
              </p>
            </div>
            {isPrivileged && (
              <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 shrink-0">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Department
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>New Department</DialogTitle>
                    <DialogDescription>
                      Create a new academic department.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Name *</label>
                      <Input
                        placeholder="e.g. Science Department"
                        value={deptName}
                        onChange={(e) => setDeptName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Description</label>
                      <Textarea
                        placeholder="Optional description"
                        rows={2}
                        value={deptDesc}
                        onChange={(e) => setDeptDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>Cancel</Button>
                    <Button
                      className="bg-blue-600"
                      onClick={onCreateDepartment}
                      disabled={isSavingDept || !deptName.trim()}
                    >
                      {isSavingDept && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {isLoadingDepts ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="rounded-lg bg-white p-10 text-center shadow-sm border border-slate-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-semibold text-slate-700">No departments yet</h3>
              <p className="text-sm text-slate-500 mt-1">
                Create departments to organize subjects and assign HODs.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {departments.map((dept) => (
                <Card key={dept.id} className="shadow-sm border-slate-200">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {dept.name}
                        </h4>
                        {dept.description && (
                          <p className="text-sm text-slate-500 mt-1">{dept.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {profiles.filter((p) =>
                              p.member.memberAssignments?.some(
                                (a) => a.department?.id === dept.id,
                              ),
                            ).length}{" "}
                            members
                          </span>
                        </div>
                      </div>
                      {isPrivileged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${dept.name}`}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          onClick={() => setDeptToDelete(dept)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
           TAB 2 — APPRAISALS
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="appraisals" className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-6">
            <div className="w-full sm:w-72">
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Select Teacher
              </label>
              <Select
                value={selectedTeacherId}
                onValueChange={(v) => setSelectedTeacherId(v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a teacher..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.memberId}>
                      {p.member.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTeacherId && isPrivileged && (
              <Dialog open={isAppraisalOpen} onOpenChange={setIsAppraisalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 shrink-0">
                    <Plus className="mr-2 h-4 w-4" />
                    New Appraisal
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>New Appraisal</DialogTitle>
                    <DialogDescription>
                      Rate the teacher on pacing, clarity, and pedagogy (1–5).
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...appraisalForm}>
                    <form
                      onSubmit={appraisalForm.handleSubmit(onAppraise)}
                      className="space-y-6 py-4"
                    >
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={appraisalForm.control}
                          name="scorePacing"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-center block">
                                Pacing
                              </FormLabel>
                              <FormControl>
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="1"
                                    className="w-full"
                                    {...field}
                                  />
                                  <span className="text-lg font-bold text-blue-600">
                                    {field.value}
                                  </span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={appraisalForm.control}
                          name="scoreClarity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-center block">
                                Clarity
                              </FormLabel>
                              <FormControl>
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="1"
                                    className="w-full"
                                    {...field}
                                  />
                                  <span className="text-lg font-bold text-blue-600">
                                    {field.value}
                                  </span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={appraisalForm.control}
                          name="scorePedagogy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-center block">
                                Pedagogy
                              </FormLabel>
                              <FormControl>
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="1"
                                    className="w-full"
                                    {...field}
                                  />
                                  <span className="text-lg font-bold text-blue-600">
                                    {field.value}
                                  </span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={appraisalForm.control}
                        name="observerNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observer Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Optional notes from the observation..."
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter className="pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAppraisalOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-blue-600"
                          disabled={isSubmittingAppraisal}
                        >
                          {isSubmittingAppraisal && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Submit Appraisal
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {!selectedTeacherId ? (
            <div className="rounded-lg bg-white p-14 text-center shadow-sm border border-slate-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardCheck className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-800">
                Select a Teacher
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a teacher from the dropdown to view their appraisals.
              </p>
            </div>
          ) : isLoadingAppraisals ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : appraisals.length === 0 ? (
            <div className="rounded-lg bg-white p-10 text-center shadow-sm border border-slate-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-semibold text-slate-700">
                No appraisals yet
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Click &ldquo;New Appraisal&rdquo; to record the first evaluation.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {appraisals.map((a) => (
                <Card key={a.id} className="shadow-sm border-slate-200">
                  <CardContent className="pt-5">
                    <div className="flex flex-wrap items-center gap-4 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">Pacing:</span>
                        <span className="font-semibold text-slate-900">
                          {a.scorePacing}
                        </span>
                        <span className="text-xs text-slate-500">/5</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Eye className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">Clarity:</span>
                        <span className="font-semibold text-slate-900">
                          {a.scoreClarity}
                        </span>
                        <span className="text-xs text-slate-500">/5</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">Pedagogy:</span>
                        <span className="font-semibold text-slate-900">
                          {a.scorePedagogy}
                        </span>
                        <span className="text-xs text-slate-500">/5</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-auto text-xs",
                          (a.scorePacing + a.scoreClarity + a.scorePedagogy) /
                            3 >=
                            4
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : (a.scorePacing + a.scoreClarity + a.scorePedagogy) /
                                  3 >=
                                3
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200",
                        )}
                      >
                        Avg:{" "}
                        {(
                          (a.scorePacing + a.scoreClarity + a.scorePedagogy) /
                          3
                        ).toFixed(1)}
                      </Badge>
                    </div>
                    {a.observerNotes && (
                      <p className="text-sm text-slate-600 italic bg-slate-50 rounded-lg p-3 mb-2">
                        &ldquo;{a.observerNotes}&rdquo;
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>by {a.evaluator.user.name}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(a.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
           TAB 3 — PROFESSIONAL DEVELOPMENT (PDU)
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="pdu" className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-6">
            <div className="w-full sm:w-72">
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Select Teacher
              </label>
              <Select
                value={pduTeacherId}
                onValueChange={(v) => setPduTeacherId(v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a teacher..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.memberId}>
                      {p.member.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pduTeacherId && isPrivileged && (
              <Dialog open={isPduOpen} onOpenChange={setIsPduOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 shrink-0">
                    <Plus className="mr-2 h-4 w-4" />
                    Log Activity
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>Log Professional Development Activity</DialogTitle>
                    <DialogDescription>
                      Record a PDU activity for this teacher.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...pduForm}>
                    <form
                      onSubmit={pduForm.handleSubmit(onLogPdu)}
                      className="space-y-4 py-4"
                    >
                      <FormField
                        control={pduForm.control}
                        name="activityTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Activity Title *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Workshop on Differentiated Instruction"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={pduForm.control}
                        name="provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provider *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. TRCN, SUBEB, etc."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={pduForm.control}
                          name="hoursCompleted"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hours Completed *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.5"
                                  placeholder="e.g. 3"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={pduForm.control}
                          name="dateCompleted"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date Completed *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={pduForm.control}
                        name="certificateUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Certificate URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://..."
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Link to a certificate or proof of completion.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter className="pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsPduOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-blue-600"
                          disabled={isSubmittingPdu}
                        >
                          {isSubmittingPdu && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Log Activity
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {!pduTeacherId ? (
            <div className="rounded-lg bg-white p-14 text-center shadow-sm border border-slate-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Clock className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-800">
                Select a Teacher
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a teacher from the dropdown to view their professional
                development logs.
              </p>
            </div>
          ) : isLoadingPdu ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : pduLogs.length === 0 ? (
            <div className="rounded-lg bg-white p-10 text-center shadow-sm border border-slate-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-semibold text-slate-700">
                No PDU logs yet
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Click &ldquo;Log Activity&rdquo; to record professional development hours.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pduLogs.map((log) => (
                <Card key={log.id} className="shadow-sm border-slate-200">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-slate-900 text-sm">
                          {log.activityTitle}
                        </h4>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {log.provider}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 shrink-0 ml-3"
                      >
                        {log.hoursCompleted}h
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(
                          new Date(log.dateCompleted),
                          "MMM d, yyyy",
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {log.certificateUrl && (
                          <a
                            href={log.certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <FileText className="h-3 w-3" />
                            Certificate
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Assign Role Dialog ──────────────────────────────────────── */}
      <Dialog open={assignDialogOpen} onOpenChange={(o) => { if (!o) setAssignTarget(null); setAssignDialogOpen(o); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              {assignTarget ? `Assign a role to ${assignTarget.member.user.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Role Type *</label>
              <Select
                value={assignType}
                onValueChange={(v) => setAssignType(v as AssignmentTypeOption)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSIGNMENT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assignType === "HOD" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Department</label>
                <Select value={assignDeptId} onValueChange={(v) => setAssignDeptId(v as string)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(assignType === "CLASS_TEACHER" || assignType === "SUBJECT_TEACHER") && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Class Level *</label>
                <Select value={assignClassId} onValueChange={(v) => setAssignClassId(v as string)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assigned class" />
                  </SelectTrigger>
                  <SelectContent>
                    {allClasses.filter((c) => ids.classIds.has(c.id)).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignType === "SUBJECT_TEACHER" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Subject *</label>
                <Select value={assignSubjectId} onValueChange={(v) => setAssignSubjectId(v as string)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assigned subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSubjects.filter((s) => ids.subjectIds.has(s.id)).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.code ? ` (${s.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(assignType === "ACCOUNTANT" || assignType === "LIBRARIAN") && (
              <div className="rounded-xl bg-blue-50/70 p-3 border border-blue-100 text-xs text-blue-700 font-medium">
                {assignType === "ACCOUNTANT"
                  ? "This member will gain access to fee structures, payment records, and financial management tools."
                  : "This member will gain access to library cataloging, book issuance, and resource inventory tools."}
              </div>
            )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignDialogOpen(false); setAssignTarget(null); }}>
              Cancel
            </Button>
            <Button className="bg-blue-600" onClick={onCreateAssignment} disabled={isSavingAssign}>
              {isSavingAssign && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Assignment Confirm ───────────────────────────────── */}
      <Dialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Remove Assignment</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `Remove ${ASSIGNMENT_LABELS[removeTarget.assignment.type]} from ${removeTarget.profile.member.user.name}?`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={onRemoveAssignment}
              disabled={isRemovingAssign}
            >
              {isRemovingAssign && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Department Confirm ───────────────────────────────── */}
      <Dialog open={!!deptToDelete} onOpenChange={(o) => { if (!o) setDeptToDelete(null); }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deptToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDeptToDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deptToDelete && onDeleteDepartment(deptToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
