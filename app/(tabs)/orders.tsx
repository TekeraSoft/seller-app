import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
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
import { SellerOrder } from '@/features/orders/types';
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

const STATUS_FILTERS: Array<{ label: string; value: string | null; countKey: keyof OrdersCounters }> = [
  { label: 'Tümü', value: null, countKey: 'total' },
  { label: 'Beklemede', value: 'PENDING', countKey: 'pending' },
  { label: 'Kabul', value: 'ACCEPTED', countKey: 'accepted' },
  { label: 'Kargoda', value: 'SHIPPED', countKey: 'shipped' },
  { label: 'Teslim', value: 'DELIVERED', countKey: 'delivered' },
  { label: 'İptal', value: 'CANCELLED', countKey: 'cancelled' },
];

export default function OrdersScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
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
      dispatch(fetchSellerOrdersPage({ page: 0, size, refresh, filters: buildRequestFilters() }));
    },
    [buildRequestFilters, dispatch, size]
  );

  const loadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) return;
    dispatch(fetchSellerOrdersPage({ page: page + 1, size, filters: buildRequestFilters() }));
  }, [buildRequestFilters, dispatch, hasMore, isLoading, isLoadingMore, isRefreshing, page, size]);

  const openDetail = useCallback(
    (id: string) => {
      router.push({ pathname: '/order/[id]', params: { id } });
    },
    [router]
  );

  useFocusEffect(
    useCallback(() => {
      if (items.length === 0 && !isLoading) {
        loadFirstPage(false);
      }
    }, [isLoading, items.length, loadFirstPage])
  );

  const renderItem = ({ item }: { item: SellerOrder }) => (
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
          <AppText style={styles.statusPill}>{item.displayStatus ?? item.sellerOrderStatus ?? '-'}</AppText>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.headerRow}>
        <AppText style={styles.title} tone="rounded">
          Siparişler
        </AppText>
        <Pressable style={styles.refreshButton} onPress={() => loadFirstPage(true)}>
          <Ionicons name="refresh" size={16} color="#2B2B31" />
        </Pressable>
      </View>

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

      {error ? (
        <View style={styles.errorBox}>
          <AppText style={styles.errorText}>{error}</AppText>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
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

