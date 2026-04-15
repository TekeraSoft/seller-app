import { Ionicons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { changePassword } from '@/features/account/api';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function validate(): string | null {
    if (!oldPassword) return 'Mevcut şifrenizi giriniz.';
    if (!newPassword) return 'Yeni şifrenizi giriniz.';
    if (newPassword.length < 8) return 'Yeni şifre en az 8 karakter olmalıdır.';
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return 'Yeni şifre en az bir harf ve bir rakam içermelidir.';
    }
    if (newPassword === oldPassword) return 'Yeni şifre mevcut şifre ile aynı olamaz.';
    if (newPassword !== confirmPassword) return 'Yeni şifreler eşleşmiyor.';
    return null;
  }

  async function handleSubmit() {
    setSuccess('');
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await changePassword({ oldPassword, newPassword });
      setSuccess('Şifreniz başarıyla güncellendi.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => router.back(), 1200);
    } catch (e) {
      if (isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string } | undefined)?.message;
        if (!e.response) {
          setError('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyiniz.');
        } else {
          setError(msg ?? 'Şifre değiştirilemedi. Lütfen tekrar deneyiniz.');
        }
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Beklenmeyen bir hata oluştu.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppText style={styles.subtitle} tone="rounded">
            Güvenliğiniz için düzenli olarak şifrenizi güncellemenizi öneririz.
          </AppText>

          <PasswordField
            label="Mevcut Şifre"
            value={oldPassword}
            onChangeText={(v) => {
              setOldPassword(v);
              setError('');
            }}
            visible={showOld}
            onToggle={() => setShowOld((v) => !v)}
            editable={!isLoading}
          />

          <PasswordField
            label="Yeni Şifre"
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              setError('');
            }}
            visible={showNew}
            onToggle={() => setShowNew((v) => !v)}
            editable={!isLoading}
          />
          <AppText style={styles.hint} tone="rounded">
            En az 8 karakter, bir harf ve bir rakam içermeli.
          </AppText>

          <PasswordField
            label="Yeni Şifre (Tekrar)"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              setError('');
            }}
            visible={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            editable={!isLoading}
          />

          {error !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
              <AppText style={styles.errorText} tone="rounded">
                {error}
              </AppText>
            </View>
          )}

          {success !== '' && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#065F46" />
              <AppText style={styles.successText} tone="rounded">
                {success}
              </AppText>
            </View>
          )}

          <Pressable
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText style={styles.submitText} tone="rounded">
                Şifreyi Güncelle
              </AppText>
            )}
          </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggle,
  editable,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  editable: boolean;
}) {
  return (
    <View style={styles.field}>
      <AppText style={styles.label} tone="rounded">
        {label}
      </AppText>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
          placeholder="••••••••"
          placeholderTextColor="#B0AACC"
        />
        <Pressable onPress={onToggle} hitSlop={8} style={styles.eyeBtn}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6B7280" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#EFEFF2' },
  content: { paddingHorizontal: 16, paddingVertical: 18, gap: 14 },
  subtitle: { fontSize: 13, color: '#6B7280', lineHeight: 19, fontFamily: Fonts.rounded },
  field: { gap: 6 },
  label: { fontSize: 12, color: '#4B5563', fontWeight: '600', fontFamily: Fonts.rounded },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD7FF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 14,
    color: '#1C1631',
    fontFamily: Fonts.sans,
  },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  hint: { fontSize: 11, color: '#8A8A94', fontFamily: Fonts.sans, marginTop: -6 },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { flex: 1, color: '#B91C1C', fontSize: 13, fontFamily: Fonts.rounded },
  successBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successText: { flex: 1, color: '#065F46', fontSize: 13, fontFamily: Fonts.rounded },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8D73FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: Fonts.rounded },
});
