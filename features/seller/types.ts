export type SellerInfoResponse = {
  id?: string;
  name?: string;
  logo?: string;
};

export type SellerReportResponse = {
  totalOrders?: number;
  totalProducts?: number;
  followers?: Array<unknown>;
  currentMonthSales?: number | string;
  monthlyTarget?: number | string;
  progressPercent?: number | string;
  recentOrders?: {
    content?: Array<{
      id?: string;
      orderNumber?: string | null;
      buyerFirstName?: string;
      buyerLastName?: string;
      totalPrice?: number | string;
      createdAt?: string | null;
      productImage?: string;
    }>;
  };
};

export type SellerProfile = {
  id: string | null;
  basicId: string | null;
  name: string;
  logo: string | null;
};

export type SellerReport = {
  totalOrders: number;
  totalProducts: number;
  followerCount: number;
  currentMonthSales: number;
  monthlyTarget: number;
  progressPercent: number;
  recentOrders: SellerRecentOrderItem[];
};

export type SellerRecentOrderItem = {
  id: string;
  orderNumber: string;
  buyerFullName: string;
  totalPrice: number;
  createdAt: string | null;
  productImage: string | null;
};

export type SellerState = {
  profile: SellerProfile;
  report: SellerReport;
  isLoading: boolean;
  error: string | null;
};

export const DEFAULT_PROFILE: SellerProfile = {
  id: null,
  basicId: null,
  name: 'Satıcı',
  logo: null,
};

export const DEFAULT_REPORT: SellerReport = {
  totalOrders: 0,
  totalProducts: 0,
  followerCount: 0,
  currentMonthSales: 0,
  monthlyTarget: 0,
  progressPercent: 0,
  recentOrders: [],
};

export const initialSellerState: SellerState = {
  profile: DEFAULT_PROFILE,
  report: DEFAULT_REPORT,
  isLoading: false,
  error: null,
};

