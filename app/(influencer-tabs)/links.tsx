import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { deactivateLink, getMyLinks, InfluencerLinkDto } from '@/features/influencer/api';

const P = '#8D73FF';

function timeLeft(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Süresi dolmuş';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} gün kaldı`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours} saat kaldı`;
}

export default function LinksScreen() {
  const insets = useSafeAreaInsets();
  const [links, setLinks] = useState<InfluencerLinkDto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLinks = useCallback(async () => {
    try {
      const res = await getMyLinks();
      setLinks(res);
    } catch {
      // hata
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadLinks();
    }, [loadLinks])
  );

  const handleShare = (link: InfluencerLinkDto) => {
    Share.share({
      message: link.referralUrl,
      url: link.referralUrl,
      title: link.catalogName ?? 'Ürün',
    });
  };

  const handleDeactivate = (link: InfluencerLinkDto) => {
    Alert.alert(
      'Linki İptal Et',
      'Bu referans linki kalıcı olarak iptal edilecek. Linke tıklayan kullanıcılar "Bu link artık geçerli değil" mesajı görecek. Bu işlem geri alınamaz.',
      [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            await deactivateLink(link.id);
            loadLinks();
          } catch {
            Alert.alert('Hata', 'Link kaldırılamadı');
          }
        },
      },
    ]);
  };

  const renderLink = ({ item }: { item: InfluencerLinkDto }) => {
    const isExpired = new Date(item.secondExpiresAt).getTime() < Date.now();
    const isFirstPeriod = new Date(item.expiresAt).getTime() > Date.now();

    return (
      <View style={s.linkCard}>
        <View style={s.linkHeader}>
          <View style={s.linkInfo}>
            <AppText style={s.linkProduct} numberOfLines={2}>{item.catalogName ?? 'Ürün'}</AppText>
            <View style={s.linkCodeRow}>
              <Ionicons name="link" size={12} color={P} />
              <AppText style={s.linkCode}>{item.uniqueCode}</AppText>
            </View>
          </View>
          <View style={[s.statusBadge, !item.active || isExpired ? s.statusInactive : isFirstPeriod ? s.statusActive : s.statusSecond]}>
            <AppText style={s.statusText}>
              {!item.active ? 'Pasif' : isExpired ? 'Süresi Dolmuş' : isFirstPeriod ? 'Aktif' : '2. Dönem'}
            </AppText>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Ionicons name="eye-outline" size={16} color="#FF6B6B" />
            <AppText style={s.statValue}>{item.clickCount}</AppText>
            <AppText style={s.statLabel}>Tıklanma</AppText>
          </View>
          <View style={s.statItem}>
            <Ionicons name="people-outline" size={16} color="#4ECDC4" />
            <AppText style={s.statValue}>{item.visitorCount}</AppText>
            <AppText style={s.statLabel}>Ziyaretçi</AppText>
          </View>
          <View style={s.statItem}>
            <Ionicons name="time-outline" size={16} color="#9A96B5" />
            <AppText style={s.statValue} numberOfLines={1}>{timeLeft(item.active ? item.expiresAt : item.secondExpiresAt)}</AppText>
          </View>
        </View>

        <View style={s.actionRow}>
          <Pressable style={s.shareBtn} onPress={() => handleShare(item)}>
            <Ionicons name="share-social-outline" size={16} color={P} />
            <AppText style={s.shareBtnText}>Paylaş</AppText>
          </Pressable>
          {item.active && (
            <Pressable style={s.removeBtn} onPress={() => handleDeactivate(item)}>
              <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={P} />
      </View>
    );
  }

  if (links.length === 0) {
    return (
      <View style={[s.centered, { paddingHorizontal: 32, paddingBottom: 100 + insets.bottom }]}>
        <View style={s.emptyIcon}>
          <Ionicons name="link-outline" size={48} color="#C8C4E0" />
        </View>
        <AppText style={s.emptyTitle}>Henüz referans linkiniz yok</AppText>
        <AppText style={s.emptySubtitle}>
          Ürünler sekmesinden bir ürün seçip referans linki oluşturabilirsiniz
        </AppText>
      </View>
    );
  }

  return (
    <FlatList
      data={links}
      keyExtractor={(item) => item.id}
      renderItem={renderLink}
      style={s.container}
      contentContainerStyle={{ padding: 12, paddingBottom: 100 + insets.bottom }}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6FB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6FB' },

  linkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  linkInfo: { flex: 1, marginRight: 10 },
  linkProduct: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1631',
    lineHeight: 20,
    marginBottom: 4,
  },
  linkCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkCode: {
    fontSize: 12,
    color: P,
    fontWeight: '600',
    fontFamily: Fonts.mono,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: { backgroundColor: 'rgba(78,205,196,0.12)' },
  statusSecond: { backgroundColor: 'rgba(255,159,67,0.12)' },
  statusInactive: { backgroundColor: 'rgba(200,196,224,0.2)' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#3D3660' },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FAFAFE',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1631',
    fontFamily: Fonts.rounded,
  },
  statLabel: {
    fontSize: 9,
    color: '#9A96B5',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(141,115,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: P,
  },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(141,115,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1631',
    marginBottom: 6,
    fontFamily: Fonts.rounded,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9A96B5',
    textAlign: 'center',
    lineHeight: 20,
  },
});
