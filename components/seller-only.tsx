import { Redirect } from 'expo-router';
import { PropsWithChildren } from 'react';

import { useAuth } from '@/context/auth-context';

/**
 * Satıcıya özel route'ları sarmalar.
 * INFLUENCER veya WITHOUT_APPROVAL_INFLUENCER rolü olan kullanıcılar
 * hiçbir koşulda içeriye giremez — influencer paneline yönlenir.
 */
export function SellerOnly({ children }: PropsWithChildren) {
  const { isLoading, roles } = useAuth();
  if (isLoading) return null;
  if (roles.includes('WITHOUT_APPROVAL_INFLUENCER')) {
    return <Redirect href="/influencer/status" />;
  }
  if (roles.includes('INFLUENCER')) {
    return <Redirect href="/(influencer-tabs)/dashboard" />;
  }
  return <>{children}</>;
}
