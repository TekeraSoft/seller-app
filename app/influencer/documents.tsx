import { getMyApplication, uploadInfluencerDocument } from '@/features/influencer/api';
import {
  DOCUMENT_LABELS,
  InfluencerDocumentType,
  LTD_DOCUMENTS,
  SAHIS_DOCUMENTS,
} from '@/features/influencer/types';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PURPLE = '#8D73FF';

type DocState = {
  type: InfluencerDocumentType;
  status: 'idle' | 'uploading' | 'done' | 'error';
  fileName?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionNote?: string | null;
};

export default function InfluencerDocumentsScreen() {
  const router = useRouter();
  const [companyType, setCompanyType] = useState<'SAHIS' | 'LTD' | null>(null);
  const [docs, setDocs] = useState<DocState[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const app = await getMyApplication();
      setCompanyType(app.companyType);
      const required = app.companyType === 'SAHIS' ? SAHIS_DOCUMENTS : LTD_DOCUMENTS;
      setDocs(
        required.map((type) => ({
          type,
          status: 'idle' as const,
          verificationStatus: undefined,
          rejectionNote: null,
        }))
      );
    } catch {
      Alert.alert('Hata', 'Başvuru bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pickAndUpload(docType: InfluencerDocumentType) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setDocs((prev) =>
        prev.map((d) => (d.type === docType ? { ...d, status: 'uploading', fileName: asset.name } : d))
      );

      await uploadInfluencerDocument(
        docType,
        asset.uri,
        asset.name,
        asset.mimeType ?? 'application/octet-stream'
      );

      setDocs((prev) =>
        prev.map((d) =>
          d.type === docType ? { ...d, status: 'done', verificationStatus: 'PENDING' } : d
        )
      );
    } catch {
      setDocs((prev) =>
        prev.map((d) => (d.type === docType ? { ...d, status: 'error' } : d))
      );
      Alert.alert('Hata', 'Belge yüklenemedi, tekrar deneyin.');
    }
  }

  const allDone = docs.length > 0 && docs.every((d) => d.status === 'done' || d.verificationStatus === 'PENDING' || d.verificationStatus === 'VERIFIED');

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PURPLE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ title: 'Evrak Yükleme' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={PURPLE} />
          <Text style={styles.infoText}>
            {companyType === 'SAHIS'
              ? 'Şahıs şirketi için gerekli evrakları yükleyin.'
              : 'Ltd/A.Ş. için gerekli evrakları yükleyin.'}{' '}
            PDF veya görsel (JPG/PNG) formatında yükleyebilirsiniz.
          </Text>
        </View>

        <View style={styles.docsCard}>
          {docs.map((doc, i) => (
            <View key={doc.type} style={[styles.docRow, i < docs.length - 1 && styles.docRowBorder]}>
              <View style={styles.docLeft}>
                <View style={[
                  styles.docIcon,
                  doc.verificationStatus === 'VERIFIED' && styles.docIconGreen,
                  doc.verificationStatus === 'REJECTED' && styles.docIconRed,
                  doc.status === 'done' && !doc.verificationStatus && styles.docIconPurple,
                ]}>
                  <Ionicons
                    name={
                      doc.verificationStatus === 'VERIFIED' ? 'checkmark-circle'
                        : doc.verificationStatus === 'REJECTED' ? 'close-circle'
                        : doc.status === 'done' ? 'time'
                        : 'document-outline'
                    }
                    size={22}
                    color={
                      doc.verificationStatus === 'VERIFIED' ? '#4B8D5C'
                        : doc.verificationStatus === 'REJECTED' ? '#D7263D'
                        : doc.status === 'done' ? PURPLE
                        : '#9A96B5'
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docLabel}>{DOCUMENT_LABELS[doc.type]}</Text>
                  {doc.fileName && doc.status !== 'idle' && (
                    <Text style={styles.docFileName} numberOfLines={1}>{doc.fileName}</Text>
                  )}
                  {doc.verificationStatus === 'VERIFIED' && (
                    <Text style={styles.verifiedText}>Onaylandı</Text>
                  )}
                  {doc.verificationStatus === 'REJECTED' && (
                    <Text style={styles.rejectedText}>{doc.rejectionNote ?? 'Reddedildi'}</Text>
                  )}
                  {doc.status === 'done' && !doc.verificationStatus && (
                    <Text style={styles.pendingText}>İnceleme Bekliyor</Text>
                  )}
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.uploadBtn,
                  doc.status === 'uploading' && styles.uploadBtnDisabled,
                  doc.verificationStatus === 'VERIFIED' && styles.uploadBtnVerified,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => pickAndUpload(doc.type)}
                disabled={doc.status === 'uploading' || doc.verificationStatus === 'VERIFIED'}
              >
                {doc.status === 'uploading' ? (
                  <ActivityIndicator size="small" color={PURPLE} />
                ) : (
                  <Ionicons
                    name={doc.status === 'done' || doc.verificationStatus ? 'refresh' : 'cloud-upload-outline'}
                    size={18}
                    color={doc.verificationStatus === 'VERIFIED' ? '#4B8D5C' : PURPLE}
                  />
                )}
              </Pressable>
            </View>
          ))}
        </View>

        {allDone && (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4B8D5C" />
            <Text style={styles.successText}>
              Tüm belgeler yüklendi. Ekibimiz inceleme yapacak ve size bildirim göndereceğiz.
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.backBtn, { opacity: 0.85 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>← Başvuru Durumuna Dön</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F5FF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F5FF' },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },

  infoCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(141,115,255,0.08)', borderRadius: 16,
    borderWidth: 1, borderColor: '#DDD7FF', padding: 14,
  },
  infoText: { flex: 1, fontSize: 13, color: '#5D5677', lineHeight: 19 },

  docsCard: {
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#DDD7FF',
    overflow: 'hidden',
  },
  docRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 12,
  },
  docRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EEFF' },
  docLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  docIconGreen: { backgroundColor: 'rgba(75,141,92,0.1)' },
  docIconRed: { backgroundColor: 'rgba(215,38,61,0.08)' },
  docIconPurple: { backgroundColor: 'rgba(141,115,255,0.1)' },
  docLabel: { fontSize: 13, fontWeight: '700', color: '#1C1631' },
  docFileName: { fontSize: 11, color: '#9A96B5', marginTop: 2 },
  verifiedText: { fontSize: 11, color: '#4B8D5C', fontWeight: '600', marginTop: 2 },
  rejectedText: { fontSize: 11, color: '#D7263D', fontWeight: '600', marginTop: 2 },
  pendingText: { fontSize: 11, color: PURPLE, fontWeight: '600', marginTop: 2 },

  uploadBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(141,115,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadBtnDisabled: { backgroundColor: '#F0EEFF' },
  uploadBtnVerified: { backgroundColor: 'rgba(75,141,92,0.1)' },

  successCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(75,141,92,0.08)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(75,141,92,0.2)', padding: 14,
  },
  successText: { flex: 1, fontSize: 13, color: '#2D5C3B', lineHeight: 19 },

  backBtn: {
    alignItems: 'center', paddingVertical: 14,
  },
  backBtnText: { color: PURPLE, fontSize: 14, fontWeight: '600' },
});
