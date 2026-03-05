import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { fetchSellerCatalogs } from '@/features/products/api';
import {
  ProductWarningStatus,
  SellerCampaignOption,
  SellerProductCatalogGroup,
  SellerSubCategoryOption,
} from '@/features/products/types';

type ActivityFilter = 'ALL' | 'ACTIVE' | 'PASSIVE';
type WarningFilter = 'ALL' | ProductWarningStatus;

const PAGE_SIZE = 20;

const WARNING_OPTIONS: Array<{ label: string; value: WarningFilter }> = [
  { label: 'Stok Uyarısı: Tümü', value: 'ALL' },
  { label: 'Stokta Var', value: 'AVAILABLE_STOCK' },
  { label: 'Stok Az', value: 'STOCK_IS_RUNNING_LOW' },
  { label: 'Stok Yok', value: 'OUT_OF_STOCK' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(value);
}

function toWarningLabel(status: ProductWarningStatus | null | undefined): string {
  const normalized = (status ?? '').trim().toUpperCase();
  if (normalized === 'OUT_OF_STOCK') return 'Stok Yok';
  if (normalized === 'STOCK_IS_RUNNING_LOW') return 'Stok Az';
  if (normalized === 'AVAILABLE_STOCK') return 'Stokta Var';
  return '-';
}

function toApprovalLabel(status: string | null | undefined): string {
  const normalized = (status ?? '').trim().toUpperCase();
  if (!normalized) return '-';
  if (normalized === 'APPROVED') return 'Onaylı';
  if (normalized === 'PENDING') return 'Onay Bekliyor';
  if (normalized === 'REJECTED') return 'Reddedildi';
  return normalized;
}

export default function ProductsScreen() {
  const didAutoLoadOnFocusRef = useRef(false);

  const [items, setItems] = useState<SellerProductCatalogGroup[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allCount, setAllCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [passiveCount, setPassiveCount] = useState(0);
  const [approvalCount, setApprovalCount] = useState(0);

  const [campaigns, setCampaigns] = useState<SellerCampaignOption[]>([]);
  const [subCategories, setSubCategories] = useState<SellerSubCategoryOption[]>([]);

  const [expandedCatalogIds, setExpandedCatalogIds] = useState<Record<string, boolean>>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const filtersAnim = scrollY.interpolate({
    inputRange: [0, 140],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const onListScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })
  ).current;

  const [searchText, setSearchText] = useState('');
  const [brandName, setBrandName] = useState('');
  const [canonicalCode, setCanonicalCode] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');

  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<ActivityFilter>('ALL');
  const [selectedWarningFilter, setSelectedWarningFilter] = useState<WarningFilter>('ALL');

  const buildRequestFilters = useCallback(() => {
    const payload: Record<string, string | boolean> = {};

    const search = searchText.trim();
    const brand = brandName.trim();
    const canonical = canonicalCode.trim();
    const skuValue = sku.trim();
    const barcodeValue = barcode.trim();

    if (search.length > 0) payload.searchParam = search;
    if (brand.length > 0) payload.brandName = brand;
    if (canonical.length > 0) payload.canonicalCode = canonical;
    if (skuValue.length > 0) payload.sku = skuValue;
    if (barcodeValue.length > 0) payload.barcode = barcodeValue;
    if (selectedSubCategory) payload.subCategoryName = selectedSubCategory;
    if (selectedCampaignId) payload.campaignId = selectedCampaignId;

    if (selectedActivityFilter === 'ACTIVE') payload.activeStatus = true;
    if (selectedActivityFilter === 'PASSIVE') payload.activeStatus = false;
    if (selectedWarningFilter !== 'ALL') payload.warningStatus = selectedWarningFilter;

    return payload;
  }, [barcode, brandName, canonicalCode, searchText, selectedActivityFilter, selectedCampaignId, selectedSubCategory, selectedWarningFilter, sku]);

  const loadPage = useCallback(
    async (nextPage: number, refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else if (nextPage === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const response = await fetchSellerCatalogs({
          page: nextPage,
          size: PAGE_SIZE,
          filters: buildRequestFilters(),
        });

        const incoming = Array.isArray(response.groupedListings.content) ? response.groupedListings.content : [];

        setItems((prev) => {
          if (nextPage === 0) {
            return incoming;
          }
          const existing = new Set(prev.map((item) => item.catalogId));
          const merged = incoming.filter((item) => !existing.has(item.catalogId));
          return [...prev, ...merged];
        });

        setPage(response.groupedListings.page);
        setHasMore(response.groupedListings.hasMore);

        setAllCount(response.allCount);
        setActiveCount(response.activeCount);
        setPassiveCount(response.passiveCount);
        setApprovalCount(response.approvalCount);

        setCampaigns(response.campaigns);
        setSubCategories(response.subCategories);
      } catch {
        setError('Ürünler alınamadı. Lütfen tekrar deneyin.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [buildRequestFilters]
  );

  const loadFirstPage = useCallback(
    (refresh = false) => {
      if (refresh) {
        didAutoLoadOnFocusRef.current = true;
      }
      setExpandedCatalogIds({});
      void loadPage(0, refresh);
    },
    [loadPage]
  );

  const loadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) return;
    void loadPage(page + 1, false);
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, loadPage, page]);

  useFocusEffect(
    useCallback(() => {
      if (!didAutoLoadOnFocusRef.current && items.length === 0 && !isLoading && !isRefreshing && !isLoadingMore) {
        didAutoLoadOnFocusRef.current = true;
        void loadPage(0, false);
      }
    }, [isLoading, isLoadingMore, isRefreshing, items.length, loadPage])
  );

  useEffect(() => {
    if (!didAutoLoadOnFocusRef.current) return;
    loadFirstPage(false);
  }, [loadFirstPage, selectedActivityFilter, selectedCampaignId, selectedSubCategory, selectedWarningFilter]);

  const toggleCatalogExpanded = useCallback((catalogId: string) => {
    setExpandedCatalogIds((prev) => ({ ...prev, [catalogId]: !prev[catalogId] }));
  }, []);

  const renderCatalogItem = ({ item }: { item: SellerProductCatalogGroup }) => {
    const isExpanded = expandedCatalogIds[item.catalogId] === true;

    return (
      <View style={styles.card}>
        <Pressable style={styles.cardTop} onPress={() => toggleCatalogExpanded(item.catalogId)}>
          <View style={styles.imageWrap}>
            {item.coverImage ? (
              <Image source={{ uri: item.coverImage }} style={styles.image} resizeMode="cover" />
            ) : (
              <Ionicons name="cube-outline" size={18} color="#A2A2AB" />
            )}
          </View>

          <View style={styles.catalogMetaWrap}>
            <AppText style={styles.catalogName}>{item.catalogName}</AppText>
            <AppText style={styles.catalogSubMeta}>
              {item.brandName ?? '-'}
              {item.canonicalCode ? ` • ${item.canonicalCode}` : ''}
            </AppText>
            <AppText style={styles.catalogSubMeta}>
              {item.categoryName ?? '-'}
              {item.subCategoryName ? ` / ${item.subCategoryName}` : ''}
            </AppText>
            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <AppText style={styles.metricLabel}>Varyant</AppText>
                <AppText style={styles.metricValue}>{item.totalVariants}</AppText>
              </View>
              <View style={styles.metricPill}>
                <AppText style={styles.metricLabel}>Aktif</AppText>
                <AppText style={styles.metricValue}>{item.activeVariants}</AppText>
              </View>
              <View style={styles.metricPill}>
                <AppText style={styles.metricLabel}>Stok</AppText>
                <AppText style={styles.metricValue}>{item.totalStock}</AppText>
              </View>
            </View>
          </View>

          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#4A4A53"
            style={styles.chevronIcon}
          />
        </Pressable>

        {isExpanded ? (
          <View style={styles.variantList}>
            {item.variants.length === 0 ? (
              <View style={styles.emptyVariantRow}>
                <AppText style={styles.emptyVariantText}>Bu ürün için varyant bulunamadı.</AppText>
              </View>
            ) : (
              item.variants.map((variant) => {
                const price = variant.discountedPrice ?? variant.price;
                return (
                  <View key={variant.listingId} style={styles.variantRow}>
                    <View style={styles.variantImageWrap}>
                      {variant.images[0] ? (
                        <Image source={{ uri: variant.images[0] }} style={styles.variantImage} resizeMode="cover" />
                      ) : (
                        <Ionicons name="image-outline" size={14} color="#A0A0A8" />
                      )}
                    </View>

                    <View style={styles.variantMetaWrap}>
                      <AppText style={styles.variantCode}>
                        {variant.variantCode ?? 'Varyant'}
                        {variant.color ? ` • ${variant.color}` : ''}
                      </AppText>

                      <View style={styles.variantTagsRow}>
                        <AppText style={styles.variantTag}>{toApprovalLabel(variant.approvalStatus)}</AppText>
                        <AppText style={styles.variantTag}>{toWarningLabel(variant.warningStatus)}</AppText>
                        <AppText style={styles.variantTag}>{variant.active ? 'Aktif' : 'Pasif'}</AppText>
                      </View>

                      <View style={styles.variantBottomRow}>
                        <AppText style={styles.variantStock}>Stok: {variant.stock}</AppText>
                        <AppText style={styles.variantPrice} tone="rounded">
                          {formatCurrency(price)}
                        </AppText>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.headerRow}>
        <AppText style={styles.title} tone="rounded">
          Ürünler
        </AppText>

        <View style={styles.headerActions}>
          <Pressable style={styles.headerButton} onPress={() => loadFirstPage(true)}>
            <Ionicons name="refresh" size={16} color="#2A2A31" />
          </Pressable>
          <Pressable style={styles.headerButton} onPress={() => setShowAdvancedFilters((prev) => !prev)}>
            <Ionicons name={showAdvancedFilters ? 'options' : 'options-outline'} size={16} color="#2A2A31" />
          </Pressable>
        </View>
      </View>

      <View style={styles.countersRow}>
        <Pressable
          style={[styles.counterCard, selectedActivityFilter === 'ALL' && styles.counterCardActive]}
          onPress={() => {
            setSelectedActivityFilter('ALL');
          }}>
          <AppText style={styles.counterLabel}>Tümü</AppText>
          <AppText style={styles.counterValue}>{allCount}</AppText>
        </Pressable>

        <Pressable
          style={[styles.counterCard, selectedActivityFilter === 'ACTIVE' && styles.counterCardActive]}
          onPress={() => {
            setSelectedActivityFilter('ACTIVE');
          }}>
          <AppText style={styles.counterLabel}>Aktif</AppText>
          <AppText style={styles.counterValue}>{activeCount}</AppText>
        </Pressable>

        <Pressable
          style={[styles.counterCard, selectedActivityFilter === 'PASSIVE' && styles.counterCardActive]}
          onPress={() => {
            setSelectedActivityFilter('PASSIVE');
          }}>
          <AppText style={styles.counterLabel}>Pasif</AppText>
          <AppText style={styles.counterValue}>{passiveCount}</AppText>
        </Pressable>

        <View style={styles.counterCardMuted}>
          <AppText style={styles.counterLabel}>Onay</AppText>
          <AppText style={styles.counterValue}>{approvalCount}</AppText>
        </View>
      </View>

      <Animated.View
        style={[
          styles.filterAnimatedWrap,
          {
            opacity: filtersAnim,
            maxHeight: filtersAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 520] }),
            transform: [
              {
                translateY: filtersAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }),
              },
            ],
          },
        ]}>
        <View style={styles.filterBlock}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#8F8F98" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => loadFirstPage(false)}
            placeholder="Ürün adı / kod / SKU ara"
            placeholderTextColor="#A3A3AB"
            style={styles.searchInput}
            returnKeyType="search"
          />
          <Pressable style={styles.searchAction} onPress={() => loadFirstPage(false)}>
            <Ionicons name="arrow-forward" size={14} color="#1F1F23" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {WARNING_OPTIONS.map((option) => {
            const selected = selectedWarningFilter === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.filterChip, selected && styles.filterChipActive]}
                onPress={() => {
                  setSelectedWarningFilter(option.value);
                }}>
                <AppText style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{option.label}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {subCategories.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            <Pressable
              style={[styles.filterChip, !selectedSubCategory && styles.filterChipActive]}
              onPress={() => {
                setSelectedSubCategory(null);
              }}>
              <AppText style={[styles.filterChipText, !selectedSubCategory && styles.filterChipTextActive]}>
                Alt Kategori: Tümü
              </AppText>
            </Pressable>

            {subCategories.map((option) => {
              const selected = selectedSubCategory === option.name;
              return (
                <Pressable
                  key={option.slug}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                  onPress={() => {
                    setSelectedSubCategory(option.name);
                  }}>
                  <AppText style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                    {option.name}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {campaigns.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            <Pressable
              style={[styles.filterChip, !selectedCampaignId && styles.filterChipActive]}
              onPress={() => {
                setSelectedCampaignId(null);
              }}>
              <AppText style={[styles.filterChipText, !selectedCampaignId && styles.filterChipTextActive]}>
                Kampanya: Tümü
              </AppText>
            </Pressable>

            {campaigns.map((option) => {
              const selected = selectedCampaignId === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                  onPress={() => {
                    setSelectedCampaignId(option.id);
                  }}>
                  <AppText style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                    {option.name}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {showAdvancedFilters ? (
          <View style={styles.advancedFiltersWrap}>
            <View style={styles.inlineInputRow}>
              <TextInput
                value={brandName}
                onChangeText={setBrandName}
                onSubmitEditing={() => loadFirstPage(false)}
                placeholder="Marka"
                placeholderTextColor="#A3A3AB"
                style={styles.inlineInput}
              />
              <TextInput
                value={canonicalCode}
                onChangeText={setCanonicalCode}
                onSubmitEditing={() => loadFirstPage(false)}
                placeholder="Model kodu"
                placeholderTextColor="#A3A3AB"
                style={styles.inlineInput}
              />
            </View>

            <View style={styles.inlineInputRow}>
              <TextInput
                value={sku}
                onChangeText={setSku}
                onSubmitEditing={() => loadFirstPage(false)}
                placeholder="SKU"
                placeholderTextColor="#A3A3AB"
                style={styles.inlineInput}
              />
              <TextInput
                value={barcode}
                onChangeText={setBarcode}
                onSubmitEditing={() => loadFirstPage(false)}
                placeholder="Barkod"
                placeholderTextColor="#A3A3AB"
                style={styles.inlineInput}
              />
            </View>
          </View>
        ) : null}
        </View>
      </Animated.View>

      {error ? (
        <View style={styles.errorBox}>
          <AppText style={styles.errorText}>{error}</AppText>
        </View>
      ) : null}

      <FlatList
        data={items}
        onScroll={onListScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.catalogId}
        contentContainerStyle={styles.listContent}
        renderItem={renderCatalogItem}
        onEndReachedThreshold={0.35}
        onEndReached={loadMore}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadFirstPage(true)} tintColor="#6D57F2" />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color="#6D57F2" />
              <AppText style={styles.emptyText}>Ürünler yükleniyor...</AppText>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <AppText style={styles.emptyText}>Ürün bulunamadı.</AppText>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#6D57F2" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EFEFF2',
  },
  headerRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    color: '#141414',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E7EC',
    borderWidth: 1,
  },
  countersRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  counterCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E6EE',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  counterCardActive: {
    borderColor: '#CFC5FF',
    backgroundColor: '#F2EFFF',
  },
  counterCardMuted: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECF3',
    backgroundColor: '#F9F9FC',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  counterLabel: {
    fontSize: 11,
    color: '#5C5C66',
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  counterValue: {
    fontSize: 14,
    color: '#202027',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  filterAnimatedWrap: {
    overflow: 'hidden',
  },
  filterBlock: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  searchWrap: {
    height: 40,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8ED',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1B1B20',
    fontFamily: Fonts.sans,
    paddingVertical: 0,
  },
  searchAction: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  chipsContent: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8ED',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#F0EEFF',
    borderColor: '#CCBEFF',
  },
  filterChipText: {
    fontSize: 11,
    color: '#5A5A63',
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#5E4BCE',
  },
  advancedFiltersWrap: {
    gap: 8,
  },
  inlineInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8ED',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    color: '#1B1B20',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  errorBox: {
    marginHorizontal: 14,
    marginBottom: 8,
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
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 120,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEF',
    borderRadius: 14,
    padding: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imageWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F6F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  catalogMetaWrap: {
    flex: 1,
    gap: 2,
  },
  catalogName: {
    fontSize: 13,
    color: '#16161C',
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  catalogSubMeta: {
    fontSize: 11,
    color: '#7A7A84',
    fontFamily: Fonts.sans,
  },
  metricsRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 6,
  },
  metricPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F4F4FA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: '#666672',
    fontFamily: Fonts.sans,
  },
  metricValue: {
    fontSize: 10,
    color: '#2B2B33',
    fontFamily: Fonts.mono,
    fontWeight: '700',
  },
  chevronIcon: {
    marginLeft: 2,
  },
  variantList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEFF4',
    gap: 8,
  },
  emptyVariantRow: {
    borderRadius: 10,
    backgroundColor: '#F8F8FC',
    borderWidth: 1,
    borderColor: '#ECECF2',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  emptyVariantText: {
    fontSize: 11,
    color: '#7A7A84',
    fontFamily: Fonts.sans,
  },
  variantRow: {
    borderRadius: 10,
    backgroundColor: '#F8F8FC',
    borderWidth: 1,
    borderColor: '#ECECF2',
    padding: 8,
    flexDirection: 'row',
    gap: 8,
  },
  variantImageWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECF2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  variantImage: {
    width: '100%',
    height: '100%',
  },
  variantMetaWrap: {
    flex: 1,
    gap: 5,
  },
  variantCode: {
    fontSize: 12,
    color: '#1C1C23',
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  variantTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  variantTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#ECE9FF',
    color: '#5948C7',
    fontSize: 10,
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  variantBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  variantStock: {
    fontSize: 11,
    color: '#5F5F6A',
    fontFamily: Fonts.mono,
  },
  variantPrice: {
    fontSize: 12,
    color: '#17171B',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  emptyWrap: {
    paddingVertical: 42,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: '#6C6C74',
    fontSize: 13,
    fontFamily: Fonts.sans,
  },
  footerLoader: {
    paddingVertical: 14,
  },
});


