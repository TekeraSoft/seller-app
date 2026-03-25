import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '@/lib/api';

const BRAND_ACCENT = '#3B82F6';
const HEADER_BG = '#F0F7FF';

type SignUpForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender: 'MALE' | 'FEMALE';
  isAcceptAgreement: boolean;
};

const AGREEMENT_TEXT = `1. Taraflar
İşbu sözleşme, merkezi Türkiye'de bulunan Tekera Teknoloji Ticaret ve Sanayi Limited Şirketi ("Tekera21" veya "Platform") ile platforma üye olan gerçek veya tüzel kişi ("Üye") arasında elektronik ortamda kurulmuştur.

2. Tanımlar
Platform: Tekera21 tarafından işletilen çevrimiçi pazaryeri
Satıcı: Platform üzerinden ürün/hizmet sunan üye
Alıcı: Platform üzerinden ürün/hizmet satın alan üye
Sipariş: Alıcının platform üzerinden oluşturduğu satın alma talebi
İçerik: Ürün açıklamaları, görseller, fiyat, stok ve her türlü satıcı beyanı

3. Platformun Hukuki Konumu
Tekera21, 6502 sayılı Kanun kapsamında aracı hizmet sağlayıcıdır. Satış sözleşmesi doğrudan alıcı ile satıcı arasında kurulur. Tekera21, ürünün satıcısı, üreticisi, ithalatçısı veya sağlayıcısı değildir.

4. Satıcının Yükümlülükleri
Satıcı;
• Ürünlerin mevzuata uygunluğundan
• Sahte, kaçak, ayıplı veya yasaklı ürün satmamaktan
• İlan içeriklerinin doğruluğundan
• Vergisel yükümlülüklerden
• Cayma, iade ve ayıplı ürün işlemlerinden
• Müşteri taleplerinin cevaplanmasından
bizzat sorumludur.

5. Platformun Yetkileri
Tekera21;
• Satıcıdan belge ve doğrulama isteme
• Uygunsuz ilanları yayından kaldırma
• Satıcı hesabını askıya alma
• Gerekirse ödemeleri bloke etme
yetkisine sahiptir.

6. Ödeme ve Bloke Sistemi
Ödemeler üçüncü taraf ödeme kuruluşları üzerinden yapılır. Tekera21, alıcının cayma hakkı ve ihtilaf süreçleri tamamlanmadan satıcıya ödeme aktarımını durdurabilir.

7. Komisyon
Tekera21, satıcıdan ilan, satış ve hizmet bedeli tahsil edebilir. Oranlar platformda ilan edilir ve bağlayıcıdır.

8. Cayma, İade ve Ayıplı Ürün
Cayma ve iade süreçlerinden satıcı sorumludur. Tekera21, süreci izlemekle sınırlıdır.

9. Sorumluluğun Sınırlandırılması
Tekera21, satıcı içeriğinden ve ürünün niteliğinden sorumlu değildir. Platform yalnızca aracıdır.

10. KVKK
Kişisel veriler, aydınlatma metni ve çerez politikası çerçevesinde işlenir.

11. Fesih
Tekera21, mevzuata aykırı hareket eden üyelerin hesabını tek taraflı kapatabilir.

12. Yetkili Mahkeme
Antalya Mahkemeleri ve İcra Daireleri yetkilidir.

13. Yürürlük
Üyelikle birlikte yürürlüğe girer.`;

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<SignUpForm>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    gender: 'FEMALE',
    isAcceptAgreement: false,
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  const slideAnim = useRef(new Animated.Value(80)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const inputBorder = (field: string) =>
    focusedField === field ? BRAND_ACCENT : '#E2E8F0';

  const update = (key: keyof SignUpForm, val: SignUpForm[keyof SignUpForm]) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  async function handleRegister() {
    if (!formData.email.trim() || !formData.password.trim() || !formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert('Eksik bilgi', 'Lütfen tüm alanları doldurunuz.');
      return;
    }

    if (formData.password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }

    if (!/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{6,}$/.test(formData.password)) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalı, büyük/küçük harf ve rakam içermelidir.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi giriniz.');
      return;
    }

    if (!formData.isAcceptAgreement) {
      Alert.alert('Hata', 'Kullanıcı sözleşmesini kabul etmelisiniz.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/register', {
        ...formData,
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      });

      Alert.alert('Başarılı', 'Kayıt başarılı. Giriş yapabilirsiniz.', [
        { text: 'Tamam', onPress: () => router.replace('/auth') },
      ]);
    } catch (error) {
      if (isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ??
          'Kayıt sırasında bir hata oluştu.';
        Alert.alert('Hata', message);
      } else {
        Alert.alert('Hata', 'Kayıt sırasında bir hata oluştu.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />

        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#334155" />
            <Text style={styles.backText}>Geri</Text>
          </TouchableOpacity>
          <Image
            source={require('@/assets/images/logotekera.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Hesap Oluştur</Text>
          <Text style={styles.headerSub}>Tekera21'e katıl, kazanmaya başla</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.rowFields}>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.label}>AD</Text>
              <View style={[styles.inputRow, { borderColor: inputBorder('firstName') }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Adınız"
                  placeholderTextColor="#64748B"
                  value={formData.firstName}
                  onChangeText={(value) => update('firstName', value)}
                  autoCapitalize="words"
                  editable={!isLoading}
                  onFocus={() => setFocusedField('firstName')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.label}>SOYAD</Text>
              <View style={[styles.inputRow, { borderColor: inputBorder('lastName') }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Soyadınız"
                  placeholderTextColor="#64748B"
                  value={formData.lastName}
                  onChangeText={(value) => update('lastName', value)}
                  autoCapitalize="words"
                  editable={!isLoading}
                  onFocus={() => setFocusedField('lastName')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>E-POSTA</Text>
            <View style={[styles.inputRow, { borderColor: inputBorder('email') }]}>
              <TextInput
                style={styles.input}
                placeholder="ornek@email.com"
                placeholderTextColor="#64748B"
                value={formData.email}
                onChangeText={(value) => update('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>ŞİFRE</Text>
            <View style={[styles.inputRow, { borderColor: inputBorder('password') }]}>
              <TextInput
                style={styles.input}
                placeholder="En az 6 karakter"
                placeholderTextColor="#64748B"
                value={formData.password}
                onChangeText={(value) => update('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
                <Text style={styles.eyeText}>{showPassword ? 'Gizle' : 'Göster'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Büyük/küçük harf ve rakam içermeli</Text>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>ŞİFRE TEKRAR</Text>
            <View style={[styles.inputRow, { borderColor: inputBorder('confirm') }]}>
              <TextInput
                style={styles.input}
                placeholder="Şifrenizi tekrar girin"
                placeholderTextColor="#64748B"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword((value) => !value)} hitSlop={8}>
                <Text style={styles.eyeText}>{showConfirmPassword ? 'Gizle' : 'Göster'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>CİNSİYET</Text>
            <View style={styles.genderRow}>
              {(['FEMALE', 'MALE'] as const).map((gender) => {
                const selected = formData.gender === gender;
                return (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderBtn,
                      {
                        borderColor: selected ? BRAND_ACCENT : '#E2E8F0',
                        backgroundColor: selected ? '#DBEAFE' : '#F8FAFC',
                      },
                    ]}
                    onPress={() => update('gender', gender)}
                    disabled={isLoading}
                  >
                    <Text style={styles.genderText}>{gender === 'FEMALE' ? 'Kadın' : 'Erkek'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={styles.agreementRow}
            onPress={() => !isLoading && update('isAcceptAgreement', !formData.isAcceptAgreement)}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: formData.isAcceptAgreement ? BRAND_ACCENT : '#E2E8F0',
                  backgroundColor: formData.isAcceptAgreement ? BRAND_ACCENT : 'transparent',
                },
              ]}
            >
              {formData.isAcceptAgreement && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <View style={styles.agreementTextWrap}>
              <Text style={styles.agreementText}>
                <Text style={styles.agreementLink} onPress={() => !isLoading && setShowAgreementModal(true)}>
                  Kullanıcı Sözleşmesi
                </Text>
                <Text>{"'ni okudum ve kabul ediyorum."}</Text>
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cta, (isLoading || !formData.isAcceptAgreement) && styles.ctaDisabled]}
            onPress={handleRegister}
            disabled={isLoading || !formData.isAcceptAgreement}
            activeOpacity={0.85}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Kayıt Ol</Text>}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      <Modal
        visible={showAgreementModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAgreementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kullanıcı Sözleşmesi</Text>
              <TouchableOpacity onPress={() => setShowAgreementModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalText}>{AGREEMENT_TEXT}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: HEADER_BG,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    backgroundColor: HEADER_BG,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#BFDBFE',
    opacity: 0.6,
    top: -70,
    right: -50,
  },
  blob2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#DDD6FE',
    opacity: 0.45,
    bottom: -20,
    right: 60,
  },
  blob3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#A5F3FC',
    opacity: 0.4,
    top: 20,
    left: -20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 20,
  },
  backText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  logo: {
    width: 200,
    height: 52,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E3A5F',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 24,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldWrap: {
    marginBottom: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
    color: '#64748B',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
    backgroundColor: '#F8FAFC',
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    color: '#0F172A',
  },
  eyeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    marginTop: 6,
    marginLeft: 2,
    color: '#64748B',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderWidth: 1.5,
    borderRadius: 14,
  },
  genderText: {
    fontSize: 15,
    color: '#0F172A',
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  agreementTextWrap: {
    flex: 1,
  },
  agreementText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  agreementLink: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
    color: BRAND_ACCENT,
  },
  cta: {
    height: 56,
    borderRadius: 16,
    backgroundColor: BRAND_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: BRAND_ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaDisabled: {
    opacity: 0.65,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalText: {
    fontSize: 13,
    lineHeight: 22,
    color: '#334155',
  },
});
