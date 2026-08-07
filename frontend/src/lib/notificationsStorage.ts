export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
};

const NOTIFICATIONS_STORAGE_KEY = "inventra_notifications";
const APP_SETTINGS_KEY = "inventra_settings";

function parseJsonArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function loadNotifications(): NotificationItem[] {
  return parseJsonArray<NotificationItem>(window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY));
}

export function saveNotifications(notifications: NotificationItem[]) {
  window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

export function isNotificationsEnabled() {
  const raw = window.localStorage.getItem(APP_SETTINGS_KEY);
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.notificationsEnabled ?? true;
  } catch {
    return true;
  }
}

export function saveNotification(notification: NotificationItem) {
  if (!isNotificationsEnabled()) return;
  const current = loadNotifications();
  saveNotifications([notification, ...current]);
  window.dispatchEvent(new CustomEvent("inventra:notifications-updated"));
}

export function notifyOrderDelivered(orderId: string) {
  saveNotification({
    id: crypto.randomUUID(),
    title: `📦 Order ${orderId} has been delivered.`,
    message: "Marked as delivered and moved to Order History.",
    notification_type: "delivery",
    is_read: false,
    created_at: new Date().toISOString(),
  });
}

export function markNotificationRead(id: string) {
  const current = loadNotifications();
  const next = current.map((item) => (item.id === id ? { ...item, is_read: true } : item));
  saveNotifications(next);
  window.dispatchEvent(new CustomEvent("inventra:notifications-updated"));
}

export function getUnreadCount() {
  return loadNotifications().filter((item) => !item.is_read).length;
}
