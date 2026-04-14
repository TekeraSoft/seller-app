import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerDeviceToken } from '@/features/notifications/api';

let notificationHandlerInitialized = false;
let foregroundListenerAttached = false;

function getDeviceType(): 'ANDROID' | 'IOS' | 'WEB' {
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'ios') return 'IOS';
  return 'WEB';
}

export function initializePushNotificationHandler() {
  if (notificationHandlerInitialized) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  notificationHandlerInitialized = true;
}

async function attachForegroundMessageListener() {
  if (foregroundListenerAttached) return;
  if (Platform.OS === 'web') return;
  try {
    const messagingModule = await import('@react-native-firebase/messaging');
    const messaging = messagingModule.default;
    messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title ?? '';
      const body = remoteMessage.notification?.body ?? '';
      if (!title && !body) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: remoteMessage.data ?? {},
          sound: 'default',
        },
        trigger: null,
      });
    });
    foregroundListenerAttached = true;
  } catch (e) {
    console.warn('[push] onMessage listener eklenemedi', e);
  }
}

async function getFcmTokenForPlatform(): Promise<string | null> {
  if (Platform.OS === 'ios') {
    // iOS: expo-notifications APNs raw token döner — Firebase INVALID_ARGUMENT verir.
    // @react-native-firebase/messaging üzerinden gerçek FCM token al.
    try {
      const messagingModule = await import('@react-native-firebase/messaging');
      const messaging = messagingModule.default;
      // APNs token'ın hazır olmasını bekle (Firebase FCM token'ı onunla türetir).
      await messaging().registerDeviceForRemoteMessages();
      const token = await messaging().getToken();
      return typeof token === 'string' && token.length > 0 ? token : null;
    } catch (e) {
      console.warn('[push] iOS FCM token alınamadı', e);
      return null;
    }
  }

  // Android: expo-notifications zaten FCM token döner.
  const devicePushToken = await Notifications.getDevicePushTokenAsync();
  const fcmToken = typeof devicePushToken.data === 'string' ? devicePushToken.data.trim() : '';
  return fcmToken.length > 0 ? fcmToken : null;
}

export async function registerCurrentDeviceForPush(): Promise<string | null> {
  initializePushNotificationHandler();
  await attachForegroundMessageListener();

  if (Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermissions.status;
  if (finalStatus !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const fcmToken = await getFcmTokenForPlatform();
  if (!fcmToken) {
    return null;
  }

  await registerDeviceToken({
    fcmToken,
    deviceType: getDeviceType(),
    deviceName: Device.modelName ?? Device.deviceName ?? null,
    osVersion: Device.osVersion ?? null,
    appVersion: Application.nativeApplicationVersion ?? Application.applicationId ?? null,
  });

  return fcmToken;
}
