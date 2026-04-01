import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { deactivateLink, getMyLinks, InfluencerLinkDto } from '@/features/influencer/api';
import { resolvePublicAssetUrl } from '@/features/seller/mappers';

const P = '#8D73FF';

type FilterType = 'all' | 'expiring' | 'newest' | 'oldest';

function timeLeft(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Süresi dolmuş';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} gün`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours} saat`;
}

function isExpiringSoon(dateStr: string): boolean {
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // 3 gün içinde
}

export default function LinksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [links, setLinks] = useState<InfluencerLinkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  const categories = useMemo(() => {
    const cats = new Set<string>();
    links.forEach((l) => {
      if (l.categoryName) cats.add(l.categoryName);
    });
    return Array.from(cats).sort();
  }, [links]);

  const filteredLinks = useMemo(() => {
    let result = [...links];

    // Kategori filtresi
    if (selectedCategory) {
      result = result.filter((l) => l.categoryName === selectedCategory);
    }

    // Durum/tarih filtresi
    switch (activeFilter) {
      case 'expiring':
        result = result.filter((l) => l.active && isExpiringSoon(l.expiresAt));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
        break;
    }

    return result;
  }, [links, activeFilter, selectedCategory]);

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
    const expiring = item.active && isExpiringSoon(item.expiresAt);
    const imageUrl = item.catalogImage ? resolvePublicAssetUrl(item.catalogImage) : null;

    return (
      <Pressable
        style={[s.linkCard, expiring && s.linkCardExpiring]}
        onPress={() => item.catalogSlug && router.push(`/product-detail/${item.catalogSlug}` as any)}
      >
        <View style={s.linkTop}>
          {/* Ürün görseli */}
          <View style={s.imageWrap}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={s.productImage} resizeMode="cover" />
            ) : (
              <View style={s.imagePlaceholder}>
                <Ionicons name="image-outline" size={20} color="#C8C4E0" />
              </View>
            )}
          </View>

          {/* Bilgi + durum */}
          <View style={s.linkInfo}>
            <View style={s.linkNameRow}>
              <AppText style={s.linkProduct} numberOfLines={1}>{item.catalogName ?? 'Ürün'}</AppText>
              <View style={[s.statusBadge, !item.active || isExpired ? s.statusInactive : isFirstPeriod ? s.statusActive : s.statusSecond]}>
                <AppText style={s.statusText}>
                  {!item.active ? 'Pasif' : isExpired ? 'Dolmuş' : isFirstPeriod ? 'Aktif' : '2. Dönem'}
                </AppText>
              </View>
            </View>
            <View style={s.linkMeta}>
              <Ionicons name="link" size={11} color={P} />
              <AppText style={s.linkCode}>{item.uniqueCode}</AppText>
              {item.categoryName && (
                <>
                  <View style={s.metaDot} />
                  <AppText style={s.categoryText} numberOfLines={1}>{item.categoryName}</AppText>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Ionicons name="eye-outline" size={14} color="#FF6B6B" />
            <AppText style={s.statValue}>{item.clickCount}</AppText>
            <AppText style={s.statLabel}>Tıklanma</AppText>
          </View>
          <View style={s.statItem}>
            <Ionicons name="people-outline" size={14} color="#4ECDC4" />
            <AppText style={s.statValue}>{item.visitorCount}</AppText>
            <AppText style={s.statLabel}>Ziyaretçi</AppText>
          </View>
          <View style={s.statItem}>
            <Ionicons name="time-outline" size={14} color={expiring ? '#FF6B6B' : '#9A96B5'} />
            <AppText style={[s.statValue, expiring && { color: '#FF6B6B' }]} numberOfLines={1}>
              {timeLeft(item.active ? item.expiresAt : item.secondExpiresAt)}
            </AppText>
          </View>
        </View>

        <View style={s.actionRow}>
          <Pressable style={s.shareBtn} onPress={() => handleShare(item)}>
            <Ionicons name="share-social-outline" size={14} color={P} />
            <AppText style={s.shareBtnText}>Paylaş</AppText>
          </Pressable>
          {item.active && (
            <Pressable style={s.removeBtn} onPress={() => handleDeactivate(item)}>
              <Ionicons name="trash-outline" size={14} color="#FF6B6B" />
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const renderFilters = () => (
    <View style={s.filterContainer}>
      {/* Durum / Tarih filtreleri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {([
          { key: 'all', label: 'Tümü', icon: 'grid-outline' },
          { key: 'expiring', label: 'Süresi Dolmak Üzere', icon: 'alert-circle-outline' },
          { key: 'newest', label: 'En Yeni', icon: 'arrow-down-outline' },
          { key: 'oldest', label: 'En Eski', icon: 'arrow-up-outline' },
        ] as const).map((f) => (
          <Pressable
            key={f.key}
            style={[s.filterChip, activeFilter === f.key && s.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Ionicons name={f.icon} size={13} color={activeFilter === f.key ? '#FFF' : '#6B6490'} />
            <AppText style={[s.filterChipText, activeFilter === f.key && s.filterChipTextActive]}>
              {f.label}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Kategori filtreleri */}
      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          <Pressable
            style={[s.catChip, !selectedCategory && s.catChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <AppText style={[s.catChipText, !selectedCategory && s.catChipTextActive]}>Tüm Kategoriler</AppText>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              style={[s.catChip, selectedCategory === cat && s.catChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              <AppText style={[s.catChipText, selectedCategory === cat && s.catChipTextActive]}>{cat}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );

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
      data={filteredLinks}
      keyExtractor={(item) => item.id}
      renderItem={renderLink}
      ListHeaderComponent={renderFilters}
      ListEmptyComponent={
        <View style={s.emptyFilter}>
          <Ionicons name="search-outline" size={32} color="#C8C4E0" />
          <AppText style={s.emptyFilterText}>Bu filtreye uygun link bulunamadı</AppText>
        </View>
      }
      style={s.container}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 + insets.bottom }}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6FB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6FB' },

  // ─── Filtreler ──────────────────────────────────────────────────────────────
  filterContainer: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  filterChipActive: {
    backgroundColor: P,
    borderColor: P,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6490',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },
  catChipActive: {
    backgroundColor: 'rgba(141,115,255,0.1)',
    borderColor: P,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9A96B5',
  },
  catChipTextActive: {
    color: P,
  },

  // ─── Card ───────────────────────────────────────────────────────────────────
  linkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  linkCardExpiring: {
    borderColor: 'rgba(255,107,107,0.3)',
  },
  linkTop: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  imageWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F7F6FB',
  },
  productImage: {
    width: 48,
    height: 48,
  },
  imagePlaceholder: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInfo: { flex: 1 },
  linkNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  linkProduct: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1631',
    lineHeight: 18,
    flex: 1,
    marginRight: 6,
  },
  linkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#C8C4E0',
  },
  categoryText: {
    fontSize: 11,
    color: '#9A96B5',
    fontWeight: '500',
    flexShrink: 1,
  },
  linkCode: {
    fontSize: 11,
    color: P,
    fontWeight: '600',
    fontFamily: Fonts.mono,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: { backgroundColor: 'rgba(78,205,196,0.12)' },
  statusSecond: { backgroundColor: 'rgba(255,159,67,0.12)' },
  statusInactive: { backgroundColor: 'rgba(200,196,224,0.2)' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#3D3660' },

  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FAFAFE',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  statValue: {
    fontSize: 13,
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
    gap: 6,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(141,115,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: P,
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,107,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Boş durumlar ──────────────────────────────────────────────────────────
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
  emptyFilter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyFilterText: {
    fontSize: 13,
    color: '#9A96B5',
  },
});
