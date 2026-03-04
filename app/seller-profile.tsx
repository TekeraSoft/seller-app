import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { fetchSellerInfo } from '@/features/seller/api';
import { resolveSellerLogoUrl, toOptionalNonEmptyString } from '@/features/seller/mappers';
import { SellerInfoResponse } from '@/features/seller/types';
import { useAppSelector } from '@/store/hooks';

type Primitive = string | number | boolean | null;

function normalizePrimitive(value: unknown): Primitive | undefined {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return undefined;
}

export default function SellerProfileScreen() {
  const [data, setData] = useState<SellerInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    profile: { basicId },
  } = useAppSelector((state) => state.seller);

  const loadSellerProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchSellerInfo();
      if (!response) {
        setData(null);
        setError('Satıcı bilgileri alınamadı.');
        return;
      }
      setData(response);
    } catch {
      setData(null);
      setError('Satıcı bilgileri alınamadı.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSellerProfile();
    }, [loadSellerProfile])
  );

  const logoUrl = useMemo(() => {
    const raw = toOptionalNonEmptyString(data?.logo);
    return raw ? resolveSellerLogoUrl(raw) : null;
  }, [data?.logo]);

  const primitiveFields = useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .filter(([key]) => !['id', 'name', 'logo', 'slug', 'basicId', 'basic_id', 'basicid'].includes(key))
      .map(([key, value]) => {
        const primitive = normalizePrimitive(value);
        if (primitive === undefined) return null;
        return { key, value: primitive };
      })
      .filter((entry): entry is { key: string; value: Primitive } => entry !== null);
  }, [data]);

  const basicIdFromApi =
    toOptionalNonEmptyString((data as Record<string, unknown> | null)?.basicId) ||
    toOptionalNonEmptyString((data as Record<string, unknown> | null)?.basic_id) ||
    toOptionalNonEmptyString((data as Record<string, unknown> | null)?.basicid) ||
    null;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText style={styles.title} tone="rounded">
          Satıcı Profili
        </AppText>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#7F67FF" />
            <AppText style={styles.loadingText}>Bilgiler yükleniyor...</AppText>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View style={styles.errorBox}>
            <AppText style={styles.errorText}>{error}</AppText>
          </View>
        ) : null}

        {!isLoading && !error ? (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.logoWrap}>
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="cover" />
                ) : (
                  <AppText style={styles.logoPlaceholder}>LOGO</AppText>
                )}
              </View>
              <View style={styles.identityWrap}>
                <AppText style={styles.nameText}>{toOptionalNonEmptyString(data?.name) ?? '-'}</AppText>
                <AppText style={styles.metaText}>Basic ID: {basicIdFromApi ?? basicId ?? '-'}</AppText>
              </View>
            </View>

            {primitiveFields.length > 0 ? (
              <View style={styles.fieldsWrap}>
                {primitiveFields.map((field) => (
                  <View key={field.key} style={styles.fieldRow}>
                    <AppText style={styles.fieldLabel}>{field.key}</AppText>
                    <AppText style={styles.fieldValue}>
                      {field.value === null ? '-' : String(field.value)}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : (
              <AppText style={styles.noExtraText}>Ek profil alanı bulunamadı.</AppText>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EFEFF2',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#16161A',
    fontFamily: Fonts.rounded,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#5C5C67',
    fontFamily: Fonts.sans,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECECEF',
    padding: 12,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    color: '#8B8B95',
    fontSize: 10,
    fontFamily: Fonts.mono,
  },
  identityWrap: {
    flex: 1,
    gap: 3,
  },
  nameText: {
    color: '#17171B',
    fontSize: 16,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  metaText: {
    color: '#5F5F67',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  fieldsWrap: {
    gap: 8,
  },
  fieldRow: {
    borderWidth: 1,
    borderColor: '#EFEFF4',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  fieldLabel: {
    color: '#8B8B95',
    fontSize: 10,
    fontFamily: Fonts.mono,
    textTransform: 'uppercase',
  },
  fieldValue: {
    color: '#1E1E23',
    fontSize: 13,
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  noExtraText: {
    color: '#6D6D75',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
});
