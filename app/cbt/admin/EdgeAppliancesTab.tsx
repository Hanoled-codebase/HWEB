"use client";

import React, { useState, useEffect } from "react";
import { Server, Download, ShieldOff, CheckCircle2, Clock, Info, Copy, BookOpen } from "lucide-react";
import { cbtApi, type EdgePlatform } from "@/lib/api-cbt";

export default function EdgeAppliancesTab({ orgSlug, exams }: { orgSlug: string; exams: any[] }) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [platforms, setPlatforms] = useState<Record<string, boolean>>({});
  const [platform, setPlatform] = useState<EdgePlatform>("mac");

  // Export modal state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [exportError, setExportError] = useState("");

  // Practice pack modal state — built only from already-cached past-question
  // sets (see practicePacks.js); never triggers a live vendor API call.
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [practiceSets, setPracticeSets] = useState<Array<{ subject: string; ssceBoard: string; year: number; questionCount: number }>>([]);
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
  const [practiceExporting, setPracticeExporting] = useState(false);
  const [practiceError, setPracticeError] = useState("");

  const fetchNodes = async () => {
    setLoading(true);
    try {
      const data = await cbtApi.getEdgeNodes();
      setNodes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    cbtApi.getEdgeAppliancePlatforms()
      .then((data) => {
        setPlatforms(data);
        // Prefer whichever build the visitor's own OS would use, falling
        // back to whatever's actually available on the server.
        const agent = navigator.userAgent;
        const detected: EdgePlatform = agent.includes("Windows") ? "win" : agent.includes("Linux") ? "linux" : "mac";
        if (data[detected]) setPlatform(detected);
        else {
          const first = (["win", "mac", "linux"] as const).find((p) => data[p]);
          if (first) setPlatform(first);
        }
      })
      .catch(() => {});
  }, []);

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this appliance? It will no longer be able to sync exams or results.")) return;
    try {
      await cbtApi.revokeEdgeNode(id);
      fetchNodes();
    } catch (err) {
      alert("Failed to revoke node");
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !selectedNode) return;
    setExportError("");
    setExportingId(selectedNode.id);
    
    try {
      const res = await cbtApi.exportExamPackage(selectedExamId, { edgeNodeId: selectedNode.id });
      // Download the package as a file
      const blob = new Blob([JSON.stringify(res.package, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exam_${selectedExamId}_edge_${selectedNode.id.substring(0, 8)}.hcbtexam`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsExportOpen(false);
      setSelectedExamId("");
    } catch (err: any) {
      setExportError(err.message || "Failed to export package");
    } finally {
      setExportingId(null);
    }
  };

  const setKey = (s: { subject: string; ssceBoard: string; year: number }) => `${s.subject}::${s.ssceBoard}::${s.year}`;

  const openPracticeModal = async () => {
    setPracticeError("");
    setIsPracticeOpen(true);
    try {
      const res = await cbtApi.getAvailablePracticeSets();
      // A malformed reply must not crash the modal (it reads practiceSets.length).
      setPracticeSets(Array.isArray(res?.sets) ? res.sets : []);
    } catch (err: any) {
      setPracticeError(err.message || "Failed to load cached practice sets");
    }
  };

  const toggleSet = (key: string) => {
    setSelectedSets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleExportPractice = async () => {
    if (selectedSets.size === 0) return;
    setPracticeExporting(true);
    setPracticeError("");
    try {
      const selections = practiceSets.filter((s) => selectedSets.has(setKey(s))).map(({ subject, ssceBoard, year }) => ({ subject, ssceBoard, year }));
      const res: any = await cbtApi.exportPracticePack(selections);
      const blob = new Blob([JSON.stringify(res.pack, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `practice_pack_${new Date().toISOString().slice(0, 10)}.hcbtpractice`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsPracticeOpen(false);
      setSelectedSets(new Set());
    } catch (err: any) {
      setPracticeError(err.message || "Failed to export practice pack");
    } finally {
      setPracticeExporting(false);
    }
  };

  const handleDownloadAppliance = async () => {
    setDownloading(true);
    try {
      // A published release downloads straight from where it's hosted.
      const link = await cbtApi.getEdgeApplianceLink(platform).catch(() => ({ url: null }));
      if (link.url) {
        window.location.assign(link.url);
        return;
      }
      const blob = await cbtApi.downloadEdgeAppliance(platform);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = platform === "win" ? "hcbt-edge.exe" : "hcbt-edge";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Failed to download the Edge Appliance executable");
    } finally {
      setDownloading(false);
    }
  };

  const availablePlatformCount = Object.values(platforms).filter(Boolean).length;

  const publishedExams = exams.filter(e => e.status === "published");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Edge Appliances</h2>
          <p className="text-sm text-slate-500 font-medium">Manage local offline servers and generate exam packages.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="bg-[#eef2ff] text-[#1447E6] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            Offline exams must be exported here
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {availablePlatformCount > 1 && (
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as EdgePlatform)}
                className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-2 min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-slate-300 shrink-0"
              >
                {platforms.mac && <option value="mac">macOS</option>}
                {platforms.win && <option value="win">Windows</option>}
                {platforms.linux && <option value="linux">Linux</option>}
              </select>
            )}
            <button
              onClick={handleDownloadAppliance}
              disabled={downloading || availablePlatformCount === 0}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-xl transition flex items-center justify-center gap-1.5 flex-1 sm:flex-none whitespace-nowrap min-w-[9.5rem] min-h-[44px] sm:min-h-0"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              {downloading ? "Downloading..." : `Download Appliance${availablePlatformCount === 1 ? ` (${{ win: "Windows", mac: "macOS", linux: "Linux" }[platform]})` : ""}`}
            </button>
            <button
              onClick={openPracticeModal}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition flex items-center justify-center gap-1.5 flex-1 sm:flex-none whitespace-nowrap min-w-[9.5rem] min-h-[44px] sm:min-h-0"
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              Build Practice Pack
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : nodes.length === 0 ? (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[24px] p-8 sm:p-16 text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-5">
            <Server className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Appliances Paired</h3>
          <p className="text-[13px] text-slate-500 max-w-sm mx-auto leading-relaxed mb-2">
            To use offline exams, click <strong>Download Appliance</strong> above, run it on your local server, and pair it using this school's slug:
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
            Only that server needs internet. The computers students sit at only need to be on the same local network as it — not the internet.
          </p>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 group">
            <span className="text-sm font-bold text-slate-800 flex-1 truncate text-left">{orgSlug}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(orgSlug); alert("Copied!"); }}
              className="text-slate-400 hover:text-slate-600 transition"
              title="Copy Slug"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {nodes.map(node => (
            <div key={node.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${node.status === 'REVOKED' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{node.label || "Unnamed Edge Node"}</h3>
                    <p className="text-xs text-slate-500 font-mono">{node.id.substring(0, 8)}...</p>
                  </div>
                </div>
                {node.status === "REVOKED" ? (
                  <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full border border-red-100 uppercase">Revoked</span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-100 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Paired</span>
                  <span className="font-medium text-slate-700">{new Date(node.pairedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Last Sync</span>
                  <span className="font-medium text-slate-700">{node.lastSeenAt ? new Date(node.lastSeenAt).toLocaleString() : "Never"}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedNode(node);
                    setIsExportOpen(true);
                  }}
                  disabled={node.status === "REVOKED"}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold py-2 min-h-[44px] sm:min-h-0 rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Exam
                </button>
                <button
                  onClick={() => handleRevoke(node.id)}
                  disabled={node.status === "REVOKED"}
                  className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-xs font-bold py-2 px-3 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg transition"
                  title="Revoke Node"
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export Modal */}
      {isExportOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" />
                Export Exam Package
              </h3>
              <button onClick={() => setIsExportOpen(false)} aria-label="Close" className="-mr-2 flex h-11 w-11 items-center justify-center text-xl text-slate-400 hover:text-slate-600 sm:mr-0 sm:h-auto sm:w-auto sm:text-base">×</button>
            </div>
            
            <form onSubmit={handleExport} className="p-6 space-y-4">
              {exportError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100">
                  {exportError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Published Exam</label>
                <select 
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Exam --</option>
                  {publishedExams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.title}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed">
                This will generate an encrypted <code>.hcbtexam</code> file locked to <strong>{selectedNode?.label || selectedNode?.id.substring(0,8)}</strong>. Move this file to the local server via USB or local network to import it into the Edge Appliance.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedExamId || !!exportingId}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                >
                  {exportingId ? "Generating..." : "Download Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Practice Pack Modal */}
      {isPracticeOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Build Practice Pack
              </h3>
              <button onClick={() => setIsPracticeOpen(false)} aria-label="Close" className="-mr-2 flex h-11 w-11 items-center justify-center text-xl text-slate-400 hover:text-slate-600 sm:mr-0 sm:h-auto sm:w-auto sm:text-base">×</button>
            </div>

            <div className="p-6 space-y-4">
              {practiceError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100">
                  {practiceError}
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed">
                Only sets already fetched by students/teachers online are cached and exportable — this never calls the practice-question provider itself, so it never spends the shared quota.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select cached subject/board/year sets</label>
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {practiceSets.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 text-center">Nothing cached yet — have a student or teacher use Practice Simulator online first.</div>
                  ) : (
                    practiceSets.map((s) => {
                      const key = setKey(s);
                      return (
                        <label key={key} className="flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50">
                          <input type="checkbox" checked={selectedSets.has(key)} onChange={() => toggleSet(key)} className="rounded border-slate-300" />
                          <span className="flex-1 font-medium text-slate-700">{s.subject} · {s.ssceBoard.toUpperCase()} · {s.year}</span>
                          <span className="text-xs text-slate-500">{s.questionCount} Q</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPracticeOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExportPractice}
                  disabled={selectedSets.size === 0 || practiceExporting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                >
                  {practiceExporting ? "Building..." : `Download Pack (${selectedSets.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
