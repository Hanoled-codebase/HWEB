"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toTitleCase } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Plus,
  Trash2,
  BookOpen,
  Clock,
  User,
  MapPin,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type ClassLevel = { id: string; name: string };
type Schedule = {
  id: string;
  classLevelId: string;
  classLevel: ClassLevel;
  term: string | null;
  academicYear: string | null;
  isActive: boolean;
  _count: { slots: number };
  createdAt: string;
};

type Slot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subject: string;
  subjectCode: string | null;
  teacherId: string | null;
  teacher: string | null;
  teacherEmail: string | null;
  room: string | null;
};

type DayGroup = { day: string; dayIndex: number; slots: Slot[] };
type Subject = { id: string; name: string; code: string | null };
type Teacher = { id: string; user: { id: string; name: string; email: string } };

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_PRESETS = [
  "08:00", "08:45", "09:00", "09:45", "10:00", "10:45", "11:00", "11:45",
  "12:00", "12:45", "13:00", "13:45", "14:00", "14:45", "15:00", "15:45", "16:00",
];

export default function TimetablePage() {
  const { currentOrg, currentMember } = useOrganization();
  const orgSlug = currentOrg?.slug;

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [scheduleDays, setScheduleDays] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [newScheduleClass, setNewScheduleClass] = useState("");
  const [newScheduleTerm, setNewScheduleTerm] = useState("");
  const [newScheduleYear, setNewScheduleYear] = useState("");
  const [creating, setCreating] = useState(false);

  const [classes, setClasses] = useState<ClassLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [slotDay, setSlotDay] = useState(0);
  const [slotStart, setSlotStart] = useState("08:00");
  const [slotEnd, setSlotEnd] = useState("08:45");
  const [slotSubject, setSlotSubject] = useState("");
  const [slotTeacher, setSlotTeacher] = useState("");
  const [slotRoom, setSlotRoom] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);

  const isPrivileged = currentMember?.role === "owner" || currentMember?.role === "admin";

  const loadSchedules = useCallback(async () => {
    if (!orgSlug) return;
    try {
      setLoading(true);
      const data = await apiFetch<Schedule[]>(`/timetable/${orgSlug}`);
      setSchedules(data);
      if (data.length > 0 && !selectedSchedule) {
        setSelectedSchedule(data[0]);
      }
    } catch {
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, [orgSlug, selectedSchedule]);

  const loadReferences = useCallback(async () => {
    if (!orgSlug) return;
    try {
      const [cls, subs] = await Promise.all([
        apiFetch<any[]>(`/classes/${orgSlug}`),
        apiFetch<Subject[]>(`/subjects/${orgSlug}`),
      ]);
      setClasses(cls);
      setSubjects(subs);
    } catch { }
    try {
      const mems = await apiFetch<Teacher[]>(`/organizations/${orgSlug}/members?role=member`, { showErrorToast: false });
      setTeachers(mems);
    } catch { }
  }, [orgSlug]);

  const loadSlots = useCallback(async () => {
    if (!orgSlug || !selectedSchedule) return;
    try {
      setLoadingSlots(true);
      const data = await apiFetch<{ schedule: Schedule; days: DayGroup[] }>(
        `/timetable/${orgSlug}/${selectedSchedule.id}/slots`
      );
      setScheduleDays(data.days);
    } catch {
      toast.error("Failed to load slots");
    } finally {
      setLoadingSlots(false);
    }
  }, [orgSlug, selectedSchedule]);

  useEffect(() => { loadReferences(); loadSchedules(); }, [orgSlug]);
  useEffect(() => { if (selectedSchedule) loadSlots(); }, [selectedSchedule]);

  const handleCreateSchedule = async () => {
    if (!orgSlug || !newScheduleClass) { toast.error("Select a class"); return; }
    try {
      setCreating(true);
      await apiFetch(`/timetable/${orgSlug}`, {
        method: "POST",
        body: JSON.stringify({
          classLevelId: newScheduleClass,
          term: newScheduleTerm || null,
          academicYear: newScheduleYear || null,
        }),
        headers: { "Content-Type": "application/json" },
      });
      toast.success("Schedule created");
      setShowCreateSchedule(false);
      setNewScheduleClass("");
      setNewScheduleTerm("");
      setNewScheduleYear("");
      await loadSchedules();
    } catch {
      toast.error("Failed to create schedule");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!orgSlug || !confirm("Delete this schedule and all its slots?")) return;
    try {
      await apiFetch(`/timetable/${orgSlug}/${id}`, { method: "DELETE" });
      toast.success("Schedule deleted");
      if (selectedSchedule?.id === id) {
        setSelectedSchedule(null);
        setScheduleDays([]);
      }
      await loadSchedules();
    } catch {
      toast.error("Failed to delete schedule");
    }
  };

  const openAddSlot = (dayIndex: number) => {
    setEditingSlot(null);
    setSlotDay(dayIndex);
    setSlotStart("08:00");
    setSlotEnd("08:45");
    setSlotSubject("");
    setSlotTeacher("");
    setSlotRoom("");
    setShowSlotModal(true);
  };

  const openEditSlot = (slot: Slot) => {
    setEditingSlot(slot);
    setSlotDay(slot.dayOfWeek);
    setSlotStart(slot.startTime);
    setSlotEnd(slot.endTime);
    setSlotSubject(slot.subjectId);
    setSlotTeacher(slot.teacherId || "");
    setSlotRoom(slot.room || "");
    setShowSlotModal(true);
  };

  const handleSaveSlot = async () => {
    if (!orgSlug || !selectedSchedule || !slotSubject) {
      toast.error("Select a subject");
      return;
    }
    try {
      setSavingSlot(true);
      const body = {
        dayOfWeek: slotDay,
        startTime: slotStart,
        endTime: slotEnd,
        subjectId: slotSubject,
        teacherId: slotTeacher || null,
        room: slotRoom || null,
      };

      if (editingSlot) {
        await apiFetch(`/timetable/slots/${editingSlot.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Slot updated");
      } else {
        await apiFetch(`/timetable/${orgSlug}/${selectedSchedule.id}/slots`, {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Slot added");
      }
      setShowSlotModal(false);
      await loadSlots();
    } catch {
      toast.error("Failed to save slot");
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!orgSlug || !confirm("Delete this slot?")) return;
    try {
      await apiFetch(`/timetable/slots/${slotId}`, { method: "DELETE" });
      toast.success("Slot deleted");
      await loadSlots();
    } catch {
      toast.error("Failed to delete slot");
    }
  };

  const toggleActiveSchedule = async (schedule: Schedule) => {
    if (!orgSlug) return;
    try {
      await apiFetch(`/timetable/${orgSlug}/${schedule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !schedule.isActive }),
        headers: { "Content-Type": "application/json" },
      });
      toast.success(schedule.isActive ? "Schedule deactivated" : "Schedule activated");
      await loadSchedules();
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  return (
    <div className="space-y-4 pb-28 md:pb-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-slate-900">Timetable Management</h1>
        <p className="text-xs text-slate-400 font-medium">Create and manage class schedules.</p>
      </div>

      {isPrivileged && (
        <Button
          onClick={() => setShowCreateSchedule(!showCreateSchedule)}
          className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Schedule
        </Button>
      )}

      {showCreateSchedule && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Class</label>
                <select
                  value={newScheduleClass}
                  onChange={(e) => setNewScheduleClass(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5"
                >
                  <option value="">Select class...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Term</label>
                <Input
                  value={newScheduleTerm}
                  onChange={(e) => setNewScheduleTerm(e.target.value)}
                  placeholder="e.g. Term 1"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Academic Year</label>
                <Input
                  value={newScheduleYear}
                  onChange={(e) => setNewScheduleYear(e.target.value)}
                  placeholder="e.g. 2025/2026"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleCreateSchedule} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Create
                </Button>
                <Button variant="outline" onClick={() => setShowCreateSchedule(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : schedules.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="h-10 w-10 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">No schedules yet</p>
            <p className="text-sm text-slate-500 mt-1">Create a schedule to start building timetables.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {schedules.map((s) => {
              const isSelected = selectedSchedule?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSchedule(s)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-[#EEF0FF] text-[#5B5EF4] border border-indigo-100"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#5B5EF4]" />}
                  <span>{s.classLevel.name}</span>
                </button>
              );
            })}

            {selectedSchedule && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                {selectedSchedule.classLevel.name}
                {selectedSchedule.term ? ` · ${selectedSchedule.term}` : ""}
                {selectedSchedule.academicYear ? ` · ${selectedSchedule.academicYear}` : ""}
              </span>
            )}
          </div>

          {selectedSchedule && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                {selectedSchedule._count.slots} slots ·{" "}
                {selectedSchedule.isActive ? (
                  <span className="text-emerald-500 font-semibold">Active</span>
                ) : (
                  <span className="text-slate-400">Inactive</span>
                )}
              </p>
              {isPrivileged && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActiveSchedule(selectedSchedule)}
                    className="text-xs rounded-xl h-8 px-3 border-slate-200 text-slate-700 font-semibold"
                  >
                    {selectedSchedule.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                    className="text-xs rounded-xl h-8 px-3 text-rose-500 hover:text-rose-600 border-rose-100 hover:border-rose-200 bg-rose-50/50"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          )}

          {loadingSlots ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {scheduleDays.map((day) => (
                <div key={day.dayIndex} className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{day.day}</span>
                      <span className="bg-slate-100 text-slate-500 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                        {day.slots.length} period{day.slots.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {isPrivileged && (
                      <button
                        onClick={() => openAddSlot(day.dayIndex)}
                        className="text-[#5B5EF4] hover:text-indigo-700 text-xs font-semibold flex items-center gap-1"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {day.slots.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200/80 rounded-2xl">
                        No periods scheduled
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {day.slots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"
                          >
                            <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[100px]">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs font-semibold text-slate-700">
                                {slot.startTime} – {slot.endTime}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[140px] min-w-0">
                              <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                              <div className="min-w-0">
                                <span className="text-sm font-semibold text-slate-800 block truncate">{slot.subject}</span>
                                {slot.subjectCode && (
                                  <span className="text-[11px] text-slate-400">{slot.subjectCode}</span>
                                )}
                              </div>
                            </div>

                            {slot.teacher && (
                              <div className="flex items-center gap-1.5 w-full sm:w-auto sm:min-w-[120px] min-w-0">
                                <User className="h-3 w-3 text-slate-400" />
                                <span className="text-xs text-slate-600 block truncate">{slot.teacher}</span>
                              </div>
                            )}

                            {slot.room && (
                              <div className="flex items-center gap-1.5 w-full sm:w-auto sm:min-w-[60px]">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                <span className="text-xs text-slate-500">{slot.room}</span>
                              </div>
                            )}

                            {isPrivileged && (
                              <div className="mt-2 sm:mt-0 sm:ml-auto flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => openEditSlot(slot)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-rose-500 hover:text-rose-700"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Slot Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl p-6 relative">
            <button
              onClick={() => setShowSlotModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
            >
              <span className="text-lg">&times;</span>
            </button>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {editingSlot ? "Edit Period" : "Add Period"}
            </h3>
            <p className="text-xs text-slate-500 mb-5">{DAY_NAMES[slotDay]}</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Start Time</label>
                  <select
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  >
                    {TIME_PRESETS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">End Time</label>
                  <select
                    value={slotEnd}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  >
                    {TIME_PRESETS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subject</label>
                <select
                  value={slotSubject}
                  onChange={(e) => setSlotSubject(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                >
                  <option value="">Select subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Teacher (optional)</label>
                <select
                  value={slotTeacher}
                  onChange={(e) => setSlotTeacher(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                >
                  <option value="">None</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{toTitleCase(t.user.name)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Room (optional)</label>
                <Input
                  value={slotRoom}
                  onChange={(e) => setSlotRoom(e.target.value)}
                  placeholder="e.g. Room 101"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleSaveSlot} disabled={savingSlot} className="flex-1">
                {savingSlot ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingSlot ? "Update Period" : "Add Period"}
              </Button>
              <Button variant="outline" onClick={() => setShowSlotModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
