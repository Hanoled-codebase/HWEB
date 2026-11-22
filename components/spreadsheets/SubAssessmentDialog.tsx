"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import {
  getErrorMessage,
  type AssessmentCategorySummary,
  type SpreadsheetAssessment,
} from "@/lib/spreadsheets";
import { cn } from "@/lib/utils";

export type SubAssessmentModalMode =
  | {
      mode: "add";
      categoryId?: string;
    }
  | {
      mode: "edit";
      id: string;
      categoryId: string;
      initialName: string;
      initialMaxMarks: number;
    };

type SubAssessmentDialogProps = {
  open: boolean;
  modal: SubAssessmentModalMode | null;
  orgSlug: string;
  sheetId: string;
  categories: readonly AssessmentCategorySummary[];
  /** Existing sub-assessment count per category (used to suggest next default name). */
  subCountByCategory?: ReadonlyMap<string, number>;
  onOpenChange: (open: boolean) => void;
  onSaved: (saved: { categoryId: string; subAssessmentId?: string; mode: "add" | "edit" }) => Promise<void> | void;
};

type FormInnerProps = {
  modal: SubAssessmentModalMode;
  orgSlug: string;
  sheetId: string;
  editableCategories: readonly AssessmentCategorySummary[];
  subCountByCategory?: ReadonlyMap<string, number>;
  onClose: () => void;
  onSaved: SubAssessmentDialogProps["onSaved"];
};

function SubAssessmentFormInner({
  modal,
  orgSlug,
  sheetId,
  editableCategories,
  subCountByCategory,
  onClose,
  onSaved,
}: FormInnerProps) {
  const nameInputId = useId();
  const marksInputId = useId();
  const marksHintId = useId();
  const errorId = useId();

  const fixedCategoryId = modal.mode === "edit" ? modal.categoryId : modal.categoryId;
  const initialCategoryId = fixedCategoryId || editableCategories[0]?.id || "";
  const initialCategory =
    editableCategories.find((cat) => cat.id === initialCategoryId) ?? editableCategories[0] ?? null;

  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const activeCategory =
    editableCategories.find((cat) => cat.id === selectedCategoryId) ?? initialCategory;

  const defaultSuggestedName = (() => {
    if (modal.mode === "edit") return modal.initialName;
    if (!activeCategory) return "";
    const existingCount = subCountByCategory?.get(activeCategory.id) ?? 0;
    return `${activeCategory.name} ${existingCount + 1}`;
  })();

  const [name, setName] = useState(defaultSuggestedName);
  const [maxMarks, setMaxMarks] = useState(
    modal.mode === "edit"
      ? String(modal.initialMaxMarks)
      : String(activeCategory?.maxMarks ?? 10),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"name" | "marks" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const marksRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (announceTimerRef.current) {
        clearTimeout(announceTimerRef.current);
      }
    };
  }, []);

  const announce = (message: string) => {
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    setLiveAnnouncement("");
    announceTimerRef.current = setTimeout(() => {
      setLiveAnnouncement(message);
    }, 450);
  };

  const handleCategoryChange = (nextCategoryId: string) => {
    setSelectedCategoryId(nextCategoryId);
    const nextCat = editableCategories.find((cat) => cat.id === nextCategoryId);
    if (nextCat && modal.mode === "add") {
      const existingCount = subCountByCategory?.get(nextCat.id) ?? 0;
      setName(`${nextCat.name} ${existingCount + 1}`);
      setMaxMarks(String(nextCat.maxMarks));
    }
    setFormError(null);
    setErrorField(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeCategory) return;

    const trimmedName = name.trim();
    const parsedMarks = Number(maxMarks);

    if (!trimmedName) {
      const msg = "Enter a sub-assessment name.";
      setFormError(msg);
      setErrorField("name");
      announce(msg);
      nameRef.current?.focus();
      return;
    }

    if (!Number.isInteger(parsedMarks) || parsedMarks <= 0) {
      const msg = "Maximum marks must be a positive whole number.";
      setFormError(msg);
      setErrorField("marks");
      announce(msg);
      marksRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setErrorField(null);

    try {
      if (modal.mode === "add") {
        const res = await apiFetch<{ data?: { id?: string } }>(
          `/spreadsheets/${orgSlug}/${sheetId}/sub-assessments`,
          {
            method: "POST",
            body: JSON.stringify({
              categoryId: activeCategory.id,
              name: trimmedName,
              maxMarks: parsedMarks,
            }),
          },
        );
        toast.success(`Added ${trimmedName}`);
        onClose();
        await onSaved({
          categoryId: activeCategory.id,
          subAssessmentId: res?.data?.id,
          mode: "add",
        });
      } else {
        await apiFetch(
          `/spreadsheets/${orgSlug}/${sheetId}/sub-assessments/${modal.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              name: trimmedName,
              maxMarks: parsedMarks,
            }),
          },
        );
        toast.success(`Updated ${trimmedName}`);
        onClose();
        await onSaved({
          categoryId: activeCategory.id,
          subAssessmentId: modal.id,
          mode: "edit",
        });
      }
    } catch (error) {
      const msg = getErrorMessage(error, "Could not save sub-assessment");
      setFormError(msg);
      setErrorField(msg.toLowerCase().includes("name") ? "name" : "marks");
      announce(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const showCategorySelect =
    modal.mode === "add" && !modal.categoryId && editableCategories.length > 1;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      <DialogHeader>
        <DialogTitle className="text-lg font-bold text-[#0B1220]">
          {modal.mode === "add" ? "Add sub-assessment" : "Edit sub-assessment"}
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-600">
          {activeCategory
            ? `${activeCategory.name} · Admin cap is ${activeCategory.maxMarks} marks. Sub-assessment scores scale automatically to ${activeCategory.maxMarks}.`
            : "Create a sub-assessment for this category."}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 space-y-4">
        {showCategorySelect && (
          <div className="space-y-1.5">
            <Label htmlFor="sub-category-select" className="text-sm font-semibold text-slate-800">
              Assessment category
            </Label>
            <Select value={selectedCategoryId} onValueChange={(v) => handleCategoryChange(String(v ?? ""))}>
              <SelectTrigger
                id="sub-category-select"
                className="min-h-11 w-full rounded-xl border-slate-200 bg-white text-sm font-medium text-[#0B1220]"
              >
                <SelectValue placeholder="Choose assessment" />
              </SelectTrigger>
              <SelectContent>
                {editableCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name} (Max {cat.maxMarks})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={nameInputId} className="text-sm font-semibold text-slate-800">
            Sub-Assessment Name
          </Label>
          <Input
            id={nameInputId}
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errorField === "name") {
                setFormError(null);
                setErrorField(null);
              }
            }}
            placeholder="e.g. Classwork 1"
            required
            aria-invalid={errorField === "name" ? "true" : "false"}
            aria-describedby={errorField === "name" && formError ? errorId : undefined}
            className={cn(
              "min-h-11 rounded-xl border-slate-200 bg-white text-base text-[#0B1220] md:text-sm",
              errorField === "name" && "border-rose-500 focus-visible:ring-rose-200",
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={marksInputId} className="text-sm font-semibold text-slate-800">
            Maximum Marks (whole number)
          </Label>
          <p id={marksHintId} className="text-xs text-slate-500">
            Enter the raw marks for this task (for example 10 or 20). Totals normalize to{" "}
            {activeCategory?.maxMarks ?? "the admin cap"}.
          </p>
          <Input
            id={marksInputId}
            ref={marksRef}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={maxMarks}
            onChange={(e) => {
              setMaxMarks(e.target.value);
              if (errorField === "marks") {
                setFormError(null);
                setErrorField(null);
              }
            }}
            required
            aria-invalid={errorField === "marks" ? "true" : "false"}
            aria-describedby={
              errorField === "marks" && formError
                ? `${marksHintId} ${errorId}`
                : marksHintId
            }
            className={cn(
              "min-h-11 rounded-xl border-slate-200 bg-white text-base tabular-nums text-[#0B1220] md:text-sm",
              errorField === "marks" && "border-rose-500 focus-visible:ring-rose-200",
            )}
          />
        </div>

        {formError && (
          <div
            id={errorId}
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}
      </div>

      <DialogFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={onClose}
          className="min-h-11 rounded-xl md:pointer-fine:min-h-9"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || !activeCategory}
          className="min-h-11 rounded-xl bg-[#1447E6] text-white hover:bg-[#0F36B8] md:pointer-fine:min-h-9"
        >
          {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {modal.mode === "add" ? "Add Sub-Assessment" : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SubAssessmentDialog({
  open,
  modal,
  orgSlug,
  sheetId,
  categories,
  subCountByCategory,
  onOpenChange,
  onSaved,
}: SubAssessmentDialogProps) {
  const editableCategories = categories.filter((cat) => !cat.isSingleInstance);
  const formKey = modal
    ? modal.mode === "edit"
      ? `edit-${modal.id}-${modal.initialName}-${modal.initialMaxMarks}`
      : `add-${modal.categoryId ?? "any"}`
    : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {modal && (
          <SubAssessmentFormInner
            key={formKey}
            modal={modal}
            orgSlug={orgSlug}
            sheetId={sheetId}
            editableCategories={editableCategories}
            subCountByCategory={subCountByCategory}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type DeleteSubAssessmentDialogProps = {
  target: SpreadsheetAssessment | null;
  orgSlug: string;
  sheetId: string;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => Promise<void> | void;
};

export function DeleteSubAssessmentDialog({
  target,
  orgSlug,
  sheetId,
  onOpenChange,
  onDeleted,
}: DeleteSubAssessmentDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!target?.id) return;
    setDeleting(true);
    try {
      await apiFetch(`/spreadsheets/${orgSlug}/${sheetId}/sub-assessments/${target.id}`, {
        method: "DELETE",
      });
      toast.success(`Removed ${target.name}`);
      onOpenChange(false);
      await onDeleted();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not remove sub-assessment"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {target?.name || "sub-assessment"}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the sub-assessment from this spreadsheet. Sub-assessments with recorded
            learner scores cannot be deleted until scores are cleared.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} className="min-h-11 rounded-xl md:pointer-fine:min-h-9">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
            className="min-h-11 rounded-xl bg-rose-600 text-white hover:bg-rose-700 md:pointer-fine:min-h-9"
          >
            {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
