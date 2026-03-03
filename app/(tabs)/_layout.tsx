import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAppSelector } from '@/store/hooks';

const ICON_BY_ROUTE: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'grid-outline',
  orders: 'receipt-outline',
  products: 'cube-outline',
  messages: 'chatbubble-outline',
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
              <Ionicons name={iconName} size={28} color={focused ?  '#8D73FF':'#FFFFFF'} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function SellerHeader() {
  const {
    profile: { basicId, logo: sellerLogo, name: sellerName },
  } = useAppSelector((state) => state.seller);
  const router = useRouter();

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
          {basicId ? <AppText style={styles.sellerId} tone="mono">Basic ID: {basicId}</AppText> : null}
        </View>
      </View>

      <View style={styles.headerActions}>
        <Pressable >
          <Ionicons name="search" size={24} color="#1E1E1E" />
        </Pressable>
        <Pressable onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color="#1E1E1E" />
        </Pressable>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  return (
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
      <Tabs.Screen name="products" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Raporlar',
          headerTitle: () => <SellerHeader />,
          headerTitleAlign: 'left',
        }}
      />
    </Tabs>
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
  }
});

