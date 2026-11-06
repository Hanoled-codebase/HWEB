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
    case "attendance":
      return <ClipboardCheck className="h-4 w-4 text-amber-700" />;
    case "invites":
      return <UserPlus className="h-4 w-4 text-amber-700" />;
    case "admissions":
      return <GraduationCap className="h-4 w-4 text-amber-700" />;
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
    case "attendance":
    case "invites":
    case "admissions":
      return "bg-white border-amber-200";
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
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [open, setOpen] = useState(false);

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
    <Sheet open={open} onOpenChange={setOpen}>
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
        className="w-full sm:max-w-md p-0 flex flex-col h-full bg-slate-50/50"
      >
        <SheetHeader className="p-5 pr-10 bg-white border-b border-slate-100 flex-shrink-0 space-y-3">
          {/* Row 1: Title + Badge */}
          <div className="flex items-center gap-2 pr-6">
            <SheetTitle className="text-lg font-bold text-slate-900">
              Notifications
            </SheetTitle>
            {unreadCountTotal > 0 && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 font-bold px-2 py-0.5 text-xs rounded-full">
                {unreadCountTotal} unread
              </Badge>
            )}
          </div>

          {/* Row 2: Sub-action underneath */}
          {effectiveUnreadNotifications > 0 && (
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
            Things that need your attention, plus your recent notifications and alerts.
          </SheetDescription>

          {/* Filter Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "flex-1 py-1.5 rounded-lg transition-all text-center",
                activeTab === "all"
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              All ({allCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={cn(
                "flex-1 py-1.5 rounded-lg transition-all text-center",
                activeTab === "unread"
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              Unread ({unreadCountTotal})
            </button>
          </div>
        </SheetHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Needs your attention
                    </h3>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
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
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 py-6 text-center px-4">
                    <p className="text-xs font-semibold text-slate-600">
                      {activeTab === "unread"
                        ? "No unread notifications"
                        : "No other notifications"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {activeTab === "unread"
                        ? "All regular notifications have been read."
                        : "You're all caught up with alerts."}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm mb-3">
                      <Inbox className="h-7 w-7 text-slate-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {activeTab === "unread"
                        ? "No unread notifications"
                        : "You're all caught up"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                      {activeTab === "unread"
                        ? "You have read all your notifications."
                        : "New alerts and results will show up here."}
                    </p>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((item: NotificationItem) => (
                    <div
                      key={item.id}
                      onClick={() => openNotification(item)}
                      role={item.href ? "link" : undefined}
                      tabIndex={item.href ? 0 : undefined}
                      onKeyDown={(event) => {
                        if (item.href && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          openNotification(item);
                        }
                      }}
                      className={cn(
                        "group relative flex items-start gap-3.5 rounded-2xl p-4 transition-all border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2",
                        item.read
                          ? "bg-white/60 border-slate-200/60 hover:border-slate-300 opacity-90"
                          : "bg-white border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200",
                      )}
                    >
                      {!item.read && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Mark as read"
                            aria-label="Mark as read"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(item.id);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <span className="h-2 w-2 rounded-full bg-blue-600" />
                        </div>
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
                        <div className="flex items-center gap-2 pr-10">
                          <p
                            className={cn(
                              "text-sm font-bold leading-snug",
                              item.read ? "text-slate-700" : "text-slate-900",
                            )}
                          >
                            {item.title}
                          </p>
                          {item.href && (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {item.message}
                        </p>
                        <p className="text-xs font-medium text-slate-500 pt-1">
                          {formatRelativeTime(item.createdAt)}
                        </p>
                      </div>
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
