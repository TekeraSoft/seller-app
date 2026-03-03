import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { fetchSellerInterruptions } from '@/features/reports/api';
import {
  initialReportsState,
  SellerInterruptionItem,
  SellerInterruptionItemResponse,
  SellerInterruptionPeriod,
  SellerInterruptionResponse,
} from '@/features/reports/types';
import { resolvePublicAssetUrl, toOptionalNonEmptyString } from '@/features/seller/mappers';

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number(toOptionalNonEmptyString(value) ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function toItem(value: SellerInterruptionItemResponse, index: number): SellerInterruptionItem {
  const imagePath = toOptionalNonEmptyString(value.productImageUrl);
  return {
    id: `${toOptionalNonEmptyString(value.orderNumber) ?? 'order'}-${index}`,
    orderNumber: toOptionalNonEmptyString(value.orderNumber) ?? '-',
    productName: toOptionalNonEmptyString(value.productName) ?? 'Ürün',
    modelCode: toOptionalNonEmptyString(value.modelCode) ?? '-',
    productImageUrl: imagePath ? resolvePublicAssetUrl(imagePath) : null,
    lineTotal: toNumber(value.lineTotal),
    usageFeeLabel: toOptionalNonEmptyString(value.platformUsageFee?.description) ?? 'Platform Kullanım Ücreti',
    usageFeeValue: toNumber(value.platformUsageFee?.value),
    commissionLabel: toOptionalNonEmptyString(value.platformCommission?.description) ?? 'Komisyon',
    commissionValue: toNumber(value.platformCommission?.value),
    commissionRate: hasValue(value.commissionRate) ? toNumber(value.commissionRate) : null,
    sellerProfit: toNumber(value.sellerProfit),
  };
}

function toPeriod(value: SellerInterruptionResponse, index: number): SellerInterruptionPeriod {
  const month = toOptionalNonEmptyString(value.calculateDate?.month) ?? '-';
  const year = toOptionalNonEmptyString(value.calculateDate?.year) ?? '-';
  const itemsRaw = Array.isArray(value.interruptionContent) ? value.interruptionContent : [];
  return {
    id: `${year}-${month}-${index}`,
    month,
    year,
    sellerFee: toNumber(value.sellerFee),
    interruptionAmount: toNumber(value.interruptionAmount),
    total: toNumber(value.total),
    items: itemsRaw.map((item, itemIndex) => toItem(item, itemIndex)),
  };
}

export const fetchReports = createAsyncThunk('reports/fetchReports', async () => {
  const response = await fetchSellerInterruptions();
  return response.map(toPeriod);
});

const reportsSlice = createSlice({
  name: 'reports',
  initialState: initialReportsState,
  reducers: {
    resetReportsState: () => initialReportsState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action: { payload: SellerInterruptionPeriod[] }) => {
        state.isLoading = false;
        state.error = null;
        state.periods = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Rapor verileri alınamadı.';
      });
  },
});

export const { resetReportsState } = reportsSlice.actions;
export const reportsReducer = reportsSlice.reducer;
