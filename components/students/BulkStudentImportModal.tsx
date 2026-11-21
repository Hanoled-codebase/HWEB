"use client";

import React, { useState } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export interface ClassOption {
  id: string;
  name: string;
  level?: string;
}

interface ParsedStudentRow {
  firstName: string;
  lastName: string;
  admissionNumber?: string;
  gender?: string;
  className?: string;
  classLevelId?: string;
  isValid: boolean;
  errorReason?: string;
}

interface BulkStudentImportModalProps {
  orgSlug: string;
  classOptions: ClassOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkStudentImportModal({
  orgSlug,
  classOptions = [],
  onClose,
  onSuccess,
}: BulkStudentImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate and trigger download of a sample CSV template file
  const handleDownloadTemplate = () => {
    const csvContent =
      "firstName,lastName,admissionNumber,gender,className\n" +
      "Chidi,Adeyemi,ADM/2026/001,male,JSS 1A\n" +
      "Amina,Bello,ADM/2026/002,female,JSS 1A\n" +
      "Emeka,Okonkwo,ADM/2026/003,male,SS 1 Science\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hanoled-students-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse raw text file (CSV/TSV)
  const parseCSV = (text: string) => {
    const lines = text
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      toast.error("CSV file is empty or missing data rows");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const fnIdx = headers.findIndex((h) => h.includes("first") || h === "firstname");
    const lnIdx = headers.findIndex((h) => h.includes("last") || h === "lastname");
    const admIdx = headers.findIndex((h) => h.includes("adm") || h.includes("number"));
    const genIdx = headers.findIndex((h) => h.includes("gender") || h.includes("sex"));
    const classIdx = headers.findIndex((h) => h.includes("class"));

    const rows: ParsedStudentRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length < 2) continue;

      const firstName = parts[fnIdx >= 0 ? fnIdx : 0] || "";
      const lastName = parts[lnIdx >= 0 ? lnIdx : 1] || "";
      const admissionNumber = admIdx >= 0 ? parts[admIdx] : parts[2] || "";
      const gender = genIdx >= 0 ? parts[genIdx] : parts[3] || "male";
      const className = classIdx >= 0 ? parts[classIdx] : parts[4] || "";

      // Match class name to available organization class levels
      const matchedClass = classOptions.find(
        (c) => c.name.toLowerCase() === className.toLowerCase()
      );

      const isValid = Boolean(firstName && lastName);
      let errorReason = "";
      if (!firstName) errorReason = "Missing First Name";
      else if (!lastName) errorReason = "Missing Last Name";

      rows.push({
        firstName,
        lastName,
        admissionNumber: admissionNumber || undefined,
        gender: gender.toLowerCase().startsWith("f") ? "female" : "male",
        className: className || undefined,
        classLevelId: matchedClass?.id,
        isValid,
        errorReason,
      });
    }

    setParsedRows(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) parseCSV(content);
    };
    reader.readAsText(selectedFile);
  };

  const handleUploadSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);

    if (validRows.length === 0) {
      toast.error("No valid student rows to import");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        students: validRows.map((r) => ({
          firstName: r.firstName,
          lastName: r.lastName,
          admissionNumber: r.admissionNumber,
          gender: r.gender,
          classLevelId: r.classLevelId,
        })),
      };

      await apiFetch(`/students/${orgSlug}/bulk`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(`Successfully onboarded ${validRows.length} students!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "Failed to import student dataset";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#1447E6]">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Bulk Student Onboarding</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-slate-600">
                Import your student roster from a CSV or TXT file.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Download Template Banner */}
          <div className="flex flex-col gap-3 rounded-xl border border-blue-200/80 bg-[#EEF0FF]/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[#1447E6]">Need a CSV Template?</p>
              <p className="text-xs text-slate-600">
                Download formatted headers (FirstName, LastName, AdmissionNo, Gender, Class)
              </p>
            </div>
            <Button
              type="button"
              onClick={handleDownloadTemplate}
              variant="outline"
              size="sm"
              className="w-full shrink-0 gap-1.5 border-blue-200 bg-white text-xs font-semibold text-[#1447E6] hover:bg-blue-50 sm:w-auto"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download Template
            </Button>
          </div>

          {/* File Upload Dropzone */}
          <label className="relative block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center transition-colors hover:border-[#1447E6] focus-within:border-[#1447E6] focus-within:ring-2 focus-within:ring-[#1447E6]/20 sm:p-8">
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              aria-label="Upload student roster CSV or TXT file"
              onChange={handleFileChange}
              className="sr-only"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#1447E6] shadow-xs">
                <Upload className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0B1220]">
                  {file ? file.name : "Tap to choose or drag your student roster"}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">Supports CSV or TXT files (export Excel sheets as CSV)</p>
              </div>
            </div>
          </label>

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Roster Preview ({validCount}/{parsedRows.length} valid)
                </span>
                <span className="font-semibold text-emerald-700 tabular-nums">{validCount} ready</span>
              </div>

              <div
                role="region"
                aria-label="Parsed student roster preview"
                tabIndex={0}
                className="max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white focus-visible:outline-2 focus-visible:outline-[#1447E6]"
              >
                <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-[#0B1220] text-xs font-semibold text-white">
                    <tr>
                      <th scope="col" className="px-3 py-2">#</th>
                      <th scope="col" className="px-3 py-2">Student Name</th>
                      <th scope="col" className="px-3 py-2">Admission No</th>
                      <th scope="col" className="px-3 py-2">Gender</th>
                      <th scope="col" className="px-3 py-2">Class</th>
                      <th scope="col" className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {parsedRows.map((row, index) => (
                      <tr key={index} className={row.isValid ? "bg-white" : "bg-red-50/50"}>
                        <td className="px-3 py-2 font-mono text-xs tabular-nums text-slate-600">{index + 1}</td>
                        <td className="px-3 py-2 font-semibold text-[#0B1220]">
                          {row.firstName} {row.lastName}
                        </td>
                        <td className="px-3 py-2 font-medium tabular-nums">{row.admissionNumber || "—"}</td>
                        <td className="px-3 py-2 capitalize">{row.gender}</td>
                        <td className="px-3 py-2 font-medium text-[#0B1220]">{row.className || "—"}</td>
                        <td className="px-3 py-2 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                              <AlertCircle className="h-3 w-3" aria-hidden="true" /> {row.errorReason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3">
          <Button type="button" onClick={onClose} variant="outline" className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUploadSubmit}
            disabled={isSubmitting || validCount === 0}
            className="w-full gap-2 bg-[#1447E6] px-6 font-semibold text-white hover:bg-[#0F36B8] sm:w-auto"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            Import {validCount > 0 ? `${validCount} Students` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
