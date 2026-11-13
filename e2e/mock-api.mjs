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
    org: {
      ...ORG,
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

function results() {
  return [{
    student: { ...CHILD, classLevelId: "jss1a", classLevel: { id: "jss1a", name: "JSS 1A", level: 1 } },
    results: [{
      id: "sheet-maths",
      title: "Mathematics - JSS 1A",
      assessments: [{ name: "CA 1", total: 20 }, { name: "CA 2", total: 20 }, { name: "Exam", total: 60 }],
      columns: ["CA 1", "CA 2", "Exam"],
      values: [17, 18, 52],
      subject: { id: "maths", name: "Mathematics" },
      classLevel: { id: "jss1a", name: "JSS 1A", level: 1 },
      updatedAt: "2026-09-25T12:00:00.000Z",
    }],
  }];
}

function gradebook() {
  return {
    id: "sheet-maths",
    title: "Mathematics - JSS 1A",
    status: "pending",
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
    ["GET", /^\/v1\/directory\/organizations\/greenfield\/member-profile$/, (_req, _m, _b, user) => memberProfile(user)],
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
    ["GET", /^\/spreadsheets\/greenfield\/results$/, () => [200, results()]],
    // The Mathematics JSS 1A gradebook the maths teacher keeps.
    ["GET", /^\/spreadsheets\/greenfield\/sheet-maths$/, () => [200, gradebook()]],
    ["PATCH", /^\/spreadsheets\/greenfield\/sheet-maths$/, (_req, _m, body) => {
      state.gradebook = body.data;
      return [200, gradebook()];
    }],
    ["GET", /^\/spreadsheets\/greenfield\/notifications$/, () => [200, []]],
    ["POST", /^\/auth\/forgot-password$/, (_req, _m, body) => [200, { ok: true }]],
    ["POST", /^\/auth\/reset-password$/, (_req, _m, body) => [200, { ok: true }]],
    // Sign-out asks HSMS to expire its own cookies (a legacy `accessToken`
    // among them) — see lib/sign-out.ts.
    ["POST", /^\/auth\/logout$/, () => [200, { ok: true }]],
  ],
  hcbt: [
    ["POST", /^\/api\/auth\/callback$/, (_req, _m, body) => {
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
  res.writeHead(status, {
    "content-type": "application/json",
    ...(origin ? { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", vary: "Origin" } : {}),
  });
  res.end(JSON.stringify(body));
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
