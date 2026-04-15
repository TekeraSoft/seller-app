import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';

const TOP_PADDING = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight ?? 0) + 10;

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : -120,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isOffline, translateY]);

  return (
    <Animated.View
      pointerEvents={isOffline ? 'auto' : 'none'}
      style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={16} color="#ffffff" />
        <Text style={styles.text}>İnternet bağlantınız yok. Bağlantınızı kontrol edin.</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#DC2626',
    paddingTop: TOP_PADDING,
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
