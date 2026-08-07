import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { EmptyState } from "../components/shared/EmptyState";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { loadNotifications, markNotificationRead, type NotificationItem } from "../lib/notificationsStorage";

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    setNotifications(loadNotifications());

    const handleNotificationsUpdated = () => setNotifications(loadNotifications());
    window.addEventListener("inventra:notifications-updated", handleNotificationsUpdated);

    return () => window.removeEventListener("inventra:notifications-updated", handleNotificationsUpdated);
  }, []);

  if (!notifications.length) {
    return <EmptyState title="No Notifications" description="Inventory, shipment, and delivery alerts will appear here." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Notifications</h2>
          <p className="text-sm text-slate-500">Delivery updates and order alerts are saved here.</p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((item) => (
          <Card key={item.id} className={!item.is_read ? "border-teal-300" : ""}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <CheckCircle2 className="h-4 w-4 text-teal-500" /> {item.title}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
              </div>
              {!item.is_read ? (
                <Button size="sm" variant="outline" onClick={() => { markNotificationRead(item.id); setNotifications(loadNotifications()); }}>
                  Mark read
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
