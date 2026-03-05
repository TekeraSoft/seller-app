export type ProductWarningStatus = 'OUT_OF_STOCK' | 'STOCK_IS_RUNNING_LOW' | 'AVAILABLE_STOCK';

export type SellerProductsFilterRequest = {
  subCategoryName?: string;
  brandName?: string;
  searchParam?: string;
  canonicalCode?: string;
  sku?: string;
  barcode?: string;
  campaignId?: string;
  activeStatus?: boolean;
  warningStatus?: ProductWarningStatus;
};

export type SellerProductsQuery = {
  page: number;
  size: number;
  filters?: SellerProductsFilterRequest;
};

export type SellerCampaignOption = {
  id: string;
  name: string;
};

export type SellerSubCategoryOption = {
  id: number | null;
  name: string;
  slug: string;
};

export type SellerProductVariant = {
  listingId: string;
  variantId: string | null;
  variantCode: string | null;
  color: string | null;
  images: string[];
  price: number;
  discountedPrice: number | null;
  stock: number;
  maxPurchaseStock: number;
  stockPercent: number;
  warningStatus: ProductWarningStatus | null;
  active: boolean;
  approvalStatus: string | null;
};

export type SellerProductCatalogGroup = {
  catalogId: string;
  catalogName: string;
  catalogSlug: string | null;
  brandName: string | null;
  canonicalCode: string | null;
  categoryName: string | null;
  subCategoryName: string | null;
  coverImage: string | null;
  totalVariants: number;
  activeVariants: number;
  totalStock: number;
  variants: SellerProductVariant[];
};

export type SellerProductsPage = {
  content: SellerProductCatalogGroup[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
};

export type SellerProductsResponse = {
  allCount: number;
  activeCount: number;
  approvalCount: number;
  passiveCount: number;
  campaigns: SellerCampaignOption[];
  subCategories: SellerSubCategoryOption[];
  groupedListings: SellerProductsPage;
};
