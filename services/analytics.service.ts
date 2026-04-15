import { getApp } from '@react-native-firebase/app';
import {
  getAnalytics,
  logEvent as fbLogEvent,
  logScreenView as fbLogScreenView,
  setAnalyticsCollectionEnabled,
  setUserId as fbSetUserId,
  setUserProperty as fbSetUserProperty,
} from '@react-native-firebase/analytics';

const analytics = () => getAnalytics(getApp());

type EventParams = Record<string, string | number | boolean | null | undefined>;

function sanitizeParams(params?: EventParams): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    cleaned[k] = v;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export const analyticsService = {
  async logEvent(name: string, params?: EventParams) {
    try {
      const cleaned = sanitizeParams(params);
      if (__DEV__) console.log('[Analytics] event →', name, cleaned ?? '');
      await fbLogEvent(analytics(), name, cleaned);
    } catch (e) {
      if (__DEV__) console.warn('[Analytics] logEvent failed', name, e);
    }
  },

  async logScreenView(screenName: string, screenClass?: string) {
    try {
      if (__DEV__) console.log('[Analytics] screen →', screenName);
      await fbLogScreenView(analytics(), {
        screen_name: screenName,
        screen_class: screenClass ?? screenName,
      });
    } catch (e) {
      if (__DEV__) console.warn('[Analytics] logScreenView failed', screenName, e);
    }
  },

  async setUserId(userId: string | null) {
    try {
      await fbSetUserId(analytics(), userId);
    } catch (e) {
      if (__DEV__) console.warn('[Analytics] setUserId failed', e);
    }
  },

  async setUserProperty(key: string, value: string | null) {
    try {
      await fbSetUserProperty(analytics(), key, value);
    } catch (e) {
      if (__DEV__) console.warn('[Analytics] setUserProperty failed', key, e);
    }
  },

  async setEnabled(enabled: boolean) {
    try {
      await setAnalyticsCollectionEnabled(analytics(), enabled);
    } catch (e) {
      if (__DEV__) console.warn('[Analytics] setEnabled failed', e);
    }
  },

  logSellerLogin(method: 'email' | 'phone' = 'email') {
    return this.logEvent('login', { method, app: 'seller' });
  },
};
