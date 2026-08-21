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
import { MessageSquare, Send, Loader2, User } from "lucide-react";

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
    } catch (err: any) {
      toast.error(err.message || "Failed to load discussions");
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
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-white p-0 gap-0">
        <SheetHeader className="p-4 border-b border-slate-100">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#1447E6]" />
            Digital Classroom Q&A
          </SheetTitle>
          <SheetDescription className="text-xs line-clamp-1">
            Discussing: {studyMaterialTitle}
          </SheetDescription>
        </SheetHeader>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-[#1447E6]" />
              <p className="text-xs text-slate-400 mt-2">Loading discussions...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">No questions yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
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
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isStaff
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {roleText}
                    </span>
                    <span className="text-[10px] text-slate-400">
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
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex gap-2 items-end">
            <Textarea
              placeholder="Ask a question..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="resize-none min-h-[44px] h-[44px] max-h-[120px] rounded-xl border-slate-200 focus:border-[#1447E6] text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handlePostComment();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handlePostComment}
              disabled={submitting || !newComment.trim()}
              className="bg-[#1447E6] hover:bg-[#474AD3] rounded-xl shrink-0 h-11 w-11"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
