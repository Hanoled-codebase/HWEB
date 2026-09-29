"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cbtApi } from "@/lib/api-cbt";
import { EDGE_MODE } from "@/lib/api";
import { signOutEverywhere } from "@/lib/sign-out";
import { useExamStore } from "@/store/exam";
import { startSyncWorker } from "@/lib/cbt-sync";
import { useExamDeviceStatus, isExamCapableScreen } from "@/hooks/useExamDevice";
import { ExamDeviceNotice, ExamDeviceBanner } from "@/components/cbt/ExamDeviceNotice";
import { CbtMobileTopBar, CbtGreeting, CbtAccountSheet } from "@/components/cbt/CbtMobileChrome";
import { MobileSegmentBar } from "@/components/dashboard/mobile/MobileSegmentBar";
import { ExamCard, type AssignedExam } from "@/components/cbt/ExamCard";
import { Clock, FileText, PlayCircle, Loader2, CheckCircle2, Info, School, AlertCircle, BookOpen, ChevronLeft, ChevronRight, History, Key } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/ui/Logo";

interface PastResult {
  id: string;
  studentId: string;
  examId: string;
  score: number | null;
  totalMarks: number;
  percentage: number | null;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  timeTaken: number | null;
  resultsReleased?: boolean;
  exam: {
    title: string;
    examType: string;
    passMark: number;
    duration: number;
  };
}

export default function StudentDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setSession = useExamStore((state) => state.setSession);
  const examDevice = useExamDeviceStatus();
  const [showDeviceNotice, setShowDeviceNotice] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  // Read organization slug from query params, fallback to default for dev
  const orgSlug = searchParams.get("orgSlug") || "hanoled-default";

  // State Management
  const [activeTab, setActiveTab] = useState<"assigned" | "history" | "practice">("assigned");
  const [schoolExams, setSchoolExams] = useState<AssignedExam[]>([]);
  const [ssceExams, setSsceExams] = useState<AssignedExam[]>([]);
  const [history, setHistory] = useState<PastResult[]>([]);
  const [schoolName, setSchoolName] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [startingExamId, setStartingExamId] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  // The learner's own school, once known: "Back to Suite" returns there instead of the generic hub.
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const suiteHref = schoolSlug ? `/dashboard/school/${schoolSlug}` : "/welcome";

  // Selected Exam for Start Modal
  const [selectedExam, setSelectedExam] = useState<AssignedExam | null>(null);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  // Practice Simulator Parameters States
  const [practiceBoard, setPracticeBoard] = useState<string>("jamb");
  const [practiceSubject, setPracticeSubject] = useState("");
  const [practiceYearMode, setPracticeYearMode] = useState<"random" | "specific">("random");
  const [practiceYear, setPracticeYear] = useState("");
  const [practiceQuestionCount, setPracticeQuestionCount] = useState<number>(30);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [yearsList, setYearsList] = useState<number[]>([]);
  const [fetchingPracticeSubjects, setFetchingPracticeSubjects] = useState(false);
  const [fetchingPracticeYears, setFetchingPracticeYears] = useState(false);
  const [initializingPractice, setInitializingPractice] = useState(false);

  // An exam submitted offline sends the student here, so keep flushing the
  // offline queue on this page too, not only inside the exam room.
  useEffect(() => startSyncWorker(), []);

  // Fetch subjects list dynamically for practice tab
  useEffect(() => {
    if (activeTab === "practice" && subjectsList.length === 0) {
      const loadSubjects = async () => {
        setFetchingPracticeSubjects(true);
        try {
          const res = await cbtApi.getSubjects();
          setSubjectsList(res.subjects || res || []);
        } catch (err: any) {
          toast.error("Failed to load past subjects list: " + err.message);
        } finally {
          setFetchingPracticeSubjects(false);
        }
      };
      loadSubjects();
    }
  }, [activeTab, subjectsList.length]);

  const handlePracticeSubjectChange = async (subjectName: string) => {
    setPracticeSubject(subjectName);
    setPracticeYear("");
    setYearsList([]);
    if (!subjectName || practiceYearMode === "random") return;

    setFetchingPracticeYears(true);
    try {
      const res = await cbtApi.getYears(subjectName);
      setYearsList(res.years || res || []);
    } catch (err: any) {
      toast.error("Failed to load years list: " + err.message);
    } finally {
      setFetchingPracticeYears(false);
    }
  };

  const handlePracticeYearModeChange = async (mode: "random" | "specific") => {
    setPracticeYearMode(mode);
    setPracticeYear("");
    if (mode === "specific" && practiceSubject) {
      setFetchingPracticeYears(true);
      try {
        const res = await cbtApi.getYears(practiceSubject);
        setYearsList(res.years || res || []);
      } catch (err: any) {
        toast.error("Failed to load years list: " + err.message);
      } finally {
        setFetchingPracticeYears(false);
      }
    }
  };

  // Trigger practice simulator
  const handleStartPracticeNow = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isExamCapableScreen()) {
      setShowDeviceNotice(true);
      return;
    }
    if (!practiceSubject) {
      toast.error("Please select a subject to practice.");
      return;
    }

    setInitializingPractice(true);
    toast.info(`Fetching ${practiceSubject} questions from ${practiceBoard.toUpperCase()} bank...`);

    try {
      const yearNum = practiceYearMode === "specific" && practiceYear ? Number(practiceYear) : undefined;
      const questionsRes = await cbtApi.fetchPastQuestions(practiceSubject, practiceBoard, yearNum);
      const rawQuestions = Array.isArray(questionsRes?.questions) ? questionsRes.questions : [];

      if (rawQuestions.length === 0) {
        toast.error("No questions found for the selected criteria. Try another subject or year.");
        return;
      }

      // Normalize past questions
      const normalizedQuestions = rawQuestions.map((q: any, index: number) => {
        const options = Array.isArray(q.options) ? q.options : [
          q.option_a || q.optionA || q.a,
          q.option_b || q.optionB || q.b,
          q.option_c || q.optionC || q.c,
          q.option_d || q.optionD || q.d
        ].map((o) => String(o || "").trim()).filter(Boolean);

        const answerMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
        let correctAnswer = 0;
        if (typeof q.answer === "string") {
          correctAnswer = answerMap[q.answer.trim().toLowerCase()] ?? 0;
        } else if (typeof q.answer === "number") {
          correctAnswer = q.answer;
        } else if (q.correctAnswer !== undefined) {
          correctAnswer = q.correctAnswer;
        }

        return {
          id: q.id ? String(q.id) : `practice-q-${index}-${Math.random()}`,
          text: q.question || q.question_text || q.text || "",
          options: options.length >= 2 ? options : ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer,
          explanation: q.explanation || q.solution || null,
          marks: 1
        };
      });

      const practiceSession = {
        examResultId: "practice",
        exam: {
          id: "practice",
          title: `${practiceBoard.toUpperCase()} ${practiceSubject} Simulator`,
          duration: practiceQuestionCount === 60 ? 90 : 45, // mins
          totalQuestions: normalizedQuestions.length,
          passMark: 50,
        },
        questions: normalizedQuestions,
        startedAt: new Date().toISOString(),
      };

      setSession(practiceSession);
      toast.success("Practice simulation loaded! Redirecting to exam room...");
      router.push("/cbt/student/exam/practice");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to query past questions proxy API.");
    } finally {
      setInitializingPractice(false);
    }
  };

  // Handle Complete Sign Out
  const handleSignOut = async () => {
    try {
      localStorage.removeItem("hanoled_student_school_slug");
      localStorage.removeItem("hanoled_auth_user");
    } catch {
      // Storage unavailable (private mode): nothing was saved there.
    }
    await signOutEverywhere();
  };

  // Load Data
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setAuthError(false);
      try {
        let activeSlug = orgSlug;
        if (!activeSlug || activeSlug === "hanoled-default") {
          const savedSlug = typeof window !== "undefined" ? localStorage.getItem("hanoled_student_school_slug") : null;
          if (savedSlug && savedSlug !== "hanoled-default") {
            activeSlug = savedSlug;
          }
        }

        // Check Auth and get organization profile
        try {
          const authData = await cbtApi.checkAuth();
          if (authData?.organization?.slug) {
            activeSlug = authData.organization.slug;
            if (typeof window !== "undefined") {
              localStorage.setItem("hanoled_student_school_slug", activeSlug);
            }
          }
          if (authData?.organization?.name) {
            setSchoolName(authData.organization.name);
          }
          if (authData?.user?.name) {
            setStudentName(authData.user.name);
          }
        } catch (authErr: any) {
          console.warn("Auth check warning:", authErr.message);
        }

        const targetSlug = activeSlug && activeSlug !== "hanoled-default" ? activeSlug : "jobinhood";
        if (activeSlug && activeSlug !== "hanoled-default") setSchoolSlug(activeSlug);

        // Fetch assigned exams
        const examsData = await cbtApi.getAssignedExams(targetSlug);
        const validSchoolExams = (examsData?.schoolExams || []).filter((e: any) => e._count?.questions > 0 || e.questionsCount > 0 || true);
        const validSsceExams = (examsData?.ssceExams || []).filter((e: any) => e._count?.questions > 0 || e.questionsCount > 0 || true);
        setSchoolExams(validSchoolExams);
        setSsceExams(validSsceExams);

        // Auto-select and open instructions modal if direct exam link was used
        const targetExamId = searchParams.get("examId");
        if (targetExamId) {
          const allExams = [...validSchoolExams, ...validSsceExams];
          const matchedExam = allExams.find((e: any) => e.id === targetExamId);
          if (matchedExam && !isExamCapableScreen()) {
            setShowDeviceNotice(true);
          } else if (matchedExam) {
            setSelectedExam(matchedExam);
            setIsStartModalOpen(true);
            toast.info(`Assessment "${matchedExam.title}" opened. Click "Start Examination" to begin.`);
          }
        }

        // Fetch history
        const historyData = await cbtApi.getStudentHistory(targetSlug);
        setHistory(historyData || []);
      } catch (err: any) {
        console.error("Dashboard Loading Error:", err);
        if (err.message?.includes("403") || err.message?.includes("401") || err.message?.includes("Student access required")) {
          setAuthError(true);
        } else {
          toast.error(err.message || "Failed to load dashboard data. Please make sure the backend is running.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [orgSlug]);

  // Open Instructions Modal
  const handleInitiateStart = (exam: AssignedExam) => {
    if (!isExamCapableScreen()) {
      setShowDeviceNotice(true);
      return;
    }
    setSelectedExam(exam);
    setPasskeyInput("");
    setPasskeyError(null);
    setIsStartModalOpen(true);
  };

  // Trigger Start Exam
  const handleStartExamNow = async () => {
    if (!selectedExam) return;
    if (!isExamCapableScreen()) {
      setIsStartModalOpen(false);
      setShowDeviceNotice(true);
      return;
    }
    if (selectedExam.passkeyRequired && !passkeyInput.trim()) {
      setPasskeyError("Enter the exam passkey to continue.");
      return;
    }
    setPasskeyError(null);

    setStartingExamId(selectedExam.id);
    toast.info(`Initializing "${selectedExam.title}"... Please do not close this window.`);

    try {
      // Call startExam API (sets status to 'started' and generates questions)
      const session = await cbtApi.startExam(selectedExam.id, passkeyInput.trim() || undefined);

      // Store session in our persisted Zustand store
      setSession(session);
      setIsStartModalOpen(false);

      toast.success("Exam started successfully! Redirecting to exam room...");

      // Redirect to full-screen exam interface
      router.push(`/cbt/student/exam/${selectedExam.id}`);
    } catch (err: any) {
      console.error("Failed to start exam:", err);
      if (err.code === "DEVICE_NOT_ALLOWED") {
        // The server judged this a phone even though the screen check passed.
        setIsStartModalOpen(false);
        setShowDeviceNotice(true);
      } else if (err.code === "INVALID_PASSKEY" || err.code === "PASSKEY_NOT_ASSIGNED") {
        setPasskeyError(err.message || "Incorrect passkey.");
      } else {
        toast.error(err.message || "Could not start exam. Please try again.");
      }
      setStartingExamId(null);
    }
  };

  // View corrections/result helper
  const handleViewResult = (examId: string) => {
    router.push(`/cbt/student/exam/${examId}/result`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B1220] flex flex-col font-sans">
      {showDeviceNotice && <ExamDeviceNotice onClose={() => setShowDeviceNotice(false)} />}

      {/* Header with Canonical Logo — brand + actions stay on one row on
          every viewport (never pushed off-screen); the school-name pill
          gets its own full-width row below on mobile, where it has enough
          room to show the whole name instead of clipping mid-word. */}
      <CbtMobileTopBar roleLabel="Student" name={studentName} onOpenAccount={() => setAccountOpen(true)} />
      <CbtAccountSheet
        open={accountOpen}
        onOpenChange={setAccountOpen}
        name={studentName}
        roleLabel="Student"
        school={schoolName}
        suiteHref={EDGE_MODE ? undefined : suiteHref}
        onSignOut={handleSignOut}
      />
      <header className="hidden sm:block sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-2">
            <Logo className="w-7 h-7 sm:w-8 sm:h-8" size="sm" badgeText="STUDENT" textColor="text-[#0B1220]" />

            <div className="hidden sm:flex items-center gap-2.5 min-w-0">
              {studentName && (
                <span className="text-sm font-semibold text-[#0B1220] truncate">{studentName}</span>
              )}
              <div className="flex items-center space-x-2 bg-blue-50/80 px-3.5 py-1.5 rounded-full border border-blue-200/80 min-w-0">
                <School className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-blue-900 truncate">
                  {schoolName || (orgSlug !== "hanoled-default" ? orgSlug.replace("-", " ").toUpperCase() : "STUDENT PORTAL")}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {!EDGE_MODE && (
                <a
                  href={suiteHref}
                  className="text-xs font-semibold text-slate-600 hover:text-[#1447E6] bg-white border border-slate-200 hover:bg-slate-50 min-h-[44px] min-w-[44px] p-2 sm:min-h-0 sm:min-w-0 sm:px-3.5 sm:py-1.5 rounded-sm transition-colors inline-flex items-center justify-center"
                  title="Back to Suite"
                >
                  <ChevronLeft className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Back to Suite</span>
                </a>
              )}
              <button
                onClick={handleSignOut}
                className="text-xs font-semibold text-[#F04438] hover:text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 min-h-[44px] px-3 sm:min-h-0 sm:px-3.5 sm:py-1.5 rounded-sm transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-safe-nav sm:py-8">
        
        {authError ? (
          <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-sm border border-rose-100 shadow-xl text-center">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Student Session Required</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              We couldn't verify your student login token. The CBT module shares credentials with the main Hanoled Portal.
            </p>
            <div className="space-y-3">
              <a
                href="/signin"
                className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 px-4 rounded-sm shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Log In via Hanoled Portal
              </a>
              <button
                onClick={() => window.location.reload()}
                className="w-full text-xs font-medium text-slate-500 hover:text-slate-700 py-2"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-500 text-sm font-medium">Loading your exams…</p>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-8">
            <CbtGreeting name={studentName} roleLabel="Student" school={schoolName} />
            {examDevice === "blocked" && <ExamDeviceBanner />}

            {/* Tab Navigation Switches */}
            <div className="hidden sm:flex space-x-1 bg-slate-200/60 p-1.5 rounded-sm border border-slate-300/40 overflow-x-auto snap-x snap-mandatory scrollbar-hide flex-nowrap [-webkit-overflow-scrolling:touch]">
              <button
                onClick={() => setActiveTab("assigned")}
                className={`snap-start shrink-0 flex items-center space-x-2 px-5 py-2.5 rounded-sm text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === "assigned"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Assigned Exams</span>
              </button>
              <button
                onClick={() => setActiveTab("practice")}
                className={`snap-start shrink-0 flex items-center space-x-2 px-5 py-2.5 rounded-sm text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === "practice"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <PlayCircle className="w-4 h-4 text-amber-505" />
                <span>Practice Simulator</span>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`snap-start shrink-0 flex items-center space-x-2 px-5 py-2.5 rounded-sm text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === "history"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <History className="w-4 h-4" />
                <span>History & Performance</span>
              </button>
            </div>

            {/* TAB CONTENT: Assigned Exams */}
            {activeTab === "assigned" && (
              <div className="m-page space-y-8">
                {/* 1. School Assigned Exams */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">School Exams</h2>
                  </div>

                  {schoolExams.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-sm p-8 text-center text-slate-500 text-sm">
                      No active class exams are currently assigned to you.
                    </div>
                  ) : (
                    <div className="m-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {schoolExams.map((exam) => (
                        <ExamCard
                          key={exam.id}
                          exam={exam}
                          startingExamId={startingExamId}
                          onInitiateStart={handleInitiateStart}
                          onViewResult={handleViewResult}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. SSCE Practice Exams */}
                <div className="pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                    <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">SSCE Practice Center</h2>
                  </div>

                  {ssceExams.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-sm p-8 text-center text-slate-500 text-sm">
                      No SSCE practice exams are currently available.
                    </div>
                  ) : (
                    <div className="m-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {ssceExams.map((exam) => (
                        <ExamCard
                          key={exam.id}
                          exam={exam}
                          startingExamId={startingExamId}
                          onInitiateStart={handleInitiateStart}
                          onViewResult={handleViewResult}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Practice Simulator Form */}
            {activeTab === "practice" && (
              <div className="m-page max-w-2xl mx-auto bg-white rounded-sm shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white">
                  <div className="flex items-center space-x-2">
                    <PlayCircle className="w-5 h-5 text-amber-300 animate-pulse" />
                    <h2 className="text-lg font-bold">Dynamic Exam Practice Simulator</h2>
                  </div>
                  <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                    Select a board type (JAMB or NECO), choose your subject, allocate either random years or a specific exam year, and instantly begin a timed dynamic practice assessment.
                  </p>
                </div>

                <form onSubmit={handleStartPracticeNow} className="p-6 space-y-6">
                  {/* Board selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">1. Select Assessment Board</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPracticeBoard("jamb")}
                        className={`p-4 rounded-sm border-2 text-center transition-all ${
                          practiceBoard === "jamb"
                            ? "border-blue-600 bg-blue-50/60 text-blue-700 font-extrabold shadow-sm"
                            : "border-slate-200/60 hover:border-slate-300 text-slate-600"
                        }`}
                      >
                        <span className="text-sm block">JAMB (UTME) Practice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPracticeBoard("neco")}
                        className={`p-4 rounded-sm border-2 text-center transition-all ${
                          practiceBoard === "neco"
                            ? "border-blue-600 bg-blue-50/60 text-blue-700 font-extrabold shadow-sm"
                            : "border-slate-200/60 hover:border-slate-300 text-slate-600"
                        }`}
                      >
                        <span className="text-sm block">NECO SSCE Practice</span>
                      </button>
                    </div>
                  </div>

                  {/* Subject Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">2. Choose Subject</label>
                    {fetchingPracticeSubjects ? (
                      <div className="flex items-center space-x-2 py-2 text-slate-500 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Loading study parameters...</span>
                      </div>
                    ) : (
                      <select
                        required
                        value={practiceSubject}
                        onChange={(e) => handlePracticeSubjectChange(e.target.value)}
                        className="w-full text-xs bg-slate-50 p-2.5 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Choose Subject --</option>
                        {subjectsList.map((sub, i) => (
                          <option key={i} value={sub}>{sub}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Year selector option */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">3. Question Archives Range</label>
                    <div className="flex items-center space-x-6 bg-slate-50 p-3 rounded-sm mb-3">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name="practiceYearMode"
                          checked={practiceYearMode === "random"}
                          onChange={() => handlePracticeYearModeChange("random")}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Random Questions (Different Years)</span>
                      </label>

                      <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name="practiceYearMode"
                          checked={practiceYearMode === "specific"}
                          onChange={() => handlePracticeYearModeChange("specific")}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Specific Exam Year</span>
                      </label>
                    </div>

                    {practiceYearMode === "specific" && (
                      <div className="animate-fade-in">
                        {fetchingPracticeYears ? (
                          <div className="flex items-center space-x-2 py-2 text-slate-500 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading subject timelines...</span>
                          </div>
                        ) : yearsList.length === 0 ? (
                          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-sm">
                            Please choose a subject first to fetch available academic years.
                          </p>
                        ) : (
                          <select
                            required
                            value={practiceYear}
                            onChange={(e) => setPracticeYear(e.target.value)}
                            className="w-full text-xs bg-slate-50 p-2.5 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Choose Practice Year --</option>
                            {yearsList.map((yr, i) => (
                              <option key={i} value={yr}>{yr}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Size selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">4. Examination Volume & Duration</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPracticeQuestionCount(30)}
                        className={`p-3.5 rounded-sm border-2 text-center transition-all ${
                          practiceQuestionCount === 30
                            ? "border-blue-600 bg-blue-50/60 text-blue-700 font-extrabold shadow-sm"
                            : "border-slate-200/60 hover:border-slate-300 text-slate-600"
                        }`}
                      >
                        <span className="text-xs block font-extrabold">30 Questions (45 Mins)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPracticeQuestionCount(60)}
                        className={`p-3.5 rounded-sm border-2 text-center transition-all ${
                          practiceQuestionCount === 60
                            ? "border-blue-600 bg-blue-50/60 text-blue-700 font-extrabold shadow-sm"
                            : "border-slate-200/60 hover:border-slate-300 text-slate-600"
                        }`}
                      >
                        <span className="text-xs block font-extrabold">60 Questions (90 Mins)</span>
                      </button>
                    </div>
                  </div>

                  {/* Action button */}
                  <button
                    type="submit"
                    disabled={initializingPractice || fetchingPracticeSubjects || !practiceSubject}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm py-3.5 rounded-sm shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    {initializingPractice ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Assembling Question Modules...</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4" />
                        <span>Launch Dynamic Practice Simulator</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT: History */}
            {activeTab === "history" && (
              <div className="m-page space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600"></span>
                  <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">Past Attempts</h2>
                </div>

                {history.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-sm p-12 text-center text-slate-500">
                    <FileText className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                    <p className="font-semibold text-slate-700">No attempts yet</p>
                    <p className="text-xs text-slate-500 mt-1">Exams you complete will show up here along with your performance card.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Exam Title</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Exam Type</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Score</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Percentage</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Result</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {history.map((result) => {
                              const isPending = result.resultsReleased === false;
                              const isPassed = !isPending && result.percentage !== null && result.percentage >= result.exam.passMark;
                              return (
                                <tr key={result.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 font-semibold text-slate-800 text-sm">
                                    {result.exam.title}
                                  </td>
                                  <td className="px-6 py-4 text-xs">
                                    <span className={`px-2.5 py-1 rounded-sm font-semibold ${
                                      result.exam.examType === "school"
                                        ? "bg-blue-50 text-blue-700"
                                        : "bg-indigo-50 text-indigo-700"
                                    }`}>
                                      {result.exam.examType === "school" ? "School" : "SSCE Practice"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-semibold text-slate-700 text-center">
                                    {isPending ? "—" : `${result.score} / ${result.totalMarks}`}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold text-slate-800 text-center">
                                    {isPending ? "—" : `${result.percentage!.toFixed(1)}%`}
                                  </td>
                                  <td className="px-6 py-4">
                                    {isPending ? (
                                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm text-xs font-bold bg-amber-50 text-amber-700">
                                        <span>PENDING</span>
                                      </span>
                                    ) : (
                                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm text-xs font-bold ${
                                        isPassed
                                          ? "bg-green-50 text-green-700"
                                          : "bg-rose-50 text-rose-700"
                                      }`}>
                                        <CheckCircle2 className={`w-3.5 h-3.5 ${isPassed ? "text-green-600" : "text-rose-600"}`} />
                                        <span>{isPassed ? `PASSED` : `FAILED`}</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={() => handleViewResult(result.examId)}
                                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1 ml-auto"
                                    >
                                      <span>{isPending ? "View Status" : "View Review"}</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile cards */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                      {history.map((result) => {
                        const isPending = result.resultsReleased === false;
                        const isPassed = !isPending && result.percentage !== null && result.percentage >= result.exam.passMark;
                        return (
                          <div key={result.id} className="bg-white border border-slate-200 rounded-sm shadow-sm p-5">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 flex-1">
                                {result.exam.title}
                              </h3>
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-bold shrink-0 bg-amber-50 text-amber-700 border border-amber-100">
                                  <span>PENDING</span>
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-bold shrink-0 ${
                                  isPassed
                                    ? "bg-green-50 text-green-700 border border-green-100"
                                    : "bg-rose-50 text-rose-700 border border-rose-100"
                                }`}>
                                  <CheckCircle2 className={`w-3 h-3 ${isPassed ? "text-green-600" : "text-rose-600"}`} />
                                  <span>{isPassed ? "PASSED" : "FAILED"}</span>
                                </span>
                              )}
                            </div>

                            <span className={`inline-flex mt-2 text-xs font-bold px-2.5 py-0.5 rounded-sm border ${
                              result.exam.examType === "school"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-indigo-50 text-indigo-700 border-indigo-100"
                            }`}>
                              {result.exam.examType === "school" ? "School" : "SSCE Practice"}
                            </span>

                            {isPending ? (
                              <div className="mt-4 bg-amber-50/60 rounded-sm p-3 border border-amber-100 text-xs font-semibold text-amber-800 leading-snug">
                                Submitted — your teacher hasn't released the results yet.
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="bg-slate-50 rounded-sm p-3 border border-slate-100">
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score</p>
                                  <p className="text-base font-black text-slate-800 mt-0.5">{result.score} / {result.totalMarks}</p>
                                </div>
                                <div className="bg-slate-50 rounded-sm p-3 border border-slate-100">
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Percentage</p>
                                  <p className={`text-base font-black mt-0.5 ${
                                    isPassed ? "text-emerald-700" : "text-rose-700"
                                  }`}>
                                    {result.percentage!.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            )}

                            <button
                              onClick={() => handleViewResult(result.examId)}
                              className="w-full mt-4 py-3 rounded-sm text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                              <span>{isPending ? "View Status" : "View Review"}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    </>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {!authError && !loading && (
        <MobileSegmentBar
          className="sm:hidden"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { key: "assigned", label: "Exams", icon: BookOpen },
            // Practice is a start-an-exam flow, so it is not offered on phones.
            ...(examDevice === "blocked" ? [] : [{ key: "practice" as const, label: "Practice", icon: PlayCircle }]),
            { key: "history", label: "History", icon: History },
          ]}
        />
      )}

      {/* Exam Instructions / Start Modal */}
      {isStartModalOpen && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm m-fade">
          <div className="m-sheet bg-white rounded-t-3xl sm:rounded-sm max-w-lg w-full max-h-[92dvh] overflow-y-auto border border-slate-200 shadow-2xl p-6 pb-safe sm:p-8 relative">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Exam Rules & Guidelines</h3>
            <p className="text-slate-500 text-xs mb-6">Exam: <strong className="text-slate-700">{selectedExam.title}</strong></p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-3 bg-slate-50 p-4 rounded-sm border border-slate-100">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Time Limit: {selectedExam.duration} Minutes</h4>
                  <p className="text-xs text-slate-500 mt-0.5">The timer starts as soon as you load the screen. Once started, it cannot be paused.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-slate-50 p-4 rounded-sm border border-slate-100">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{selectedExam.totalQuestions} Multiple-Choice Questions</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Answer all questions carefully. The pass mark is set to {selectedExam.passMark}%.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-rose-50/50 p-4 rounded-sm border border-rose-100">
                <Info className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-rose-800">Browser Security Notice</h4>
                  <p className="text-xs text-rose-500 mt-0.5">Do not close the page, reload, or navigate away. Your answers are auto-saved locally, but dropping connection will risk automatic submission.</p>
                </div>
              </div>
            </div>

            {selectedExam.passkeyRequired && (
              <div className="mb-6">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                  <Key className="w-3.5 h-3.5 text-[#8a5c10]" />
                  Exam Passkey
                </label>
                <input
                  type="text"
                  value={passkeyInput}
                  onChange={(e) => {
                    setPasskeyInput(e.target.value);
                    if (passkeyError) setPasskeyError(null);
                  }}
                  placeholder="Ask your teacher or admin for this code"
                  autoComplete="off"
                  className={`w-full font-mono tracking-[0.2em] text-center text-lg font-bold px-4 py-3 rounded-sm border bg-[#F5A623]/5 text-[#0B1220] placeholder:font-sans placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 ${
                    passkeyError ? "border-[#F04438]" : "border-[#F5A623]/40"
                  }`}
                />
                {passkeyError && (
                  <p className="text-xs font-semibold text-[#F04438] mt-1.5">{passkeyError}</p>
                )}
              </div>
            )}

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsStartModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-3 px-4 rounded-sm border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartExamNow}
                disabled={startingExamId === selectedExam.id}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold py-3 px-4 rounded-sm shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 inline-flex items-center justify-center gap-1.5"
              >
                {startingExamId === selectedExam.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{startingExamId === selectedExam.id ? "Starting..." : "Start Exam Now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


