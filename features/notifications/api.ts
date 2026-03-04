import { api } from '@/lib/api';

type DeviceType = 'ANDROID' | 'IOS' | 'WEB';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  dataPayload?: string | null;
  deepLink?: string | null;
  imageUrl?: string | null;
  isRead: boolean;
  createdAt: string;
  sentAt?: string | null;
};

export type NotificationPage = {
  content?: NotificationItem[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
};

export async function registerDeviceToken(params: {
  fcmToken: string;
  deviceType: DeviceType;
  deviceName?: string | null;
  osVersion?: string | null;
  appVersion?: string | null;
}) {
  await api.post('/notifications/register-device', params);
}

export async function deactivateDeviceToken(fcmToken: string) {
  await api.post('/notifications/deactivate-device', null, {
    params: { fcmToken },
  });
}

export async function fetchNotifications(params: {
  page: number;
  size: number;
}): Promise<NotificationPage> {
  const { data } = await api.get<NotificationPage>('/notifications', {
    params,
  });
  return data ?? {};
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data } = await api.get<number>('/notifications/unread-count');
  return Number.isFinite(Number(data)) ? Number(data) : 0;
}

export async function markNotificationAsRead(notificationId: string) {
  await api.put(`/notifications/${encodeURIComponent(notificationId)}/read`);
}

export async function markAllNotificationsAsRead() {
  await api.put('/notifications/readAll');
}
