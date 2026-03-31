import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { getInfluencerDashboard, InfluencerDashboardDto } from '@/features/influencer/api';

const P = '#8D73FF';

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
};

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIconBg, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <AppText style={s.statValue} tone="rounded">{value}</AppText>
      <AppText style={s.statLabel}>{label}</AppText>
    </View>
  );
}


export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stats, setStats] = useState<InfluencerDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getInfluencerDashboard()
        .then(setStats)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Karşılama */}
      <View style={s.welcomeCard}>
        <View style={s.welcomeContent}>
          <AppText style={s.welcomeTitle} tone="rounded">Hoşgeldiniz!</AppText>
          <AppText style={s.welcomeSubtitle}>
            İnfluencer panelinize hoşgeldiniz. Buradan referans linklerinizi yönetebilir ve kazançlarınızı takip edebilirsiniz.
          </AppText>
        </View>
        <View style={s.welcomeIconWrap}>
          <Ionicons name="sparkles" size={48} color="rgba(255,255,255,0.3)" />
        </View>
      </View>

      {/* Istatistikler */}
      <AppText style={s.sectionTitle}>Genel Bakış</AppText>
      {loading ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={P} />
        </View>
      ) : (
        <View style={s.statsGrid}>
          <StatCard icon="link-outline" label="Toplam Link" value={String(stats?.totalLinks ?? 0)} color="#8D73FF" />
          <StatCard icon="eye-outline" label="Toplam Tıklanma" value={String(stats?.totalClicks ?? 0)} color="#FF6B6B" />
          <StatCard icon="people-outline" label="Toplam Ziyaretçi" value={String(stats?.totalVisitors ?? 0)} color="#4ECDC4" />
          <StatCard icon="checkmark-circle-outline" label="Dönüşüm" value={String(stats?.totalConversions ?? 0)} color="#45B7D1" />
        </View>
      )}

      {/* Hızlı İşlemler */}
      <AppText style={s.sectionTitle}>Hızlı İşlemler</AppText>
      <View style={s.quickActions}>
        <Pressable style={s.quickAction} onPress={() => router.push('/(influencer-tabs)/products' as any)}>
          <View style={[s.quickActionIcon, { backgroundColor: P + '14' }]}>
            <Ionicons name="add-circle-outline" size={22} color={P} />
          </View>
          <AppText style={s.quickActionLabel}>Yeni Link Oluştur</AppText>
        </Pressable>
        <Pressable style={s.quickAction} onPress={() => router.push('/(influencer-tabs)/links' as any)}>
          <View style={[s.quickActionIcon, { backgroundColor: '#4ECDC4' + '14' }]}>
            <Ionicons name="list-outline" size={22} color="#4ECDC4" />
          </View>
          <AppText style={s.quickActionLabel}>Linklerim</AppText>
        </Pressable>
        <Pressable style={s.quickAction} onPress={() => router.push('/(influencer-tabs)/earnings' as any)}>
          <View style={[s.quickActionIcon, { backgroundColor: '#FF6B6B' + '14' }]}>
            <Ionicons name="wallet-outline" size={22} color="#FF6B6B" />
          </View>
          <AppText style={s.quickActionLabel}>Kazançlarım</AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6FB' },
  content: { padding: 16 },

  welcomeCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#7C5EFF',
  },
  welcomeContent: { flex: 1 },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    fontFamily: Fonts.rounded,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  welcomeIconWrap: {
    marginLeft: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1631',
    marginBottom: 14,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1631',
    fontFamily: Fonts.rounded,
  },
  statLabel: {
    fontSize: 12,
    color: '#7A7A8E',
    marginTop: 2,
  },

  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D3660',
    textAlign: 'center',
  },

  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(141,115,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1631',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9A96B5',
    textAlign: 'center',
  },
});
