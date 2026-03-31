import { getMyApplication } from '@/features/influencer/api';
import { useAuth } from '@/context/auth-context';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function InfluencerGate() {
  const { roles } = useAuth();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    // INFLUENCER rolü varsa direkt panele yönlendir
    if (roles.includes('INFLUENCER')) {
      setRedirectTo('/(influencer-tabs)/dashboard');
      return;
    }

    getMyApplication()
      .then(() => setRedirectTo('/influencer/status'))
      .catch(() => setRedirectTo('/influencer/apply'));
  }, [roles]);

  if (redirectTo) return <Redirect href={redirectTo as any} />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6FB' }}>
      <ActivityIndicator size="large" color="#8D73FF" />
    </View>
  );
}
