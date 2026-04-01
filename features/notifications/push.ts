import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerDeviceToken } from '@/features/notifications/api';

let notificationHandlerInitialized = false;

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

export async function registerCurrentDeviceForPush(): Promise<string | null> {
  initializePushNotificationHandler();

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

  const devicePushToken = await Notifications.getDevicePushTokenAsync();
  const fcmToken = typeof devicePushToken.data === 'string' ? devicePushToken.data.trim() : '';
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
