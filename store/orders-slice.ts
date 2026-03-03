import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { fetchSellerOrders } from '@/features/orders/api';
import {
  initialOrdersState,
  SellerOrdersFilterRequest,
  SellerOrder,
  SellerOrderAddress,
  SellerOrderAddressResponse,
  SellerOrderLineItem,
  SellerOrderResponse,
} from '@/features/orders/types';
import { resolvePublicAssetUrl, toOptionalNonEmptyString } from '@/features/seller/mappers';

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number(toOptionalNonEmptyString(value) ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function toAddress(value?: SellerOrderAddressResponse | null): SellerOrderAddress | null {
  if (!value) return null;
  return {
    city: toOptionalNonEmptyString(value.city) ?? '-',
    street: toOptionalNonEmptyString(value.street) ?? '-',
    postalCode: toOptionalNonEmptyString(value.postalCode),
    buildNo: toOptionalNonEmptyString(value.buildNo) ?? '-',
    doorNumber: toOptionalNonEmptyString(value.doorNumber) ?? '-',
    gsmNumber: toOptionalNonEmptyString(value.gsmNumber) ?? '-',
    detailAddress: toOptionalNonEmptyString(value.detailAddress) ?? '-',
    country: toOptionalNonEmptyString(value.country),
  };
}

function toLineItem(
  value: NonNullable<SellerOrderResponse['basketItems']>[number],
  index: number
): SellerOrderLineItem | null {
  const id = toOptionalNonEmptyString(value?.id) ?? `line-${index}`;
  const quantity = typeof value?.quantity === 'number' ? value.quantity : 0;
  const unitPrice = toNumber(value?.discountedUnitPrice ?? value?.unitPrice);
  const lineTotal = toNumber(value?.lineTotal);
  const imagePath = toOptionalNonEmptyString(value?.image);

  return {
    id,
    name:
      toOptionalNonEmptyString(value?.productName) ??
      toOptionalNonEmptyString(value?.name) ??
      'Ürün',
    quantity,
    unitPrice,
    lineTotal,
    image: imagePath ? resolvePublicAssetUrl(imagePath) : null,
  };
}

function toOrder(value: SellerOrderResponse): SellerOrder | null {
  const id = toOptionalNonEmptyString(value.id);
  if (!id) return null;

  const name = toOptionalNonEmptyString(value.buyer?.name) ?? '';
  const surname = toOptionalNonEmptyString(value.buyer?.surname) ?? '';
  const buyerName = `${name} ${surname}`.trim() || 'Müşteri';
  const itemsRaw = Array.isArray(value.basketItems) ? value.basketItems : [];
  const items = itemsRaw
    .map((item, index) => toLineItem(item, index))
    .filter((item): item is SellerOrderLineItem => item !== null);

  return {
    id,
    orderNo: toOptionalNonEmptyString(value.orderNo) ?? '-',
    buyerName,
    buyerPhone: toOptionalNonEmptyString(value.buyer?.gsmNumber) ?? '-',
    createdAt: toOptionalNonEmptyString(value.createdAt),
    totalPrice: toNumber(value.totalPrice),
    shippingPrice: toNumber(value.shippingPrice),
    payableTotalPrice: toNumber(value.payableTotalPrice),
    paymentStatus: toOptionalNonEmptyString(value.paymentStatus),
    sellerOrderStatus: toOptionalNonEmptyString(value.sellerOrderStatus),
    displayStatus: toOptionalNonEmptyString(value.displayStatus),
    rejectedReason: toOptionalNonEmptyString(value.rejectedReason),
    itemCount: items.reduce((acc, item) => acc + Math.max(1, item.quantity), 0),
    firstImage: items.find((item) => item.image)?.image ?? null,
    items,
    shippingAddress: toAddress(value.shippingAddress),
    billingAddress: toAddress(value.billingAddress),
  };
}

export const fetchSellerOrdersPage = createAsyncThunk(
  'orders/fetchSellerOrdersPage',
  async (args: { page?: number; size?: number; refresh?: boolean; filters?: SellerOrdersFilterRequest } | undefined) => {
    const page = args?.page ?? 0;
    const size = args?.size ?? 20;
    const response = await fetchSellerOrders({ page, size, filters: args?.filters });
    const content = Array.isArray(response.orders) ? response.orders : [];
    const mapped = content.map(toOrder).filter((item): item is SellerOrder => item !== null);
    const responsePage = response.page;
    const responseCounters = response.counters;

    return {
      items: mapped,
      page: typeof responsePage?.page === 'number' ? responsePage.page : page,
      size: typeof responsePage?.size === 'number' ? responsePage.size : size,
      totalElements: typeof responsePage?.totalElements === 'number' ? responsePage.totalElements : mapped.length,
      hasMore:
        typeof responsePage?.totalPages === 'number'
          ? page + 1 < responsePage.totalPages
          : mapped.length >= size,
      refresh: Boolean(args?.refresh),
      counters: {
        total: typeof responseCounters?.total === 'number' ? responseCounters.total : 0,
        pending: typeof responseCounters?.pending === 'number' ? responseCounters.pending : 0,
        accepted: typeof responseCounters?.accepted === 'number' ? responseCounters.accepted : 0,
        shipped: typeof responseCounters?.shipped === 'number' ? responseCounters.shipped : 0,
        delivered: typeof responseCounters?.delivered === 'number' ? responseCounters.delivered : 0,
        cancelled: typeof responseCounters?.cancelled === 'number' ? responseCounters.cancelled : 0,
      },
    };
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState: initialOrdersState,
  reducers: {
    resetOrdersState: () => initialOrdersState,
    setOrdersSearchText: (state, action: { payload: string }) => {
      state.filters.searchText = action.payload;
    },
    setOrdersStatusFilter: (state, action: { payload: string | null }) => {
      state.filters.sellerOrderStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSellerOrdersPage.pending, (state, action) => {
        const requestedPage = action.meta.arg?.page ?? 0;
        const refresh = Boolean(action.meta.arg?.refresh);
        state.error = null;

        if (requestedPage === 0 && !refresh) {
          state.isLoading = true;
        } else if (refresh) {
          state.isRefreshing = true;
        } else {
          state.isLoadingMore = true;
        }
      })
      .addCase(fetchSellerOrdersPage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.isLoadingMore = false;
        state.error = null;

        const { items, page, size, totalElements, hasMore, refresh } = action.payload;
        state.counters = action.payload.counters;
        if (page === 0 || refresh) {
          state.items = items;
        } else {
          const existing = new Set(state.items.map((item) => item.id));
          const next = items.filter((item) => !existing.has(item.id));
          state.items = [...state.items, ...next];
        }

        state.page = page;
        state.size = size;
        state.totalElements = totalElements;
        state.hasMore = hasMore;
      })
      .addCase(fetchSellerOrdersPage.rejected, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.isLoadingMore = false;
        state.error = action.error.message ?? 'Siparişler alınamadı.';
      });
  },
});

export const { resetOrdersState, setOrdersSearchText, setOrdersStatusFilter } = ordersSlice.actions;
export const ordersReducer = ordersSlice.reducer;
