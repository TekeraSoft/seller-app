import { isAxiosError } from 'axios';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
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

import { useAuth } from '@/context/auth-context';
import { API_BASE_URL, api } from '@/lib/api';
import { analyticsService } from '@/services/analytics.service';

const { width, height } = Dimensions.get('window');

type AuthResponse = {
  accessToken?: string;
  refreshToken?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

export default function AuthScreen() {
  const { isAuthenticated, isLoading, signIn, userType, roles } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    if (roles.includes('CUSTOMER')) return <Redirect href="/influencer" />;
    return <Redirect href="/(tabs)" />;
  }

  async function onLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Email ve şifre zorunlu.');
      return;
    }

    setError('');

    try {
      const response = await api.post<AuthResponse>('/auth/authenticate', {
        email: email.trim(),
        password: password.trim(),
      });

      const responseToken = response.data?.accessToken ?? response.data?.data?.accessToken ?? null;
      const responseRefreshToken =
        response.data?.refreshToken ?? response.data?.data?.refreshToken ?? null;

      if (typeof responseToken !== 'string' || !responseToken.trim()) {
        setError('Access token dönmedi. API yanıtını kontrol et.');
        return;
      }

      if (typeof responseRefreshToken !== 'string' || !responseRefreshToken.trim()) {
        setError('Refresh token dönmedi. API yanıtını kontrol et.');
        return;
      }

      await signIn({
        accessToken: responseToken.trim(),
        refreshToken: responseRefreshToken.trim(),
      });
      void analyticsService.logSellerLogin('email');
    } catch (err) {
      if (isAxiosError(err)) {
        const messageFromApi = (err.response?.data as { message?: string } | undefined)?.message ?? null;

        if (!err.response) {
          const code = err.code ?? 'UNKNOWN';
          setError(`API erişilemedi (${code}). Base URL: ${API_BASE_URL}`);
          return;
        }

        setError(messageFromApi ?? `Giriş başarısız (HTTP ${err.response.status}).`);
        return;
      }

      if (err instanceof Error) {
        setError(`Beklenmeyen hata: ${err.message}`);
        return;
      }

      setError('Beklenmeyen bir hata oluştu.');
    }
  }

  return (
    <View style={styles.root}>
      {/* ── Arka plan dekoratif daireler ── */}
      <View style={[styles.circle, styles.circleTR]} />
      <View style={[styles.circle, styles.circleTRInner]} />
      <View style={[styles.circle, styles.circleBL]} />
      <View style={[styles.circle, styles.circleBLInner]} />
      <View style={[styles.circle, styles.circleTL]} />
      <View style={[styles.circle, styles.circleBR]} />
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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/logotekera.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Kart */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Hoş geldiniz</Text>
            <Text style={styles.cardSubtitle}>Hesabınıza giriş yapın</Text>

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
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#b0b0b0"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]} onPress={onLogin}>
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
            </Pressable>

            <Pressable
              style={styles.forgotLink}
              onPress={() => router.push('/forgot-password' as any)}
              hitSlop={8}
            >
              <Text style={styles.forgotLinkText}>Şifremi Unuttum</Text>
            </Pressable>
          </View>

          {/* Ayırıcı */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Başvuru butonları */}
          <Pressable
            style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
            onPress={() => router.push('/register/influencer' as any)}
          >
            <Text style={styles.outlineButtonText}>✦  İnfluencer Başvuru</Text>
          </Pressable>
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

  /* ── Dekoratif daireler ── */
  circle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  circleTR: {
    width: 320,
    height: 320,
    backgroundColor: PURPLE_LIGHT,
    top: -110,
    right: -90,
  },
  circleTRInner: {
    width: 180,
    height: 180,
    backgroundColor: PURPLE_MID,
    top: -40,
    right: -20,
  },
  circleBL: {
    width: 280,
    height: 280,
    backgroundColor: PURPLE_LIGHT,
    bottom: -90,
    left: -90,
  },
  circleBLInner: {
    width: 150,
    height: 150,
    backgroundColor: PURPLE_MID,
    bottom: -20,
    left: -20,
  },
  circleTL: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(141, 115, 255, 0.08)',
    top: 80,
    left: -30,
  },
  circleBR: {
    width: 130,
    height: 130,
    backgroundColor: 'rgba(141, 115, 255, 0.09)',
    bottom: 130,
    right: -40,
  },
  circleMid: {
    width: 55,
    height: 55,
    backgroundColor: 'rgba(141, 115, 255, 0.18)',
    top: height * 0.38,
    right: 18,
  },

  /* ── Layout ── */
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 14,
  },

  /* ── Logo ── */
  logoContainer: {
    alignItems: 'center',
    marginBottom: 6,
  },
  logo: {
    width: 190,
    height: 76,
  },

  /* ── Kart ── */
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    gap: 14,
    shadowColor: '#8D73FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: -8,
  },

  /* ── Input ── */
  inputWrapper: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444444',
    marginLeft: 2,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#e8e3ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1a1a2e',
    backgroundColor: '#faf9ff',
  },

  /* ── Hata ── */
  errorBox: {
    backgroundColor: '#fff0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#e53935',
  },
  errorText: {
    color: '#c62828',
    fontSize: 13,
  },

  /* ── Giriş butonu ── */
  loginButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 4,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  /* ── Şifremi unuttum ── */
  forgotLink: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 4,
    cursor: 'pointer' as any,
  },
  forgotLinkText: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  /* ── Ayırıcı ── */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eeeeee',
  },
  dividerText: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: '500',
  },

  /* ── Başvuru butonları ── */
  outlineButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PURPLE,
    backgroundColor: '#faf9ff',
  },
  outlineButtonText: {
    color: PURPLE,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  pressed: { opacity: 0.82 },
});
