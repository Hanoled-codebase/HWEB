"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Plus,
  Loader2,
  Users,
  DoorOpen,
  Bed,
  MapPin,
  UserCheck,
  UserX,
  ArrowLeft,
} from "lucide-react";

type StudentBrief = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
};

type Allocation = {
  id: string;
  studentId: string;
  status: string;
  startDate: string;
  endDate: string | null;
  student: StudentBrief;
};

type HostelRoom = {
  id: string;
  name: string;
  roomNumber: string;
  capacity: number;
  occupied: number;
  gender: string | null;
  floor: number | null;
  description: string | null;
  allocations: Allocation[];
};

export default function HostelPage() {
  const { currentOrg } = useOrganization();
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState("");
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAllocate, setShowAllocate] = useState<string | null>(null);
  const [allocateStudentId, setAllocateStudentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [newRoom, setNewRoom] = useState({
    name: "", roomNumber: "", capacity: "4", gender: "", floor: "", description: "",
  });

  useEffect(() => {
    if (!currentOrg) return;
    loadRooms();
  }, [currentOrg, genderFilter]);

  async function loadRooms() {
    try {
      const params = new URLSearchParams();
      if (genderFilter) params.set("gender", genderFilter);
      const qs = params.toString();
      const data = await apiFetch<HostelRoom[]>(
        `/${currentOrg!.slug}/hostel/rooms${qs ? `?${qs}` : ""}`,
      );
      setRooms(data);
    } catch {
      toast.error("Failed to load rooms");
    } finally {
      setIsLoading(false);
    }
  }

  async function addRoom() {
    if (!newRoom.name || !newRoom.roomNumber) { toast.error("Name and room number required"); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/${currentOrg!.slug}/hostel/rooms`, {
        method: "POST",
        body: JSON.stringify(newRoom),
      });
      toast.success("Room added");
      setShowAddRoom(false);
      setNewRoom({ name: "", roomNumber: "", capacity: "4", gender: "", floor: "", description: "" });
      loadRooms();
    } catch {} finally {
      setSubmitting(false);
    }
  }

  async function allocateRoom(roomId: string) {
    if (!allocateStudentId) { toast.error("Student ID required"); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/${currentOrg!.slug}/hostel/allocate`, {
        method: "POST",
        body: JSON.stringify({ roomId, studentId: allocateStudentId }),
      });
      toast.success("Student allocated");
      setShowAllocate(null);
      setAllocateStudentId("");
      loadRooms();
    } catch {} finally {
      setSubmitting(false);
    }
  }

  async function vacateRoom(allocationId: string) {
    try {
      await apiFetch(`/${currentOrg!.slug}/hostel/vacate/${allocationId}`, {
        method: "PATCH",
      });
      toast.success("Room vacated");
      loadRooms();
    } catch {}
  }

  const occupancyColor = (occupied: number, capacity: number) => {
    const pct = occupied / capacity;
    if (pct >= 1) return "bg-red-500";
    if (pct >= 0.75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            Hostel Management
          </h1>
          <p className="text-sm text-muted-foreground">Manage boarding rooms and allocations</p>
        </div>
        <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" /> Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
              <DialogDescription>Create a hostel room</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Input placeholder="Room name * (e.g. Boys Hostel Block A)" value={newRoom.name} onChange={e => setNewRoom(p => ({ ...p, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Room number *" value={newRoom.roomNumber} onChange={e => setNewRoom(p => ({ ...p, roomNumber: e.target.value }))} />
                <Input placeholder="Capacity" type="number" value={newRoom.capacity} onChange={e => setNewRoom(p => ({ ...p, capacity: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={newRoom.gender || undefined} onValueChange={(v) => setNewRoom(prev => ({ ...prev, gender: v as string }))}>
                  <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Floor" type="number" value={newRoom.floor} onChange={e => setNewRoom(p => ({ ...p, floor: e.target.value }))} />
              </div>
              <Textarea placeholder="Description (optional)" value={newRoom.description} onChange={e => setNewRoom(p => ({ ...p, description: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddRoom(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={addRoom} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Add Room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Select value={genderFilter} onValueChange={v => setGenderFilter(v as string)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All genders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2 mb-2" /><Skeleton className="h-3 w-1/3" /></CardContent></Card>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No rooms yet. Add your first hostel room.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map(room => (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-muted-foreground" />
                      {room.name} — {room.roomNumber}
                    </CardTitle>
                    <CardDescription>
                      {room.floor !== null && <><MapPin className="h-3 w-3 inline mr-1" />Floor {room.floor} • </>}
                      {room.gender && <Badge variant="outline" className="text-xs">{room.gender}</Badge>}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${occupancyColor(room.occupied, room.capacity)}`} style={{ width: `${Math.min(100, (room.occupied / room.capacity) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">
                    <Bed className="h-3 w-3 inline mr-1" />
                    {room.occupied}/{room.capacity}
                  </span>
                </div>

                {room.allocations.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Occupants:</p>
                    {room.allocations.map(alloc => (
                      <div key={alloc.id} className="flex items-center justify-between text-sm py-1 px-2 bg-slate-50 rounded">
                        <span>
                          {alloc.student.firstName} {alloc.student.lastName}
                          {alloc.student.admissionNumber && <span className="text-xs text-muted-foreground ml-1">({alloc.student.admissionNumber})</span>}
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 text-red-500" onClick={() => vacateRoom(alloc.id)}>
                          <UserX className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No current occupants</p>
                )}

                {room.occupied < room.capacity && (
                  <Dialog open={showAllocate === room.id} onOpenChange={o => { setShowAllocate(o ? room.id : null); setAllocateStudentId(""); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="w-full mt-3">
                        <UserCheck className="h-4 w-4 mr-1" /> Allocate Student
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Allocate Room</DialogTitle>
                        <DialogDescription>{room.name} — {room.roomNumber} ({room.occupied}/{room.capacity} occupied)</DialogDescription>
                      </DialogHeader>
                      <Input placeholder="Student ID" value={allocateStudentId} onChange={e => setAllocateStudentId(e.target.value)} />
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAllocate(null)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => allocateRoom(room.id)} disabled={submitting}>
                          {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                          Allocate
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
