import { useColorScheme as useRNColorScheme } from 'react-native';

const DARK_MODE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_DARK_MODE === 'true';

export function useColorScheme() {
  const colorScheme = useRNColorScheme();

  if (!DARK_MODE_ENABLED) {
    return 'light';
  }

  return colorScheme ?? 'light';
}
