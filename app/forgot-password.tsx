import { Ionicons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { API_BASE_URL, api } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit() {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError('E-posta adresinizi giriniz.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Geçerli bir e-posta adresi giriniz.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await api.post(`/account/forgotPassword?email=${encodeURIComponent(trimmed)}`);
      setIsSent(true);
    } catch (err) {
      if (isAxiosError(err)) {
        const messageFromApi = (err.response?.data as { message?: string } | undefined)?.message ?? null;

        if (!err.response) {
          const code = err.code ?? 'UNKNOWN';
          setError(`API erişilemedi (${code}). Base URL: ${API_BASE_URL}`);
          return;
        }

        setError(messageFromApi ?? `İşlem başarısız (HTTP ${err.response.status}).`);
        return;
      }

      if (err instanceof Error) {
        setError(`Beklenmeyen hata: ${err.message}`);
        return;
      }

      setError('Beklenmeyen bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.circle, styles.circleTR]} />
      <View style={[styles.circle, styles.circleBL]} />
      <View style={[styles.circle, styles.circleMid]} />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/logotekera.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="lock-closed-outline" size={32} color={PURPLE} />
            </View>

            <Text style={styles.cardTitle}>Şifremi Unuttum</Text>
            <Text style={styles.cardSubtitle}>
              {isSent
                ? 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.'
                : 'Kayıtlı e-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.'}
            </Text>

            {!isSent ? (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>E-posta</Text>
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="ornek@email.com"
                    placeholderTextColor="#b0b0b0"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    editable={!isLoading}
                  />
                </View>

                {!!error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Bağlantı Gönder</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                onPress={() => router.replace('/auth')}
              >
                <Text style={styles.primaryButtonText}>Giriş Sayfasına Dön</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.backLink}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Text style={styles.backLinkText}>← Geri dön</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const PURPLE = '#8D73FF';
const PURPLE_LIGHT = 'rgba(141, 115, 255, 0.13)';
const PURPLE_MID = 'rgba(141, 115, 255, 0.22)';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  circleTR: {
    width: 340,
    height: 340,
    backgroundColor: PURPLE_LIGHT,
    top: -140,
    right: -120,
  },
  circleBL: {
    width: 300,
    height: 300,
    backgroundColor: PURPLE_MID,
    bottom: -120,
    left: -100,
  },
  circleMid: {
    width: 140,
    height: 140,
    backgroundColor: PURPLE_LIGHT,
    top: 220,
    left: -40,
  },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 180,
    height: 56,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b6b7b',
    marginTop: 6,
    marginBottom: 22,
    textAlign: 'center',
    lineHeight: 19,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b6b7b',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e5e5ed',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1a1a2e',
    backgroundColor: '#fafafc',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  backLink: {
    alignSelf: 'center',
    marginTop: 18,
    padding: 8,
  },
  backLinkText: {
    fontSize: 14,
    color: '#6b6b7b',
    fontWeight: '500',
  },
});
