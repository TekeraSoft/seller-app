import { Stack } from 'expo-router';

export default function InfluencerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#F7F5FF' },
        headerTintColor: '#8D73FF',
        headerTitleStyle: { fontWeight: '700', color: '#1C1631' },
        headerShadowVisible: false,
      }}
    />
  );
}
