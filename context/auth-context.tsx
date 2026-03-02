import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import {
  AuthSession,
  isSellerAccessToken,
  SELLER_ONLY_ERROR_MESSAGE,
  setAuthSession,
  setAuthSessionListener,
} from '@/lib/api';

const AUTH_SESSION_KEY = 'auth_session';

type AuthContextValue = {
  session: AuthSession | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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

        if (!isSellerAccessToken(accessToken)) {
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
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    });

    return () => {
      setAuthSessionListener(undefined);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      token: session?.accessToken ?? null,
      isLoading,
      isAuthenticated: Boolean(session?.accessToken),
      signIn: async (nextSession: AuthSession) => {
        if (!isSellerAccessToken(nextSession.accessToken)) {
          throw new Error(SELLER_ONLY_ERROR_MESSAGE);
        }
        await setAuthSession(nextSession);
      },
      signOut: async () => {
        await setAuthSession(null);
      },
    }),
    [isLoading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
