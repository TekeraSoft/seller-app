import { Redirect } from 'expo-router';

import { useAuth } from '@/context/auth-context';

export default function RootIndex() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return <Redirect href={isAuthenticated ? '/(tabs)/index' : '/auth'} />;
}
