import { api } from '@/lib/api';
import { SellerInterruptionResponse } from '@/features/reports/types';

export async function fetchSellerInterruptions(): Promise<SellerInterruptionResponse[]> {
  const { data } = await api.get<unknown>('/seller/getSellerInterruptions');

  if (Array.isArray(data)) {
    return data as SellerInterruptionResponse[];
  }

  if (data && typeof data === 'object') {
    const root = data as Record<string, unknown>;
    if (Array.isArray(root.data)) {
      return root.data as SellerInterruptionResponse[];
    }
    if (Array.isArray(root.content)) {
      return root.content as SellerInterruptionResponse[];
    }
    if (root.interruptionContent != null) {
      return [root as SellerInterruptionResponse];
    }
  }

  return [];
}
