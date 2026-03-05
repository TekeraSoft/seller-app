import AsyncStorage from '@react-native-async-storage/async-storage';

import { NotificationItem } from '@/features/notifications/api';

type LocalNotificationItem = NotificationItem & {
  localOnly?: boolean;
};

const LOCAL_NOTIFICATIONS_KEY = 'local_ticket_reply_notifications';
const MAX_LOCAL_NOTIFICATIONS = 100;

async function readAll(): Promise<LocalNotificationItem[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object') as LocalNotificationItem[];
  } catch {
    return [];
  }
}

async function writeAll(items: LocalNotificationItem[]) {
  await AsyncStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, MAX_LOCAL_NOTIFICATIONS)));
}

export async function addLocalTicketReplyNotification(params: {
  ticketingId: string;
  sellerTitle: string;
  message: string;
  createdAt: string;
}) {
  const items = await readAll();
  const dedupe = items.some((item) => {
    if (item.type !== 'LOCAL_TICKET_REPLY') return false;
    const payload = item.dataPayload ? safeJsonParse(item.dataPayload) : null;
    return (
      payload?.ticketingId === params.ticketingId &&
      payload?.createdAt === params.createdAt
    );
  });
  if (dedupe) return;

  const notification: LocalNotificationItem = {
    id: `local-ticket-${params.ticketingId}-${Date.now()}`,
    type: 'LOCAL_TICKET_REPLY',
    title: 'Destek talebine yeni yanıt',
    body: `${params.sellerTitle}: ${params.message}`,
    deepLink: '/messages',
    dataPayload: JSON.stringify({ ticketingId: params.ticketingId, createdAt: params.createdAt }),
    imageUrl: null,
    isRead: false,
    createdAt: params.createdAt,
    sentAt: params.createdAt,
    localOnly: true,
  };

  await writeAll([notification, ...items]);
}

export async function getLocalNotifications(): Promise<LocalNotificationItem[]> {
  const items = await readAll();
  return items.sort((a, b) => {
    const ta = new Date(a.createdAt || a.sentAt || '').getTime();
    const tb = new Date(b.createdAt || b.sentAt || '').getTime();
    return tb - ta;
  });
}

export async function getLocalUnreadCount(): Promise<number> {
  const items = await readAll();
  return items.filter((item) => !item.isRead).length;
}

export async function markLocalNotificationAsRead(notificationId: string) {
  const items = await readAll();
  const next = items.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item));
  await writeAll(next);
}

export async function markAllLocalNotificationsAsRead() {
  const items = await readAll();
  await writeAll(items.map((item) => ({ ...item, isRead: true })));
}

function safeJsonParse(value: string): Record<string, string> | null {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, string>;
    }
    return null;
  } catch {
    return null;
  }
}
