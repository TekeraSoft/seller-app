import { configureStore } from '@reduxjs/toolkit';

import { ordersReducer } from '@/store/orders-slice';
import { reportsReducer } from '@/store/reports-slice';
import { sellerReducer } from '@/store/seller-slice';

export const store = configureStore({
  reducer: {
    seller: sellerReducer,
    orders: ordersReducer,
    reports: reportsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
