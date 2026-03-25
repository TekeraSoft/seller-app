import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
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

const PURPLE = '#8D73FF';
const BORDER = '#DDD7FF';
const BACKGROUND = '#F7F5FF';

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function InfluencerRegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [error, setError] = useState('');

  const trimmedValues = useMemo(
    () => ({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      instagramUrl: instagramUrl.trim(),
      youtubeUrl: youtubeUrl.trim(),
      facebookUrl: facebookUrl.trim(),
    }),
    [facebookUrl, firstName, instagramUrl, lastName, youtubeUrl]
  );

  function onSubmit() {
    if (!trimmedValues.firstName || !trimmedValues.lastName) {
      setError('Ad ve soyad zorunludur.');
      return;
    }

    if (!trimmedValues.instagramUrl) {
      setError('Instagram bağlantısı zorunludur.');
      return;
    }

    if (!isValidUrl(trimmedValues.instagramUrl)) {
      setError('Instagram bağlantısı geçerli bir link olmalıdır.');
      return;
    }

    if (trimmedValues.youtubeUrl && !isValidUrl(trimmedValues.youtubeUrl)) {
      setError('YouTube bağlantısı geçerli bir link olmalıdır.');
      return;
    }

    if (trimmedValues.facebookUrl && !isValidUrl(trimmedValues.facebookUrl)) {
      setError('Facebook bağlantısı geçerli bir link olmalıdır.');
      return;
    }

    setError('');
    Alert.alert('Başvuru hazır', 'Form bilgileri doğrulandı. Sonraki adımda API entegrasyonu eklenebilir.');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'İnfluencer Başvuru' }} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.subtitle}>
              Bilgilerini gir. Instagram bağlantısı zorunlu, diğer sosyal medya alanları opsiyonel.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={(value) => {
                  setFirstName(value);
                  if (error) setError('');
                }}
                placeholder="Adınızı girin"
                placeholderTextColor="#9A96B5"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={(value) => {
                  setLastName(value);
                  if (error) setError('');
                }}
                placeholder="Soyadınızı girin"
                placeholderTextColor="#9A96B5"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <View style={styles.socialInputRow}>
                <View style={[styles.socialBadge, styles.instagramBadge]}>
                  <Text style={styles.socialBadgeIcon}>◎</Text>
                  <View style={styles.socialBadgeCopy}>
                    <Text style={styles.socialBadgeText}>Instagram</Text>
                    <Text style={styles.socialBadgeMeta}>Zorunlu</Text>
                  </View>
                </View>
                <TextInput
                  style={styles.socialInput}
                  value={instagramUrl}
                  onChangeText={(value) => {
                    setInstagramUrl(value);
                    if (error) setError('');
                  }}
                  placeholder="Instagram profil linki"
                  placeholderTextColor="#9A96B5"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.socialInputRow}>
                <View style={[styles.socialBadge, styles.youtubeBadge]}>
                  <Text style={styles.socialBadgeIcon}>▶</Text>
                  <View style={styles.socialBadgeCopy}>
                    <Text style={styles.socialBadgeText}>YouTube</Text>
                    <Text style={styles.socialBadgeMeta}>Opsiyonel</Text>
                  </View>
                </View>
                <TextInput
                  style={styles.socialInput}
                  value={youtubeUrl}
                  onChangeText={(value) => {
                    setYoutubeUrl(value);
                    if (error) setError('');
                  }}
                  placeholder="YouTube kanal linki"
                  placeholderTextColor="#9A96B5"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.socialInputRow}>
                <View style={[styles.socialBadge, styles.facebookBadge]}>
                  <Text style={styles.socialBadgeIcon}>f</Text>
                  <View style={styles.socialBadgeCopy}>
                    <Text style={styles.socialBadgeText}>Facebook</Text>
                    <Text style={styles.socialBadgeMeta}>Opsiyonel</Text>
                  </View>
                </View>
                <TextInput
                  style={styles.socialInput}
                  value={facebookUrl}
                  onChangeText={(value) => {
                    setFacebookUrl(value);
                    if (error) setError('');
                  }}
                  placeholder="Facebook profil linki"
                  placeholderTextColor="#9A96B5"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]} onPress={onSubmit}>
              <Text style={styles.submitButtonText}>Başvuruyu devam ettir</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
    gap: 4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5D5677',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E2350',
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FBFAFF',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1C1631',
  },
  socialInputRow: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FBFAFF',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  socialBadge: {
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.55)',
  },
  instagramBadge: {
    backgroundColor: '#FCE7F3',
  },
  youtubeBadge: {
    backgroundColor: '#FEE2E2',
  },
  facebookBadge: {
    backgroundColor: '#DBEAFE',
  },
  socialBadgeIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E2350',
  },
  socialBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E2350',
  },
  socialBadgeCopy: {
    gap: 1,
  },
  socialBadgeMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5D5677',
  },
  socialInput: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1C1631',
  },
  errorBox: {
    borderRadius: 16,
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#F0B8B8',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: '#A33A3A',
    fontSize: 13,
    lineHeight: 19,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
});
