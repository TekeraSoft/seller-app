import { Router } from 'expo-router';

const INFLUENCER_ROUTES: Record<string, string> = {
  'influencer://dashboard': '/(influencer-tabs)/dashboard',
  'influencer://earnings': '/(influencer-tabs)/earnings',
  'influencer://links': '/(influencer-tabs)/links',
  'influencer://products': '/(influencer-tabs)/products',
  'influencer://profile': '/(influencer-tabs)/inf-profile',
  'influencer://documents': '/influencer/documents',
  'influencer://status': '/influencer/status',
  'influencer://apply': '/influencer/apply',
  '/influencer/dashboard': '/(influencer-tabs)/dashboard',
  '/influencer/earnings': '/(influencer-tabs)/earnings',
  '/influencer/links': '/(influencer-tabs)/links',
  '/influencer/referrals': '/(influencer-tabs)/dashboard',
  '/influencer/apply': '/influencer/apply',
  '/influencer/documents': '/influencer/documents',
  '/influencer/status': '/influencer/status',
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

  // Influencer deep link'leri — herkes için
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

  // Herhangi bir influencer rolü varsa: satıcı deep link'lerine ASLA yönlendirme
  if (options.isInfluencer) {
    router.push('/(influencer-tabs)/dashboard' as any);
    return true;
  }

  return false;
}

/**
 * Varsayılan fallback route.
 * Influencer rolü varsa satıcı sayfasına hiçbir koşulda gitmez.
 */
export function getDefaultRoute(options: { isInfluencer: boolean; isSeller: boolean }): string {
  if (options.isInfluencer) {
    return '/(influencer-tabs)/dashboard';
  }
  return '/orders';
}
