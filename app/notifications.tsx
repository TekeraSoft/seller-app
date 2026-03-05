import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationItem,
} from '@/features/notifications/api';
import {
  getLocalNotifications,
  markAllLocalNotificationsAsRead,
  markLocalNotificationAsRead,
} from '@/features/notifications/local-notifications';
import { findSellerOrderIdByOrderNo } from '@/features/orders/api';

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const loadNotifications = useCallback(
    async (nextPage: number, refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else if (nextPage === 0 && items.length === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const [response, localItems] = await Promise.all([
          fetchNotifications({ page: nextPage, size }),
          nextPage === 0 ? getLocalNotifications() : Promise.resolve([]),
        ]);
        const incomingRemote = Array.isArray(response.content) ? response.content : [];
        const incoming =
          nextPage === 0
            ? [...localItems, ...incomingRemote].sort((a, b) => {
                const ta = new Date(a.createdAt || a.sentAt || '').getTime();
                const tb = new Date(b.createdAt || b.sentAt || '').getTime();
                return tb - ta;
              })
            : incomingRemote;

        setItems((prev) => (nextPage === 0 ? incoming : [...prev, ...incoming]));
        setPage(nextPage);
        const totalPages = Number(response.totalPages ?? 0);
        if (totalPages > 0) {
          setHasMore(nextPage + 1 < totalPages);
        } else {
          setHasMore(incoming.length >= size);
        }
      } catch {
        setError('Bildirimler alınamadı.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [items.length, size]
  );

  useFocusEffect(
    useCallback(() => {
      void loadNotifications(0, false);
    }, [loadNotifications])
  );

  const openNotificationTarget = useCallback(
    async (item: NotificationItem) => {
      if (!item.isRead) {
        try {
          if (item.type === 'LOCAL_TICKET_REPLY') {
            await markLocalNotificationAsRead(item.id);
          } else {
            await markNotificationAsRead(item.id);
          }
          setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
        } catch {
          // Keep UX flow even if read mark fails.
        }
      }

      const deepLink = item.deepLink ?? '';
      if (deepLink.includes('/messages')) {
        router.push('/messages');
        return;
      }
      const matchedSellerOrderId = deepLink.match(/\/seller\/orders\/([^/]+)/i)?.[1] ?? null;
      if (matchedSellerOrderId) {
        router.push({ pathname: '/order/[id]', params: { id: matchedSellerOrderId } });
        return;
      }

      const dataPayload = item.dataPayload ? safeJsonParse(item.dataPayload) : null;
      const sellerOrderId =
        (typeof dataPayload?.sellerOrderId === 'string' && dataPayload.sellerOrderId) ||
        (typeof dataPayload?.seller_order_id === 'string' && dataPayload.seller_order_id) ||
        '';
      if (sellerOrderId.trim().length > 0) {
        router.push({ pathname: '/order/[id]', params: { id: sellerOrderId.trim() } });
        return;
      }

      const orderNo = (typeof dataPayload?.orderNo === 'string' && dataPayload.orderNo) || '';
      if (orderNo.trim().length > 0) {
        try {
          const sellerOrderIdByOrderNo = await findSellerOrderIdByOrderNo(orderNo.trim());
          if (sellerOrderIdByOrderNo) {
            router.push({ pathname: '/order/[id]', params: { id: sellerOrderIdByOrderNo } });
            return;
          }
        } catch {
          // fallback below
        }
      }

      router.push('/orders');
    },
    [router]
  );

  const markAllRead = useCallback(async () => {
    try {
      setIsMarkingAll(true);
      await Promise.all([markAllNotificationsAsRead(), markAllLocalNotificationsAsRead()]);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setIsMarkingAll(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.headerRow}>
        <AppText style={styles.title} tone="rounded">
          Bildirimler
        </AppText>
        <Pressable style={styles.markAllButton} onPress={() => void markAllRead()} disabled={isMarkingAll}>
          {isMarkingAll ? (
            <ActivityIndicator color="#5E4BCE" />
          ) : (
            <AppText style={styles.markAllText}>Tümünü Okundu Yap</AppText>
          )}
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <AppText style={styles.errorText}>{error}</AppText>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.isRead && styles.unreadCard]}
            onPress={() => void openNotificationTarget(item)}>
            <View style={styles.cardTop}>
              <AppText style={styles.cardTitle}>{item.title}</AppText>
              {!item.isRead ? <View style={styles.unreadDot} /> : null}
            </View>
            <AppText style={styles.cardBody}>{item.body}</AppText>
            <View style={styles.cardMeta}>
              <Ionicons name="time-outline" size={12} color="#8F8F98" />
              <AppText style={styles.cardTime}>{formatDate(item.createdAt || item.sentAt)}</AppText>
            </View>
          </Pressable>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void loadNotifications(0, true)} tintColor="#7F67FF" />
        }
        onEndReachedThreshold={0.35}
        onEndReached={() => {
          if (!isLoading && !isRefreshing && !isLoadingMore && hasMore) {
            void loadNotifications(page + 1, false);
          }
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color="#7F67FF" />
              <AppText style={styles.emptyText}>Bildirimler yükleniyor...</AppText>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <AppText style={styles.emptyText}>Henüz bildirimin yok.</AppText>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#7F67FF" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function safeJsonParse(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EFEFF2',
  },
  headerRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    color: '#141414',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  markAllButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8D3FF',
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllText: {
    color: '#5E4BCE',
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  errorBox: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFECEC',
    borderWidth: 1,
    borderColor: '#FFCDCD',
  },
  errorText: {
    color: '#A93535',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEF',
    padding: 10,
    gap: 6,
  },
  unreadCard: {
    borderColor: '#CFC5FF',
    backgroundColor: '#FBFAFF',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    color: '#17171B',
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#6D57F2',
  },
  cardBody: {
    fontSize: 12,
    color: '#4A4A54',
    fontFamily: Fonts.sans,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTime: {
    fontSize: 10,
    color: '#8F8F98',
    fontFamily: Fonts.sans,
  },
  emptyWrap: {
    paddingVertical: 42,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: '#6C6C74',
    fontSize: 13,
    fontFamily: Fonts.sans,
  },
  footerLoader: {
    paddingVertical: 14,
  },
});
