"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, MailOpen, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityHeader, TableContainer } from "@/components/dashboard/shared";

type Invite = {
  id: string;
  email: string;
  role: string;
  accepted: boolean;
  createdAt?: string;
  expiresAt?: string;
  status?: string;
};

function getInviteStatus(invite: Invite) {
  if (invite.status) return invite.status;
  if (invite.accepted) return "accepted";
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    return "expired";
  }
  return "pending";
}

export default function InvitesPage() {
  const { currentOrg, currentMember } = useOrganization();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Only owners and admins should see/manage invites
  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  useEffect(() => {
    async function fetchInvites() {
      if (!currentOrg || !isPrivileged) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const data = await apiFetch<Invite[]>(
          `/admin/invite/pending/${currentOrg.slug}`,
        );
        setInvites(data);
      } catch {
        toast.error("Failed to load invitations");
      } finally {
        setIsLoading(false);
      }
    }
    fetchInvites();
  }, [currentOrg, isPrivileged]);

  const handleRevoke = async (inviteId: string) => {
    if (!currentOrg) return;
    if (!confirm("Are you sure you want to revoke this invitation?")) return;

    try {
      await apiFetch(`/admin/invite/${inviteId}`, { method: "DELETE" });
      setInvites((currentInvites) =>
        currentInvites.filter((invite) => invite.id !== inviteId),
      );
      toast.success("Invitation revoked successfully");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke invitation";

      toast.error(message);
    }
  };

  if (!isPrivileged && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="bg-slate-100 p-4 rounded-full">
          <ShieldAlert className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <h2 className="text-base sm:text-xl font-semibold text-slate-900">
            Access Denied
          </h2>
          <p className="text-slate-500 mt-2 max-w-[384px]">
            You do not have permission to view or manage invitations. Only
            administrators and owners have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title="Pending Invitations"
        subtitle="Manage outgoing invitations for new teachers and parents."
      />

      {/* Mobile Card View */}
      <div className="space-y-3 block md:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <Skeleton className="h-5 w-[200px]" />
              <Skeleton className="h-5 w-[100px] rounded-full" />
            </div>
          ))
        ) : invites.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-100">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <MailOpen className="h-10 w-10 mb-4 text-slate-300" />
              <p>No pending invitations.</p>
              <p className="text-sm">
                Invitations you send from the Teachers or Parents page will
                appear here.
              </p>
            </div>
          </div>
        ) : (
          invites.map((invite) => {
            const status = getInviteStatus(invite);
            return (
              <div key={invite.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{invite.email}</p>
                    <p className="text-xs text-slate-500 capitalize mt-0.5">{invite.role}</p>
                  </div>
                  {status === "pending" ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 flex w-fit items-center shrink-0"
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0"
                    >
                      {status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Sent {format(new Date(invite.createdAt || Date.now()), "MMM d, yyyy")}
                  </span>
                  {status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8"
                      onClick={() => handleRevoke(invite.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
      <TableContainer>
        <Table className="min-w-[760px]">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent Date</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[80px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[100px] rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[120px]" />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <MailOpen className="h-10 w-10 mb-4 text-slate-300" />
                    <p>No pending invitations.</p>
                    <p className="text-sm">
                      Invitations you send from the Teachers or Parents page
                      will appear here.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite) => {
                const status = getInviteStatus(invite);

                return (
                  <TableRow key={invite.id}>
                    <TableCell className="min-w-[280px] font-medium text-slate-900">
                      {invite.email}
                    </TableCell>
                    <TableCell className="min-w-[100px] capitalize text-slate-600">
                      {invite.role}
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      {status === "pending" ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 flex w-fit items-center"
                        >
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          {status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[140px] text-slate-600 text-sm">
                      {format(
                        new Date(invite.createdAt || Date.now()),
                        "MMM d, yyyy",
                      )}
                    </TableCell>
                    <TableCell align="right" className="min-w-[100px]">
                      {status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8"
                          onClick={() => handleRevoke(invite.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </div>
    </div>
  );
}
