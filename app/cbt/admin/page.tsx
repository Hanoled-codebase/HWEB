"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cbtApi } from "@/lib/api-cbt";
import { HCBT_BASE, EDGE_MODE, isForbiddenError } from "@/lib/api";
import { MathRenderer } from "@/components/MathRenderer";
import { toTitleCase } from "@/lib/utils";
import {
  Sparkles,
  School,

  TrendingUp,
  FileText,
  Users,
  Award,
  Plus,
  Trash2,
  ListPlus,
  ArrowLeft,
  CheckCircle2,
  Search,
  BookOpen,
  Info,
  Calendar,
  Layers,
  Clock,
  MoreHorizontal,
  ChevronRight,
  Loader2,
  X,
  Upload,
  ShieldAlert,
  Hourglass,
  Send,
  Key,
  Copy,
  RefreshCw,
  LayoutDashboard,
  ShieldCheck,
  HardDrive,
} from "lucide-react";
import { MobileSegmentBar } from "@/components/dashboard/mobile/MobileSegmentBar";
import { CbtMobileTopBar, CbtGreeting, CbtAccountSheet } from "@/components/cbt/CbtMobileChrome";
import { toast, Toaster } from "sonner";
import { Logo } from "@/components/ui/Logo";
import EdgeAppliancesTab from "./EdgeAppliancesTab";
import EdgeDeviceTab from "./EdgeDeviceTab";

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const orgSlug = searchParams.get("orgSlug") || "hanoled-default";

  // Navigation
  const [activeTab, setActiveTab] = useState<"overview" | "exams" | "students" | "appliances">("overview");

  // Core Data States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orgName, setOrgName] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  // The real org slug, resolved from the authenticated session — used only
  // for the Edge Appliance pairing display below. `orgSlug` above falls back
  // to the placeholder "hanoled-default" whenever this page is opened
  // without an explicit ?orgSlug= query param (e.g. via "Launch CBT engine"
  // from the welcome hub), which would have shown admins the wrong pairing
  // slug to hand to their physical Edge Appliance.
  const [resolvedOrgSlug, setResolvedOrgSlug] = useState(orgSlug);
  const [orgSubjects, setOrgSubjects] = useState<{ id: string; name: string; code?: string }[]>([]);
  const isAdmin = !!currentUser?.isAdmin;
  const [stats, setStats] = useState<any>({
    totalExams: 0,
    publishedExams: 0,
    totalSubmissions: 0,
    uniqueStudents: 0,
    avgScore: 0
  });
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Active Exam Detail State (For Question Designer View)
  const [designerExam, setDesignerExam] = useState<any | null>(null);
  const [designerQuestions, setDesignerQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Modals & Sub-forms State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingExam, setCreatingExam] = useState(false);
  const [newExamData, setNewExamData] = useState({
    title: "",
    description: "",
    duration: 45,
    passMark: 50,
    examType: "school",
    subjectId: "",
    ssceBoard: "waec",
    ssceYear: new Date().getFullYear() - 1,
    shuffleQuestions: true
  });
  const [assignTarget, setAssignTarget] = useState<"none" | "class" | "student">("none");
  const [targetClassId, setTargetClassId] = useState("");
  const [targetStudentId, setTargetStudentId] = useState("");
  const [teacherClasses, setTeacherClasses] = useState<{ id: string; name: string }[]>([]);
  const [classStudents, setClassStudents] = useState<{ id: string; firstName: string; lastName: string; admissionNumber: string }[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Manual Question Creator State
  const [manualQuestion, setManualQuestion] = useState({
    text: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    marks: 1,
    explanation: "",
    imageUrl: "",
    passage: ""
  });
  const [addingManualQuestion, setAddingManualQuestion] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Publish & Assign State
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignExamId, setAssignExamId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [assignTargetType, setAssignTargetType] = useState<"class" | "student">("class");
  const [assignClassStudents, setAssignClassStudents] = useState<{ id: string; firstName: string; lastName: string; admissionNumber: string }[]>([]);
  const [loadingAssignStudents, setLoadingAssignStudents] = useState(false);

  // Results Modal State
  const [resultsModal, setResultsModal] = useState<{
    examId: string;
    exam: any;
    results: any[];
    totalSubmissions: number;
    averageScore: number;
    passCount: number;
  } | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [releasingResults, setReleasingResults] = useState(false);

  // Passkey Modal State
  const [passkeyModal, setPasskeyModal] = useState<{
    examId: string;
    examTitle: string;
    passkeyRequired: boolean;
    passkeyMode: "shared" | "unique" | null;
    passkey: string | null;
    students: { studentId: string; firstName: string; lastName: string; admissionNumber: string; code: string | null }[];
  } | null>(null);
  const [loadingPasskey, setLoadingPasskey] = useState(false);
  const [generatingPasskey, setGeneratingPasskey] = useState(false);

  // Student Detail Modal State
  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
  const [selectedExamResult, setSelectedExamResult] = useState<any>(null);
  const [viewingQuestions, setViewingQuestions] = useState(false);

  const CBT_BACKEND_URL = process.env.NEXT_PUBLIC_CBT_API_URL?.replace(/\/api$/, "") || HCBT_BASE;

  // Upload Image Handler
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const res = await cbtApi.uploadFile(file);
      setManualQuestion((prev) => ({ ...prev, imageUrl: res.imageUrl }));
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Publish Exam
  const handlePublish = async (examId: string, questionCount?: number) => {
    if (questionCount !== undefined && questionCount < 5) {
      toast.error("A minimum of 5 questions is required to publish this exam.");
      return;
    }
    setPublishingId(examId);
    try {
      await cbtApi.updateExam(examId, { status: "published" });
      toast.success("Exam published! Students can now see it.");
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish exam");
    } finally {
      setPublishingId(null);
    }
  };

  // Open Assign Modal
  const handleOpenAssign = async (examId: string) => {
    setAssignExamId(examId);
    setSelectedClassId("");
    setSelectedStudentId("");
    setAssignTargetType("class");
    setAssignClassStudents([]);
    if (teacherClasses.length === 0) {
      try {
        const data = await cbtApi.getTeacherClasses(orgSlug);
        setTeacherClasses(data);
      } catch (err: any) {
        toast.error("Failed to load classes: " + err.message);
      }
    }
    setShowAssignModal(true);
  };

  // Assign Exam to Class or Student
  const handleAssign = async () => {
    if (!assignExamId) return;
    if (assignTargetType === "class" && !selectedClassId) return;
    if (assignTargetType === "student" && (!selectedClassId || !selectedStudentId)) return;
    setAssigningId(assignExamId);
    try {
      const payload: any = {};
      if (assignTargetType === "class") {
        payload.classLevelId = selectedClassId;
      } else {
        payload.studentId = selectedStudentId;
      }
      await cbtApi.assignExam(assignExamId, payload);
      toast.success("Exam assigned successfully!");
      setShowAssignModal(false);
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign exam");
    } finally {
      setAssigningId(null);
    }
  };

  // Load students for assign modal
  const loadAssignClassStudents = async (classId: string) => {
    setLoadingAssignStudents(true);
    try {
      const data = await cbtApi.getTeacherStudents(orgSlug, classId);
      setAssignClassStudents(data);
    } catch (err: any) {
      console.error("Failed to load students for assign:", err);
    } finally {
      setLoadingAssignStudents(false);
    }
  };

  // Open Results Modal
  const handleOpenResults = async (exam: any) => {
    setLoadingResults(true);
    try {
      const data: any = await cbtApi.getAdminExamResultsOverview(exam.id, orgSlug);
      setResultsModal({ ...data, examId: exam.id });
    } catch (err: any) {
      toast.error("Failed to load results: " + err.message);
    } finally {
      setLoadingResults(false);
    }
  };

  // Release / withdraw results to students for the exam currently open in resultsModal
  const handleReleaseResults = async () => {
    if (!resultsModal?.exam || releasingResults) return;
    setReleasingResults(true);
    try {
      await cbtApi.releaseExamResults(resultsModal.examId);
      toast.success("Results released — students can now see their scores.");
      setResultsModal((prev: any) => prev && { ...prev, exam: { ...prev.exam, resultsReleased: true, resultsReleasedAt: new Date().toISOString() } });
    } catch (err: any) {
      toast.error(err.message || "Failed to release results");
    } finally {
      setReleasingResults(false);
    }
  };

  const handleWithdrawResults = async () => {
    if (!resultsModal?.exam || releasingResults) return;
    setReleasingResults(true);
    try {
      await cbtApi.withdrawExamResults(resultsModal.examId);
      toast.success("Results withdrawn — students can no longer see their scores.");
      setResultsModal((prev: any) => prev && { ...prev, exam: { ...prev.exam, resultsReleased: false, resultsReleasedAt: null } });
    } catch (err: any) {
      toast.error(err.message || "Failed to withdraw results");
    } finally {
      setReleasingResults(false);
    }
  };

  // Open Passkey Modal
  const handleOpenPasskey = async (exam: any) => {
    setLoadingPasskey(true);
    setPasskeyModal({
      examId: exam.id,
      examTitle: exam.title,
      passkeyRequired: false,
      passkeyMode: null,
      passkey: null,
      students: [],
    });
    try {
      const data: any = await cbtApi.getExamPasskey(exam.id);
      setPasskeyModal({ examId: exam.id, examTitle: exam.title, ...data });
    } catch (err: any) {
      toast.error(err.message || "Failed to load passkey settings");
      setPasskeyModal(null);
    } finally {
      setLoadingPasskey(false);
    }
  };

  // Keeps the designer header badge and the exam grid in sync with the
  // passkey modal, which only mutates its own local state otherwise.
  const syncExamPasskeyRequired = (examId: string, passkeyRequired: boolean) => {
    setDesignerExam((prev: any) => (prev && prev.id === examId ? { ...prev, passkeyRequired } : prev));
    setExams((prev) => prev.map((e: any) => (e.id === examId ? { ...e, passkeyRequired } : e)));
  };

  // Generate (or regenerate) the passkey for the exam currently open in passkeyModal
  const handleGeneratePasskey = async (mode: "shared" | "unique") => {
    if (!passkeyModal || generatingPasskey) return;
    setGeneratingPasskey(true);
    try {
      const data: any = await cbtApi.generateExamPasskey(passkeyModal.examId, mode);
      setPasskeyModal((prev) => prev && { ...prev, ...data });
      syncExamPasskeyRequired(passkeyModal.examId, true);
      toast.success(
        mode === "shared"
          ? "Shared passkey generated — share it with the class."
          : "Unique passkeys generated for every assigned student."
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to generate passkey");
    } finally {
      setGeneratingPasskey(false);
    }
  };

  const handleDisablePasskey = async () => {
    if (!passkeyModal || generatingPasskey) return;
    setGeneratingPasskey(true);
    try {
      const data: any = await cbtApi.disableExamPasskey(passkeyModal.examId);
      setPasskeyModal((prev) => prev && { ...prev, ...data });
      syncExamPasskeyRequired(passkeyModal.examId, false);
      toast.success("Passkey requirement turned off — students can start this exam freely.");
    } catch (err: any) {
      toast.error(err.message || "Failed to disable passkey");
    } finally {
      setGeneratingPasskey(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text)
      .then(() => toast.success(`${label} copied to clipboard`))
      .catch(() => toast.error("Could not copy to clipboard"));
  };

  // Open Student Detail Modal
  const handleOpenStudentDetail = async (student: any) => {
    setLoadingStudentDetail(true);
    setStudentDetail(null);
    setSelectedExamResult(null);
    setViewingQuestions(false);
    try {
      const data = await cbtApi.getStudentHistoryDetail(student.studentId, orgSlug);
      setStudentDetail(data);
    } catch (err: any) {
      toast.error("Failed to load student history: " + err.message);
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  // Past Questions API Importer State
  const [apiSubjects, setApiSubjects] = useState<string[]>([]);
  const [apiYears, setApiYears] = useState<number[]>([]);
  const [importParams, setImportParams] = useState({
    subject: "",
    ssceBoard: "waec",
    year: "",
    count: 10
  });
  const [fetchingSubjects, setFetchingSubjects] = useState(false);
  const [fetchingYears, setFetchingYears] = useState(false);
  const [fetchingPastQuestions, setFetchingPastQuestions] = useState(false);
  const [importingQuestions, setImportingQuestions] = useState(false);
  const [previewQuestionsCount, setPreviewQuestionsCount] = useState<number | null>(null);

  // Document Import State
  const [importingDocument, setImportingDocument] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<any[] | null>(null);
  const [parsedFileName, setParsedFileName] = useState<string>("");

  // Load Admin Data
  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Resolve the current user's CBT roles first — the UI is role-driven
      let me: any = null;
      try {
        me = await cbtApi.checkAuth();
        setCurrentUser(me?.user || null);
        if (me?.organization?.slug) setResolvedOrgSlug(me.organization.slug);
        if (me?.organization?.name) setOrgName(me.organization.name);
      } catch (authErr) {
        console.error("CBT auth check failed:", authErr);
      }

      const statsData = await cbtApi.getAdminStats(orgSlug);
      setStats(statsData);

      const examsData = await cbtApi.getAdminExams(orgSlug);
      setExams(examsData);

      // Grade Auditor's raw org-wide table is admin-only on the backend now —
      // don't even fetch it for teachers (avoids a guaranteed 403).
      if (me?.user?.isAdmin) {
        const studentsData = await cbtApi.getAdminStudents(orgSlug);
        setStudents(studentsData);
      }

      const classesData = await cbtApi.getClasses(orgSlug);
      setClasses(classesData);

      // Subjects visible to this user (admins: all org subjects; teachers: assigned only)
      try {
        const subjectsData = await cbtApi.getOrgSubjects(orgSlug);
        setOrgSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      } catch (err) {
        console.error("Failed to load subjects:", err);
      }
    } catch (err: any) {
      console.error("Admin Load Error:", err);
      if (isForbiddenError(err)) {
        setAccessDenied(true);
      } else {
        toast.error(err.message || "Failed to load admin panel data. Make sure the database is migrated and backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [orgSlug]);

  // Fetch Questions for selected exam
  const handleOpenDesigner = async (exam: any) => {
    setDesignerExam(exam);
    setLoadingQuestions(true);
    setPreviewQuestionsCount(null); // Reset preview
    try {
      const detail = await cbtApi.getExam(exam.id);
      setDesignerQuestions(detail.questions || []);
      
      // Pre-fetch past questions subjects list
      fetchPastQuestionSubjects();
    } catch (err: any) {
      toast.error("Failed to load questions: " + err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Close designer and reload main lists
  const handleCloseDesigner = () => {
    setDesignerExam(null);
    setDesignerQuestions([]);
    loadAdminData(); // Reload stats and exam lists to reflect question increments
  };

  // Load teacher's accessible classes
  const loadTeacherClasses = async () => {
    try {
      const data = await cbtApi.getTeacherClasses(orgSlug);
      setTeacherClasses(data);
    } catch (err: any) {
      console.error("Failed to load teacher classes:", err);
    }
  };

  // Load students in a class
  const loadClassStudents = async (classId: string) => {
    setLoadingStudents(true);
    try {
      const data = await cbtApi.getTeacherStudents(orgSlug, classId);
      setClassStudents(data);
    } catch (err: any) {
      console.error("Failed to load students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Create Exam Action
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamData.title.trim()) {
      toast.error("Exam title is required");
      return;
    }
    if (!isAdmin && !newExamData.subjectId) {
      toast.error("Select your assigned subject for this assessment");
      return;
    }

    setCreatingExam(true);
    try {
      const payload: any = {
        title: newExamData.title,
        description: newExamData.description,
        duration: Number(newExamData.duration),
        passMark: Number(newExamData.passMark),
        examType: newExamData.examType,
        subjectId: newExamData.subjectId || undefined,
        shuffleQuestions: newExamData.shuffleQuestions
      };

      if (newExamData.examType === "ssce") {
        payload.ssceBoard = newExamData.ssceBoard;
        payload.ssceYear = Number(newExamData.ssceYear);
      }

      const created = await cbtApi.createExam(payload);

      // Auto-assign if target selected (admins only — publishing/assignment is admin-gated)
      if (isAdmin && assignTarget !== "none") {
        const assignPayload: any = {};
        if (assignTarget === "class") {
          assignPayload.classLevelId = targetClassId;
        } else if (assignTarget === "student") {
          assignPayload.studentId = targetStudentId;
        }
        await cbtApi.assignExam(created.id, assignPayload);
        toast.success(`Exam created and assigned successfully!`);
      } else {
        toast.success(isAdmin ? `Exam "${newExamData.title}" created successfully!` : `Draft "${newExamData.title}" saved. An admin can review and publish it.`);
      }
      
      // Reset form and reload
      setIsCreateModalOpen(false);
      setNewExamData({
        title: "",
        description: "",
        duration: 45,
        passMark: 50,
        examType: "school",
        subjectId: "",
        ssceBoard: "waec",
        ssceYear: new Date().getFullYear() - 1,
        shuffleQuestions: true
      });
      setAssignTarget("none");
      setTargetClassId("");
      setTargetStudentId("");
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create exam");
    } finally {
      setCreatingExam(false);
    }
  };

  // Delete Exam Action
  const handleDeleteExam = async (examId: string) => {
    if (!confirm("Are you sure you want to delete this exam? All related questions and student grades will be permanently deleted.")) return;

    try {
      await cbtApi.deleteExam(examId);
      toast.success("Exam deleted successfully.");
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete exam.");
    }
  };

  // Delete single question in designer
  const handleDeleteQuestion = async (qId: string) => {
    if (!designerExam) return;
    if (!confirm("Remove this question from the exam?")) return;

    try {
      await cbtApi.deleteQuestion(designerExam.id, qId);
      toast.success("Question removed.");
      // Reload designer questions
      const detail = await cbtApi.getExam(designerExam.id);
      setDesignerQuestions(detail.questions || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete question.");
    }
  };

  // Add Manual Question Action
  const handleAddManualQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designerExam) return;
    if (!manualQuestion.text.trim()) {
      toast.error("Question text is required");
      return;
    }
    if (manualQuestion.options.some((o) => !o.trim())) {
      toast.error("Please fill in all four options");
      return;
    }

    setAddingManualQuestion(true);
    try {
      const payload = {
        text: manualQuestion.text,
        options: manualQuestion.options,
        correctAnswer: manualQuestion.correctAnswer,
        marks: Number(manualQuestion.marks),
        explanation: manualQuestion.explanation || null,
        imageUrl: manualQuestion.imageUrl || null,
        passage: manualQuestion.passage || null
      };

      await cbtApi.addQuestion(designerExam.id, payload);
      toast.success("Manual question added successfully!");

      // Reset Form and reload questions
      setManualQuestion({
        text: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        marks: 1,
        explanation: "",
        imageUrl: "",
        passage: ""
      });
      const detail = await cbtApi.getExam(designerExam.id);
      setDesignerQuestions(detail.questions || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to add question");
    } finally {
      setAddingManualQuestion(false);
    }
  };

  // PAST QUESTIONS API PROXY CONTROLLERS
  const fetchPastQuestionSubjects = async () => {
    setFetchingSubjects(true);
    try {
      const res = await cbtApi.getSubjects();
      setApiSubjects(res.subjects || res || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load past subjects list from proxy: " + err.message);
    } finally {
      setFetchingSubjects(false);
    }
  };

  const handleSubjectChange = async (subjectName: string) => {
    setImportParams((prev) => ({ ...prev, subject: subjectName, year: "" }));
    setApiYears([]);
    setPreviewQuestionsCount(null);
    if (!subjectName) return;

    setFetchingYears(true);
    try {
      const res = await cbtApi.getYears(subjectName);
      setApiYears(res.years || res || []);
    } catch (err: any) {
      toast.error("Failed to load years: " + err.message);
    } finally {
      setFetchingYears(false);
    }
  };

  // Search/Retrieve Questions from Nigeria Past Questions API and Cache them
  const handleQueryPastQuestions = async () => {
    if (!importParams.subject || !importParams.ssceBoard) {
      toast.error("Please select a Subject and an SSCE Board");
      return;
    }

    setFetchingPastQuestions(true);
    setPreviewQuestionsCount(null);
    try {
      toast.info(`Querying proxy database for ${importParams.ssceBoard.toUpperCase()} ${importParams.subject}...`);
      const res = await cbtApi.fetchPastQuestions(
        importParams.subject,
        importParams.ssceBoard,
        importParams.year ? Number(importParams.year) : undefined
      );

      const count = Array.isArray(res.questions) ? res.questions.length : 0;
      setPreviewQuestionsCount(count);
      
      if (count > 0) {
        const source = res.fromCache ? "cache" : "API";
        toast.success(`Found ${count} questions from ${source}! Click "2. Import Selected" to add them to your exam.`);
      } else {
        toast.warning("No questions found for this combination in the Nigeria Past Questions API database.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("429")) {
        toast.error("API rate limit reached. Let's try importing already cached records.");
      } else {
        toast.error(err.message || "Failed to search proxy past questions API.");
      }
    } finally {
      setFetchingPastQuestions(false);
    }
  };

  // Bulk Import Cached API Questions into selected Exam
  const handleImportCachedQuestions = async () => {
    if (!designerExam) return;
    if (!importParams.subject || !importParams.ssceBoard) {
      toast.error("Please fill in the search parameters.");
      return;
    }

    setImportingQuestions(true);
    try {
      const payload = {
        subject: importParams.subject,
        ssceBoard: importParams.ssceBoard,
        year: importParams.year ? Number(importParams.year) : 0,
        count: Number(importParams.count)
      };

      const res = await cbtApi.importQuestionsApi(designerExam.id, payload);
      const details = [];
      if (res.added > 0) details.push(`${res.added} imported`);
      if (res.skipped > 0) details.push(`${res.skipped} skipped (duplicates)`);
      toast.success(`Success! ${details.join(', ')}.`);
      if (res.totalAvailable !== undefined && res.added < Math.min(Number(importParams.count), res.totalAvailable)) {
        toast.info(`${res.totalAvailable} unique questions available. Try increasing the count to get more.`);
      }
      
      // Reload designer questions
      const detail = await cbtApi.getExam(designerExam.id);
      setDesignerQuestions(detail.questions || []);
      setPreviewQuestionsCount(null); // Reset preview
    } catch (err: any) {
      toast.error(err.message || "Failed to import. Make sure you queried/searched first to cache the records.");
    } finally {
      setImportingQuestions(false);
    }
  };

  // Document Import Handlers
  const handleParseDocument = async (file: File) => {
    setImportingDocument(true);
    setParsedQuestions(null);
    setParsedFileName(file.name);
    try {
      const res = await cbtApi.importDocument(file);
      if (res.questionsParsed === 0) {
        toast.error("No questions could be parsed. Check document formatting.");
        return;
      }
      setParsedQuestions(res.questions);
      toast.success(`Parsed ${res.questionsParsed} questions from "${res.fileName}"`);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse document");
    } finally {
      setImportingDocument(false);
    }
  };

  const handleImportParsedToExam = async () => {
    if (!designerExam || !parsedQuestions || parsedQuestions.length === 0) return;
    setImportingDocument(true);
    try {
      // Build a FormData to re-upload — but we already have the questions in memory
      // Use the bulk import endpoint instead
      await cbtApi.addQuestionsBulk(designerExam.id, { questions: parsedQuestions });
      toast.success(`Imported ${parsedQuestions.length} questions to "${designerExam.title}"`);
      setParsedQuestions(null);
      setParsedFileName("");
      // Reload questions
      const detail = await cbtApi.getExam(designerExam.id);
      setDesignerQuestions(detail.questions || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to import questions");
    } finally {
      setImportingDocument(false);
    }
  };

  const handleClearParsed = () => {
    setParsedQuestions(null);
    setParsedFileName("");
  };

  const roleLabel = isAdmin ? "Admin" : "Teacher";
  const displayName: string = currentUser?.name || currentUser?.email || "";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B1220] flex flex-col font-sans">
      <Toaster position="top-right" richColors />

      <CbtMobileTopBar roleLabel={roleLabel} name={displayName} onOpenAccount={() => setAccountOpen(true)} />
      <CbtAccountSheet
        open={accountOpen}
        onOpenChange={setAccountOpen}
        name={displayName}
        email={currentUser?.email}
        roleLabel={roleLabel}
        school={orgName}
        suiteHref={EDGE_MODE ? undefined : "/welcome"}
        onSignOut={() => { cbtApi.logout(); window.location.assign("/"); }}
      />
      <header className="hidden sm:block sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-[72px] flex items-center justify-between gap-2">
          <Logo className="w-8 h-8 shrink-0" badgeText={isAdmin ? "ADMIN" : "TEACHER"} textColor="text-[#0B1220]" />

          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            {displayName && (
              <span className="hidden sm:inline max-w-[200px] truncate text-[13px] font-semibold text-[#0B1220]" title={displayName}>
                {displayName}
              </span>
            )}
            <div className="hidden sm:flex items-center gap-1.5 bg-[#F8FAFC] px-3.5 py-1.5 rounded-full">
              <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? "bg-emerald-500" : "bg-blue-400"}`}></span>
              <span className="text-[12px] font-semibold text-slate-500">
                {isAdmin ? "Admin Privileges" : "Teacher Access"}
              </span>
            </div>
            {!EDGE_MODE && (
              <a
                href="/welcome"
                className="inline-flex min-h-[44px] items-center whitespace-nowrap text-[13px] font-semibold text-slate-700 bg-white border border-slate-100 hover:bg-slate-50 px-3 sm:px-4 rounded-[10px] transition-all shadow-sm"
              >
                <span className="sm:hidden">Suite</span>
                <span className="hidden sm:inline">Back to Suite</span>
              </a>
            )}
            <button
              onClick={() => { cbtApi.logout(); window.location.assign("/"); }}
              className="min-h-[44px] whitespace-nowrap px-1 text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-safe-nav sm:py-8">
        
        {accessDenied ? (
          <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-2xl border border-rose-100 shadow-xl text-center">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Staff Access Required</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              This CBT console is only available to teachers and administrators. Your account doesn&apos;t have examiner-level access for this organization.
            </p>
            <a
              href={EDGE_MODE ? "/signin/" : "/welcome"}
              className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all"
            >
              {EDGE_MODE ? "Sign in again" : "Back to Suite"}
            </a>
          </div>
        ) : designerExam ? (
          /* QUESTION DESIGNER PANEL (Selected Exam details and questions) */
          <div className="space-y-6 animate-fade-in">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCloseDesigner}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm group"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-150 px-2.5 py-0.5 rounded-full uppercase">
                      {designerExam.examType} assessment
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {designerQuestions.length} Questions
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mt-1">{designerExam.title}</h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  designerExam.status === "published"
                    ? "bg-green-50 text-green-700 border border-green-150"
                    : "bg-slate-50 text-slate-500 border border-slate-200"
                }`}>
                  {designerExam.status?.toUpperCase() || "DRAFT"}
                </span>
                {isAdmin && designerExam.status !== "published" && (
                  <button
                    onClick={() => {
                      const qCount = designerQuestions.length;
                      if (qCount < 5) {
                        toast.error(`Need at least 5 questions to publish. Currently ${qCount}.`);
                        return;
                      }
                      handlePublish(designerExam.id);
                    }}
                    disabled={publishingId === designerExam.id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {publishingId === designerExam.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Publish</span>
                  </button>
                )}
                {designerExam.status !== "published" && !isAdmin && (
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                    Draft — awaiting admin approval
                  </span>
                )}
                {isAdmin && (
                <button
                  onClick={() => {
                    setAssignExamId(designerExam.id);
                    setShowAssignModal(true);
                    if (teacherClasses.length === 0) {
                      cbtApi.getTeacherClasses(orgSlug).then(setTeacherClasses).catch(() => {});
                    }
                  }}
                  className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center space-x-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Assign</span>
                </button>
                )}
                {isAdmin && (
                <button
                  onClick={() => handleOpenPasskey(designerExam)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center space-x-1.5 border ${
                    designerExam.passkeyRequired
                      ? "bg-[#F5A623]/10 border-[#F5A623]/30 text-[#8a5c10] hover:bg-[#F5A623]/20"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{designerExam.passkeyRequired ? "Passkey On" : "Passkey"}</span>
                </button>
                )}
                <button
                  onClick={handleCloseDesigner}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                  Save & Close
                </button>
              </div>
            </div>

            {/* Twin Panel Grid: Manual Question form & Question List */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              
              {/* Question list (Left Column - Spans 7 cols) */}
              <div className="xl:col-span-7 space-y-4">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Exam Questions</h3>
                </div>

                {loadingQuestions ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                ) : designerQuestions.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center text-slate-500 shadow-sm">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No questions added yet</p>
                    <p className="text-xs text-slate-500 mt-1">Use the right-hand panel to create manual questions or bulk import from proxy banks.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {designerQuestions.map((q, idx) => (
                      <div key={q.id} className="bg-white p-5 rounded-xl shadow-sm relative group">
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <h4 className="font-bold text-slate-800 text-sm mb-3 pr-8 flex items-start">
                          <span className="text-slate-400 mr-1.5">{idx + 1}.</span>
                          <MathRenderer text={q.text} />
                        </h4>

                        {q.passage && (
                          <div className="bg-slate-50/60 p-3.5 rounded-xl text-xs text-slate-600 mb-3 max-h-28 overflow-y-auto leading-relaxed">
                            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1">Reading Passage</span>
                            <MathRenderer text={q.passage} />
                          </div>
                        )}

                        {q.imageUrl && (
                          <div className="mb-3">
                            <img
                              src={`${CBT_BACKEND_URL}${q.imageUrl}`}
                              alt="Question diagram"
                              className="max-h-36 object-contain rounded-xl bg-white p-1.5 shadow-sm"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                          {q.options.map((opt: string, optIdx: number) => {
                            const isCorrect = optIdx === q.correctAnswer;
                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-lg flex items-center space-x-2 ${
                                  isCorrect 
                                    ? "text-green-600 font-semibold bg-green-50/30" 
                                    : "text-slate-600 bg-slate-50/50"
                                }`}
                              >
                                <span className="text-[10px] uppercase opacity-70">
                                  {["A", "B", "C", "D"][optIdx]}.
                                </span>
                                <span className="truncate"><MathRenderer text={opt} /></span>
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="bg-blue-50/60 p-3 rounded-lg text-blue-800 text-xs mt-3 flex items-start space-x-1.5">
                            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            <p><strong>Explanation:</strong> <MathRenderer text={q.explanation} /></p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Creators & Importers (Right Column - Spans 5 cols) */}
              <div className="xl:col-span-5 space-y-6">
                
                {/* 1. NIGERIA PAST QUESTIONS API IMPORTER PANEL */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-white p-4 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-blue-700">SSCE past questions importer</h3>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Quickly query, preview, and load authentic WAEC/NECO questions via our smart API cache proxy.</p>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Subject selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Subject</label>
                      <select
                        value={importParams.subject}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        disabled={fetchingSubjects}
                        className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">-- Choose Subject --</option>
                        {apiSubjects.map((sub, i) => (
                          <option key={i} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>

                    {/* Board and Year grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Board</label>
                        <select
                          value={importParams.ssceBoard}
                          onChange={(e) => setImportParams((prev) => ({ ...prev, ssceBoard: e.target.value }))}
                          className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                        >
                          <option value="waec">WAEC</option>
                          <option value="neco">NECO</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Year</label>
                        <select
                          value={importParams.year}
                          onChange={(e) => setImportParams((prev) => ({ ...prev, year: e.target.value }))}
                          disabled={fetchingYears || !importParams.subject}
                          className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                        >
                          <option value="">-- All / Random --</option>
                          {apiYears.map((yr, i) => (
                            <option key={i} value={yr}>{yr}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Questions count to import */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Questions Count to Load</label>
                      <select
                        value={importParams.count}
                        onChange={(e) => setImportParams((prev) => ({ ...prev, count: Number(e.target.value) }))}
                        className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      >
                        <option value={5}>5 Questions</option>
                        <option value={10}>10 Questions</option>
                        <option value={15}>15 Questions</option>
                        <option value={20}>20 Questions</option>
                        <option value={30}>30 Questions</option>
                        <option value={40}>40 Questions</option>
                      </select>
                    </div>

                    {/* API search action triggers */}
                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={handleQueryPastQuestions}
                        disabled={fetchingPastQuestions || !importParams.subject}
                        className={`flex-1 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                          previewQuestionsCount === null
                            ? "bg-[#1447E6] hover:bg-[#0f36b8] text-white shadow-sm"
                            : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {fetchingPastQuestions ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Searching...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3.5 h-3.5" />
                            <span>1. Search API</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleImportCachedQuestions}
                        disabled={importingQuestions || previewQuestionsCount === null || previewQuestionsCount === 0}
                        className={`flex-1 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                          previewQuestionsCount !== null && previewQuestionsCount > 0
                            ? "bg-[#1447E6] hover:bg-[#0f36b8] text-white shadow-sm active:scale-95"
                            : "bg-slate-100 text-slate-400"
                        } disabled:cursor-not-allowed disabled:scale-100`}
                      >
                        {importingQuestions ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Importing...</span>
                          </>
                        ) : (
                          <>
                            <ListPlus className="w-3.5 h-3.5" />
                            <span>2. Import Selected</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Preview status note */}
                    {previewQuestionsCount !== null && (
                      <div className="bg-slate-50 border border-slate-250/60 p-3 rounded-xl flex items-start space-x-2.5">
                        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                          Found <strong className="text-slate-800">{previewQuestionsCount} questions</strong> available. Click "2. Import Selected" to append {importParams.count} samples to your exam (duplicates will be auto-skipped).
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. DOCUMENT IMPORT PANEL */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-white p-4 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-700">Import from document</h3>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Upload a PDF, DOCX, or TXT file with pre-typed questions. The system will parse and extract them.</p>
                  </div>

                  <div className="p-5 space-y-4">
                    {parsedQuestions ? (
                      <>
                        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                          <p className="text-xs font-bold text-emerald-800">
                            ✅ {parsedQuestions.length} questions parsed from "{parsedFileName}"
                          </p>
                          <p className="text-[10px] text-emerald-600 mt-1">Review below, then import to this exam.</p>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                          {parsedQuestions.map((q, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 p-2.5 rounded-lg text-xs">
                              <p className="font-bold text-slate-800">
                                <span className="text-slate-400">{idx + 1}.</span> {q.text}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {q.options.map((opt: string, oi: number) => (
                                  <span key={oi} className={`px-2 py-0.5 rounded text-[10px] ${oi === q.correctAnswer ? "bg-green-100 text-green-800 font-bold" : "bg-slate-100 text-slate-500"}`}>
                                    {["A","B","C","D"][oi]}. {opt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handleImportParsedToExam}
                            disabled={importingDocument}
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                          >
                            {importingDocument ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Importing...</span></>
                            ) : (
                              <><ListPlus className="w-3.5 h-3.5" /><span>Import to Exam</span></>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleClearParsed}
                            disabled={importingDocument}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors"
                          >
                            Discard
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Supported formats: <strong>.pdf</strong>, <strong>.docx</strong>, <strong>.txt</strong>
                        </p>
                        <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <strong>Format example:</strong><br />
                          1. What is 2+2?<br />
                          A. 3<br />
                          B. 4<br />
                          C. 5<br />
                          D. 6<br />
                          Answer: B
                        </p>
                        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/30">
                          <input
                            type="file"
                            accept=".pdf,.docx,.txt"
                            className="hidden"
                            disabled={importingDocument}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleParseDocument(file);
                              e.target.value = "";
                            }}
                          />
                          {importingDocument ? (
                            <div className="flex flex-col items-center space-y-1.5">
                              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Parsing document...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center space-y-1.5">
                              <Upload className="w-5 h-5 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Click to upload document</span>
                              <span className="text-[9px] text-slate-400">PDF, DOCX, or TXT up to 10MB</span>
                            </div>
                          )}
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. MANUAL QUESTION CREATION FORM */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2 flex items-center space-x-1.5">
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>Create Manual Question</span>
                  </h3>

                  <form onSubmit={handleAddManualQuestion} className="space-y-4">
                    {/* Question text */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Question Text</label>
                      <textarea
                        rows={2}
                        value={manualQuestion.text}
                        onChange={(e) => setManualQuestion((prev) => ({ ...prev, text: e.target.value }))}
                        placeholder="Write the question prompt here... (LaTeX: $x^2 + y^2 = r^2$)"
                        className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                      <p className="text-[9px] text-slate-400 mt-1">Supports LaTeX: <code className="bg-slate-100 px-1 rounded">$...$</code> inline, <code className="bg-slate-100 px-1 rounded">$$...$$</code> block equations</p>
                    </div>

                    {/* Reading Passage */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Reading Passage (Optional)</label>
                      <textarea
                        rows={3}
                        value={manualQuestion.passage}
                        onChange={(e) => setManualQuestion((prev) => ({ ...prev, passage: e.target.value }))}
                        placeholder="Enter a reading passage, comprehension text, or scientific context..."
                        className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>

                    {/* Diagram / Image Upload */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Diagram / Image (Optional)</label>
                      {manualQuestion.imageUrl ? (
                        <div className="relative group">
                          <img
                            src={`${CBT_BACKEND_URL}${manualQuestion.imageUrl}`}
                            alt="Question diagram"
                            className="w-full max-h-40 object-contain rounded-xl border border-slate-200 bg-white p-2"
                          />
                          <button
                            type="button"
                            onClick={() => setManualQuestion((prev) => ({ ...prev, imageUrl: "" }))}
                            className="absolute top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label
                          className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                            uploadingImage
                              ? "border-blue-300 bg-blue-50/50"
                              : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30"
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingImage}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file);
                            }}
                          />
                          {uploadingImage ? (
                            <div className="flex flex-col items-center space-y-1.5">
                              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Uploading...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center space-y-1.5">
                              <Upload className="w-5 h-5 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Click to upload diagram</span>
                              <span className="text-[9px] text-slate-400">PNG, JPG, GIF, WebP up to 5MB</span>
                            </div>
                          )}
                        </label>
                      )}
                    </div>

                    {/* Option inputs */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Answer Choices (Fill All Four)</label>
                      {manualQuestion.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center space-x-2">
                          <span className="text-xs font-extrabold text-slate-400 w-5">{["A", "B", "C", "D"][optIdx]}</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...manualQuestion.options];
                              newOpts[optIdx] = e.target.value;
                              setManualQuestion((prev) => ({ ...prev, options: newOpts }));
                            }}
                            placeholder={`Choice ${["A", "B", "C", "D"][optIdx]}...`}
                            className="flex-1 text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Correct index and mark grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Correct Option</label>
                        <select
                          value={manualQuestion.correctAnswer}
                          onChange={(e) => setManualQuestion((prev) => ({ ...prev, correctAnswer: Number(e.target.value) }))}
                          className="w-full text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl"
                        >
                          <option value={0}>Choice A</option>
                          <option value={1}>Choice B</option>
                          <option value={2}>Choice C</option>
                          <option value={3}>Choice D</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Marks Allocation</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={manualQuestion.marks}
                          onChange={(e) => setManualQuestion((prev) => ({ ...prev, marks: Number(e.target.value) }))}
                          className="w-full text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Explanation / Corrections Tip (Optional)</label>
                      <input
                        type="text"
                        value={manualQuestion.explanation}
                        onChange={(e) => setManualQuestion((prev) => ({ ...prev, explanation: e.target.value }))}
                        placeholder="Why is this answer correct? Displays after submit."
                        className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={addingManualQuestion}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-1.5 shadow-md transition-colors"
                    >
                      {addingManualQuestion ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Question...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Append Question</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

              </div>

            </div>

          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-500 text-sm font-medium">Synchronizing administration systems...</p>
          </div>
        ) : (
          /* MAIN ADMIN DASHBOARD OVERVIEW VIEWS */
          <div className="space-y-5 sm:space-y-8 animate-fade-in">
            <CbtGreeting name={displayName} roleLabel={roleLabel} school={orgName} />

            {/* Metric cards: fluid responsive grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
                <div className="bg-blue-50 p-2 sm:p-3 rounded-xl text-blue-600 w-fit lg:order-2">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="lg:order-1 flex flex-col-reverse gap-1 lg:block">
                  <p className="text-[11px] sm:text-xs leading-snug font-semibold text-slate-500 uppercase tracking-wide sm:tracking-wider">Total Assessment Templates</p>
                  <p className="text-2xl font-black text-slate-800 sm:mt-1 tracking-tight">{stats.totalExams}</p>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
                <div className="bg-emerald-50 p-2 sm:p-3 rounded-xl text-emerald-600 w-fit lg:order-2">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="lg:order-1 flex flex-col-reverse gap-1 lg:block">
                  <p className="text-[11px] sm:text-xs leading-snug font-semibold text-slate-500 uppercase tracking-wide sm:tracking-wider">Published Active Exams</p>
                  <p className="text-2xl font-black text-slate-800 sm:mt-1 tracking-tight">{stats.publishedExams}</p>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
                <div className="bg-violet-50 p-2 sm:p-3 rounded-xl text-violet-600 w-fit lg:order-2">
                  <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="lg:order-1 flex flex-col-reverse gap-1 lg:block">
                  <p className="text-[11px] sm:text-xs leading-snug font-semibold text-slate-500 uppercase tracking-wide sm:tracking-wider">Graded Answer Sheets</p>
                  <p className="text-2xl font-black text-slate-800 sm:mt-1 tracking-tight">{stats.totalSubmissions}</p>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
                <div className="bg-amber-50 p-2 sm:p-3 rounded-xl text-amber-600 w-fit lg:order-2">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="lg:order-1 flex flex-col-reverse gap-1 lg:block">
                  <p className="text-[11px] sm:text-xs leading-snug font-semibold text-slate-500 uppercase tracking-wide sm:tracking-wider">Average Scoring Ratio</p>
                  <p className="text-2xl font-black text-slate-800 sm:mt-1 tracking-tight">{stats.avgScore}%</p>
                </div>
              </div>

            </div>

            {/* Navigation Tabs and Main Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              {/* Admins see 4 tabs, which don't fit a phone-width screen —
                  scroll horizontally instead of silently clipping "Edge
                  Appliances" off the edge with no way to reach it. */}
              <div className="hidden sm:flex space-x-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto snap-x snap-mandatory scrollbar-hide flex-nowrap [-webkit-overflow-scrolling:touch]">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`snap-start shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeTab === "overview" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Dashboard Overview
                </button>
                <button
                  onClick={() => setActiveTab("exams")}
                  className={`snap-start shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeTab === "exams" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Assessment Templates
                </button>
                {isAdmin && (
                <button
                  onClick={() => setActiveTab("students")}
                  className={`snap-start shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeTab === "students" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Grade Auditor
                </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab("appliances")}
                    className={`snap-start shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      activeTab === "appliances" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {EDGE_MODE ? "This Device" : "Edge Appliances"}
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-xs min-h-[48px] sm:min-h-0 py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/10 active:scale-95 transition-all w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create Exam Template</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW SUMMARY PANEL */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 gap-8">
                {/* Quick actions and summaries */}
                <div className="space-y-6">
                  
                  {/* Greeting */}
                  <div className="bg-blue-50/60 p-8 rounded-3xl border border-blue-100/60 flex flex-col sm:flex-row items-start justify-between gap-6">
                    <div>
                      <h2 className="text-xl font-bold text-blue-900 mb-2">CBT Administrative Console</h2>
                      <p className="text-xs text-blue-600/60 leading-relaxed max-w-lg">
                        Welcome to your unified testing center. From here, you can build exam sheets, import bulk questions directly from proxy SSCE archives, and audit live student performances.
                      </p>
                    </div>
                  </div>

                  {/* High level candidates auditor mini-list — backs onto the
                      admin-only Grade Auditor tab, so hide it for teachers
                      rather than showing a "View All" that goes nowhere and
                      a falsely-empty list (their data for this is never
                      fetched). */}
                  {isAdmin && (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Performance Rankings Preview</h3>
                      <button
                        onClick={() => setActiveTab("students")}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        View All
                      </button>
                    </div>
                    
                    {students.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-6">No candidates have taken an assessment yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {students.slice(0, 5).map((student, idx) => (
                          <div key={student.studentId} className="flex items-center justify-between p-3.5 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors cursor-pointer" onClick={() => handleOpenStudentDetail(student)}>
                            <div className="flex items-center space-x-3">
                              <span className="w-6 h-6 bg-slate-100 rounded-full font-bold text-[10px] text-slate-400 flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 capitalize">
                                  {student.info ? `${toTitleCase(student.info.lastName)} ${toTitleCase(student.info.firstName)}` : "Student Candidates ID: " + student.studentId.slice(0,8)}
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">{student.totalExams} Exams completed</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                                {student.avgPercentage}% Avg
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                </div>

                {/* Right column placeholder — removed Platform Actions per consolidation */}
              </div>
            )}

            {/* TAB 2: EXAMS LIST MANAGEMENT */}
            {activeTab === "exams" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 bg-blue-600 rounded-full"></span>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">CBT Assessment Templates</h3>
                </div>

                {exams.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700">No Assessment Sheets</p>
                    <p className="text-xs text-slate-500 mt-1 mb-6">Create a structure and load manual or proxy questions to make exams live.</p>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md inline-flex items-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create First Template</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {exams.map((exam) => (
                      <div
                        key={exam.id}
                        onClick={() => handleOpenResults(exam)}
                        className="bg-white rounded-[20px] shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden p-4 sm:p-6 flex flex-col justify-between sm:min-h-[220px]"
                      >
                        <div>
                          {/* Top row: title & More icon */}
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="text-[15px] font-bold text-slate-900 leading-snug">
                              {exam.title}
                            </h4>
                            <button className="text-slate-300 hover:text-slate-500 flex-shrink-0">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </div>
                          
                          <p className="text-[13px] italic text-slate-400 mt-3 line-clamp-2 pr-4">
                            {exam.description || "no description"}
                          </p>
                          
                          {/* Status Badge */}
                          <div className="mt-4">
                            {exam.status === "published" ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                Draft
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom row: meta left + edit right */}
                        <div className="flex items-center justify-between mt-6">
                          <div className="flex items-center gap-4 text-[12px] font-medium text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Layers className="w-4 h-4" />
                              {exam._count?.questions || 0} Q
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              {exam.duration} min
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDesigner(exam);
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[12px] px-4 py-2 rounded-[10px] transition-colors"
                          >
                            Edit Test
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CANDIDATE GRADES AUDITOR */}
            {isAdmin && activeTab === "students" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 bg-blue-600 rounded-full"></span>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Performance Records</h3>
                </div>

                {students.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700">No Grades Registered</p>
                    <p className="text-xs text-slate-500 mt-1">Once candidates complete tests, their grading metrics will appear here.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="px-6 py-5 text-xs font-semibold tracking-wider text-slate-500">Student Name</th>
                              <th className="px-6 py-5 text-xs font-semibold tracking-wider text-slate-500">Class</th>
                              <th className="px-6 py-5 text-xs font-semibold tracking-wider text-slate-500 text-center">Tests Taken</th>
                              <th className="px-6 py-5 text-xs font-semibold tracking-wider text-slate-500 text-center">Average Score</th>
                              <th className="px-6 py-5 text-xs font-semibold tracking-wider text-slate-500">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {students.map((student) => {
                              const isExcellent = student.avgPercentage >= 70;
                              const isGood = student.avgPercentage >= 50;

                              return (
                                <tr key={student.studentId} onClick={() => handleOpenStudentDetail(student)} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                                  <td className="px-6 py-5 font-semibold text-slate-800 text-sm capitalize">
                                    {student.info ? `${toTitleCase(student.info.lastName)} ${toTitleCase(student.info.firstName)}` : "Candidate ID: " + student.studentId.slice(0,8)}
                                  </td>
                                  <td className="px-6 py-5 text-sm text-slate-600">
                                    {student.info?.className || "Unassigned"}
                                  </td>
                                  <td className="px-6 py-5 text-sm font-semibold text-slate-700 text-center">
                                    {student.totalExams}
                                  </td>
                                  <td className="px-6 py-5 text-sm font-bold text-blue-700 text-center">
                                    {student.avgPercentage}%
                                  </td>
                                  <td className="px-6 py-5">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                      isExcellent
                                        ? "bg-green-50 text-green-700"
                                        : isGood
                                        ? "bg-blue-50 text-blue-700"
                                        : "bg-rose-50 text-rose-700"
                                    }`}>
                                      {isExcellent ? "Excellent" : isGood ? "Average" : "Needs Review"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile cards */}
                    <div className="block md:hidden space-y-3">
                      {students.map((student) => {
                        const isExcellent = student.avgPercentage >= 70;
                        const isGood = student.avgPercentage >= 50;

                        return (
                          <div
                            key={student.studentId}
                            onClick={() => handleOpenStudentDetail(student)}
                            className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer active:scale-[0.98] transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-base font-semibold text-slate-900 capitalize truncate">
                                  {student.info ? `${toTitleCase(student.info.lastName)} ${toTitleCase(student.info.firstName)}` : "Candidate ID: " + student.studentId.slice(0,8)}
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                  {student.info?.className || "Unassigned"}
                                </p>
                              </div>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                                isExcellent
                                  ? "bg-green-50 text-green-700"
                                  : isGood
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}>
                                {isExcellent ? "Excellent" : isGood ? "Average" : "Needs Review"}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                              <span>{student.totalExams} tests</span>
                              <span className="font-semibold text-blue-700">{student.avgPercentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* EDGE APPLIANCES TAB — admin only */}
            {isAdmin && activeTab === "appliances" && (
              EDGE_MODE
                ? <EdgeDeviceTab />
                : <EdgeAppliancesTab orgSlug={resolvedOrgSlug} exams={exams} />
            )}

          </div>
        )}
      </main>

      {!accessDenied && !designerExam && (
        <MobileSegmentBar
          className="sm:hidden"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { key: "overview", label: "Overview", icon: LayoutDashboard },
            { key: "exams", label: "Exams", icon: FileText },
            ...(isAdmin
              ? [
                  { key: "students" as const, label: "Grades", icon: ShieldCheck },
                  { key: "appliances" as const, label: "Devices", icon: HardDrive },
                ]
              : []),
          ]}
        />
      )}

      {/* CREATE EXAM TEMPLATE FORM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92dvh] overflow-y-auto border border-slate-200 shadow-2xl p-6 pb-safe sm:pb-6 relative">
            
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 mb-2">Create Exam Template</h3>
            <p className="text-slate-500 text-xs mb-6">Set up parameters for your newly created test sheet.</p>

            <form onSubmit={handleCreateExam} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Exam Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics Midterm Assessment"
                  value={newExamData.title}
                  onChange={(e) => setNewExamData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Summarize the core topics covered..."
                  value={newExamData.description}
                  onChange={(e) => setNewExamData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:ring-blue-500"
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Assessment Type</label>
                <select
                  value={newExamData.examType}
                  onChange={(e) => setNewExamData((prev) => ({ ...prev, examType: e.target.value }))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                >
                  <option value="school">School Assessment</option>
                  <option value="ssce">SSCE Board Practice Assessment</option>
                </select>
              </div>

              {/* Subject selector — teachers are scoped to their assigned subjects */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Subject {!isAdmin && <span className="text-rose-500">*</span>}
                </label>
                <select
                  value={newExamData.subjectId}
                  onChange={(e) => setNewExamData((prev) => ({ ...prev, subjectId: e.target.value }))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                >
                  <option value="">
                    {orgSubjects.length === 0 ? "No subjects available" : isAdmin ? "Select subject (optional)" : "Select your subject"}
                  </option>
                  {orgSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.code ? ` (${s.code})` : ""}
                    </option>
                  ))}
                </select>
                {!isAdmin && orgSubjects.length === 0 && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    No subjects are assigned to you yet. Ask an admin to assign subjects via HCORE.
                  </p>
                )}
              </div>

              {/* Conditionally render SSCE parameters */}
              {newExamData.examType === "ssce" && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Board</label>
                    <select
                      value={newExamData.ssceBoard}
                      onChange={(e) => setNewExamData((prev) => ({ ...prev, ssceBoard: e.target.value }))}
                      className="w-full text-xs bg-white border border-slate-200 p-2 rounded-xl"
                    >
                      <option value="waec">WAEC</option>
                      <option value="neco">NECO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Year</label>
                    <input
                      type="number"
                      value={newExamData.ssceYear}
                      onChange={(e) => setNewExamData((prev) => ({ ...prev, ssceYear: Number(e.target.value) }))}
                      className="w-full text-xs bg-white border border-slate-200 p-2 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Time and Pass Mark */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Duration (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={newExamData.duration}
                    onChange={(e) => setNewExamData((prev) => ({ ...prev, duration: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Pass Mark (%)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={newExamData.passMark}
                    onChange={(e) => setNewExamData((prev) => ({ ...prev, passMark: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                  />
                </div>
              </div>

              {/* Shuffle Checkbox */}
              <div className="flex items-center space-x-2.5 pt-2">
                <input
                  type="checkbox"
                  id="shuffleQuestions"
                  checked={newExamData.shuffleQuestions}
                  onChange={(e) => setNewExamData((prev) => ({ ...prev, shuffleQuestions: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="shuffleQuestions" className="text-xs font-bold text-slate-650 cursor-pointer">
                  Shuffle question orders for each candidate
                </label>
              </div>

              {/* Assignment Target Selector (admins only) */}
              {isAdmin && (
              <div className="border-t border-slate-100 pt-4 mt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Auto-Assign After Creation (Optional)</label>
                <div className="flex space-x-2 mb-3">
                  {[
                    { value: "none", label: "No" },
                    { value: "class", label: "Class" },
                    { value: "student", label: "Student" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setAssignTarget(opt.value as "none" | "class" | "student");
                        if (opt.value !== "none") loadTeacherClasses();
                      }}
                      className={`flex-1 text-xs font-bold py-2 rounded-xl border transition-all ${
                        assignTarget === opt.value
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {assignTarget === "class" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Select Class</label>
                    {teacherClasses.length === 0 ? (
                      <p className="text-xs text-slate-400">No classes assigned to you.</p>
                    ) : (
                      <select
                        value={targetClassId}
                        onChange={(e) => setTargetClassId(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      >
                        <option value="">-- Select Class --</option>
                        {teacherClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {assignTarget === "student" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Select Class</label>
                      {teacherClasses.length === 0 ? (
                        <p className="text-xs text-slate-400">No classes assigned to you.</p>
                      ) : (
                        <select
                          value={targetClassId}
                          onChange={(e) => {
                            setTargetClassId(e.target.value);
                            setTargetStudentId("");
                            if (e.target.value) loadClassStudents(e.target.value);
                          }}
                          className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                        >
                          <option value="">-- Select Class --</option>
                          {teacherClasses.map((cls) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    {targetClassId && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Select Student</label>
                        {loadingStudents ? (
                          <div className="flex items-center space-x-2 text-xs text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Loading students...</span></div>
                        ) : classStudents.length === 0 ? (
                          <p className="text-xs text-slate-400">No students in this class.</p>
                        ) : (
                          <select
                            value={targetStudentId}
                            onChange={(e) => setTargetStudentId(e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                          >
                            <option value="">-- Select Student --</option>
                            {classStudents.map((s) => (
                              <option key={s.id} value={s.id}>{toTitleCase(s.lastName)} {toTitleCase(s.firstName)} ({s.admissionNumber})</option>
                            ))}
                          </select>
                        )}
                      </div>
                     )}
                   </div>
                 )}
               </div>
               )}

               <div className="flex items-center space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3 px-4 rounded-xl transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingExam || (assignTarget === "class" && !targetClassId) || (assignTarget === "student" && (!targetClassId || !targetStudentId))}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md shadow-blue-500/10 transition-all flex items-center justify-center space-x-1.5"
                >
                  {creatingExam ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Template</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN EXAM MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-sm w-full max-h-[92dvh] overflow-y-auto border border-slate-200 shadow-2xl p-6 pb-safe sm:pb-6 relative">
            <button
              onClick={() => setShowAssignModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 mb-2">Assign Exam</h3>
            <p className="text-slate-500 text-xs mb-6">Select target and publish this exam.</p>

            <div className="space-y-4">
              {/* Target type toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Assign To</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => { setAssignTargetType("class"); setSelectedStudentId(""); }}
                    className={`flex-1 text-xs font-bold py-2 rounded-xl border transition-all ${
                      assignTargetType === "class"
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    Class
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignTargetType("student")}
                    className={`flex-1 text-xs font-bold py-2 rounded-xl border transition-all ${
                      assignTargetType === "student"
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    Individual Student
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Class</label>
                {teacherClasses.length === 0 ? (
                  <p className="text-xs text-slate-400">No classes assigned to you.</p>
                ) : (
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedStudentId("");
                      if (e.target.value && assignTargetType === "student") {
                        loadAssignClassStudents(e.target.value);
                      }
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                  >
                    <option value="">-- Select Class --</option>
                    {teacherClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {assignTargetType === "student" && selectedClassId && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Student</label>
                  {loadingAssignStudents ? (
                    <div className="flex items-center space-x-2 text-xs text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Loading students...</span></div>
                  ) : assignClassStudents.length === 0 ? (
                    <p className="text-xs text-slate-400">No students in this class.</p>
                  ) : (
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                    >
                      <option value="">-- Select Student --</option>
                      {assignClassStudents.map((s) => (
                        <option key={s.id} value={s.id}>{toTitleCase(s.lastName)} {toTitleCase(s.firstName)} ({s.admissionNumber})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3 px-4 rounded-xl transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={
                    !selectedClassId ||
                    (assignTargetType === "student" && !selectedStudentId) ||
                    assigningId === assignExamId
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {assigningId === assignExamId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <span>Assign & Publish</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS MODAL */}
      {resultsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[85vh] shadow-xl p-6 pb-safe sm:pb-6 relative overflow-y-auto">
            <button
              onClick={() => setResultsModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 mb-1">{resultsModal.exam?.title || "Exam Results"}</h3>
            <p className="text-xs text-slate-500 mb-5">Student submissions and performance overview</p>

            {!loadingResults && resultsModal.exam?.examType === "school" && (
              <div className={`flex items-center justify-between gap-3 mb-5 p-3.5 rounded-xl border ${
                resultsModal.exam.resultsReleased
                  ? "bg-emerald-50 border-emerald-100"
                  : "bg-amber-50 border-amber-100"
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  {resultsModal.exam.resultsReleased ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Hourglass className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <p className={`text-xs font-semibold leading-snug ${resultsModal.exam.resultsReleased ? "text-emerald-800" : "text-amber-800"}`}>
                    {resultsModal.exam.resultsReleased
                      ? "Results are visible to students."
                      : "Results are hidden from students until you release them."}
                  </p>
                </div>
                {resultsModal.exam.resultsReleased ? (
                  <button
                    onClick={handleWithdrawResults}
                    disabled={releasingResults}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 hover:bg-emerald-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {releasingResults ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Withdraw</span>
                  </button>
                ) : (
                  <button
                    onClick={handleReleaseResults}
                    disabled={releasingResults}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  >
                    {releasingResults ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Release Results</span>
                  </button>
                )}
              </div>
            )}

            {loadingResults ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-slate-800">{resultsModal.totalSubmissions}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Submissions</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-slate-800">{resultsModal.averageScore}%</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Average</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-emerald-700">{resultsModal.passCount}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Passed</p>
                  </div>
                </div>

                {/* Results list */}
                {resultsModal.results.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-sm font-medium">No submissions yet</p>
                    <p className="text-xs mt-1">Results will appear once students complete this exam.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resultsModal.results.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{r.studentName}</p>
                          <p className="text-[11px] text-slate-500">{r.admissionNumber || r.studentId.slice(0, 8)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          {r.cheatingStatus === "cheating" && (
                            <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Cheated
                            </span>
                          )}
                          <div className="text-right">
                            <p className="text-sm font-extrabold text-slate-800">{r.score}/{r.totalMarks}</p>
                            <p className={`text-[11px] font-bold ${r.cheatingStatus === "cheating" ? "text-rose-600" : r.passed ? "text-emerald-600" : "text-rose-600"}`}>
                              {r.percentage}% {r.cheatingStatus === "cheating" ? "Disqualified" : r.passed ? "Pass" : "Fail"}
                            </p>
                          </div>
                          {r.timeTaken && (
                            <div className="text-[11px] text-slate-400 text-right min-w-[60px]">
                              <p>{Math.floor(r.timeTaken / 60)}m {r.timeTaken % 60}s</p>
                            </div>
                          )}
                          <span className={`h-2 w-2 rounded-full ${r.cheatingStatus === "cheating" ? "bg-rose-700" : r.passed ? "bg-emerald-500" : "bg-rose-500"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="mt-6">
              <button
                onClick={() => setResultsModal(null)}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSKEY MODAL */}
      {passkeyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[85vh] shadow-xl p-6 pb-safe sm:pb-6 relative overflow-y-auto">
            <button
              onClick={() => setPasskeyModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-[#0B1220] mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-[#1447E6]" />
              {passkeyModal.examTitle}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Students must enter this passkey before they can start the exam.
            </p>

            {loadingPasskey ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#1447E6] animate-spin" /></div>
            ) : (
              <>
                <div className={`flex items-center justify-between gap-3 mb-5 p-3.5 rounded-xl border ${
                  passkeyModal.passkeyRequired
                    ? "bg-[#F5A623]/10 border-[#F5A623]/30"
                    : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Key className={`w-4 h-4 shrink-0 ${passkeyModal.passkeyRequired ? "text-[#8a5c10]" : "text-slate-400"}`} />
                    <p className={`text-xs font-semibold leading-snug ${passkeyModal.passkeyRequired ? "text-[#8a5c10]" : "text-slate-600"}`}>
                      {passkeyModal.passkeyRequired
                        ? `Passkey required — ${passkeyModal.passkeyMode === "shared" ? "one shared code for the class" : "a unique code per student"}.`
                        : "No passkey required — any assigned student can start this exam directly."}
                    </p>
                  </div>
                  {passkeyModal.passkeyRequired && (
                    <button
                      onClick={handleDisablePasskey}
                      disabled={generatingPasskey}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Turn Off
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <button
                    onClick={() => handleGeneratePasskey("shared")}
                    disabled={generatingPasskey}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#1447E6] hover:bg-[#1139c2] px-3.5 py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                  >
                    {generatingPasskey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : passkeyModal.passkeyMode === "shared" ? <RefreshCw className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
                    <span>{passkeyModal.passkeyMode === "shared" ? "Regenerate Shared Code" : "Generate Shared Code"}</span>
                  </button>
                  <button
                    onClick={() => handleGeneratePasskey("unique")}
                    disabled={generatingPasskey}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#1447E6] bg-[#1447E6]/10 hover:bg-[#1447E6]/20 px-3.5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {generatingPasskey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : passkeyModal.passkeyMode === "unique" ? <RefreshCw className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                    <span>{passkeyModal.passkeyMode === "unique" ? "Regenerate Unique Codes" : "Generate Unique Codes"}</span>
                  </button>
                </div>

                {passkeyModal.passkeyMode === "shared" && passkeyModal.passkey && (
                  <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-2">
                    <span className="font-mono text-2xl font-black tracking-[0.3em] text-[#0B1220]">
                      {passkeyModal.passkey}
                    </span>
                    <button
                      onClick={() => copyToClipboard(passkeyModal.passkey!, "Passkey")}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                )}

                {passkeyModal.passkeyMode === "unique" && passkeyModal.students.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {passkeyModal.students.length} Student Codes
                      </p>
                      <button
                        onClick={() => copyToClipboard(
                          passkeyModal.students.map((s) => `${s.lastName} ${s.firstName} (${s.admissionNumber}): ${s.code}`).join("\n"),
                          "Student code list"
                        )}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1447E6] hover:text-[#1139c2]"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy All</span>
                      </button>
                    </div>
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {passkeyModal.students.map((s) => (
                        <div key={s.studentId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{s.lastName} {s.firstName}</p>
                            <p className="text-[10px] text-slate-400">{s.admissionNumber}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-sm font-bold text-[#0B1220] tracking-widest">{s.code}</span>
                            <button
                              onClick={() => s.code && copyToClipboard(s.code, `${s.firstName}'s passkey`)}
                              className="p-1.5 text-slate-400 hover:text-[#1447E6] hover:bg-[#1447E6]/10 rounded-lg transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-6">
              <button
                onClick={() => setPasskeyModal(null)}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      {studentDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-3xl w-full max-h-[92dvh] sm:max-h-[85vh] shadow-xl p-6 pb-safe sm:pb-6 relative overflow-y-auto">
            <button
              onClick={() => { setStudentDetail(null); setSelectedExamResult(null); setViewingQuestions(false); }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingStudentDetail ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
            ) : viewingQuestions && selectedExamResult ? (
              /* ── Question-level breakdown ── */
              <>
                <button
                  onClick={() => setViewingQuestions(false)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
                >
                  ← Back to exam list
                </button>
                <h3 className="text-lg font-extrabold text-slate-800 mb-1">{selectedExamResult.examTitle}</h3>
                <div className="flex items-center gap-4 mb-5 text-xs text-slate-500">
                  <span className="font-bold">{selectedExamResult.score}/{selectedExamResult.totalMarks}</span>
                  <span className={`font-bold ${selectedExamResult.passed ? "text-emerald-600" : "text-rose-600"}`}>
                    {selectedExamResult.percentage}%
                  </span>
                  <span>{selectedExamResult.totalQuestions} questions</span>
                </div>

                <div className="space-y-3">
                  {selectedExamResult.questions.map((q: any, idx: number) => {
                    return (
                      <div key={q.questionId} className={`rounded-xl p-4 ${
                        q.isCorrect ? "bg-emerald-50/60" : "bg-rose-50/60"
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-bold text-slate-800">Q{idx + 1}. {q.text}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            q.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}>
                            {q.isCorrect ? `+${q.marks}` : `0/${q.marks}`}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                          {(q.options || []).map((opt: string, oi: number) => (
                            <div key={oi} className={`text-xs px-3 py-1.5 rounded-lg ${
                              oi === q.correctAnswer ? "bg-emerald-100 text-emerald-800 font-semibold" :
                              oi === q.selectedAnswer && !q.isCorrect ? "bg-rose-100 text-rose-800 font-semibold" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {String.fromCharCode(65 + oi)}. {opt}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <p className="text-[11px] text-slate-500 mt-1 pt-2 border-t border-slate-200/60">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* ── Exam list for this student ── */
              <>
                <h3 className="text-lg font-extrabold text-slate-800 mb-1 capitalize">
                  {toTitleCase(studentDetail.student?.lastName || "")} {toTitleCase(studentDetail.student?.firstName || "")}
                </h3>
                <p className="text-xs text-slate-500 mb-2">
                  {studentDetail.student?.admissionNumber || ""}
                  {studentDetail.student?.className ? ` · Class: ${studentDetail.student.className}` : ""}
                </p>

                {/* Performance summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-slate-800">{studentDetail.totalExams}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Exams Taken</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-slate-800">{studentDetail.averageScore}%</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Average</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-black ${studentDetail.trend >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {studentDetail.trend >= 0 ? "+" : ""}{studentDetail.trend}%
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Trend</p>
                  </div>
                </div>

                {/* Exam list */}
                {studentDetail.exams.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm font-medium">No exams completed yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assessment History</p>
                    {studentDetail.exams.map((exam: any) => (
                      <div
                        key={exam.resultId}
                        onClick={() => { setSelectedExamResult(exam); setViewingQuestions(true); }}
                        className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{exam.examTitle}</p>
                          <p className="text-[11px] text-slate-500">
                            {new Date(exam.submittedAt).toLocaleDateString()} · {Math.floor(exam.timeTaken / 60)}m {exam.timeTaken % 60}s
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {exam.cheatingStatus === "cheating" && (
                            <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Cheated
                            </span>
                          )}
                          <div className="text-right">
                            <p className="text-sm font-extrabold text-slate-800">{exam.score}/{exam.totalMarks}</p>
                            <p className={`text-[11px] font-bold ${exam.cheatingStatus === "cheating" ? "text-rose-600" : exam.passed ? "text-emerald-600" : "text-rose-600"}`}>
                              {exam.percentage}%{exam.cheatingStatus === "cheating" ? " (DQ)" : ""}
                            </p>
                          </div>
                          <div className={`h-8 w-1 rounded-full ${exam.cheatingStatus === "cheating" ? "bg-rose-700" : exam.passed ? "bg-emerald-500" : "bg-rose-500"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="mt-6">
              <button
                onClick={() => { setStudentDetail(null); setSelectedExamResult(null); setViewingQuestions(false); }}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
