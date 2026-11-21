"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useNotifications,
  NotificationItem,
  AttentionItem,
} from "@/hooks/useNotifications";
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
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Megaphone,
  CreditCard,
  GraduationCap,
  UserPlus,
  Inbox,
  AlertCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getNotificationIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "low-score":
      return <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />;
    case "academic":
    case "result":
      return <GraduationCap className="h-4 w-4 text-emerald-700" aria-hidden="true" />;
    case "billing":
    case "fee":
      return <CreditCard className="h-4 w-4 text-amber-700" aria-hidden="true" />;
    case "announcement":
      return <Megaphone className="h-4 w-4 text-[#1447E6]" aria-hidden="true" />;
    case "homework":
      return <FileText className="h-4 w-4 text-[#1447E6]" aria-hidden="true" />;
    case "attendance":
      return <ClipboardCheck className="h-4 w-4 text-amber-800" aria-hidden="true" />;
    case "invites":
      return <UserPlus className="h-4 w-4 text-amber-800" aria-hidden="true" />;
    case "admissions":
      return <GraduationCap className="h-4 w-4 text-amber-800" aria-hidden="true" />;
    default:
      return <AlertCircle className="h-4 w-4 text-slate-600" aria-hidden="true" />;
  }
}

function getIconBg(type: string) {
  switch (type?.toLowerCase()) {
    case "low-score":
      return "bg-red-50 border-red-200";
    case "academic":
    case "result":
      return "bg-emerald-50 border-emerald-200";
    case "billing":
    case "fee":
      return "bg-amber-50 border-amber-200";
    case "announcement":
    case "homework":
      return "bg-[#EEF0FF] border-blue-200";
    case "attendance":
    case "invites":
    case "admissions":
      return "bg-white border-amber-200";
    default:
      return "bg-slate-50 border-slate-200";
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

/**
 * Things still to do are kept visually apart from things that already
 * happened. An unread alert is information; an unmarked register is a job,
 * and the only useful thing to do with it is open the page that fixes it.
 */
function AttentionCard({ item, onNavigate }: { item: AttentionItem; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="group flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 transition-colors hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
    >
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
          getIconBg(item.type),
        )}
      >
        {getNotificationIcon(item.type)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-snug text-slate-900">
          {item.title}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
          {item.message}
        </span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-amber-700/60 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function NotificationSheet({ triggerClassName }: { triggerClassName?: string } = {}) {
  const {
    notifications,
    attention,
    unreadCount,
    unreadNotificationsCount,
    badgeCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void refresh();
    }
  };

  const effectiveUnreadNotifications =
    unreadNotificationsCount ?? unreadCount;
  const allCount = notifications.length + attention.length;
  const unreadCountTotal = badgeCount;

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const openNotification = (item: NotificationItem) => {
    if (!item.read) markAsRead(item.id);
    if (item.href) {
      setOpen(false);
      router.push(item.href);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        aria-label={
          badgeCount > 0 ? `Notifications, ${badgeCount} need attention` : "Notifications"
        }
        className={`relative flex h-9 w-9 pointer-coarse:h-11 pointer-coarse:w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none cursor-pointer ${triggerClassName ?? ""}`}
      >
        <Bell className="h-4 w-4 text-slate-700" />
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex h-dvh w-full flex-col gap-0 bg-slate-50 p-0 sm:max-w-md max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:left-0 max-md:right-0 max-md:h-auto max-md:max-h-[92dvh] max-md:rounded-t-3xl max-md:border-l-0 max-md:border-t max-md:pt-0 max-md:pb-safe"
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-2.5 hidden h-1 w-10 shrink-0 rounded-full bg-slate-300 max-md:block"
        />
        <SheetHeader className="shrink-0 space-y-3 border-b border-slate-200/80 bg-white px-5 pb-4 pt-4 pr-14 sm:pt-5">
          {/* Row 1: Title + Badge */}
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg font-bold text-[#0B1220]">
              Notifications
            </SheetTitle>
            {unreadCountTotal > 0 && (
              <Badge className="rounded-full border-blue-200 bg-[#EEF0FF] px-2.5 py-0.5 text-xs font-bold text-[#1447E6] hover:bg-[#EEF0FF] tabular-nums">
                {unreadCountTotal} unread
              </Badge>
            )}
          </div>

          {/* Row 2: Sub-action underneath */}
          {effectiveUnreadNotifications > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600">Recent updates</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="px-2.5 text-xs font-semibold text-[#1447E6] hover:bg-[#EEF0FF] hover:text-blue-800"
              >
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Mark all as read
              </Button>
            </div>
          )}
          <SheetDescription className="sr-only">
            Things that need your attention, plus your recent notifications and alerts.
          </SheetDescription>

          {/* Filter Tabs */}
          <div role="tablist" aria-label="Filter notifications" className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "all"}
              onClick={() => setActiveTab("all")}
              className={cn(
                "flex-1 rounded-lg py-2 text-center transition-all max-md:min-h-11 pointer-coarse:min-h-11",
                activeTab === "all"
                  ? "bg-white font-bold text-[#0B1220] shadow-xs"
                  : "text-slate-600 hover:text-[#0B1220]",
              )}
            >
              All ({allCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "unread"}
              onClick={() => setActiveTab("unread")}
              className={cn(
                "flex-1 rounded-lg py-2 text-center transition-all max-md:min-h-11 pointer-coarse:min-h-11",
                activeTab === "unread"
                  ? "bg-white font-bold text-[#0B1220] shadow-xs"
                  : "text-slate-600 hover:text-[#0B1220]",
              )}
            >
              Unread ({unreadCountTotal})
            </button>
          </div>
        </SheetHeader>

        {/* Content Body */}
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
          {loading ? (
            <div className="space-y-3 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              {attention.length > 0 && (
                <section aria-label="Needs your attention" className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Needs your attention
                    </h3>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-amber-800">
                      {attention.length}
                    </span>
                  </div>
                  {attention.map((item) => (
                    <AttentionCard
                      key={item.id}
                      item={item}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </section>
              )}

              {filteredNotifications.length === 0 ? (
                attention.length > 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
                    <p className="text-xs font-semibold text-slate-700">
                      {activeTab === "unread"
                        ? "No unread notifications"
                        : "No other notifications"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {activeTab === "unread"
                        ? "All regular notifications have been read."
                        : "You're all caught up with alerts."}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-xs">
                      <Inbox className="h-7 w-7 text-slate-500" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-bold text-[#0B1220]">
                      {activeTab === "unread"
                        ? "No unread notifications"
                        : "You're all caught up"}
                    </h3>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-600">
                      {activeTab === "unread"
                        ? "You have read all your notifications."
                        : "New alerts and results will show up here."}
                    </p>
                  </div>
                )
              ) : (
                <div className="space-y-2.5">
                  {filteredNotifications.map((item: NotificationItem) => (
                    <div
                      key={item.id}
                      className={cn(
                        "group relative flex items-start gap-2 rounded-2xl border p-3.5 transition-colors",
                        item.read
                          ? "border-slate-200/80 bg-white/80"
                          : "border-blue-200 bg-white shadow-xs",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openNotification(item)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1447E6] focus-visible:ring-offset-2 rounded-xl"
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                            getIconBg(item.type),
                          )}
                        >
                          {getNotificationIcon(item.type)}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <p
                              className={cn(
                                "text-sm font-bold leading-snug",
                                item.read ? "text-slate-700" : "text-[#0B1220]",
                              )}
                            >
                              {item.title}
                            </p>
                            {item.href && (
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                            )}
                          </div>
                          <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                            {item.message}
                          </p>
                          <p className="pt-0.5 text-xs font-medium text-slate-500">
                            {formatRelativeTime(item.createdAt)}
                          </p>
                        </div>
                      </button>

                      {!item.read && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            title="Mark as read"
                            aria-label={`Mark "${item.title}" as read`}
                            onClick={() => markAsRead(item.id)}
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-[#EEF0FF] hover:text-[#1447E6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1447E6] md:pointer-fine:h-8 md:pointer-fine:w-8 cursor-pointer"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#1447E6]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
