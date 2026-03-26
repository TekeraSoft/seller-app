import { acceptInfluencerContract, getMyApplication } from '@/features/influencer/api';
import type { InfluencerApplication, InfluencerStatus } from '@/features/influencer/types';
import { useAuth } from '@/context/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const P = '#8D73FF';

const STEPS: { key: string; label: string; sub: string }[] = [
  { key: 'PENDING_PROFILE_REVIEW', label: 'Profil İncelemesi', sub: 'Bilgileriniz inceleniyor' },
  { key: 'PENDING_DOCUMENTS', label: 'Evrak Yükleme', sub: 'Gerekli evrakları yükleyin' },
  { key: 'PENDING_DOCUMENT_REVIEW', label: 'Evrak İncelemesi', sub: 'Evraklarınız inceleniyor' },
  { key: 'PENDING_CONTRACT', label: 'Sözleşme', sub: 'Influencer sözleşmesini onaylayın' },
  { key: 'ACTIVE', label: 'Aktif', sub: 'Başvurunuz onaylandı' },
];

function getStepIndex(status: InfluencerStatus): number {
  const map: Record<string, number> = {
    PENDING_PROFILE_REVIEW: 0,
    PENDING_DOCUMENTS: 1,
    PENDING_DOCUMENT_REVIEW: 2,
    PENDING_CONTRACT: 3,
    ACTIVE: 4,
  };
  return map[status] ?? 0;
}

// ─── Sözleşme metni ──────────────────────────────────────────────────────────

const CONTRACT_TEXT = `TEKERA21 ETKİLEYİCİ (INFLUENCER) İŞBİRLİĞİ SÖZLEŞMESİ

Son Güncelleme: Ocak 2026

Bu sözleşme; Tekera Teknoloji Ticaret ve Sanayi Limited Şirketi ("Tekera21") ile influencer başvurusunu tamamlayan kişi ("Etkileşimci / Influencer") arasında akdedilmiştir.

─────────────────────────────────────────

MADDE 1 — TANIMLAR

1.1. "Platform": Tekera21'in işlettiği tekera21.com alan adlı e-ticaret ve içerik platformu ile mobil uygulamalarını ifade eder.

1.2. "İçerik": Influencer tarafından oluşturulan fotoğraf, video, hikâye, reels, gönderi ve benzeri dijital materyalleri ifade eder.

1.3. "Kampanya": Tekera21 tarafından belirlenen ürün, hizmet veya marka tanıtım faaliyetlerini ifade eder.

─────────────────────────────────────────

MADDE 2 — SÖZLEŞMENİN KONUSU

İşbu sözleşme; Influencer'ın Tekera21 platformunda yer alan ürün ve hizmetleri sosyal medya kanallarında tanıtması, Tekera21'in ise Influencer'a belirlenen komisyon/ücret ödemesini yapması esasına dayanmaktadır.

─────────────────────────────────────────

MADDE 3 — TARAFLARIN YÜKÜMLÜLÜKLERİ

3.1. Influencer'ın Yükümlülükleri:

a) Paylaşılan içeriklerin doğru, yanıltıcı olmayan ve Türk Ticaret Kanunu ile Reklam Kanunu'na uygun olmasını sağlamak.

b) Ticari iş birliği olan paylaşımları "#reklam", "#işbirliği" veya "#sponsored" gibi açıklayıcı etiketlerle belirtmek.

c) Tekera21'in marka kimliğine zarar verecek, rakip platformları öne çıkaracak veya yanıltıcı bilgi içerecek içerik üretmemek.

d) Başvuruda beyan edilen kişisel ve finansal bilgilerin doğruluğunu korumak; değişiklik durumunda Tekera21'i derhal bilgilendirmek.

e) Tekera21'in önceden yazılı onayı olmaksızın platform aracılığıyla elde edilen gizli ticari bilgileri üçüncü kişilerle paylaşmamak.

3.2. Tekera21'in Yükümlülükleri:

a) Kampanya detaylarını Influencer'a önceden bildirmek.

b) Belirlenen komisyon veya ücret ödemelerini zamanında ve eksiksiz yapmak.

c) Influencer'ın kişisel verilerini KVKK kapsamında korumak.

─────────────────────────────────────────

MADDE 4 — ÖDEME KOŞULLARI

4.1. Ödemeler; Influencer tarafından sisteme kayıtlı IBAN numarasına, her ayın son iş günü yapılır.

4.2. Minimum ödeme eşiği 500 TL olup bu tutarın altındaki bakiyeler bir sonraki ödeme dönemine devredilir.

4.3. Vergi yükümlülükleri tamamen Influencer'a aittir. Tekera21, yasal zorunluluklar çerçevesinde stopaj kesintisi uygulayabilir.

4.4. Yanlış veya eksik banka bilgisinden kaynaklanacak ödeme gecikmeleri Tekera21'in sorumluluğunda değildir.

─────────────────────────────────────────

MADDE 5 — FİKRİ MÜLKİYET

5.1. Influencer, Tekera21 için ürettiği içeriklerin kullanım hakkını Tekera21'e devreder. Tekera21 bu içerikleri platform içi pazarlama faaliyetlerinde kullanabilir.

5.2. Influencer, ürettiği içeriklerde üçüncü kişilerin fikri mülkiyet haklarını ihlal etmeyeceğini taahhüt eder.

─────────────────────────────────────────

MADDE 6 — GİZLİLİK

6.1. Taraflar, işbu sözleşme kapsamında öğrendikleri ticari sırları ve gizli bilgileri sözleşmenin sona ermesinden itibaren 2 yıl süreyle gizli tutmakla yükümlüdür.

─────────────────────────────────────────

MADDE 7 — SÖZLEŞMENİN FESHİ

7.1. Her iki taraf da 15 gün önceden yazılı bildirimde bulunmak kaydıyla sözleşmeyi sonlandırabilir.

7.2. Influencer'ın aşağıdaki hallerde sözleşmesi derhal feshedilebilir:
   - Yanıltıcı içerik yayımlaması
   - Marka değerine zarar verecek paylaşım yapması
   - Başvuruda gerçeğe aykırı bilgi verdiğinin tespiti

7.3. Fesih durumunda Influencer'a ait birikmiş ödemeler varsa hesaplanarak tasfiye edilir.

─────────────────────────────────────────

MADDE 8 — KİŞİSEL VERİLER

8.1. Influencer'ın kişisel verileri, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında işlenir.

8.2. Veriler; sözleşme yükümlülüklerinin yerine getirilmesi, ödeme işlemleri ve yasal yükümlülüklerin karşılanması amacıyla kullanılır.

8.3. Influencer, kişisel verileri üzerindeki hakları için kvkk@tekera21.com adresine başvurabilir.

─────────────────────────────────────────

MADDE 9 — UYGULANACAK HUKUK VE YETKİLİ MAHKEME

9.1. İşbu sözleşme Türk Hukuku'na tabidir.

9.2. Sözleşmeden doğacak uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.

─────────────────────────────────────────

MADDE 10 — YÜRÜRLÜK

İşbu sözleşme, Influencer'ın dijital onay vermesiyle yürürlüğe girer ve her iki tarafça bağlayıcı kabul edilir.

─────────────────────────────────────────

Tekera Teknoloji Ticaret ve Sanayi Limited Şirketi
tekera21.com | destek@tekera21.com`;

// ─── Sözleşme Modalı ─────────────────────────────────────────────────────────

function ContractModal({
  visible,
  onAccept,
  onClose,
  accepting,
}: {
  visible: boolean;
  onAccept: () => void;
  onClose: () => void;
  accepting: boolean;
}) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  // Her açılışta sıfırla
  useEffect(() => {
    if (visible) setScrolledToBottom(false);
  }, [visible]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 32;
    if (isBottom) setScrolledToBottom(true);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={cm.overlay}>
        <SafeAreaView style={cm.sheet} edges={['bottom']}>
          {/* Başlık */}
          <View style={cm.header}>
            <View style={cm.headerLeft}>
              <View style={cm.headerIcon}>
                <Ionicons name="document-text" size={16} color={P} />
              </View>
              <Text style={cm.headerTitle}>Influencer Sözleşmesi</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="#3D3660" />
            </Pressable>
          </View>

          {!scrolledToBottom && (
            <View style={cm.scrollHint}>
              <Ionicons name="arrow-down-circle-outline" size={14} color={P} />
              <Text style={cm.scrollHintText}>Onaylamak için sözleşmenin tamamını okuyun</Text>
            </View>
          )}

          {/* Sözleşme metni */}
          <ScrollView
            style={cm.scroll}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator
          >
            <Text style={cm.contractText}>{CONTRACT_TEXT}</Text>
            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Onay butonu */}
          <View style={cm.footer}>
            <Pressable
              style={[
                cm.acceptBtn,
                (!scrolledToBottom || accepting) && cm.acceptBtnDisabled,
              ]}
              onPress={onAccept}
              disabled={!scrolledToBottom || accepting}
            >
              {accepting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={scrolledToBottom ? 'checkmark-circle' : 'lock-closed-outline'}
                    size={18}
                    color="#fff"
                  />
                  <Text style={cm.acceptBtnText}>
                    {scrolledToBottom ? 'Okudum, Onaylıyorum' : 'Sözleşmeyi sonuna kadar okuyun'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Ana Ekran ────────────────────────────────────────────────────────────────

export default function InfluencerStatusScreen() {
  const { signOut, isAuthenticated } = useAuth();
  const router = useRouter();
  const [app, setApp] = useState<InfluencerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contractVisible, setContractVisible] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getMyApplication();
      setApp(data);
    } catch {
      // no application
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAuthenticated) return <Redirect href="/auth" />;

  if (loading) {
    return (
      <SafeAreaView style={s.centered} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={P} />
      </SafeAreaView>
    );
  }

  if (!app) {
    return (
      <SafeAreaView style={s.centered} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: '#8B87A8', marginBottom: 12 }}>Başvuru bulunamadı.</Text>
        <Pressable onPress={() => router.replace('/influencer/apply' as any)}>
          <Text style={{ color: P, fontWeight: '700' }}>Başvuru Yap</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  async function handleAcceptContract() {
    setAccepting(true);
    try {
      await acceptInfluencerContract();
      setContractVisible(false);
      await load(true);
    } catch {
      // hata göster
    } finally {
      setAccepting(false);
    }
  }

  const isRejected = app.status === 'REJECTED';
  const isActive = app.status === 'ACTIVE';
  const canUploadDocs =
    app.status === 'PENDING_DOCUMENTS' || app.status === 'PENDING_DOCUMENT_REVIEW';
  const needsContract = app.status === 'PENDING_CONTRACT';
  const stepIndex = getStepIndex(app.status);

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ContractModal
        visible={contractVisible}
        onAccept={handleAcceptContract}
        onClose={() => setContractVisible(false)}
        accepting={accepting}
      />

      <View style={s.topBar}>
        <Text style={s.topTitle}>Başvuru Durumu</Text>
        <Pressable style={s.signOutBtn} onPress={signOut} hitSlop={12}>
          <Ionicons name="log-out-outline" size={22} color={P} />
          <Text style={s.signOutText}>Çıkış</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={P}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        {isRejected ? (
          <View style={s.rejectedCard}>
            <View style={s.rejectedIconBox}>
              <Ionicons name="close-circle" size={36} color="#D7263D" />
            </View>
            <Text style={s.rejectedTitle}>Başvurunuz Reddedildi</Text>
            {app.rejectionReason ? (
              <Text style={s.rejectedSub}>{app.rejectionReason}</Text>
            ) : (
              <Text style={s.rejectedSub}>Daha fazla bilgi için ekibimizle iletişime geçin.</Text>
            )}
          </View>
        ) : isActive ? (
          <View style={s.activeCard}>
            <Ionicons name="checkmark-circle" size={36} color="#4B8D5C" />
            <View>
              <Text style={s.activeTitle}>Başvurunuz Onaylandı!</Text>
              <Text style={s.activeSub}>Influencer hesabınız artık aktif.</Text>
            </View>
          </View>
        ) : (
          <View style={s.bannerCard}>
            <Ionicons name="time-outline" size={24} color={P} />
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>İnceleme Süreci</Text>
              <Text style={s.bannerSub}>
                Başvurunuzu takip edebilirsiniz. Sonuç e-posta ile bildirilecek.
              </Text>
            </View>
          </View>
        )}

        {/* Steps */}
        {!isRejected && (
          <View style={s.stepsCard}>
            {STEPS.map((step, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              const upcoming = i > stepIndex;
              return (
                <View key={step.key} style={s.stepRow}>
                  <View style={s.stepLeft}>
                    <View
                      style={[
                        s.stepDot,
                        done && s.stepDotDone,
                        active && s.stepDotActive,
                        upcoming && s.stepDotUpcoming,
                      ]}
                    >
                      {done ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : (
                        <Text
                          style={[
                            s.stepNum,
                            active && { color: '#fff' },
                            upcoming && { color: '#C8C4E0' },
                          ]}
                        >
                          {i + 1}
                        </Text>
                      )}
                    </View>
                    {i < STEPS.length - 1 && (
                      <View style={[s.stepConnector, done && s.stepConnectorDone]} />
                    )}
                  </View>
                  <View style={[s.stepContent, i < STEPS.length - 1 && { paddingBottom: 24 }]}>
                    <Text
                      style={[
                        s.stepLabel,
                        active && { color: P },
                        done && { color: '#4B8D5C' },
                        upcoming && { color: '#B0AACC' },
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text style={[s.stepSub, upcoming && { color: '#C8C4E0' }]}>
                      {step.sub}
                    </Text>
                  </View>
                  {active && (
                    <View style={s.activeBadge}>
                      <Text style={s.activeBadgeText}>Şu An</Text>
                    </View>
                  )}
                  {done && (
                    <View style={s.doneBadge}>
                      <Text style={s.doneBadgeText}>Tamam</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Evrak yükleme butonu */}
        {canUploadDocs && (
          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && { opacity: 0.82 }]}
            onPress={() => router.push('/influencer/documents' as any)}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={s.actionBtnText}>
              {app.status === 'PENDING_DOCUMENT_REVIEW'
                ? 'Evrakları Görüntüle / Güncelle'
                : 'Evrak Yükle'}
            </Text>
          </Pressable>
        )}

        {/* Sözleşme butonu */}
        {needsContract && (
          <Pressable
            style={({ pressed }) => [s.actionBtn, s.contractBtn, pressed && { opacity: 0.82 }]}
            onPress={() => setContractVisible(true)}
          >
            <Ionicons name="document-text-outline" size={20} color="#fff" />
            <Text style={s.actionBtnText}>Sözleşmeyi Görüntüle ve Onayla</Text>
          </Pressable>
        )}

        {!isActive && !isRejected && (
          <View style={s.refreshHint}>
            <Ionicons name="refresh-outline" size={13} color="#9A96B5" />
            <Text style={s.refreshHintText}>Durumu güncellemek için aşağı çekin</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F6FB' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F6FB',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAF8',
    backgroundColor: '#fff',
  },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#1C1631' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signOutText: { fontSize: 13, fontWeight: '600', color: P },

  scroll: { padding: 16, gap: 14, paddingBottom: 48 },

  bannerCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(141,115,255,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD7FF',
    padding: 16,
  },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#1C1631', marginBottom: 3 },
  bannerSub: { fontSize: 12, color: '#8B87A8', lineHeight: 17 },

  rejectedCard: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(215,38,61,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(215,38,61,0.2)',
    padding: 24,
  },
  rejectedIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(215,38,61,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  rejectedTitle: { fontSize: 16, fontWeight: '800', color: '#D7263D' },
  rejectedSub: { fontSize: 13, color: '#8B2232', textAlign: 'center', lineHeight: 19 },

  activeCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(75,141,92,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(75,141,92,0.25)',
    padding: 20,
  },
  activeTitle: { fontSize: 15, fontWeight: '800', color: '#2D5C3B' },
  activeSub: { fontSize: 12, color: '#4B8D5C', marginTop: 3 },

  stepsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECEAF8',
    padding: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepLeft: { alignItems: 'center', width: 28 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F3F8',
    borderWidth: 2,
    borderColor: '#DDD7FF',
  },
  stepDotDone: { backgroundColor: '#4B8D5C', borderColor: '#4B8D5C' },
  stepDotActive: { backgroundColor: P, borderColor: P },
  stepDotUpcoming: { backgroundColor: '#F8F7FE', borderColor: '#E9E6F8' },
  stepConnector: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: '#E5E3F5',
    marginVertical: 2,
  },
  stepConnectorDone: { backgroundColor: '#4B8D5C' },
  stepNum: { fontSize: 12, fontWeight: '700', color: P },
  stepContent: { flex: 1, paddingBottom: 8 },
  stepLabel: { fontSize: 14, fontWeight: '700', color: '#1C1631' },
  stepSub: { fontSize: 12, color: '#8B87A8', marginTop: 2 },

  activeBadge: {
    backgroundColor: 'rgba(141,115,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '700', color: P },
  doneBadge: {
    backgroundColor: 'rgba(75,141,92,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  doneBadgeText: { fontSize: 10, fontWeight: '700', color: '#4B8D5C' },

  actionBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: P,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: P,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  contractBtn: {
    backgroundColor: '#2E2350',
    shadowColor: '#2E2350',
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  refreshHint: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshHintText: { fontSize: 11, color: '#9A96B5' },
});

// ─── Modal stilleri ───────────────────────────────────────────────────────────

const cm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEFF',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(141,115,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1C1631' },

  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(141,115,255,0.07)',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAF8',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  scrollHintText: { fontSize: 12, color: P, fontWeight: '600' },

  scroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  contractText: {
    fontSize: 13,
    color: '#3D3660',
    lineHeight: 22,
    fontFamily: 'monospace',
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EEFF',
  },
  acceptBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#4B8D5C',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnDisabled: {
    backgroundColor: '#C8C4E0',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
