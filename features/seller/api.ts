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

export async function closeSellerAccount(reason: string): Promise<void> {
  await api.post('/seller/close-account', { reason });
}

export type ContractInfo = {
  fileName?: string;
  version?: string;
  publishedAt?: string;
  hash?: string;
  downloadUrl?: string;
  accepted?: boolean;
  acceptedAt?: string | null;
};

export async function fetchContractInfo(): Promise<ContractInfo | null> {
  try {
    const { data } = await api.get<ContractInfo>('/seller-onboarding/contract');
    return data;
  } catch {
    return null;
  }
}

export async function acceptContract(): Promise<void> {
  await api.post('/seller-onboarding/contract/accept', { accepted: true });
}

export async function fetchContractText(): Promise<string> {
  try {
    const { data } = await api.get<string>('/seller-onboarding/contract/text');
    return data ?? '';
  } catch {
    throw new Error('Sözleşme metni yüklenemedi.');
  }
}
