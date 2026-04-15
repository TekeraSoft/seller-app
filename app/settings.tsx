import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { closeInfluencerAccount } from '@/features/influencer/api';
import { closeSellerAccount } from '@/features/seller/api';

const SELLER_CLOSE_STEPS = [
  'Açık siparişleriniz (beklemede, kabul edilmiş veya kargoda) varsa hesabınız kapatılamaz.',
  'Tüm aktif ürün listelemeleriniz yayından kaldırılır.',
  'Hesabınız pasife alınır ve mağazanız görünmez olur.',
  'Geçmiş siparişleriniz ve muhasebe kayıtlarınız sistemde saklanmaya devam eder.',
  'O aya ait hakediş ödemesi henüz gerçekleşmemiş olabilir. Hesabınızı kapatmadan önce ödemelerinizi kontrol edin.',
  'Hesabınızı tekrar açmak isterseniz destek ekibimizle iletişime geçebilirsiniz; mevcut kayıtlarınız ve ürünleriniz korunur.',
];

const INFLUENCER_CLOSE_STEPS = [
  'Influencer hesabınız ve başvurunuz iptal edilir.',
  'Hesabınız pasife alınır.',
  'Bu işlem geri alınamaz. Tekrar başvurmanız gerekir.',
];

export default function SettingsScreen() {
  const { signOut, userType } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSeller = userType === 'seller';

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  const openSheet = () => {
    setReason('');
    setError('');
    setSheetVisible(true);
  };

  const closeSheet = () => {
    if (loading) return;
    setSheetVisible(false);
  };

  const handleConfirm = async () => {
    if (isSeller) {
      const trimmed = reason.trim();
      if (trimmed.length < 10) {
        setError('Lütfen en az 10 karakter giriniz.');
        return;
      }
    }

    try {
      setError('');
      setLoading(true);
      if (isSeller) {
        await closeSellerAccount(reason.trim());
      } else {
        await closeInfluencerAccount();
      }
      setSheetVisible(false);
      await signOut();
      router.replace('/auth');
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? 'Hesap kapatılırken bir hata oluştu.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const closeSteps = isSeller ? SELLER_CLOSE_STEPS : INFLUENCER_CLOSE_STEPS;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText style={styles.title} tone="rounded">
          Ayarlar
        </AppText>

        {isSeller && (
          <Pressable style={styles.profileButton} onPress={() => router.push('/seller-profile')}>
            <AppText style={styles.profileText} tone="rounded">
              Satıcı Profili
            </AppText>
          </Pressable>
        )}

        <Pressable style={styles.profileButton} onPress={() => router.push('/change-password')}>
          <AppText style={styles.profileText} tone="rounded">
            Şifre Değiştir
          </AppText>
        </Pressable>

        <Pressable
          style={styles.profileButton}
          onPress={() => Linking.openURL('https://www.tekera21.com/iletisim')}
        >
          <AppText style={styles.profileText} tone="rounded">
            İletişim
          </AppText>
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={handleSignOut}>
          <AppText style={styles.logoutText} tone="rounded">
            Çıkış Yap
          </AppText>
        </Pressable>

        {(userType === 'seller' || userType === 'influencer') && (
          <View style={styles.closeCard}>
            <AppText style={styles.closeCardTitle} tone="rounded">
              {isSeller ? 'Mağaza Kapatma' : 'Hesap Kapatma'}
            </AppText>

            <View style={styles.stepsContainer}>
              {closeSteps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepBullet}>
                    <AppText style={styles.stepBulletText} tone="rounded">
                      {index + 1}
                    </AppText>
                  </View>
                  <AppText style={styles.stepText} tone="rounded">
                    {step}
                  </AppText>
                </View>
              ))}
            </View>

            <Pressable style={styles.closeAccountButton} onPress={openSheet}>
              <AppText style={styles.closeAccountText} tone="rounded">
                {isSeller ? 'Mağazayı Kapat' : 'Hesabımı Kapat'}
              </AppText>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={closeSheet}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            behavior="padding"
            keyboardVerticalOffset={0}
          >
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.handle} />

              <AppText style={styles.sheetTitle} tone="rounded">
                {isSeller ? 'Mağazayı Kapat' : 'Hesabı Kapat'}
              </AppText>
              <AppText style={styles.sheetSubtitle} tone="rounded">
                {isSeller
                  ? 'Bu işlem geri alınamaz. Kapatma sebebinizi belirtin.'
                  : 'Influencer hesabınızı kapatmak istediğinize emin misiniz?'}
              </AppText>

              {isSeller && (
                <TextInput
                  style={styles.input}
                  placeholder="Kapatma sebebi (en az 10 karakter)"
                  placeholderTextColor="#9CA3AF"
                  value={reason}
                  onChangeText={(v) => {
                    setReason(v);
                    setError('');
                  }}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                />
              )}

              {error !== '' && (
                <AppText style={styles.errorText} tone="rounded">
                  {error}
                </AppText>
              )}

              <Pressable
                style={[styles.confirmButton, loading && styles.disabledButton]}
                onPress={handleConfirm}
                disabled={loading}
              >
                <AppText style={styles.confirmText} tone="rounded">
                  {loading ? 'İşleniyor...' : isSeller ? 'Mağazayı Kapat' : 'Hesabımı Kapat'}
                </AppText>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={closeSheet} disabled={loading}>
                <AppText style={styles.cancelText} tone="rounded">
                  Vazgeç
                </AppText>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#EFEFF2' },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 32, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#16161A', fontFamily: Fonts.rounded },
  profileButton: {
    marginTop: 8, height: 48, borderRadius: 12, backgroundColor: '#FFFFFF',
    borderColor: '#D7D0FF', borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  profileText: { color: '#5E4BCE', fontSize: 15, fontWeight: '700', fontFamily: Fonts.rounded },
  logoutButton: {
    height: 48, borderRadius: 12, backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: Fonts.rounded },

  // Close account card
  closeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#FFE0DE', padding: 16, gap: 16,
  },
  closeCardTitle: { fontSize: 16, fontWeight: '700', color: '#B71C1C', fontFamily: Fonts.rounded },
  stepsContainer: { gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepBullet: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF0EE',
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  stepBulletText: { fontSize: 11, fontWeight: '700', color: '#E53935', fontFamily: Fonts.rounded },
  stepText: { flex: 1, fontSize: 13, color: '#4B4B4B', lineHeight: 20, fontFamily: Fonts.rounded },
  closeAccountButton: {
    height: 48, borderRadius: 12, backgroundColor: '#FFEBEB',
    borderColor: '#E53935', borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  closeAccountText: { color: '#E53935', fontSize: 15, fontWeight: '700', fontFamily: Fonts.rounded },

  // Bottom sheet
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111827', fontFamily: Fonts.rounded },
  sheetSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, fontFamily: Fonts.rounded },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    fontFamily: Fonts.rounded,
    minHeight: 80,
    backgroundColor: '#F9FAFB',
  },
  errorText: { fontSize: 13, color: '#E53935', fontFamily: Fonts.rounded },
  confirmButton: {
    height: 48, borderRadius: 12, backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: Fonts.rounded },
  cancelButton: {
    height: 48, borderRadius: 12, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { color: '#374151', fontSize: 15, fontWeight: '600', fontFamily: Fonts.rounded },
  disabledButton: { opacity: 0.5 },
});
