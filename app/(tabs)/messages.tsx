import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';

export default function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <AppText style={styles.text}>Bu sayfa hazırlanıyor.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#4B4B4B',
    fontSize: 15,
  },
});
