import axios from 'axios';
import { api, API_BASE_URL } from '@/lib/api';
import type { InfluencerApplication, InfluencerCompanyType, InfluencerDocumentStatus, InfluencerDocumentType } from './types';

type ApiResponse<T> = {
  message?: string;
  statusCode?: number;
  data?: T;
};

export type RegisterAndApplyPayload = {
  // Kullanıcı kaydı
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender: 'MALE' | 'FEMALE';
  // Influencer başvurusu
  gsmNumber: string;
  companyType: InfluencerCompanyType;
  nationalId?: string;
  taxNumber?: string;
  socialLinks: Record<string, string>;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export async function registerUser(payload: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender: 'MALE' | 'FEMALE';
  electronicMessageConsent: boolean;
}): Promise<AuthTokens> {
  // 1. Hesap oluştur (token dönmez)
  await api.post('/auth/register', {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    password: payload.password,
    gender: payload.gender,
    isAcceptAgreement: true,
    electronicMessageConsent: payload.electronicMessageConsent,
  });

  // 2. Oluşturulan hesap ile giriş yap — auth interceptor'sız direkt çağrı
  const loginResponse = await axios.post<AuthTokens>(`${API_BASE_URL}/auth/authenticate`, {
    email: payload.email,
    password: payload.password,
  });

  const tokens = loginResponse.data;
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    throw new Error('Giriş başarısız, token alınamadı');
  }
  return tokens;
}

export async function applyAsInfluencer(payload: {
  gsmNumber: string;
  companyType: InfluencerCompanyType;
  nationalId?: string;
  taxNumber?: string;
  socialLinks: Record<string, string>;
}): Promise<void> {
  await api.post('/influencer/apply', payload);
}

export async function getMyApplication(): Promise<InfluencerApplication> {
  const response = await api.get<ApiResponse<InfluencerApplication>>('/influencer/my-application');
  if (!response.data?.data) throw new Error('Başvuru bulunamadı');
  return response.data.data;
}

export async function updateInfluencerBankInfo(payload: {
  iban: string;
  accountHolderName: string;
  bankName: string;
}): Promise<void> {
  await api.put('/influencer/bank-info', payload);
}

export type InfluencerContractInfo = {
  title: string;
  version: string;
  publishedAt: string | null;
  hash: string;
  content: string;
  accepted: boolean;
  acceptedAt: string | null;
};

export async function getInfluencerContract(): Promise<InfluencerContractInfo> {
  const response = await api.get<ApiResponse<InfluencerContractInfo>>('/influencer/contract');
  if (!response.data?.data) throw new Error('Sözleşme bulunamadı');
  return response.data.data;
}

export async function acceptInfluencerContract(): Promise<void> {
  await api.post('/influencer/accept-contract');
}

export async function getMyDocuments(): Promise<InfluencerDocumentStatus[]> {
  const response = await api.get<ApiResponse<InfluencerDocumentStatus[]>>('/influencer/my-documents');
  return response.data?.data ?? [];
}

export async function uploadInfluencerDocument(
  documentType: InfluencerDocumentType,
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<void> {
  const formData = new FormData();
  formData.append('documentType', documentType);
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  await api.post('/influencer/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function closeInfluencerAccount(): Promise<void> {
  await api.post('/influencer/close-account');
}

// ─── Link API'leri ────────────────────────────────────────────────────────────

export type InfluencerLinkDto = {
  id: string;
  catalogId: string;
  catalogName: string | null;
  catalogSlug: string | null;
  catalogImage: string | null;
  categoryName: string | null;
  uniqueCode: string;
  referralUrl: string;
  clickCount: number;
  visitorCount: number;
  expiresAt: string;
  secondExpiresAt: string;
  active: boolean;
  createdAt: string | null;
};

export type InfluencerDashboardDto = {
  totalLinks: number;
  totalClicks: number;
  totalVisitors: number;
  totalConversions: number;
};

export async function createInfluencerLink(catalogId: string): Promise<InfluencerLinkDto> {
  const res = await api.post<ApiResponse<InfluencerLinkDto>>(`/influencer/links?catalogId=${catalogId}`);
  if (!res.data?.data) throw new Error('Link oluşturulamadı');
  return res.data.data;
}

export async function getMyLinks(page = 0, size = 100): Promise<InfluencerLinkDto[]> {
  const res = await api.get(`/influencer/links?page=${page}&size=${size}`);
  const raw = res.data?.data ?? res.data;
  if (Array.isArray(raw)) return raw;
  if (raw?.content && Array.isArray(raw.content)) return raw.content;
  return [];
}

export async function deactivateLink(linkId: string): Promise<void> {
  await api.delete(`/influencer/links/${linkId}`);
}

export async function getInfluencerDashboard(): Promise<InfluencerDashboardDto> {
  const res = await api.get<ApiResponse<InfluencerDashboardDto>>('/influencer/dashboard');
  return res.data?.data ?? { totalLinks: 0, totalClicks: 0, totalVisitors: 0, totalConversions: 0 };
}

// ─── Satıcı Referral API'leri ────────────────────────────────────────────────

export type SellerReferralStatus =
  | 'PENDING'
  | 'REGISTERED'
  | 'DOCUMENTS_PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PRODUCTS_ADDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REJECTED';

export type InfluencerSellerReferralDto = {
  id: string;
  uniqueCode: string;
  referralUrl: string;
  status: SellerReferralStatus;
  referredSellerName: string | null;
  sellerRegisteredAt: string | null;
  sellerApprovedAt: string | null;
  minProductsReachedAt: string | null;
  commissionStartsAt: string | null;
  commissionEndsAt: string | null;
  sellerProductCount: number;
  minProductCount: number;
  active: boolean;
  createdAt: string | null;
};

export async function createSellerReferralLink(): Promise<InfluencerSellerReferralDto> {
  const res = await api.post<ApiResponse<InfluencerSellerReferralDto>>('/influencer/seller-referral');
  if (!res.data?.data) throw new Error('Link oluşturulamadı');
  return res.data.data;
}

export async function getMySellerReferrals(): Promise<InfluencerSellerReferralDto[]> {
  const res = await api.get<ApiResponse<InfluencerSellerReferralDto[]>>('/influencer/seller-referrals');
  return res.data?.data ?? [];
}

// ─── Kazanç API'leri ─────────────────────────────────────────────────────────

export type InfluencerCommissionStatus = 'PENDING' | 'RETURN_PERIOD' | 'READY' | 'PAID' | 'CANCELLED';
export type InfluencerCommissionType = 'PRODUCT_REFERRAL' | 'SELLER_REFERRAL';

export type InfluencerCommissionDto = {
  id: string;
  commissionType: InfluencerCommissionType;
  sellerOrderId: string;
  orderNumber: string | null;
  sellerName: string | null;
  productName: string | null;
  saleAmount: number;
  platformCommission: number;
  influencerRate: number;
  influencerEarning: number;
  period: number | null;
  status: InfluencerCommissionStatus;
  deliveredAt: string | null;
  returnDeadline: string | null;
  readyAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
};

export type InfluencerEarningsSummaryDto = {
  totalEarning: number;
  pendingEarning: number;
  readyEarning: number;
  paidEarning: number;
  cancelledEarning: number;
  totalCount: number;
  commissions: InfluencerCommissionDto[];
};

// ─── Sözleşme API ────────────────────────────────────────────────────────────

export type PlatformContractDto = {
  id: string;
  contractType: string;
  title: string;
  content: string;
  version: string;
  status: string;
  publishedAt: string | null;
};

export async function getActiveContract(type: string): Promise<PlatformContractDto | null> {
  try {
    const res = await api.get<ApiResponse<PlatformContractDto>>(`/contracts/active/${type}`);
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}

export async function getEarningsSummary(): Promise<InfluencerEarningsSummaryDto> {
  const res = await api.get<ApiResponse<InfluencerEarningsSummaryDto>>('/influencer/earnings');
  return res.data?.data ?? {
    totalEarning: 0, pendingEarning: 0, readyEarning: 0, paidEarning: 0,
    cancelledEarning: 0, totalCount: 0, commissions: [],
  };
}
