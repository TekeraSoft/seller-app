import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { isAxiosError } from 'axios';

import { useAuth } from '@/context/auth-context';
import { API_BASE_URL, api } from '@/lib/api';

type AuthResponse = {
  accessToken?: string;
  refreshToken?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

export default function AuthScreen() {
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
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
    <View style={styles.container}>
      <Text style={styles.title}>Tekera21</Text>
      <Text style={styles.subtitle}>Hesabına giriş yap</Text>

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#8c8c8c"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        secureTextEntry
        placeholder="Şifre"
        placeholderTextColor="#8c8c8c"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={onLogin}>
        <Text style={styles.buttonText}>Giriş Yap</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f4f4f4',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111111',
  },
  subtitle: {
    color: '#444444',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  button: {
    marginTop: 6,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f6feb',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#c62828',
    fontSize: 13,
  },
});