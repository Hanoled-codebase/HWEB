import { toast } from "sonner";
import { HSMS_BASE } from "@/lib/api";
import { authFetchInit } from "@/lib/auth-tokens";

type ReportCardDownload = {
  orgSlug: string;
  studentId: string;
  studentName: string;
  term: string;
  academicYear: string;
};

/**
 * Downloads one student's report card PDF. Always goes through fetch so the
 * request is authenticated (Authorization header or session cookie, see
 * lib/auth-tokens): a plain `window.open(url)` navigation sends neither and is
 * rejected with 401 by the API, and putting the token in the URL instead would
 * leak it into logs, browser history and Referer headers.
 * Shows its own error toast; resolves true only when a PDF was saved.
 */
export async function downloadReportCardPdf({
  orgSlug,
  studentId,
  studentName,
  term,
  academicYear,
}: ReportCardDownload): Promise<boolean> {
  try {
    const url = `${HSMS_BASE}/export/${orgSlug}/report-card/${studentId}?term=${encodeURIComponent(
      term,
    )}&academicYear=${encodeURIComponent(academicYear)}`;
    const res = await fetch(url, authFetchInit("hcore"));

    if (!res.ok) {
      toast.error("Could not download the report card. Please try again.");
      return false;
    }

    const blobUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `Report_Card_${studentName.trim().replace(/\s+/g, "_")}_${term.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
    return true;
  } catch {
    toast.error("Could not download the report card. Check your connection and try again.");
    return false;
  }
}
