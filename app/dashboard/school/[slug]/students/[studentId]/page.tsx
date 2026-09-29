"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Fingerprint, Loader2, XCircle, CheckCircle2, Hotel, Bus, UserRound, Mail, Phone, Star } from "lucide-react";
import { toast } from "sonner";

import { StudentAcademicRecord } from "@/components/dashboard/student-academic-record";
import { ResetPasswordButton } from "@/components/dashboard/ResetPasswordButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { DataStateCard } from "@/components/dashboard/shared";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch, isForbiddenError } from "@/lib/api";
import { parseRouteParam } from "@/lib/spreadsheets";
import {
  StudentPerformanceResponse,
  StudentPerformanceSubject,
} from "@/lib/student-performance";

type StudentAttendanceResponse = {
  student: { id: string; firstName: string; lastName: string; admissionNumber?: string };
  stats: { total: number; present: number; absent: number; excused: number; late: number; attendanceRate: number };
  records: { id: string; date: string; status: "present" | "absent" | "excused" | "late" }[];
};

type HostelAllocation = {
  room: { id: string; name: string; roomNumber: string };
};
type BusAssignment = {
  route: { id: string; name: string };
};
type StudentProfile = {
  id: string;
  firstName: string;
  lastName: string;
  hcoreLearnerId?: string | null;
  studentType?: string;
  usesBus?: boolean;
  hostelAllocation?: HostelAllocation | null;
  busAssignment?: BusAssignment | null;
};

type StudentGuardian = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  relationship?: string;
  isPrimary: boolean;
  studentId: string;
};

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const studentId = parseRouteParam(params.studentId);

  const [attendance, setAttendance] = useState<StudentAttendanceResponse | null>(null);
  const [showGatingModal, setShowGatingModal] = useState(false);
  const [gateError, setGateError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [serialNumber, setSerialNumber] = useState("");
  const [pin, setPin] = useState("");
  const [performance, setPerformance] =
    useState<StudentPerformanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceForbidden, setPerformanceForbidden] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [guardians, setGuardians] = useState<StudentGuardian[]>([]);
  const [guardiansLoading, setGuardiansLoading] = useState(true);

  const handleVerifyCard = useCallback(async () => {
    if (!currentOrg || !studentId || !serialNumber || !pin) return;
    setIsVerifying(true);
    setGateError("");
    try {
      await apiFetch(
        `/scratch-cards/${currentOrg.slug}/verify-card`,
        {
          method: "POST",
          body: JSON.stringify({ serialNumber, pin, studentId }),
          headers: { "Content-Type": "application/json" },
        },
      );
      toast.success("Card activated! Loading your results...");
      setShowGatingModal(false);
      setSerialNumber("");
      setPin("");
      fetchPerformance();
    } catch (error) {
      setGateError(
        error instanceof Error ? error.message : "Verification failed",
      );
    } finally {
      setIsVerifying(false);
    }
  }, [currentOrg, studentId, serialNumber, pin]);

  const fetchPerformance = useCallback(async () => {
    if (!currentOrg || !studentId) {
      return;
    }

    try {
      setIsLoading(true);
      setPerformanceForbidden(false);
      const [perfData, attData, profData, guardData] = await Promise.all([
        apiFetch<StudentPerformanceResponse>(
          `/students/${currentOrg.slug}/${studentId}/results`,
        ),
        apiFetch<StudentAttendanceResponse>(
          `/attendance/${currentOrg.slug}/student/${studentId}?month=${new Date().toISOString().slice(0, 7)}`,
        ).catch(() => null),
        apiFetch<StudentProfile>(
          `/students/${currentOrg.slug}/${studentId}`,
        ).catch(() => null),
        apiFetch<StudentGuardian[]>(
          `/students/${currentOrg.slug}/${studentId}/guardians`,
        ).catch(() => []),
      ]);
      setPerformance(perfData);
      setAttendance(attData);
      setStudentProfile(profData);
      setGuardians(guardData);
    } catch (error) {
      const err = error as { status?: number; message?: string };
      const isAdminUser = currentMember?.role === "owner" || currentMember?.role === "admin";
      if (err.status === 402 && !isAdminUser) {
        setShowGatingModal(true);
      } else if (isForbiddenError(error)) {
        setPerformanceForbidden(true);
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load student record",
        );
      }
    } finally {
      setIsLoading(false);
      setProfileLoading(false);
    }
  }, [currentOrg, studentId]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const canEditProfile =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:gap-5 md:px-6 md:py-4 lg:px-8">
        <div className={canEditProfile ? "flex items-center justify-between gap-3" : "hidden items-center justify-between gap-3 md:flex"}>
          <div className="flex w-full items-center gap-3 md:w-auto">
            {/* Phones already have a back target in the top bar */}
            <Button
              variant="ghost"
              className="hidden h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-slate-700 shadow-sm hover:bg-white md:inline-flex"
              onClick={() =>
                router.push(`/dashboard/school/${currentOrg?.slug}/students`)
              }
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Students
            </Button>

            {canEditProfile && (
              <Button
                variant="ghost"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-slate-700 shadow-sm hover:bg-white md:w-auto"
                onClick={() =>
                  router.push(
                    `/dashboard/school/${currentOrg?.slug}/students/${studentId}/edit`,
                  )
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}

            {canEditProfile && currentOrg && studentProfile?.hcoreLearnerId && (
              <ResetPasswordButton
                orgId={currentOrg.id}
                target={{ learnerId: studentProfile.hcoreLearnerId }}
                personName={`${studentProfile.firstName} ${studentProfile.lastName}`.trim()}
                signInHint="their admission number"
              />
            )}
          </div>
        </div>

        {/* Student Type & Accommodation Info */}
        {!profileLoading && studentProfile && (
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-3 sm:p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">Type:</span>
                </div>
                <Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-700">
                  <Hotel className="mr-1 h-3 w-3" />
                  {studentProfile.studentType === "boarding" ? "Boarding" : "Day"}
                </Badge>

                {studentProfile.studentType === "boarding" && studentProfile.hostelAllocation?.room && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-slate-600 sm:ml-2">
                      <Hotel className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">Room:</span>
                    </div>
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                      {studentProfile.hostelAllocation.room.name} - {studentProfile.hostelAllocation.room.roomNumber}
                    </Badge>
                  </>
                )}

                {studentProfile.usesBus && studentProfile.busAssignment?.route && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-slate-600 sm:ml-2">
                      <Bus className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">Bus:</span>
                    </div>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                      <Bus className="mr-1 h-3 w-3" />
                      {studentProfile.busAssignment.route.name}
                    </Badge>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guardians */}
        {!guardiansLoading && guardians.length > 0 && (
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                <UserRound className="h-4 w-4 text-slate-400" />
                Guardians / Parents
              </h3>
              <div className="space-y-3">
                {guardians.map((g) => (
                  <div key={g.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                      {g.firstName.charAt(0)}{g.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 capitalize">
                          {g.firstName} {g.lastName}
                        </p>
                        {g.isPrimary && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-1.5 py-0">
                            <Star className="mr-0.5 h-3 w-3" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      {g.relationship && (
                        <p className="mt-0.5 text-xs capitalize text-slate-500">{g.relationship}</p>
                      )}
                      {/* One tap to call or email — the reason anyone opens this on a phone */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {g.phone && (
                          <a
                            href={`tel:${g.phone.replace(/\s+/g, "")}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:border-blue-200 hover:text-blue-700"
                          >
                            <Phone className="h-4 w-4 text-blue-600" />
                            {g.phone}
                          </a>
                        )}
                        {g.email && (
                          <a
                            href={`mailto:${g.email}`}
                            className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:border-blue-200 hover:text-blue-700"
                          >
                            <Mail className="h-4 w-4 shrink-0 text-blue-600" />
                            <span className="truncate">{g.email}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
          </div>
        ) : performance ? (
          <StudentAcademicRecord
            student={performance.student}
            subjects={performance.subjects}
            attendance={attendance || undefined}
            eyebrow="Student Record"
            description="A full academic snapshot for this learner, including subject performance and assessment breakdowns."
            actionLabel="Jump to Subjects"
            emptyTitle="No subject records available"
            emptyDescription="This student has no published subject spreadsheets yet."
            onOpenSubject={(subject: StudentPerformanceSubject) =>
              router.push(
                `/dashboard/school/${currentOrg?.slug}/subjects/${subject.subject?.id || subject.spreadsheetId}`,
              )
            }
          />
        ) : performanceForbidden ? (
          <DataStateCard
            variant="forbidden"
            title="You don't have access to this student's record"
            description="This student isn't in a class or subject assigned to you."
          />
        ) : (
          <DataStateCard
            variant="error"
            title="Student record unavailable"
            description="We could not load the academic record for this student right now."
          />
        )}
      </div>

      {/* ── Result Gating Modal ───────────────────────────────────── */}
      <Dialog open={showGatingModal} onOpenChange={setShowGatingModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
              <Fingerprint className="h-7 w-7 text-blue-600" />
            </div>
            <DialogTitle className="text-center text-xl pt-3">
              Access Your Results
            </DialogTitle>
            <DialogDescription className="text-center">
              Enter your Scratch Card serial number and PIN to unlock this
              term&apos;s academic record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Serial Number
              </label>
              <Input
                placeholder="e.g. HNA3F8C2B1"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                PIN
              </label>
              <Input
                type="password"
                placeholder="Enter 10-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="font-mono tracking-widest"
              />
            </div>

            {gateError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                <XCircle className="h-4 w-4 shrink-0" />
                {gateError}
              </div>
            )}

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleVerifyCard}
              disabled={isVerifying || !serialNumber || !pin}
            >
              {isVerifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Verify & Unlock
            </Button>

            <p className="text-center text-xs text-slate-500">
              Don&apos;t have a card?{" "}
              <button
                type="button"
                onClick={() => setShowGatingModal(false)}
                className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
              >
                Go back
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
