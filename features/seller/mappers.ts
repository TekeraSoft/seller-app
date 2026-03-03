import { API_BASE_URL } from '@/lib/api';

export function toOptionalNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolvePublicAssetUrl(rawPath: string): string {
  const path = rawPath.trim();
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const cdnBase = (process.env.EXPO_PUBLIC_API_CDN_URL ?? '').trim().replace(/\/+$/g, '');
  const apiOrigin = API_BASE_URL.replace(/\/v1\/api\/?$/i, '').replace(/\/+$/g, '');
  const base = cdnBase || apiOrigin;
  const normalized = path.replace(/^\/+/, '');
  const baseHasPublicBucketSuffix = /\/public-bucket$/i.test(base);

  if (normalized.startsWith('public-bucket/')) {
    return `${base}/${normalized}`;
  }
  if (baseHasPublicBucketSuffix) {
    return `${base}/${normalized}`;
  }
  return `${base}/public-bucket/${normalized}`;
}

export const resolveSellerLogoUrl = resolvePublicAssetUrl;
