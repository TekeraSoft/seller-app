import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useAuth } from '@/context/auth-context';

export default function RootIndex() {
  const { isAuthenticated, isLoading, roles } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) return null;

  if (!isAuthenticated) return <Redirect href="/auth" />;

  if (roles.includes('CUSTOMER')) return <Redirect href="/influencer" />;

  // Onay bekleyen influencer → status ekranı (DİĞER TÜM ROLLERE ÖNCELİKLİ)
  if (roles.includes('WITHOUT_APPROVAL_INFLUENCER')) {
    return <Redirect href="/influencer/status" />;
  }

  // Onaylı influencer — ikinci bir rolü olsa bile satıcı paneline ASLA gitmesin
  if (roles.includes('INFLUENCER')) {
    return <Redirect href="/(influencer-tabs)/dashboard" />;
  }

  if (
    roles.includes('WITHOUT_APPROVAL_SELLER') &&
    !roles.includes('SELLER') &&
    !roles.includes('SUPER_ADMIN')
  ) {
    return <Redirect href="/seller-profile" />;
  }

  return <Redirect href="/orders" />;
}
