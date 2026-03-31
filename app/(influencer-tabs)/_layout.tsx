import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { getMyApplication } from '@/features/influencer/api';
import type { InfluencerApplication } from '@/features/influencer/types';

const P = '#8D73FF';

const ICON_BY_ROUTE: Record<string, keyof typeof Ionicons.glyphMap> = {
  dashboard: 'home-outline',
  products: 'cube-outline',
  links: 'link-outline',
  earnings: 'wallet-outline',
  'inf-profile': 'person-outline',
};

function InfluencerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
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

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabButton}
          >
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={iconName} size={24} color={focused ? P : '#FFFFFF'} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function InfluencerHeader() {
  const router = useRouter();
  const [profile, setProfile] = useState<InfluencerApplication | null>(null);

  useEffect(() => {
    getMyApplication()
      .then(setProfile)
      .catch(() => {});
  }, []);

  const fullName = profile ? `${profile.name} ${profile.surname}` : '';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
  const photoUrl = profile?.profilePhoto ?? null;

  return (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        <View style={styles.avatar}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <AppText style={styles.avatarText}>{initials || 'I'}</AppText>
          )}
        </View>
        <View>
          <AppText style={styles.headerName} tone="rounded">
            {fullName || 'Influencer'}
          </AppText>
          <AppText style={styles.headerSub} tone="mono">Influencer</AppText>
        </View>
      </View>
      <Pressable onPress={() => router.push('/settings')}>
        <Ionicons name="settings-outline" size={22} color="#1E1E1E" />
      </Pressable>
    </View>
  );
}

export default function InfluencerTabLayout() {
  const { isAuthenticated, isLoading, roles } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/auth" />;

  // INFLUENCER rolü yoksa buraya erişemez
  if (!roles.includes('INFLUENCER')) {
    return <Redirect href="/influencer" />;
  }

  return (
    <Tabs
      tabBar={(props) => <InfluencerTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          headerTitle: () => <InfluencerHeader />,
          headerTitleAlign: 'left',
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          headerTitle: () => <InfluencerHeader />,
          headerTitleAlign: 'left',
        }}
      />
      <Tabs.Screen
        name="links"
        options={{
          headerTitle: () => <InfluencerHeader />,
          headerTitleAlign: 'left',
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          headerTitle: () => <InfluencerHeader />,
          headerTitleAlign: 'left',
        }}
      />
      <Tabs.Screen
        name="inf-profile"
        options={{
          headerTitle: () => <InfluencerHeader />,
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
    backgroundColor: P,
    borderRadius: 50,
    elevation: 0,
    shadowOpacity: 0,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(141,115,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: P,
    fontFamily: Fonts.sans,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1631',
    fontFamily: Fonts.rounded,
  },
  headerSub: {
    fontSize: 10,
    color: '#9A9AA3',
    fontFamily: Fonts.mono,
  },
});
