import { Stack } from 'expo-router';

export default function ProductDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'fullScreenModal',
        gestureEnabled: false,
      }}
    />
  );
}
