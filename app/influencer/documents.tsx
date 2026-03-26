import { getMyApplication, getMyDocuments, updateInfluencerBankInfo, uploadInfluencerDocument } from '@/features/influencer/api';
import {
  DOCUMENT_LABELS,
  InfluencerDocumentType,
  LTD_DOCUMENTS,
  SAHIS_DOCUMENTS,
} from '@/features/influencer/types';
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
  const [companyType, setCompanyType] = useState<'SAHIS' | 'LTD' | null>(null);
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

  const load = useCallback(async () => {
    try {
      const [app, docStatuses] = await Promise.all([
        getMyApplication(),
        getMyDocuments().catch(() => []),
      ]);
      setCompanyType(app.companyType);
      const required = app.companyType === 'SAHIS' ? SAHIS_DOCUMENTS : LTD_DOCUMENTS;

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
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
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
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ─── Banka Bilgileri ─── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIcon}>
                <Ionicons name="card" size={14} color={PURPLE} />
              </View>
              <Text style={s.sectionTitle}>Banka Bilgileri</Text>
              {bankSaved && (
                <View style={s.savedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#4B8D5C" />
                  <Text style={s.savedBadgeText}>Kaydedildi</Text>
                </View>
              )}
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
                    const raw = v.replace(/\D/g, '');
                    setIban(formatIban('TR' + raw));
                    setBankSaved(false);
                    if (bankError) setBankError('');
                  }}
                  placeholder="33 0006 1005 1978 6457 8413 26"
                  placeholderTextColor="#B0AACC"
                  keyboardType="numeric"
                  maxLength={30}
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
                {companyType === 'SAHIS'
                  ? 'Şahıs şirketi için gerekli evrakları yükleyin.'
                  : 'Ltd/A.Ş. için gerekli evrakları yükleyin.'}{' '}
                PDF veya görsel (JPG/PNG) formatında yükleyebilirsiniz.
              </Text>
            </View>

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
});
