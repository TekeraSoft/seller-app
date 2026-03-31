import { api } from '@/lib/api';

export type CatalogListingDto = {
  catalogId: string;
  name: string;
  slug: string;
  brandName: string | null;
  category: { id: number; name: string; slug: string; image: string | null };
  image: string | null;
  bestPrice: number;
  originalBestPrice: number | null;
  bestDiscountType: string | null;
  totalStock: number;
  sellerCount: number;
  rate: number;
  likeCount: number;
  hasDiscount: boolean;
  bestVariantCode: string | null;
  tags: string[];
};

export type CategoryDto = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  catalogCount: number;
  subCategories: SubCategoryDto[];
};

export type SubCategoryDto = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  catalogCount: number;
  children: SubCategoryDto[];
};

export type CatalogFilterResponse = {
  products: {
    content: CatalogListingDto[];
    totalElements: number;
    totalPages: number;
    number: number;
    last: boolean;
  };
  brandNames: string[];
  categories: CategoryDto[];
};

export type SearchItemDto = {
  id: string;
  name: string;
  slug: string;
  slugId: string;
  categoryName: string | null;
  brandName: string | null;
  imageUrl: string | null;
  itemType: 'CATALOG' | 'SELLER' | 'CATEGORY';
  rate: number | null;
};

export async function fetchFilteredCatalogs(params: {
  keyword?: string;
  categoryId?: number;
  subCategorySlugs?: string[];
  brandNames?: string[];
  minPrice?: number;
  maxPrice?: number;
  hasDiscount?: boolean;
  sort?: string;
  page?: number;
  size?: number;
}): Promise<CatalogFilterResponse> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.categoryId) query.set('categoryIds', String(params.categoryId));
  if (params.brandNames?.length) {
    params.brandNames.forEach((b) => query.append('brandNames', b));
  }
  if (params.subCategorySlugs?.length) {
    params.subCategorySlugs.forEach((s) => query.append('subCategorySlugs', s));
  }
  if (params.minPrice != null) query.set('minPrice', String(params.minPrice));
  if (params.maxPrice != null) query.set('maxPrice', String(params.maxPrice));
  if (params.hasDiscount != null) query.set('hasDiscount', String(params.hasDiscount));
  if (params.sort) query.set('sort', params.sort);
  query.set('page', String(params.page ?? 0));
  query.set('size', String(params.size ?? 20));

  const res = await api.get(`/catalog/filter-catalog?${query.toString()}`);
  return res.data as CatalogFilterResponse;
}

export async function fetchCategories(): Promise<CategoryDto[]> {
  const res = await api.get('/category/get-all-category?size=100&includeEmpty=true');
  const raw = res.data;
  if (Array.isArray(raw)) return raw;
  if (raw?.content && Array.isArray(raw.content)) return raw.content;
  return [];
}

// ─── Detay tipleri ────────────────────────────────────────────────────────────

export type SellerSummaryDto = {
  id: string;
  name: string;
  slug: string;
  city: string;
  rate: number;
  logo: string | null;
};

export type SellerListingDto = {
  id: string;
  seller: SellerSummaryDto;
  price: number;
  discountedPrice: number | null;
  imageUrls: string[];
  stock: number | null;
  variantCode: string | null;
  attributeDetails: { key: string; value: string }[];
};

export type CatalogVariantDto = {
  id: string;
  variantCode: string;
  color: string | null;
  attributes: { key: string; value: string }[];
  imageUrls: string[];
  listings: SellerListingDto[];
  activeListingCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  bestPrice: number | null;
};

export type CatalogDetailDto = {
  catalogId: string;
  name: string;
  slug: string;
  description: string | null;
  brandName: string | null;
  category: { id: number; name: string; slug: string };
  subCategory: { id: number; name: string; slug: string } | null;
  variants: CatalogVariantDto[];
  variantAttributeKeys: string[];
  rate: number;
  commentCount: number;
  tags: string[];
  bestPrice: number;
  originalBestPrice: number | null;
  hasDiscount: boolean;
  sellerCount: number;
};

let detailCache = new Map<string, { data: CatalogDetailDto; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

export async function fetchCatalogDetail(slug: string): Promise<CatalogDetailDto> {
  const cached = detailCache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }
  const res = await api.get(`/catalog/detail/${slug}`);
  const data = res.data as CatalogDetailDto;
  detailCache.set(slug, { data, ts: Date.now() });
  // Cache'i 50 item ile sınırla
  if (detailCache.size > 50) {
    const oldest = detailCache.keys().next().value;
    if (oldest) detailCache.delete(oldest);
  }
  return data;
}

export async function searchCatalogs(input: string): Promise<SearchItemDto[]> {
  if (!input.trim()) return [];
  const res = await api.get<SearchItemDto[]>(
    `/search/searchCatalogOrSellerAndCategory/${encodeURIComponent(input.trim())}`
  );
  return (res.data ?? []).filter((item) => item.itemType === 'CATALOG');
}
