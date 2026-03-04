import { api } from '@/lib/api';
import {
  PageResponse,
  SellerOrderFilterResponse,
  SellerOrdersFilterRequest,
  SellerReturn,
} from '@/features/orders/types';

type ApiResponse<T> = {
  message?: string;
  statusCode?: number;
  data?: T;
};

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

export async function createShipmentForSellerOrder(params: {
  sellerOrderId: string;
  trackingNumber: string;
}): Promise<ApiResponse<unknown>> {
  const payload = {
    soId: params.sellerOrderId,
    trackingNumber: params.trackingNumber,
  };
  const { data } = await api.post<ApiResponse<unknown>>('/seller/createShipment', payload);
  return data ?? {};
}

export async function getShippingSlipPresignedUrl(
  orderNo: string,
  expiryMinutes = 10
): Promise<string | null> {
  const { data } = await api.get<ApiResponse<string>>(`/seller/orders/${encodeURIComponent(orderNo)}/shipping-slip/presign`, {
    params: { expiryMinutes },
  });
  return typeof data?.data === 'string' && data.data.length > 0 ? data.data : null;
}

export async function uploadSellerOrderInvoice(params: {
  sellerOrderId: string;
  fileUri: string;
  fileName: string;
  mimeType?: string | null;
}): Promise<ApiResponse<string>> {
  const form = new FormData();
  form.append('file', {
    uri: params.fileUri,
    name: params.fileName,
    type: params.mimeType ?? 'application/pdf',
  } as never);

  const { data } = await api.post<ApiResponse<string>>(
    `/seller/seller-orders/${encodeURIComponent(params.sellerOrderId)}/invoice`,
    form,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return data ?? {};
}

export async function getInvoicePresignedUrl(
  sellerOrderId: string,
  expiryMinutes = 10
): Promise<string | null> {
  const { data } = await api.get<ApiResponse<string>>(
    `/seller/seller-orders/${encodeURIComponent(sellerOrderId)}/invoice/presign`,
    {
      params: { expiryMinutes },
    }
  );
  return typeof data?.data === 'string' && data.data.length > 0 ? data.data : null;
}

export async function acceptSellerOrder(sellerOrderId: string): Promise<ApiResponse<unknown>> {
  const { data } = await api.post<ApiResponse<unknown>>('/seller/acceptSellerOrder', null, {
    params: { sellerOrderId },
  });
  return data ?? {};
}

export async function rejectSellerOrder(params: {
  sellerOrderId: string;
  rejectionReason: string;
}): Promise<ApiResponse<unknown>> {
  const { data } = await api.post<ApiResponse<unknown>>('/seller/rejectSellerOrder', null, {
    params: {
      sellerOrderId: params.sellerOrderId,
      rejectionReason: params.rejectionReason,
    },
  });
  return data ?? {};
}

export async function fetchSellerReturns(params: {
  page: number;
  size: number;
  statuses?: string[];
}): Promise<PageResponse<SellerReturn>> {
  const { data } = await api.get<PageResponse<SellerReturn>>('/seller/getReturns', {
    params: {
      page: params.page,
      size: params.size,
      status: params.statuses,
    },
  });
  return data ?? {};
}

export async function approveSellerReturn(id: string): Promise<ApiResponse<unknown>> {
  const { data } = await api.post<ApiResponse<unknown>>('/seller/approveReturn', null, {
    params: { id },
  });
  return data ?? {};
}

export async function rejectSellerReturn(params: {
  id: string;
  reason: string;
}): Promise<SellerReturn> {
  const { data } = await api.post<SellerReturn>('/seller/rejectReturn', null, {
    params: {
      id: params.id,
      reason: params.reason,
    },
  });
  return data ?? {};
}

export async function completeSellerReturn(id: string): Promise<SellerReturn> {
  const { data } = await api.post<SellerReturn>('/seller/completeReturn', null, {
    params: { id },
  });
  return data ?? {};
}

export async function findSellerOrderIdByOrderNo(orderNo: string): Promise<string | null> {
  const response = await fetchSellerOrders({
    page: 0,
    size: 1,
    filters: { orderNo, sortBy: 'createdAt', sortDir: 'DESC' },
  });
  const firstOrder = Array.isArray(response.orders) ? response.orders[0] : null;
  if (!firstOrder?.id) {
    return null;
  }
  return firstOrder.id;
}
