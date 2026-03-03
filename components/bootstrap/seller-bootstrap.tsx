import { useEffect } from 'react';

import { useAuth } from '@/context/auth-context';
import { useAppDispatch } from '@/store/hooks';
import { resetOrdersState } from '@/store/orders-slice';
import { resetReportsState } from '@/store/reports-slice';
import { hydrateSellerDashboard, resetSellerState } from '@/store/seller-slice';

export function SellerBootstrap() {
  const { isAuthenticated, token } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      dispatch(resetSellerState());
      dispatch(resetOrdersState());
      dispatch(resetReportsState());
      return;
    }
    dispatch(hydrateSellerDashboard({ token }));
  }, [dispatch, isAuthenticated, token]);

  return null;
}
