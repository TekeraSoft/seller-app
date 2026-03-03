import { api } from '@/lib/api';
import { SellerOrderFilterResponse, SellerOrdersFilterRequest } from '@/features/orders/types';

export async function fetchSellerOrders(params: {
  page: number;
  size: number;
  filters?: SellerOrdersFilterRequest;
}): Promise<SellerOrderFilterResponse> {
  const { data } = await api.post<SellerOrderFilterResponse>('/seller/filterOrders', params.filters ?? {}, {
    params: {
      page: params.page,
      size: params.size,
    },
  });
  return data ?? {};
}
