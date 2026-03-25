import { getMyApplication } from '@/features/influencer/api';
import type { InfluencerApplication, InfluencerStatus } from '@/features/influencer/types';
import { useAuth } from '@/context/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const P = '#8D73FF';

const STEPS: { key: InfluencerStatus; label: string }[] = [
  { key: 'PENDING_PROFILE_REVIEW', label: 'Profil İnceleme' },
  { key: 'PENDING_DOCUMENTS', label: 'Evrak Yükleme' },
  { key: 'PENDING_DOCUMENT_REVIEW', label: 'Evrak İnceleme' },
  { key: 'ACTIVE', label: 'Aktif' },
];

function stepIndex(s: InfluencerStatus) {
  if (s === 'REJECTED') return -1;
  return STEPS.findIndex(x => x.key === s);
}

export default function InfluencerStatusScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [app, setApp] = useState<InfluencerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getMyApplication();
      setApp(data);
      setNotFound(false);
    } catch {
      setNotFound(true);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={P} />
      </SafeAreaView>
    );
  }

  // Başvuru yok
  if (notFound) {
    return (
      <SafeAreaView style={s.centered}>
        <Stack.Screen options={{ title: 'Başvuru Durumu' }} />
        <View style={s.emptyIcon}>
          <Ionicons name="document-text-outline" size={40} color={P} />
        </View>
        <Text style={s.emptyTitle}>Başvuru Bulunamadı</Text>
        <Text style={s.emptySub}>Henüz influencer başvurusu yapmadınız.</Text>
        <Pressable style={s.primaryBtn} onPress={() => router.replace('/influencer/apply' as any)}>
          <Text style={s.primaryBtnText}>Başvuru Yap</Text>
        </Pressable>
        <Pressable style={s.ghostBtn} onPress={signOut}>
          <Text style={s.ghostBtnText}>Çıkış Yap</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const status = app?.status ?? 'PENDING_PROFILE_REVIEW';
  const idx = stepIndex(status);
  const isRejected = status === 'REJECTED';
  const isActive = status === 'ACTIVE';

  const statusLabel = isActive ? 'Aktif' : isRejected ? 'Reddedildi' : 'İnceleniyor';
  const statusColor = isActive ? '#16A34A' : isRejected ? '#DC2626' : P;
  const statusBg = isActive ? '#F0FDF4' : isRejected ? '#FEF2F2' : 'rgba(141,115,255,0.08)';

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <Stack.Screen options={{
        title: 'Başvuru Durumu',
        headerRight: () => (
          <Pressable onPress={signOut} style={{ marginRight: 4 }}>
            <Ionicons name="log-out-outline" size={22} color={P} />
          </Pressable>
        ),
      }} />
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header kart */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroName}>{app?.name} {app?.surname}</Text>
              <Text style={s.heroEmail}>{app?.userEmail}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[s.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Step bar */}
          {!isRejected && (
            <View style={s.stepBar}>
              {STEPS.map((step, i) => {
                const done = i < idx;
                const active = i === idx;
                return (
                  <View key={step.key} style={s.stepItem}>
                    <View style={[s.stepDot2, done && s.stepDone, active && s.stepActive2]}>
                      {done
                        ? <Ionicons name="checkmark" size={11} color="#fff" />
                        : <Text style={[s.stepNum, active && { color: '#fff' }]}>{i + 1}</Text>
                      }
                    </View>
                    {i < STEPS.length - 1 && (
                      <View style={[s.stepLine, done && s.stepLineDone]} />
                    )}
                  </View>
                );
              })}
            </View>
          )}
          {!isRejected && (
            <Text style={s.stepLabel}>
              {STEPS[Math.max(0, idx)]?.label}
            </Text>
          )}
        </View>

        {/* Red gerekçesi */}
        {isRejected && (
          <View style={s.rejectedCard}>
            <Ionicons name="close-circle" size={22} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={s.rejectedTitle}>Başvuru Reddedildi</Text>
              <Text style={s.rejectedText}>{app?.rejectionReason ?? 'Gerekçe belirtilmedi.'}</Text>
            </View>
          </View>
        )}

        {/* Bilgi */}
        <View style={s.infoCard}>
          {[
            { label: 'Şirket Tipi', value: app?.companyType === 'SAHIS' ? 'Şahıs' : 'Ltd / A.Ş.' },
            { label: 'Telefon', value: app?.gsmNumber ?? '-' },
            { label: 'Başvuru Tarihi', value: app?.createdAt ? new Date(app.createdAt).toLocaleDateString('tr-TR') : '-' },
          ].map(({ label, value }) => (
            <View key={label} style={s.infoRow}>
              <Text style={s.infoLabel}>{label}</Text>
              <Text style={s.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Eylemler */}
        {(status === 'PENDING_DOCUMENTS' || status === 'PENDING_DOCUMENT_REVIEW') && (
          <Pressable style={s.primaryBtn} onPress={() => router.push('/influencer/documents' as any)}>
            <Ionicons name="document-attach-outline" size={18} color="#fff" />
            <Text style={s.primaryBtnText}>
              {status === 'PENDING_DOCUMENT_REVIEW' ? 'Evrakları Görüntüle' : 'Evrak Yükle'}
            </Text>
          </Pressable>
        )}

        {isActive && (
          <Pressable style={[s.primaryBtn, { backgroundColor: '#16A34A' }]}
            onPress={() => router.replace('/(tabs)' as any)}>
            <Ionicons name="grid-outline" size={18} color="#fff" />
            <Text style={s.primaryBtnText}>Panele Git</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F6FB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: '#F7F6FB' },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ECEAF8',
    gap: 16,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroName: { fontSize: 18, fontWeight: '700', color: '#1C1631' },
  heroEmail: { fontSize: 13, color: '#8B87A8', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  stepBar: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot2: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#EEEBFF',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDone: { backgroundColor: P },
  stepActive2: { backgroundColor: P },
  stepLine: { flex: 1, height: 2, backgroundColor: '#EEEBFF' },
  stepLineDone: { backgroundColor: P },
  stepNum: { fontSize: 11, fontWeight: '700', color: '#9A96B5' },
  stepLabel: { fontSize: 12, color: P, fontWeight: '600', textAlign: 'center' },

  rejectedCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#FEF2F2', borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA', padding: 14,
  },
  rejectedTitle: { fontSize: 14, fontWeight: '700', color: '#DC2626', marginBottom: 2 },
  rejectedText: { fontSize: 13, color: '#991B1B', lineHeight: 18 },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#ECEAF8',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F4F2FC',
  },
  infoLabel: { fontSize: 13, color: '#8B87A8', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#1C1631', fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row', gap: 8,
    height: 52, borderRadius: 14,
    backgroundColor: P,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: P, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  ghostBtn: {
    height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD7FF',
    alignItems: 'center', justifyContent: 'center',
  },
  ghostBtnText: { color: '#5D5677', fontSize: 14, fontWeight: '600' },

  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(141,115,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1C1631' },
  emptySub: { fontSize: 14, color: '#8B87A8', textAlign: 'center', lineHeight: 20 },
});
