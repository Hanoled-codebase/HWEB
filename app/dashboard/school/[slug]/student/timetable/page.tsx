"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarDays, BookOpen, MapPin, User, X, Clock } from "lucide-react";

type DaySlots = {
  day: string;
  dayIndex: number;
  slots: Array<{
    id: string;
    startTime: string;
    endTime: string;
    subject: string;
    subjectCode?: string | null;
    teacher?: string | null;
    room?: string | null;
  }>;
};

type TimetableData = {
  schedule: { id: string; term?: string | null; academicYear?: string | null } | null;
  days: DaySlots[];
};

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Mathematics: { bg: "bg-blue-100/70", text: "text-blue-800", border: "border-blue-200" },
  English: { bg: "bg-emerald-100/70", text: "text-emerald-800", border: "border-emerald-200" },
  "English Language": { bg: "bg-emerald-100/70", text: "text-emerald-800", border: "border-emerald-200" },
  Physics: { bg: "bg-blue-100/70", text: "text-blue-800", border: "border-blue-200" },
  Chemistry: { bg: "bg-violet-100/70", text: "text-violet-800", border: "border-violet-200" },
  Biology: { bg: "bg-teal-100/70", text: "text-teal-800", border: "border-teal-200" },
  "Civic Education": { bg: "bg-amber-100/70", text: "text-amber-800", border: "border-amber-200" },
  "Social Studies": { bg: "bg-orange-100/70", text: "text-orange-800", border: "border-orange-200" },
  History: { bg: "bg-rose-100/70", text: "text-rose-800", border: "border-rose-200" },
  Geography: { bg: "bg-lime-100/70", text: "text-lime-800", border: "border-lime-200" },
  "Computer Science": { bg: "bg-cyan-100/70", text: "text-cyan-800", border: "border-cyan-200" },
  ICT: { bg: "bg-cyan-100/70", text: "text-cyan-800", border: "border-cyan-200" },
  Economics: { bg: "bg-yellow-100/70", text: "text-yellow-800", border: "border-yellow-200" },
  "Further Mathematics": { bg: "bg-blue-100/70", text: "text-blue-800", border: "border-blue-200" },
  "Fine Arts": { bg: "bg-pink-100/70", text: "text-pink-800", border: "border-pink-200" },
  Music: { bg: "bg-fuchsia-100/70", text: "text-fuchsia-800", border: "border-fuchsia-200" },
  French: { bg: "bg-sky-100/70", text: "text-sky-800", border: "border-sky-200" },
  "Physical Education": { bg: "bg-green-100/70", text: "text-green-800", border: "border-green-200" },
  "Islamic Studies": { bg: "bg-teal-100/70", text: "text-teal-800", border: "border-teal-200" },
  "Christian Studies": { bg: "bg-amber-100/70", text: "text-amber-800", border: "border-amber-200" },
  "Agricultural Science": { bg: "bg-green-100/70", text: "text-green-800", border: "border-green-200" },
};

function getSubjectColor(subject: string) {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS[subject.split(" ").slice(0, 2).join(" ")] || {
    bg: "bg-slate-100/70",
    text: "text-slate-800",
    border: "border-slate-200",
  };
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const HOUR_HEIGHT = 60;
const START_HOUR = 7;
const END_HOUR = 17;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export default function StudentTimetablePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<DaySlots["slots"][0] | null>(null);
  const [mobileDay, setMobileDay] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<TimetableData>(`/student/${slug}/timetable`)
      .then((d) => {
        setData(d);
        const today = new Date().getDay();
        setMobileDay(today === 0 ? 6 : today - 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const today = now.getDay();
  const mondayBased = today === 0 ? 6 : today - 1;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/school/${slug}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Timetable</h1>
          <p className="text-sm text-slate-500">
            {data?.schedule?.term
              ? `${data.schedule.term}${data.schedule.academicYear ? ` · ${data.schedule.academicYear}` : ""}`
              : "Weekly class schedule"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !data || !data.schedule || data.days.every((d) => d.slots.length === 0) ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-500">
          <CalendarDays className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-700">No timetable yet</p>
          <p className="text-sm text-slate-500 mt-1 max-w-[320px] mx-auto">
            Your class schedule has not been published yet. Check back later.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile day selector */}
          <div className="flex md:hidden gap-1 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
            {data.days.filter((d) => d.slots.length > 0).map((day) => (
              <button
                key={day.dayIndex}
                onClick={() => setMobileDay(day.dayIndex)}
                className={`snap-start shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  mobileDay === day.dayIndex
                    ? "bg-blue-100 text-blue-700 shadow-sm"
                    : "bg-white text-slate-500 border border-slate-200"
                }`}
              >
                {day.day}
                {day.dayIndex === mondayBased && (
                  <span className="ml-1 text-[10px] text-blue-500">· Today</span>
                )}
              </button>
            ))}
          </div>

          {/* Desktop: Weekly Grid */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Header row: day names */}
            <div className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-slate-200">
              <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center border-r border-slate-100 bg-slate-50/50" />
              {DAY_NAMES.map((name, i) => {
                const hasSlots = data.days[i]?.slots.length > 0;
                return (
                  <div
                    key={i}
                    className={`p-2 text-center text-xs font-bold border-r border-slate-100 last:border-r-0 ${
                      i === mondayBased ? "bg-blue-50/50 text-blue-700" : hasSlots ? "bg-slate-50/50 text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {name.substring(0, 3)}
                    {i === mondayBased && (
                      <span className="ml-1 text-[11px] text-blue-500 font-semibold">· Today</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scrollable grid body */}
            <div ref={gridRef} className="relative overflow-auto max-h-[600px]" style={{ scrollBehavior: "smooth" }}>
              <div className="grid grid-cols-[60px_repeat(6,1fr)] relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                {/* Time labels */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="col-span-full grid grid-cols-subgrid"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    <div className="text-[10px] font-semibold text-slate-400 text-right pr-2 border-r border-slate-100 bg-slate-50/50 flex items-start pt-0.5">
                      {`${h.toString().padStart(2, "0")}:00`}
                    </div>
                    {DAY_NAMES.map((_, di) => (
                      <div key={di} className="border-r border-slate-100 last:border-r-0 border-t border-slate-50" />
                    ))}
                  </div>
                ))}

                {/* Current time indicator */}
                {nowMinutes >= START_HOUR * 60 && nowMinutes < END_HOUR * 60 && (
                  <div
                    className="absolute left-[60px] right-0 z-20 pointer-events-none"
                    style={{ top: currentTimeTop }}
                  >
                    <div className="flex items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm -ml-[5px]" />
                      <div className="flex-1 h-px bg-rose-500" />
                    </div>
                  </div>
                )}

                {/* Slot blocks */}
                {data.days.map((day) =>
                  day.slots.map((slot) => {
                    const start = timeToMinutes(slot.startTime);
                    const end = timeToMinutes(slot.endTime);
                    const top = ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                    const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 28);
                    const color = getSubjectColor(slot.subject);

                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`absolute left-[60px] mx-0.5 rounded-lg border px-1.5 py-1 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer overflow-hidden ${
                          color.bg
                        } ${color.border} ${color.text}`}
                        style={{
                          top,
                          height,
                          width: `calc(100% / 6 - 4px)`,
                          transform: `translateX(calc((100% / 6) * ${day.dayIndex} + 2px))`,
                        }}
                      >
                        <p className="text-[10px] font-bold leading-tight truncate">
                          {slot.subject}
                        </p>
                        {slot.room && (
                          <p className="text-[11px] opacity-70 leading-tight truncate flex items-center gap-0.5 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 inline" />
                            {slot.room}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Mobile: Vertical Stack */}
          <div className="md:hidden space-y-4">
            {data.days
              .filter((d) => d.slots.length > 0 && (mobileDay === null || d.dayIndex === mobileDay))
              .map((day) => (
                <div key={day.dayIndex} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between ${
                    day.dayIndex === mondayBased ? "bg-blue-50/50" : ""
                  }`}>
                    <span className="text-sm font-bold text-slate-800">{day.day}</span>
                    {day.dayIndex === mondayBased && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Today</span>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    {day.slots.map((slot) => {
                      const color = getSubjectColor(slot.subject);
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot)}
                          className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:shadow-sm ${color.bg} ${color.border}`}
                        >
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color.bg} ${color.text}`}>
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold truncate ${color.text}`}>{slot.subject}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {slot.startTime} – {slot.endTime}
                              </span>
                              {slot.teacher && (
                                <span className="flex items-center gap-0.5 capitalize">
                                  <User className="w-3 h-3" />
                                  {slot.teacher}
                                </span>
                              )}
                            </div>
                          </div>
                          {slot.room && (
                            <span className="shrink-0 text-[10px] text-slate-400 flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {slot.room}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-[384px] w-full shadow-xl p-6 relative">
            <button
              onClick={() => setSelectedSlot(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${getSubjectColor(selectedSlot.subject).bg}`}>
                <BookOpen className={`h-5 w-5 ${getSubjectColor(selectedSlot.subject).text}`} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedSlot.subject}</h3>
                {selectedSlot.subjectCode && (
                  <p className="text-xs text-slate-500">{selectedSlot.subjectCode}</p>
                )}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{selectedSlot.startTime} – {selectedSlot.endTime}</span>
              </div>
              {selectedSlot.teacher && (
                <div className="flex items-center gap-3 text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="capitalize font-semibold">{selectedSlot.teacher}</span>
                </div>
              )}
              {selectedSlot.room && (
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold">{selectedSlot.room}</span>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Button
                onClick={() => setSelectedSlot(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl"
                variant="ghost"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
