"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Server, RefreshCw, ShieldCheck, LockOpen, Lock, PlayCircle, BookOpen, Users,
  CheckCircle2, XCircle, Loader2, Link2, ScrollText, Cloud, Download,
} from "lucide-react";
import { toast } from "sonner";
import { authFetchInit } from "@/lib/auth-tokens";

/**
 * "This Device" — the appliance's own control panel, shown in place of the
 * online console's "Edge Appliances" tab when this UI is served BY an
 * appliance (EDGE_MODE). Everything here talks to the appliance's local
 * /api/edge/* endpoints: pairing, roster and package import, unlock/arm, sync
 * and the audit trail.
 */

async function edgeApi<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const auth = authFetchInit("hcbt");
  const res = await fetch(path, {
    method: init.method || "GET",
    credentials: auth.credentials,
    headers: { "Content-Type": "application/json", ...auth.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || (typeof data.error === "string" ? data.error : "") || res.statusText);
  return data as T;
}

/** GET /api/edge/update — see Hcbt/edge/src/updater.js. */
interface UpdateStatus {
  currentVersion: string;
  platform: string;
  canInstall: boolean;
  available: { version: string; notes: string | null; size: number | null } | null;
  staged: { version: string } | null;
  lastCheckAt: string | null;
  lastError: string | null;
}

const STATE_STYLE: Record<string, string> = {
  UNPAIRED: "bg-slate-100 text-slate-600",
  PAIRED: "bg-blue-50 text-[#1447E6]",
  PACKAGE_IMPORTED: "bg-blue-50 text-[#1447E6]",
  EXAM_ARMED: "bg-amber-50 text-[#8a5c10]",
  EXAM_RUNNING: "bg-emerald-50 text-emerald-700",
};

function Card({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="text-[#1447E6]">{icon}</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{title}</h3>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

const btnPrimary = "inline-flex items-center justify-center gap-1.5 bg-[#1447E6] hover:bg-[#0f36b8] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all";
const btnGhost = "inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all";
const input = "w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6]";

/** A file picker + paste box that resolves to parsed JSON. */
function JsonImport({ label, accept, onImport, busy }: { label: string; accept: string; onImport: (json: unknown) => Promise<void>; busy: boolean }) {
  const [text, setText] = useState("");
  const submit = async (raw: string) => {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { toast.error("That isn't valid JSON."); return; }
    await onImport(parsed);
    setText("");
  };
  return (
    <div className="space-y-2.5">
      <input
        type="file"
        accept={accept}
        disabled={busy}
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await submit(await f.text()); e.target.value = ""; } }}
        className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#1447E6] hover:file:bg-blue-100"
      />
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold text-[#1447E6]">…or paste {label} JSON</summary>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className={`${input} mt-2 font-mono`} placeholder="{ … }" />
        <button disabled={busy || !text.trim()} onClick={() => submit(text)} className={`${btnPrimary} mt-2`}>Import</button>
      </details>
    </div>
  );
}

export default function EdgeDeviceTab() {
  const [status, setStatus] = useState<any>(null);
  const [roster, setRoster] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [audit, setAudit] = useState<any>(null);
  const [preflight, setPreflight] = useState<Record<string, any>>({});
  const [emergency, setEmergency] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [pair, setPair] = useState({ cloudBaseUrl: "https://cbt-api.hanoled.com", organizationSlug: "" });
  const [update, setUpdate] = useState<UpdateStatus | null>(null);

  const load = useCallback(async () => {
    const [s, r, p, pp, a, u] = await Promise.allSettled([
      edgeApi("/api/edge/status"),
      edgeApi("/api/edge/roster/status"),
      edgeApi("/api/edge/packages"),
      edgeApi("/api/edge/practice-packs"),
      edgeApi("/api/edge/audit"),
      edgeApi<UpdateStatus>("/api/edge/update"),
    ]);
    if (s.status === "fulfilled") setStatus(s.value);
    if (r.status === "fulfilled") setRoster(r.value);
    if (p.status === "fulfilled") setPackages(p.value.packages);
    if (pp.status === "fulfilled") setPacks(pp.value.packs);
    if (a.status === "fulfilled") setAudit(a.value);
    if (u.status === "fulfilled") setUpdate(u.value);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<string | void>) => {
    setBusy(key);
    try {
      const msg = await fn();
      if (msg) toast.success(msg);
      await load();
    } catch (err: any) {
      toast.error(err.message || "That didn't work.");
    } finally {
      setBusy(null);
    }
  };

  if (!status) {
    return <div className="flex justify-center p-16"><Loader2 className="w-6 h-6 animate-spin text-[#1447E6]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#0B1220]">This Device</h2>
          <p className="text-sm text-slate-500 font-medium">Pairing, accounts, exam packages and sync for this appliance.</p>
        </div>
        <span className={`self-start text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full ${STATE_STYLE[status.deviceState] || STATE_STYLE.UNPAIRED}`}>
          {String(status.deviceState).replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Edge node", value: status.edgeNodeId ? `${status.edgeNodeId.slice(0, 10)}…` : "—", mono: true },
          { label: "Cloud", value: status.paired ? status.cloudBaseUrl : "Not paired" },
          { label: "Pending sync", value: String(status.pendingSync + (status.cbtPending ? status.cbtPending.exams + status.cbtPending.results + status.cbtPending.deleted : 0)) },
          { label: "Audit chain", value: status.auditChain?.valid ? "Intact" : "Check needed", good: !!status.auditChain?.valid },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
            <p className={`mt-1 text-sm font-bold truncate ${s.mono ? "font-mono" : ""} ${s.good === true ? "text-emerald-600" : s.good === false ? "text-[#F04438]" : "text-[#0B1220]"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Accounts & roster"
          icon={<Users className="w-4 h-4" />}
          action={
            <button
              disabled={busy === "roster-pull" || !status.paired}
              onClick={() => run("roster-pull", async () => {
                const r: any = await edgeApi("/api/edge/roster/pull", { method: "POST", body: {} });
                if (r?.error) throw new Error(r.error);
                return `Accounts refreshed from Cloud: ${r.learners} learners, ${r.staff} staff.`;
              })}
              className={btnGhost}
              title={status.paired ? "Fetch the latest classes, students and staff from Hanoled Cloud" : "Pair this device first"}
            >
              {busy === "roster-pull" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Pull from Cloud
            </button>
          }
        >
          <dl className="grid grid-cols-4 gap-2 mb-4 text-center">
            {[["Learners", roster?.learners], ["Staff", roster?.staff], ["Classes", roster?.classes], ["Exams", roster?.exams]].map(([l, n]) => (
              <div key={l as string} className="bg-slate-50 rounded-xl py-2.5">
                <dd className="text-base font-extrabold text-[#0B1220]">{n ?? 0}</dd>
                <dt className="text-xs font-bold uppercase text-slate-500">{l}</dt>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            {roster?.organization ? <>Loaded for <strong className="text-slate-700">{roster.organization.name}</strong>. </> : "No school loaded yet. "}
            {status.paired
              ? <>This device refreshes accounts from Cloud automatically{status.lastRosterPullAt ? <> (last: {new Date(status.lastRosterPullAt).toLocaleString()})</> : null}. You can also import a snapshot file below.</>
              : "Pair this device and it will fetch every account from Hanoled Cloud. Until then, import a roster snapshot file so people can sign in with their normal passwords."}
          </p>
          <JsonImport
            label="roster"
            accept=".json,application/json"
            busy={busy === "roster"}
            onImport={(json) => run("roster", async () => {
              const r: any = await edgeApi("/api/edge/roster/import", { method: "POST", body: json });
              return `Roster loaded: ${r.learners} learners, ${r.staff} staff, ${r.classes} classes.`;
            })}
          />
        </Card>

        <Card
          title="Cloud sync"
          icon={<Cloud className="w-4 h-4" />}
          action={
            <button
              disabled={busy === "sync" || !status.paired}
              onClick={() => run("sync", async () => {
                const r: any = await edgeApi("/api/edge/sync/trigger", { method: "POST", body: {} });
                const err = r?.error || r?.cbt?.error;
                if (err) throw new Error(err);
                const c = r?.cbt || {};
                return `Sync finished — ${c.exams || 0} exams, ${c.results || 0} results sent.`;
              })}
              className={btnGhost}
            >
              {busy === "sync" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync now
            </button>
          }
        >
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Only this machine needs internet — to pair, to fetch an unlock token near exam time, and to send results afterwards.
            {status.lastStatusPullAt && <> Last cloud check: {new Date(status.lastStatusPullAt).toLocaleString()}.</>}
          </p>
          {status.cbtPending && (
            <dl className="grid grid-cols-3 gap-2 mb-3 text-center">
              {[["Exams to send", status.cbtPending.exams], ["Results to send", status.cbtPending.results], ["Deletions", status.cbtPending.deleted]].map(([l, n]) => (
                <div key={l as string} className="bg-slate-50 rounded-xl py-2">
                  <dd className="text-base font-extrabold text-[#0B1220]">{n}</dd>
                  <dt className="text-xs font-bold uppercase text-slate-500">{l}</dt>
                </div>
              ))}
            </dl>
          )}
          {status.cbtPending?.conflicts?.length > 0 && (
            <div className="mb-3 rounded-xl border border-[#F5A623]/40 bg-[#F5A623]/10 p-3 space-y-2">
              <p className="text-xs font-bold text-[#8a5c10]">These exams were changed on Cloud too, so they were not overwritten:</p>
              {status.cbtPending.conflicts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700 truncate">{c.title}</span>
                  {c.reason === "CLOUD_CHANGED" ? (
                    <button
                      className={btnGhost}
                      onClick={() => run(`res-${c.id}`, async () => { await edgeApi(`/api/edge/cbt-sync/${c.id}/resolve`, { method: "POST", body: {} }); return "This device's version will replace Cloud's on the next sync."; })}
                    >
                      Keep this device&apos;s version
                    </button>
                  ) : (
                    <span className="text-xs font-bold uppercase text-slate-500">{String(c.reason).replace(/_/g, " ")}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <details className="text-xs" open={!status.paired}>
            <summary className="cursor-pointer font-semibold text-[#1447E6] flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> {status.paired ? "Re-pair with Hanoled Cloud" : "Pair with Hanoled Cloud"}</summary>
            <div className="mt-3 space-y-2.5">
              <input className={input} placeholder="Cloud URL" value={pair.cloudBaseUrl} onChange={(e) => setPair({ ...pair, cloudBaseUrl: e.target.value })} />
              <input className={input} placeholder="School slug, e.g. greenfield-academy" value={pair.organizationSlug} onChange={(e) => setPair({ ...pair, organizationSlug: e.target.value })} />
              <button
                disabled={busy === "pair" || !pair.organizationSlug.trim()}
                onClick={() => run("pair", async () => { await edgeApi("/api/edge/pair", { method: "POST", body: pair }); return "Device paired."; })}
                className={btnPrimary}
              >
                {busy === "pair" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />} Pair device
              </button>
            </div>
          </details>
        </Card>
      </div>

      <Card title="Exam packages" icon={<ShieldCheck className="w-4 h-4" />}>
        <p className="text-xs text-slate-500 leading-relaxed mb-3">
          Secure exams exported from Cloud arrive as signed, encrypted packages. Import, run the preflight checklist, unlock, then arm — an armed exam appears to its candidates like any other assigned exam.
        </p>
        <JsonImport
          label="package"
          accept=".json,application/json"
          busy={busy === "pkg-import"}
          onImport={(json) => run("pkg-import", async () => { await edgeApi("/api/edge/package/import", { method: "POST", body: json }); return "Package verified and imported."; })}
        />

        {packages.length > 0 && (
          <div className="mt-5 divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {packages.map((p) => {
              const pre = preflight[p.packageId];
              return (
                <div key={p.packageId} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0B1220] truncate">{p.manifest.title || p.examId}</p>
                      <p className="text-xs text-slate-500">
                        {p.manifest.totalQuestions ?? "—"} questions · {p.manifest.durationMinutes ?? "—"} min · {p.candidateCount} candidates
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${p.unlocked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {p.unlocked ? "Unlocked" : "Locked"}
                      </span>
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${p.armed ? "bg-amber-50 text-[#8a5c10]" : "bg-slate-100 text-slate-500"}`}>
                        {p.armed ? "Armed" : "Not armed"}
                      </span>
                    </div>
                  </div>

                  {pre && (
                    <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                      {Object.entries(pre.checks).map(([k, v]) => (
                        <li key={k} className="flex items-center gap-1.5 text-xs text-slate-600">
                          {v ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-[#F04438] shrink-0" />}
                          {k.replace(/([A-Z])/g, " $1").toLowerCase()}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button className={btnGhost} disabled={busy === `pre-${p.packageId}`} onClick={() => run(`pre-${p.packageId}`, async () => {
                      const r = await edgeApi(`/api/edge/package/${p.packageId}/preflight`);
                      setPreflight((m) => ({ ...m, [p.packageId]: r }));
                      return r.passed ? "Preflight passed." : "Preflight found problems — see the checklist.";
                    })}><ShieldCheck className="w-3.5 h-3.5" /> Preflight</button>

                    {!p.unlocked && (
                      <>
                        <button className={btnGhost} onClick={() => run(`ul-${p.packageId}`, async () => { await edgeApi(`/api/edge/package/${p.packageId}/unlock`, { method: "POST", body: { mode: "B_SCHEDULED" } }); return "Unlocked for its scheduled window."; })}>
                          <LockOpen className="w-3.5 h-3.5" /> Unlock (scheduled)
                        </button>
                        <button className={btnGhost} onClick={() => run(`ulo-${p.packageId}`, async () => { await edgeApi(`/api/edge/package/${p.packageId}/unlock-online`, { method: "POST", body: {} }); return "Unlocked with a token from Cloud."; })}>
                          <Cloud className="w-3.5 h-3.5" /> Unlock online
                        </button>
                        <span className="inline-flex items-center gap-1.5">
                          <input className="w-32 text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl" placeholder="Emergency code" value={emergency[p.packageId] || ""} onChange={(e) => setEmergency((m) => ({ ...m, [p.packageId]: e.target.value }))} />
                          <button className={btnGhost} disabled={!emergency[p.packageId]} onClick={() => run(`ule-${p.packageId}`, async () => { await edgeApi(`/api/edge/package/${p.packageId}/unlock`, { method: "POST", body: { mode: "C_EMERGENCY", emergencyCode: emergency[p.packageId] } }); return "Emergency unlock used — this is audited."; })}>
                            <Lock className="w-3.5 h-3.5" /> Use
                          </button>
                        </span>
                      </>
                    )}
                    {p.unlocked && !p.armed && (
                      <button className={btnPrimary} onClick={() => run(`arm-${p.packageId}`, async () => { await edgeApi(`/api/edge/package/${p.packageId}/arm`, { method: "POST", body: {} }); return "Exam armed — candidates can now start it."; })}>
                        <PlayCircle className="w-3.5 h-3.5" /> Arm exam
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {update && (
          <Card title="Updates" icon={<Download className="w-4 h-4" />}>
            <p className="text-sm text-[#0B1220]">
              This appliance runs version <strong>{update.currentVersion}</strong> ({update.platform}).
            </p>
            {update.staged ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-[#0B1220]">Version {update.staged.version} is downloaded and checked.</p>
                <p className="text-xs text-slate-500">
                  Installing restarts the appliance for about a minute. It won&apos;t start while any exam is in progress.
                </p>
                <button
                  disabled={busy === "update-install" || !update.canInstall}
                  onClick={() =>
                    run("update-install", async () => {
                      await edgeApi("/api/edge/update/install", { method: "POST", body: {} });
                      return `Installing ${update.staged?.version}. This page reconnects when the appliance is back.`;
                    })
                  }
                  className={btnPrimary}
                  title={update.canInstall ? undefined : "Only an installed appliance can update itself"}
                >
                  {busy === "update-install" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Install {update.staged.version} and restart
                </button>
              </div>
            ) : update.available ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-[#0B1220]">
                  Version {update.available.version} is available
                  {update.available.size ? ` (${Math.round(update.available.size / 1_000_000)} MB)` : ""}.
                </p>
                {update.available.notes && <p className="text-xs text-slate-500">{update.available.notes}</p>}
                <button
                  disabled={busy === "update-download"}
                  onClick={() =>
                    run("update-download", async () => {
                      await edgeApi("/api/edge/update/download", { method: "POST", body: {} });
                      return "Update downloaded and checked against Hanoled's signature.";
                    })
                  }
                  className={btnPrimary}
                >
                  {busy === "update-download" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Download update
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                {update.lastCheckAt ? `Up to date as of ${new Date(update.lastCheckAt).toLocaleString()}.` : "Not checked yet."}
              </p>
            )}
            {update.lastError && <p className="mt-2 text-xs text-[#F04438]">{update.lastError}</p>}
            <button
              disabled={busy === "update-check" || !status.paired}
              onClick={() =>
                run("update-check", async () => {
                  const next = await edgeApi<UpdateStatus>("/api/edge/update/check", { method: "POST", body: {} });
                  return next.available ? `Version ${next.available.version} is available.` : "This appliance is up to date.";
                })
              }
              className={`${btnGhost} mt-3`}
              title={status.paired ? undefined : "Pair this device first"}
            >
              {busy === "update-check" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Check for updates
            </button>
          </Card>
        )}

        <Card title="Practice packs" icon={<BookOpen className="w-4 h-4" />}>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Frozen SSCE/JAMB past questions for the Practice Simulator and for importing into exams — no internet needed after import.
          </p>
          <JsonImport
            label="practice pack"
            accept=".json,.hcbtpractice,application/json"
            busy={busy === "pack"}
            onImport={(json) => run("pack", async () => { await edgeApi("/api/edge/practice-pack/import", { method: "POST", body: json }); return "Practice pack imported."; })}
          />
          {packs.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {packs.map((p) => (
                <li key={p.packId} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                  <span className="font-semibold text-slate-700">{p.manifest.sets?.length ?? 0} sets</span>
                  <span className="text-slate-400">{new Date(p.importedAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Audit trail" icon={<ScrollText className="w-4 h-4" />}>
          <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {(audit?.entries || []).slice(0, 12).map((e: any) => (
              <li key={e.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-mono font-semibold text-slate-700 truncate">{e.eventType}</span>
                <span className="text-slate-400 shrink-0">{new Date(e.timestamp).toLocaleString()}</span>
              </li>
            ))}
            {(!audit || audit.entries.length === 0) && <li className="text-xs text-slate-500">No events yet.</li>}
          </ul>
        </Card>
      </div>

      <p className="text-xs text-slate-500 flex items-center gap-1.5"><Server className="w-3 h-3" /> Live invigilation for locally created exams is in the Grade Auditor tab; this panel is for the device itself.</p>
    </div>
  );
}
