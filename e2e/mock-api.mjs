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
  state = { requests: [], tokens: new Map(), submitted: null };
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
    organizations: [{ ...ORG, subscribed: ["HSMS", "HCBT"], products: user.products }],
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
    ["GET", /^\/v1\/directory\/organizations\/greenfield\/member-profile$/, (_req, _m, _b, user) => (user ? [200, member(user)] : [401, { error: "Unauthorized" }])],
    ["POST", /^\/v1\/auth\/logout$/, () => [200, { ok: true }]],
  ],
  hsms: [
    ["GET", /^\/organizations\/greenfield\/member-profile$/, (_req, _m, _b, user) => (user ? [200, member(user)] : [401, { error: "Unauthorized" }])],
    ["GET", /^\/organizations\/greenfield\/student-profile$/, () => [404, { error: "Not a student" }]],
    ["GET", /^\/notifications/, () => [200, { notifications: [], unreadCount: 0 }]],
    ["GET", /^\/billing\/greenfield\/parent-fee-summary$/, () => [200, feeSummary()]],
    ["POST", /^\/payments\/init\/greenfield$/, (_req, _m, body) => [200, {
      authorizationUrl: `http://127.0.0.1:${PORTS.hsms}/__checkout?invoice=${encodeURIComponent(body.invoiceId)}&amount=${body.amount ?? "full"}`,
      reference: "HAN-1790000000000-abcd1234",
    }]],
    ["GET", /^\/__checkout/, () => [200, { checkout: "Paystack test checkout" }]],
    ["GET", /^\/spreadsheets\/greenfield\/results$/, () => [200, results()]],
    ["GET", /^\/spreadsheets\/greenfield\/notifications$/, () => [200, []]],
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

function member(user) {
  const role = user.roles.includes("PARENT") ? "parent" : "member";
  return {
    id: `member-${user.principalId}`,
    role,
    organizationId: ORG.id,
    user: { id: user.principalId, name: user.displayName, email: user.identifier },
    assignedStudents: role === "parent" ? [CHILD] : [],
    assignedClasses: [],
    memberAssignments: [],
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
      return send(res, origin, status, payload);
    });
  });
}

for (const [backend, port] of Object.entries(PORTS)) {
  serve(backend).listen(port, "127.0.0.1", () => console.log(`[mock-api] ${backend} on http://127.0.0.1:${port}`));
}
