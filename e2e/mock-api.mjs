// Stand-ins for HCORE, HSMS and HCBT for the end-to-end tests: one small HTTP
// server per backend, holding one school (Greenfield Academy) with a parent,
// a pupil, a CBT exam, fee invoices and published results.
//
// The Next dev server (server actions and server components) and the browser
// both call these, so they answer CORS like the real APIs. Tests read what was
// sent with GET /__requests and start clean with POST /__reset (any port).

import http from "node:http";

export const PORTS = { hcore: 4911, hsms: 4912, hcbt: 4913 };

const ORG = { id: "0f5f1a52-0000-4000-8000-000000000001", name: "Greenfield Academy", slug: "greenfield" };
const RESULTS_PERIOD = { term: "First Term", academicYear: "2026/2027" };
const RESULTS_CLASS = { id: "jss1a", name: "JSS 1A" };
const RESULTS_TEMPLATE = {
  id: "greenfield-results",
  name: "Greenfield Results",
  classLevelId: RESULTS_CLASS.id,
  classLevel: RESULTS_CLASS,
  isApproved: true,
  isDefault: true,
  midTermTotal: 40,
  metrics: [
    { name: "Continuous Assessment 1", label: "CA 1", weight: 100, stage: "MID_TERM" },
    { name: "Terminal Examination", label: "Exam", weight: 100, stage: "END_OF_TERM" },
  ],
  gradeScale: [{ grade: "A", min: 70, max: 100 }],
};

// Tokens are unsigned JWT-shaped strings: Hweb's proxy only reads their expiry.
function token(sub, extra = {}) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ sub, exp: Math.floor(Date.now() / 1000) + 3600, ...extra })}.test`;
}

const USERS = {
  parent: {
    principalId: "0f5f1a52-0000-4000-8000-0000000000a1",
    identifierType: "EMAIL",
    identifier: "mrs.obi@greenfield.test",
    password: "Greenfield-Parent-2026",
    displayName: "Mrs Ngozi Obi",
    roles: ["PARENT"],
    products: { HSMS: { status: "ACTIVE", roles: ["PARENT"] } },
  },
  pupil: {
    principalId: "0f5f1a52-0000-4000-8000-0000000000b1",
    identifierType: "ADMISSION_NUMBER",
    identifier: "GF/2026/001",
    password: "ada-2026",
    displayName: "Ada Obi",
    roles: ["STUDENT", "CANDIDATE"],
    learnerId: "0f5f1a52-0000-4000-8000-0000000000c1",
    products: { HSMS: { status: "ACTIVE", roles: ["STUDENT"] }, HCBT: { status: "ACTIVE", roles: ["CANDIDATE"] } },
  },
  // An exam candidate with an email sign-in (e.g. a private WAEC candidate).
  candidate: {
    principalId: "0f5f1a52-0000-4000-8000-0000000000b2",
    identifierType: "EMAIL",
    identifier: "chidi.candidate@greenfield.test",
    password: "Candidate-2026",
    displayName: "Chidi Eze",
    roles: ["CANDIDATE"],
    learnerId: "0f5f1a52-0000-4000-8000-0000000000c2",
    products: { HCBT: { status: "ACTIVE", roles: ["CANDIDATE"] } },
  },
  accountant: {
    principalId: "0f5f1a52-0000-4000-8000-0000000000d2",
    identifierType: "EMAIL",
    identifier: "bursar@greenfield.test",
    password: "Greenfield-Bursar-2026",
    displayName: "Mrs Funke Adeyemi",
    roles: ["ACCOUNTANT"],
    assignments: [{ id: "as-bursar", type: "ACCOUNTANT" }],
    products: { HSMS: { status: "ACTIVE", roles: ["ACCOUNTANT"] } },
  },
  teacher: {
    principalId: "0f5f1a52-0000-4000-8000-0000000000d3",
    identifierType: "EMAIL",
    identifier: "maths.teacher@greenfield.test",
    password: "Greenfield-Maths-2026",
    displayName: "Mr Adebayo Okafor",
    roles: ["TEACHER"],
    assignments: [{
      id: "as-maths-jss1a", type: "SUBJECT_TEACHER",
      classLevelId: "jss1a", classLevelName: "JSS 1A", subjectId: "maths", subjectName: "Mathematics",
      classLevel: { id: "jss1a", name: "JSS 1A" }, subject: { id: "maths", name: "Mathematics" },
    }],
    products: { HSMS: { status: "ACTIVE", roles: ["TEACHER"] } },
  },
  admin: {
    principalId: "0f5f1a52-0000-4000-8000-0000000000d4",
    identifierType: "EMAIL",
    identifier: "admin@greenfield.test",
    password: "Greenfield-Admin-2026",
    displayName: "Dr Amaka Eze",
    roles: ["SCHOOL_ADMIN"],
    memberRole: "admin",
    products: { HSMS: { status: "ACTIVE", roles: ["SCHOOL_ADMIN"] }, HCBT: { status: "ACTIVE", roles: ["CBT_ADMIN"] } },
  },
  newTeacher: {
    principalId: "0f5f1a52-0000-4000-8000-0000000000d1",
    identifierType: "EMAIL",
    identifier: "new.teacher@greenfield.test",
    password: "School-Issued-1",
    newPassword: "My-Own-Password-2026",
    displayName: "Mr Tunde Bello",
    roles: ["TEACHER"],
    products: { HSMS: { status: "ACTIVE", roles: ["TEACHER"] } },
  },
};

const CHILD = { id: "stu-ada", firstName: "Ada", lastName: "Obi", admissionNumber: "GF/2026/001" };
// The same child, as the HSMS student profile the pupil sees.
const PUPIL = { ...CHILD, classLevel: { id: "jss1a", name: "JSS 1A" } };
// The same child, as the bursary sees them: ₦100,000 still owed on one bill.
const OWING = {
  id: CHILD.id,
  name: `${CHILD.firstName} ${CHILD.lastName}`,
  admissionNumber: CHILD.admissionNumber,
  className: "JSS 1A",
  balance: 100000,
  invoices: [{
    id: "inv-first-term", term: "2026/2027-TERM1", status: "PARTIALLY_PAID", dueDate: "2026-10-15T00:00:00.000Z",
    total: 155000, paid: 55000, balance: 100000,
    items: [{ description: "Tuition", amount: 135000 }, { description: "Books", amount: 20000 }],
  }],
};

const EXAM = {
  id: "0f5f1a52-0000-4000-8000-0000000000e1",
  title: "JSS 1 Mathematics — First Term Test",
  description: "Answer all questions.",
  duration: 20,
  totalQuestions: 2,
  passMark: 50,
  resultsReleased: false,
  passkeyRequired: false,
  _count: { questions: 2 },
};
const QUESTIONS = [
  { id: "0f5f1a52-0000-4000-8000-0000000000f1", type: "objective", text: "What is 7 × 8?", options: ["54", "56", "58", "64"], marks: 1 },
  { id: "0f5f1a52-0000-4000-8000-0000000000f2", type: "objective", text: "Which of these is a prime number?", options: ["21", "27", "29", "33"], marks: 1 },
];

let state;
function reset() {
  state = {
    requests: [],
    tokens: new Map(),
    submitted: null,
    gradebook: null,
    termResults: new Map([
      ["END_OF_TERM", {
        id: "END_OF_TERM",
        ...RESULTS_PERIOD,
        resultType: "END_OF_TERM",
        studentId: CHILD.id,
        student: CHILD,
        classLevel: RESULTS_CLASS,
        template: RESULTS_TEMPLATE,
        metrics: [],
        totalScore: 86,
        grade: "A",
        position: 1,
        publishedAt: null,
      }],
      ["MID_TERM", {
        id: "MID_TERM",
        ...RESULTS_PERIOD,
        resultType: "MID_TERM",
        studentId: CHILD.id,
        student: CHILD,
        classLevel: RESULTS_CLASS,
        template: RESULTS_TEMPLATE,
        metrics: [],
        totalScore: 85,
        grade: "A",
        position: 1,
        publishedAt: null,
      }],
    ]),
    tickets: [],
    relationalSheet: {
      id: "sheet-physics-rel",
      title: "Physics - JSS 1A (End-Term)",
      status: "pending",
      version: 1,
      assessmentStorageMode: "RELATIONAL",
      templateId: "template-relational",
      template: {
        id: "template-relational",
        name: "Standard 10/10/10/70 Template",
        assessmentCategories: [
          { id: "cat-cw", name: "Classwork", label: "CW", maxMarks: 10, isSingleInstance: false, position: 0 },
          { id: "cat-asgn", name: "Assignments", label: "ASGN", maxMarks: 10, isSingleInstance: false, position: 1 },
          { id: "cat-prj", name: "Projects", label: "PRJ", maxMarks: 10, isSingleInstance: false, position: 2 },
          { id: "cat-exam", name: "Examination", label: "Exam", maxMarks: 70, isSingleInstance: true, position: 3 },
        ],
      },
      classLevel: { id: "jss1a", name: "JSS 1A" },
      subject: { id: "maths", name: "Physics" },
      subAssessments: [
        { id: "sub-cw1", categoryId: "cat-cw", name: "Classwork 1", maxMarks: 10, isSystemGenerated: false, position: 0 },
        { id: "sub-cw2", categoryId: "cat-cw", name: "Classwork 2", maxMarks: 10, isSystemGenerated: false, position: 1 },
        { id: "sub-asgn1", categoryId: "cat-asgn", name: "Assignment 1", maxMarks: 5, isSystemGenerated: false, position: 0 },
        { id: "sub-asgn2", categoryId: "cat-asgn", name: "Assignment 2", maxMarks: 5, isSystemGenerated: false, position: 1 },
        { id: "sub-prj1", categoryId: "cat-prj", name: "Project 1", maxMarks: 10, isSystemGenerated: false, position: 0 },
        { id: "sub-prj2", categoryId: "cat-prj", name: "Project 2", maxMarks: 10, isSystemGenerated: false, position: 1 },
        { id: "sub-exam", categoryId: "cat-exam", name: "Examination", maxMarks: 70, isSystemGenerated: true, position: 0 },
      ],
      scores: {},
    },
    freshRelationalSheet: {
      id: "sheet-agri-rel",
      title: "Agriculture - JSS 1A (End-Term)",
      status: "pending",
      version: 1,
      assessmentStorageMode: "RELATIONAL",
      templateId: "template-agri",
      template: {
        id: "template-agri",
        name: "5/10/15/70 Template",
        assessmentCategories: [
          { id: "cat-agri-cw", name: "Classwork", label: "CW", maxMarks: 5, isSingleInstance: false, position: 0 },
          { id: "cat-agri-asgn", name: "Assignment", label: "ASGN", maxMarks: 10, isSingleInstance: false, position: 1 },
          { id: "cat-agri-ap", name: "Academic Progress", label: "AP", maxMarks: 15, isSingleInstance: false, position: 2 },
          { id: "cat-agri-exam", name: "Examination", label: "Exam", maxMarks: 70, isSingleInstance: true, position: 3 },
        ],
      },
      classLevel: { id: "jss1a", name: "JSS 1A" },
      subject: { id: "agri", name: "Agriculture" },
      subAssessments: [
        { id: "sub-agri-exam", categoryId: "cat-agri-exam", name: "Examination", maxMarks: 70, isSystemGenerated: true, position: 0 },
      ],
      scores: {},
    },
    templates: [{
      ...RESULTS_TEMPLATE,
      assessmentCategories: [
        { id: "cat-1", name: "Continuous Assessment 1", label: "CA 1", maxMarks: 20, isSingleInstance: false, position: 0 },
        { id: "cat-2", name: "Terminal Examination", label: "Exam", maxMarks: 80, isSingleInstance: true, position: 1 },
      ],
    }],
    org: {
      ...ORG,
      primaryColor: "#0F766E",
      secondaryColor: "#115E59",
      country: "Nigeria",
      category: null,
      schoolType: null,
      idPrefix: "HNL",
      nextIdSequence: 1,
      subscriptionTier: "free",
      paymentStatus: "active",
      subscriptionType: "annual",
    },
  };
}
reset();

function userFor(req) {
  const bearer = (req.headers.authorization || "").replace(/^Bearer /, "");
  const cookieToken = (req.headers.cookie || "").match(/(?:hcore_session|hcbt_session)=([^;]+)/)?.[1];
  return state.tokens.get(bearer) || state.tokens.get(cookieToken) || null;
}

function contexts(user) {
  return {
    principal: { id: user.principalId, displayName: user.displayName, primaryEmail: user.identifierType === "EMAIL" ? user.identifier : null },
    organizations: [{ ...state.org, subscribed: ["HSMS", "HCBT"], products: user.products, subscription: { plan: "Standard", status: "ACTIVE" } }],
  };
}

function feeSummary() {
  return {
    students: [{
      student: { ...CHILD, studentType: "day", usesBus: false, classLevel: { id: "jss1a", name: "JSS 1A" } },
      feeSummary: {
        totalFee: 155000, totalBilled: 155000, totalPaid: 55000, balance: 100000,
        assignedFees: [{ id: "sf-1", name: "Tuition", category: "tuition", amount: 135000 }, { id: "sf-2", name: "Books", category: "books", amount: 20000 }],
      },
      invoices: [{
        id: "inv-first-term", academicTerm: "2026/2027-TERM1", status: "PARTIALLY_PAID", dueDate: "2026-10-15T00:00:00.000Z",
        total: 155000, paid: 55000, balance: 100000,
        items: [{ id: "it-1", description: "Tuition", amount: "150000", discountRate: "10" }, { id: "it-2", description: "Books", amount: "20000", discountRate: "0" }],
      }],
      payments: [{ id: "tx-1", reference: "RCPT-0001", amount: 55000, channel: "CASH", status: "SUCCESS", term: "2026/2027-TERM1", createdAt: "2026-09-10T09:00:00.000Z" }],
      suggestedFees: [],
    }],
  };
}

function results(resultType = "END_OF_TERM", user = null) {
  const isMidTerm = resultType === "MID_TERM";
  const isParentUser = Boolean(user?.roles?.includes("PARENT"));
  const adaGroup = {
    student: { ...CHILD, classLevelId: "jss1a", classLevel: { id: "jss1a", name: "JSS 1A", level: 1 } },
    expectedSubjectsCount: 1,
    completedSubjectsCount: 1,
    completionStatus: "recorded",
    averageScore: isMidTerm ? 85 : 87,
    classRank: 1,
    isTemplateApproved: true,
    results: isMidTerm
      ? [{
          id: "sheet-physics-mid",
          title: "Physics - JSS 1A",
          resultType: "MID_TERM",
          termType: "MID_TERM",
          academicTerm: "First Term",
          academicYear: "2026/2027",
          percentage: 85,
          assessments: [{ name: "Class Exercises", total: 10 }, { name: "Mid-Term Exam", total: 30 }],
          columns: ["Class Exercises", "Mid-Term Exam"],
          values: [9, 25],
          subject: { id: "physics", name: "Physics" },
          classLevel: { id: "jss1a", name: "JSS 1A", level: 1 },
          updatedAt: "2026-09-20T12:00:00.000Z",
        }]
      : [{
          id: "sheet-maths",
          title: "Mathematics - JSS 1A",
          resultType: "END_OF_TERM",
          termType: "END_TERM",
          academicTerm: "First Term",
          academicYear: "2026/2027",
          percentage: 87,
          assessments: [{ name: "CA 1", total: 20 }, { name: "CA 2", total: 20 }, { name: "Exam", total: 60 }],
          columns: ["CA 1", "CA 2", "Exam"],
          values: [17, 18, 52],
          subject: { id: "maths", name: "Mathematics" },
          classLevel: { id: "jss1a", name: "JSS 1A", level: 1 },
          updatedAt: "2026-09-25T12:00:00.000Z",
        }],
  };

  if (isParentUser) {
    return [adaGroup];
  }

  const kemiGroup = {
    student: {
      id: "stu-kemi",
      firstName: "Kemi",
      lastName: "Bello",
      admissionNumber: "GF/2026/002",
      classLevelId: "jss1a",
      classLevel: { id: "jss1a", name: "JSS 1A", level: 1 },
    },
    expectedSubjectsCount: 1,
    completedSubjectsCount: 0,
    completionStatus: "pending",
    averageScore: null,
    classRank: null,
    isTemplateApproved: true,
    results: [],
  };

  return [adaGroup, kemiGroup];
}

function resultsEditions(user = null) {
  const isParentUser = Boolean(user?.roles?.includes("PARENT"));
  if (isParentUser) {
    return {
      roleScope: "parent",
      children: [{
        id: CHILD.id,
        firstName: CHILD.firstName,
        lastName: CHILD.lastName,
        admissionNumber: CHILD.admissionNumber,
        classLevel: { id: "jss1a", name: "JSS 1A", level: "1" },
      }],
      editions: [
        {
          key: `2026/2027|First Term|END_OF_TERM|${CHILD.id}`,
          academicYear: "2026/2027",
          academicTerm: "First Term",
          resultType: "END_OF_TERM",
          title: "First Term Result",
          studentIds: [CHILD.id],
          subjectCount: 1,
          subjectCountsByStudent: { [CHILD.id]: 1 },
          isPublished: true,
        },
        {
          key: `2026/2027|First Term|MID_TERM|${CHILD.id}`,
          academicYear: "2026/2027",
          academicTerm: "First Term",
          resultType: "MID_TERM",
          title: "First Term Mid-Term Result",
          studentIds: [CHILD.id],
          subjectCount: 1,
          subjectCountsByStudent: { [CHILD.id]: 1 },
          isPublished: true,
        },
      ],
    };
  }

  return {
    roleScope: "staff",
    editions: [
      {
        key: "2026/2027|First Term|END_OF_TERM",
        academicYear: "2026/2027",
        academicTerm: "First Term",
        resultType: "END_OF_TERM",
        title: "First Term Result",
        totalStudents: 2,
        recordedCount: 1,
        incompleteCount: 0,
        pendingCount: 1,
        averageScore: 87,
        classCount: 1,
        subjectCount: 1,
        isPublished: true,
      },
      {
        key: "2026/2027|First Term|MID_TERM",
        academicYear: "2026/2027",
        academicTerm: "First Term",
        resultType: "MID_TERM",
        title: "First Term Mid-Term Result",
        totalStudents: 2,
        recordedCount: 1,
        incompleteCount: 0,
        pendingCount: 1,
        averageScore: 85,
        classCount: 1,
        subjectCount: 1,
        isPublished: true,
      },
    ],
  };
}

function studentResultsEditions() {
  return {
    roleScope: "student",
    student: {
      id: CHILD.id,
      firstName: CHILD.firstName,
      lastName: CHILD.lastName,
      admissionNumber: CHILD.admissionNumber,
      classLevel: { id: "jss1a", name: "JSS 1A", level: "1" },
    },
    editions: [
      {
        key: "2026/2027|First Term|END_OF_TERM",
        academicYear: "2026/2027",
        academicTerm: "First Term",
        resultType: "END_OF_TERM",
        title: "First Term Result",
        subjectCount: 1,
        isPublished: true,
      },
      {
        key: "2026/2027|First Term|MID_TERM",
        academicYear: "2026/2027",
        academicTerm: "First Term",
        resultType: "MID_TERM",
        title: "First Term Mid-Term Result",
        subjectCount: 1,
        isPublished: true,
      },
    ],
  };
}

function studentResults(resultType = "END_OF_TERM") {
  const isMidTerm = resultType === "MID_TERM";
  return {
    student: { ...CHILD, classLevelId: "jss1a", classLevel: { id: "jss1a", name: "JSS 1A", level: 1 } },
    isTemplateApproved: true,
    approvedTemplate: { id: "tpl-1", name: "Standard Term Template", isApproved: true },
    termResults: [],
    subjects: isMidTerm
      ? [{
          spreadsheetId: "sheet-physics-mid",
          status: "active",
          totalScore: 34,
          subject: { id: "physics", name: "Physics" },
          classLevel: { id: "jss1a", name: "JSS 1A" },
          assessments: [
            { name: "Class Exercises", total: 10, score: 9, percentage: 90 },
            { name: "Mid-Term Exam", total: 30, score: 25, percentage: 83.3 },
          ],
        }]
      : [{
          spreadsheetId: "sheet-maths",
          status: "active",
          totalScore: 87,
          subject: { id: "maths", name: "Mathematics" },
          classLevel: { id: "jss1a", name: "JSS 1A" },
          assessments: [
            { name: "CA 1", total: 20, score: 17, percentage: 85 },
            { name: "CA 2", total: 20, score: 18, percentage: 90 },
            { name: "Exam", total: 60, score: 52, percentage: 86.7 },
          ],
        }],
  };
}

function gradebook() {
  return {
    id: "sheet-maths",
    title: "Mathematics - JSS 1A",
    status: "pending",
    version: state.gradebookVersion ?? 1,
    classLevel: { id: "jss1a", name: "JSS 1A" },
    subject: { id: "maths", name: "Mathematics" },
    assessments: [{ name: "CA 1", total: 20 }, { name: "CA 2", total: 20 }, { name: "Exam", total: 60 }],
    columns: ["CA 1", "CA 2", "Exam"],
    data: state.gradebook ?? [
      { student: CHILD, values: [17, null, null] },
      { student: { id: "stu-kemi", firstName: "Kemi", lastName: "Bello", admissionNumber: "GF/2026/002" }, values: [15, null, null] },
    ],
  };
}

function relationalGradebook(sheet = state.relationalSheet) {
  const categories = sheet.template.assessmentCategories;
  const catById = new Map(categories.map((c) => [c.id, c]));
  const roster = [
    CHILD,
    { id: "stu-kemi", firstName: "Kemi", lastName: "Bello", admissionNumber: "GF/2026/002" },
  ];
  const orderedSubs = [...sheet.subAssessments].sort((a, b) => {
    const ca = catById.get(a.categoryId)?.position ?? 0;
    const cb = catById.get(b.categoryId)?.position ?? 0;
    return ca - cb || a.position - b.position;
  });
  const assessments = orderedSubs.map((sub) => {
    const cat = catById.get(sub.categoryId);
    const recordedScoreCount = roster.filter((stu) => {
      const v = sheet.scores[`${stu.id}:${sub.id}`];
      return v !== undefined && v !== null;
    }).length;
    return {
      id: sub.id,
      categoryId: sub.categoryId,
      categoryName: cat?.name,
      categoryMaxMarks: cat?.maxMarks,
      isSingleInstance: Boolean(cat?.isSingleInstance),
      isSystemGenerated: Boolean(sub.isSystemGenerated),
      name: sub.name,
      total: sub.maxMarks,
      maxObtainableScore: sub.maxMarks,
      position: sub.position,
      recordedScoreCount,
    };
  });
  const data = roster.map((student) => ({
    student,
    values: orderedSubs.map((sub) => {
      const v = sheet.scores[`${student.id}:${sub.id}`];
      return v === undefined || v === null ? "" : v;
    }),
  }));
  const categoryAllocations = categories.map((cat) => {
    const subs = orderedSubs.filter((s) => s.categoryId === cat.id);
    const allocatedMarks = subs.reduce((sum, s) => sum + s.maxMarks, 0);
    return {
      categoryId: cat.id,
      name: cat.name,
      label: cat.label,
      maxMarks: cat.maxMarks,
      allocatedMarks,
      rawMaxTotal: allocatedMarks,
      remainingMarks: 0,
      isSingleInstance: Boolean(cat.isSingleInstance),
      isComplete: subs.length > 0,
      isOverAllocated: false,
      subAssessmentCount: subs.length,
      position: cat.position,
    };
  });
  return {
    id: sheet.id,
    title: sheet.title,
    status: sheet.status,
    version: sheet.version,
    assessmentStorageMode: sheet.assessmentStorageMode,
    templateId: sheet.templateId,
    template: sheet.template,
    assessmentCategories: categories,
    categoryAllocations,
    classLevel: sheet.classLevel,
    subject: sheet.subject,
    assessments,
    columns: assessments.map((a) => a.name),
    data,
  };
}

function computeFixtureResults(_req, _match, body, user) {
  if (user?.memberRole !== "admin") return [403, { error: "Admin required" }];
  const { classLevelId, term, academicYear, templateId, resultType } = body;
  if (
    classLevelId !== RESULTS_CLASS.id || term !== RESULTS_PERIOD.term ||
    academicYear !== RESULTS_PERIOD.academicYear || templateId !== RESULTS_TEMPLATE.id ||
    !["MID_TERM", "END_OF_TERM"].includes(resultType)
  ) return [400, { error: "Unexpected result selection" }];
  const row = {
    id: resultType,
    ...RESULTS_PERIOD,
    resultType,
    studentId: CHILD.id,
    student: CHILD,
    classLevel: RESULTS_CLASS,
    template: RESULTS_TEMPLATE,
    metrics: [],
    totalScore: resultType === "MID_TERM" ? 85 : 86,
    grade: "A",
    position: 1,
    publishedAt: state.termResults.get(resultType)?.publishedAt ?? null,
  };
  state.termResults.set(resultType, row);
  return [200, { data: { results: [row] } }];
}

function setFixturePublication(_req, match, body, user) {
  if (user?.memberRole !== "admin") return [403, { error: "Admin required" }];
  const resultType = body.resultType || "END_OF_TERM";
  let row = state.termResults.get(resultType);
  if (!row) {
    row = {
      id: resultType,
      term: body.term || RESULTS_PERIOD.term,
      academicYear: body.academicYear || RESULTS_PERIOD.academicYear,
      resultType,
      studentId: CHILD.id,
      student: CHILD,
      classLevel: RESULTS_CLASS,
      template: RESULTS_TEMPLATE,
      metrics: [],
      totalScore: 86,
      grade: "A",
      position: 1,
      publishedAt: null,
    };
    state.termResults.set(resultType, row);
  }
  row.publishedAt = match[1] === "publish" ? new Date().toISOString() : null;
  return [200, { success: true }];
}

function blankFixturePdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << >> >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += "xref\n0 4\n0000000000 65535 f \n";
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  return Buffer.from(`${pdf}trailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n${xref}\n%%EOF\n`);
}

// [method, path pattern, handler(req, match, body, user) => [status, body]]
const ROUTES = {
  hcore: [
    ["GET", /^\/v1\/public\/organizations$/, () => [200, [ORG]]],
    ["POST", /^\/v1\/auth\/login$/, (_req, _m, body) => {
      const user = Object.values(USERS).find((u) => u.identifierType === body.identifierType && u.identifier === body.identifier);
      if (!user || body.password !== user.password) return [401, { error: "Wrong email, admission number or password", code: "INVALID_CREDENTIALS" }];
      if (user.newPassword && !user.changed) return [403, { error: "Choose your own password", code: "PASSWORD_CHANGE_REQUIRED", changeToken: `change-${user.principalId}` }];
      return [200, signIn(user)];
    }],
    ["POST", /^\/v1\/auth\/password\/change$/, (_req, _m, body) => {
      const user = Object.values(USERS).find((u) => `change-${u.principalId}` === body.changeToken);
      if (!user) return [401, { error: "This link has expired", code: "INVALID_CHANGE_TOKEN" }];
      user.changed = true;
      return [200, signIn(user)];
    }],
    ["GET", /^\/v1\/me$/, (_req, _m, _b, user) => user
      ? [200, { id: user.principalId, displayName: user.displayName, primaryEmail: user.identifier, status: "ACTIVE", loginIdentifiers: [] }]
      : [401, { error: "Unauthorized" }]],
    ["GET", /^\/v1\/me\/contexts$/, (_req, _m, _b, user) => (user ? [200, contexts(user)] : [401, { error: "Unauthorized" }])],
    ["POST", /^\/v1\/me\/select-context$/, (_req, _match, body, user) => {
      if (!user) return [401, { error: "Unauthorized" }];
      if (body.organizationId !== ORG.id) return [404, { error: "Organization not found" }];
      const contextToken = token(user.principalId, { orgId: ORG.id });
      state.tokens.set(contextToken, user);
      return [200, { token: contextToken }];
    }],
    ["GET", /^\/v1\/directory\/organizations\/greenfield\/member-profile$/, (_req, _m, _b, user) => memberProfile(user)],
    ["GET", new RegExp(`^/v1/organizations/${ORG.id}/staff-roles$`), () => [200, { staff: [] }]],
    ["GET", new RegExp(`^/v1/organizations/${ORG.id}/privacy-settings$`), () => [200, { leaverRetentionYears: null }]],
    ["POST", /^\/v1\/auth\/logout$/, () => [200, { ok: true }]],
    // A school admin gives someone a temporary password (shown once).
    ["POST", /^\/v1\/organizations\/([^/]+)\/password-resets$/, (_req, match, body, user) => {
      if (user?.memberRole !== "admin") return [403, { error: "Only a school admin can reset passwords" }];
      if (match[1] !== ORG.id || body.learnerId !== USERS.pupil.learnerId) return [404, { error: "No such person at this school" }];
      return [200, { temporaryPassword: "K7M2QX9PHD" }];
    }],
  ],
  hsms: [
    ["GET", /^\/organizations\/greenfield$/, () => [200, {
      id: state.org.id,
      name: state.org.name,
      slug: state.org.slug,
      logo: state.org.logo ?? null,
      primaryColor: state.org.primaryColor ?? null,
      secondaryColor: state.org.secondaryColor ?? null,
      address: state.org.address ?? null,
      email: state.org.email ?? null,
      phone: state.org.phone ?? null,
      category: state.org.category,
      schoolType: state.org.schoolType,
      country: state.org.country,
    }]],
    ["GET", /^\/organizations\/greenfield\/live-counts$/, () => [200, { students: 2, teachers: 1, parents: 1 }]],
    ["GET", /^\/organizations\/greenfield\/members$/, () => [200, [
      member(USERS.admin), member(USERS.teacher), member(USERS.parent),
    ]]],
    ["GET", /^\/admin\/invite\/pending\/greenfield$/, () => [200, []]],
    ["GET", /^\/attendance\/greenfield\/reports$/, () => [200, { overallStats: { totalRecords: 0, attendanceRate: 0 } }]],
    ["GET", /^\/debt\/overview\/greenfield$/, () => [200, { summary: { unpaidCount: 0, partialCount: 0 } }]],
    ["GET", /^\/attendance\/greenfield\/my-classes$/, (req) => [200, {
      date: new URL(req.url, "http://localhost").searchParams.get("date"),
      canTakeAnyRegister: true,
      register: [],
      subjects: [],
    }]],
    // These modules open in their empty state at the fixture school. Every
    // route is listed explicitly so unexpected requests still fail loudly.
    ["GET", /^\/timetable\/greenfield$/, () => [200, []]],
    ["GET", /^\/lesson-planner\/(questions|notes)\/greenfield$/, () => [200, []]],
    ["GET", /^\/admissions\/admin\/greenfield$/, () => [200, []]],
    ["GET", /^\/greenfield\/(library|library-loans|bus-routes|homework|hostel\/rooms)$/, () => [200, []]],
    ["GET", /^\/scheme-of-work\/greenfield$/, () => [200, []]],
    ["GET", /^\/hr\/greenfield\/(teachers|departments)$/, () => [200, []]],
    ["GET", /^\/staff-attendance\/greenfield\/summary\/\d{4}-\d{2}-\d{2}$/, () => [200, { success: true, data: [] }]],
    ["GET", /^\/clinic\/greenfield$/, () => [200, { success: true, data: [] }]],
    ["GET", /^\/billing\/greenfield\/payment-history$/, () => [200, { success: true, data: [] }]],
    ["GET", /^\/feature-flags\/greenfield$/, () => [200, { data: {} }]],
    ["GET", /^\/payroll\/greenfield$/, () => [200, { success: true, data: [] }]],
    ["GET", /^\/payroll\/greenfield\/summary\/\d{4}-\d{2}$/, () => [200, {
      success: true, data: [], summary: { total: 0, paid: 0, pending: 0, count: 0, paidCount: 0, pendingCount: 0 },
    }]],
    ["GET", /^\/payroll\/greenfield\/session-summary$/, () => [200, {
      success: true, data: { totalMonthly: 0, totalTermly: 0, totalSession: 0, staffCount: 0, staffWithSalaryCount: 0, staffWithoutSalaryCount: 0, staff: [] },
    }]],
    ["PATCH", /^\/organizations\/greenfield$/, (_req, _m, body, user) => {
      if (!user) return [401, { error: "Unauthorized" }];
      if (user.memberRole !== "admin") return [403, { error: "Only school admins can update settings" }];
      state.org = { ...state.org, ...body };
      return [200, state.org];
    }],
    ["GET", /^\/organizations\/greenfield\/member-profile$/, (_req, _m, _b, user) => {
      const [status, payload] = memberProfile(user);
      return status === 200 ? [200, { ...payload, organization: { ...state.org } }] : [status, payload];
    }],
    ["GET", /^\/organizations\/greenfield\/student-profile$/, (_req, _m, _b, user) => (user?.learnerId
      ? [200, { student: PUPIL, org: state.org }]
      : [404, { error: "Not a student" }])],
    // Like the real HSMS: exams live in HCBT, so this dashboard never lists any.
    ["GET", /^\/student\/greenfield\/dashboard$/, () => [200, {
      student: PUPIL,
      stats: { totalAssessments: 0, averagePercentage: null, pendingExams: 0, attendancePercent: null },
      todayTimetable: [],
      pendingExams: [],
    }]],
    ["GET", /^\/student\/greenfield\/scheme-of-work$/, () => [200, [
      {
        id: "sow-1",
        title: "Mathematics First Term Syllabus",
        term: "Term 1",
        academicYear: "2026/2027",
        subject: { id: "maths", name: "Mathematics", code: "MTH" },
        classLevel: { id: "jss1a", name: "JSS 1A" },
        createdBy: { user: { name: "Mr Maths" } },
        weeks: [
          { week: 1, topic: "Whole numbers and counting", objectives: "Count up to millions" },
          { week: 2, topic: "Fractions and Decimals", objectives: "Add and divide fractions" },
        ],
      },
    ]]],
    ["GET", /^\/greenfield\/my-homework$/, () => [200, [
      {
        id: "hw-e2e-1",
        title: "Algebra Exercises 1 to 10",
        description: "Solve all problems on page 42.",
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        totalMarks: 20,
        classLevelId: "jss1a",
        subjectId: "maths",
        subject: { id: "maths", name: "Mathematics", code: "MTH" },
        classLevel: { id: "jss1a", name: "JSS 1A" },
        createdBy: { user: { name: "Mr Maths" } },
        submissions: [],
      },
    ]]],
    ["POST", /^\/greenfield\/homework\/[^/]+\/submit$/, (_req, _m, body) => [201, {
      id: "sub-1",
      fileUrl: body.fileUrl,
      submittedAt: new Date().toISOString(),
    }]],
    ["GET", /^\/greenfield\/study-materials$/, () => [200, []]],
    // Ada's record, as staff open it from the students list.
    ["GET", /^\/students\/greenfield$/, () => [200, [{ ...CHILD, classLevel: RESULTS_CLASS }]]],
    ["GET", /^\/students\/greenfield\/stu-ada$/, () => [200, { ...CHILD, hcoreLearnerId: USERS.pupil.learnerId }]],
    ["GET", /^\/students\/greenfield\/stu-ada\/results$/, () => [200, { student: PUPIL, subjects: [] }]],
    ["GET", /^\/students\/greenfield\/stu-ada\/guardians$/, () => [200, []]],
    ["GET", /^\/notifications/, () => [200, { notifications: [], unreadCount: 0 }]],
    ["GET", /^\/billing\/greenfield\/parent-fee-summary$/, () => [200, feeSummary()]],
    ["POST", /^\/payments\/init\/greenfield$/, (_req, _m, body) => [200, {
      authorizationUrl: `http://127.0.0.1:${PORTS.hsms}/__checkout?invoice=${encodeURIComponent(body.invoiceId)}&amount=${body.amount ?? "full"}`,
      reference: "HAN-1790000000000-abcd1234",
    }]],
    ["GET", /^\/__checkout/, () => [200, { checkout: "Paystack test checkout" }]],
    // The bursary: finding who owes, and recording money taken at the school.
    ["GET", /^\/finance\/greenfield\/open-invoices$/, (req) => {
      const q = new URL(req.url, "http://localhost").searchParams.get("q")?.toLowerCase() ?? "";
      const matches = `${CHILD.firstName} ${CHILD.lastName} ${CHILD.admissionNumber}`.toLowerCase().includes(q);
      return [200, { students: matches ? [OWING] : [] }];
    }],
    ["POST", /^\/finance\/greenfield\/invoices\/([^/]+)\/payments$/, (_req, match, body) => {
      const invoice = OWING.invoices.find((i) => i.id === match[1]);
      if (!invoice) return [404, { error: "Bill not found" }];
      if (body.amount > invoice.balance) return [400, { error: "More than is owed", details: { balance: invoice.balance } }];
      const paid = invoice.paid + body.amount;
      const balance = invoice.total - paid;
      return [201, {
        payment: { id: "pay-2", reference: body.reference || "RCPT-0002", amount: body.amount, channel: body.channel, createdAt: new Date().toISOString() },
        invoice: { id: invoice.id, term: invoice.term, status: balance === 0 ? "PAID" : "PARTIALLY_PAID", total: invoice.total, paid, balance },
        student: { id: OWING.id, name: OWING.name, admissionNumber: OWING.admissionNumber },
      }];
    }],
    ["GET", /^\/classes\/greenfield$/, () => [200, [{ id: "jss1a", name: "JSS 1A", level: 1 }]]],
    ["GET", /^\/subjects\/greenfield$/, () => [200, [{ id: "maths", name: "Mathematics", code: "MTH" }]]],
    ["GET", /^\/spreadsheets\/greenfield$/, () => [200, [{ ...gradebook(), createdAt: "2026-09-01T00:00:00.000Z" }]]],
    ["GET", /^\/student\/greenfield\/results\/editions$/, () => [200, studentResultsEditions()]],
    ["GET", /^\/student\/greenfield\/results$/, (req) => {
      const rt = new URL(req.url, "http://localhost").searchParams.get("resultType") || "END_OF_TERM";
      return [200, studentResults(rt)];
    }],
    ["GET", /^\/spreadsheets\/greenfield\/results\/editions$/, (_req, _m, _b, user) => [200, resultsEditions(user)]],
    ["GET", /^\/spreadsheets\/greenfield\/results$/, (req, _m, _b, user) => {
      const rt = new URL(req.url, "http://localhost").searchParams.get("resultType") || "END_OF_TERM";
      return [200, results(rt, user)];
    }],
    // The Mathematics JSS 1A gradebook the maths teacher keeps.
    ["GET", /^\/spreadsheets\/greenfield\/sheet-maths$/, () => [200, gradebook()]],
    ["PATCH", /^\/spreadsheets\/greenfield\/sheet-maths$/, (_req, _m, body) => {
      state.gradebook = body.data;
      state.gradebookVersion = (state.gradebookVersion ?? 1) + 1;
      return [200, gradebook()];
    }],
    // Relational assessment spreadsheet fixtures (sheet-physics-rel with subs, sheet-agri-rel starting unsplit).
    ["GET", /^\/spreadsheets\/greenfield\/(sheet-physics-rel|sheet-agri-rel)$/, (_req, match) => [
      200,
      relationalGradebook(match[1] === "sheet-agri-rel" ? state.freshRelationalSheet : state.relationalSheet),
    ]],
    ["POST", /^\/spreadsheets\/greenfield\/(sheet-physics-rel|sheet-agri-rel)\/sub-assessments$/, (_req, match, body) => {
      const sheet = match[1] === "sheet-agri-rel" ? state.freshRelationalSheet : state.relationalSheet;
      const cat = sheet.template.assessmentCategories.find((c) => c.id === body.categoryId);
      if (!cat) return [404, { error: "Template category not found" }];
      if (cat.isSingleInstance) return [409, { error: `${cat.name} is fixed by the administrator` }];
      const created = {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        categoryId: cat.id,
        name: String(body.name).trim(),
        maxMarks: Number(body.maxMarks),
        isSystemGenerated: false,
        position: sheet.subAssessments.filter((s) => s.categoryId === cat.id).length,
      };
      sheet.subAssessments.push(created);
      sheet.version += 1;
      return [201, { success: true, data: created, remainingMarks: 0, version: sheet.version }];
    }],
    ["PATCH", /^\/spreadsheets\/greenfield\/(sheet-physics-rel|sheet-agri-rel)\/sub-assessments\/([^/]+)$/, (_req, match, body) => {
      const sheet = match[1] === "sheet-agri-rel" ? state.freshRelationalSheet : state.relationalSheet;
      const item = sheet.subAssessments.find((s) => s.id === match[2]);
      if (!item) return [404, { error: "Sub-assessment not found" }];
      if (item.isSystemGenerated) return [409, { error: "Fixed by the administrator" }];
      const nextMarks = body.maxMarks !== undefined ? Number(body.maxMarks) : item.maxMarks;
      if (body.name !== undefined) item.name = String(body.name).trim();
      item.maxMarks = nextMarks;
      sheet.version += 1;
      return [200, { success: true, data: item, version: sheet.version }];
    }],
    ["DELETE", /^\/spreadsheets\/greenfield\/(sheet-physics-rel|sheet-agri-rel)\/sub-assessments\/([^/]+)$/, (_req, match) => {
      const sheet = match[1] === "sheet-agri-rel" ? state.freshRelationalSheet : state.relationalSheet;
      const idx = sheet.subAssessments.findIndex((s) => s.id === match[2]);
      if (idx === -1) return [404, { error: "Sub-assessment not found" }];
      const item = sheet.subAssessments[idx];
      if (item.isSystemGenerated) return [409, { error: "Fixed by the administrator" }];
      sheet.subAssessments.splice(idx, 1);
      sheet.version += 1;
      return [200, { success: true, version: sheet.version }];
    }],
    ["PUT", /^\/spreadsheets\/greenfield\/(sheet-physics-rel|sheet-agri-rel)\/scores$/, (_req, match, body) => {
      const sheet = match[1] === "sheet-agri-rel" ? state.freshRelationalSheet : state.relationalSheet;
      if (body.expectedVersion !== sheet.version) {
        return [409, { error: "Spreadsheet changed. Refresh before saving." }];
      }
      const subById = new Map(sheet.subAssessments.map((s) => [s.id, s]));
      for (const entry of body.scores || []) {
        const sub = subById.get(entry.subAssessmentId);
        if (!sub) return [404, { error: "Sub-assessment not found" }];
        if (entry.score !== null && (entry.score < 0 || entry.score > sub.maxMarks)) {
          return [400, { error: `${sub.name} score cannot exceed ${sub.maxMarks}` }];
        }
        sheet.scores[`${entry.studentId}:${entry.subAssessmentId}`] = entry.score;
      }
      sheet.version += 1;
      return [200, { success: true, data: { version: sheet.version, saved: (body.scores || []).length } }];
    }],
    ["GET", /^\/spreadsheets\/greenfield\/notifications$/, () => [200, []]],
    ["GET", /^\/affective\/greenfield\/affective$/, () => [200, []]],
    ["GET", /^\/result-settings\/greenfield$/, () => [200, { success: true, data: {
      ceoSignatureUrl: null,
      ceoCommentRules: [],
      affectiveCategories: [{ id: "confidence", label: "Confidence", active: true, position: 0 }],
    } }]],
    ["GET", /^\/result-settings\/greenfield\/comment-override$/, () => [200, { success: true, data: null }]],
    ["GET", /^\/result-templates\/periods\/greenfield$/, () => [200, { success: true, data: [RESULTS_PERIOD] }]],
    ["GET", /^\/result-templates\/templates\/greenfield$/, () => [200, state.templates]],
    ["GET", /^\/result-templates\/templates\/greenfield\/([^/]+)$/, (_req, match) => {
      const tmpl = state.templates.find((t) => t.id === match[1]);
      return tmpl ? [200, { success: true, data: tmpl }] : [404, { error: "Template not found" }];
    }],
    ["POST", /^\/result-templates\/templates\/greenfield$/, (_req, _match, body, user) => {
      if (user?.memberRole !== "admin") return [403, { error: "Admin required" }];
      const created = {
        id: `template-${Date.now()}`,
        name: body.name,
        description: body.description || null,
        classLevelId: body.classLevelId || null,
        classLevel: RESULTS_CLASS,
        isDefault: Boolean(body.isDefault),
        isApproved: Boolean(body.isApproved),
        midTermTotal: body.midTermTotal || 0,
        schoolSection: body.schoolSection || "ALL",
        resultType: body.resultType || "BOTH",
        termType: body.termType || "END_TERM",
        metrics: body.metrics || [],
        assessmentCategories: (body.metrics || []).map((m, idx) => ({
          id: m.id || `cat-${idx + 1}`,
          name: m.name,
          label: m.label || m.name,
          maxMarks: Number(m.maxMarks || m.weight || 0),
          isSingleInstance: Boolean(m.isSingleInstance),
          position: idx,
        })),
        gradeScale: body.gradeScale || [],
      };
      state.templates.push(created);
      return [201, { success: true, data: created }];
    }],
    ["PUT", /^\/result-templates\/templates\/greenfield\/([^/]+)$/, (_req, match, body, user) => {
      if (user?.memberRole !== "admin") return [403, { error: "Admin required" }];
      const idx = state.templates.findIndex((t) => t.id === match[1]);
      const existing = idx >= 0 ? state.templates[idx] : null;
      const updated = {
        ...(existing || { id: match[1], classLevelId: RESULTS_CLASS.id, classLevel: RESULTS_CLASS }),
        name: body.name ?? existing?.name,
        description: body.description ?? existing?.description,
        classLevelId: body.classLevelId ?? existing?.classLevelId ?? null,
        classLevel: RESULTS_CLASS,
        isDefault: body.isDefault !== undefined ? Boolean(body.isDefault) : (existing?.isDefault ?? false),
        isApproved: body.isApproved !== undefined ? Boolean(body.isApproved) : (existing?.isApproved ?? true),
        midTermTotal: body.midTermTotal ?? existing?.midTermTotal ?? 0,
        schoolSection: body.schoolSection ?? existing?.schoolSection ?? "ALL",
        resultType: body.resultType ?? existing?.resultType ?? "BOTH",
        termType: body.termType ?? existing?.termType ?? "END_TERM",
        metrics: body.metrics ?? existing?.metrics ?? [],
        assessmentCategories: (body.metrics || existing?.metrics || []).map((m, i) => ({
          id: m.id || `cat-${i + 1}`,
          name: m.name,
          label: m.label || m.name,
          maxMarks: Number(m.maxMarks || m.weight || 0),
          isSingleInstance: Boolean(m.isSingleInstance),
          position: i,
        })),
        gradeScale: body.gradeScale ?? existing?.gradeScale ?? [],
      };
      if (idx >= 0) {
        state.templates[idx] = updated;
      } else {
        state.templates.push(updated);
      }
      return [200, { success: true, data: updated }];
    }],
    ["PATCH", /^\/result-templates\/templates\/greenfield\/([^/]+)\/(approve|disapprove)$/, (_req, match, _b, user) => {
      if (user?.memberRole !== "admin") return [403, { error: "Admin required" }];
      const tmpl = state.templates.find((t) => t.id === match[1]);
      if (!tmpl) return [404, { error: "Template not found" }];
      tmpl.isApproved = match[2] === "approve";
      return [200, { success: true, data: tmpl }];
    }],
    ["DELETE", /^\/result-templates\/templates\/greenfield\/([^/]+)$/, (_req, match, _b, user) => {
      if (user?.memberRole !== "admin") return [403, { error: "Admin required" }];
      state.templates = state.templates.filter((t) => t.id !== match[1]);
      return [200, { success: true }];
    }],
    ["GET", /^\/result-templates\/results\/greenfield$/, (req) => {
      const params = new URL(req.url, "http://localhost").searchParams;
      const row = state.termResults.get(params.get("resultType"));
      return [200, { success: true, data: row ? [row] : [] }];
    }],
    ["POST", /^\/result-templates\/bulk-compute\/greenfield$/, computeFixtureResults],
    ["POST", /^\/result-templates\/(publish|unpublish)\/greenfield$/, setFixturePublication],
    ["GET", /^\/export\/greenfield\/(report-card\/stu-ada|report-card-bundle\/jss1a)$/, (_req, _match, _body, user) => {
      if (user?.memberRole !== "admin") return [403, { error: "Admin required" }];
      return [200, blankFixturePdf()];
    }],
    ["GET", /^\/support-tickets$/, (req) => {
      const isDevTicket = new URL(req.url, "http://localhost").searchParams.get("isDevTicket") === "true";
      return [200, state.tickets.filter((ticket) => ticket.isDevTicket === isDevTicket)];
    }],
    ["POST", /^\/support-tickets$/, (_req, _match, body, user) => {
      if (user?.memberRole !== "admin") return [403, { error: "Admin required" }];
      if (!body.subject || !body.description || body.orgSlug !== ORG.slug) return [400, { error: "Invalid ticket" }];
      const ticket = {
        ...body,
        id: `ticket-${state.tickets.length + 1}`,
        status: "open",
        createdAt: new Date().toISOString(),
        messages: [],
      };
      state.tickets.push(ticket);
      return [201, ticket];
    }],
    ["GET", /^\/support-tickets\/(ticket-\d+)\/messages$/, (_req, match) => {
      const ticket = state.tickets.find(({ id }) => id === match[1]);
      return ticket ? [200, ticket.messages] : [404, { error: "Ticket not found" }];
    }],
    ["POST", /^\/support-tickets\/(ticket-\d+)\/messages$/, (_req, match, body, user) => {
      if (user?.memberRole !== "admin") return [403, { error: "Admin required" }];
      const ticket = state.tickets.find(({ id }) => id === match[1]);
      if (!ticket) return [404, { error: "Ticket not found" }];
      if (!body.message || body.orgSlug !== ORG.slug) return [400, { error: "Invalid message" }];
      const sender = member(user);
      const message = {
        id: `message-${ticket.messages.length + 1}`,
        ticketId: ticket.id,
        message: body.message,
        createdAt: new Date().toISOString(),
        senderId: sender.id,
        sender,
        adminSender: null,
      };
      ticket.messages.push(message);
      return [201, message];
    }],
    ["PATCH", /^\/support-tickets\/(ticket-\d+)$/, (_req, match, body, user) => {
      if (user?.memberRole !== "admin") return [403, { error: "Admin required" }];
      const ticket = state.tickets.find(({ id }) => id === match[1]);
      if (!ticket) return [404, { error: "Ticket not found" }];
      if (!["open", "resolved"].includes(body.status) || body.orgSlug !== ORG.slug) {
        return [400, { error: "Invalid status update" }];
      }
      ticket.status = body.status;
      return [200, ticket];
    }],
    ["POST", /^\/auth\/forgot-password$/, (_req, _m, body) => [200, { ok: true }]],
    ["POST", /^\/auth\/reset-password$/, (_req, _m, body) => [200, { ok: true }]],
    // Sign-out asks HSMS to expire its own cookies (a legacy `accessToken`
    // among them) — see lib/sign-out.ts.
    ["POST", /^\/auth\/logout$/, () => [200, { ok: true }]],
  ],
  hcbt: [
    ["POST", /^\/api\/auth\/(exchange-session|callback)$/, (_req, _m, body) => {
      const user = Object.values(USERS).find((u) => u.principalId === body.principalId);
      if (!user) return [401, { error: "Unknown person" }];
      const hcbt = token(user.principalId, { product: "HCBT" });
      state.tokens.set(hcbt, user);
      return [200, { token: hcbt }];
    }],
    ["GET", /^\/api\/auth\/me$/, (_req, _m, _b, user) => (user
      ? [200, { authenticated: true, user: { id: user.principalId, name: user.displayName, roles: user.roles, isAdmin: false, studentId: user.learnerId || null }, organization: ORG }]
      : [200, { authenticated: false }])],
    ["GET", /^\/api\/student\/assigned/, () => [200, {
      schoolExams: [{ ...EXAM, myResult: state.submitted ? { status: "submitted", score: null, percentage: null, resultsReleased: false } : null }],
      ssceExams: [],
    }]],
    ["GET", /^\/api\/student\/history/, () => [200, []]],
    ["POST", /^\/api\/student\/[^/]+\/start$/, () => [200, {
      examResultId: "0f5f1a52-0000-4000-8000-000000000a99",
      exam: { id: EXAM.id, title: EXAM.title, duration: EXAM.duration, totalQuestions: 2, passMark: 50 },
      questions: QUESTIONS,
      startedAt: new Date().toISOString(),
    }]],
    ["POST", /^\/api\/student\/[^/]+\/report-tab-switch$/, () => [200, { tabSwitchCount: 1, maxReached: false, remaining: 2 }]],
    ["POST", /^\/api\/student\/[^/]+\/submit$/, (_req, _m, body) => {
      state.submitted = body;
      return [200, { ok: true, resultsReleased: false }];
    }],
    // Staff console endpoints: HCBT refuses anyone without a staff role.
    ["GET", /^\/api\/(admin|exams)(\/|$)/, () => [403, { error: "Teacher / Examiner role required" }]],
    ["GET", /^\/api\/student\/[^/]+\/result$/, () => [200, {
      status: "submitted", resultsReleased: false, score: null, percentage: null, totalMarks: 2,
      exam: { title: EXAM.title, passMark: 50, duration: 20 }, answers: [],
    }]],
  ],
};

function signIn(user) {
  const hcore = token(user.principalId);
  state.tokens.set(hcore, user);
  return {
    token: hcore,
    principal: { id: user.principalId, email: user.identifierType === "EMAIL" ? user.identifier : null },
    roles: user.roles,
    activeOrganization: { slug: ORG.slug },
    learnerId: user.learnerId ?? null,
    studentId: user.learnerId ?? null,
  };
}

// Pupils and exam candidates aren't school staff or parents: both member
// profiles refuse them, and Hweb falls back to the HSMS student profile.
function memberProfile(user) {
  if (!user) return [401, { error: "Unauthorized" }];
  if (user.learnerId) return [404, { error: "Not a member of this school" }];
  return [200, member(user)];
}

function member(user) {
  const role = user.memberRole ?? (user.roles.includes("PARENT") ? "parent" : "member");
  return {
    id: `member-${user.principalId}`,
    role,
    organizationId: ORG.id,
    user: { id: user.principalId, name: user.displayName, email: user.identifier },
    assignedStudents: role === "parent" ? [CHILD] : [],
    assignedClasses: [],
    memberAssignments: user.assignments ?? [],
  };
}

function send(res, origin, status, body) {
  const isPdf = Buffer.isBuffer(body);
  res.writeHead(status, {
    "content-type": isPdf ? "application/pdf" : "application/json",
    ...(origin ? { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", vary: "Origin" } : {}),
  });
  res.end(isPdf ? body : JSON.stringify(body));
}

function serve(backend) {
  return http.createServer((req, res) => {
    const origin = req.headers.origin;
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": origin || "*",
        "access-control-allow-credentials": "true",
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers": req.headers["access-control-request-headers"] || "content-type,authorization",
        "access-control-max-age": "600",
      });
      return res.end();
    }
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/__reset" && req.method === "POST") {
        reset();
        Object.values(USERS).forEach((u) => { delete u.changed; });
        return send(res, origin, 200, { ok: true });
      }
      if (url.pathname === "/__requests") return send(res, origin, 200, state.requests);

      let body = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch { body = { raw }; }
      state.requests.push({ backend, method: req.method, path: url.pathname, search: url.search, body });

      const route = ROUTES[backend].find(([method, pattern]) => method === req.method && pattern.test(url.pathname));
      if (!route) {
        console.warn(`[mock-api] ${backend} has no answer for ${req.method} ${url.pathname}`);
        return send(res, origin, 404, { error: `No mock for ${req.method} ${url.pathname}` });
      }
      const [status, payload] = route[2](req, url.pathname.match(route[1]), body, userFor(req));
      console.log(`[mock] ${backend} ${req.method} ${url.pathname} -> ${status}${userFor(req) ? " auth" : " ANON"}`);
      return send(res, origin, status, payload);
    });
  });
}

for (const [backend, port] of Object.entries(PORTS)) {
  serve(backend).listen(port, "127.0.0.1", () => console.log(`[mock-api] ${backend} on http://127.0.0.1:${port}`));
}
