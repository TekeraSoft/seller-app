import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Buffer } from 'buffer';

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
};

type SessionListener = (session: AuthSession | null) => void | Promise<void>;
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };
type TokenClaims = {
  sellerId?: unknown;
  basicId?: unknown;
  basic_id?: unknown;
  basicid?: unknown;
  nameSurname?: unknown;
  namesurname?: unknown;
  name_surname?: unknown;
  roles?: unknown;
};

export type SellerTokenIdentity = {
  sellerId: string | null;
  basicId: string | null;
  nameSurname: string | null;
};

const SELLER_ROLES = new Set([
  'SELLER',
  'WITHOUT_APPROVAL_SELLER',
  'SELLER_EMPLOYEE',
  'SELLER_MARKETING_MANAGER',
  'SELLER_FINANCE_MANAGER',
]);

const INFLUENCER_ROLES = new Set([
  'CUSTOMER',
  'WITHOUT_APPROVAL_INFLUENCER',
  'INFLUENCER',
]);

export const SELLER_ONLY_ERROR_MESSAGE = 'Bu uygulamaya sadece satıcı hesabı ile giriş yapılabilir.';

export type UserType = 'seller' | 'influencer' | 'unknown';

let authSession: AuthSession | null = null;
let sessionListener: SessionListener | undefined;
let refreshPromise: Promise<string | null> | null = null;

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.1.181:8080/v1/api';
export const API_BASE_URL = baseURL;

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function setAuthSession(session: AuthSession | null) {
  authSession = session;
  if (sessionListener) {
    await sessionListener(session);
  }
}

export function setAuthSessionListener(listener?: SessionListener) {
  sessionListener = listener;
}

function parseJwtClaims(token: string): TokenClaims | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed as TokenClaims;
  } catch {
    return null;
  }
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getSellerIdentityFromAccessToken(accessToken: string): SellerTokenIdentity {
  const claims = parseJwtClaims(accessToken);
  if (!claims) {
    return { sellerId: null, basicId: null, nameSurname: null };
  }

  const sellerId = toOptionalString(claims.sellerId);
  const basicId =
    toOptionalString(claims.basicId) ??
    toOptionalString(claims.basic_id) ??
    toOptionalString(claims.basicid);
  const nameSurname =
    toOptionalString(claims.nameSurname) ??
    toOptionalString(claims.namesurname) ??
    toOptionalString(claims.name_surname);

  return { sellerId, basicId, nameSurname };
}

export function isSellerAccessToken(accessToken: string): boolean {
  const claims = parseJwtClaims(accessToken);
  if (!claims) return false;
  if (claims.sellerId != null) return true;
  const rolesRaw = claims.roles;
  if (!Array.isArray(rolesRaw)) return false;
  return rolesRaw.some((role) => typeof role === 'string' && SELLER_ROLES.has(role));
}

export function isInfluencerAccessToken(accessToken: string): boolean {
  const claims = parseJwtClaims(accessToken);
  if (!claims) return false;
  const rolesRaw = claims.roles;
  if (!Array.isArray(rolesRaw)) return false;
  return rolesRaw.some((role) => typeof role === 'string' && INFLUENCER_ROLES.has(role));
}

export function isValidAppToken(accessToken: string): boolean {
  return isSellerAccessToken(accessToken) || isInfluencerAccessToken(accessToken);
}

export function getUserTypeFromToken(accessToken: string): UserType {
  if (isSellerAccessToken(accessToken)) return 'seller';
  if (isInfluencerAccessToken(accessToken)) return 'influencer';
  return 'unknown';
}

export function getRolesFromToken(accessToken: string): string[] {
  const claims = parseJwtClaims(accessToken);
  if (!claims) return [];
  const rolesRaw = claims.roles;
  if (!Array.isArray(rolesRaw)) return [];
  return rolesRaw.filter((r): r is string => typeof r === 'string');
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = authSession?.refreshToken;
  if (!refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<AuthSession>('/auth/refresh', { refreshToken })
      .then(async (response) => {
        const nextAccessToken = response.data?.accessToken?.trim();
        const nextRefreshToken = response.data?.refreshToken?.trim();
        if (!nextAccessToken || !nextRefreshToken) {
          throw new Error('Refresh response does not include accessToken and refreshToken');
        }
        if (!isSellerAccessToken(nextAccessToken)) {
          throw new Error(SELLER_ONLY_ERROR_MESSAGE);
        }
        await setAuthSession({ accessToken: nextAccessToken, refreshToken: nextRefreshToken });
        return nextAccessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (!authSession?.accessToken) {
    return config;
  }
  config.headers = config.headers ?? {};
  (config.headers as Record<string, string>).Authorization = `Bearer ${authSession.accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config as RetryableRequestConfig | undefined;

    if (!config || status !== 401 || config._retry || config.url?.includes('/auth/refresh')) {
      throw error;
    }

    config._retry = true;

    try {
      const nextAccessToken = await refreshAccessToken();
      if (!nextAccessToken) {
        await setAuthSession(null);
        throw error;
      }
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${nextAccessToken}`;
      return api.request(config);
    } catch {
      await setAuthSession(null);
      throw error;
    }
  }
);
