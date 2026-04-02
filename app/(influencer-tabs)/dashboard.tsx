import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import {
  createSellerReferralLink,
  getInfluencerDashboard,
  getMonthlyProgress,
  getMySellerReferrals,
  InfluencerDashboardDto,
  InfluencerSellerReferralDto,
  MonthlyProgressDto,
  SellerReferralStatus,
} from '@/features/influencer/api';

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


export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stats, setStats] = useState<InfluencerDashboardDto | null>(null);
  const [progress, setProgress] = useState<MonthlyProgressDto | null>(null);
  const [referrals, setReferrals] = useState<InfluencerSellerReferralDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRef, setCreatingRef] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        getInfluencerDashboard(),
        getMySellerReferrals(),
        getMonthlyProgress(),
      ])
        .then(([s, r, p]) => {
          setStats(s);
          setReferrals(r);
          setProgress(p);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

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

      {/* Seviye Rozeti */}
      {progress && <LevelBadge level={progress.level} bonusActive={progress.bonusActive} currentRate={progress.currentRate} />}

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
