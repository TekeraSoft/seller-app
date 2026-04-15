import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { decode } from 'html-entities';
import RenderHtml from 'react-native-render-html';
import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import {
  CatalogDetailDto,
  CatalogVariantDto,
  SellerListingDto,
  fetchCatalogDetail,
} from '@/features/influencer/product-api';
import { createInfluencerLink, getMyLinks } from '@/features/influencer/api';
import { resolvePublicAssetUrl } from '@/features/seller/mappers';

const P = '#8D73FF';

const formatPrice = (price: number | null | undefined) => {
  if (price == null) return '0,00 TL';
  return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
};

function stripHtml(html: string): string {
  return decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function getBestPrice(detail: CatalogDetailDto): number | null {
  let best: number | null = null;
  for (const v of detail.variants ?? []) {
    if (v.bestPrice != null && (best == null || v.bestPrice < best)) best = v.bestPrice;
    for (const l of v.listings ?? []) {
      const p = l.discountedPrice ?? l.price;
      if (p != null && (best == null || p < best)) best = p;
    }
  }
  return best;
}

function getOriginalPrice(detail: CatalogDetailDto): number | null {
  let highest: number | null = null;
  for (const v of detail.variants ?? []) {
    for (const l of v.listings ?? []) {
      if (l.discountedPrice != null && l.discountedPrice < l.price) {
        if (highest == null || l.price > highest) highest = l.price;
      }
    }
  }
  return highest;
}

function getTotalSellerCount(detail: CatalogDetailDto): number {
  const sellerIds = new Set<string>();
  for (const v of detail.variants ?? []) {
    for (const l of v.listings ?? []) {
      if (l.seller?.id) sellerIds.add(l.seller.id);
    }
  }
  return sellerIds.size;
}

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();


  const { width } = useWindowDimensions();
  const [detail, setDetail] = useState<CatalogDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<CatalogVariantDto | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchCatalogDetail(slug)
      .then((data) => {
        setDetail(data);
        if (data.variants?.length > 0) {
          setSelectedVariant(data.variants[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const [linkCreating, setLinkCreating] = useState(false);
  const [linkCreated, setLinkCreated] = useState(false);
  const [linkChecked, setLinkChecked] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadImage = async (imageUrl: string) => {
    try {
      const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `tekera21_${Date.now()}.${ext}`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri);
      await Sharing.shareAsync(uri);
    } catch {
      Alert.alert('Hata', 'Görsel indirilemedi');
    }
  };

  const handleDownloadAllImages = async () => {
    const imgs = selectedVariant?.imageUrls ?? [];
    if (imgs.length === 0) return;
    setDownloading(true);
    try {
      const downloads = await Promise.all(
        imgs.map(async (img, i) => {
          const url = resolvePublicAssetUrl(img);
          const ext = img.split('.').pop()?.split('?')[0] || 'jpg';
          const fileName = `tekera21_${detail?.catalogId ?? 'product'}_${i + 1}.${ext}`;
          const fileUri = FileSystem.cacheDirectory + fileName;
          const { uri } = await FileSystem.downloadAsync(url, fileUri);
          return uri;
        })
      );
      // Tek tek paylaş (expo-sharing tek dosya destekler, ilkini paylaşalım)
      if (downloads.length === 1) {
        await Sharing.shareAsync(downloads[0]);
      } else {
        // Çoklu dosya için sırayla paylaş uyarısı
        Alert.alert(
          'Görseller İndirildi',
          `${downloads.length} görsel indirildi. Paylaşmak için seçin.`,
          [
            ...downloads.map((uri, i) => ({
              text: `Görsel ${i + 1}`,
              onPress: async () => { await Sharing.shareAsync(uri); },
            })),
            { text: 'Kapat', onPress: async () => {} },
          ]
        );
      }
    } catch {
      Alert.alert('Hata', 'Görseller indirilemedi');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!detail?.catalogId) return;
    getMyLinks().then((links) => {
      if (links.some((l) => l.catalogId === detail.catalogId && l.active)) {
        setLinkCreated(true);
      }
    }).catch(() => {}).finally(() => setLinkChecked(true));
  }, [detail?.catalogId]);

  const handleLink = async () => {
    if (!detail?.catalogId || linkCreated) return;
    setLinkCreating(true);
    try {
      const link = await createInfluencerLink(detail.catalogId);
      setLinkCreated(true);
      Alert.alert(
        'Referans Linki Oluşturuldu',
        link.referralUrl,
        [
          {
            text: 'Paylaş',
            onPress: () => {
              Share.share({
                message: link.referralUrl,
                url: link.referralUrl,
                title: detail.name,
              });
            },
          },
          { text: 'Tamam' },
        ]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Link oluşturulamadı';
      Alert.alert('Hata', msg);
    } finally {
      setLinkCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={P} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={s.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppText style={{ color: '#9A96B5' }}>Ürün bulunamadı</AppText>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <AppText style={{ color: P, fontWeight: '700' }}>Geri Dön</AppText>
        </Pressable>
      </View>
    );
  }

  const images = selectedVariant?.imageUrls ?? [];
  const currentImage = images[selectedImageIndex]
    ? resolvePublicAssetUrl(images[selectedImageIndex])
    : null;

  // Renkler — unique by color name
  const seenColors = new Set<string>();
  const colors = (detail.variants ?? [])
    .filter((v) => {
      if (!v.color || seenColors.has(v.color)) return false;
      seenColors.add(v.color);
      return true;
    })
    .map((v) => ({ code: v.variantCode, color: v.color!, imageUrl: v.imageUrls?.[0] }));

  // Satıcılar (seçili variant'ın listing'leri)
  const sellers = selectedVariant?.listings ?? [];

  // Fiyatlar
  const bestPrice = getBestPrice(detail);
  const originalPrice = getOriginalPrice(detail);
  const sellerCount = getTotalSellerCount(detail);
  const hasDiscount = originalPrice != null && bestPrice != null && originalPrice > bestPrice;

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Üst Bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#1C1631" />
        </Pressable>
        <AppText style={s.topTitle} numberOfLines={1}>Ürün Detayı</AppText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 100 + insets.bottom : 16 }}
      >
        {/* Ana Görsel */}
        <View style={s.imageContainer}>
          {currentImage ? (
            <Image source={{ uri: currentImage }} style={s.mainImage} resizeMode="cover" />
          ) : (
            <View style={s.imagePlaceholder}>
              <Ionicons name="image-outline" size={48} color="#C8C4E0" />
            </View>
          )}
          {hasDiscount && (
            <View style={s.discountBadge}>
              <AppText style={s.discountText}>
                %{Math.round(((originalPrice! - bestPrice!) / originalPrice!) * 100)} İndirim
              </AppText>
            </View>
          )}
          {currentImage && (
            <Pressable
              style={s.downloadBadge}
              onPress={() => handleDownloadImage(currentImage)}
              hitSlop={8}
            >
              <Ionicons name="download-outline" size={18} color="#fff" />
            </Pressable>
          )}
        </View>

        {/* Küçük Görseller */}
        {images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbList}>
            {images.map((img, i) => (
              <Pressable
                key={i}
                onPress={() => setSelectedImageIndex(i)}
                style={[s.thumbWrap, selectedImageIndex === i && s.thumbActive]}
              >
                <Image source={{ uri: resolvePublicAssetUrl(img) }} style={s.thumbImg} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Görselleri İndir */}
        {images.length > 0 && (
          <Pressable
            style={[s.downloadAllBtn, downloading && { opacity: 0.6 }]}
            onPress={handleDownloadAllImages}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={P} />
            ) : (
              <Ionicons name="images-outline" size={16} color={P} />
            )}
            <AppText style={s.downloadAllText}>
              {downloading ? 'İndiriliyor...' : `Tüm Görselleri İndir (${images.length})`}
            </AppText>
          </Pressable>
        )}

        {/* Referans Linki — iOS'ta scroll içinde */}
        {Platform.OS === 'ios' && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!linkChecked || linkCreating}
              onPress={() => {
                if (linkCreated) {
                  Share.share({ message: detail?.name || '', title: detail?.name || '' });
                  return;
                }
                handleLink();
              }}
              style={[
                linkCreated ? s.linkBtnCreated : s.linkBtn,
                (!linkChecked || linkCreating) && { opacity: 0.5 },
              ]}
            >
              {!linkChecked || linkCreating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : linkCreated ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <AppText style={s.linkBtnText}>Oluşturuldu</AppText>
                </>
              ) : (
                <>
                  <Ionicons name="link" size={20} color="#fff" />
                  <AppText style={s.linkBtnText}>Referans Linki Oluştur</AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Ürün Bilgileri */}
        <View style={s.infoSection}>
          <AppText style={s.productName}>{detail.name}</AppText>

          <View style={s.metaRow}>
            {detail.brandName && (
              <View style={s.metaChip}>
                <AppText style={s.metaText}>{detail.brandName}</AppText>
              </View>
            )}
            <View style={s.metaChip}>
              <AppText style={s.metaText}>{detail.category?.name}</AppText>
            </View>
            {detail.rate > 0 && (
              <View style={s.ratingChip}>
                <Ionicons name="star" size={12} color="#FFB800" />
                <AppText style={s.ratingText}>{detail.rate.toFixed(1)}</AppText>
                <AppText style={s.commentCount}>({detail.commentCount})</AppText>
              </View>
            )}
          </View>

          {/* Fiyat */}
          <View style={s.priceSection}>
            <AppText style={s.priceValue} tone="rounded">{formatPrice(bestPrice)}</AppText>
            {hasDiscount && (
              <AppText style={s.originalPrice}>{formatPrice(originalPrice)}</AppText>
            )}
          </View>
        </View>

        {/* Renk Seçimi */}
        {colors.length > 1 && (
          <View style={s.section}>
            <AppText style={s.sectionTitle}>Renk ({colors.length})</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.colorList}>
              {colors.map((c) => {
                const isSelected = selectedVariant?.variantCode === c.code;
                return (
                  <Pressable
                    key={c.code}
                    style={[s.colorItem, isSelected && s.colorItemActive]}
                    onPress={() => {
                      const v = detail.variants.find((vr) => vr.variantCode === c.code);
                      if (v) {
                        setSelectedVariant(v);
                        setSelectedImageIndex(0);
                      }
                    }}
                  >
                    {c.imageUrl ? (
                      <Image source={{ uri: resolvePublicAssetUrl(c.imageUrl) }} style={s.colorImg} resizeMode="cover" />
                    ) : (
                      <View style={[s.colorImg, { backgroundColor: '#EEEDF5' }]} />
                    )}
                    <AppText style={[s.colorLabel, isSelected && { color: P }]} numberOfLines={1}>
                      {c.color}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Beden / Özellikler */}
        {selectedVariant && selectedVariant.attributes.length > 0 && (
          <View style={s.section}>
            <AppText style={s.sectionTitle}>Özellikler</AppText>
            <View style={s.attrGrid}>
              {selectedVariant.attributes.map((attr, i) => (
                <View key={i} style={s.attrChip}>
                  <AppText style={s.attrKey}>{attr.key}</AppText>
                  <AppText style={s.attrValue}>{attr.value}</AppText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Açıklama */}
        {detail.description && detail.description.trim().length > 0 && (
          <View style={s.section}>
            <AppText style={s.sectionTitle}>Ürün Açıklaması</AppText>
            <RenderHtml
              contentWidth={width - 32}
              source={{ html: detail.description }}
              baseStyle={{ fontSize: 13, color: '#3D3660', lineHeight: 20 }}
              tagsStyles={{
                p: { marginTop: 0, marginBottom: 8 },
                span: { color: '#3D3660' },
                strong: { fontWeight: '700' },
                ul: { paddingLeft: 16 },
                ol: { paddingLeft: 16 },
                li: { marginBottom: 4 },
              }}
            />
          </View>
        )}

        {/* Satıcılar */}
        <View style={s.section}>
          <AppText style={s.sectionTitle}>
            Satıcılar ({sellerCount})
          </AppText>
          {sellers.length > 0 ? (
            sellers.map((listing) => (
              <SellerCard key={listing.id} listing={listing} />
            ))
          ) : (
            <AppText style={s.noSeller}>Bu varyant için satıcı bilgisi yok</AppText>
          )}
        </View>

      </ScrollView>

      {/* Alt Buton — Android'de sabit */}
      {Platform.OS === 'android' && (
        <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!linkChecked || linkCreating}
            onPress={() => {
              if (linkCreated) {
                Share.share({ message: detail?.name || '', title: detail?.name || '' });
                return;
              }
              handleLink();
            }}
            style={[
              linkCreated ? s.linkBtnCreated : s.linkBtn,
              (!linkChecked || linkCreating) && { opacity: 0.5 },
            ]}
          >
            {!linkChecked || linkCreating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : linkCreated ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <AppText style={s.linkBtnText}>Oluşturuldu</AppText>
              </>
            ) : (
              <>
                <Ionicons name="link" size={20} color="#fff" />
                <AppText style={s.linkBtnText}>Referans Linki Oluştur</AppText>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SellerCard({ listing }: { listing: SellerListingDto }) {
  const logoUrl = listing.seller.logo ? resolvePublicAssetUrl(listing.seller.logo) : null;
  const initials = listing.seller.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <View style={sc.card}>
      <View style={sc.left}>
        <View style={sc.avatar}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={sc.avatarImg} resizeMode="cover" />
          ) : (
            <AppText style={sc.avatarText}>{initials}</AppText>
          )}
        </View>
        <View style={sc.info}>
          <AppText style={sc.sellerName} numberOfLines={1}>{listing.seller.name}</AppText>
          <View style={sc.sellerMeta}>
            {listing.seller.rate > 0 && (
              <>
                <Ionicons name="star" size={11} color="#FFB800" />
                <AppText style={sc.metaText}>{listing.seller.rate.toFixed(1)}</AppText>
              </>
            )}
            {listing.seller.city ? (
              <>
                <Ionicons name="location-outline" size={11} color="#9A96B5" />
                <AppText style={sc.metaText}>{listing.seller.city}</AppText>
              </>
            ) : null}
          </View>
        </View>
      </View>
      <View style={sc.right}>
        <AppText style={sc.price} tone="rounded">{formatPrice(listing.price)}</AppText>
        {listing.discountedPrice != null && listing.discountedPrice < listing.price && (
          <AppText style={sc.oldPrice}>{formatPrice(listing.discountedPrice)}</AppText>
        )}
        {listing.stock != null && listing.stock <= 5 && listing.stock > 0 && (
          <AppText style={sc.lowStock}>Son {listing.stock} ürün</AppText>
        )}
      </View>
    </View>
  );
}

// ─── Ana Stiller ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6FB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6FB' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#F7F6FB',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1631',
    flex: 1,
    textAlign: 'center',
  },

  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  mainImage: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFE',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  downloadBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  thumbList: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: { borderColor: P },
  thumbImg: { width: '100%', height: '100%' },

  downloadAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 10,
    backgroundColor: 'rgba(141,115,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD7FF',
  },
  downloadAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: P,
  },

  infoSection: { padding: 16 },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1631',
    lineHeight: 24,
    marginBottom: 10,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metaChip: {
    backgroundColor: 'rgba(141,115,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: { fontSize: 12, fontWeight: '600', color: P },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,184,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#B8860B' },
  commentCount: { fontSize: 11, color: '#9A96B5' },

  priceSection: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  priceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: P,
    fontFamily: Fonts.rounded,
  },
  originalPrice: {
    fontSize: 16,
    color: '#C8C4E0',
    textDecorationLine: 'line-through',
  },

  section: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1631',
    marginBottom: 10,
  },

  colorList: { gap: 10 },
  colorItem: {
    alignItems: 'center',
    width: 64,
    padding: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorItemActive: { borderColor: P },
  colorImg: { width: 52, height: 52, borderRadius: 10 },
  colorLabel: { fontSize: 10, color: '#3D3660', marginTop: 4, textAlign: 'center' },

  attrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attrChip: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  attrKey: { fontSize: 10, color: '#9A96B5', marginBottom: 2 },
  attrValue: { fontSize: 13, fontWeight: '600', color: '#1C1631' },

  descText: { fontSize: 13, color: '#3D3660', lineHeight: 20 },

  noSeller: { fontSize: 13, color: '#9A96B5' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#F7F6FB',
    borderTopWidth: 1,
    borderTopColor: '#F0EEFF',
  },
  linkBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: P,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#8D73FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  linkBtnCreated: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4ECDC4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  linkBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

// ─── Satıcı Kart Stilleri ─────────────────────────────────────────────────────

const sc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(141,115,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 12, fontWeight: '700', color: P },
  info: { flex: 1 },
  sellerName: { fontSize: 13, fontWeight: '700', color: '#1C1631' },
  sellerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 11, color: '#9A96B5' },
  right: { alignItems: 'flex-end' },
  price: { fontSize: 15, fontWeight: '800', color: '#1C1631', fontFamily: Fonts.rounded },
  oldPrice: { fontSize: 11, color: '#C8C4E0', textDecorationLine: 'line-through' },
  lowStock: { fontSize: 10, color: '#FF6B6B', fontWeight: '600', marginTop: 2 },
});
