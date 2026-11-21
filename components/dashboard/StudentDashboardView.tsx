"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { cbtApi } from "@/lib/api-cbt";
import { examStartHref, pendingSchoolExams } from "@/lib/student-pending-exams";
import type { AssignedExam } from "@/components/cbt/ExamCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeGreeting, StatStrip } from "@/components/dashboard/mobile/HomeKit";
import {
  FileText,
  Clock,
  CalendarDays,
  BarChart3,
  BookOpen,
  ChevronRight,
  GraduationCap,
  Loader2,
  AlertCircle,
  BookMarked,
  Library,
  BookText,
} from "lucide-react";

type DashboardData = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber?: string | null;
    classLevel?: { id: string; name: string } | null;
  };
  stats: {
    totalAssessments: number;
    averagePercentage: number | null;
    pendingExams: number;
    attendancePercent: number | null;
  };
  todayTimetable: Array<{
    id: string;
    startTime: string;
    endTime: string;
    subject: string;
    subjectCode?: string | null;
    teacher?: string | null;
    room?: string | null;
  }>;
  pendingExams: AssignedExam[];
};

type StudyMaterial = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string | null;
  tags: string[];
  subject: { id: string; name: string } | null;
  uploadedBy: { user: { name: string } } | null;
  createdAt: string;
};

export function StudentDashboardView({ orgSlug }: { orgSlug: string }) {
  const { user } = useAuth();
  const { currentStudent } = useOrganization();
  const [data, setData] = useState<DashboardData | null>(null);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);
        // The dashboard, HCBT's assigned exams and the study materials don't
        // depend on each other, so they load together. A school without HCBT
        // (or an HCBT outage) just shows no pending exams.
        const [result, assigned, classMaterials, generalMaterials] = await Promise.all([
          apiFetch<DashboardData>(`/student/${orgSlug}/dashboard`),
          cbtApi
            .getAssignedExams(orgSlug)
            .catch(() => null) as Promise<{ schoolExams?: AssignedExam[] } | null>,
          currentStudent?.classLevel?.id
            ? apiFetch<StudyMaterial[]>(`/${orgSlug}/study-materials`, {
                params: { classLevelId: currentStudent.classLevel.id },
              }).catch(() => [])
            : Promise.resolve([]),
          apiFetch<StudyMaterial[]>(`/${orgSlug}/study-materials`, {
            params: { general: true },
          }).catch(() => []),
        ]);
        const pendingExams = pendingSchoolExams(assigned?.schoolExams ?? []);
        setData({ ...result, pendingExams, stats: { ...result.stats, pendingExams: pendingExams.length } });
        setStudyMaterials([...classMaterials, ...generalMaterials]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [orgSlug]);



  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="m-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 mb-4">
          <AlertCircle className="h-8 w-8 text-rose-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          Failed to load dashboard
        </h2>
        <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="border-blue-200 text-blue-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const firstName = user?.name?.split(" ")[0] || data.student.firstName;
  const stats = data.stats;
  const todayTimetable = data.todayTimetable || [];
  const pendingExams = data.pendingExams || [];

  return (
    <div className="space-y-6">
      {/* Phones: the same greeting and stat strip every role's home uses */}
      <div className="space-y-4 md:hidden">
        <HomeGreeting name={firstName} detail={data.student.classLevel?.name} />
        <StatStrip
          stats={[
            { key: "avg", label: "CBT average", value: stats.averagePercentage !== null ? `${stats.averagePercentage}%` : "—" },
            { key: "pending", label: "Exams due", value: stats.pendingExams ?? 0 },
            { key: "attendance", label: "Attendance", value: stats.attendancePercent !== null ? `${stats.attendancePercent}%` : "—" },
          ]}
        />
      </div>

      {/* Desktop welcome header */}
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, <span className="capitalize">{firstName}</span>
        </h1>
        {data.student.classLevel?.name && (
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 mt-2">
            {data.student.classLevel.name}
          </span>
        )}
      </div>

      {/* Stats Cards - desktop */}
      <div className="m-stagger hidden gap-3 md:grid md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500">
              Assessments
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-950">
              {stats.totalAssessments}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total completed</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500">
              Avg Score
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <BarChart3 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-950">
              {stats.averagePercentage !== null
                ? `${stats.averagePercentage}%`
                : "—"}
            </div>
            <p className="text-xs text-slate-500 mt-1">CBT exam average</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500">
              Pending Exams
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-950">
              {stats.pendingExams ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Awaiting you</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500">
              Attendance
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-950">
              {stats.attendancePercent !== null
                ? `${stats.attendancePercent}%`
                : "—"}
            </div>
            <p className="text-xs text-slate-500 mt-1">Present rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card className="shadow-sm border border-slate-100/80 rounded-2xl bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Today&apos;s Schedule</CardTitle>
          </div>
          <Link href={`/dashboard/school/${orgSlug}/student/timetable`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#1447E6] hover:text-[#1447E6] hover:bg-[#EEF0FF]/70 font-bold text-xs flex items-center p-0 cursor-pointer"
            >
              Full Timetable
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {todayTimetable.length > 0 ? (
            <div className="space-y-2">
              {todayTimetable.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-[#1447E6]">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {slot.subject}
                      </p>
                      <p className="text-xs text-slate-500">
                        {slot.teacher || "No teacher assigned"}
                        {slot.room && ` · Room ${slot.room}`}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold bg-[#EEF0FF] text-[#1447E6] px-2.5 py-1 rounded-lg">
                    {slot.startTime} – {slot.endTime}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 font-medium">
              No classes scheduled today
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pending Exams */}
      {pendingExams.length > 0 && (
        <Card className="shadow-sm border border-slate-100/80 rounded-2xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Pending Exams</CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium mt-0.5">
                {pendingExams.length} exam{pendingExams.length !== 1 ? "s" : ""} waiting for you
              </CardDescription>
            </div>
            <Link href={`/dashboard/school/${orgSlug}/student/pending`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#1447E6] hover:text-[#1447E6] hover:bg-[#EEF0FF]/70 font-bold text-xs flex items-center p-0 cursor-pointer"
              >
                View All
                <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingExams.slice(0, 3).map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50/70 border border-slate-100 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {exam.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {exam.totalQuestions} questions · {exam.duration} min · Pass mark: {exam.passMark}%
                    </p>
                  </div>
                  <Link
                    href={examStartHref(exam.id)}
                    className="shrink-0 ml-3"
                  >
                    <Button
                      size="sm"
                      className="bg-[#1447E6] hover:bg-[#1447E6]/90 text-white font-bold text-xs px-4 py-2 rounded-xl h-9 cursor-pointer shadow-sm"
                    >
                      {exam.myResult?.status === "started" ? "Resume" : "Start"}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-950 mt-6 mb-2 block">
          Quick links
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            href={`/dashboard/school/${orgSlug}/student/homework`}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-950">Homework</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Class assignments & submissions
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </Link>

          <Link
            href={`/dashboard/school/${orgSlug}/student/scheme-of-work`}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 shrink-0">
                <BookText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-950">Scheme of Work</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Weekly syllabus for your subjects
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </Link>

          <Link
            href={`/dashboard/school/${orgSlug}/student/results`}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#1447E6] shrink-0">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-950">My Results</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  View all assessment scores
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </Link>

          <Link
            href={`/dashboard/school/${orgSlug}/student/timetable`}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#1447E6] shrink-0">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-950">Timetable</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Weekly class schedule
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </Link>

          <Link
            href={`/dashboard/school/${orgSlug}/student/library`}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#1447E6] shrink-0">
                <BookMarked className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-950">Library</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Browse books and request loans
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </Link>
        </div>
      </div>

      {/* Study Materials */}
      {studyMaterials.length > 0 && (
        <Card className="shadow-sm border border-slate-100">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-slate-950">Study Materials</CardTitle>
            <CardDescription className="text-xs text-slate-500 font-semibold mt-0.5">
              Resources uploaded by your teachers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {studyMaterials.slice(0, 6).map((material) => (
                <a
                  key={material.id}
                  href={material.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-[#1447E6]">
                    <Library className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-950 truncate">
                      {material.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                      {material.subject?.name}
                      {material.uploadedBy?.user?.name && ` · by ${material.uploadedBy.user.name}`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </a>
              ))}
            </div>
            {studyMaterials.length > 6 && (
              <p className="text-xs text-slate-500 mt-3 text-center font-medium">
                + {studyMaterials.length - 6} more material{studyMaterials.length - 6 !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}