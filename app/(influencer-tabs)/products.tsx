import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import {
  CatalogListingDto,
  CategoryDto,
  fetchCategories,
  fetchFilteredCatalogs,
} from '@/features/influencer/product-api';
import { resolvePublicAssetUrl } from '@/features/seller/mappers';

const P = '#8D73FF';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  elektronik: 'phone-portrait-outline',
  telefon: 'phone-portrait-outline',
  bilgisayar: 'laptop-outline',
  giyim: 'shirt-outline',
  kadın: 'woman-outline',
  erkek: 'man-outline',
  çocuk: 'happy-outline',
  bebek: 'happy-outline',
  ayakkabı: 'footsteps-outline',
  çanta: 'bag-outline',
  aksesuar: 'watch-outline',
  takı: 'diamond-outline',
  mücevher: 'diamond-outline',
  kozmetik: 'color-palette-outline',
  güzellik: 'color-palette-outline',
  bakım: 'flower-outline',
  parfüm: 'flask-outline',
  sağlık: 'medkit-outline',
  spor: 'fitness-outline',
  outdoor: 'compass-outline',
  ev: 'home-outline',
  mobilya: 'bed-outline',
  mutfak: 'restaurant-outline',
  dekorasyon: 'color-wand-outline',
  kitap: 'book-outline',
  kırtasiye: 'pencil-outline',
  oyuncak: 'game-controller-outline',
  hobi: 'color-palette-outline',
  otomotiv: 'car-outline',
  pet: 'paw-outline',
  evcil: 'paw-outline',
  gıda: 'nutrition-outline',
  süpermarket: 'cart-outline',
  bahçe: 'leaf-outline',
  aydınlatma: 'bulb-outline',
  tekstil: 'shirt-outline',
  saat: 'watch-outline',
  gözlük: 'glasses-outline',
  müzik: 'musical-notes-outline',
  kamera: 'camera-outline',
  'hediyelik eşya': 'gift-outline',
  hediye: 'gift-outline',
};

function getCategoryIcon(name: string): keyof typeof Ionicons.glyphMap {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return 'pricetag-outline';
}

const SORT_OPTIONS = [
  { key: '', label: 'Varsayılan' },
  { key: 'PRICE_ASC', label: 'Fiyat: Düşükten Yükseğe' },
  { key: 'PRICE_DESC', label: 'Fiyat: Yüksekten Düşüğe' },
  { key: 'NEWEST', label: 'En Yeniler' },
  { key: 'MOST_POPULAR', label: 'En Popüler' },
];

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [products, setProducts] = useState<CatalogListingDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  // Filtreler
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSort, setSelectedSort] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchText, setSearchText] = useState('');

  // Kategorileri yükle
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const hasActiveFilter = keyword.length > 0 || selectedCategory != null;

  const fetchPage = useCallback(async (pageNum: number, reset: boolean) => {
    if (!hasActiveFilter) {
      setProducts([]);
      setTotalCount(0);
      setHasSearched(false);
      setHasMore(false);
      return;
    }

    if (reset) setLoading(true);
    else setLoadingMore(true);
    setHasSearched(true);

    try {
      const res = await fetchFilteredCatalogs({
        keyword: keyword || undefined,
        categoryId: selectedCategory || undefined,
        sort: selectedSort || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        hasDiscount: onlyDiscount || undefined,
        brandNames: selectedBrands.length > 0 ? selectedBrands : undefined,
        page: pageNum,
        size: 30,
      });
      const productsData = res?.products ?? res;
      const items: CatalogListingDto[] = productsData?.content ?? [];
      setProducts((prev) => (reset ? items : [...prev, ...items]));
      setHasMore(!(productsData?.last ?? true));
      setTotalCount(productsData?.totalElements ?? items.length);
      setPage(pageNum);
      if (reset && res?.brandNames?.length) {
        setAvailableBrands(res.brandNames);
      }
    } catch (err) {
      console.warn('Ürün yükleme hatası:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [keyword, selectedCategory, selectedSort, minPrice, maxPrice, onlyDiscount, selectedBrands, hasActiveFilter]);

  // Filtre değişince ilk sayfayı yükle
  useEffect(() => {
    fetchPage(0, true);
  }, [fetchPage]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPage(page + 1, false);
    }
  };

  // Arama debounce
  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setKeyword(text.length >= 3 ? text : '');
    }, 500);
  };

  const clearFilters = () => {
    setSelectedCategory(null as any);
    setSelectedSort('');
    setMinPrice('');
    setMaxPrice('');
    setOnlyDiscount(false);
    setSelectedBrands([]);
    setFilterVisible(false);
  };

  const activeFilterCount =
    (selectedCategory != null ? 1 : 0) +
    (selectedSort ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    (onlyDiscount ? 1 : 0) +
    (selectedBrands.length > 0 ? 1 : 0);

  const formatPrice = (price: number) =>
    price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';

  const renderProduct = ({ item }: { item: CatalogListingDto }) => {
    const imageUrl = item.image ? resolvePublicAssetUrl(item.image) : null;

    return (
      <Pressable
        style={s.productCard}
        onPress={() => router.push(`/product-detail/${item.slug}` as any)}
      >
        <View style={s.productImageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={s.productImage} resizeMode="cover" />
          ) : (
            <View style={s.productImagePlaceholder}>
              <Ionicons name="image-outline" size={28} color="#C8C4E0" />
            </View>
          )}
          {item.hasDiscount && item.originalBestPrice != null && item.originalBestPrice > item.bestPrice && (
            <View style={s.discountBadge}>
              <AppText style={s.discountText}>
                %{Math.round(((item.originalBestPrice - item.bestPrice) / item.originalBestPrice) * 100)}
              </AppText>
            </View>
          )}
        </View>

        <View style={s.productInfo}>
          <AppText style={s.productName} numberOfLines={2}>
            {item.name}
          </AppText>
          <AppText style={s.productCategory} numberOfLines={1}>
            {item.category?.name ?? ''}
          </AppText>

          <View style={s.priceRow}>
            <AppText style={s.productPrice} tone="rounded">
              {formatPrice(item.bestPrice)}
            </AppText>
            {item.originalBestPrice != null && item.originalBestPrice > item.bestPrice && (
              <AppText style={s.originalPrice}>
                {formatPrice(item.originalBestPrice)}
              </AppText>
            )}
          </View>

          {item.rate > 0 && (
            <View style={s.ratingRow}>
              <Ionicons name="star" size={12} color="#FFB800" />
              <AppText style={s.ratingText}>{item.rate.toFixed(1)}</AppText>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      {/* Üst kısım */}
      <View>
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={18} color="#9A96B5" />
            <TextInput
              style={s.searchInput}
              placeholder="Ürün ara..."
              placeholderTextColor="#9A96B5"
              value={searchText}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => { setSearchText(''); setKeyword(''); }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#C8C4E0" />
              </Pressable>
            )}
          </View>
          <Pressable
            style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
            onPress={() => setFilterVisible(true)}
          >
            <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#fff' : P} />
            {activeFilterCount > 0 && (
              <View style={s.filterBadge}>
                <AppText style={s.filterBadgeText}>{activeFilterCount}</AppText>
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryList}
          style={s.categoryScroll}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[s.categoryChip, isSelected && s.categoryChipActive]}
                onPress={() => setSelectedCategory(isSelected ? null : cat.id)}
              >
                <Ionicons
                  name={getCategoryIcon(cat.name)}
                  size={14}
                  color={isSelected ? '#FFFFFF' : P}
                />
                <AppText style={[s.categoryChipText, isSelected && s.categoryChipTextActive]}>
                  {cat.name}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {hasSearched && !loading && (
          <View style={s.resultRow}>
            <AppText style={s.resultText}>{totalCount} ürün bulundu</AppText>
          </View>
        )}
      </View>

      {/* İçerik */}
      {!hasSearched ? (
        <View style={[s.emptyState, { paddingBottom: 100 + insets.bottom }]}>
          <View style={s.emptyIcon}>
            <Ionicons name="search-outline" size={36} color="#C8C4E0" />
          </View>
          <AppText style={s.emptyTitle}>Ürün aramaya başlayın</AppText>
          <AppText style={s.emptySubtitle}>
            Kategori seçerek veya arama yaparak ürünleri listeleyebilirsiniz
          </AppText>
        </View>
      ) : loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={P} />
        </View>
      ) : products.length === 0 ? (
        <View style={[s.emptyState, { paddingBottom: 100 + insets.bottom }]}>
          <View style={s.emptyIcon}>
            <Ionicons name="close-circle-outline" size={36} color="#C8C4E0" />
          </View>
          <AppText style={s.emptyTitle}>Ürün bulunamadı</AppText>
          <AppText style={s.emptySubtitle}>
            Farklı filtreler veya arama terimleri deneyebilirsiniz
          </AppText>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={3}
          columnWrapperStyle={s.productRow}
          keyExtractor={(item) => item.catalogId}
          renderItem={renderProduct}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            hasMore ? (
              <Pressable style={s.loadMoreBtn} onPress={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color={P} />
                ) : (
                  <AppText style={s.loadMoreText}>Daha Fazla Yükle</AppText>
                )}
              </Pressable>
            ) : products.length > 0 ? (
              <View style={s.endOfList}>
                <AppText style={s.endOfListText}>Tüm ürünler listelendi</AppText>
              </View>
            ) : null
          }
        />
      )}

      {/* Filtre Modal */}
      <Modal visible={filterVisible} animationType="slide" transparent onRequestClose={() => setFilterVisible(false)}>
        <View style={fm.overlay}>
          <View style={fm.sheet}>
            <View style={fm.header}>
              <AppText style={fm.headerTitle}>Filtrele & Sırala</AppText>
              <Pressable onPress={() => setFilterVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color="#3D3660" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={fm.section}>
                <AppText style={fm.sectionTitle}>Sıralama</AppText>
                {SORT_OPTIONS.map((opt) => {
                  const isActive = selectedSort === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      style={[fm.sortItem, isActive && fm.sortItemActive]}
                      onPress={() => setSelectedSort(opt.key)}
                    >
                      <AppText style={[fm.sortText, isActive && fm.sortTextActive]}>
                        {opt.label}
                      </AppText>
                      {isActive && <Ionicons name="checkmark" size={18} color={P} />}
                    </Pressable>
                  );
                })}
              </View>

              <View style={fm.section}>
                <AppText style={fm.sectionTitle}>Fiyat Aralığı</AppText>
                <View style={fm.priceRow}>
                  <View style={fm.priceInputWrap}>
                    <TextInput
                      style={fm.priceInput}
                      placeholder="Min"
                      placeholderTextColor="#9A96B5"
                      keyboardType="numeric"
                      value={minPrice}
                      onChangeText={setMinPrice}
                    />
                    <AppText style={fm.priceUnit}>TL</AppText>
                  </View>
                  <AppText style={fm.priceDash}>—</AppText>
                  <View style={fm.priceInputWrap}>
                    <TextInput
                      style={fm.priceInput}
                      placeholder="Max"
                      placeholderTextColor="#9A96B5"
                      keyboardType="numeric"
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                    />
                    <AppText style={fm.priceUnit}>TL</AppText>
                  </View>
                </View>
              </View>

              <View style={fm.section}>
                <Pressable style={fm.toggleRow} onPress={() => setOnlyDiscount(!onlyDiscount)}>
                  <View style={fm.toggleLeft}>
                    <Ionicons name="pricetag-outline" size={18} color={P} />
                    <AppText style={fm.toggleLabel}>Sadece İndirimli Ürünler</AppText>
                  </View>
                  <View style={[fm.toggleBox, onlyDiscount && fm.toggleBoxActive]}>
                    {onlyDiscount && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </Pressable>
              </View>

              {availableBrands.length > 0 && (
                <View style={fm.section}>
                  <AppText style={fm.sectionTitle}>Marka ({availableBrands.length})</AppText>
                  <View style={fm.brandGrid}>
                    {availableBrands.slice(0, 20).map((brand) => {
                      const isSelected = selectedBrands.includes(brand);
                      return (
                        <Pressable
                          key={brand}
                          style={[fm.brandChip, isSelected && fm.brandChipActive]}
                          onPress={() => {
                            setSelectedBrands((prev) =>
                              isSelected ? prev.filter((b) => b !== brand) : [...prev, brand]
                            );
                          }}
                        >
                          <AppText style={[fm.brandText, isSelected && fm.brandTextActive]}>
                            {brand}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={fm.footer}>
              <Pressable style={fm.clearBtn} onPress={clearFilters}>
                <AppText style={fm.clearBtnText}>Temizle</AppText>
              </Pressable>
              <Pressable style={fm.applyBtn} onPress={() => setFilterVisible(false)}>
                <AppText style={fm.applyBtnText}>Uygula</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Ana Stiller ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6FB' },

  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1C1631',
    fontFamily: Fonts.sans,
    padding: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  filterBtnActive: {
    backgroundColor: P,
    borderColor: P,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },

  categoryScroll: {
    flexGrow: 0,
  },
  categoryList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EEFF',
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: P,
    borderColor: P,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3660',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  resultRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultText: {
    fontSize: 12,
    color: '#9A96B5',
  },

  productRow: {
    gap: 6,
    marginBottom: 6,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EEFF',
    maxWidth: '32.5%',
  },
  productImageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FAFAFE',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  discountText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
  productInfo: {
    padding: 6,
  },
  productName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1C1631',
    lineHeight: 15,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 9,
    color: '#9A96B5',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'column',
    gap: 1,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: P,
    fontFamily: Fonts.rounded,
  },
  originalPrice: {
    fontSize: 9,
    color: '#C8C4E0',
    textDecorationLine: 'line-through',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 9,
    color: '#7A7A8E',
    fontWeight: '600',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadMoreBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: P,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginHorizontal: 4,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: P,
  },
  endOfList: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 12,
    color: '#C8C4E0',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(141,115,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1631',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9A96B5',
    textAlign: 'center',
  },
});

// ─── Filtre Modal Stilleri ────────────────────────────────────────────────────

const fm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEFF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1631',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A96B5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  sortItemActive: {
    backgroundColor: 'rgba(141,115,255,0.08)',
  },
  sortText: {
    fontSize: 14,
    color: '#3D3660',
  },
  sortTextActive: {
    color: P,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6FB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
    color: '#1C1631',
    padding: 0,
  },
  priceUnit: {
    fontSize: 12,
    color: '#9A96B5',
    fontWeight: '600',
  },
  priceDash: {
    fontSize: 16,
    color: '#C8C4E0',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#3D3660',
    fontWeight: '600',
  },
  toggleBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#E0DDF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBoxActive: {
    backgroundColor: P,
    borderColor: P,
  },
  brandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F7F6FB',
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  brandChipActive: {
    backgroundColor: P,
    borderColor: P,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D3660',
  },
  brandTextActive: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EEFF',
  },
  clearBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0DDF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3D3660',
  },
  applyBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: P,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
