"use client";

import React, { useState } from "react";
import { Upload, Download, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col font-['Poppins',sans-serif]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#0B1220] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1447E6] text-white shadow-md">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Bulk Student Onboarding</h2>
              <p className="text-xs text-slate-500">Import student roster from Excel / CSV spreadsheet</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Download Template Banner */}
          <div className="flex items-center justify-between rounded-xl bg-blue-50/80 p-4 border border-blue-100">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[#1447E6]">Need an Excel / CSV Template?</p>
              <p className="text-xs text-slate-600">Download formatted headers (FirstName, LastName, AdmissionNo, Gender, Class)</p>
            </div>
            <Button
              type="button"
              onClick={handleDownloadTemplate}
              variant="outline"
              size="sm"
              className="border-blue-200 text-[#1447E6] hover:bg-blue-100 font-semibold gap-1.5 text-xs h-8"
            >
              <Download className="h-3.5 w-3.5" />
              Download Template
            </Button>
          </div>

          {/* File Upload Drag Box */}
          <div className="relative rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#1447E6] bg-slate-50/50 p-8 text-center transition-all">
            <input
              type="file"
              accept=".csv, .txt, .xlsx"
              onChange={handleFileChange}
              className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 text-[#1447E6]">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {file ? file.name : "Click or drag your student roster file here"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Supports CSV or TXT spreadsheet files</p>
              </div>
            </div>
          </div>

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">
                  Roster Preview ({validCount} / {parsedRows.length} Valid Rows)
                </span>
                <span className="text-emerald-600 font-semibold">{validCount} Ready to Import</span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0B1220] text-white font-semibold text-xs sticky top-0">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2">Admission No</th>
                      <th className="px-3 py-2">Gender</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {parsedRows.map((row, index) => (
                      <tr key={index} className={row.isValid ? "bg-white" : "bg-rose-50/50"}>
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{index + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {row.firstName} {row.lastName}
                        </td>
                        <td className="px-3 py-2 font-medium">{row.admissionNumber || "—"}</td>
                        <td className="px-3 py-2 capitalize">{row.gender}</td>
                        <td className="px-3 py-2 font-medium text-blue-900">{row.className || "—"}</td>
                        <td className="px-3 py-2 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <AlertCircle className="h-3 w-3" /> {row.errorReason}
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

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button type="button" onClick={onClose} variant="outline" className="border-slate-300">
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleUploadSubmit}
            disabled={isSubmitting || validCount === 0}
            className="bg-[#1447E6] hover:bg-[#1447E6]/90 text-white font-semibold gap-2 px-6"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import {validCount > 0 ? `${validCount} Students` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
