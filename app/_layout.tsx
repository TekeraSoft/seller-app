import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import 'react-native-reanimated';

import { VersionGuard } from '@/components/app-update/version-guard';
import { SellerBootstrap } from '@/components/bootstrap/seller-bootstrap';
import { AuthProvider } from '@/context/auth-context';
import { findSellerOrderIdByOrderNo } from '@/features/orders/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store';

function NotificationRouter() {
  const router = useRouter();
  const lastHandledIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleResponse = async (response: Notifications.NotificationResponse) => {
      const requestIdentifier = response.notification.request.identifier;
      if (lastHandledIdRef.current === requestIdentifier) {
        return;
      }
      lastHandledIdRef.current = requestIdentifier;

      const data = response.notification.request.content.data as Record<string, unknown>;
      const sellerOrderIdRaw =
        (typeof data?.sellerOrderId === 'string' && data.sellerOrderId) ||
        (typeof data?.seller_order_id === 'string' && data.seller_order_id) ||
        (typeof data?.orderId === 'string' && data.orderId) ||
        '';

      if (sellerOrderIdRaw.trim().length > 0) {
        router.push({ pathname: '/order/[id]', params: { id: sellerOrderIdRaw.trim() } });
        return;
      }

      const deepLinkRaw =
        (typeof data?.deepLink === 'string' && data.deepLink) ||
        (typeof data?.deep_link === 'string' && data.deep_link) ||
        '';

      if (deepLinkRaw.includes('/messages')) {
        router.push('/messages');
        return;
      }

      const matchedSellerOrderId = deepLinkRaw.match(/\/seller\/orders\/([^/]+)/i)?.[1] ?? null;
      if (matchedSellerOrderId) {
        router.push({ pathname: '/order/[id]', params: { id: matchedSellerOrderId } });
        return;
      }

      const orderNoRaw = (typeof data?.orderNo === 'string' && data.orderNo) || '';
      if (orderNoRaw.trim().length > 0) {
        try {
          const sellerOrderId = await findSellerOrderIdByOrderNo(orderNoRaw.trim());
          if (sellerOrderId) {
            router.push({ pathname: '/order/[id]', params: { id: sellerOrderId } });
            return;
          }
        } catch {
          // Fallback tab navigation below.
        }
      }

      router.push('/orders');
    };

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleResponse(response);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          void handleResponse(response);
        }
      })
      .catch(() => undefined);

    return () => {
      subscription.remove();
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <Provider store={store}>
        <SellerBootstrap />
        <VersionGuard />
        <NotificationRouter />
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ title: 'Giriş', headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ title: 'Bildirimler' }} />
            <Stack.Screen name="settings" options={{ title: 'Ayarlar' }} />
            <Stack.Screen name="seller-profile" options={{ title: 'Satıcı Profili' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </Provider>
    </AuthProvider>
  );
}
