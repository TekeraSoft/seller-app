import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { InsightDisplay, InsightListCard } from '@/components/influencer/insight-card';
import { PeriodSelector } from '@/components/influencer/period-selector';
import { Fonts } from '@/constants/theme';
import {
  getInfluencerLinkAnalytics,
  AnalyticsPeriod,
  InfluencerLinkAnalyticsDto,
  InfluencerTimeseriesPoint,
} from '@/features/influencer/api';
import { resolvePublicAssetUrl } from '@/features/seller/mappers';

const P = '#8D73FF';

function formatTl(value: number): string {
  if (!value) return '₺0';
  if (value >= 1_000_000) return `₺${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₺${(value / 1_000).toFixed(1)}K`;
  return `₺${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatRate(value: number): string {
  return `%${(value * 100).toFixed(1)}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function buildLinkInsights(a: InfluencerLinkAnalyticsDto): InsightDisplay[] {
  const out: InsightDisplay[] = [];

  if (!a.active) {
    out.push({
      severity: 'WARNING',
      title: 'Link pasif durumda',
      description: 'Bu link şu an pasif. Linke tıklayan kullanıcılar "geçerli değil" mesajı görüyor.',
      icon: 'pause-circle-outline',
    });
    return out;
  }

  if (a.totalClicks === 0) {
    out.push({
      severity: 'CRITICAL',
      title: 'Henüz hiç tıklanmamış',
      description: 'Bu link bir kez bile tıklanmadı. Sosyal medyada hikayene veya postuna ekleyip ilk ziyaretçilerini al.',
      icon: 'megaphone-outline',
    });
  }

  if (a.daysUntilExpiry != null && a.daysUntilExpiry > 0 && a.daysUntilExpiry <= 7) {
    out.push({
      severity: 'WARNING',
      title: `Linkin ${a.daysUntilExpiry} gün sonra bitecek`,
      description: 'Süre dolmadan son tıklamalar için paylaşımları yoğunlaştır. Süre bittikten sonra bu link komisyon üretmez.',
      icon: 'time-outline',
    });
  }

  // Trend analizi (timeseries son 7 gün vs önceki 7 gün)
  if (a.timeseries.length >= 7) {
    const last7 = a.timeseries.slice(-7).reduce((sum, p) => sum + p.visitors, 0);
    const prev7 = a.timeseries.slice(-14, -7).reduce((sum, p) => sum + p.visitors, 0);

    if (a.totalVisitors > 0 && last7 === 0) {
      out.push({
        severity: 'WARNING',
        title: 'Son 7 gündür sessiz',
        description: 'Bu hafta hiç ziyaretçi gelmedi. Yeni bir hikaye veya postta yeniden paylaşmayı dene.',
        icon: 'cloud-offline-outline',
      });
    } else if (prev7 >= 5 && last7 > 0) {
      const change = ((last7 - prev7) / prev7) * 100;
      if (change >= 30) {
        out.push({
          severity: 'SUCCESS',
          title: `Trafiğin %${Math.round(change)} arttı`,
          description: `Bu hafta ${last7} ziyaretçi (geçen hafta ${prev7}). Yapılan iyi gidiyor — tempoyu koru.`,
          icon: 'trending-up',
        });
      } else if (change <= -30) {
        out.push({
          severity: 'WARNING',
          title: `Trafiğin %${Math.round(Math.abs(change))} düştü`,
          description: `Bu hafta ${last7} ziyaretçi (geçen hafta ${prev7}). Paylaşımlarını yenilemeyi düşün.`,
          icon: 'trending-down-outline',
        });
      }
    }
  }

  // Dönüşüm performansı
  if (a.periodVisitors >= 20) {
    const cvrPercent = a.conversionRate * 100;
    if (cvrPercent < 1) {
      out.push({
        severity: 'INFO',
        title: 'Dönüşüm oranı düşük',
        description: `${a.periodVisitors} ziyaretçi geldi ama yalnızca %${cvrPercent.toFixed(1)} alışveriş yaptı. Daha hedefli kitleye paylaşmayı dene.`,
        icon: 'analytics-outline',
      });
    } else if (cvrPercent >= 5) {
      out.push({
        severity: 'SUCCESS',
        title: 'Mükemmel dönüşüm oranı',
        description: `Ziyaretçilerin %${cvrPercent.toFixed(1)}'i alışveriş yaptı. Bu ürünü daha çok paylaşman kazançlı.`,
        icon: 'star',
      });
    }
  }

  return out;
}

function TimeseriesChart({ points }: { points: InfluencerTimeseriesPoint[] }) {
  const max = useMemo(() => Math.max(1, ...points.map((p) => p.visitors)), [points]);
  if (points.length === 0) {
    return (
      <View style={s.chartEmpty}>
        <Ionicons name="bar-chart-outline" size={32} color="#C8C4E0" />
        <AppText style={s.chartEmptyText}>Bu dönemde veri bulunmuyor</AppText>
      </View>
    );
  }

  return (
    <View style={s.chartWrap}>
      {points.map((pt) => {
        const widthPct = (pt.visitors / max) * 100;
        return (
          <View key={pt.date} style={s.chartRow}>
            <AppText style={s.chartDate}>{formatShortDate(pt.date)}</AppText>
            <View style={s.chartBarBg}>
              <View
                style={[
                  s.chartBarFill,
                  { width: `${widthPct}%`, backgroundColor: pt.conversions > 0 ? '#4ECDC4' : P },
                ]}
              />
            </View>
            <View style={s.chartValues}>
              <AppText style={s.chartVisitor}>{pt.visitors}</AppText>
              {pt.conversions > 0 && (
                <AppText style={s.chartConversion}>+{pt.conversions}</AppText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function LinkAnalyticsScreen() {
  const { linkId } = useLocalSearchParams<{ linkId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [analytics, setAnalytics] = useState<InfluencerLinkAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (currentPeriod: AnalyticsPeriod) => {
    if (!linkId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getInfluencerLinkAnalytics(linkId, currentPeriod);
      setAnalytics(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Analitik yüklenemedi';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [linkId]);

  useEffect(() => {
    load(period);
  }, [load, period]);

  const handleShare = () => {
    if (!analytics) return;
    Share.share({
      message: analytics.referralUrl,
      url: analytics.referralUrl,
      title: analytics.productName ?? 'Ürün',
    });
  };

  const renderHeaderLeft = () => (
    <Pressable onPress={() => router.back()} style={s.headerBackBtn} hitSlop={8}>
      <Ionicons name="chevron-back" size={26} color={P} />
    </Pressable>
  );

  if (loading && !analytics) {
    return (
      <>
        <Stack.Screen options={{ title: 'Link Analitiği', headerLeft: renderHeaderLeft }} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color={P} />
        </View>
      </>
    );
  }

  if (error || !analytics) {
    return (
      <>
        <Stack.Screen options={{ title: 'Link Analitiği', headerLeft: renderHeaderLeft }} />
        <View style={[s.centered, { paddingHorizontal: 32 }]}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
          <AppText style={s.errorTitle}>Analitik alınamadı</AppText>
          <AppText style={s.errorText}>{error ?? 'Bir hata oluştu'}</AppText>
          <Pressable style={s.retryBtn} onPress={() => load(period)}>
            <AppText style={s.retryBtnText}>Tekrar Dene</AppText>
          </Pressable>
        </View>
      </>
    );
  }

  const imageUrl = analytics.productImage ? resolvePublicAssetUrl(analytics.productImage) : null;
  const expired = !analytics.active || new Date(analytics.secondExpiresAt).getTime() < Date.now();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Link Analitiği',
          headerLeft: renderHeaderLeft,
          headerRight: () => (
            <Pressable onPress={handleShare} style={s.headerShareBtn} hitSlop={8}>
              <Ionicons name="share-social-outline" size={20} color={P} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={s.container}
        contentContainerStyle={[s.content, { paddingTop: 16, paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
      {/* Ürün kartı */}
      <View style={s.productCard}>
        <View style={s.productImageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={s.productImage} resizeMode="cover" />
          ) : (
            <View style={s.productImagePlaceholder}>
              <Ionicons name="image-outline" size={28} color="#C8C4E0" />
            </View>
          )}
        </View>
        <View style={s.productInfo}>
          <AppText style={s.productName} numberOfLines={2}>
            {analytics.productName ?? 'Ürün'}
          </AppText>
          {analytics.categoryName && (
            <AppText style={s.productCategory} numberOfLines={1}>{analytics.categoryName}</AppText>
          )}
          <View style={s.codeRow}>
            <Ionicons name="link" size={11} color={P} />
            <AppText style={s.codeText}>{analytics.uniqueCode}</AppText>
          </View>
          <View style={[s.statusBadge, expired ? s.statusInactive : s.statusActive]}>
            <View style={[s.statusDot, { backgroundColor: expired ? '#9A96B5' : '#2ECC71' }]} />
            <AppText style={s.statusText}>
              {expired
                ? 'Süresi dolmuş'
                : analytics.daysUntilExpiry != null
                ? `${analytics.daysUntilExpiry} gün kaldı`
                : 'Aktif'}
            </AppText>
          </View>
        </View>
      </View>

      {/* Period seçici */}
      <PeriodSelector value={period} onChange={setPeriod} />

      {/* Period bazlı stat'lar */}
      <View style={s.statsRow}>
        <View style={s.statCell}>
          <View style={[s.statIconBg, { backgroundColor: 'rgba(78,205,196,0.12)' }]}>
            <Ionicons name="people-outline" size={18} color="#4ECDC4" />
          </View>
          <AppText style={s.statValue} tone="rounded">{formatNumber(analytics.periodVisitors)}</AppText>
          <AppText style={s.statLabel}>Ziyaretçi</AppText>
        </View>
        <View style={s.statCell}>
          <View style={[s.statIconBg, { backgroundColor: 'rgba(69,183,209,0.12)' }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#45B7D1" />
          </View>
          <AppText style={s.statValue} tone="rounded">{formatNumber(analytics.periodConversions)}</AppText>
          <AppText style={s.statLabel}>Dönüşüm</AppText>
        </View>
        <View style={s.statCell}>
          <View style={[s.statIconBg, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
            <Ionicons name="wallet-outline" size={18} color="#F59E0B" />
          </View>
          <AppText style={s.statValue} tone="rounded">{formatTl(analytics.periodEarning)}</AppText>
          <AppText style={s.statLabel}>Kazanç</AppText>
        </View>
      </View>

      {/* Dönüşüm oranı */}
      <View style={s.cvrCard}>
        <View style={s.cvrLeft}>
          <AppText style={s.cvrLabel}>Dönüşüm Oranı</AppText>
          <AppText style={s.cvrValue} tone="rounded">{formatRate(analytics.conversionRate)}</AppText>
        </View>
        <View style={[s.cvrIconBg, { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
          <Ionicons name="trending-up-outline" size={20} color="#FF6B6B" />
        </View>
      </View>

      {/* Önemli Uyarılar ve Öneriler — link bazlı */}
      <InsightListCard insights={buildLinkInsights(analytics)} style={s.insightCardWrap} />

      {/* Toplam metrikler */}
      <AppText style={s.sectionTitle}>Tüm Zamanlar</AppText>
      <View style={s.totalsCard}>
        <View style={s.totalRow}>
          <AppText style={s.totalLabel}>Toplam tıklanma</AppText>
          <AppText style={s.totalValue} tone="rounded">{formatNumber(analytics.totalClicks)}</AppText>
        </View>
        <View style={s.totalRow}>
          <AppText style={s.totalLabel}>Toplam ziyaretçi</AppText>
          <AppText style={s.totalValue} tone="rounded">{formatNumber(analytics.totalVisitors)}</AppText>
        </View>
        <View style={s.totalRow}>
          <AppText style={s.totalLabel}>Toplam dönüşüm</AppText>
          <AppText style={s.totalValue} tone="rounded">{formatNumber(analytics.totalConversions)}</AppText>
        </View>
      </View>

      {/* Timeseries grafiği */}
      <AppText style={s.sectionTitle}>Günlük Hareket</AppText>
      <View style={s.chartCard}>
        <TimeseriesChart points={analytics.timeseries} />
      </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6FB' },
  content: { paddingHorizontal: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6FB' },

  headerShareBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerBackBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginLeft: -4,
  },
  insightCardWrap: {
    marginBottom: 20,
  },

  // ─── Ürün Kartı ───────────────────────────────────────────────────────
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EEFF',
    gap: 12,
    marginBottom: 16,
  },
  productImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F7F6FB',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1631',
    lineHeight: 19,
  },
  productCategory: {
    fontSize: 11,
    color: '#9A96B5',
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  codeText: {
    fontSize: 11,
    color: P,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  statusActive: { backgroundColor: 'rgba(46,204,113,0.12)' },
  statusInactive: { backgroundColor: 'rgba(154,150,181,0.16)' },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3D3660',
  },

  // ─── Stat Hücreleri ───────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EEFF',
    gap: 4,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1631',
  },
  statLabel: {
    fontSize: 10,
    color: '#9A96B5',
    fontWeight: '600',
  },

  // ─── CVR Kartı ────────────────────────────────────────────────────────
  cvrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EEFF',
    marginBottom: 20,
  },
  cvrLeft: { flex: 1 },
  cvrLabel: {
    fontSize: 12,
    color: '#9A96B5',
    fontWeight: '600',
    marginBottom: 2,
  },
  cvrValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1631',
    fontFamily: Fonts.rounded,
  },
  cvrIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Toplamlar ────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1631',
    marginBottom: 10,
  },
  totalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#F0EEFF',
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F6FB',
  },
  totalLabel: {
    fontSize: 13,
    color: '#3D3660',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1631',
  },

  // ─── Chart ────────────────────────────────────────────────────────────
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0EEFF',
    marginBottom: 20,
  },
  chartWrap: {
    gap: 4,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 22,
  },
  chartDate: {
    width: 56,
    fontSize: 10,
    color: '#9A96B5',
    fontWeight: '600',
  },
  chartBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F0EEFF',
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  chartValues: {
    width: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  chartVisitor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1631',
  },
  chartConversion: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4ECDC4',
  },
  chartEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  chartEmptyText: {
    fontSize: 12,
    color: '#9A96B5',
  },

  // ─── Hata ─────────────────────────────────────────────────────────────
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1631',
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#9A96B5',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    height: 40,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: P,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
