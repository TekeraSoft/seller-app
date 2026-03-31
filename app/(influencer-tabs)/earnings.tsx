import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';

const P = '#8D73FF';

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Bakiye Kartı */}
      <View style={s.balanceCard}>
        <AppText style={s.balanceLabel}>Toplam Kazanç</AppText>
        <AppText style={s.balanceValue} tone="rounded">0,00 TL</AppText>
        <View style={s.balanceRow}>
          <View style={s.balanceStat}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
            <AppText style={s.balanceStatText}>Bekleyen: 0,00 TL</AppText>
          </View>
          <View style={s.balanceStat}>
            <Ionicons name="checkmark-circle-outline" size={14} color="rgba(255,255,255,0.7)" />
            <AppText style={s.balanceStatText}>Ödenen: 0,00 TL</AppText>
          </View>
        </View>
      </View>

      {/* Aylık Özet */}
      <AppText style={s.sectionTitle}>Bu Ay</AppText>
      <View style={s.monthGrid}>
        <View style={s.monthCard}>
          <Ionicons name="trending-up-outline" size={20} color="#4ECDC4" />
          <AppText style={s.monthValue} tone="rounded">0</AppText>
          <AppText style={s.monthLabel}>Satış</AppText>
        </View>
        <View style={s.monthCard}>
          <Ionicons name="eye-outline" size={20} color="#FF6B6B" />
          <AppText style={s.monthValue} tone="rounded">0</AppText>
          <AppText style={s.monthLabel}>Tıklanma</AppText>
        </View>
        <View style={s.monthCard}>
          <Ionicons name="cash-outline" size={20} color={P} />
          <AppText style={s.monthValue} tone="rounded">0 TL</AppText>
          <AppText style={s.monthLabel}>Kazanç</AppText>
        </View>
      </View>

      {/* İşlem Geçmişi */}
      <AppText style={s.sectionTitle}>İşlem Geçmişi</AppText>
      <View style={s.emptyState}>
        <View style={s.emptyIcon}>
          <Ionicons name="receipt-outline" size={36} color="#C8C4E0" />
        </View>
        <AppText style={s.emptyTitle}>Henüz işlem yok</AppText>
        <AppText style={s.emptySubtitle}>
          Referans linkleriniz üzerinden satış gerçekleştiğinde burada görünecek
        </AppText>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6FB' },
  content: { padding: 16 },

  balanceCard: {
    backgroundColor: '#1C1631',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 20,
  },
  balanceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceStatText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1631',
    marginBottom: 14,
  },

  monthGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  monthCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  monthValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1631',
    fontFamily: Fonts.rounded,
  },
  monthLabel: {
    fontSize: 11,
    color: '#9A96B5',
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
    lineHeight: 20,
  },
});
