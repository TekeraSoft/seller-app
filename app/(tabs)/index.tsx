import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';

export default function HomeScreen() {
  const router = useRouter();
  const {
    report: {
      followerCount,
      totalOrders,
      totalProducts,
      recentOrders,
      currentMonthSales,
      monthlyTarget,
      progressPercent,
    },
    isLoading,
  } = useAppSelector((state) => state.seller);

  const formatCount = (value: number) => value.toLocaleString('tr-TR');
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(value);
  const formatDate = (value: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  };
  const clampedProgress = Math.max(0, Math.min(100, progressPercent));
  const remainingPercent = Math.max(0, 100 - clampedProgress);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView style={[styles.screen,{paddingTop:12}]} contentContainerStyle={styles.content}>
        <View style={[styles.metricsGrid,]}>
          <MetricCard
            title="Takipçi Sayısı"
            value={isLoading ? '...' : formatCount(followerCount)}
          />
          <MetricCard
            title="Toplam Ürün"
            value={isLoading ? '...' : formatCount(totalProducts)}
          />
          <MetricCard
            title="Toplam Sipariş"
            value={isLoading ? '...' : formatCount(totalOrders)}
          />
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHead}>
            <AppText style={styles.overviewTitle}>Satış Özeti</AppText>
            <Pressable style={styles.arrowButton} onPress={() => router.push('/(tabs)/profile')}>
              <Ionicons name="arrow-forward" size={14} color="#333" />
            </Pressable>
          </View>

          <View style={styles.chartWrap}>
            <View style={styles.simpleScoreWrap}>
              <AppText style={styles.simpleScorePercent}>
                {isLoading ? '...' : `${Math.round(clampedProgress)}%`}
              </AppText>
              <AppText style={styles.simpleScoreSub}>Aylık Hedef İlerlemesi</AppText>
            </View>

            <View style={styles.goalRow}>
              <Ionicons name="information-circle-outline" size={12} color="#B1B1B8" />
              <AppText style={styles.goalText}>
                {isLoading
                  ? 'Hesaplanıyor...'
                  : `%${remainingPercent.toFixed(0)} kaldı | Satış: ${formatCurrency(
                      currentMonthSales
                    )} / Hedef: ${formatCurrency(monthlyTarget)}`}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.ordersCard}>
          <View style={styles.ordersHead}>
            <AppText style={styles.ordersTitle}>Son Siparişler</AppText>
            <AppText style={styles.ordersBadge}>{recentOrders.length}</AppText>
          </View>

          {recentOrders.length === 0 ? (
            <AppText style={styles.emptyOrdersText}>
              {isLoading ? 'Yükleniyor...' : 'Henüz sipariş bulunamadı.'}
            </AppText>
          ) : (
            <View style={styles.ordersList}>
              {recentOrders.slice(0, 8).map((order) => (
                <View key={order.id} style={styles.orderRow}>
                  <View style={styles.orderImageWrap}>
                    {order.productImage ? (
                      <Image source={{ uri: order.productImage }} style={styles.orderImage} resizeMode="cover" />
                    ) : (
                      <Ionicons name="image-outline" size={14} color="#A2A2AB" />
                    )}
                  </View>
                  <View style={styles.orderMain}>
                    <AppText style={styles.orderNo}>#{order.orderNumber}</AppText>
                    <AppText style={styles.orderBuyer}>{order.buyerFullName}</AppText>
                  </View>
                  <View style={styles.orderMeta}>
                    <AppText style={styles.orderAmount}>{formatCurrency(order.totalPrice)}</AppText>
                    <AppText style={styles.orderDate}>{formatDate(order.createdAt)}</AppText>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHead}>
        <AppText style={styles.metricTitle}>{title}</AppText>
        <Ionicons name="information-circle-outline" size={12} color="#C1C1C7" />
      </View>
      <AppText style={styles.metricValue}>{value}</AppText>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText style={styles.legendText}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EFEFF2',
  },
  screen: {
    flex: 1,
    backgroundColor: '#EFEFF2',
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 94,
    gap: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECECEF',
    padding: 10,
    gap: 4,
  },
  metricHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricTitle: {
    fontSize: 10,
    color: '#52525A',
    fontFamily: Fonts.sans,
  },
  metricValue: {
    fontSize: 38,
    lineHeight: 40,
    color: '#151515',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  metricFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricHint: {
    fontSize: 9,
    color: '#A1A1AA',
    fontFamily: Fonts.sans,
  },
  metricDelta: {
    fontSize: 10,
    color: '#7F67FF',
    fontFamily: Fonts.mono,
  },
  metricDeltaNegative: {
    color: '#FF5E78',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECECEF',
    padding: 12,
    gap: 8,
  },
  overviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewTitle: {
    fontSize: 14,
    color: '#121212',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  arrowButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F6F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrap: {
    alignItems: 'center',
  },
  simpleScoreWrap: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  simpleScorePercent: {
    fontSize: 48,
    lineHeight: 50,
    color: '#1A1A1A',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  simpleScoreSub: {
    marginTop: -2,
    fontSize: 13,
    color: '#8A8A95',
    fontFamily: Fonts.sans,
  },
  goalRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalText: {
    fontSize: 10,
    color: '#A2A2AB',
    fontFamily: Fonts.sans,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#5B5B63',
    fontFamily: Fonts.sans,
  },
  ordersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECECEF',
    padding: 12,
    gap: 8,
  },
  ordersHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ordersTitle: {
    fontSize: 14,
    color: '#121212',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  ordersBadge: {
    fontSize: 11,
    color: '#5E4BCE',
    fontFamily: Fonts.mono,
  },
  emptyOrdersText: {
    fontSize: 12,
    color: '#7A7A84',
    fontFamily: Fonts.sans,
    paddingVertical: 8,
  },
  ordersList: {
    gap: 8,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F5',
  },
  orderImageWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F6F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orderImage: {
    width: '100%',
    height: '100%',
  },
  orderMain: {
    flex: 1,
    gap: 1,
  },
  orderNo: {
    fontSize: 12,
    color: '#2B2B30',
    fontFamily: Fonts.mono,
  },
  orderBuyer: {
    fontSize: 12,
    color: '#66666E',
    fontFamily: Fonts.sans,
  },
  orderMeta: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 12,
    color: '#151515',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  orderDate: {
    fontSize: 10,
    color: '#8E8E97',
    fontFamily: Fonts.sans,
  },
});

