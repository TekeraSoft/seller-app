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
