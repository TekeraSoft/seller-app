import { Redirect } from 'expo-router';

import { useAuth } from '@/context/auth-context';

export default function RootIndex() {
  const { isAuthenticated, isLoading, roles } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) return <Redirect href="/auth" />;

  if (roles.includes('CUSTOMER')) return <Redirect href="/influencer" />;

  if (
    roles.includes('WITHOUT_APPROVAL_SELLER') &&
    !roles.includes('SELLER') &&
    !roles.includes('SUPER_ADMIN')
  ) {
    return <Redirect href="/seller-profile" />;
  }

  return <Redirect href="/orders" />;
}
