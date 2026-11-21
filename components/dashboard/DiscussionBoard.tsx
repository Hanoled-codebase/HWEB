"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2 } from "lucide-react";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  member?: {
    id: string;
    role: string;
    user: { name: string };
  } | null;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

type DiscussionBoardProps = {
  studyMaterialId: string;
  studyMaterialTitle: string;
  isOpen: boolean;
  onClose: () => void;
};

export function DiscussionBoard({
  studyMaterialId,
  studyMaterialTitle,
  isOpen,
  onClose,
}: DiscussionBoardProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && studyMaterialId) {
      fetchComments();
    }
  }, [isOpen, studyMaterialId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: Comment[] }>(
        `/study-materials/${studyMaterialId}/comments`
      );
      if (res.success) {
        setComments(res.data);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load discussions");
    } finally {
      setLoading(false);
    }
  }

  async function handlePostComment() {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{ success: boolean; data: Comment }>(
        `/study-materials/${studyMaterialId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ content: newComment }),
        }
      );
      if (res.success) {
        setComments((prev) => [...prev, res.data]);
        setNewComment("");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex h-dvh w-full flex-col gap-0 bg-white p-0 sm:max-w-md max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:left-0 max-md:right-0 max-md:h-[88dvh] max-md:rounded-t-3xl max-md:border-l-0 max-md:border-t max-md:pt-0">
        <div
          aria-hidden="true"
          className="mx-auto mt-2.5 hidden h-1 w-10 shrink-0 rounded-full bg-slate-300 max-md:block"
        />
        <SheetHeader className="border-b border-slate-200/80 p-4 pr-14">
          <SheetTitle className="flex items-center gap-2 text-base font-bold text-[#0B1220]">
            <MessageSquare className="h-5 w-5 text-[#1447E6]" aria-hidden="true" />
            Digital Classroom Q&A
          </SheetTitle>
          <SheetDescription className="line-clamp-1 text-xs text-slate-600">
            Discussing: {studyMaterialTitle}
          </SheetDescription>
        </SheetHeader>

        {/* Message Feed */}
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain bg-slate-50/70 p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-[#1447E6]" />
              <p className="text-xs text-slate-500 mt-2">Loading discussions...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">No questions yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                Be the first to ask a question or share a thought on this resource.
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const name = comment.member
                ? comment.member.user.name
                : comment.student
                ? `${comment.student.firstName} ${comment.student.lastName}`
                : "Unknown User";

              const roleText = comment.member
                ? comment.member.role === "owner" || comment.member.role === "admin"
                  ? "Admin"
                  : "Teacher"
                : "Student";

              const isStaff = comment.member && comment.member.role !== "parent";

              return (
                <div key={comment.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <span>{name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                        isStaff
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {roleText}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(comment.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm text-sm text-slate-800 leading-relaxed max-w-[90%]">
                    {comment.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-200/80 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Ask a question..."
              aria-label="Ask a question"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="h-[44px] max-h-[120px] min-h-[44px] resize-none rounded-xl border-slate-200 text-base focus:border-[#1447E6] sm:text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handlePostComment();
                }
              }}
            />
            <Button
              size="icon"
              aria-label="Send comment"
              onClick={handlePostComment}
              disabled={submitting || !newComment.trim()}
              className="h-11 w-11 shrink-0 rounded-xl bg-[#1447E6] hover:bg-[#0F36B8]"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
