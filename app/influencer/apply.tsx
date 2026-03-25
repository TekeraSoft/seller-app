import { applyAsInfluencer } from '@/features/influencer/api';
import type { InfluencerCompanyType } from '@/features/influencer/types';
import { Ionicons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [gsmNumber, setGsmNumber] = useState('');
  const [companyType, setCompanyType] = useState<InfluencerCompanyType>('SAHIS');
  const [nationalId, setNationalId] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [twitter, setTwitter] = useState('');

  const ce = () => { if (error) setError(''); };

  function validate() {
    if (!name.trim()) return 'Ad zorunludur.';
    if (!surname.trim()) return 'Soyad zorunludur.';
    if (!gsmNumber.trim()) return 'Telefon zorunludur.';
    if (companyType === 'SAHIS' && !nationalId.trim()) return 'TC Kimlik No zorunludur.';
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
        name: name.trim(),
        surname: surname.trim(),
        gsmNumber: gsmNumber.trim(),
        companyType,
        nationalId: companyType === 'SAHIS' ? nationalId.trim() : undefined,
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
    <SafeAreaView style={s.root} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Influencer Başvurusu' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Kişisel */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Kişisel Bilgiler</Text>
            <View style={s.row2}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Ad</Text>
                <TextInput style={s.input} value={name} onChangeText={v => { setName(v); ce(); }}
                  placeholder="Adınız" placeholderTextColor="#B0AACC" autoCapitalize="words" />
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Soyad</Text>
                <TextInput style={s.input} value={surname} onChangeText={v => { setSurname(v); ce(); }}
                  placeholder="Soyadınız" placeholderTextColor="#B0AACC" autoCapitalize="words" />
              </View>
            </View>
            <View style={s.field}>
              <Text style={s.label}>Telefon</Text>
              <TextInput style={s.input} value={gsmNumber} onChangeText={v => { setGsmNumber(v); ce(); }}
                placeholder="05XX XXX XX XX" placeholderTextColor="#B0AACC" keyboardType="phone-pad" />
            </View>
          </View>

          {/* Şirket */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Şirket Bilgileri</Text>
            <View style={s.field}>
              <Text style={s.label}>Şirket Tipi</Text>
              <View style={s.segRow}>
                {(['SAHIS', 'LTD'] as InfluencerCompanyType[]).map(t => (
                  <Pressable key={t} style={[s.seg, companyType === t && s.segActive]}
                    onPress={() => { setCompanyType(t); ce(); }}>
                    <Text style={[s.segText, companyType === t && s.segTextActive]}>
                      {t === 'SAHIS' ? 'Şahıs' : 'Ltd / A.Ş.'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {companyType === 'SAHIS' ? (
              <View style={s.field}>
                <Text style={s.label}>TC Kimlik No</Text>
                <TextInput style={s.input} value={nationalId} onChangeText={v => { setNationalId(v); ce(); }}
                  placeholder="11 haneli TC Kimlik No" placeholderTextColor="#B0AACC" keyboardType="numeric" maxLength={11} />
              </View>
            ) : (
              <View style={s.field}>
                <Text style={s.label}>Vergi No</Text>
                <TextInput style={s.input} value={taxNumber} onChangeText={v => { setTaxNumber(v); ce(); }}
                  placeholder="Vergi numarası" placeholderTextColor="#B0AACC" keyboardType="numeric" />
              </View>
            )}
          </View>

          {/* Sosyal Medya */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Sosyal Medya</Text>
            {[
              { label: 'Instagram', req: true, val: instagram, set: setInstagram },
              { label: 'YouTube', req: false, val: youtube, set: setYoutube },
              { label: 'TikTok', req: false, val: tiktok, set: setTiktok },
              { label: 'Twitter / X', req: false, val: twitter, set: setTwitter },
            ].map(({ label, req, val, set }) => (
              <View key={label} style={s.field}>
                <View style={s.labelRow}>
                  <Text style={s.label}>{label}</Text>
                  {req && <Text style={s.reqBadge}>Zorunlu</Text>}
                </View>
                <TextInput style={s.input} value={val} onChangeText={v => { set(v); ce(); }}
                  placeholder="https://..." placeholderTextColor="#B0AACC"
                  autoCapitalize="none" autoCorrect={false} keyboardType="url" />
              </View>
            ))}
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#B91C1C" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Pressable style={({ pressed }) => [s.btn, (loading || pressed) && { opacity: 0.8 }]}
            onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Başvuruyu Gönder</Text>}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F6FB' },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ECEAF8',
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: P, marginBottom: 2 },

  row2: { flexDirection: 'row', gap: 10 },
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#2E2350' },
  reqBadge: { fontSize: 10, fontWeight: '700', color: P, backgroundColor: 'rgba(141,115,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  input: {
    height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD7FF',
    backgroundColor: '#FBFAFF',
    paddingHorizontal: 14, fontSize: 14, color: '#1C1631',
  },

  segRow: { flexDirection: 'row', gap: 10 },
  seg: {
    flex: 1, height: 42, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#DDD7FF',
    backgroundColor: '#FBFAFF',
    alignItems: 'center', justifyContent: 'center',
  },
  segActive: { backgroundColor: P, borderColor: P },
  segText: { fontSize: 13, fontWeight: '600', color: '#5D5677' },
  segTextActive: { color: '#fff' },

  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: '#FEF2F2', borderRadius: 12,
    borderWidth: 1, borderColor: '#FECACA',
    padding: 12,
  },
  errorText: { flex: 1, color: '#B91C1C', fontSize: 13 },

  btn: {
    height: 52, borderRadius: 14,
    backgroundColor: P,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: P, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
