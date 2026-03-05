import { api } from '@/lib/api';
import { toOptionalNonEmptyString } from '@/features/seller/mappers';
import { CreateTicketResult, TicketingItem, TicketingPage } from '@/features/ticketing/types';

type RawApiResponse = {
  message?: string;
  statusCode?: number;
};

type RawTicketMessage = {
  title?: string;
  userNameSurname?: string;
  content?: string;
  createdAt?: string;
};

type RawTicketing = {
  id?: string;
  sellerSupportId?: string;
  sellerId?: string;
  sellerTitle?: string;
  images?: string[];
  createdAt?: string;
  isOpen?: boolean;
  messages?: RawTicketMessage[];
};

type RawTicketingPage = {
  content?: RawTicketing[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
};

function mapTicket(raw: RawTicketing, index: number): TicketingItem {
  const messages = Array.isArray(raw.messages) ? raw.messages : [];
  return {
    id: toOptionalNonEmptyString(raw.id) ?? `ticket-${index}`,
    sellerSupportId: toOptionalNonEmptyString(raw.sellerSupportId),
    sellerId: toOptionalNonEmptyString(raw.sellerId),
    sellerTitle: toOptionalNonEmptyString(raw.sellerTitle),
    images: Array.isArray(raw.images) ? raw.images.filter((item) => typeof item === 'string' && item.trim().length > 0) : [],
    createdAt: toOptionalNonEmptyString(raw.createdAt),
    isOpen: raw.isOpen !== false,
    messages: messages.map((message) => ({
      title: toOptionalNonEmptyString(message.title) ?? '-',
      userNameSurname: toOptionalNonEmptyString(message.userNameSurname) ?? '-',
      content: toOptionalNonEmptyString(message.content) ?? '-',
      createdAt: toOptionalNonEmptyString(message.createdAt),
    })),
  };
}

export async function fetchSellerTickets(params: { page: number; size: number }): Promise<TicketingPage> {
  const { data } = await api.get<RawTicketingPage>('/ticketing/getAllSellerTicketing', {
    params: {
      page: params.page,
      size: params.size,
    },
  });

  const contentRaw = Array.isArray(data?.content) ? data.content : [];
  const content = contentRaw.map((item, index) => mapTicket(item, index));

  return {
    content,
    number: typeof data?.number === 'number' ? data.number : params.page,
    size: typeof data?.size === 'number' ? data.size : params.size,
    totalElements: typeof data?.totalElements === 'number' ? data.totalElements : content.length,
    totalPages: typeof data?.totalPages === 'number' ? data.totalPages : 0,
    first: data?.first === true,
    last: data?.last === true,
  };
}

export async function fetchTicketById(ticketingId: string): Promise<TicketingItem> {
  const { data } = await api.get<RawTicketing>('/ticketing/getTicketingById', {
    params: { ticketingId },
  });
  return mapTicket(data ?? {}, 0);
}

export async function createSellerTicket(message: string): Promise<CreateTicketResult> {
  const form = new FormData();
  form.append('message', message);

  const { data } = await api.post<RawApiResponse>('/ticketing/createTicket', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return {
    message: toOptionalNonEmptyString(data?.message) ?? 'Destek talebi oluşturuldu.',
    statusCode: typeof data?.statusCode === 'number' ? data.statusCode : null,
  };
}

export async function addMessageToTicketing(params: { ticketingId: string; content: string }): Promise<TicketingItem> {
  const { data } = await api.put<RawTicketing>('/ticketing/addMessageToTicketing', null, {
    params: {
      ticketingId: params.ticketingId,
      content: params.content,
    },
  });

  return mapTicket(data ?? {}, 0);
}
