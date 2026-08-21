"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Bus,
  Plus,
  Loader2,
  MapPin,
  Users,
  Phone,
  Car,
  Route,
  StopCircle,
  UserPlus,
  UserX,
  ArrowLeft,
  Clock,
} from "lucide-react";

type BusStop = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  orderIndex: number;
  arrivalTime: string | null;
};

type BusRoute = {
  id: string;
  name: string;
  driverName: string | null;
  driverPhone: string | null;
  plateNumber: string | null;
  capacity: number;
  stops: BusStop[];
  _count: { assignments: number };
};

export default function BusTrackingPage() {
  const { currentOrg } = useOrganization();
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showManageStops, setShowManageStops] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [assignStudentId, setAssignStudentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [newRoute, setNewRoute] = useState({
    name: "", driverName: "", driverPhone: "", plateNumber: "", capacity: "30",
  });

  const [stopEditor, setStopEditor] = useState<{ name: string; arrivalTime: string }[]>([]);

  useEffect(() => {
    if (!currentOrg) return;
    loadRoutes();
  }, [currentOrg]);

  async function loadRoutes() {
    try {
      const data = await apiFetch<BusRoute[]>(
        `/${currentOrg!.slug}/bus-routes`,
      );
      setRoutes(data);
    } catch {
      toast.error("Failed to load routes");
    } finally {
      setIsLoading(false);
    }
  }

  async function addRoute() {
    if (!newRoute.name) { toast.error("Route name required"); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/${currentOrg!.slug}/bus-routes`, {
        method: "POST",
        body: JSON.stringify(newRoute),
      });
      toast.success("Route created");
      setShowAddRoute(false);
      setNewRoute({ name: "", driverName: "", driverPhone: "", plateNumber: "", capacity: "30" });
      loadRoutes();
    } catch {} finally {
      setSubmitting(false);
    }
  }

  async function saveStops(routeId: string) {
    setSubmitting(true);
    try {
      await apiFetch(`/${currentOrg!.slug}/bus-routes/${routeId}/stops`, {
        method: "POST",
        body: JSON.stringify({ stops: stopEditor.map((s, i) => ({ ...s, orderIndex: i })) }),
      });
      toast.success("Stops saved");
      setShowManageStops(null);
      loadRoutes();
    } catch {} finally {
      setSubmitting(false);
    }
  }

  async function assignStudent(routeId: string) {
    if (!assignStudentId) { toast.error("Student ID required"); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/${currentOrg!.slug}/bus-routes/${routeId}/assign`, {
        method: "POST",
        body: JSON.stringify({ studentId: assignStudentId }),
      });
      toast.success("Student assigned");
      setShowAssign(null);
      setAssignStudentId("");
      loadRoutes();
    } catch {} finally {
      setSubmitting(false);
    }
  }

  async function unassignStudent(studentId: string) {
    try {
      await apiFetch(`/${currentOrg!.slug}/bus-assignments/${studentId}`, {
        method: "DELETE",
      });
      toast.success("Student unassigned");
      loadRoutes();
    } catch {}
  }

  function openStopEditor(route: BusRoute) {
    setStopEditor(route.stops.map(s => ({ name: s.name, arrivalTime: s.arrivalTime || "" })));
    setShowManageStops(route.id);
  }

  function addStopField() {
    setStopEditor(prev => [...prev, { name: "", arrivalTime: "" }]);
  }

  function removeStopField(index: number) {
    setStopEditor(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bus className="h-6 w-6 text-blue-600" />
            Bus Route Tracking
          </h1>
          <p className="text-sm text-muted-foreground">Manage school bus routes, stops, and student assignments</p>
        </div>
        <Dialog open={showAddRoute} onOpenChange={setShowAddRoute}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" /> Add Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bus Route</DialogTitle>
              <DialogDescription>Create a new school bus route</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Input placeholder="Route name * (e.g. Route A — North Side)" value={newRoute.name} onChange={e => setNewRoute(p => ({ ...p, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Driver name" value={newRoute.driverName} onChange={e => setNewRoute(p => ({ ...p, driverName: e.target.value }))} />
                <Input placeholder="Driver phone" value={newRoute.driverPhone} onChange={e => setNewRoute(p => ({ ...p, driverPhone: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Plate number" value={newRoute.plateNumber} onChange={e => setNewRoute(p => ({ ...p, plateNumber: e.target.value }))} />
                <Input placeholder="Capacity" type="number" value={newRoute.capacity} onChange={e => setNewRoute(p => ({ ...p, capacity: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddRoute(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={addRoute} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Create Route
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2 mb-2" /><Skeleton className="h-3 w-1/3" /></CardContent></Card>
          ))}
        </div>
      ) : routes.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No bus routes yet. Add your first route.</CardContent></Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {routes.map(route => (
            <Card key={route.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Route className="h-5 w-5 text-blue-600" />
                      {route.name}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap gap-2 mt-1">
                      {route.plateNumber && <span className="flex items-center gap-1"><Car className="h-3 w-3" />{route.plateNumber}</span>}
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{route._count.assignments}/{route.capacity}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {route.driverName && (
                  <div className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{route.driverName}</span>
                    {route.driverPhone && (
                      <a href={`tel:${route.driverPhone}`} className="text-blue-600 hover:underline ml-1">
                        <Phone className="h-3 w-3 inline mr-1" />{route.driverPhone}
                      </a>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Stops ({route.stops.length})
                    </span>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => openStopEditor(route)}>
                      Edit Stops
                    </Button>
                  </div>
                  {route.stops.length > 0 ? (
                    <div className="space-y-1">
                      {route.stops.map((stop, idx) => (
                        <div key={stop.id} className="flex items-center gap-2 text-sm py-1">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                            {idx < route.stops.length - 1 && <div className="w-0.5 h-3 bg-gray-300" />}
                          </div>
                          <span className="flex-1">{stop.name}</span>
                          {stop.arrivalTime && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" />{stop.arrivalTime}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No stops defined</p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Dialog open={showAssign === route.id} onOpenChange={o => { setShowAssign(o ? route.id : null); setAssignStudentId(""); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1">
                        <UserPlus className="h-4 w-4 mr-1" /> Assign Student
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Student</DialogTitle>
                        <DialogDescription>Route: {route.name}</DialogDescription>
                      </DialogHeader>
                      <Input placeholder="Student ID" value={assignStudentId} onChange={e => setAssignStudentId(e.target.value)} />
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssign(null)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => assignStudent(route.id)} disabled={submitting}>
                          {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                          Assign
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!showManageStops && !routes.find(r => r.id === showManageStops)?.stops.some(s => false)} onOpenChange={o => { if (!o) setShowManageStops(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Stops</DialogTitle>
            <DialogDescription>{routes.find(r => r.id === showManageStops)?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {stopEditor.map((stop, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  {i < stopEditor.length - 1 && <div className="w-0.5 h-6 bg-gray-300" />}
                </div>
                <Input
                  placeholder="Stop name"
                  value={stop.name}
                  onChange={e => {
                    const copy = [...stopEditor];
                    copy[i] = { ...copy[i], name: e.target.value };
                    setStopEditor(copy);
                  }}
                  className="flex-1"
                />
                <Input
                  placeholder="Time"
                  value={stop.arrivalTime}
                  onChange={e => {
                    const copy = [...stopEditor];
                    copy[i] = { ...copy[i], arrivalTime: e.target.value };
                    setStopEditor(copy);
                  }}
                  className="w-24"
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => removeStopField(i)}>
                  <UserX className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addStopField} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Stop
          </Button>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageStops(null)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => showManageStops && saveStops(showManageStops)} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Stops
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
