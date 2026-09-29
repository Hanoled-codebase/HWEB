/**
 * Sentry options shared by the browser, server and edge runtimes.
 *
 * Off unless a DSN is set. Hweb shows children's records, so events carry no
 * request bodies, cookies, query strings or credentials (reset and invite
 * links put emails and codes in the query), users are identified by id only,
 * console output is not collected, and there is no session replay.
 */

import type * as Sentry from "@sentry/nextjs";

type SentryOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;
type SentryEvent = Parameters<NonNullable<SentryOptions["beforeSend"]>>[0];
type SentryBreadcrumb = Parameters<NonNullable<SentryOptions["beforeBreadcrumb"]>>[0];

const KEPT_HEADERS = new Set(["user-agent", "content-type"]);

function stripQuery<T>(url: T): T {
  return (typeof url === "string" ? url.split(/[?#]/)[0] : url) as T;
}

export function scrubEvent(event: SentryEvent): SentryEvent {
  const request = event.request;
  if (request) {
    delete request.cookies;
    delete request.data;
    delete request.query_string;
    request.url = stripQuery(request.url);
    for (const name of Object.keys(request.headers ?? {})) {
      if (!KEPT_HEADERS.has(name.toLowerCase())) delete request.headers![name];
    }
  }
  if (event.user) {
    event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  }
  return event;
}

export function scrubBreadcrumb(breadcrumb: SentryBreadcrumb): SentryBreadcrumb | null {
  if (breadcrumb.category === "console") return null;
  if (breadcrumb.data) {
    for (const key of ["url", "from", "to"]) {
      if (typeof breadcrumb.data[key] === "string") breadcrumb.data[key] = stripQuery(breadcrumb.data[key]);
    }
  }
  return breadcrumb;
}

export function sentryOptions(dsn: string | undefined): SentryOptions {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0),
    // Sentry 11 collects all of these by default; none of it may leave.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ["user-agent", "content-type"] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    },
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  };
}
