import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { AnalyticsPeriod } from '@/features/influencer/api';

const P = '#8D73FF';

type Option = { value: AnalyticsPeriod; label: string };

const OPTIONS: Option[] = [
  { value: '7d', label: '7G' },
  { value: '30d', label: '30G' },
  { value: '90d', label: '90G' },
  { value: 'all', label: 'Tümü' },
];

export function PeriodSelector({
  value,
  onChange,
}: {
  value: AnalyticsPeriod;
  onChange: (next: AnalyticsPeriod) => void;
}) {
  return (
    <View style={s.container}>
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[s.chip, active && s.chipActive]}
          >
            <AppText style={[s.chipText, active && s.chipTextActive]}>{opt.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F0EEFF',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: P,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6490',
  },
  chipTextActive: {
    color: P,
    fontWeight: '800',
  },
});
