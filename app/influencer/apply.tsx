import { PhoneInput } from '@/components/phone-input';
import { applyAsInfluencer, getMyApplication } from '@/features/influencer/api';
import type { InfluencerCompanyType } from '@/features/influencer/types';
import { useAuth } from '@/context/auth-context';
import { getSellerIdentityFromAccessToken } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

function isValidUrl(v: string) {
  try { const u = new URL(v.trim()); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

export default function InfluencerApplyScreen() {
  const { signOut, token, isAuthenticated } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) return <Redirect href="/auth" />;

  const nameSurname = token ? (getSellerIdentityFromAccessToken(token).nameSurname ?? '') : '';
  const [firstName, ...rest] = nameSurname.split(' ');
  const lastName = rest.join(' ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If application already exists and not rejected, go to status page
  useEffect(() => {
    getMyApplication()
      .then((app) => {
        if (app.status !== 'REJECTED') {
          router.replace('/influencer/status' as any);
        }
      })
      .catch(() => {}); // No application yet, stay on apply
  }, []);

  const [gsmNumber, setGsmNumber] = useState('');
  const [companyType, setCompanyType] = useState<InfluencerCompanyType>('BIREYSEL');
  const [nationalId, setNationalId] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [twitter, setTwitter] = useState('');

  const ce = () => { if (error) setError(''); };

  function validate() {
    if (gsmNumber.length < 10) return 'Geçerli bir telefon numarası girin.';
    if (companyType === 'BIREYSEL' && !nationalId.trim()) return 'TC Kimlik No zorunludur.';
    if (companyType === 'LTD' && !taxNumber.trim()) return 'Vergi No zorunludur.';
    if (!instagram.trim() || !isValidUrl(instagram)) return 'Geçerli bir Instagram linki zorunludur.';
    if (youtube.trim() && !isValidUrl(youtube)) return 'Geçerli bir YouTube linki girin.';
    if (tiktok.trim() && !isValidUrl(tiktok)) return 'Geçerli bir TikTok linki girin.';
    return null;
  }

  async function onSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const socialLinks: Record<string, string> = {};
      if (instagram.trim()) socialLinks['INSTAGRAM'] = instagram.trim();
      if (youtube.trim()) socialLinks['YOUTUBE'] = youtube.trim();
      if (tiktok.trim()) socialLinks['TIKTOK'] = tiktok.trim();
      if (twitter.trim()) socialLinks['TWITTER'] = twitter.trim();

      await applyAsInfluencer({
        gsmNumber: gsmNumber ? `0${gsmNumber}` : '',
        companyType,
        nationalId: companyType === 'BIREYSEL' ? nationalId.trim() : undefined,
        taxNumber: companyType === 'LTD' ? taxNumber.trim() : undefined,
        socialLinks,
      });
      router.replace('/influencer/status' as any);
    } catch (e) {
      if (isAxiosError(e)) {
        setError((e.response?.data as any)?.message ?? `HTTP ${e.response?.status}`);
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Beklenmeyen bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Üst bar */}
      <View style={s.topBar}>
        <Text style={s.topTitle}>Influencer Başvurusu</Text>
        <Pressable style={s.signOutBtn} onPress={signOut} hitSlop={12}>
          <Ionicons name="log-out-outline" size={22} color={P} />
          <Text style={s.signOutText}>Çıkış</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Kişisel Bilgiler */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIcon}>
                <Ionicons name="person" size={14} color={P} />
              </View>
              <Text style={s.sectionTitle}>Kişisel Bilgiler</Text>
            </View>
            <View style={s.row2}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Ad</Text>
                <TextInput
                  style={[s.input, s.inputDisabled]}
                  value={firstName}
                  editable={false}
                />
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Soyad</Text>
                <TextInput
                  style={[s.input, s.inputDisabled]}
                  value={lastName}
                  editable={false}
                />
              </View>
            </View>
            <View style={s.field}>
              <Text style={s.label}>Telefon</Text>
              <PhoneInput value={gsmNumber} onChange={v => { setGsmNumber(v); ce(); }} />
            </View>
          </View>

          {/* Şirket Bilgileri */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIcon}>
                <Ionicons name="business" size={14} color={P} />
              </View>
              <Text style={s.sectionTitle}>İşletme Tipi</Text>
            </View>
            <View style={s.field}>
              <Text style={s.label}>İşletme Tipiniz</Text>
              <View style={s.segRow}>
                {([
                  { type: 'BIREYSEL' as InfluencerCompanyType, label: 'Bireysel', icon: 'person-outline' as const },
                  { type: 'LTD' as InfluencerCompanyType, label: 'Ltd / A.Ş.', icon: 'storefront-outline' as const },
                ]).map(opt => (
                  <Pressable
                    key={opt.type}
                    style={[s.seg, companyType === opt.type && s.segActive]}
                    onPress={() => { setCompanyType(opt.type); ce(); }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={15}
                      color={companyType === opt.type ? '#fff' : '#8B87A8'}
                    />
                    <Text style={[s.segText, companyType === opt.type && s.segTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {companyType === 'BIREYSEL' ? (
              <View style={s.field}>
                <Text style={s.label}>TC Kimlik No</Text>
                <View style={s.inputRow}>
                  <Ionicons name="card-outline" size={16} color="#B0AACC" />
                  <TextInput
                    style={s.inputFlex} value={nationalId}
                    onChangeText={v => { setNationalId(v); ce(); }}
                    placeholder="11 haneli TC Kimlik No" placeholderTextColor="#B0AACC"
                    keyboardType="numeric" maxLength={11}
                  />
                </View>
              </View>
            ) : (
              <View style={s.field}>
                <Text style={s.label}>Vergi No</Text>
                <View style={s.inputRow}>
                  <Ionicons name="receipt-outline" size={16} color="#B0AACC" />
                  <TextInput
                    style={s.inputFlex} value={taxNumber}
                    onChangeText={v => { setTaxNumber(v); ce(); }}
                    placeholder="Vergi numarası" placeholderTextColor="#B0AACC"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Sosyal Medya */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIcon}>
                <Ionicons name="share-social" size={14} color={P} />
              </View>
              <Text style={s.sectionTitle}>Sosyal Medya</Text>
            </View>
            {[
              { label: 'Instagram', icon: 'logo-instagram', req: true, val: instagram, set: setInstagram },
              { label: 'YouTube', icon: 'logo-youtube', req: false, val: youtube, set: setYoutube },
              { label: 'TikTok', icon: 'musical-notes-outline', req: false, val: tiktok, set: setTiktok },
              { label: 'Twitter / X', icon: 'logo-twitter', req: false, val: twitter, set: setTwitter },
            ].map(({ label, icon, req, val, set }) => (
              <View key={label} style={s.field}>
                <View style={s.labelRow}>
                  <Text style={s.label}>{label}</Text>
                  {req
                    ? <Text style={s.req}>Zorunlu</Text>
                    : <Text style={s.opt}>İsteğe bağlı</Text>
                  }
                </View>
                <View style={s.inputRow}>
                  <Ionicons name={icon as any} size={16} color="#B0AACC" />
                  <TextInput
                    style={s.inputFlex} value={val}
                    onChangeText={v => { set(v); ce(); }}
                    placeholder="https://..." placeholderTextColor="#B0AACC"
                    autoCapitalize="none" autoCorrect={false} keyboardType="url"
                  />
                </View>
              </View>
            ))}
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#B91C1C" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [s.btn, (loading || pressed) && { opacity: 0.82 }]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={s.btnText}>Başvuruyu Gönder</Text>
                </>
            }
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F6FB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32, backgroundColor: '#F7F6FB' },

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

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#ECEAF8',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(141,115,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1C1631' },

  row2: { flexDirection: 'row', gap: 10 },
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#3D3660' },
  req: { fontSize: 10, fontWeight: '700', color: P, backgroundColor: 'rgba(141,115,255,0.10)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  opt: { fontSize: 10, fontWeight: '600', color: '#9A96B5', backgroundColor: '#F4F3F8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  input: {
    height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD7FF',
    backgroundColor: '#FBFAFF',
    paddingHorizontal: 14, fontSize: 14, color: '#1C1631',
  },
  inputDisabled: {
    backgroundColor: '#F4F3F8',
    borderColor: '#ECEAF8',
    color: '#9A96B5',
  },
  inputRow: {
    height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD7FF',
    backgroundColor: '#FBFAFF',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 8,
  },
  inputFlex: { flex: 1, fontSize: 14, color: '#1C1631', height: '100%' },

  segRow: { flexDirection: 'row', gap: 10 },
  seg: {
    flex: 1, height: 46, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD7FF',
    backgroundColor: '#FBFAFF',
    flexDirection: 'row', gap: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  segActive: { backgroundColor: P, borderColor: P },
  segText: { fontSize: 13, fontWeight: '600', color: '#8B87A8' },
  segTextActive: { color: '#fff' },

  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: '#FEF2F2', borderRadius: 12,
    borderWidth: 1, borderColor: '#FECACA', padding: 12,
  },
  errorText: { flex: 1, color: '#B91C1C', fontSize: 13 },

  btn: {
    height: 54, borderRadius: 14,
    backgroundColor: P,
    flexDirection: 'row', gap: 8,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: P, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

});
