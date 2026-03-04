import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  approveSellerReturn,
  completeSellerReturn,
  fetchSellerReturns,
  rejectSellerReturn,
} from '@/features/orders/api';
import { SellerOrder, SellerReturn } from '@/features/orders/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSellerOrdersPage, setOrdersSearchText, setOrdersStatusFilter } from '@/store/orders-slice';

type OrdersCounters = {
  total: number;
  pending: number;
  accepted: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

type ActiveSection = 'orders' | 'returns';

function toTurkishStatusLabel(status: string | null | undefined): string {
  const normalized = (status ?? '').trim().toUpperCase();
  switch (normalized) {
    case 'PENDING':
      return 'Beklemede';
    case 'ACCEPTED':
      return 'Kabul Edildi';
    case 'REJECTED':
      return 'Reddedildi';
    case 'SHIPPED':
      return 'Kargoya Verildi';
    case 'DELIVERED':
      return 'Teslim Edildi';
    case 'CANCELLED':
      return 'İptal Edildi';
    case 'PROCESSING':
      return 'Hazırlanıyor';
    case 'RETURNED':
      return 'İade Edildi';
    case 'RETURN_REQUESTED':
      return 'İade Talebi';
    case 'RETURN_APPROVED':
      return 'İade Onaylandı';
    case 'RETURN_REFUNDED':
      return 'İade Tamamlandı';
    case 'RETURN_REJECTED':
      return 'İade Reddedildi';
    case 'RETURN_EXPIRED':
      return 'İade Süresi Doldu';
    case 'REQUESTED':
      return 'Talep Alındı';
    case 'APPROVED':
      return 'Onaylandı';
    case 'REFUNDED':
      return 'İade Ödendi';
    case 'EXPIRED':
      return 'Süresi Doldu';
    default:
      return (status ?? '').trim();
  }
}

const STATUS_FILTERS: Array<{ label: string; value: string | null; countKey: keyof OrdersCounters }> = [
  { label: 'Tümü', value: null, countKey: 'total' },
  { label: 'Beklemede', value: 'PENDING', countKey: 'pending' },
  { label: 'Kabul', value: 'ACCEPTED', countKey: 'accepted' },
  { label: 'Kargoda', value: 'SHIPPED', countKey: 'shipped' },
  { label: 'Teslim', value: 'DELIVERED', countKey: 'delivered' },
  { label: 'İptal', value: 'CANCELLED', countKey: 'cancelled' },
];

const RETURN_STATUS_FILTERS: Array<{ label: string; value: string | null }> = [
  { label: 'Tümü', value: null },
  { label: 'Talep', value: 'REQUESTED' },
  { label: 'Onay', value: 'APPROVED' },
  { label: 'İade Edildi', value: 'REFUNDED' },
  { label: 'Red', value: 'REJECTED' },
  { label: 'Süre Doldu', value: 'EXPIRED' },
];

export default function OrdersScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const didAutoLoadOnFocusRef = useRef(false);
  const didAutoLoadReturnsOnFocusRef = useRef(false);

  const [activeSection, setActiveSection] = useState<ActiveSection>('orders');
  const [returnsItems, setReturnsItems] = useState<SellerReturn[]>([]);
  const [returnsPage, setReturnsPage] = useState(0);
  const [returnsSize] = useState(20);
  const [returnsHasMore, setReturnsHasMore] = useState(true);
  const [returnsIsLoading, setReturnsIsLoading] = useState(false);
  const [returnsIsRefreshing, setReturnsIsRefreshing] = useState(false);
  const [returnsIsLoadingMore, setReturnsIsLoadingMore] = useState(false);
  const [returnsError, setReturnsError] = useState<string | null>(null);
  const [returnsActionLoadingId, setReturnsActionLoadingId] = useState<string | null>(null);
  const [rejectReasonByReturnId, setRejectReasonByReturnId] = useState<Record<string, string>>({});
  const [selectedReturnStatus, setSelectedReturnStatus] = useState<string | null>(null);

  const { items, isLoading, isRefreshing, isLoadingMore, page, size, hasMore, error, filters, counters } =
    useAppSelector((state) => state.orders);

  const buildRequestFilters = useCallback(() => {
    const query = filters.searchText.trim();
    return {
      orderNo: query.length > 0 ? query : undefined,
      customerName: query.length > 0 ? query : undefined,
      sellerOrderStatus: filters.sellerOrderStatus ?? undefined,
      sortBy: 'createdAt',
      sortDir: 'DESC' as const,
    };
  }, [filters.searchText, filters.sellerOrderStatus]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(value);

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const loadFirstPage = useCallback(
    (refresh = false) => {
      if (refresh) {
        didAutoLoadOnFocusRef.current = true;
      }
      dispatch(fetchSellerOrdersPage({ page: 0, size, refresh, filters: buildRequestFilters() }));
    },
    [buildRequestFilters, dispatch, size]
  );

  const loadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) return;
    dispatch(fetchSellerOrdersPage({ page: page + 1, size, filters: buildRequestFilters() }));
  }, [buildRequestFilters, dispatch, hasMore, isLoading, isLoadingMore, isRefreshing, page, size]);

  const loadReturns = useCallback(
    async (nextPage: number, refresh = false) => {
      const statuses = selectedReturnStatus ? [selectedReturnStatus] : undefined;
      if (refresh) {
        setReturnsIsRefreshing(true);
        setReturnsError(null);
      } else if (nextPage === 0 && returnsItems.length === 0) {
        setReturnsIsLoading(true);
      } else {
        setReturnsIsLoadingMore(true);
      }

      try {
        const response = await fetchSellerReturns({
          page: nextPage,
          size: returnsSize,
          statuses,
        });
        const incoming = Array.isArray(response.content) ? response.content : [];
        setReturnsItems((prev) => (nextPage === 0 ? incoming : [...prev, ...incoming]));
        setReturnsPage(nextPage);

        const totalPages = Number(response.totalPages ?? 0);
        if (totalPages > 0) {
          setReturnsHasMore(nextPage + 1 < totalPages);
        } else {
          setReturnsHasMore(incoming.length >= returnsSize);
        }
      } catch {
        setReturnsError('İade talepleri alınamadı.');
      } finally {
        setReturnsIsLoading(false);
        setReturnsIsRefreshing(false);
        setReturnsIsLoadingMore(false);
      }
    },
    [returnsItems.length, returnsSize, selectedReturnStatus]
  );

  const loadMoreReturns = useCallback(() => {
    if (returnsIsLoading || returnsIsRefreshing || returnsIsLoadingMore || !returnsHasMore) return;
    void loadReturns(returnsPage + 1, false);
  }, [loadReturns, returnsHasMore, returnsIsLoading, returnsIsLoadingMore, returnsIsRefreshing, returnsPage]);

  const openDetail = useCallback(
    (id: string) => {
      router.push({ pathname: '/order/[id]', params: { id } });
    },
    [router]
  );

  const handleApproveReturn = useCallback(
    (returnId: string) => {
      Alert.alert('İade Onayı', 'Bu iade talebini onaylamak istiyor musunuz?', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              setReturnsActionLoadingId(returnId);
              await approveSellerReturn(returnId);
              await loadReturns(0, true);
              Alert.alert('Başarılı', 'İade talebi onaylandı.');
            } catch {
              Alert.alert('Hata', 'İade talebi onaylanamadı.');
            } finally {
              setReturnsActionLoadingId(null);
            }
          },
        },
      ]);
    },
    [loadReturns]
  );

  const handleRejectReturn = useCallback(
    (returnId: string) => {
      const reason = (rejectReasonByReturnId[returnId] ?? '').trim();
      if (reason.length < 3) {
        Alert.alert('Eksik Bilgi', 'Lütfen en az 3 karakterlik red nedeni girin.');
        return;
      }

      Alert.alert('İade Red Onayı', 'Bu iade talebini reddetmek istiyor musunuz?', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            try {
              setReturnsActionLoadingId(returnId);
              await rejectSellerReturn({ id: returnId, reason });
              setRejectReasonByReturnId((prev) => ({ ...prev, [returnId]: '' }));
              await loadReturns(0, true);
              Alert.alert('Başarılı', 'İade talebi reddedildi.');
            } catch {
              Alert.alert('Hata', 'İade talebi reddedilemedi.');
            } finally {
              setReturnsActionLoadingId(null);
            }
          },
        },
      ]);
    },
    [loadReturns, rejectReasonByReturnId]
  );

  const handleCompleteReturn = useCallback(
    (returnId: string) => {
      Alert.alert('İadeyi Tamamla', 'Bu iade işlemini tamamlamak istiyor musunuz?', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Tamamla',
          onPress: async () => {
            try {
              setReturnsActionLoadingId(returnId);
              await completeSellerReturn(returnId);
              await loadReturns(0, true);
              Alert.alert('Başarılı', 'İade işlemi tamamlandı.');
            } catch {
              Alert.alert('Hata', 'İade işlemi tamamlanamadı.');
            } finally {
              setReturnsActionLoadingId(null);
            }
          },
        },
      ]);
    },
    [loadReturns]
  );

  useFocusEffect(
    useCallback(() => {
      if (
        !didAutoLoadOnFocusRef.current &&
        items.length === 0 &&
        !isLoading &&
        !isRefreshing &&
        !isLoadingMore
      ) {
        didAutoLoadOnFocusRef.current = true;
        loadFirstPage(false);
      }

      if (
        !didAutoLoadReturnsOnFocusRef.current &&
        returnsItems.length === 0 &&
        !returnsIsLoading &&
        !returnsIsRefreshing &&
        !returnsIsLoadingMore
      ) {
        didAutoLoadReturnsOnFocusRef.current = true;
        void loadReturns(0, false);
      }
    }, [
      isLoading,
      isLoadingMore,
      isRefreshing,
      items.length,
      loadFirstPage,
      loadReturns,
      returnsIsLoading,
      returnsIsLoadingMore,
      returnsIsRefreshing,
      returnsItems.length,
    ])
  );

  const renderOrderItem = ({ item }: { item: SellerOrder }) => (
    <Pressable onPress={() => openDetail(item.id)} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.leftMain}>
          <View style={styles.imageWrap}>
            {item.firstImage ? (
              <Image source={{ uri: item.firstImage }} style={styles.image} resizeMode="cover" />
            ) : (
              <Ionicons name="image-outline" size={18} color="#A2A2AB" />
            )}
          </View>
          <View style={styles.metaWrap}>
            <AppText style={styles.orderNo}>#{item.orderNo}</AppText>
            <AppText style={styles.buyerName}>{item.buyerName}</AppText>
            <AppText style={styles.dateText}>{formatDate(item.createdAt)}</AppText>
          </View>
        </View>
        <View style={styles.rightMain}>
          <AppText style={styles.totalPrice} tone="rounded">
            {formatCurrency(item.payableTotalPrice || item.totalPrice)}
          </AppText>
          <AppText style={styles.itemCount}>{item.itemCount} ürün</AppText>
          <AppText style={styles.statusPill}>
            {toTurkishStatusLabel(item.displayStatus) || toTurkishStatusLabel(item.sellerOrderStatus) || '-'}
          </AppText>
        </View>
      </View>
    </Pressable>
  );

  const renderReturnItem = ({ item }: { item: SellerReturn }) => {
    const returnId = item.id ?? '';
    const line = Array.isArray(item.lines) ? item.lines[0] : undefined;
    const itemName = line?.basketItem?.name ?? 'Ürün';
    const itemImage = line?.basketItem?.image ?? null;
    const itemQuantity = Number(line?.quantity ?? 0);
    const refundAmount = Number(line?.refundAmount ?? 0);
    const status = (item.status ?? '').trim().toUpperCase();
    const isRequested = status === 'REQUESTED';
    const isApproved = status === 'APPROVED';
    const isActionLoading = returnsActionLoadingId === returnId;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.leftMain}>
            <View style={styles.imageWrap}>
              {itemImage ? (
                <Image source={{ uri: itemImage }} style={styles.image} resizeMode="cover" />
              ) : (
                <Ionicons name="cube-outline" size={18} color="#A2A2AB" />
              )}
            </View>
            <View style={styles.metaWrap}>
              <AppText style={styles.buyerName}>{itemName}</AppText>
              <AppText style={styles.dateText}>Adet: {itemQuantity || '-'}</AppText>
              {item.reason ? <AppText style={styles.dateText}>Neden: {item.reason}</AppText> : null}
            </View>
          </View>
          <View style={styles.rightMain}>
            <AppText style={styles.totalPrice} tone="rounded">
              {formatCurrency(refundAmount)}
            </AppText>
            <AppText style={styles.statusPill}>{toTurkishStatusLabel(status) || '-'}</AppText>
          </View>
        </View>

        {isRequested ? (
          <View style={styles.returnActionsWrap}>
            <TextInput
              value={rejectReasonByReturnId[returnId] ?? ''}
              onChangeText={(value) => setRejectReasonByReturnId((prev) => ({ ...prev, [returnId]: value }))}
              placeholder="İade red nedeni"
              placeholderTextColor="#A1A1AA"
              style={styles.returnRejectInput}
              editable={!isActionLoading}
            />
            <View style={styles.inlineButtons}>
              <Pressable
                style={[styles.returnApproveButton, isActionLoading && styles.buttonDisabled]}
                onPress={() => handleApproveReturn(returnId)}
                disabled={isActionLoading || !returnId}>
                {isActionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <AppText style={styles.returnApproveButtonText}>Onayla</AppText>
                )}
              </Pressable>
              <Pressable
                style={[styles.returnRejectButton, isActionLoading && styles.buttonDisabled]}
                onPress={() => handleRejectReturn(returnId)}
                disabled={isActionLoading || !returnId}>
                <AppText style={styles.returnRejectButtonText}>Reddet</AppText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {isApproved ? (
          <Pressable
            style={[styles.returnCompleteButton, isActionLoading && styles.buttonDisabled]}
            onPress={() => handleCompleteReturn(returnId)}
            disabled={isActionLoading || !returnId}>
            {isActionLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <AppText style={styles.returnCompleteButtonText}>İadeyi Tamamla</AppText>
            )}
          </Pressable>
        ) : null}
      </View>
    );
  };

  const activeError = activeSection === 'orders' ? error : returnsError;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.headerRow}>
        <AppText style={styles.title} tone="rounded">
          Siparişler
        </AppText>
        <Pressable
          style={styles.refreshButton}
          onPress={() => {
            if (activeSection === 'orders') {
              loadFirstPage(true);
            } else {
              void loadReturns(0, true);
            }
          }}>
          <Ionicons name="refresh" size={16} color="#2B2B31" />
        </Pressable>
      </View>

      <View style={styles.sectionSwitchWrap}>
        <Pressable
          style={[styles.sectionSwitchButton, activeSection === 'orders' && styles.sectionSwitchButtonActive]}
          onPress={() => setActiveSection('orders')}>
          <AppText style={[styles.sectionSwitchText, activeSection === 'orders' && styles.sectionSwitchTextActive]}>
            Siparişler
          </AppText>
        </Pressable>
        <Pressable
          style={[styles.sectionSwitchButton, activeSection === 'returns' && styles.sectionSwitchButtonActive]}
          onPress={() => {
            setActiveSection('returns');
            if (returnsItems.length === 0) {
              void loadReturns(0, false);
            }
          }}>
          <AppText style={[styles.sectionSwitchText, activeSection === 'returns' && styles.sectionSwitchTextActive]}>
            İade Talepleri
          </AppText>
        </Pressable>
      </View>

      {activeSection === 'orders' ? (
        <View style={styles.filterBlock}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color="#8F8F98" />
            <TextInput
              value={filters.searchText}
              onChangeText={(value) => dispatch(setOrdersSearchText(value))}
              onSubmitEditing={() => loadFirstPage(false)}
              placeholder="Sipariş no veya müşteri adı"
              placeholderTextColor="#A3A3AB"
              style={styles.searchInput}
              returnKeyType="search"
            />
            <Pressable style={styles.searchAction} onPress={() => loadFirstPage(false)}>
              <Ionicons name="arrow-forward" size={14} color="#1F1F23" />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            {STATUS_FILTERS.map((option) => {
              const selected = filters.sellerOrderStatus === option.value;
              const count = counters[option.countKey];
              return (
                <Pressable
                  key={option.label}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                  onPress={() => {
                    dispatch(setOrdersStatusFilter(option.value));
                    dispatch(
                      fetchSellerOrdersPage({
                        page: 0,
                        size,
                        refresh: false,
                        filters: {
                          ...buildRequestFilters(),
                          sellerOrderStatus: option.value ?? undefined,
                        },
                      })
                    );
                  }}>
                  <AppText style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                    {option.label}
                  </AppText>
                  <AppText style={[styles.filterChipCount, selected && styles.filterChipCountActive]}>{count}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.filterBlock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            {RETURN_STATUS_FILTERS.map((option) => {
              const selected = selectedReturnStatus === option.value;
              return (
                <Pressable
                  key={option.label}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                  onPress={() => {
                    setSelectedReturnStatus(option.value);
                    setReturnsItems([]);
                    setReturnsPage(0);
                    setReturnsHasMore(true);
                    void loadReturns(0, false);
                  }}>
                  <AppText style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {activeError ? (
        <View style={styles.errorBox}>
          <AppText style={styles.errorText}>{activeError}</AppText>
        </View>
      ) : null}

      {activeSection === 'orders' ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderOrderItem}
          onEndReachedThreshold={0.35}
          onEndReached={loadMore}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadFirstPage(true)} tintColor="#7F67FF" />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator color="#7F67FF" />
                <AppText style={styles.emptyText}>Siparişler yükleniyor...</AppText>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <AppText style={styles.emptyText}>Sipariş bulunamadı.</AppText>
              </View>
            )
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color="#7F67FF" />
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={returnsItems}
          keyExtractor={(item, index) => item.id ?? `return-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={renderReturnItem}
          onEndReachedThreshold={0.35}
          onEndReached={loadMoreReturns}
          refreshControl={
            <RefreshControl
              refreshing={returnsIsRefreshing}
              onRefresh={() => void loadReturns(0, true)}
              tintColor="#7F67FF"
            />
          }
          ListEmptyComponent={
            returnsIsLoading ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator color="#7F67FF" />
                <AppText style={styles.emptyText}>İade talepleri yükleniyor...</AppText>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <AppText style={styles.emptyText}>İade talebi bulunamadı.</AppText>
              </View>
            )
          }
          ListFooterComponent={
            returnsIsLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color="#7F67FF" />
              </View>
            ) : null
          }
        />
      )}
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
  refreshButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E7EC',
    borderWidth: 1,
  },
  sectionSwitchWrap: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E2E2EA',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  sectionSwitchButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionSwitchButtonActive: {
    backgroundColor: '#F0EEFF',
  },
  sectionSwitchText: {
    fontSize: 12,
    color: '#5A5A63',
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  sectionSwitchTextActive: {
    color: '#5E4BCE',
  },
  filterBlock: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  searchWrap: {
    height: 38,
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
  filterChipCount: {
    fontSize: 10,
    color: '#8D8D97',
    fontFamily: Fonts.mono,
  },
  filterChipCountActive: {
    color: '#5E4BCE',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  leftMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  imageWrap: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#F6F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  metaWrap: {
    flex: 1,
    gap: 1,
  },
  orderNo: {
    fontSize: 12,
    color: '#2A2A2F',
    fontFamily: Fonts.mono,
  },
  buyerName: {
    fontSize: 13,
    color: '#17171B',
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 10,
    color: '#9A9AA3',
    fontFamily: Fonts.sans,
  },
  rightMain: {
    alignItems: 'flex-end',
    gap: 2,
  },
  totalPrice: {
    fontSize: 13,
    color: '#151515',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  itemCount: {
    fontSize: 10,
    color: '#8F8F98',
    fontFamily: Fonts.sans,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#F0EEFF',
    color: '#5E4BCE',
    fontSize: 10,
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  returnActionsWrap: {
    marginTop: 10,
    gap: 8,
  },
  returnRejectInput: {
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
  inlineButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  returnApproveButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#6D57F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnApproveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  returnRejectButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#FBE9E9',
    borderWidth: 1,
    borderColor: '#F2B6B6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnRejectButtonText: {
    color: '#C73939',
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  returnCompleteButton: {
    marginTop: 10,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#4B8D5C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnCompleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
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
