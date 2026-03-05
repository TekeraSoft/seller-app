export type TicketMessage = {
  title: string;
  userNameSurname: string;
  content: string;
  createdAt: string | null;
};

export type TicketingItem = {
  id: string;
  sellerSupportId: string | null;
  sellerId: string | null;
  sellerTitle: string | null;
  images: string[];
  createdAt: string | null;
  isOpen: boolean;
  messages: TicketMessage[];
};

export type TicketingPage = {
  content: TicketingItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type CreateTicketResult = {
  message: string;
  statusCode: number | null;
};
