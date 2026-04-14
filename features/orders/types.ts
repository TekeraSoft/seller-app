export type SellerOrdersFilterRequest = {
  customerName?: string;
  orderNo?: string;
  sellerOrderStatus?: string;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
};

export type SellerOrderFilterResponse = {
  orders?: SellerOrderResponse[];
  page?: {
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
  counters?: {
    total?: number;
    pending?: number;
    accepted?: number;
    shipped?: number;
    delivered?: number;
    cancelled?: number;
    inTransit?: number;
    returnedCount?: number;
    partialReturnOrders?: number;
    partialReturnItemCount?: number;
  };
};

export type PageResponse<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
};

export type SellerReturnLine = {
  quantity?: number;
  refundAmount?: number | string;
  basketItem?: {
    id?: string;
    name?: string;
    image?: string | null;
  };
};

export type SellerReturn = {
  id?: string;
  lines?: SellerReturnLine[];
  reason?: string | null;
  images?: string[] | null;
  status?: string | null;
  returnShipmentStatus?: string | null;
};

export type SellerOrderResponse = {
  id?: string;
  orderNo?: string;
  buyer?: {
    name?: string;
    surname?: string;
    gsmNumber?: string;
  };
  basketItems?: Array<{
    id?: string;
    name?: string;
    productName?: string;
    image?: string;
    quantity?: number;
    unitPrice?: number | string;
    discountedUnitPrice?: number | string;
    lineTotal?: number | string;
    variantColor?: string | null;
    variantCode?: string | null;
    variantAttributes?: Array<{ key?: string | null; value?: string | null }> | null;
  }>;
  shippingAddress?: SellerOrderAddressResponse;
  billingAddress?: SellerOrderAddressResponse | null;
  createdAt?: string | null;
  totalPrice?: number | string;
  shippingPrice?: number | string;
  payableTotalPrice?: number | string;
  paymentStatus?: string | null;
  sellerOrderStatus?: string | null;
  displayStatus?: string | null;
  rejectedReason?: string | null;
};

export type SellerOrderAddressResponse = {
  city?: string;
  street?: string;
  postalCode?: string | null;
  buildNo?: string;
  doorNumber?: string;
  gsmNumber?: string;
  detailAddress?: string;
  country?: string | null;
};

export type SellerOrderLineItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image: string | null;
  variantCode: string | null;
  variantAttributes: Array<{ key: string; value: string }>;
};

export type SellerOrderAddress = {
  city: string;
  street: string;
  postalCode: string | null;
  buildNo: string;
  doorNumber: string;
  gsmNumber: string;
  detailAddress: string;
  country: string | null;
};

export type SellerOrder = {
  id: string;
  orderNo: string;
  buyerName: string;
  buyerPhone: string;
  createdAt: string | null;
  totalPrice: number;
  shippingPrice: number;
  payableTotalPrice: number;
  paymentStatus: string | null;
  sellerOrderStatus: string | null;
  displayStatus: string | null;
  rejectedReason: string | null;
  itemCount: number;
  firstImage: string | null;
  items: SellerOrderLineItem[];
  shippingAddress: SellerOrderAddress | null;
  billingAddress: SellerOrderAddress | null;
};

export type OrdersState = {
  items: SellerOrder[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;
  page: number;
  size: number;
  hasMore: boolean;
  totalElements: number;
  filters: {
    searchText: string;
    sellerOrderStatus: string | null;
  };
  counters: {
    total: number;
    pending: number;
    accepted: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
};

export const initialOrdersState: OrdersState = {
  items: [],
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  error: null,
  page: 0,
  size: 20,
  hasMore: true,
  totalElements: 0,
  filters: {
    searchText: '',
    sellerOrderStatus: null,
  },
  counters: {
    total: 0,
    pending: 0,
    accepted: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  },
};
