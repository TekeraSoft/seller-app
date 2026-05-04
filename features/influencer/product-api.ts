import { api } from '@/lib/api';

export type CampaignSummary = {
  id: string;
  name: string;
  campaignType?: string;
  isActive?: boolean | null;
};

export type CampaignUiDto = {
  id: string;
  name: string;
  description: string;
  campaignType: string; // DISCOUNT_OR_PERCENT | FREESHIPPING | COUPON | BUYXGETY
  discountValue: number | null;
  discountType: string; // PERCENT | FIXED_AMOUNT
  campaignImage: string | null;
  isActive: boolean | null;
  productCount: number;
};

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
  campaigns?: CampaignSummary[];
};

/** İndirimli/kampanyalı popüler ürünleri çeker — dashboard "Hemen Paylaş" bölümü için.
 *  Backend CatalogSortOption: PRICE_ASC, PRICE_DESC, RECOMMENDED, POPULAR, NEW_ARRIVALS, DISCOUNT_DESC, TRENDING_SCORE
 *  En yüksek indirim önce → influencer'ı en cazip ürünlere yönlendirir. */
export async function fetchHotPicks(limit = 10): Promise<CatalogListingDto[]> {
  const res = await fetchFilteredCatalogs({
    hasDiscount: true,
    sort: 'DISCOUNT_DESC',
    page: 0,
    size: limit,
  });
  return res?.products?.content ?? [];
}

export type GenderLabel = 'Kadın' | 'Erkek' | 'Unisex' | 'Genel' | string;

export type GenderGroup = {
  label: GenderLabel;
  items: SubCategoryDto[];
};

export type CategoryDto = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  catalogCount: number;
  subCategories: SubCategoryDto[];
  genderGroups?: GenderGroup[] | null;
};

export type SubCategoryDto = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  catalogCount: number;
  children: SubCategoryDto[];
  genderLabel?: GenderLabel | null;
};

export type CatalogFilterResponse = {
  products: {
    content: CatalogListingDto[];
    page: {
      size: number;
      number: number;
      totalElements: number;
      totalPages: number;
    };
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
  campaignId?: string;
  /** Cinsiyet filtresi — backend variantAttributes.key=Cinsiyet&value={gender} olarak gönderilir. */
  gender?: string;
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
  if (params.campaignId) query.set('campaignId', params.campaignId);
  if (params.gender) {
    query.append('variantAttributes.key', 'Cinsiyet');
    query.append('variantAttributes.value', params.gender);
  }
  if (params.sort) query.set('sort', params.sort);
  query.set('page', String(params.page ?? 0));
  query.set('size', String(params.size ?? 20));

  const res = await api.get(`/catalog/filter-catalog?${query.toString()}`);
  return res.data as CatalogFilterResponse;
}

/** Aktif kampanyaları çeker — productCount > 0 ve isActive olanlar. */
export async function fetchActiveCampaigns(limit = 20): Promise<CampaignUiDto[]> {
  const res = await api.get(`/campaign?size=${limit}`);
  const data = res.data;
  const list: CampaignUiDto[] = Array.isArray(data) ? data : (data?.content ?? []);
  return list.filter((c) => c.isActive !== false && c.productCount > 0);
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

export async function fetchCatalogDetail(slug: string, variantCode?: string | null): Promise<CatalogDetailDto> {
  const cacheKey = variantCode ? `${slug}::${variantCode}` : slug;
  const cached = detailCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }
  const url = variantCode
    ? `/catalog/detail/${slug}?variantCode=${encodeURIComponent(variantCode)}`
    : `/catalog/detail/${slug}`;
  const res = await api.get(url);
  const data = res.data as CatalogDetailDto;
  detailCache.set(cacheKey, { data, ts: Date.now() });
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
