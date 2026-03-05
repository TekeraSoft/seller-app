import { api } from '@/lib/api';
import { resolvePublicAssetUrl, toOptionalNonEmptyString } from '@/features/seller/mappers';
import {
  ProductWarningStatus,
  SellerCampaignOption,
  SellerProductCatalogGroup,
  SellerProductsQuery,
  SellerProductsResponse,
  SellerProductVariant,
  SellerSubCategoryOption,
} from '@/features/products/types';

type RawProductsResponse = {
  allCount?: number;
  activeCount?: number;
  approvalCount?: number;
  passiveCount?: number;
  campaigns?: Array<{ id?: string; name?: string }>;
  subCategories?: Array<{ id?: number; name?: string; slug?: string }>;
  groupedListings?: {
    content?: RawCatalogGroup[];
    number?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
};

type RawCatalogGroup = {
  catalogId?: string;
  catalogName?: string;
  catalogSlug?: string;
  brandName?: string;
  canonicalCode?: string;
  categoryName?: string;
  subCategoryName?: string;
  coverImage?: string;
  totalVariants?: number;
  activeVariants?: number;
  totalStock?: number;
  variants?: RawVariant[];
};

type RawVariant = {
  listingId?: string;
  variantId?: string;
  variantCode?: string;
  color?: string;
  images?: string[];
  price?: number | string;
  discountedPrice?: number | string;
  stock?: number;
  maxPurchaseStock?: number;
  stockPercent?: number;
  warningStatus?: string;
  active?: boolean;
  approvalStatus?: string;
};

type ApiEnvelope<T> = {
  data?: T;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number(toOptionalNonEmptyString(value) ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function toWarningStatus(value: unknown): ProductWarningStatus | null {
  const normalized = toOptionalNonEmptyString(value)?.toUpperCase();
  if (
    normalized === 'OUT_OF_STOCK' ||
    normalized === 'STOCK_IS_RUNNING_LOW' ||
    normalized === 'AVAILABLE_STOCK'
  ) {
    return normalized;
  }
  return null;
}

function toImageUrl(path: unknown): string {
  const imagePath = toOptionalNonEmptyString(path);
  if (!imagePath) return '';
  return resolvePublicAssetUrl(imagePath);
}

function mapVariant(raw: RawVariant, index: number): SellerProductVariant | null {
  const listingId = toOptionalNonEmptyString(raw.listingId) ?? `listing-${index}`;

  const imagesRaw = Array.isArray(raw.images) ? raw.images : [];
  const images = imagesRaw
    .map((item) => toImageUrl(item))
    .filter((item) => item.length > 0);

  return {
    listingId,
    variantId: toOptionalNonEmptyString(raw.variantId),
    variantCode: toOptionalNonEmptyString(raw.variantCode),
    color: toOptionalNonEmptyString(raw.color),
    images,
    price: toNumber(raw.price),
    discountedPrice: raw.discountedPrice == null ? null : toNumber(raw.discountedPrice),
    stock: typeof raw.stock === 'number' ? raw.stock : 0,
    maxPurchaseStock: typeof raw.maxPurchaseStock === 'number' ? raw.maxPurchaseStock : 0,
    stockPercent: typeof raw.stockPercent === 'number' ? raw.stockPercent : 0,
    warningStatus: toWarningStatus(raw.warningStatus),
    active: raw.active !== false,
    approvalStatus: toOptionalNonEmptyString(raw.approvalStatus),
  };
}

function mapCatalogGroup(raw: RawCatalogGroup, index: number): SellerProductCatalogGroup {
  const variantsRaw = Array.isArray(raw.variants) ? raw.variants : [];
  const variants = variantsRaw
    .map((variant, variantIndex) => mapVariant(variant, variantIndex))
    .filter((variant): variant is SellerProductVariant => variant !== null);

  const cover = toImageUrl(raw.coverImage);
  const fallbackImage = variants.find((item) => item.images.length > 0)?.images[0] ?? null;

  return {
    catalogId: toOptionalNonEmptyString(raw.catalogId) ?? `catalog-${index}`,
    catalogName: toOptionalNonEmptyString(raw.catalogName) ?? 'Ürün',
    catalogSlug: toOptionalNonEmptyString(raw.catalogSlug),
    brandName: toOptionalNonEmptyString(raw.brandName),
    canonicalCode: toOptionalNonEmptyString(raw.canonicalCode),
    categoryName: toOptionalNonEmptyString(raw.categoryName),
    subCategoryName: toOptionalNonEmptyString(raw.subCategoryName),
    coverImage: cover || fallbackImage,
    totalVariants: typeof raw.totalVariants === 'number' ? raw.totalVariants : variants.length,
    activeVariants: typeof raw.activeVariants === 'number' ? raw.activeVariants : variants.filter((item) => item.active).length,
    totalStock: typeof raw.totalStock === 'number' ? raw.totalStock : variants.reduce((acc, item) => acc + item.stock, 0),
    variants,
  };
}

function mapCampaign(raw: { id?: string; name?: string }, index: number): SellerCampaignOption | null {
  const id = toOptionalNonEmptyString(raw.id) ?? `campaign-${index}`;
  const name = toOptionalNonEmptyString(raw.name);
  if (!name) return null;
  return { id, name };
}

function mapSubCategory(raw: { id?: number; name?: string; slug?: string }): SellerSubCategoryOption | null {
  const name = toOptionalNonEmptyString(raw.name);
  const slug = toOptionalNonEmptyString(raw.slug);
  if (!name || !slug) return null;
  return {
    id: typeof raw.id === 'number' ? raw.id : null,
    name,
    slug,
  };
}

function mapProductsResponse(payload: RawProductsResponse, requestedPage: number, requestedSize: number): SellerProductsResponse {
  const contentRaw = Array.isArray(payload.groupedListings?.content) ? payload.groupedListings?.content : [];
  const content = contentRaw.map((item, index) => mapCatalogGroup(item, index));

  const totalPages = typeof payload.groupedListings?.totalPages === 'number' ? payload.groupedListings.totalPages : 0;
  const pageNumber = typeof payload.groupedListings?.number === 'number' ? payload.groupedListings.number : requestedPage;
  const size = typeof payload.groupedListings?.size === 'number' ? payload.groupedListings.size : requestedSize;

  const campaignsRaw = Array.isArray(payload.campaigns) ? payload.campaigns : [];
  const campaigns = campaignsRaw
    .map((item, index) => mapCampaign(item, index))
    .filter((item): item is SellerCampaignOption => item !== null);

  const subCategoriesRaw = Array.isArray(payload.subCategories) ? payload.subCategories : [];
  const subCategories = subCategoriesRaw
    .map((item) => mapSubCategory(item))
    .filter((item): item is SellerSubCategoryOption => item !== null);

  return {
    allCount: typeof payload.allCount === 'number' ? payload.allCount : 0,
    activeCount: typeof payload.activeCount === 'number' ? payload.activeCount : 0,
    approvalCount: typeof payload.approvalCount === 'number' ? payload.approvalCount : 0,
    passiveCount: typeof payload.passiveCount === 'number' ? payload.passiveCount : 0,
    campaigns,
    subCategories,
    groupedListings: {
      content,
      page: pageNumber,
      size,
      totalElements:
        typeof payload.groupedListings?.totalElements === 'number'
          ? payload.groupedListings.totalElements
          : content.length,
      totalPages,
      hasMore: totalPages > 0 ? pageNumber + 1 < totalPages : content.length >= size,
    },
  };
}

export async function fetchSellerCatalogs(params: SellerProductsQuery): Promise<SellerProductsResponse> {
  const { data } = await api.post<RawProductsResponse | ApiEnvelope<RawProductsResponse>>(
    '/seller/catalogs',
    params.filters ?? {},
    {
      params: {
        page: params.page,
        size: params.size,
      },
    }
  );

  const payload =
    data && typeof data === 'object' && 'groupedListings' in data
      ? (data as RawProductsResponse)
      : ((data as ApiEnvelope<RawProductsResponse> | undefined)?.data ?? {});

  return mapProductsResponse(payload, params.page, params.size);
}
