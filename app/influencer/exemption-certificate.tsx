import {
  getExemptionStatus,
  updateInfluencerBankInfo,
  uploadInfluencerDocument,
  ExemptionStatusDto,
} from '@/features/influencer/api';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const P = '#8D73FF';

// ─── Türkiye Bankaları ───────────────────────────────────────────────────────

const TURKISH_BANKS = [
  'Ziraat Bankası', 'Halkbank', 'Vakıfbank',
  'Ziraat Katılım Bankası', 'Vakıf Katılım Bankası', 'Emlak Katılım Bankası',
  'Türkiye İş Bankası', 'Garanti BBVA', 'Yapı ve Kredi Bankası',
  'Akbank', 'QNB Finansbank', 'Denizbank',
  'TEB (Türk Ekonomi Bankası)', 'ING Bank', 'Şekerbank',
  'Fibabanka', 'Alternatifbank', 'Burgan Bank',
  'Odeabank', 'ICBC Turkey Bank', 'Anadolubank', 'Turkish Bank',
  'Kuveyt Türk', 'Albaraka Türk', 'Türkiye Finans Katılım Bankası',
  'HSBC', 'Citibank', 'Deutsche Bank', 'Rabobank', 'JPMorgan Chase',
  'PTT (Posta Çeki)',
];

// ─── Banka Seçici Modal ─────────────────────────────────────────────────────

function BankPickerModal({
  visible, selected, onSelect, onClose,
}: { visible: boolean; selected: string; onSelect: (b: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? TURKISH_BANKS.filter((b) => b.toLowerCase().includes(search.toLowerCase()))
    : TURKISH_BANKS;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.handle} />
          <View style={ms.header}>
            <Text style={ms.headerTitle}>Banka Seçin</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="#3D3660" />
            </Pressable>
          </View>
          <View style={ms.searchRow}>
            <Ionicons name="search" size={16} color="#B0AACC" />
            <TextInput
              style={ms.searchInput} value={search} onChangeText={setSearch}
              placeholder="Banka ara..." placeholderTextColor="#B0AACC" autoFocus
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#B0AACC" />
              </Pressable>
            )}
          </View>
          <FlatList
            data={filtered} keyExtractor={(item, i) => `${item}-${i}`}
            style={ms.list} keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const sel = item === selected;
              return (
                <Pressable
                  style={({ pressed }) => [ms.bankItem, sel && ms.bankItemSel, pressed && { opacity: 0.7 }]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <Text style={[ms.bankItemText, sel && ms.bankItemTextSel]}>{item}</Text>
                  {sel && <Ionicons name="checkmark-circle" size={18} color={P} />}
                </Pressable>
              );
            }}
            ListEmptyComponent={<View style={ms.empty}><Text style={ms.emptyText}>Banka bulunamadı.</Text></View>}
          />
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD7FF', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0EEFF' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1C1631' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 14, paddingHorizontal: 14, backgroundColor: '#F7F6FB', borderRadius: 12, borderWidth: 1.5, borderColor: '#ECEAF8', height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: '#1C1631' },
  list: { flexGrow: 0 },
  bankItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F7F6FB' },
  bankItemSel: { backgroundColor: 'rgba(141,115,255,0.07)' },
  bankItemText: { fontSize: 14, color: '#3D3660' },
  bankItemTextSel: { color: P, fontWeight: '700' },
  empty: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: '#9A96B5', fontSize: 14 },
});

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function formatIban(raw: string): string {
  const digits = raw.replace(/\s/g, '').toUpperCase();
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

// ─── Bilgi Kartları ─────────────────────────────────────────────────────────

function InfoSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
          <Ionicons name="document-text" size={14} color="#F59E0B" />
        </View>
        <Text style={s.sectionTitle}>İstisna Belgesi Nedir?</Text>
      </View>

      <View style={s.infoCard}>
        <Text style={s.infoText}>
          Sosyal içerik üreticisi olarak kazanç elde edebilmek için vergi dairesinden{' '}
          <Text style={s.bold}>İstisna Belgesi</Text> (193 Sayılı Kanunun Mükerrer 20/B Maddesi) almanız gerekmektedir.{'\n\n'}
          Bu belgeyle açtığınız <Text style={s.bold}>influencer hesabına</Text> gelen gelirler üzerinden banka otomatik vergi kesintisi yaparak vergi dairesine öder. Böylece defter tutma zahmetinden kurtulursunuz.
        </Text>
      </View>

      <Pressable
        style={s.expandBtn}
        onPress={() => setExpanded(!expanded)}
      >
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={P} />
        <Text style={s.expandBtnText}>
          {expanded ? 'Detayları Gizle' : 'İstisna Belgesi Nasıl Alınır?'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={s.detailsContainer}>
          {/* Nereden Alınır */}
          <View style={s.detailBlock}>
            <View style={s.detailHeader}>
              <Ionicons name="location-outline" size={16} color={P} />
              <Text style={s.detailTitle}>Nereden Alınır?</Text>
            </View>
            <View style={s.stepRow}>
              <View style={s.stepBullet}><Text style={s.stepNum}>1</Text></View>
              <Text style={s.stepText}>
                <Text style={s.bold}>Fiziksel Başvuru:</Text> İkametgahınıza bağlı en yakın vergi dairesine kimliğinizle şahsen gidip başvuruyorsunuz.
              </Text>
            </View>
            <View style={s.stepRow}>
              <View style={s.stepBullet}><Text style={s.stepNum}>2</Text></View>
              <Text style={s.stepText}>
                <Text style={s.bold}>Online Başvuru:</Text> gib.gov.tr → Dijital Vergi Dairesi → İşlem Başlat → Vergi İşlemleri → "Sosyal İçerik Üreticiliği ile Mobil Cihaz Uygulama Geliştiriciliği İstisna Belgesi Talebi Dilekçesi" doldurulur.
              </Text>
            </View>
          </View>

          {/* Başvuruda Neler İstenir */}
          <View style={s.detailBlock}>
            <View style={s.detailHeader}>
              <Ionicons name="clipboard-outline" size={16} color={P} />
              <Text style={s.detailTitle}>Başvuruda Neler İstenir?</Text>
            </View>
            <View style={s.bulletList}>
              <Text style={s.bulletText}>• Nüfus cüzdanı / kimlik</Text>
              <Text style={s.bulletText}>• Dilekçe (vergi dairesinden alınır veya online doldurulur)</Text>
              <Text style={s.bulletText}>• Hangi platformlarda içerik ürettiğinize dair bilgi</Text>
              <Text style={s.bulletText}>• Geçmiş gelirler ve takipçi sayınız gibi bilgiler istenebilir</Text>
            </View>
          </View>

          {/* Ne Kadar Sürer */}
          <View style={s.detailBlock}>
            <View style={s.detailHeader}>
              <Ionicons name="time-outline" size={16} color={P} />
              <Text style={s.detailTitle}>Ne Kadar Sürer?</Text>
            </View>
            <Text style={s.detailText}>
              Başvurunuz genellikle <Text style={s.bold}>1–3 iş günü</Text> içinde değerlendirilir ve e-Devlet üzerinden PDF formatında istisna belgesi oluşturulur.
            </Text>
          </View>

          {/* Belgeyi Aldıktan Sonra */}
          <View style={s.detailBlock}>
            <View style={s.detailHeader}>
              <Ionicons name="checkmark-done-outline" size={16} color="#4ECDC4" />
              <Text style={s.detailTitle}>Belgeyi Aldıktan Sonra</Text>
            </View>
            <View style={s.bulletList}>
              <Text style={s.bulletText}>• Belgeyle istediğiniz bir Türk bankasına gidip <Text style={s.bold}>influencer hesabı</Text> açın</Text>
              <Text style={s.bulletText}>• Hesap açtıktan sonra <Text style={s.bold}>1 ay içinde</Text> banka hesap bilgilerini vergi dairesine bildirin</Text>
              <Text style={s.bulletText}>• Tüm kazançlar <Text style={s.bold}>yalnızca bu hesaba</Text> alınmalı — ödemelerin 1 TL'si bile bu hesap dışında tahsil edilirse istisna kapsamından çıkılır</Text>
            </View>
          </View>

          {/* 2026 Gelir Sınırı */}
          <View style={[s.detailBlock, s.warningBlock]}>
            <View style={s.detailHeader}>
              <Ionicons name="warning-outline" size={16} color="#F59E0B" />
              <Text style={[s.detailTitle, { color: '#92400E' }]}>2026 Gelir Sınırı</Text>
            </View>
            <Text style={[s.detailText, { color: '#92400E' }]}>
              2026 yılı için istisna sınırı <Text style={s.bold}>5.300.000 TL</Text>. Bu sınırı aşarsanız tüm geliriniz beyanname ile vergilendirilir.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Ana Ekran ──────────────────────────────────────────────────────────────

export default function ExemptionCertificateScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exemption, setExemption] = useState<ExemptionStatusDto | null>(null);

  // Belge yükleme
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Banka bilgileri
  const [iban, setIban] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [bankError, setBankError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getExemptionStatus();
      setExemption(data);
      if (data.iban) setIban(formatIban(data.iban));
      if (data.accountHolderName) setAccountHolderName(data.accountHolderName);
      if (data.bankName) setBankName(data.bankName);
      if (data.hasBankInfo) setBankSaved(true);
    } catch {
      Alert.alert('Hata', 'Bilgiler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function pickAndUploadCertificate() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setUploading(true);
      setUploadedFileName(asset.name);

      await uploadInfluencerDocument(
        'EXEMPTION_CERTIFICATE',
        asset.uri,
        asset.name,
        asset.mimeType ?? 'application/octet-stream',
      );

      setExemption((prev) => prev ? {
        ...prev,
        certificateUploaded: true,
        certificateStatus: 'PENDING',
        certificateRejectionNote: null,
      } : prev);
    } catch {
      Alert.alert('Hata', 'Belge yüklenemedi, tekrar deneyin.');
    } finally {
      setUploading(false);
    }
  }

  async function saveBankInfo() {
    const rawIban = iban.replace(/\s/g, '');
    if (rawIban.length < 16) {
      setBankError('Geçerli bir IBAN girin (örn: TR33 0006 1005 1978 6457 8413 26)');
      return;
    }
    if (!accountHolderName.trim()) {
      setBankError('Hesap sahibi adı zorunludur.');
      return;
    }
    if (!bankName) {
      setBankError('Banka seçimi zorunludur.');
      return;
    }
    setBankError('');
    setBankSaving(true);
    try {
      await updateInfluencerBankInfo({
        iban: rawIban,
        accountHolderName: accountHolderName.trim(),
        bankName,
      });
      setBankSaved(true);
      setExemption((prev) => prev ? { ...prev, hasBankInfo: true, iban: rawIban, accountHolderName: accountHolderName.trim(), bankName } : prev);
    } catch (e: any) {
      setBankError(e?.response?.data?.message ?? 'Banka bilgileri kaydedilemedi, tekrar deneyin.');
    } finally {
      setBankSaving(false);
    }
  }

  const certUploaded = exemption?.certificateUploaded ?? false;
  const certStatus = exemption?.certificateStatus;
  const certRejected = certStatus === 'REJECTED';
  const certVerified = certStatus === 'VERIFIED';
  const certPending = certStatus === 'PENDING';
  const hasBankInfo = exemption?.hasBankInfo ?? false;
  const allDone = certVerified && hasBankInfo;

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={P} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <BankPickerModal
        visible={bankPickerVisible} selected={bankName}
        onSelect={(b) => { setBankName(b); setBankSaved(false); }}
        onClose={() => setBankPickerVisible(false)}
      />

      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={P} />
        </Pressable>
        <Text style={s.topTitle}>İstisna Belgesi & Banka Hesabı</Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Tamamlandı Durumu */}
          {allDone && (
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={24} color="#4B8D5C" />
              <View style={{ flex: 1 }}>
                <Text style={s.successTitle}>Tebrikler!</Text>
                <Text style={s.successText}>İstisna belgeniz onaylandı ve banka hesabınız tanımlı. Kazançlarınız bu hesaba aktarılacak.</Text>
              </View>
            </View>
          )}

          {/* Bilgi Bölümü */}
          <InfoSection />

          {/* ─── İstisna Belgesi Yükleme ─── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIcon, certVerified ? { backgroundColor: 'rgba(75,141,92,0.12)' } : undefined]}>
                <Ionicons
                  name={certVerified ? 'checkmark-circle' : 'document-attach'}
                  size={14}
                  color={certVerified ? '#4B8D5C' : P}
                />
              </View>
              <Text style={s.sectionTitle}>İstisna Belgesi</Text>
              {certVerified && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#4B8D5C" />
                  <Text style={s.verifiedBadgeText}>Onaylandı</Text>
                </View>
              )}
              {certPending && (
                <View style={s.pendingBadge}>
                  <Ionicons name="time" size={12} color={P} />
                  <Text style={s.pendingBadgeText}>İnceleniyor</Text>
                </View>
              )}
            </View>

            {certRejected && (
              <View style={s.rejectionBox}>
                <Ionicons name="close-circle" size={14} color="#B91C1C" />
                <Text style={s.rejectionText}>
                  {exemption?.certificateRejectionNote ?? 'Belgeniz reddedildi — lütfen tekrar yükleyin.'}
                </Text>
              </View>
            )}

            {!certUploaded && (
              <View style={s.infoCard}>
                <Ionicons name="information-circle-outline" size={16} color={P} />
                <Text style={s.infoText}>
                  e-Devlet üzerinden aldığınız İstisna Belgesini yükleyin.
                </Text>
              </View>
            )}

            {uploadedFileName && !certVerified ? (
              <View style={s.fileChip}>
                <Ionicons name="document" size={14} color={P} />
                <Text style={s.fileChipText} numberOfLines={1}>{uploadedFileName}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                s.uploadCertBtn,
                uploading && { opacity: 0.6 },
                certVerified && s.uploadCertBtnDone,
                pressed && { opacity: 0.8 },
              ]}
              onPress={pickAndUploadCertificate}
              disabled={uploading || certVerified}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={certUploaded && !certRejected ? 'refresh' : 'cloud-upload-outline'}
                    size={18}
                    color="#fff"
                  />
                  <Text style={s.uploadCertBtnText}>
                    {certVerified ? 'Onaylandı' : certUploaded && !certRejected ? 'Tekrar Yükle' : 'İstisna Belgesi Yükle'}
                  </Text>
                </>
              )}
            </Pressable>
            <Text style={s.pdfHint}>Yalnızca PDF formatında yükleyebilirsiniz.</Text>
          </View>

          {/* ─── İstisna Hesabı Banka Bilgileri ─── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIcon, hasBankInfo ? { backgroundColor: 'rgba(75,141,92,0.12)' } : undefined]}>
                <Ionicons name="card" size={14} color={hasBankInfo ? '#4B8D5C' : P} />
              </View>
              <Text style={s.sectionTitle}>İstisna Hesabı Banka Bilgileri</Text>
              {bankSaved && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#4B8D5C" />
                  <Text style={s.verifiedBadgeText}>Kaydedildi</Text>
                </View>
              )}
            </View>

            <View style={s.infoCard}>
              <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
              <Text style={s.infoText}>
                Buraya girdiğiniz banka hesabı, <Text style={s.bold}>İstisna Belgesi ile açılmış</Text> influencer/içerik üretici hesabı olmalıdır. Kazançlarınız yalnızca bu hesaba aktarılır.{'\n\n'}Bu hesap dışında 1 TL bile tahsilat yapılması halinde istisna kapsamından çıkarsınız. Bu durumda <Text style={s.bold}>vergi ziyaı cezası, gecikme faizi ve ek cezai yaptırımlar</Text> uygulanabilir.
              </Text>
            </View>

            {/* IBAN */}
            <View style={s.field}>
              <Text style={s.label}>IBAN <Text style={s.req}>Zorunlu</Text></Text>
              <View style={s.ibanRow}>
                <View style={s.ibanPrefix}>
                  <Text style={s.ibanPrefixText}>TR</Text>
                </View>
                <TextInput
                  style={s.ibanInput}
                  value={iban.replace(/^TR\s?/i, '')}
                  onChangeText={(v) => {
                    const raw = v.replace(/[^0-9]/g, '').slice(0, 24);
                    setIban(formatIban('TR' + raw));
                    setBankSaved(false);
                    if (bankError) setBankError('');
                  }}
                  placeholder="____ ____ ____ ____ ____ __"
                  placeholderTextColor="#B0AACC"
                />
              </View>
            </View>

            {/* Hesap Sahibi */}
            <View style={s.field}>
              <Text style={s.label}>Hesap Sahibi Adı <Text style={s.req}>Zorunlu</Text></Text>
              <TextInput
                style={s.input}
                value={accountHolderName}
                onChangeText={(v) => { setAccountHolderName(v); setBankSaved(false); }}
                placeholder="Ad Soyad / Firma Ünvanı"
                placeholderTextColor="#B0AACC"
                autoCapitalize="words"
              />
            </View>

            {/* Banka Seçici */}
            <View style={s.field}>
              <Text style={s.label}>Banka <Text style={s.req}>Zorunlu</Text></Text>
              <Pressable
                style={({ pressed }) => [s.bankSelect, pressed && { opacity: 0.8 }]}
                onPress={() => setBankPickerVisible(true)}
              >
                <Ionicons name="business-outline" size={16} color={bankName ? '#3D3660' : '#B0AACC'} />
                <Text style={[s.bankSelectText, !bankName && s.bankSelectPlaceholder]}>
                  {bankName || 'Banka seçin...'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#B0AACC" />
              </Pressable>
            </View>

            {!!bankError && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={14} color="#B91C1C" />
                <Text style={s.errorText}>{bankError}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [s.saveBtn, (bankSaving || pressed) && { opacity: 0.8 }]}
              onPress={saveBankInfo}
              disabled={bankSaving}
            >
              {bankSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={bankSaved ? 'checkmark-circle' : 'save-outline'} size={16} color="#fff" />
                  <Text style={s.saveBtnText}>{bankSaved ? 'Güncelle' : 'Kaydet'}</Text>
                </>
              )}
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F5FF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F5FF' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#ECEAF8', backgroundColor: '#fff',
  },
  backBtn: { width: 34, alignItems: 'center' },
  topTitle: { fontSize: 15, fontWeight: '700', color: '#1C1631' },

  scroll: { padding: 16, gap: 14, paddingBottom: 48 },

  // ─── Success Banner ──────────────────────────────────────────────────
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(75,141,92,0.08)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(75,141,92,0.2)', padding: 16,
  },
  successTitle: { fontSize: 15, fontWeight: '800', color: '#4B8D5C' },
  successText: { fontSize: 12, color: '#4B8D5C', lineHeight: 18, marginTop: 2 },

  // ─── Section ─────────────────────────────────────────────────────────
  section: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 16, gap: 12,
    borderWidth: 1, borderColor: '#ECEAF8',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(141,115,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1C1631', flex: 1 },

  // ─── Badges ──────────────────────────────────────────────────────────
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(75,141,92,0.10)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  verifiedBadgeText: { fontSize: 10, fontWeight: '700', color: '#4B8D5C' },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(141,115,255,0.10)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: '700', color: P },

  // ─── Info & Expand ───────────────────────────────────────────────────
  infoCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: 'rgba(141,115,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: '#DDD7FF', padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: '#5D5677', lineHeight: 18 },
  bold: { fontWeight: '700' },

  expandBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, borderRadius: 12,
    backgroundColor: 'rgba(141,115,255,0.08)',
  },
  expandBtnText: { fontSize: 13, fontWeight: '700', color: P },

  // ─── Details ─────────────────────────────────────────────────────────
  detailsContainer: { gap: 12 },
  detailBlock: {
    backgroundColor: '#FAFAFE', borderRadius: 14,
    borderWidth: 1, borderColor: '#F0EEFF', padding: 14, gap: 8,
  },
  warningBlock: {
    backgroundColor: '#FFFBEB', borderColor: '#FDE68A',
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  detailTitle: { fontSize: 13, fontWeight: '700', color: '#1C1631' },
  detailText: { fontSize: 12, color: '#5D5677', lineHeight: 18 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepBullet: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: P, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  stepNum: { color: '#fff', fontSize: 11, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 12, color: '#5D5677', lineHeight: 18 },
  bulletList: { gap: 4, marginLeft: 2 },
  bulletText: { fontSize: 12, color: '#5D5677', lineHeight: 18 },

  // ─── Upload Certificate ──────────────────────────────────────────────
  rejectionBox: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: '#FEF2F2', borderRadius: 10,
    borderWidth: 1, borderColor: '#FECACA', padding: 10,
  },
  rejectionText: { flex: 1, color: '#B91C1C', fontSize: 12, lineHeight: 17 },

  fileChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(141,115,255,0.08)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  fileChipText: { flex: 1, fontSize: 12, color: P, fontWeight: '600' },

  uploadCertBtn: {
    height: 48, borderRadius: 14,
    backgroundColor: P,
    flexDirection: 'row', gap: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadCertBtnDone: { backgroundColor: '#4B8D5C' },
  uploadCertBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  pdfHint: { fontSize: 11, color: '#9A96B5', textAlign: 'center', marginTop: 6 },

  // ─── Bank Info ───────────────────────────────────────────────────────
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#3D3660' },
  req: {
    fontSize: 10, fontWeight: '700', color: P,
    backgroundColor: 'rgba(141,115,255,0.10)',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5,
  },

  ibanRow: {
    height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD7FF', backgroundColor: '#FBFAFF',
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  ibanPrefix: {
    height: '100%', paddingHorizontal: 12,
    backgroundColor: '#F3F1FF', justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: '#DDD7FF',
  },
  ibanPrefixText: { fontSize: 14, fontWeight: '700', color: '#3D3660' },
  ibanInput: { flex: 1, paddingHorizontal: 12, fontSize: 14, color: '#1C1631', letterSpacing: 1.5 },

  input: {
    height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD7FF', backgroundColor: '#FBFAFF',
    paddingHorizontal: 14, fontSize: 14, color: '#1C1631',
  },

  bankSelect: {
    height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD7FF', backgroundColor: '#FBFAFF',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10,
  },
  bankSelectText: { flex: 1, fontSize: 14, color: '#1C1631' },
  bankSelectPlaceholder: { color: '#B0AACC' },

  errorBox: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: '#FEF2F2', borderRadius: 10,
    borderWidth: 1, borderColor: '#FECACA', padding: 10,
  },
  errorText: { flex: 1, color: '#B91C1C', fontSize: 12 },

  saveBtn: {
    height: 46, borderRadius: 12, backgroundColor: P,
    flexDirection: 'row', gap: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
