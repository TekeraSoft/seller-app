import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { deactivateDeviceToken } from '@/features/notifications/api';
import { registerCurrentDeviceForPush } from '@/features/notifications/push';
import {
  AuthSession,
  getRolesFromToken,
  getUserIdFromToken,
  getUserTypeFromToken,
  isValidAppToken,
  setAuthSession,
  setAuthSessionListener,
  UserType,
} from '@/lib/api';

const AUTH_SESSION_KEY = 'auth_session';
const PUSH_DEVICE_TOKEN_KEY = 'push_device_token';

type AuthContextValue = {
  session: AuthSession | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userType: UserType;
  userId: string | null;
  roles: string[];
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreToken() {
      try {
        const rawSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);
        if (!rawSession) {
          await setAuthSession(null);
          return;
        }

        const parsed = JSON.parse(rawSession) as Partial<AuthSession>;
        const accessToken = parsed.accessToken?.trim();
        const refreshToken = parsed.refreshToken?.trim();

        if (!accessToken || !refreshToken) {
          await AsyncStorage.removeItem(AUTH_SESSION_KEY);
          await setAuthSession(null);
          return;
        }

        if (!isValidAppToken(accessToken)) {
          await AsyncStorage.removeItem(AUTH_SESSION_KEY);
          await setAuthSession(null);
          return;
        }

        await setAuthSession({ accessToken, refreshToken });
      } catch (error) {
        console.warn('[Auth] Session restore failed, starting with signed-out state.', error);
        await setAuthSession(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreToken().catch((error) => {
      console.warn('[Auth] Unexpected restore error.', error);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    setAuthSessionListener(async (nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextSession));
        return;
      }
      const existingToken = await AsyncStorage.getItem(PUSH_DEVICE_TOKEN_KEY);
      if (existingToken) {
        try {
          await deactivateDeviceToken(existingToken);
        } catch (error) {
          console.warn('[Auth] Push device deactivation failed while clearing session.', error);
        } finally {
          await AsyncStorage.removeItem(PUSH_DEVICE_TOKEN_KEY);
        }
      }
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    });

    return () => {
      setAuthSessionListener(undefined);
    };
  }, []);

  useEffect(() => {
    if (!session?.accessToken) return;

    let cancelled = false;

    async function registerPushDevice() {
      try {
        const token = await registerCurrentDeviceForPush();
        if (!token || cancelled) return;
        await AsyncStorage.setItem(PUSH_DEVICE_TOKEN_KEY, token);
      } catch (error) {
        console.warn('[Auth] Push device registration failed.', error);
      }
    }

    registerPushDevice().catch((error) => {
      console.warn('[Auth] Unexpected push registration error.', error);
    });

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const value = useMemo<AuthContextValue>(() => {
    const accessToken = session?.accessToken ?? null;
    return {
      session,
      token: accessToken,
      isLoading,
      isAuthenticated: Boolean(accessToken),
      userType: accessToken ? getUserTypeFromToken(accessToken) : 'unknown',
      userId: accessToken ? getUserIdFromToken(accessToken) : null,
      roles: accessToken ? getRolesFromToken(accessToken) : [],
      signIn: async (nextSession: AuthSession) => {
        if (!isValidAppToken(nextSession.accessToken)) {
          throw new Error('Geçersiz hesap türü');
        }
        await setAuthSession(nextSession);
      },
      signOut: async () => {
        try {
          const existingToken = await AsyncStorage.getItem(PUSH_DEVICE_TOKEN_KEY);
          if (existingToken) {
            await deactivateDeviceToken(existingToken);
            await AsyncStorage.removeItem(PUSH_DEVICE_TOKEN_KEY);
          }
        } catch (error) {
          console.warn('[Auth] Push device deactivation failed on sign-out.', error);
        }
        await setAuthSession(null);
      },
    };
  }, [isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
