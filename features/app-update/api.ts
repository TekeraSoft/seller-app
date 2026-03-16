import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

export type AppVersionCheckResponse = {
  appId: string;
  platform: string;
  currentVersion: string;
  latestVersion: string;
  minimumSupportedVersion: string;
  updateMode: 'NONE' | 'SOFT' | 'FORCE';
  shouldUpdate: boolean;
  title: string;
  message: string;
  storeUrl: string;
};

export async function fetchSellerAppVersionPolicy(): Promise<AppVersionCheckResponse> {
  const version = Application.nativeApplicationVersion?.trim() || '0.0.0';
  const platform = Platform.OS === 'android' ? 'android' : Platform.OS;

  const response = await api.get<AppVersionCheckResponse>('/app/version-check', {
    params: {
      appId: 'seller-app',
      platform,
      version,
    },
  });

  return response.data;
}
