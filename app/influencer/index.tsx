import { getMyApplication } from '@/features/influencer/api';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function InfluencerGate() {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    getMyApplication()
      .then(() => setRedirectTo('/influencer/status'))
      .catch(() => setRedirectTo('/influencer/apply'));
  }, []);

  if (redirectTo) return <Redirect href={redirectTo as any} />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6FB' }}>
      <ActivityIndicator size="large" color="#8D73FF" />
    </View>
  );
}
