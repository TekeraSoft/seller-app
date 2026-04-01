import { Router } from 'expo-router';

const INFLUENCER_ROUTES: Record<string, string> = {
  'influencer://dashboard': '/(influencer-tabs)/dashboard',
  'influencer://earnings': '/(influencer-tabs)/earnings',
  'influencer://links': '/(influencer-tabs)/links',
  'influencer://products': '/(influencer-tabs)/products',
  'influencer://profile': '/(influencer-tabs)/profile',
};

/**
 * Deep link'i parse edip doğru sayfaya yönlendirir.
 * Influencer kullanıcılarının satıcı sayfalarına erişimini engeller.
 *
 * @returns true ise yönlendirme yapıldı, false ise yapılmadı (caller devam etsin)
 */
export function routeDeepLink(
  router: Router,
  deepLink: string,
  options: { isInfluencer: boolean; isSeller: boolean }
): boolean {
  const link = deepLink.trim();
  if (!link) return false;

  // Influencer deep link'leri — herkes için (ama pratikte sadece influencer'lara gönderilecek)
  const influencerRoute = INFLUENCER_ROUTES[link];
  if (influencerRoute) {
    router.push(influencerRoute as any);
    return true;
  }

  // influencer:// prefix'li ama tabloda olmayan → influencer dashboard'a fallback
  if (link.startsWith('influencer://')) {
    router.push('/(influencer-tabs)/dashboard' as any);
    return true;
  }

  // Influencer kullanıcısı + satıcı olmayan → satıcı deep link'lerine erişim yok
  if (options.isInfluencer && !options.isSeller) {
    router.push('/(influencer-tabs)/dashboard' as any);
    return true;
  }

  return false;
}

/**
 * Influencer kullanıcısı için varsayılan fallback route.
 * Satıcı sayfalarına düşmesini engeller.
 */
export function getDefaultRoute(options: { isInfluencer: boolean; isSeller: boolean }): string {
  if (options.isInfluencer && !options.isSeller) {
    return '/(influencer-tabs)/dashboard';
  }
  return '/orders';
}
