"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, AlertCircle, PlayCircle } from "lucide-react";

type PendingExam = {
  id: string;
  title: string;
  duration: number;
  totalQuestions: number;
};

export default function StudentPendingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [exams, setExams] = useState<PendingExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<PendingExam[]>(`/student/${slug}/pending`)
      .then(setExams)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const cbtBaseUrl =
    process.env.NEXT_PUBLIC_CBT_URL ||
    process.env.NEXT_PUBLIC_HANOLED_URL?.replace(":3000", ":3002") ||
    "http://localhost:3002";

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/school/${slug}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Pending Exams</h1>
          <p className="text-sm text-slate-500">
            Computer-based tests awaiting your attempt
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 mb-4">
              <AlertCircle className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="font-semibold text-slate-700">All caught up!</p>
            <p className="text-sm text-slate-500 mt-1">
              You have no pending exams. Check back later for new assignments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                      <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                      <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
                        {exam.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className="text-xs border-slate-200 text-slate-600"
                      >
                        {exam.totalQuestions} questions
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs border-slate-200 text-slate-600"
                      >
                        {exam.duration} minutes
                      </Badge>
                    </div>
                  </div>
                  <a
                    href={`${cbtBaseUrl}/student/exam/${exam.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button className="bg-blue-600 hover:bg-blue-700 text-xs gap-1.5">
                      <PlayCircle className="h-3.5 w-3.5" />
                      Start Exam
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}