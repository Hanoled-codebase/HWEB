import { toast } from "sonner";
import { HSMS_BASE } from "@/lib/api";
import { authFetchInit } from "@/lib/auth-tokens";

type ReportCardDownload = {
  orgSlug: string;
  studentId: string;
  studentName: string;
  term: string;
  academicYear: string;
  /** Which stored result the PDF renders. Defaults to the end-of-term row. */
  resultType?: "MID_TERM" | "END_OF_TERM";
};

type BundleDownload = {
  orgSlug: string;
  classLevelId: string;
  className?: string;
  term: string;
  academicYear: string;
  resultType?: "MID_TERM" | "END_OF_TERM";
};

function reportCardUrl({
  orgSlug,
  studentId,
  term,
  academicYear,
  resultType,
}: Omit<ReportCardDownload, "studentName">): string {
  return `${HSMS_BASE}/export/${orgSlug}/report-card/${studentId}?term=${encodeURIComponent(
    term,
  )}&academicYear=${encodeURIComponent(academicYear)}${
    resultType ? `&resultType=${encodeURIComponent(resultType)}` : ""
  }`;
}

function bundleUrl({ orgSlug, classLevelId, term, academicYear, resultType }: BundleDownload): string {
  return `${HSMS_BASE}/export/${orgSlug}/report-card-bundle/${classLevelId}?term=${encodeURIComponent(
    term,
  )}&academicYear=${encodeURIComponent(academicYear)}${
    resultType ? `&resultType=${encodeURIComponent(resultType)}` : ""
  }`;
}

export function reportCardFileName(
  studentName: string,
  term: string,
  resultType?: "MID_TERM" | "END_OF_TERM",
): string {
  return `Report_Card_${studentName.trim().replace(/\s+/g, "_")}_${term.replace(/\s+/g, "_")}${
    resultType === "MID_TERM" ? "_Mid_Term" : ""
  }.pdf`;
}

export function bundleFileName(
  className: string,
  term: string,
  academicYear: string,
  resultType?: "MID_TERM" | "END_OF_TERM",
): string {
  return `Report_Cards_Bundle_${className.replace(/\s+/g, "_")}_${term.replace(/\s+/g, "_")}${
    resultType === "MID_TERM" ? "_Mid_Term" : ""
  }_${academicYear.replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;
}

/**
 * Fetches a report-card PDF as a blob through the authenticated fetch path.
 * A plain `window.open(url)` navigation sends neither Authorization header nor
 * session cookie and is rejected with 401 by the API, and putting the token in
 * the URL instead would leak it into logs, browser history and Referer headers.
 * Shows its own error toast; resolves null on failure.
 */
async function fetchAuthenticatedPdf(url: string, failureMessage: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, { ...authFetchInit("hcore"), signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      toast.error(failureMessage);
      return null;
    }
    return await res.blob();
  } catch {
    toast.error("Check your connection and try again.");
    return null;
  }
}

async function openPdfInNewTab(url: string, failureMessage: string): Promise<boolean> {
  // Reserve the tab during the click, before an authenticated fetch loses user activation.
  const tab = window.open("about:blank", "_blank");
  if (!tab) {
    toast.error("Allow pop-ups to view the PDF.");
    return false;
  }
  tab.opener = null;

  const blob = await fetchAuthenticatedPdf(url, failureMessage);
  if (!blob) {
    tab.close();
    return false;
  }
  if (tab.closed) return false;

  const blobUrl = URL.createObjectURL(blob);
  tab.location.replace(blobUrl);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  return true;
}

function saveBlob(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/**
 * Downloads one student's report card PDF. Shows its own error toast; resolves
 * true only when a PDF was saved.
 */
export async function downloadReportCardPdf(options: ReportCardDownload): Promise<boolean> {
  const blob = await fetchAuthenticatedPdf(
    reportCardUrl(options),
    "Could not download the report card. Please try again.",
  );
  if (!blob) return false;
  saveBlob(blob, reportCardFileName(options.studentName, options.term, options.resultType));
  return true;
}

/** Opens one student's report card PDF in a new tab (the mobile-friendly path). */
export async function openReportCardPdf(options: ReportCardDownload): Promise<boolean> {
  return openPdfInNewTab(reportCardUrl(options), "Could not open the report card. Please try again.");
}

/** Downloads the whole class's report cards as one bundle PDF. */
export async function downloadReportCardBundle(options: BundleDownload): Promise<boolean> {
  const blob = await fetchAuthenticatedPdf(
    bundleUrl(options),
    "Failed to generate report cards bundle",
  );
  if (!blob) return false;
  saveBlob(
    blob,
    bundleFileName(options.className || "class", options.term, options.academicYear, options.resultType),
  );
  return true;
}

/** Opens the whole class's report-card bundle PDF in a new tab. */
export async function openReportCardBundle(options: BundleDownload): Promise<boolean> {
  return openPdfInNewTab(bundleUrl(options), "Failed to generate report cards bundle");
}
