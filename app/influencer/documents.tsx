import { getExemptionStatus, getMyApplication, getMyDocuments, updateCompanyType, updateInfluencerBankInfo, uploadInfluencerDocument, ExemptionStatusDto } from '@/features/influencer/api';
import {
  BIREYSEL_DOCUMENTS,
  DOCUMENT_LABELS,
  InfluencerCompanyType,
  InfluencerDocumentType,
  LTD_DOCUMENTS,
} from '@/features/influencer/types';
import { useChat } from '@/context/chat-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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

const PURPLE = '#8D73FF';

// ─── Türkiye Bankaları ───────────────────────────────────────────────────────

const TURKISH_BANKS = [
  // Kamu
  'Ziraat Bankası',
  'Halkbank',
  'Vakıfbank',
  'Ziraat Katılım Bankası',
  'Vakıf Katılım Bankası',
  'Emlak Katılım Bankası',
  // Özel mevduat
  'Türkiye İş Bankası',
  'Garanti BBVA',
  'Yapı ve Kredi Bankası',
  'Akbank',
  'QNB Finansbank',
  'Denizbank',
  'TEB (Türk Ekonomi Bankası)',
  'ING Bank',
  'Şekerbank',
  'Fibabanka',
  'Alternatifbank',
  'Burgan Bank',
  'Odeabank',
  'ICBC Turkey Bank',
  'Anadolubank',
  'Turkish Bank',
  // Katılım
  'Kuveyt Türk',
  'Albaraka Türk',
  'Türkiye Finans Katılım Bankası',
  // Yabancı
  'HSBC',
  'Citibank',
  'Deutsche Bank',
  'Rabobank',
  'JPMorgan Chase',
  // Diğer
  'PTT (Posta Çeki)',
];

// ─── Banka Seçici Modal ───────────────────────────────────────────────────────

function BankPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (bank: string) => void;
  onClose: () => void;
}) {
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
              style={ms.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Banka ara..."
              placeholderTextColor="#B0AACC"
              autoFocus
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#B0AACC" />
              </Pressable>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item, index) => `${item}-${index}`}
            style={ms.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = item === selected;
              return (
                <Pressable
                  style={({ pressed }) => [
                    ms.bankItem,
                    isSelected && ms.bankItemSelected,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <Text style={[ms.bankItemText, isSelected && ms.bankItemTextSelected]}>
                    {item}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={PURPLE} />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={ms.empty}>
                <Text style={ms.emptyText}>Banka bulunamadı.</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD7FF',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0EEFF',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1C1631' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 14, paddingHorizontal: 14,
    backgroundColor: '#F7F6FB',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#ECEAF8',
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1C1631' },
  list: { flexGrow: 0 },
  bankItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F7F6FB',
  },
  bankItemSelected: { backgroundColor: 'rgba(141,115,255,0.07)' },
  bankItemText: { fontSize: 14, color: '#3D3660' },
  bankItemTextSelected: { color: PURPLE, fontWeight: '700' },
  empty: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: '#9A96B5', fontSize: 14 },
});

function PulsingIcon({ name, size, color }: { name: keyof typeof Ionicons.glyphMap; size: number; color: string }) {
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
    <Animated.View style={{ opacity }}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

// ─── Doc State ────────────────────────────────────────────────────────────────

type DocState = {
  type: InfluencerDocumentType;
  status: 'idle' | 'uploading' | 'done' | 'error';
  fileName?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionNote?: string | null;
};

function formatIban(raw: string): string {
  const digits = raw.replace(/\s/g, '').toUpperCase();
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

// ─── Ana Ekran ────────────────────────────────────────────────────────────────

export default function InfluencerDocumentsScreen() {
  const router = useRouter();
  const [companyType, setCompanyType] = useState<InfluencerCompanyType | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [changingType, setChangingType] = useState(false);
  const [docs, setDocs] = useState<DocState[]>([]);
  const [loading, setLoading] = useState(true);

  // Bank info state
  const [iban, setIban] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [bankError, setBankError] = useState('');

  // ─── BIREYSEL: İstisna Belgesi state ─────────────────────────────────────
  const [exemption, setExemption] = useState<ExemptionStatusDto | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certFileName, setCertFileName] = useState('');
  const [showCertInfo, setShowCertInfo] = useState(false);
  const { openChat } = useChat();

  const handleCompanyTypeChange = async (type: InfluencerCompanyType) => {
    setChangingType(true);
    try {
      await updateCompanyType(type);
      setCompanyType(type);
      setShowTypeSelector(false);
      const required = type === 'BIREYSEL' ? BIREYSEL_DOCUMENTS : LTD_DOCUMENTS;
      setDocs(required.map((t) => ({ type: t, status: 'idle' as const, verificationStatus: undefined, rejectionNote: null })));
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message ?? 'İşletme tipi güncellenemedi');
    } finally {
      setChangingType(false);
    }
  };

  async function pickAndUploadCert() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingCert(true);
      setCertFileName(asset.name);
      await uploadInfluencerDocument('EXEMPTION_CERTIFICATE', asset.uri, asset.name, asset.mimeType ?? 'application/octet-stream');
      setExemption((prev) => prev ? { ...prev, certificateUploaded: true, certificateStatus: 'PENDING', certificateRejectionNote: null } : prev);
    } catch {
      Alert.alert('Hata', 'Belge yüklenemedi, tekrar deneyin.');
    } finally {
      setUploadingCert(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const [app, docStatuses] = await Promise.all([
        getMyApplication(),
        getMyDocuments().catch(() => []),
      ]);
      setCompanyType(app.companyType);

      const required = app.companyType === 'BIREYSEL' ? BIREYSEL_DOCUMENTS : LTD_DOCUMENTS;

      const statusMap = Object.fromEntries(
        docStatuses.map((d) => [d.documentType, d])
      );

      setDocs(
        required.map((type) => {
          const existing = statusMap[type];
          if (existing) {
            return {
              type,
              status: existing.verificationStatus === 'PENDING' ? 'done' : 'idle',
              verificationStatus: existing.verificationStatus,
              rejectionNote: existing.rejectionNote,
            } as DocState;
          }
          return { type, status: 'idle' as const, verificationStatus: undefined, rejectionNote: null };
        })
      );

      if (app.iban) setIban(formatIban(app.iban));
      if (app.accountHolderName) setAccountHolderName(app.accountHolderName);
      if (app.bankName) setBankName(app.bankName);
      if (app.iban) setBankSaved(true);
    } catch {
      Alert.alert('Hata', 'Başvuru bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    } catch (e: any) {
      setBankError(
        e?.response?.data?.message ?? e?.message ?? 'Banka bilgileri kaydedilemedi, tekrar deneyin.'
      );
    } finally {
      setBankSaving(false);
    }
  }

  async function pickAndUpload(docType: InfluencerDocumentType) {
    try {
      // İstisna Belgesi sadece PDF
      const allowedTypes = docType === 'EXEMPTION_CERTIFICATE'
        ? ['application/pdf']
        : ['application/pdf', 'image/*'];
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setDocs((prev) =>
        prev.map((d) => (d.type === docType ? { ...d, status: 'uploading', fileName: asset.name } : d))
      );

      await uploadInfluencerDocument(
        docType,
        asset.uri,
        asset.name,
        asset.mimeType ?? 'application/octet-stream'
      );

      setDocs((prev) =>
        prev.map((d) =>
          d.type === docType ? { ...d, status: 'done', verificationStatus: 'PENDING' } : d
        )
      );
    } catch {
      setDocs((prev) =>
        prev.map((d) => (d.type === docType ? { ...d, status: 'error' } : d))
      );
      Alert.alert('Hata', 'Belge yüklenemedi, tekrar deneyin.');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={PURPLE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <BankPickerModal
        visible={bankPickerVisible}
        selected={bankName}
        onSelect={(b) => { setBankName(b); setBankSaved(false); }}
        onClose={() => setBankPickerVisible(false)}
      />

      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={PURPLE} />
        </Pressable>
        <Text style={s.topTitle}>Evrak & Banka Bilgileri</Text>
        <Pressable
          style={({ pressed }) => [s.chatBtn, pressed && { opacity: 0.7 }]}
          onPress={openChat}
          hitSlop={10}
        >
          <MaterialCommunityIcons name="robot-happy" size={16} color="#fff" />
          <Text style={s.chatBtnText}>Destek</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ─── İşletme Tipi Seçici ─── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIcon}>
                <Ionicons name="briefcase" size={14} color={PURPLE} />
              </View>
              <Text style={s.sectionTitle}>İşletme Tipiniz</Text>
              {companyType && !showTypeSelector && (
                <Pressable
                  onPress={() => setShowTypeSelector(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Ionicons name="pencil" size={12} color={PURPLE} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: PURPLE }}>Değiştir</Text>
                </Pressable>
              )}
            </View>

            {(!companyType || showTypeSelector) ? (
              <View style={{ gap: 8 }}>
                <Text style={s.infoText}>
                  Lütfen işletme tipinizi seçin. Bu seçime göre yüklemeniz gereken evraklar belirlenecektir.
                </Text>
                {changingType ? (
                  <ActivityIndicator size="small" color={PURPLE} style={{ padding: 20 }} />
                ) : (
                  <>
                    {([
                      { type: 'BIREYSEL' as InfluencerCompanyType, label: 'Bireysel İçerik Üretici', desc: 'Şirketim yok, İstisna Belgesi ile çalışacağım', icon: 'person-outline' as const },
                      { type: 'LTD' as InfluencerCompanyType, label: 'Ltd / A.Ş.', desc: 'Limited veya anonim şirketim var', icon: 'briefcase-outline' as const },
                    ]).map((opt) => (
                      <Pressable
                        key={opt.type}
                        style={({ pressed }) => [
                          s.typeOption,
                          companyType === opt.type && s.typeOptionActive,
                          pressed && { opacity: 0.8 },
                        ]}
                        onPress={() => handleCompanyTypeChange(opt.type)}
                      >
                        <View style={[s.typeOptionIcon, companyType === opt.type && { backgroundColor: 'rgba(141,115,255,0.15)' }]}>
                          <Ionicons name={opt.icon} size={20} color={companyType === opt.type ? PURPLE : '#9A96B5'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.typeOptionLabel, companyType === opt.type && { color: PURPLE }]}>{opt.label}</Text>
                          <Text style={s.typeOptionDesc}>{opt.desc}</Text>
                        </View>
                        {companyType === opt.type && <Ionicons name="checkmark-circle" size={20} color={PURPLE} />}
                      </Pressable>
                    ))}
                  </>
                )}
              </View>
            ) : (
              <View style={s.typeSelectedRow}>
                <Ionicons
                  name={companyType === 'BIREYSEL' ? 'person-outline' : 'briefcase-outline'}
                  size={18} color={PURPLE}
                />
                <Text style={s.typeSelectedText}>
                  {companyType === 'BIREYSEL' ? 'Bireysel İçerik Üretici' : 'Ltd / A.Ş.'}
                </Text>
              </View>
            )}
          </View>

          {/* ─── Banka Bilgileri ─── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIcon}>
                <Ionicons name="card" size={14} color={PURPLE} />
              </View>
              <Text style={s.sectionTitle}>{companyType === 'BIREYSEL' ? 'İstisna Hesabı Banka Bilgileri' : 'Banka Bilgileri'}</Text>
              {bankSaved && (
                <View style={s.savedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#4B8D5C" />
                  <Text style={s.savedBadgeText}>Kaydedildi</Text>
                </View>
              )}
            </View>

            {companyType === 'BIREYSEL' && (
              <View style={s.infoCard}>
                <PulsingIcon name="warning-outline" size={16} color="#F59E0B" />
                <Text style={s.infoText}>
                  Buraya girdiğiniz banka hesabı, <Text style={{ fontWeight: '700' }}>İstisna Belgesi ile açılmış</Text> influencer/içerik üretici hesabı olmalıdır. Kazançlarınız yalnızca bu hesaba aktarılır.{'\n\n'}Bu hesap dışında 1 TL bile tahsilat yapılması halinde istisna kapsamından çıkarsınız. Bu durumda <Text style={{ fontWeight: '700' }}>vergi ziyaı cezası, gecikme faizi ve ek cezai yaptırımlar</Text> uygulanabilir.
                </Text>
              </View>
            )}

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
              {bankSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name={bankSaved ? 'checkmark-circle' : 'save-outline'} size={16} color="#fff" />
                    <Text style={s.saveBtnText}>{bankSaved ? 'Güncelle' : 'Kaydet'}</Text>
                  </>
              }
            </Pressable>
          </View>

          {/* ─── Evraklar ─── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIcon}>
                <Ionicons name="documents" size={14} color={PURPLE} />
              </View>
              <Text style={s.sectionTitle}>Evraklar</Text>
            </View>

            <View style={s.infoCard}>
              <Ionicons name="information-circle-outline" size={16} color={PURPLE} />
              <Text style={s.infoText}>
                {companyType === 'BIREYSEL'
                  ? 'Kimlik fotokopinizi ve İstisna Belgenizi yükleyin. İstisna Belgesi yalnızca PDF formatında kabul edilir.'
                  : 'Ltd/A.Ş. için gerekli evrakları yükleyin. PDF veya görsel (JPG/PNG) formatında yükleyebilirsiniz.'}
              </Text>
            </View>

            {/* BIREYSEL: İstisna Belgesi Nasıl Alınır? */}
            {companyType === 'BIREYSEL' && (
              <>
                <Pressable style={s.certInfoBtn} onPress={() => setShowCertInfo(!showCertInfo)}>
                  <Ionicons name={showCertInfo ? 'chevron-up' : 'help-circle-outline'} size={16} color={PURPLE} />
                  <Text style={s.certInfoBtnText}>{showCertInfo ? 'Detayları Gizle' : 'İstisna Belgesi Nasıl Alınır?'}</Text>
                </Pressable>

                {showCertInfo && (
                  <View style={s.certInfoBox}>
                    <Text style={s.certInfoTitle}>Nereden Alınır?</Text>
                    <Text style={s.certInfoStep}>1. Fiziksel: İkametgahınıza bağlı vergi dairesine kimliğinizle şahsen başvurun.</Text>
                    <Text style={s.certInfoStep}>2. Online: gib.gov.tr → Dijital Vergi Dairesi → İşlem Başlat → "Sosyal İçerik Üreticiliği İstisna Belgesi Talebi Dilekçesi"</Text>

                    <Text style={s.certInfoTitle}>Başvuruda Neler Gerekir?</Text>
                    <Text style={s.certInfoStep}>• Nüfus cüzdanı / kimlik</Text>
                    <Text style={s.certInfoStep}>• Hangi platformlarda içerik ürettiğinize dair bilgi</Text>
                    <Text style={s.certInfoStep}>• Geçmiş gelirler ve takipçi sayınız istenebilir</Text>

                    <Text style={s.certInfoTitle}>Ne Kadar Sürer?</Text>
                    <Text style={s.certInfoStep}>Genellikle 1–3 iş günü içinde e-Devlet'te PDF olarak oluşturulur.</Text>

                    <Text style={s.certInfoTitle}>Belgeyi Aldıktan Sonra</Text>
                    <Text style={s.certInfoStep}>• Belgeyle bir bankada influencer hesabı açın</Text>
                    <Text style={s.certInfoStep}>• 1 ay içinde banka bilgilerini vergi dairesine bildirin</Text>
                    <Text style={s.certInfoStep}>• Tüm kazançlar yalnızca bu hesaba alınmalı</Text>

                    <View style={s.certWarning}>
                      <Ionicons name="warning-outline" size={14} color="#92400E" />
                      <Text style={s.certWarningText}>2026 gelir sınırı: 5.300.000 TL. Aşılırsa tüm gelir beyanname ile vergilendirilir.</Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {docs.map((doc, i) => (
              <View key={doc.type} style={[s.docRow, i < docs.length - 1 && s.docRowBorder]}>
                <View style={s.docLeft}>
                  <View style={[
                    s.docIcon,
                    doc.verificationStatus === 'VERIFIED' && s.docIconGreen,
                    doc.verificationStatus === 'REJECTED' && s.docIconRed,
                    doc.status === 'done' && !doc.verificationStatus && s.docIconPurple,
                  ]}>
                    <Ionicons
                      name={
                        doc.verificationStatus === 'VERIFIED' ? 'checkmark-circle'
                          : doc.verificationStatus === 'REJECTED' ? 'close-circle'
                          : doc.status === 'done' ? 'time'
                          : 'document-outline'
                      }
                      size={22}
                      color={
                        doc.verificationStatus === 'VERIFIED' ? '#4B8D5C'
                          : doc.verificationStatus === 'REJECTED' ? '#D7263D'
                          : doc.status === 'done' ? PURPLE
                          : '#9A96B5'
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.docLabel}>{DOCUMENT_LABELS[doc.type]}</Text>
                    {doc.fileName && doc.status !== 'idle' && (
                      <Text style={s.docFileName} numberOfLines={1}>{doc.fileName}</Text>
                    )}
                    {doc.verificationStatus === 'VERIFIED' && (
                      <Text style={s.verifiedText}>Onaylandı</Text>
                    )}
                    {doc.verificationStatus === 'REJECTED' && (
                      <View style={s.rejectionBox}>
                        <Ionicons name="close-circle" size={12} color="#B91C1C" />
                        <Text style={s.rejectedText} numberOfLines={3}>
                          {doc.rejectionNote ?? 'Reddedildi — yeniden yükleyin'}
                        </Text>
                      </View>
                    )}
                    {doc.verificationStatus === 'PENDING' && doc.status === 'done' && (
                      <Text style={s.pendingText}>İnceleme Bekliyor</Text>
                    )}
                    {!doc.verificationStatus && doc.status === 'done' && (
                      <Text style={s.pendingText}>İnceleme Bekliyor</Text>
                    )}
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    s.uploadBtn,
                    doc.status === 'uploading' && s.uploadBtnDisabled,
                    doc.verificationStatus === 'VERIFIED' && s.uploadBtnVerified,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => pickAndUpload(doc.type)}
                  disabled={doc.status === 'uploading' || doc.verificationStatus === 'VERIFIED'}
                >
                  {doc.status === 'uploading' ? (
                    <ActivityIndicator size="small" color={PURPLE} />
                  ) : (
                    <Ionicons
                      name={doc.status === 'done' || doc.verificationStatus ? 'refresh' : 'cloud-upload-outline'}
                      size={18}
                      color={doc.verificationStatus === 'VERIFIED' ? '#4B8D5C' : PURPLE}
                    />
                  )}
                </Pressable>
              </View>
            ))}
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
    borderBottomWidth: 1, borderBottomColor: '#ECEAF8',
    backgroundColor: '#fff',
  },
  backBtn: { width: 34, alignItems: 'center' },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#1C1631' },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 30, borderRadius: 15,
    paddingHorizontal: 10,
    backgroundColor: PURPLE,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  chatBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  scroll: { padding: 16, gap: 14, paddingBottom: 48 },

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
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(75,141,92,0.10)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  savedBadgeText: { fontSize: 10, fontWeight: '700', color: '#4B8D5C' },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#3D3660' },
  req: { fontSize: 10, fontWeight: '700', color: PURPLE, backgroundColor: 'rgba(141,115,255,0.10)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  opt: { fontSize: 10, fontWeight: '600', color: '#9A96B5', backgroundColor: '#F4F3F8', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },

  ibanRow: {
    height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD7FF',
    backgroundColor: '#FBFAFF',
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
  },
  ibanPrefix: {
    height: '100%', paddingHorizontal: 12,
    backgroundColor: '#F3F1FF',
    justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: '#DDD7FF',
  },
  ibanPrefixText: { fontSize: 14, fontWeight: '700', color: '#3D3660' },
  ibanInput: { flex: 1, paddingHorizontal: 12, fontSize: 14, color: '#1C1631', letterSpacing: 1.5 },

  input: {
    height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD7FF',
    backgroundColor: '#FBFAFF',
    paddingHorizontal: 14, fontSize: 14, color: '#1C1631',
  },

  bankSelect: {
    height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD7FF',
    backgroundColor: '#FBFAFF',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, gap: 10,
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
    height: 46, borderRadius: 12,
    backgroundColor: PURPLE,
    flexDirection: 'row', gap: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  infoCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: 'rgba(141,115,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: '#DDD7FF', padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: '#5D5677', lineHeight: 18 },

  docRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 12,
  },
  docRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EEFF' },
  docLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  docIconGreen: { backgroundColor: 'rgba(75,141,92,0.1)' },
  docIconRed: { backgroundColor: 'rgba(215,38,61,0.08)' },
  docIconPurple: { backgroundColor: 'rgba(141,115,255,0.1)' },
  docLabel: { fontSize: 13, fontWeight: '700', color: '#1C1631' },
  docFileName: { fontSize: 11, color: '#9A96B5', marginTop: 2 },
  verifiedText: { fontSize: 11, color: '#4B8D5C', fontWeight: '600', marginTop: 2 },
  rejectionBox: {
    flexDirection: 'row', gap: 4, alignItems: 'flex-start',
    backgroundColor: '#FEF2F2', borderRadius: 6,
    borderWidth: 1, borderColor: '#FECACA',
    padding: 6, marginTop: 4,
  },
  rejectedText: { flex: 1, fontSize: 11, color: '#B91C1C', fontWeight: '600', lineHeight: 15 },
  pendingText: { fontSize: 11, color: PURPLE, fontWeight: '600', marginTop: 2 },

  uploadBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(141,115,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadBtnDisabled: { backgroundColor: '#F0EEFF' },
  uploadBtnVerified: { backgroundColor: 'rgba(75,141,92,0.1)' },

  // ─── İşletme Tipi Seçici ─────────────────────────────────────────────────
  typeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#ECEAF8',
    backgroundColor: '#FBFAFF',
  },
  typeOptionActive: {
    borderColor: PURPLE, backgroundColor: 'rgba(141,115,255,0.04)',
  },
  typeOptionIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  typeOptionLabel: { fontSize: 14, fontWeight: '700', color: '#1C1631' },
  typeOptionDesc: { fontSize: 11, color: '#9A96B5', marginTop: 2 },
  typeSelectedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(141,115,255,0.06)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  typeSelectedText: { fontSize: 13, fontWeight: '700', color: PURPLE },

  // ─── İstisna Belgesi (BIREYSEL) ──────────────────────────────────────────
  pendingDocBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(141,115,255,0.10)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pendingDocBadgeText: { fontSize: 10, fontWeight: '700', color: PURPLE },

  certInfoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, borderRadius: 12,
    backgroundColor: 'rgba(141,115,255,0.08)',
  },
  certInfoBtnText: { fontSize: 13, fontWeight: '700', color: PURPLE },

  certInfoBox: {
    backgroundColor: '#FAFAFE', borderRadius: 14,
    borderWidth: 1, borderColor: '#F0EEFF', padding: 14, gap: 6,
  },
  certInfoTitle: { fontSize: 13, fontWeight: '700', color: '#1C1631', marginTop: 6 },
  certInfoStep: { fontSize: 12, color: '#5D5677', lineHeight: 18, marginLeft: 4 },
  certWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: 10,
    borderWidth: 1, borderColor: '#FDE68A', padding: 10, marginTop: 6,
  },
  certWarningText: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 },

  certFileChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(141,115,255,0.08)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  certFileChipText: { flex: 1, fontSize: 12, color: PURPLE, fontWeight: '600' },

  certUploadBtn: {
    height: 48, borderRadius: 14, backgroundColor: '#F59E0B',
    flexDirection: 'row', gap: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  certUploadBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  certPdfHint: { fontSize: 11, color: '#9A96B5', textAlign: 'center', marginTop: 6 },
});
