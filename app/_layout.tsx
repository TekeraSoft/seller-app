import { Ionicons } from '@expo/vector-icons';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, router as expoRouter, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

function IosBackButton() {
  return (
    <Pressable
      onPress={() => {
        if (expoRouter.canGoBack()) {
          expoRouter.back();
        }
      }}
      hitSlop={16}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingRight: 10 }}>
        <Ionicons name="chevron-back" size={26} color="#007AFF" />
        <Text style={{ color: '#007AFF', fontSize: 17, marginLeft: -2 }}>Geri</Text>
      </View>
    </Pressable>
  );
}

const renderIosBackButton = () => <IosBackButton />;

import { VersionGuard } from '@/components/app-update/version-guard';
import { SellerBootstrap } from '@/components/bootstrap/seller-bootstrap';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { ChatProvider } from '@/context/chat-context';
import { routeDeepLink, getDefaultRoute } from '@/features/notifications/deep-link-router';
import { findSellerOrderIdByOrderNo } from '@/features/orders/api';
import { store } from '@/store';

function NotificationRouter() {
  const router = useRouter();
  const { roles } = useAuth();
  const lastHandledIdRef = useRef<string | null>(null);
  const isInfluencer = roles.includes('INFLUENCER') || roles.includes('WITHOUT_APPROVAL_INFLUENCER');
  const isSeller = roles.includes('SELLER');

  useEffect(() => {
    const handleResponse = async (response: Notifications.NotificationResponse) => {
      const requestIdentifier = response.notification.request.identifier;
      if (lastHandledIdRef.current === requestIdentifier) {
        return;
      }
      lastHandledIdRef.current = requestIdentifier;

      const data = response.notification.request.content.data as Record<string, unknown>;
      const deepLinkRaw =
        (typeof data?.deepLink === 'string' && data.deepLink) ||
        (typeof data?.deep_link === 'string' && data.deep_link) ||
        '';

      const roleCtx = { isInfluencer, isSeller };

      // Deep link routing (influencer koruması dahil)
      if (routeDeepLink(router, deepLinkRaw, roleCtx)) return;

      // Influencer rolü olan kullanıcılar satıcı route'larına HİÇBİR koşulda gitmez
      if (isInfluencer) {
        router.push(getDefaultRoute(roleCtx) as any);
        return;
      }

      // Satıcı deep link'leri — sadece satıcı rolü varsa
      const sellerOrderIdRaw =
        (typeof data?.sellerOrderId === 'string' && data.sellerOrderId) ||
        (typeof data?.seller_order_id === 'string' && data.seller_order_id) ||
        (typeof data?.orderId === 'string' && data.orderId) ||
        '';

      if (sellerOrderIdRaw.trim().length > 0) {
        router.push({ pathname: '/order/[id]', params: { id: sellerOrderIdRaw.trim() } });
        return;
      }

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
          // Fallback below.
        }
      }

      // Fallback — role'e göre doğru yere
      router.push(getDefaultRoute(roleCtx) as any);
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
  }, [router, isInfluencer, isSeller]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Provider store={store}>
          <SellerBootstrap />
          <VersionGuard />
          <NotificationRouter />
          <ChatProvider>
            <ThemeProvider value={DefaultTheme}>
              <Stack
                screenOptions={{
                  headerBackTitle: 'Geri',
                  headerLeft: Platform.OS === 'ios' ? renderIosBackButton : undefined,
                }}>
                <Stack.Screen name="index" options={{ headerShown: false, headerLeft: undefined }} />
                <Stack.Screen name="auth" options={{ title: 'Giriş', headerShown: false, headerLeft: undefined }} />
                <Stack.Screen name="register/index" options={{ headerShown: false, headerLeft: undefined }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false, headerLeft: undefined }} />
                <Stack.Screen name="influencer" options={{ headerShown: false, headerLeft: undefined }} />
                <Stack.Screen name="(influencer-tabs)" options={{ headerShown: false, headerLeft: undefined }} />
                <Stack.Screen name="product-detail" options={{ headerShown: false, headerLeft: undefined }} />
                <Stack.Screen name="notifications" options={{ title: 'Bildirimler' }} />
                <Stack.Screen name="settings" options={{ title: 'Ayarlar' }} />
                <Stack.Screen
                  name="seller-profile"
                  options={{ title: 'Satıcı Profili', headerBackVisible: false, headerLeft: undefined }}
                />
                <Stack.Screen name="order/[id]" options={{ title: 'Sipariş Detayı' }} />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: 'modal', title: 'Modal', headerLeft: undefined }}
                />
              </Stack>
              <StatusBar style="dark" />
            </ThemeProvider>
          </ChatProvider>
        </Provider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
