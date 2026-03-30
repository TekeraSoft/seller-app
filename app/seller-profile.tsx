import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  acceptContract,
  ContractInfo,
  fetchContractInfo,
  fetchContractText,
} from '@/features/seller/api';
import { getRolesFromToken, refreshAuthSession } from '@/lib/api';

type ScreenState = 'loading' | 'contract' | 'accepted_pending' | 'error';

export default function SellerProfileScreen() {
  const router = useRouter();
  const { signIn, signOut } = useAuth();

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [contractText, setContractText] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 32) {
      setScrolledToBottom(true);
    }
  };

  const loadData = useCallback(async () => {
    setScreenState('loading');
    setScrolledToBottom(false);
    setError(null);
    try {
      const [info, text] = await Promise.all([fetchContractInfo(), fetchContractText()]);
      setContractInfo(info);
      setContractText(text);
      if (info?.accepted) {
        setScreenState('accepted_pending');
      } else {
        setScreenState('contract');
      }
    } catch {
      setError('Bilgiler yuklenemedi.');
      setScreenState('error');
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    try {
      await acceptContract();
      const newSession = await refreshAuthSession();
      if (newSession) {
        const newRoles = getRolesFromToken(newSession.accessToken);
        if (newRoles.includes('SELLER') || newRoles.includes('SUPER_ADMIN')) {
          await signIn(newSession);
          router.replace('/');
          return;
        }
        await signIn(newSession);
      }
      setScreenState('accepted_pending');
    } catch (e: any) {
      setError(e?.message ?? 'Sozlesme kabul edilirken bir hata olustu.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator color="#7F67FF" size="large" />
          <AppText style={styles.loadingText}>Yükleniyor...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState === 'error') {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <View style={styles.center}>
          <View style={[styles.errorBox, { alignSelf: 'stretch', marginHorizontal: 16 }]}>
            <AppText style={styles.errorText}>{error}</AppText>
          </View>
        </View>
        <View style={styles.footer}>
          <Pressable style={styles.acceptButton} onPress={loadData}>
            <AppText style={styles.acceptText} tone="rounded">
              Tekrar Dene
            </AppText>
          </Pressable>
          <Pressable style={styles.logoutButton} onPress={handleSignOut}>
            <AppText style={styles.logoutText} tone="rounded">
              Çıkış Yap
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState === 'accepted_pending') {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <View style={styles.center}>
          <View style={[styles.infoCard, { marginHorizontal: 16 }]}>
            <View style={styles.iconCircle}>
              <AppText style={styles.iconText}>i</AppText>
            </View>
            <AppText style={styles.infoTitle} tone="rounded">
              Başvurunuz İnceleniyor
            </AppText>
            <AppText style={styles.infoBody} tone="rounded">
              Satıcı sözleşmesini kabul ettiniz. Hesabınız admin tarafından onaylandıktan sonra aktif
              olacaktır.
            </AppText>
          </View>
        </View>
        <View style={styles.footer}>
          <Pressable style={styles.logoutButton} onPress={handleSignOut}>
            <AppText style={styles.logoutText} tone="rounded">
              Çıkış Yap
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const acceptDisabled = !scrolledToBottom || isAccepting;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <AppText style={styles.title} tone="rounded">
          Satıcı Sözleşmesi
        </AppText>
        {contractInfo ? (
          <View style={styles.metaRow}>
            <AppText style={styles.metaLabel} tone="mono">
              v{contractInfo.version ?? '-'}
            </AppText>
            <AppText style={styles.metaLabel} tone="mono">
              {contractInfo.publishedAt ?? ''}
            </AppText>
          </View>
        ) : null}
        {!scrolledToBottom ? (
          <AppText style={styles.scrollHint}>
            Devam etmek için sözleşmenin tamamını okuyun
          </AppText>
        ) : null}
      </View>

      {contractText.length > 0 ? (
        <ScrollView
          style={styles.contractScroll}
          contentContainerStyle={styles.contractScrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator>
          <AppText style={styles.contractBody}>{contractText}</AppText>
        </ScrollView>
      ) : null}

      <View style={styles.footer}>
        {error ? (
          <View style={styles.errorBox}>
            <AppText style={styles.errorText}>{error}</AppText>
          </View>
        ) : null}
        <Pressable
          style={[styles.acceptButton, acceptDisabled && styles.disabledButton]}
          onPress={handleAccept}
          disabled={acceptDisabled}>
          <AppText style={styles.acceptText} tone="rounded">
            {isAccepting ? 'İşleniyor...' : 'Sözleşmeyi Kabul Et ve Devam Et'}
          </AppText>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={handleSignOut}>
          <AppText style={styles.logoutText} tone="rounded">
            Çıkış Yap
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EFEFF2',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#5C5C67',
    fontFamily: Fonts.sans,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#16161A',
    fontFamily: Fonts.rounded,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaLabel: {
    fontSize: 11,
    color: '#8B8B95',
    fontFamily: Fonts.mono,
  },
  scrollHint: {
    fontSize: 12,
    color: '#7F67FF',
    fontFamily: Fonts.sans,
  },
  contractScroll: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECECEF',
  },
  contractScrollContent: {
    padding: 16,
  },
  contractBody: {
    fontSize: 13,
    color: '#2C2C30',
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  errorBox: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFECEC',
    borderWidth: 1,
    borderColor: '#FFCDCD',
  },
  errorText: {
    color: '#A93535',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  acceptButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#7F67FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  logoutButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Fonts.rounded,
  },
  disabledButton: {
    opacity: 0.5,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D7D0FF',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDE9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#7F67FF',
    fontFamily: Fonts.rounded,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16161A',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  infoBody: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
});
