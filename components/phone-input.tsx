import { StyleSheet, Text, TextInput, View } from 'react-native';

const P = '#8D73FF';

function formatDisplay(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

type Props = {
  value: string;
  onChange: (raw: string) => void;
  borderColor?: string;
};

export function PhoneInput({ value, onChange, borderColor = '#DDD7FF' }: Props) {
  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    onChange(digits);
  }

  return (
    <View style={[s.container, { borderColor }]}>
      <View style={s.prefix}>
        <Text style={s.flag}>🇹🇷</Text>
        <Text style={s.code}>+90</Text>
      </View>
      <View style={s.divider} />
      <TextInput
        style={s.input}
        value={formatDisplay(value)}
        onChangeText={handleChange}
        placeholder="5XX XXX XX XX"
        placeholderTextColor="#B0AACC"
        keyboardType="phone-pad"
        maxLength={13}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#FBFAFF',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    backgroundColor: '#F3F1FF',
    height: '100%',
  },
  flag: { fontSize: 18 },
  code: { fontSize: 14, fontWeight: '700', color: '#3D3660' },
  divider: { width: 1, height: '60%', backgroundColor: '#DDD7FF' },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1C1631',
    letterSpacing: 0.5,
  },
});
