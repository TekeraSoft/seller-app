export type SellerInterruptionResponse = {
  calculateDate?: {
    month?: string;
    year?: string;
  };
  interruptionContent?: SellerInterruptionItemResponse[];
  sellerFee?: number | string;
  interruptionAmount?: number | string;
  total?: number | string;
};

export type SellerInterruptionItemResponse = {
  orderNumber?: string;
  productName?: string;
  modelCode?: string;
  productImageUrl?: string;
  lineTotal?: number | string;
  platformUsageFee?: {
    description?: string;
    value?: number | string;
  };
  platformCommission?: {
    description?: string;
    value?: number | string;
  };
  commissionRate?: number | string | null;
  sellerProfit?: number | string;
};

export type SellerInterruptionPeriod = {
  id: string;
  month: string;
  year: string;
  sellerFee: number;
  interruptionAmount: number;
  total: number;
  items: SellerInterruptionItem[];
};

export type SellerInterruptionItem = {
  id: string;
  orderNumber: string;
  productName: string;
  modelCode: string;
  productImageUrl: string | null;
  lineTotal: number;
  usageFeeLabel: string;
  usageFeeValue: number;
  commissionLabel: string;
  commissionValue: number;
  commissionRate: number | null;
  sellerProfit: number;
};

export type ReportsState = {
  periods: SellerInterruptionPeriod[];
  isLoading: boolean;
  error: string | null;
};

export const initialReportsState: ReportsState = {
  periods: [],
  isLoading: false,
  error: null,
};

