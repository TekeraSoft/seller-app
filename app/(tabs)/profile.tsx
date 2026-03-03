import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchReports } from '@/store/reports-slice';

export default function ReportsScreen() {
  const dispatch = useAppDispatch();
  const { periods, isLoading, error } = useAppSelector((state) => state.reports);
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});

  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = String(now.getFullYear());

  const isCurrentPeriod = useCallback(
    (month: string, year: string) => month.padStart(2, '0') === currentMonth && year === currentYear,
    [currentMonth, currentYear]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(value);

  useFocusEffect(
    useCallback(() => {
      if (periods.length === 0) {
        dispatch(fetchReports());
      }
    }, [dispatch, periods.length])
  );

  useEffect(() => {
    setExpandedById((prev) => {
      const next: Record<string, boolean> = {};
      for (const period of periods) {
        if (typeof prev[period.id] === 'boolean') {
          next[period.id] = prev[period.id];
        } else {
          next[period.id] = isCurrentPeriod(period.month, period.year);
        }
      }
      return next;
    });
  }, [isCurrentPeriod, periods]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.headerRow}>
        <AppText style={styles.title} tone="rounded">
          Raporlar
        </AppText>
        <Pressable style={styles.refreshButton} onPress={() => dispatch(fetchReports())}>
          <Ionicons name="refresh" size={16} color="#2B2B31" />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <AppText style={styles.errorText}>{error}</AppText>
        </View>
      ) : null}

      {isLoading && periods.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#7F67FF" />
          <AppText style={styles.loadingText}>Raporlar yükleniyor...</AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {periods.length === 0 ? (
            <View style={styles.emptyWrap}>
              <AppText style={styles.emptyText}>Henüz rapor verisi bulunamadı.</AppText>
            </View>
          ) : (
            periods.map((period) => {
              const isCurrent = isCurrentPeriod(period.month, period.year);
              const expanded = isCurrent ? true : Boolean(expandedById[period.id]);

              return (
                <View key={period.id} style={styles.periodCard}>
                  <View style={styles.periodHead}>
                    <AppText style={styles.periodTitle} tone="rounded">
                      {period.month} {period.year}
                    </AppText>
                    <View style={styles.periodHeadRight}>
                      <AppText style={styles.periodBadge}>{period.items.length} kalem</AppText>
                      {isCurrent ? (
                        <View style={styles.currentBadge}>
                          <AppText style={styles.currentBadgeText}>Bu Ay</AppText>
                        </View>
                      ) : (
                        <Pressable
                          style={styles.collapseButton}
                          onPress={() =>
                            setExpandedById((prev) => ({
                              ...prev,
                              [period.id]: !Boolean(prev[period.id]),
                            }))
                          }>
                          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#5D5D66" />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {expanded ? (
                    <>
                      <View style={styles.summaryBox}>
                        <SummaryRow label="Satıcı Ücreti" value={formatCurrency(period.sellerFee)} />
                        <SummaryRow label="Kesinti Tutarı" value={formatCurrency(period.interruptionAmount)} />
                        <SummaryRow label="Net Toplam" value={formatCurrency(period.total)} strong />
                      </View>

                      <View style={styles.itemsWrap}>
                        <AppText style={styles.itemsTitle} tone="rounded">
                          InterruptionContent Detayları
                        </AppText>
                        {period.items.length === 0 ? (
                          <AppText style={styles.emptyItemText}>Bu dönem için interruptionContent boş.</AppText>
                        ) : null}

                        {period.items.length > 0 ? (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.table}>
                              <View style={[styles.tableRow, styles.tableHead]}>
                                <AppText style={[styles.headCell, styles.colProduct]}>Ürün</AppText>
                                <AppText style={[styles.headCell, styles.colOrder]}>Sipariş</AppText>
                                <AppText style={[styles.headCell, styles.colPrice]}>Satış</AppText>
                                <AppText style={[styles.headCell, styles.colPrice]}>Kullanım</AppText>
                                <AppText style={[styles.headCell, styles.colPrice]}>Komisyon</AppText>
                                <AppText style={[styles.headCell, styles.colRate]}>Oran</AppText>
                                <AppText style={[styles.headCell, styles.colPrice]}>Kar</AppText>
                              </View>
                              {period.items.map((item) => (
                                <View key={item.id} style={styles.tableRow}>
                                  <View style={[styles.bodyCell, styles.colProduct, styles.productCell]}>
                                    <View style={styles.thumbWrap}>
                                      {item.productImageUrl ? (
                                        <Image source={{ uri: item.productImageUrl }} style={styles.thumb} resizeMode="cover" />
                                      ) : (
                                        <Ionicons name="image-outline" size={12} color="#A2A2AB" />
                                      )}
                                    </View>
                                    <View style={styles.productMeta}>
                                      <AppText style={styles.productName}>{item.productName}</AppText>
                                      <AppText style={styles.productSub}>Model: {item.modelCode}</AppText>
                                    </View>
                                  </View>
                                  <AppText style={[styles.bodyCell, styles.colOrder]}>#{item.orderNumber}</AppText>
                                  <AppText style={[styles.bodyCell, styles.colPrice]}>{formatCurrency(item.lineTotal)}</AppText>
                                  <AppText style={[styles.bodyCell, styles.colPrice]}>{formatCurrency(item.usageFeeValue)}</AppText>
                                  <AppText style={[styles.bodyCell, styles.colPrice]}>{formatCurrency(item.commissionValue)}</AppText>
                                  <AppText style={[styles.bodyCell, styles.colRate]}>
                                    {item.commissionRate != null ? `%${item.commissionRate}` : '-'}
                                  </AppText>
                                  <AppText style={[styles.bodyCell, styles.colPrice, styles.profitCell]}>
                                    {formatCurrency(item.sellerProfit)}
                                  </AppText>
                                </View>
                              ))}
                            </View>
                          </ScrollView>
                        ) : null}
                      </View>
                    </>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <AppText style={styles.summaryLabel}>{label}</AppText>
      <AppText style={[styles.summaryValue, strong && styles.summaryValueStrong]} tone="rounded">
        {value}
      </AppText>
    </View>
  );
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
  refreshButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E7EC',
    borderWidth: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 110,
    gap: 10,
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#70707A',
    fontFamily: Fonts.sans,
  },
  emptyWrap: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6C6C74',
    fontSize: 13,
    fontFamily: Fonts.sans,
  },
  periodCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEF',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  periodHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodHeadRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodTitle: {
    fontSize: 15,
    color: '#17171D',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  periodBadge: {
    fontSize: 10,
    color: '#5E4BCE',
    fontFamily: Fonts.mono,
  },
  collapseButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F5',
  },
  currentBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: '#EEF6FF',
  },
  currentBadgeText: {
    fontSize: 9,
    color: '#2F5E9A',
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  summaryBox: {
    backgroundColor: '#F7F7FA',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#767680',
    fontFamily: Fonts.sans,
  },
  summaryValue: {
    fontSize: 13,
    color: '#151519',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  summaryValueStrong: {
    color: '#4D3DAD',
  },
  itemsWrap: {
    gap: 8,
  },
  itemsTitle: {
    fontSize: 12,
    color: '#22222A',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  emptyItemText: {
    fontSize: 11,
    color: '#8A8A94',
    fontFamily: Fonts.sans,
    paddingVertical: 6,
  },
  table: {
    minWidth: 760,
    borderWidth: 1,
    borderColor: '#ECECEF',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tableHead: {
    backgroundColor: '#F7F7FA',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F4',
  },
  headCell: {
    fontSize: 10,
    color: '#6E6E77',
    fontFamily: Fonts.sans,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  bodyCell: {
    fontSize: 10,
    color: '#1B1B22',
    fontFamily: Fonts.sans,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlignVertical: 'center',
  },
  colProduct: {
    width: 220,
  },
  colOrder: {
    width: 110,
  },
  colPrice: {
    width: 100,
  },
  colRate: {
    width: 70,
  },
  productCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumbWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#F5F5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  productMeta: {
    flex: 1,
    gap: 1,
  },
  productName: {
    fontSize: 10,
    color: '#17171D',
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
  productSub: {
    fontSize: 9,
    color: '#8A8A94',
    fontFamily: Fonts.sans,
  },
  profitCell: {
    color: '#4D3DAD',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
});
