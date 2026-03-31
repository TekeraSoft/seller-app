import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

const P = '#8D73FF';

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  color?: string;
  onPress?: () => void;
  danger?: boolean;
};

function MenuItem({ icon, label, subtitle, color = '#3D3660', onPress, danger }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[s.menuIcon, { backgroundColor: (danger ? '#FF6B6B' : color) + '14' }]}>
        <Ionicons name={icon} size={20} color={danger ? '#FF6B6B' : color} />
      </View>
      <View style={s.menuContent}>
        <AppText style={[s.menuLabel, danger && { color: '#FF6B6B' }]}>{label}</AppText>
        {subtitle ? <AppText style={s.menuSubtitle}>{subtitle}</AppText> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C8C4E0" />
    </Pressable>
  );
}

export default function InfProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profil Kartı */}
      <View style={s.profileCard}>
        <View style={s.avatarWrap}>
          <Ionicons name="person" size={28} color={P} />
        </View>
        <View style={s.profileInfo}>
          <View style={s.statusBadge}>
            <View style={s.statusDot} />
            <AppText style={s.statusText}>Aktif</AppText>
          </View>
        </View>
      </View>

      {/* Hesap */}
      <AppText style={s.sectionTitle}>Hesap</AppText>
      <View style={s.menuGroup}>
        <MenuItem icon="person-outline" label="Kişisel Bilgiler" color={P} />
        <MenuItem icon="card-outline" label="Banka Bilgileri" color="#45B7D1" />
        <MenuItem icon="document-text-outline" label="Sözleşme" color="#4ECDC4" />
      </View>

      {/* Destek */}
      <AppText style={s.sectionTitle}>Destek</AppText>
      <View style={s.menuGroup}>
        <MenuItem icon="help-circle-outline" label="Yardım Merkezi" color="#FF9F43" />
        <MenuItem icon="chatbubble-outline" label="Bize Ulaşın" color={P} />
      </View>

      {/* Çıkış */}
      <View style={[s.menuGroup, { marginTop: 8 }]}>
        <MenuItem
          icon="log-out-outline"
          label="Çıkış Yap"
          danger
          onPress={handleLogout}
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6FB' },
  content: { padding: 16 },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(141,115,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(78,205,196,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ECDC4',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2BA89D',
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A96B5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },

  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0EEFF',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F6FB',
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: { flex: 1 },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1631',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#9A96B5',
    marginTop: 2,
  },
});
