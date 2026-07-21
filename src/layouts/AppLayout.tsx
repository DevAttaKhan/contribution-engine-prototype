import { Bell, RotateCcw, Wallet } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { formatDateTime } from "../lib/format";
import {
  getNotifications,
  getUnreadNotificationCount,
  useContributionStore,
} from "../store";
import { Badge, Button, Card, CardContent, CardHeader } from "../components/ui";

export const AppLayout = () => {
  const { state, dispatch, resetDemo } = useContributionStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = getNotifications(state);
  const unreadCount = getUnreadNotificationCount(state);

  const handleMarkAllRead = () => {
    dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link className="flex items-center gap-3" to="/">
            <div className="rounded-xl bg-primary-600 p-2 text-white">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
                Demo Prototype
              </p>
              <h1 className="text-lg font-bold text-slate-900">
                Contribution Engine
              </h1>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <NavLink
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
              to="/"
            >
              Bookings
            </NavLink>
            <Button
              aria-label="Open notifications"
              onClick={() => setNotificationsOpen((open) => !open)}
              variant="secondary"
            >
              <Bell className="h-4 w-4" />
              Notifications
              {unreadCount > 0 ? (
                <Badge className="ml-1" variant="info">
                  {unreadCount}
                </Badge>
              ) : null}
            </Button>
            <Button onClick={resetDemo} variant="ghost">
              <RotateCcw className="h-4 w-4" />
              Reset demo
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      {notificationsOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            aria-label="Close notifications"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setNotificationsOpen(false)}
            type="button"
          />
          <Card className="relative z-10 h-full w-full max-w-md overflow-hidden rounded-none border-y-0 border-r-0">
            <CardHeader className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Notifications
                </h2>
                <p className="text-sm text-slate-500">
                  Simulated invitations, reminders, and receipts
                </p>
              </div>
              <Button onClick={handleMarkAllRead} size="sm" variant="ghost">
                Mark all read
              </Button>
            </CardHeader>
            <CardContent className="max-h-[calc(100vh-5rem)] space-y-3 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500">No notifications yet.</p>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    className={`w-full rounded-xl border p-4 text-left transition hover:bg-slate-50 ${
                      notification.read
                        ? "border-slate-200 bg-white"
                        : "border-primary-200 bg-primary-50"
                    }`}
                    onClick={() =>
                      dispatch({
                        type: "MARK_NOTIFICATION_READ",
                        payload: { notificationId: notification.id },
                      })
                    }
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="info">{notification.type}</Badge>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(notification.sentAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {notification.recipient}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {notification.message}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
