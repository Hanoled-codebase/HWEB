"use client";

import { useState } from "react";
import { useNotifications, NotificationItem } from "@/hooks/useNotifications";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  CheckCheck,
  Megaphone,
  CreditCard,
  GraduationCap,
  Zap,
  Inbox,
  AlertCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getNotificationIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "academic":
    case "low-score":
    case "result":
      return <GraduationCap className="h-4 w-4 text-emerald-600" />;
    case "billing":
    case "fee":
      return <CreditCard className="h-4 w-4 text-amber-600" />;
    case "announcement":
      return <Megaphone className="h-4 w-4 text-blue-600" />;
    case "homework":
      return <FileText className="h-4 w-4 text-purple-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-slate-500" />;
  }
}

function getIconBg(type: string) {
  switch (type?.toLowerCase()) {
    case "academic":
    case "low-score":
    case "result":
      return "bg-emerald-50 border-emerald-100";
    case "billing":
    case "fee":
      return "bg-amber-50 border-amber-100";
    case "announcement":
      return "bg-blue-50 border-blue-100";
    case "homework":
      return "bg-purple-50 border-purple-100";
    default:
      return "bg-slate-50 border-slate-100";
  }
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return "recently";
  const date = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function NotificationSheet({ triggerClassName }: { triggerClassName?: string } = {}) {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    seedSampleNotifications,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [open, setOpen] = useState(false);

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Notifications"
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none cursor-pointer ${triggerClassName ?? ""}`}
      >
        <Bell className="h-4 w-4 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full bg-slate-50/50"
      >
        <SheetHeader className="p-5 pr-10 bg-white border-b border-slate-100 flex-shrink-0 space-y-3">
          {/* Row 1: Title + Badge */}
          <div className="flex items-center gap-2 pr-6">
            <SheetTitle className="text-lg font-bold text-slate-900">
              Notifications
            </SheetTitle>
            {unreadCount > 0 && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 font-bold px-2 py-0.5 text-xs rounded-full">
                {unreadCount} unread
              </Badge>
            )}
          </div>

          {/* Row 2: Sub-action underneath */}
          {unreadCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Recent updates</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold"
              >
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                Mark all as read
              </Button>
            </div>
          )}
          <SheetDescription className="sr-only">
            View and manage your recent notifications and alerts.
          </SheetDescription>

          {/* Filter Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "flex-1 py-1.5 rounded-lg transition-all text-center",
                activeTab === "all"
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={cn(
                "flex-1 py-1.5 rounded-lg transition-all text-center",
                activeTab === "unread"
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </SheetHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="space-y-3 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm mb-3">
                <Inbox className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {activeTab === "unread"
                  ? "No unread notifications"
                  : "No notifications yet"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                {activeTab === "unread"
                  ? "You have read all your notifications."
                  : "Important updates, fee alerts, and results will appear here."}
              </p>

              {notifications.length === 0 && (
                <Button
                  onClick={seedSampleNotifications}
                  variant="outline"
                  size="sm"
                  className="mt-5 rounded-xl border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-sm"
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                  Load Sample Notifications
                </Button>
              )}
            </div>
          ) : (
            filteredNotifications.map((item: NotificationItem) => (
              <div
                key={item.id}
                onClick={() => !item.read && markAsRead(item.id)}
                className={cn(
                  "group relative flex items-start gap-3.5 rounded-2xl p-4 transition-all border cursor-pointer",
                  item.read
                    ? "bg-white/60 border-slate-200/60 hover:border-slate-300 opacity-90"
                    : "bg-white border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200",
                )}
              >
                {!item.read && (
                  <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-600" />
                )}

                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border mt-0.5",
                    getIconBg(item.type),
                  )}
                >
                  {getNotificationIcon(item.type)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between pr-4">
                    <p
                      className={cn(
                        "text-sm font-bold leading-snug",
                        item.read ? "text-slate-700" : "text-slate-900",
                      )}
                    >
                      {item.title}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {item.message}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 pt-1">
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
