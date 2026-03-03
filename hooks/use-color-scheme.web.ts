import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const DARK_MODE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_DARK_MODE === 'true';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  if (!DARK_MODE_ENABLED) {
    return 'light';
  }

  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
