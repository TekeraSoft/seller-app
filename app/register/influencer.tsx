import { PhoneInput } from '@/components/phone-input';
import { applyAsInfluencer, registerUser } from '@/features/influencer/api';
import type { InfluencerCompanyType } from '@/features/influencer/types';
import { validateInfluencerProfile } from '@/features/influencer/validators';
import { useAuth } from '@/context/auth-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { Stack, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';

function extractApiErrorMessage(err: unknown, fallback = 'Beklenmeyen bir hata oluştu.'): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      if (err.code === 'ECONNABORTED') return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
      return 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.';
    }
    const data = err.response.data as
      | { message?: string; data?: { error?: string } | unknown }
      | undefined;
    const nestedError =
      data && typeof data === 'object' && 'data' in data && data.data && typeof data.data === 'object'
        ? (data.data as { error?: string }).error
        : undefined;
    if (data?.message === 'Validation failed' && nestedError) return nestedError;
    if (typeof data?.message === 'string' && data.message.trim().length > 0) return data.message;
    if (typeof nestedError === 'string' && nestedError.trim().length > 0) return nestedError;
    return `Sunucu hatası (HTTP ${err.response.status}).`;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
import {
  ActivityIndicator,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#8D73FF';
const BORDER = '#DDD7FF';
const BG = '#F7F5FF';

type CompanyType = InfluencerCompanyType;
type Step = 1 | 2;

export default function InfluencerRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState<Step>(1);

  useEffect(() => {
    if (!isLoading && isAuthenticated) setStep(2);
  }, [isLoading, isAuthenticated]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [kvkkModalVisible, setKvkkModalVisible] = useState(false);
  const [electronicConsent, setElectronicConsent] = useState(false);

  // Adım 1 — Hesap
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(null);

  // Adım 2 — Profil
  const [gsmNumber, setGsmNumber] = useState('');
  const [companyType, setCompanyType] = useState<CompanyType>('BIREYSEL');
  const [nationalId, setNationalId] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');

  function clearError() { if (error) setError(''); }

  function validateStep1(): string | null {
    if (!firstName.trim()) return 'Ad zorunludur.';
    if (!lastName.trim()) return 'Soyad zorunludur.';
    if (!email.trim()) return 'E-posta zorunludur.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Geçerli bir e-posta girin.';
    if (password.length < 6) return 'Şifre en az 6 karakter olmalı.';
    if (!/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])/.test(password)) return 'Şifre en az bir büyük harf, küçük harf ve rakam içermelidir.';
    if (password !== passwordConfirm) return 'Şifreler eşleşmiyor.';
    if (!gender) return 'Cinsiyet seçimi zorunludur.';
    if (!kvkkAccepted) return 'KVKK Açık Rıza Metni\'ni onaylamanız zorunludur.';
    return null;
  }

  function validateStep2(): string | null {
    return validateInfluencerProfile({
      gsmNumber, companyType, nationalId, taxNumber,
      instagramUrl, youtubeUrl, tiktokUrl, twitterUrl,
    });
  }

  async function onNext() {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');

    // Zaten giriş yapmışsa direkt Step 2'ye geç
    if (isAuthenticated) {
      setStep(2);
      return;
    }

    // Hesap oluştur ve giriş yap — email zaten varsa hata burada çıkar
    setLoading(true);
    try {
      const tokens = await registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        gender: gender!,
        electronicMessageConsent: electronicConsent,
      });
      await signIn(tokens);
      // useEffect isAuthenticated true olunca setStep(2) yapacak
    } catch (err) {
      const raw = extractApiErrorMessage(err);
      const lower = raw.toLowerCase();
      const isDuplicateEmail = lower.includes('email') && (lower.includes('use') || lower.includes('kayıt'));
      setError(isDuplicateEmail ? 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.' : raw);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit() {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    try {
      const socialLinks: Record<string, string> = {};
      if (instagramUrl.trim()) socialLinks['INSTAGRAM'] = instagramUrl.trim();
      if (youtubeUrl.trim()) socialLinks['YOUTUBE'] = youtubeUrl.trim();
      if (tiktokUrl.trim()) socialLinks['TIKTOK'] = tiktokUrl.trim();
      if (twitterUrl.trim()) socialLinks['TWITTER'] = twitterUrl.trim();

      await applyAsInfluencer({
        gsmNumber: gsmNumber ? `0${gsmNumber}` : '',
        companyType,
        nationalId: companyType === 'BIREYSEL' ? nationalId.trim() : undefined,
        taxNumber: companyType === 'LTD' ? taxNumber.trim() : undefined,
        socialLinks,
      });

      router.replace('/influencer/status' as any);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <Stack.Screen options={{ title: 'İnfluencer Başvuru', headerBackTitle: '' }} />

      {/* KVKK Modal */}
      <Modal visible={kvkkModalVisible} animationType="slide" transparent onRequestClose={() => setKvkkModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Açık Rıza Metni</Text>
              <Pressable onPress={() => setKvkkModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color="#5D5677" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                (Tekera21.com – Tekera Teknoloji Ticaret ve Sanayi Limited Şirketi)
              </Text>
              <Text style={styles.modalDate}>Son Güncelleme: 09.01.2026</Text>
              <Text style={styles.modalBody}>
                {`KVKK Aydınlatma Metni'ni okudum ve anladım.\n\nİşbu Açık Rıza Metni; Tekera Teknoloji Ticaret ve Sanayi Limited Şirketi ("Şirket") tarafından, KVKK kapsamında açık rızaya tabi işleme faaliyetleri için onayınızın alınması amacıyla hazırlanmıştır. Açık rıza vermemeniz halinde, pazarlama/kişiselleştirme ve ticari elektronik iletişim faaliyetlerinden yararlanamayabilirsiniz; ancak platforma üyeliğiniz ve temel hizmetler (sipariş, ödeme, teslimat vb.) devam eder.\n\n1) Pazarlama, Kişiselleştirme ve Profilleme/Segmentasyon Açık Rızası\n\nŞirket tarafından; bana özel kampanya ve tekliflerin sunulması, tercihlerime uygun içeriklerin sağlanması, kullanıcı deneyiminin geliştirilmesi ve bu amaçlarla analiz yapılması kapsamında kişisel verilerimin işlenmesine ve profilleme/segmentasyon yapılmasına AÇIK RIZA veriyorum.\n\nBu kapsamda işlenebilecek veri kategorilerine örnekler:\n• Üyelik ve iletişim bilgileri,\n• Kullanım/davranış verileri (platform içi etkileşimler, kampanya etkileşimleri),\n• Tercih, segmentasyon ve profilleme verileri.\n\n2) Ticari Elektronik İleti (İYS) Açık Rızası\n\nŞirket tarafından tarafıma ticari elektronik ileti gönderilmesine AÇIK RIZA veriyorum. (Onay verdiğim kanallar: e-posta ve/veya SMS) Ticari elektronik ileti izinlerim, mevzuat kapsamında İYS (İleti Yönetim Sistemi) üzerinden yönetilebilir ve doğrulanabilir.\n\n3) Paylaşım / Hizmet Sağlayıcılar\n\nYukarıdaki açık rızalara dayalı faaliyetlerin yürütülmesi amacıyla kişisel verilerim; yalnızca gerekli olması halinde ve amaçla sınırlı olarak, Şirket'in hizmet aldığı tedarikçilerle (örn. e-posta/SMS gönderim altyapısı, CRM/müşteri iletişimi, analiz/ölçümleme hizmetleri) ve mevzuat gereği yetkili kişi/kurumlarla paylaşılabilir. Yurt dışına aktarım söz konusu ise KVKK m.9 çerçevesindeki uygun mekanizmalar uygulanır.\n\n4) Açık Rızanın Geri Alınması\n\nAçık rızamı dilediğim zaman, herhangi bir gerekçe göstermeksizin;\n• Hesap içi "İletişim Tercihleri / Pazarlama İzinleri" bölümünden ve/veya\n• kvkk@tekera21.com adresine yazılı olarak\ngeri alabileceğimi biliyorum. Açık rızanın geri alınması, geri alma öncesindeki işleme faaliyetlerinin hukuka uygunluğunu etkilemez.\n\nİşbu metni okudum, anladım ve seçtiğim izinler kapsamında açık rıza veriyorum.`}
              </Text>
              <View style={{ height: 24 }} />
            </ScrollView>
            <Pressable
              style={({ pressed }) => [styles.modalBtn, pressed && { opacity: 0.85 }]}
              onPress={() => { setKvkkAccepted(true); setKvkkModalVisible(false); }}
            >
              <Text style={styles.modalBtnText}>Okudum, Onaylıyorum</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 8 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Adım indikatörü */}
          <View style={styles.stepIndicator}>
            {[1, 2].map((s) => (
              <View key={s} style={styles.stepIndicatorItem}>
                <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                  {step > s
                    ? <Ionicons name="checkmark" size={13} color="#fff" />
                    : <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>{s}</Text>
                  }
                </View>
                <Text style={[styles.stepDotLabel, step >= s && styles.stepDotLabelActive]}>
                  {s === 1 ? 'Hesap' : 'Profil'}
                </Text>
              </View>
            ))}
            <View style={styles.stepDivider} />
          </View>

          {/* ADIM 1 */}
          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Hesap Oluştur</Text>

              <Field label="Ad">
                <TextInput style={styles.input} value={firstName} onChangeText={(v) => { setFirstName(v); clearError(); }}
                  placeholder="Adınız" placeholderTextColor="#9A96B5" autoCapitalize="words" />
              </Field>
              <Field label="Soyad">
                <TextInput style={styles.input} value={lastName} onChangeText={(v) => { setLastName(v); clearError(); }}
                  placeholder="Soyadınız" placeholderTextColor="#9A96B5" autoCapitalize="words" />
              </Field>
              <Field label="E-posta">
                <TextInput style={styles.input} value={email} onChangeText={(v) => { setEmail(v); clearError(); }}
                  placeholder="ornek@email.com" placeholderTextColor="#9A96B5"
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </Field>
              <Field label="Şifre">
                <View style={styles.passRow}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={password} onChangeText={(v) => { setPassword(v); clearError(); }}
                    placeholder="En az 6 karakter" placeholderTextColor="#9A96B5" secureTextEntry={!showPass} />
                  <Pressable style={styles.eyeBtn} onPress={() => setShowPass((p) => !p)}>
                    <Ionicons name={showPass ? 'eye-off' : 'eye'} size={18} color="#9A96B5" />
                  </Pressable>
                </View>
              </Field>
              <Field label="Şifre Tekrar">
                <TextInput style={styles.input} value={passwordConfirm} onChangeText={(v) => { setPasswordConfirm(v); clearError(); }}
                  placeholder="Şifreyi tekrar girin" placeholderTextColor="#9A96B5" secureTextEntry={!showPass} />
              </Field>

              <View style={styles.field}>
                <Text style={styles.label}>Cinsiyet</Text>
                <View style={styles.segmentRow}>
                  {([['MALE', 'Erkek'], ['FEMALE', 'Kadın']] as const).map(([val, lbl]) => (
                    <Pressable key={val} style={[styles.segment, gender === val && styles.segmentActive]}
                      onPress={() => { setGender(val); clearError(); }}>
                      <Text style={[styles.segmentText, gender === val && styles.segmentTextActive]}>{lbl}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* KVKK */}
              <Pressable style={styles.kvkkRow} onPress={() => setKvkkAccepted(v => !v)}>
                <View style={[styles.checkbox, kvkkAccepted && styles.checkboxChecked]}>
                  {kvkkAccepted && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={styles.kvkkText}>
                  KVKK Aydınlatma Metni'ni okudum ve anladım.{' '}
                  <Text
                    style={styles.kvkkLink}
                    onPress={(e) => { e.stopPropagation(); setKvkkModalVisible(true); }}
                  >
                    Açık Rıza Metnini görüntüle
                  </Text>
                </Text>
              </Pressable>

              <Pressable style={styles.kvkkRow} onPress={() => setElectronicConsent(v => !v)}>
                <View style={[styles.checkbox, electronicConsent && styles.checkboxChecked]}>
                  {electronicConsent && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={styles.kvkkText}>
                  Tarafıma e-posta ve/veya SMS ile ticari elektronik ileti gönderilmesini kabul ediyorum.{' '}
                  <Text style={styles.optionalBadge}>(İsteğe bağlı)</Text>
                </Text>
              </Pressable>

              {!!error && <ErrorBox message={error} />}

              <Pressable
                style={[styles.btn, (!kvkkAccepted || loading) && styles.btnDisabled]}
                onPress={onNext}
                disabled={!kvkkAccepted || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Devam Et →</Text>
                }
              </Pressable>

              <Pressable style={styles.loginLink} onPress={() => router.push('/auth' as any)}>
                <Text style={styles.loginLinkText}>Zaten hesabın var mı? <Text style={{ color: PURPLE }}>Giriş yap</Text></Text>
              </Pressable>
            </View>
          )}

          {/* ADIM 2 */}
          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Influencer Bilgileri</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Telefon</Text>
                <PhoneInput
                  value={gsmNumber}
                  onChange={(v) => { setGsmNumber(v); clearError(); }}
                  borderColor={BORDER}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Şirket Tipi</Text>
                <View style={styles.segmentRow}>
                  {(['BIREYSEL', 'LTD'] as CompanyType[]).map((t) => (
                    <Pressable key={t} style={[styles.segment, companyType === t && styles.segmentActive]}
                      onPress={() => { setCompanyType(t); clearError(); }}>
                      <Text style={[styles.segmentText, companyType === t && styles.segmentTextActive]}>
                        {t === 'BIREYSEL' ? 'Şahıs' : 'Ltd / A.Ş.'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {companyType === 'BIREYSEL' ? (
                <Field label="TC Kimlik No">
                  <TextInput style={styles.input} value={nationalId} onChangeText={(v) => { setNationalId(v); clearError(); }}
                    placeholder="11 haneli TC Kimlik No" placeholderTextColor="#9A96B5" keyboardType="numeric" maxLength={11} />
                </Field>
              ) : (
                <Field label="Vergi No">
                  <TextInput style={styles.input} value={taxNumber} onChangeText={(v) => { setTaxNumber(v); clearError(); }}
                    placeholder="Vergi numarası" placeholderTextColor="#9A96B5" keyboardType="numeric" />
                </Field>
              )}

              <Text style={styles.sectionTitle}>Sosyal Medya</Text>

              <SocialInput platform="Instagram" badge="◎" badgeColor="#FCE7F3" required value={instagramUrl}
                onChange={(v) => { setInstagramUrl(v); clearError(); }} />
              <SocialInput platform="YouTube" badge="▶" badgeColor="#FEE2E2" value={youtubeUrl}
                onChange={(v) => { setYoutubeUrl(v); clearError(); }} />
              <SocialInput platform="TikTok" badge="♪" badgeColor="#E0E7FF" value={tiktokUrl}
                onChange={(v) => { setTiktokUrl(v); clearError(); }} />
              <SocialInput platform="Twitter / X" badge="𝕏" badgeColor="#E0F2FE" value={twitterUrl}
                onChange={(v) => { setTwitterUrl(v); clearError(); }} />

              {!!error && <ErrorBox message={error} />}

              <Pressable style={({ pressed }) => [styles.btn, pressed && styles.pressed, loading && styles.btnDisabled]}
                onPress={onSubmit} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Başvuruyu Gönder ✓</Text>
                }
              </Pressable>

              <Pressable style={styles.backLink} onPress={() => { setStep(1); setError(''); }}>
                <Text style={styles.backLinkText}>← Geri Dön</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function SocialInput({ platform, badge, badgeColor, required, value, onChange }: {
  platform: string; badge: string; badgeColor: string;
  required?: boolean; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={styles.socialRow}>
      <View style={[styles.socialBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.badgeIcon}>{badge}</Text>
        <View>
          <Text style={styles.badgePlatform}>{platform}</Text>
          <Text style={styles.badgeSub}>{required ? 'Zorunlu' : 'Opsiyonel'}</Text>
        </View>
      </View>
      <TextInput
        style={styles.socialInput}
        value={value}
        onChangeText={onChange}
        placeholder="Profil linki"
        placeholderTextColor="#9A96B5"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
    </View>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={16} color="#A33A3A" />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { padding: 20, paddingTop: 12, gap: 16 },

  stepIndicator: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'flex-start', gap: 32, position: 'relative',
    marginBottom: -4,
  },
  stepDivider: {
    position: 'absolute', top: 16, left: '35%', right: '35%',
    height: 2, backgroundColor: '#DDD7FF', zIndex: -1,
  },
  stepIndicatorItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EEEBFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#DDD7FF',
  },
  stepDotActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  stepDotText: { fontSize: 13, fontWeight: '700', color: '#9A96B5' },
  stepDotTextActive: { color: '#fff' },
  stepDotLabel: { fontSize: 11, color: '#9A96B5', fontWeight: '600' },
  stepDotLabelActive: { color: PURPLE },

  card: {
    backgroundColor: '#fff', borderRadius: 24,
    padding: 20, gap: 14,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1C1631', marginBottom: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#5D5677', marginTop: 4, marginBottom: -4 },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#2E2350', marginLeft: 2 },
  input: {
    minHeight: 50, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#FBFAFF',
    paddingHorizontal: 14, fontSize: 15, color: '#1C1631',
  },
  passRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  eyeBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: '#FBFAFF', borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },

  segmentRow: { flexDirection: 'row', gap: 10 },
  segment: {
    flex: 1, height: 44, borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#FBFAFF',
    alignItems: 'center', justifyContent: 'center',
  },
  segmentActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  segmentText: { fontSize: 13, fontWeight: '700', color: '#5D5677' },
  segmentTextActive: { color: '#fff' },

  socialRow: {
    minHeight: 54, borderRadius: 16,
    borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#FBFAFF',
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  socialBadge: {
    minHeight: 54, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRightWidth: 1, borderRightColor: 'rgba(141,115,255,0.2)',
  },
  badgeIcon: { fontSize: 16, fontWeight: '700', color: '#2E2350' },
  badgePlatform: { fontSize: 12, fontWeight: '700', color: '#2E2350' },
  badgeSub: { fontSize: 10, fontWeight: '600', color: '#5D5677' },
  socialInput: { flex: 1, minHeight: 54, paddingHorizontal: 12, fontSize: 14, color: '#1C1631' },

  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: '#FFF1F1', borderRadius: 12,
    borderWidth: 1, borderColor: '#F0B8B8',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { flex: 1, color: '#A33A3A', fontSize: 13, lineHeight: 18 },

  btn: {
    minHeight: 52, borderRadius: 14,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.85 },

  loginLink: { alignItems: 'center', paddingTop: 4 },
  loginLinkText: { fontSize: 13, color: '#5D5677' },
  backLink: { alignItems: 'center', paddingTop: 4 },
  backLinkText: { fontSize: 13, color: PURPLE, fontWeight: '600' },

  kvkkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: BORDER,
    backgroundColor: '#FBFAFF',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: PURPLE, borderColor: PURPLE },
  kvkkText: { flex: 1, fontSize: 13, color: '#5D5677', lineHeight: 19 },
  kvkkLink: { color: '#2563EB', fontWeight: '600' },
  optionalBadge: { color: '#9A96B5', fontWeight: '500' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1C1631' },
  modalSubtitle: { fontSize: 13, color: '#5D5677', marginBottom: 4 },
  modalDate: { fontSize: 12, color: '#9A96B5', marginBottom: 14 },
  modalScroll: { flexGrow: 0 },
  modalBody: { fontSize: 13, color: '#3D3660', lineHeight: 21 },
  modalBtn: {
    marginTop: 16, height: 50, borderRadius: 14,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
