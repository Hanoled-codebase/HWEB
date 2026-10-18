// What the sign-in form shows when HCORE turns a sign-in down. HCORE gives
// every error written for the person signing in (wrong password, locked
// account, ...) a 4xx status and a code. Anything else — a 5xx, or an older
// HCORE answering a database fault with a bare 400 and Prisma's own message —
// is shown as a generic message plus HCORE's request id to quote to support,
// never the response text.

export interface SignInFailure {
  error: string;
  reference?: string;
}

interface HcoreErrorBody {
  error?: unknown;
  code?: unknown;
  correlationId?: unknown;
}

export function signInFailure(
  res: { status: number; headers: { get(name: string): string | null } },
  body: unknown,
  genericMessage: string,
): SignInFailure {
  const data: HcoreErrorBody = body && typeof body === "object" ? body : {};
  if (res.status < 500 && typeof data.code === "string" && typeof data.error === "string") {
    return { error: data.error };
  }
  const reference = typeof data.correlationId === "string" ? data.correlationId : res.headers.get("x-correlation-id");
  return reference ? { error: genericMessage, reference } : { error: genericMessage };
}
