import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { fetchUnreadNotificationCount } from '@/features/notifications/api';
import { addLocalTicketReplyNotification, getLocalUnreadCount } from '@/features/notifications/local-notifications';
import { fetchSellerTickets } from '@/features/ticketing/api';
import { TicketingItem } from '@/features/ticketing/types';
import { useAppSelector } from '@/store/hooks';

const ICON_BY_ROUTE: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'grid-outline',
  orders: 'receipt-outline',
  products: 'cube-outline',
  messages: 'chatbubbles-outline',
  profile: 'bar-chart-outline',
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { bottom: Math.max(14, insets.bottom + 6) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const iconName = ICON_BY_ROUTE[route.name] ?? 'ellipse-outline';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const accessibilityLabel = descriptors[route.key]?.options?.tabBarAccessibilityLabel;
        const testID = descriptors[route.key]?.options?.tabBarButtonTestID;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={accessibilityLabel}
            testID={testID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}>
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={iconName} size={28} color={focused ? '#8D73FF' : '#FFFFFF'} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}


function TicketReplyNotificationWatcher() {
  const pathname = usePathname();
  const lastSeenByTicketRef = useRef<Record<string, string>>({});
  const initializedRef = useRef(false);

  useEffect(() => {
    let isDisposed = false;

    const run = async () => {
      try {
        const page = await fetchSellerTickets({ page: 0, size: 20 });
        if (isDisposed) return;

        const items = Array.isArray(page.content) ? page.content : [];
        const nextSeen: Record<string, string> = {};

        items.forEach((ticket: TicketingItem) => {
          const lastMessage = ticket.messages.length > 0 ? ticket.messages[ticket.messages.length - 1] : null;
          nextSeen[ticket.id] = lastMessage?.createdAt ?? '';
        });

        if (!initializedRef.current) {
          lastSeenByTicketRef.current = nextSeen;
          initializedRef.current = true;
          return;
        }

        const isOnMessagesScreen = pathname.includes('/messages');
        if (!isOnMessagesScreen) {
          for (const ticket of items) {
            const lastMessage = ticket.messages.length > 0 ? ticket.messages[ticket.messages.length - 1] : null;
            const lastCreatedAt = lastMessage?.createdAt ?? '';
            const prevCreatedAt = lastSeenByTicketRef.current[ticket.id] ?? '';
            const isSupportReply = (lastMessage?.title ?? '').trim().toLowerCase() === 'high level support';

            if (isSupportReply && lastCreatedAt.length > 0 && prevCreatedAt.length > 0 && lastCreatedAt !== prevCreatedAt) {
              await addLocalTicketReplyNotification({
                ticketingId: ticket.id,
                sellerTitle: ticket.sellerTitle ?? 'Destek',
                message: lastMessage?.content ?? '',
                createdAt: lastCreatedAt,
              });

              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Destek talebine yeni yanıt',
                  body: `${ticket.sellerTitle ?? 'Destek'}: ${lastMessage?.content ?? ''}`,
                  data: {
                    deepLink: '/messages',
                    ticketingId: ticket.id,
                  },
                },
                trigger: null,
              });
            }
          }
        }

        lastSeenByTicketRef.current = nextSeen;
      } catch {
        // Silent: ticket polling should never block UI.
      }
    };

    void run();
    const timer = setInterval(() => {
      void run();
    }, 30000);

    return () => {
      isDisposed = true;
      clearInterval(timer);
    };
  }, [pathname]);

  return null;
}

function SellerHeader() {
  const {
    profile: { basicId, logo: sellerLogo, name: sellerName },
  } = useAppSelector((state) => state.seller);
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const [remoteCount, localCount] = await Promise.all([
        fetchUnreadNotificationCount(),
        getLocalUnreadCount(),
      ]);
      setUnreadCount(remoteCount + localCount);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUnreadCount();
    }, [loadUnreadCount])
  );

  const initials = sellerName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <View style={styles.headerRow}>
      <View style={styles.userBlock}>
        <View style={styles.avatar}>
          {sellerLogo ? (
            <Image source={{ uri: sellerLogo }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <AppText style={styles.avatarText}>{initials || 'S'}</AppText>
          )}
        </View>
        <View>
          <AppText style={styles.userName} tone="rounded">
            {sellerName}
          </AppText>
          {basicId ? (
            <AppText style={styles.sellerId} tone="mono">
              {basicId}
            </AppText>
          ) : null}
        </View>
      </View>

      <View style={styles.headerActions}>
        <Pressable onPress={() => router.push('/notifications')} style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#1E1E1E" />
          {unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <AppText style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</AppText>
            </View>
          ) : null}
        </Pressable>
        <Pressable onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color="#1E1E1E" />
        </Pressable>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading, roles } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  // Influencer (onaylı veya bekleyen) ama satıcı değilse satıcı paneline erişemez
  const isInfluencer = roles.includes('INFLUENCER') || roles.includes('WITHOUT_APPROVAL_INFLUENCER');
  const isSeller = roles.includes('SELLER') || roles.includes('SUPER_ADMIN');
  if (isInfluencer && !isSeller) {
    if (roles.includes('INFLUENCER')) {
      return <Redirect href="/(influencer-tabs)/dashboard" />;
    }
    return <Redirect href="/influencer/status" />;
  }

  // Onaylanmamış satıcı tabları göremez, onboarding ekranına yönlendir
  if (
    roles.includes('WITHOUT_APPROVAL_SELLER') &&
    !roles.includes('SELLER') &&
    !roles.includes('SUPER_ADMIN')
  ) {
    return <Redirect href="/seller-profile" />;
  }

  return (
    <>
      <TicketReplyNotificationWatcher />
      <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <SellerHeader />,
          headerTitleAlign: 'left',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          headerTitle: () => <SellerHeader />,
          headerTitleAlign: 'left',
        }}
      />
      <Tabs.Screen name="products" 
      options={{
          title: 'Raporlar',
          headerTitle: () => <SellerHeader />,
          headerTitleAlign: 'left',
        }}
      />
      <Tabs.Screen name="messages" 
      options={{
          title: 'Raporlar',
          headerTitle: () => <SellerHeader />,
          headerTitleAlign: 'left',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Raporlar',
          headerTitle: () => <SellerHeader />,
          headerTitleAlign: 'left',
        }}
      />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 62,
    backgroundColor: '#8D73FF',
    borderRadius: 50,
    elevation: 0,
    shadowOpacity: 0,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 45,
    height: 45,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconWrapActive: {
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 17,
    backgroundColor: '#F0C4A8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F1F1F',
    fontFamily: Fonts.sans,
  },
  userName: {
    fontSize: 14,
    color: '#151515',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  sellerId: {
    fontSize: 10,
    color: '#9A9AA3',
    fontFamily: Fonts.mono,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 18,
  },
  notificationButton: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#D7263D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
});
