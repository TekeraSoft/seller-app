import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { InsightListCard } from '@/components/influencer/insight-card';
import { PeriodSelector } from '@/components/influencer/period-selector';
import { CampaignUiDto, CatalogListingDto, fetchActiveCampaigns, fetchHotPicks } from '@/features/influencer/product-api';
import { Fonts } from '@/constants/theme';
import {
  createSellerReferralLink,
  getExemptionStatus,
  getInfluencerEarningsProjection,
  getInfluencerInsights,
  getInfluencerOverview,
  getInfluencerRecommendations,
  getInfluencerTopLinks,
  getMonthlyProgress,
  getMySellerReferrals,
  AnalyticsPeriod,
  ExemptionStatusDto,
  InfluencerAnalyticsOverviewDto,
  InfluencerEarningsProjectionDto,
  InfluencerInsightDto,
  InfluencerRecommendationsDto,
  InfluencerSellerReferralDto,
  InfluencerTopLinkDto,
  MonthlyProgressDto,
  SellerReferralStatus,
} from '@/features/influencer/api';
import { resolvePublicAssetUrl } from '@/features/seller/mappers';

const P = '#8D73FF';

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  change?: number | null;
};

function StatCard({ icon, label, value, color, change }: StatCardProps) {
  const showChange = change !== undefined && change !== null && change !== 0;
  const positive = (change ?? 0) > 0;
  return (
    <View style={s.statCard}>
      <View style={s.statHeader}>
        <View style={[s.statIconBg, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {showChange && (
          <View style={[s.changeBadge, positive ? s.changeBadgePositive : s.changeBadgeNegative]}>
            <Ionicons
              name={positive ? 'arrow-up' : 'arrow-down'}
              size={10}
              color={positive ? '#16A34A' : '#FF6B6B'}
            />
            <AppText style={[s.changeText, { color: positive ? '#16A34A' : '#FF6B6B' }]}>
              %{Math.abs(Math.round(change!))}
            </AppText>
          </View>
        )}
      </View>
      <AppText style={s.statValue} tone="rounded" numberOfLines={1}>{value}</AppText>
      <AppText style={s.statLabel}>{label}</AppText>
    </View>
  );
}

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

// ─── Referral durum bilgileri ─────────────────────────────────────────────────

const STATUS_MAP: Record<SellerReferralStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING: { label: 'Bekleniyor', color: '#9A96B5', icon: 'hourglass-outline' },
  REGISTERED: { label: 'Kayıt Oldu', color: '#45B7D1', icon: 'person-add-outline' },
  DOCUMENTS_PENDING: { label: 'Evrak Bekleniyor', color: '#FFB84D', icon: 'document-text-outline' },
  UNDER_REVIEW: { label: 'İnceleniyor', color: '#FFB84D', icon: 'search-outline' },
  APPROVED: { label: 'Onaylandı', color: '#4ECDC4', icon: 'checkmark-circle-outline' },
  PRODUCTS_ADDING: { label: 'Ürün Ekliyor', color: '#8D73FF', icon: 'cube-outline' },
  ACTIVE: { label: 'Aktif — Komisyon Süresi', color: '#2ECC71', icon: 'rocket-outline' },
  EXPIRED: { label: 'Süre Doldu', color: '#9A96B5', icon: 'time-outline' },
  REJECTED: { label: 'Reddedildi', color: '#FF6B6B', icon: 'close-circle-outline' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

function ReferralCard({ item }: { item: InfluencerSellerReferralDto }) {
  const info = STATUS_MAP[item.status];
  const isPending = item.status === 'PENDING';

  const handleShare = () => {
    Share.share({
      message: item.referralUrl,
      url: item.referralUrl,
      title: "Tekera'da satıcı ol!",
    });
  };

  return (
    <View style={s.refCard}>
      {/* Üst: Durum badge + tarih */}
      <View style={s.refHeader}>
        <View style={[s.refBadge, { backgroundColor: info.color + '18' }]}>
          <Ionicons name={info.icon} size={13} color={info.color} />
          <AppText style={[s.refBadgeText, { color: info.color }]}>{info.label}</AppText>
        </View>
        <AppText style={s.refDate}>{formatDate(item.createdAt)}</AppText>
      </View>

      {/* Satıcı bilgisi veya bekleme mesajı */}
      {isPending ? (
        <AppText style={s.refPendingText}>Henüz bir satıcı bu link ile kaydolmadı</AppText>
      ) : (
        <View style={s.refBody}>
          <View style={s.refSellerRow}>
            <View style={s.refSellerIcon}>
              <Ionicons name="storefront-outline" size={16} color={P} />
            </View>
            <AppText style={s.refSellerName} numberOfLines={1}>
              {item.referredSellerName ?? 'Satıcı'}
            </AppText>
          </View>

          {/* Adım adım ilerleme */}
          <View style={s.stepsContainer}>
            <StepItem
              label="Kayıt"
              date={item.sellerRegisteredAt}
              done={!!item.sellerRegisteredAt}
              active={item.status === 'REGISTERED' || item.status === 'DOCUMENTS_PENDING'}
            />
            <StepConnector done={!!item.sellerApprovedAt} />
            <StepItem
              label="Onay"
              date={item.sellerApprovedAt}
              done={!!item.sellerApprovedAt}
              active={item.status === 'UNDER_REVIEW'}
            />
            <StepConnector done={!!item.minProductsReachedAt} />
            <StepItem
              label="Ürünler"
              subtitle={`${item.sellerProductCount}/${item.minProductCount ?? 0}`}
              date={item.minProductsReachedAt}
              done={!!item.minProductsReachedAt}
              active={item.status === 'PRODUCTS_ADDING' || item.status === 'APPROVED'}
            />
            <StepConnector done={item.status === 'ACTIVE' || item.status === 'EXPIRED'} />
            <StepItem
              label="Komisyon"
              date={item.commissionStartsAt}
              done={item.status === 'ACTIVE' || item.status === 'EXPIRED'}
              active={item.status === 'ACTIVE'}
            />
          </View>

          {/* Komisyon süre bilgisi */}
          {item.commissionEndsAt && (
            <View style={s.refCommissionInfo}>
              <Ionicons name="calendar-outline" size={12} color="#9A96B5" />
              <AppText style={s.refCommissionText}>
                Komisyon bitiş: {formatDate(item.commissionEndsAt)}
              </AppText>
            </View>
          )}
        </View>
      )}

      {/* Paylaş butonu */}
      {isPending && (
        <Pressable style={s.refShareBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={14} color={P} />
          <AppText style={s.refShareBtnText}>Linki Paylaş</AppText>
        </Pressable>
      )}
    </View>
  );
}

function StepItem({ label, subtitle, date, done, active }: { label: string; subtitle?: string; date: string | null; done: boolean; active: boolean }) {
  return (
    <View style={s.stepItem}>
      <View style={[s.stepDot, done ? s.stepDotDone : active ? s.stepDotActive : s.stepDotPending]} >
        {done && <Ionicons name="checkmark" size={10} color="#fff" />}
      </View>
      <AppText style={[s.stepLabel, done && s.stepLabelDone]}>{label}</AppText>
      {subtitle && <AppText style={[s.stepSubtitle, done && s.stepLabelDone]}>{subtitle}</AppText>}
      {date && <AppText style={s.stepDate}>{formatDate(date)}</AppText>}
    </View>
  );
}

const LEVEL_INFO: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  MICRO: { label: 'Başlangıç', color: '#9A96B5', bg: '#F5F4FA', icon: 'leaf-outline' },
  MID: { label: 'Orta', color: '#45B7D1', bg: '#E8F8FD', icon: 'flame-outline' },
  MACRO: { label: 'Profesyonel', color: '#F59E0B', bg: '#FEF3C7', icon: 'diamond-outline' },
};

function LevelBadge({ level, bonusActive, currentRate }: { level: string; bonusActive: boolean; currentRate: number }) {
  const info = LEVEL_INFO[level] ?? LEVEL_INFO.MICRO;
  return (
    <View style={s.levelCard}>
      <View style={[s.levelIconWrap, { backgroundColor: info.bg }]}>
        <Ionicons name={info.icon} size={22} color={info.color} />
      </View>
      <View style={s.levelContent}>
        <AppText style={[s.levelLabel, { color: info.color }]}>{info.label}</AppText>
        <AppText style={s.levelRate}>Komisyon: %{(currentRate * 100).toFixed(0)}</AppText>
      </View>
      {bonusActive && (
        <View style={s.levelBonusBadge}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <AppText style={s.levelBonusText}>Bonus</AppText>
        </View>
      )}
    </View>
  );
}

function StepConnector({ done }: { done: boolean }) {
  return <View style={[s.stepConnector, done && s.stepConnectorDone]} />;
}



function PulsingAlert() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={s.exemptionIconWrap}>
      <Animated.View style={{ opacity }}>
        <Ionicons name="alert-circle" size={28} color="#F59E0B" />
      </Animated.View>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [overview, setOverview] = useState<InfluencerAnalyticsOverviewDto | null>(null);
  const [projection, setProjection] = useState<InfluencerEarningsProjectionDto | null>(null);
  const [topLinks, setTopLinks] = useState<InfluencerTopLinkDto[]>([]);
  const [hotPicks, setHotPicks] = useState<CatalogListingDto[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignUiDto[]>([]);
  const [recommendations, setRecommendations] = useState<InfluencerRecommendationsDto | null>(null);
  const [progress, setProgress] = useState<MonthlyProgressDto | null>(null);
  const [referrals, setReferrals] = useState<InfluencerSellerReferralDto[]>([]);
  const [exemption, setExemption] = useState<ExemptionStatusDto | null>(null);
  const [insights, setInsights] = useState<InfluencerInsightDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingRef, setCreatingRef] = useState(false);

  const loadAll = useCallback(async (currentPeriod: AnalyticsPeriod) => {
    const results = await Promise.allSettled([
      getInfluencerOverview(currentPeriod),
      getInfluencerTopLinks(currentPeriod, 5),
      getInfluencerEarningsProjection(),
      getMySellerReferrals(),
      getMonthlyProgress(),
      getExemptionStatus(),
      getInfluencerInsights(),
      fetchHotPicks(10),
      fetchActiveCampaigns(20),
      getInfluencerRecommendations(10),
    ]);
    const [ov, tl, proj, refs, prog, ex, ins, hp, camps, recs] = results;
    if (ov.status === 'fulfilled') setOverview(ov.value);
    if (tl.status === 'fulfilled') setTopLinks(tl.value);
    if (proj.status === 'fulfilled') setProjection(proj.value);
    if (refs.status === 'fulfilled') setReferrals(refs.value);
    if (prog.status === 'fulfilled') setProgress(prog.value);
    if (ex.status === 'fulfilled') setExemption(ex.value);
    if (ins.status === 'fulfilled') setInsights(ins.value);
    if (hp.status === 'fulfilled') setHotPicks(hp.value);
    if (camps.status === 'fulfilled') setCampaigns(camps.value);
    if (recs.status === 'fulfilled') {
      setRecommendations(recs.value);
      console.log('[recommendations]', {
        dominantCategoryName: recs.value.dominantCategoryName,
        productCount: recs.value.products.length,
      });
    } else {
      console.warn('[recommendations] failed:', recs.reason);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll(period).finally(() => setLoading(false));
    }, [loadAll, period])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll(period);
    } finally {
      setRefreshing(false);
    }
  }, [loadAll, period]);

  const handlePeriodChange = useCallback((next: AnalyticsPeriod) => {
    if (next === period) return;
    setPeriod(next);
    // Yalnızca period bazlı kartları yeniden çek
    Promise.allSettled([
      getInfluencerOverview(next),
      getInfluencerTopLinks(next, 5),
    ]).then(([ov, tl]) => {
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (tl.status === 'fulfilled') setTopLinks(tl.value);
    });
  }, [period]);

  const handleCreateSellerRef = async () => {
    setCreatingRef(true);
    try {
      const ref = await createSellerReferralLink();
      setReferrals((prev) => [ref, ...prev.filter((r) => r.id !== ref.id)]);
      Share.share({
        message: ref.referralUrl,
        url: ref.referralUrl,
        title: "Tekera'da satıcı ol!",
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Link oluşturulamadı';
      Alert.alert('Hata', msg);
    } finally {
      setCreatingRef(false);
    }
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={P} colors={[P]} />
      }
    >
      {/* İstisna Belgesi Uyarısı — yalnızca eksik bilgi varsa göster */}
      {exemption && (!exemption.certificateUploaded || exemption.certificateStatus === 'REJECTED' || !exemption.hasBankInfo) && (
        <Pressable
          style={s.exemptionCard}
          onPress={() => router.push('/influencer/exemption-certificate' as any)}
        >
          <PulsingAlert />
          <View style={s.welcomeContent}>
            <AppText style={s.exemptionTitle} tone="rounded">
              İstisna Belgenizi Yükleyin
            </AppText>
            <AppText style={s.exemptionSubtitle}>
              İstisna belgeniz ve bağlı banka hesabınızı ekleyin. Kazançlarınızı alabilmek için bu adım zorunludur.
            </AppText>
            <View style={s.exemptionStatus}>
              <View style={s.exemptionDot}>
                <Ionicons
                  name={exemption.certificateUploaded && exemption.certificateStatus !== 'REJECTED' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={exemption.certificateUploaded && exemption.certificateStatus !== 'REJECTED' ? '#4ECDC4' : 'rgba(255,255,255,0.5)'}
                />
                <AppText style={s.exemptionDotText}>İstisna Belgesi</AppText>
              </View>
              <View style={s.exemptionDot}>
                <Ionicons
                  name={exemption.hasBankInfo ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={exemption.hasBankInfo ? '#4ECDC4' : 'rgba(255,255,255,0.5)'}
                />
                <AppText style={s.exemptionDotText}>Banka Hesabı</AppText>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
        </Pressable>
      )}

      {/* Seviye Rozeti */}
      {progress && <LevelBadge level={progress.level} bonusActive={progress.bonusActive} currentRate={progress.currentRate} />}

      {/* Genel Bakış (period bazlı) */}
      <View style={s.overviewHeader}>
        <AppText style={s.sectionTitle}>Genel Bakış</AppText>
        {overview && overview.activeLinks > 0 && (
          <View style={s.activeLinksBadge}>
            <Ionicons name="link" size={11} color={P} />
            <AppText style={s.activeLinksText}>{overview.activeLinks} aktif link</AppText>
          </View>
        )}
      </View>
      <PeriodSelector value={period} onChange={handlePeriodChange} />
      {loading || !overview ? (
        <View style={s.statsGrid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[s.statCard, s.statCardSkeleton]} />
          ))}
        </View>
      ) : (
        <View style={s.statsGrid}>
          <StatCard
            icon="people-outline"
            label="Ziyaretçi"
            value={formatNumber(overview.visitors)}
            color="#4ECDC4"
            change={overview.visitorsChangePercent}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Dönüşüm"
            value={formatNumber(overview.conversions)}
            color="#45B7D1"
            change={overview.conversionsChangePercent}
          />
          <StatCard
            icon="wallet-outline"
            label="Kazanç"
            value={formatTl(overview.earning)}
            color="#F59E0B"
            change={overview.earningChangePercent}
          />
          <StatCard
            icon="trending-up-outline"
            label="Dönüşüm Oranı"
            value={formatRate(overview.conversionRate)}
            color="#FF6B6B"
          />
        </View>
      )}

      {/* Önemli Uyarılar ve Öneriler */}
      {insights.length > 0 && (
        <InsightListCard
          insights={insights}
          onAction={(route) => router.push(route as any)}
          style={s.insightCardWrap}
        />
      )}

      {/* Sana Özel Öneriler — niş kategoriden veya (linki yoksa) genel popüler indirimli */}
      {recommendations && recommendations.products.length > 0 && (
        <>
          <View style={s.overviewHeader}>
            <AppText style={s.sectionTitle}>
              {recommendations.dominantCategoryName ? 'Sana Özel' : 'Keşfet'}
            </AppText>
            <View style={s.recoBadge}>
              <Ionicons name="sparkles" size={11} color={P} />
              <AppText style={s.recoBadgeText} numberOfLines={1}>
                {recommendations.dominantCategoryName ?? 'Popüler İndirimli'}
              </AppText>
            </View>
          </View>
          <AppText style={s.recoHint}>
            {recommendations.dominantCategoryName
              ? `${recommendations.dominantCategoryName} kategorinde indirimli + henüz linklemediğin ürünler`
              : 'Henüz linkin yok. Popüler indirimli ürünlerden başlayıp ilk komisyonunu kazan.'}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.topLinksRow}
            style={s.topLinksScroll}
          >
            {recommendations.products.map((item) => {
              const imageUrl = item.image ? resolvePublicAssetUrl(item.image) : null;
              const hasCampaign = !!item.campaigns?.some((c) => !!c?.id && c.isActive === true);
              const discountPercent =
                item.originalBestPrice != null && item.originalBestPrice > item.bestPrice
                  ? Math.round(((item.originalBestPrice - item.bestPrice) / item.originalBestPrice) * 100)
                  : null;
              return (
                <Pressable
                  key={item.catalogId}
                  style={s.recoCard}
                  onPress={() =>
                    router.push(
                      (item.bestVariantCode
                        ? `/product-detail/${item.slug}?variantCode=${encodeURIComponent(item.bestVariantCode)}`
                        : `/product-detail/${item.slug}`) as any
                    )
                  }
                >
                  <View style={s.hotImageWrap}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={s.hotImage} resizeMode="cover" />
                    ) : (
                      <View style={s.topLinkImagePlaceholder}>
                        <Ionicons name="image-outline" size={20} color="#C8C4E0" />
                      </View>
                    )}
                    {discountPercent != null && discountPercent > 0 && (
                      <View style={s.hotDiscountBadge}>
                        <AppText style={s.hotDiscountText}>%{discountPercent}</AppText>
                      </View>
                    )}
                    {hasCampaign && (
                      <View style={s.hotCampaignBadge}>
                        <Ionicons name="flame" size={9} color="#fff" />
                        <AppText style={s.hotCampaignText}>Kampanya</AppText>
                      </View>
                    )}
                  </View>
                  <AppText style={s.topLinkName} numberOfLines={2}>
                    {item.name}
                  </AppText>
                  <View style={s.hotPriceRow}>
                    <AppText style={s.hotPrice} tone="rounded">
                      ₺{item.bestPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                    </AppText>
                    {item.originalBestPrice != null && item.originalBestPrice > item.bestPrice && (
                      <AppText style={s.hotOriginalPrice}>
                        ₺{item.originalBestPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                      </AppText>
                    )}
                  </View>
                  <View style={s.recoReasonRow}>
                    <Ionicons name="trending-up" size={11} color="#16A34A" />
                    <AppText style={s.recoReasonText} numberOfLines={1}>
                      Sana kazandırabilir
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* En İyi Linkler (period bazlı) */}
      {topLinks.length > 0 && (
        <>
          <AppText style={s.sectionTitle}>En İyi Linkler</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.topLinksRow}
            style={s.topLinksScroll}
          >
            {topLinks.map((link) => {
              const imageUrl = link.productImage ? resolvePublicAssetUrl(link.productImage) : null;
              return (
                <Pressable
                  key={link.linkId}
                  style={s.topLinkCard}
                  onPress={() => router.push(`/influencer/link-analytics/${link.linkId}` as any)}
                >
                  <View style={s.topLinkImageWrap}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={s.topLinkImage} resizeMode="cover" />
                    ) : (
                      <View style={s.topLinkImagePlaceholder}>
                        <Ionicons name="image-outline" size={20} color="#C8C4E0" />
                      </View>
                    )}
                    {link.variantCode && (
                      <View style={s.topLinkVariantBadge}>
                        <AppText style={s.topLinkVariantText} numberOfLines={1}>{link.variantCode}</AppText>
                      </View>
                    )}
                  </View>
                  <AppText style={s.topLinkName} numberOfLines={2}>
                    {link.productName ?? 'Ürün'}
                  </AppText>
                  <View style={s.topLinkStatRow}>
                    <View style={s.topLinkStat}>
                      <AppText style={s.topLinkStatValue} tone="rounded">{formatTl(link.earning)}</AppText>
                      <AppText style={s.topLinkStatLabel}>Kazanç</AppText>
                    </View>
                    <View style={s.topLinkDivider} />
                    <View style={s.topLinkStat}>
                      <AppText style={s.topLinkStatValue} tone="rounded">{formatRate(link.conversionRate)}</AppText>
                      <AppText style={s.topLinkStatLabel}>Dönüşüm</AppText>
                    </View>
                  </View>
                  <View style={s.topLinkVisitorRow}>
                    <Ionicons name="people-outline" size={11} color="#9A96B5" />
                    <AppText style={s.topLinkVisitorText}>
                      {formatNumber(link.visitors)} ziyaretçi · {formatNumber(link.conversions)} dönüşüm
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Aktif Kampanyalar — kampanya bazlı yönlendirme */}
      {campaigns.length > 0 && (
        <>
          <View style={s.overviewHeader}>
            <AppText style={s.sectionTitle}>Aktif Kampanyalar</AppText>
            <View style={s.campaignCountBadge}>
              <Ionicons name="megaphone" size={11} color="#F59E0B" />
              <AppText style={s.campaignCountText}>{campaigns.length}</AppText>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.topLinksRow}
            style={s.topLinksScroll}
          >
            {campaigns.map((camp) => {
              const imageUrl = camp.campaignImage ? resolvePublicAssetUrl(camp.campaignImage) : null;
              const discountLabel =
                camp.discountValue != null && camp.discountValue > 0
                  ? camp.discountType === 'PERCENT'
                    ? `%${camp.discountValue} İndirim`
                    : `${camp.discountValue.toLocaleString('tr-TR')} TL İndirim`
                  : camp.campaignType === 'FREESHIPPING'
                  ? 'Ücretsiz Kargo'
                  : camp.campaignType === 'COUPON'
                  ? 'Kupon'
                  : camp.campaignType === 'BUYXGETY'
                  ? 'Al-Kazan'
                  : 'Kampanya';
              return (
                <Pressable
                  key={camp.id}
                  style={s.campaignCard}
                  onPress={() =>
                    router.push(`/(influencer-tabs)/products?campaignId=${camp.id}&campaignName=${encodeURIComponent(camp.name)}` as any)
                  }
                >
                  <View style={s.campaignBanner}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={s.campaignBannerImg} resizeMode="cover" />
                    ) : (
                      <View style={s.campaignBannerFallback}>
                        <Ionicons name="megaphone-outline" size={32} color="rgba(255,255,255,0.4)" />
                      </View>
                    )}
                    <View style={s.campaignDiscountChip}>
                      <AppText style={s.campaignDiscountText}>{discountLabel}</AppText>
                    </View>
                  </View>
                  <View style={s.campaignInfo}>
                    <AppText style={s.campaignName} numberOfLines={2}>
                      {camp.name}
                    </AppText>
                    <View style={s.campaignFooter}>
                      <View style={s.campaignProductRow}>
                        <Ionicons name="cube-outline" size={11} color="#9A96B5" />
                        <AppText style={s.campaignProductText}>{camp.productCount} ürün</AppText>
                      </View>
                      <View style={s.campaignCta}>
                        <AppText style={s.campaignCtaText}>Ürünleri Gör</AppText>
                        <Ionicons name="arrow-forward" size={11} color={P} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Hemen Paylaş — indirim/kampanya vurgulu trend ürünler */}
      {hotPicks.length > 0 && (
        <>
          <View style={s.overviewHeader}>
            <AppText style={s.sectionTitle}>Hemen Paylaş</AppText>
            <View style={s.hotBadge}>
              <Ionicons name="flame" size={11} color="#FF6B6B" />
              <AppText style={s.hotBadgeText}>İndirim & Kampanya</AppText>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.topLinksRow}
            style={s.topLinksScroll}
          >
            {hotPicks.map((item) => {
              const imageUrl = item.image ? resolvePublicAssetUrl(item.image) : null;
              const hasCampaign = !!item.campaigns?.some((c) => !!c?.id && c.isActive === true);
              const discountPercent =
                item.originalBestPrice != null && item.originalBestPrice > item.bestPrice
                  ? Math.round(((item.originalBestPrice - item.bestPrice) / item.originalBestPrice) * 100)
                  : null;
              return (
                <Pressable
                  key={item.catalogId}
                  style={s.hotCard}
                  onPress={() =>
                    router.push(
                      (item.bestVariantCode
                        ? `/product-detail/${item.slug}?variantCode=${encodeURIComponent(item.bestVariantCode)}`
                        : `/product-detail/${item.slug}`) as any
                    )
                  }
                >
                  <View style={s.hotImageWrap}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={s.hotImage} resizeMode="cover" />
                    ) : (
                      <View style={s.topLinkImagePlaceholder}>
                        <Ionicons name="image-outline" size={20} color="#C8C4E0" />
                      </View>
                    )}
                    {discountPercent != null && discountPercent > 0 && (
                      <View style={s.hotDiscountBadge}>
                        <AppText style={s.hotDiscountText}>%{discountPercent}</AppText>
                      </View>
                    )}
                    {hasCampaign && (
                      <View style={s.hotCampaignBadge}>
                        <Ionicons name="flame" size={9} color="#fff" />
                        <AppText style={s.hotCampaignText}>Kampanya</AppText>
                      </View>
                    )}
                  </View>
                  <AppText style={s.topLinkName} numberOfLines={2}>
                    {item.name}
                  </AppText>
                  <View style={s.hotPriceRow}>
                    <AppText style={s.hotPrice} tone="rounded">
                      ₺{item.bestPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                    </AppText>
                    {item.originalBestPrice != null && item.originalBestPrice > item.bestPrice && (
                      <AppText style={s.hotOriginalPrice}>
                        ₺{item.originalBestPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                      </AppText>
                    )}
                  </View>
                  <View style={s.hotShareHint}>
                    <Ionicons name="add-circle-outline" size={12} color={P} />
                    <AppText style={s.hotShareHintText}>Link oluştur</AppText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Aylık Hedef İlerleme */}
      {progress && (
        <>
          <AppText style={s.sectionTitle}>Aylık Hedef</AppText>
          <View style={s.targetCard}>
            <View style={s.targetHeader}>
              <View style={s.targetLeft}>
                <AppText style={s.targetMonth}>
                  {new Date(progress.year, progress.month - 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                </AppText>
                <View style={[s.targetBadge, progress.bonusActive ? s.targetBadgeBonus : s.targetBadgeStd]}>
                  <Ionicons name={progress.bonusActive ? 'star' : 'star-outline'} size={10} color={progress.bonusActive ? '#F59E0B' : '#9A96B5'} />
                  <AppText style={[s.targetBadgeText, progress.bonusActive ? { color: '#F59E0B' } : { color: '#9A96B5' }]}>
                    %{(progress.currentRate * 100).toFixed(0)} komisyon
                  </AppText>
                </View>
              </View>
              <View style={s.targetRight}>
                <AppText style={s.targetCount} tone="rounded">{progress.achieved}</AppText>
                <AppText style={s.targetTotal}>/ {progress.target}</AppText>
              </View>
            </View>
            {/* Progress bar */}
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, { width: `${Math.min((progress.achieved / progress.target) * 100, 100)}%` }]} />
            </View>
            <AppText style={s.targetHint}>
              {progress.achieved >= progress.target
                ? `Tebrikler! Hedefinize ulaştınız. Sonraki ay %${(progress.bonusRate * 100).toFixed(0)} komisyon kazanacaksınız!`
                : `Hedefe ${progress.target - progress.achieved} satış kaldı. Ulaşırsanız sonraki ay %${(progress.bonusRate * 100).toFixed(0)} komisyon kazanırsınız!`}
            </AppText>
          </View>
        </>
      )}

      {/* Yaklaşan Kazançlar */}
      {projection && (
        <>
          <View style={s.overviewHeader}>
            <AppText style={s.sectionTitle}>Yaklaşan Kazançlar</AppText>
          </View>
          <Pressable
            style={s.projectionCard}
            onPress={() => router.push('/(influencer-tabs)/earnings' as any)}
          >
            <View style={s.projectionRow}>
              <View style={s.projectionCol}>
                <View style={[s.projectionDot, { backgroundColor: '#F59E0B' }]} />
                <AppText style={s.projectionLabel}>Bekleyen</AppText>
                <AppText style={s.projectionValue} tone="rounded">{formatTl(projection.pendingEarning)}</AppText>
              </View>
              <View style={s.projectionDivider} />
              <View style={s.projectionCol}>
                <View style={[s.projectionDot, { backgroundColor: '#2ECC71' }]} />
                <AppText style={s.projectionLabel}>Hazır</AppText>
                <AppText style={s.projectionValue} tone="rounded">{formatTl(projection.readyEarning)}</AppText>
              </View>
              <View style={s.projectionDivider} />
              <View style={s.projectionCol}>
                <View style={[s.projectionDot, { backgroundColor: '#45B7D1' }]} />
                <AppText style={s.projectionLabel}>Ödendi</AppText>
                <AppText style={s.projectionValue} tone="rounded">{formatTl(projection.paidEarning)}</AppText>
              </View>
            </View>
            {projection.expiringWithin7DaysCount > 0 && (
              <View style={s.projectionFooter}>
                <Ionicons name="time-outline" size={14} color="#16A34A" />
                <AppText style={s.projectionFooterText}>
                  7 gün içinde <AppText style={s.projectionFooterAmount}>{formatTl(projection.expiringWithin7DaysAmount)}</AppText> hazırlanacak
                </AppText>
                <Ionicons name="chevron-forward" size={14} color="#9A96B5" />
              </View>
            )}
            {projection.expiringWithin7DaysCount === 0 && projection.averageDaysUntilReady != null && projection.pendingEarning > 0 && (
              <View style={s.projectionFooter}>
                <Ionicons name="hourglass-outline" size={14} color="#9A96B5" />
                <AppText style={s.projectionFooterText}>
                  Ortalama {projection.averageDaysUntilReady} gün içinde olgunlaşacak
                </AppText>
              </View>
            )}
          </Pressable>
        </>
      )}

      {/* Satıcı Davet Linki */}
      <AppText style={s.sectionTitle}>Satıcı Davet Et</AppText>
      <Pressable
        style={[s.inviteBtn, creatingRef && { opacity: 0.7 }]}
        onPress={handleCreateSellerRef}
        disabled={creatingRef}
      >
        {creatingRef ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="storefront-outline" size={20} color="#fff" />
            <AppText style={s.inviteBtnText}>Satıcı Davet Linki Oluştur</AppText>
          </>
        )}
      </Pressable>
      <AppText style={s.inviteHint}>
        Davet ettiğiniz satıcı kayıt olup belirlenen minimum ürün sayısına ulaştığında, komisyon süresi boyunca satışlarından kazanç elde edersiniz.
      </AppText>

      {/* Davet Edilen Satıcılar */}
      {referrals.length > 0 && (
        <>
          <AppText style={s.sectionTitle}>Davet Edilen Satıcılar</AppText>
          <View style={s.refList}>
            {referrals.map((r) => (
              <ReferralCard key={r.id} item={r} />
            ))}
          </View>
        </>
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

  welcomeContent: { flex: 1 },

  // ─── İstisna Belgesi Uyarı Kartı ─────────────────────────────────────
  exemptionCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#7C5EFF',
    gap: 12,
  },
  exemptionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exemptionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: Fonts.rounded,
  },
  exemptionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 17,
    marginBottom: 8,
  },
  exemptionStatus: {
    flexDirection: 'row',
    gap: 14,
  },
  exemptionDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exemptionDotText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1631',
    marginBottom: 14,
  },

  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeLinksBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(141,115,255,0.1)',
    marginBottom: 14,
  },
  activeLinksText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8D73FF',
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
  statCardSkeleton: {
    height: 110,
    backgroundColor: '#F0EEFF',
    borderColor: '#F0EEFF',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  changeBadgePositive: { backgroundColor: 'rgba(22,163,74,0.1)' },
  changeBadgeNegative: { backgroundColor: 'rgba(255,107,107,0.1)' },
  changeText: {
    fontSize: 10,
    fontWeight: '800',
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

  // ─── Top Links (Yatay Scroll) ─────────────────────────────────────────
  topLinksScroll: {
    marginBottom: 24,
  },
  topLinksRow: {
    gap: 10,
    paddingRight: 4,
  },
  topLinkCard: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0EEFF',
    gap: 8,
  },
  topLinkImageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F7F6FB',
  },
  topLinkImage: {
    width: '100%',
    height: '100%',
  },
  topLinkImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLinkName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1631',
    lineHeight: 16,
    minHeight: 32,
  },
  topLinkStatRow: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFE',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  topLinkStat: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  topLinkStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1631',
  },
  topLinkStatLabel: {
    fontSize: 9,
    color: '#9A96B5',
    fontWeight: '600',
  },
  topLinkDivider: {
    width: 1,
    backgroundColor: '#E8E5F5',
    marginVertical: 4,
  },
  topLinkVisitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topLinkVisitorText: {
    fontSize: 10,
    color: '#9A96B5',
    flex: 1,
  },
  topLinkVariantBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(28,22,49,0.85)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: '85%',
  },
  topLinkVariantText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ─── Sana Özel Öneriler ────────────────────────────────────────────────
  recoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(141,115,255,0.1)',
    marginBottom: 14,
    maxWidth: '60%',
  },
  recoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: P,
    flexShrink: 1,
  },
  recoHint: {
    fontSize: 12,
    color: '#6B6883',
    lineHeight: 16,
    marginBottom: 12,
  },
  recoCard: {
    width: 165,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(141,115,255,0.25)',
    gap: 8,
  },
  recoReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F5F4FA',
  },
  recoReasonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    flexShrink: 1,
  },

  // ─── Aktif Kampanyalar ────────────────────────────────────────────────
  campaignCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.12)',
    marginBottom: 14,
  },
  campaignCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  campaignCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  campaignBanner: {
    width: '100%',
    height: 100,
    position: 'relative',
    backgroundColor: '#F59E0B',
  },
  campaignBannerImg: {
    width: '100%',
    height: '100%',
  },
  campaignBannerFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
  },
  campaignDiscountChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(28,22,49,0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  campaignDiscountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  campaignInfo: {
    padding: 12,
    gap: 8,
  },
  campaignName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1631',
    lineHeight: 17,
    minHeight: 34,
  },
  campaignFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F4FA',
  },
  campaignProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  campaignProductText: {
    fontSize: 11,
    color: '#9A96B5',
    fontWeight: '600',
  },
  campaignCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  campaignCtaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D73FF',
  },

  // ─── Hemen Paylaş (Hot Picks) ─────────────────────────────────────────
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.1)',
    marginBottom: 14,
  },
  hotBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  hotCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F0EEFF',
    gap: 8,
  },
  hotImageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F7F6FB',
    position: 'relative',
  },
  hotImage: {
    width: '100%',
    height: '100%',
  },
  hotDiscountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hotDiscountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  hotCampaignBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hotCampaignText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  hotPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  hotPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1631',
  },
  hotOriginalPrice: {
    fontSize: 11,
    color: '#C8C4E0',
    textDecorationLine: 'line-through',
  },
  hotShareHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F5F4FA',
  },
  hotShareHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8D73FF',
  },

  // ─── Earnings Projection Kartı ────────────────────────────────────────
  projectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EEFF',
    marginBottom: 24,
    gap: 12,
  },
  projectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectionCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  projectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  projectionLabel: {
    fontSize: 11,
    color: '#9A96B5',
    fontWeight: '600',
  },
  projectionValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1631',
  },
  projectionDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F0EEFF',
  },
  projectionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F7F6FB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  projectionFooterText: {
    fontSize: 12,
    color: '#3D3660',
    flex: 1,
  },
  projectionFooterAmount: {
    fontWeight: '800',
    color: '#16A34A',
  },

  // ─── Satıcı Davet ──────────────────────────────────────────────────────────
  inviteBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FF9F43',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inviteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  inviteHint: {
    fontSize: 12,
    color: '#9A96B5',
    lineHeight: 18,
    marginBottom: 24,
  },

  // ─── Referral Kartları ──────────────────────────────────────────────────────
  refList: {
    gap: 10,
    marginBottom: 24,
  },
  refCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  refHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  refBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  refDate: {
    fontSize: 11,
    color: '#9A96B5',
  },
  refPendingText: {
    fontSize: 13,
    color: '#9A96B5',
    marginBottom: 10,
  },
  refBody: {
    gap: 10,
  },
  refSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refSellerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(141,115,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refSellerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1631',
    flex: 1,
  },
  refShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(141,115,255,0.08)',
  },
  refShareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: P,
  },
  refCommissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refCommissionText: {
    fontSize: 11,
    color: '#9A96B5',
  },

  // ─── Step Tracker ───────────────────────────────────────────────────────────
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotDone: {
    backgroundColor: '#4ECDC4',
  },
  stepDotActive: {
    backgroundColor: P,
  },
  stepDotPending: {
    backgroundColor: '#E8E5F5',
  },
  stepLabel: {
    fontSize: 9,
    color: '#9A96B5',
    fontWeight: '600',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 10,
    color: '#8D73FF',
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: Fonts.rounded,
  },
  stepLabelDone: {
    color: '#4ECDC4',
  },
  stepDate: {
    fontSize: 8,
    color: '#C8C4E0',
    marginTop: 1,
  },
  stepConnector: {
    height: 2,
    flex: 0.5,
    backgroundColor: '#E8E5F5',
    marginTop: 9,
  },
  stepConnectorDone: {
    backgroundColor: '#4ECDC4',
  },

  // ─── Hızlı İşlemler ────────────────────────────────────────────────────────
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

  // ─── Seviye Rozeti ────────────────────────────────────────────────────
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EEFF',
    marginBottom: 20,
    gap: 12,
  },
  levelIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelContent: { flex: 1 },
  levelLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  levelRate: {
    fontSize: 12,
    color: '#9A96B5',
    marginTop: 1,
  },
  levelBonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBonusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },

  // ─── İçgörüler ────────────────────────────────────────────────────────
  insightCardWrap: {
    marginBottom: 24,
  },

  // ─── Aylık Hedef ─────────────────────────────────────────────────────
  targetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EEFF',
    marginBottom: 20,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetLeft: { gap: 6 },
  targetMonth: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1631',
    textTransform: 'capitalize',
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  targetBadgeStd: { backgroundColor: '#F5F4FA' },
  targetBadgeBonus: { backgroundColor: '#FEF3C7' },
  targetBadgeText: { fontSize: 11, fontWeight: '700' },
  targetRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  targetCount: {
    fontSize: 28,
    fontWeight: '800',
    color: P,
    fontFamily: Fonts.rounded,
  },
  targetTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9A96B5',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F0EEFF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: P,
    borderRadius: 4,
  },
  targetHint: {
    fontSize: 11,
    color: '#9A96B5',
    lineHeight: 16,
  },
});
