import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { fetchSellerInfo, fetchSellerReport } from '@/features/seller/api';
import { resolvePublicAssetUrl, resolveSellerLogoUrl, toOptionalNonEmptyString } from '@/features/seller/mappers';
import {
  DEFAULT_PROFILE,
  DEFAULT_REPORT,
  initialSellerState,
  SellerProfile,
  SellerReport,
} from '@/features/seller/types';
import { getSellerIdentityFromAccessToken } from '@/lib/api';

export const hydrateSellerDashboard = createAsyncThunk<
  { profile: SellerProfile; report: SellerReport },
  { token: string }
>('seller/hydrateSellerDashboard', async ({ token }, thunkApi) => {
  const identity = getSellerIdentityFromAccessToken(token);
  let profile: SellerProfile = {
    id: identity.sellerId ?? null,
    basicId: identity.basicId ?? null,
    name: identity.nameSurname ?? DEFAULT_PROFILE.name,
    logo: null,
  };

  const info = await fetchSellerInfo();
  const infoLoaded = info != null;

  if (info) {
    profile = {
      id: toOptionalNonEmptyString(info.id) ?? profile.id,
      basicId:
        toOptionalNonEmptyString(info.basicId) ??
        toOptionalNonEmptyString(info.basic_id) ??
        toOptionalNonEmptyString(info.basicid) ??
        profile.basicId,
      name: toOptionalNonEmptyString(info.name) ?? profile.name,
      logo: toOptionalNonEmptyString(info.logo)
        ? resolveSellerLogoUrl(info.logo as string)
        : profile.logo,
    };
  }

  try {
    const reportData = await fetchSellerReport();
    const recentOrders = Array.isArray(reportData?.recentOrders?.content)
      ? reportData.recentOrders.content
          .map((item) => {
            const id = toOptionalNonEmptyString(item?.id);
            if (!id) return null;
            const buyerFirstName = toOptionalNonEmptyString(item?.buyerFirstName) ?? '';
            const buyerLastName = toOptionalNonEmptyString(item?.buyerLastName) ?? '';
            const buyerFullName = `${buyerFirstName} ${buyerLastName}`.trim() || 'Müşteri';
            const priceNumber =
              typeof item?.totalPrice === 'number'
                ? item.totalPrice
                : Number(toOptionalNonEmptyString(item?.totalPrice) ?? '0');
            const imagePath = toOptionalNonEmptyString(item?.productImage);

            return {
              id,
              orderNumber: toOptionalNonEmptyString(item?.orderNumber) ?? '-',
              buyerFullName,
              totalPrice: Number.isFinite(priceNumber) ? priceNumber : 0,
              createdAt: toOptionalNonEmptyString(item?.createdAt),
              productImage: imagePath ? resolvePublicAssetUrl(imagePath) : null,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [];
    const currentMonthSalesNumber =
      typeof reportData?.currentMonthSales === 'number'
        ? reportData.currentMonthSales
        : Number(toOptionalNonEmptyString(reportData?.currentMonthSales) ?? '0');
    const monthlyTargetNumber =
      typeof reportData?.monthlyTarget === 'number'
        ? reportData.monthlyTarget
        : Number(toOptionalNonEmptyString(reportData?.monthlyTarget) ?? '0');
    const progressPercentNumber =
      typeof reportData?.progressPercent === 'number'
        ? reportData.progressPercent
        : Number(toOptionalNonEmptyString(reportData?.progressPercent) ?? '0');

    return {
      profile,
      report: {
        totalOrders: typeof reportData?.totalOrders === 'number' ? reportData.totalOrders : 0,
        totalProducts: typeof reportData?.totalProducts === 'number' ? reportData.totalProducts : 0,
        followerCount: Array.isArray(reportData?.followers) ? reportData.followers.length : 0,
        currentMonthSales: Number.isFinite(currentMonthSalesNumber) ? currentMonthSalesNumber : 0,
        monthlyTarget: Number.isFinite(monthlyTargetNumber) ? monthlyTargetNumber : 0,
        progressPercent: Number.isFinite(progressPercentNumber) ? progressPercentNumber : 0,
        recentOrders,
      },
    };
  } catch (reportError) {
    console.warn('[seller-slice] seller report request failed', reportError);
    if (!infoLoaded) {
      return thunkApi.rejectWithValue('Satıcı verileri alınamadı.');
    }
    return {
      profile,
      report: DEFAULT_REPORT,
    };
  }
});

const sellerSlice = createSlice({
  name: 'seller',
  initialState: initialSellerState,
  reducers: {
    resetSellerState: () => initialSellerState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateSellerDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(hydrateSellerDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.profile = action.payload.profile;
        state.report = action.payload.report;
      })
      .addCase(hydrateSellerDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.profile = DEFAULT_PROFILE;
        state.report = DEFAULT_REPORT;
        state.error =
          typeof action.payload === 'string'
            ? action.payload
            : action.error.message ?? 'Satıcı verileri alınamadı.';
      });
  },
});

export const { resetSellerState } = sellerSlice.actions;
export const sellerReducer = sellerSlice.reducer;
