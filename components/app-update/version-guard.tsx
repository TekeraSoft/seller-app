import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { AppVersionCheckResponse, fetchSellerAppVersionPolicy } from '@/features/app-update/api';

export function VersionGuard() {
  const [policy, setPolicy] = useState<AppVersionCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const runCheck = async () => {
      try {
        const nextPolicy = await fetchSellerAppVersionPolicy();
        if (!isMountedRef.current) {
          return;
        }
        setPolicy(nextPolicy);
      } catch {
        if (!isMountedRef.current) {
          return;
        }
        setPolicy(null);
      } finally {
        if (isMountedRef.current) {
          setIsChecking(false);
        }
      }
    };

    void runCheck();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void runCheck();
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.remove();
    };
  }, []);

  const isForceUpdate = policy?.updateMode === 'FORCE';
  const isSoftUpdate = policy?.updateMode === 'SOFT' && policy.latestVersion !== dismissedVersion;
  const isVisible = isForceUpdate || isSoftUpdate;

  const handleDismiss = () => {
    if (!policy || policy.updateMode !== 'SOFT') {
      return;
    }
    setDismissedVersion(policy.latestVersion);
  };

  const handleUpdatePress = async () => {
    if (!policy?.storeUrl) {
      return;
    }
    try {
      await Linking.openURL(policy.storeUrl);
    } catch {
      // No-op. The guard remains visible for force updates.
    }
  };

  return (
    <>

      <Modal transparent visible={isVisible} animationType="fade" statusBarTranslucent>
        <View style={styles.backdrop}>
          <View style={[styles.card, isForceUpdate && styles.cardForce]}>
            <AppText style={styles.badge} tone="rounded">
              {isForceUpdate ? 'Zorunlu Güncelleme' : 'Güncelleme Hazır'}
            </AppText>

            <AppText style={styles.title} tone="rounded">
              {policy?.title || 'Güncelleme'}
            </AppText>

            <AppText style={styles.message}>
              {policy?.message || 'Uygulamanın yeni bir sürümü mevcut.'}
            </AppText>

            <View style={styles.versionBox}>
              <View style={styles.versionRow}>
                <AppText style={styles.versionLabel}>Mevcut sürüm</AppText>
                <AppText style={styles.versionValue} tone="mono">
                  {policy?.currentVersion || '-'}
                </AppText>
              </View>
              <View style={styles.versionRow}>
                <AppText style={styles.versionLabel}>Son sürüm</AppText>
                <AppText style={styles.versionValue} tone="mono">
                  {policy?.latestVersion || '-'}
                </AppText>
              </View>
              <View style={styles.versionRow}>
                <AppText style={styles.versionLabel}>Minimum sürüm</AppText>
                <AppText style={styles.versionValue} tone="mono">
                  {policy?.minimumSupportedVersion || '-'}
                </AppText>
              </View>
            </View>

            <View style={styles.actions}>
              {!isForceUpdate ? (
                <Pressable style={styles.secondaryButton} onPress={handleDismiss}>
                  <AppText style={styles.secondaryButtonText}>Daha Sonra</AppText>
                </Pressable>
              ) : null}

              <Pressable style={styles.primaryButton} onPress={handleUpdatePress}>
                <AppText style={styles.primaryButtonText}>Güncelle</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 239, 242, 0.28)',
    zIndex: 20,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 18, 26, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
  },
  cardForce: {
    borderWidth: 1,
    borderColor: '#F3B1B1',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#F3EEFF',
    color: '#5E4BCE',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  title: {
    color: '#17171B',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  message: {
    color: '#4E4E57',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans,
  },
  versionBox: {
    borderRadius: 16,
    backgroundColor: '#F6F6FA',
    padding: 14,
    gap: 10,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  versionLabel: {
    color: '#676772',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  versionValue: {
    color: '#1C1C22',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  secondaryButton: {
    minWidth: 110,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCDDE6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#42424B',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  primaryButton: {
    minWidth: 120,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6D57F2',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
});
