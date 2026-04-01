import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import {
  getEarningsSummary,
  InfluencerCommissionDto,
  InfluencerCommissionStatus,
  InfluencerEarningsSummaryDto,
} from '@/features/influencer/api';

const P = '#8D73FF';

const STATUS_INFO: Record<InfluencerCommissionStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING: { label: 'Bekliyor', color: '#9A96B5', icon: 'hourglass-outline' },
  RETURN_PERIOD: { label: 'İade Süreci', color: '#FFB84D', icon: 'time-outline' },
  READY: { label: 'Hazır', color: '#4ECDC4', icon: 'checkmark-circle-outline' },
  PAID: { label: 'Ödendi', color: '#2ECC71', icon: 'wallet-outline' },
  CANCELLED: { label: 'İptal', color: '#FF6B6B', icon: 'close-circle-outline' },
};

function formatPrice(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
}

function formatDate(d: string | null): string {
  if (!d) return '-';
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
}

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<InfluencerEarningsSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getEarningsSummary()
        .then(setData)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={P} />
      </View>
    );
  }

  const summary = data ?? {
    totalEarning: 0, pendingEarning: 0, readyEarning: 0, paidEarning: 0,
    cancelledEarning: 0, totalCount: 0, commissions: [],
  };

  const renderCommission = ({ item }: { item: InfluencerCommissionDto }) => {
    const info = STATUS_INFO[item.status];
    const isSellerRef = item.commissionType === 'SELLER_REFERRAL';

    return (
      <View style={s.txCard}>
        <View style={s.txHeader}>
          <View style={s.txLeft}>
            <View style={[s.txTypeIcon, { backgroundColor: isSellerRef ? 'rgba(255,159,67,0.1)' : 'rgba(141,115,255,0.1)' }]}>
              <Ionicons
                name={isSellerRef ? 'storefront-outline' : 'link-outline'}
                size={14}
                color={isSellerRef ? '#FF9F43' : P}
              />
            </View>
            <View style={s.txInfo}>
              <AppText style={s.txProduct} numberOfLines={1}>{item.productName ?? 'Ürün'}</AppText>
              <AppText style={s.txSeller} numberOfLines={1}>
                {item.sellerName ?? 'Satıcı'} · {formatDate(item.createdAt)}
              </AppText>
            </View>
          </View>
          <View style={s.txRight}>
            <AppText style={[s.txEarning, item.status === 'CANCELLED' && { color: '#FF6B6B', textDecorationLine: 'line-through' }]}>
              +{formatPrice(item.influencerEarning)}
            </AppText>
            <View style={[s.txBadge, { backgroundColor: info.color + '18' }]}>
              <Ionicons name={info.icon} size={10} color={info.color} />
              <AppText style={[s.txBadgeText, { color: info.color }]}>{info.label}</AppText>
            </View>
          </View>
        </View>
        {/* Detay satırı */}
        <View style={s.txDetail}>
          <AppText style={s.txDetailText}>Satış: {formatPrice(item.saleAmount)}</AppText>
          <AppText style={s.txDetailText}>Platform Kom.: {formatPrice(item.platformCommission)}</AppText>
          <AppText style={s.txDetailText}>Oran: %{(item.influencerRate * 100).toFixed(0)}</AppText>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={summary.commissions}
      keyExtractor={(item) => item.id}
      renderItem={renderCommission}
      style={s.container}
      contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={s.header}>
          {/* Bakiye Kartı */}
          <View style={s.balanceCard}>
            <AppText style={s.balanceLabel}>Toplam Kazanç</AppText>
            <AppText style={s.balanceValue} tone="rounded">{formatPrice(summary.totalEarning)}</AppText>
            <View style={s.balanceGrid}>
              <View style={s.balanceStat}>
                <View style={[s.balanceDot, { backgroundColor: '#FFB84D' }]} />
                <AppText style={s.balanceStatLabel}>İade Sürecinde</AppText>
                <AppText style={s.balanceStatValue}>{formatPrice(summary.pendingEarning)}</AppText>
              </View>
              <View style={s.balanceStat}>
                <View style={[s.balanceDot, { backgroundColor: '#4ECDC4' }]} />
                <AppText style={s.balanceStatLabel}>Hazır</AppText>
                <AppText style={s.balanceStatValue}>{formatPrice(summary.readyEarning)}</AppText>
              </View>
              <View style={s.balanceStat}>
                <View style={[s.balanceDot, { backgroundColor: '#2ECC71' }]} />
                <AppText style={s.balanceStatLabel}>Ödenen</AppText>
                <AppText style={s.balanceStatValue}>{formatPrice(summary.paidEarning)}</AppText>
              </View>
            </View>
          </View>

          <AppText style={s.sectionTitle}>İşlem Geçmişi ({summary.totalCount})</AppText>
        </View>
      }
      ListEmptyComponent={
        <View style={s.emptyState}>
          <View style={s.emptyIcon}>
            <Ionicons name="receipt-outline" size={36} color="#C8C4E0" />
          </View>
          <AppText style={s.emptyTitle}>Henüz işlem yok</AppText>
          <AppText style={s.emptySubtitle}>
            Referans linkleriniz üzerinden satış gerçekleştiğinde burada görünecek
          </AppText>
        </View>
      }
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6FB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6FB' },
  header: { padding: 16, paddingBottom: 0 },

  // ─── Bakiye ──────────────────────────────────────────────────────────
  balanceCard: {
    backgroundColor: '#1C1631',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    marginBottom: 16,
  },
  balanceGrid: {
    gap: 8,
  },
  balanceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  balanceStatLabel: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  balanceStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1631',
    marginBottom: 12,
    paddingHorizontal: 0,
  },

  // ─── İşlem kartı ────────────────────────────────────────────────────
  txCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  txTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txProduct: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1631',
  },
  txSeller: {
    fontSize: 11,
    color: '#9A96B5',
    marginTop: 1,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txEarning: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1631',
    fontFamily: Fonts.rounded,
  },
  txBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  txDetail: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F4FA',
  },
  txDetailText: {
    fontSize: 10,
    color: '#9A96B5',
  },

  // ─── Boş durum ──────────────────────────────────────────────────────
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EEFF',
    marginHorizontal: 16,
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
