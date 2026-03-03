import { api } from '@/lib/api';
import { SellerInfoResponse, SellerReportResponse } from '@/features/seller/types';

export async function fetchSellerInfo(): Promise<SellerInfoResponse | null> {
  try {
    const { data } = await api.get<SellerInfoResponse>('/seller/getSellerInformation');
    return data;
  } catch {
    try {
      const { data } = await api.get<SellerInfoResponse>('/user/getSellerInformation');
      return data;
    } catch {
      return null;
    }
  }
}

export async function fetchSellerReport(): Promise<SellerReportResponse> {
  const { data } = await api.get<SellerReportResponse>('/seller/getSellerReport');
  return data ?? {};
}
