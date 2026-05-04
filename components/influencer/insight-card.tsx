import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import type { InsightSeverity } from '@/features/influencer/api';

export type InsightDisplay = {
  severity: InsightSeverity;
  title: string;
  description: string;
  icon: string;
  actionLabel?: string | null;
  actionRoute?: string | null;
};

export const INSIGHT_COLORS: Record<InsightSeverity, { border: string; bg: string; text: string }> = {
  CRITICAL: { border: '#FF6B6B', bg: '#FFE8E8', text: '#FF6B6B' },
  WARNING:  { border: '#F59E0B', bg: '#FEF3C7', text: '#B45309' },
  INFO:     { border: '#45B7D1', bg: '#E8F8FD', text: '#0E7490' },
  SUCCESS:  { border: '#2ECC71', bg: '#E6F8EE', text: '#16A34A' },
};

const SEVERITY_RANK: Record<InsightSeverity, number> = {
  CRITICAL: 4,
  WARNING: 3,
  SUCCESS: 2,
  INFO: 1,
};

export function InsightListCard({
  title = 'Önemli Uyarılar ve Öneriler',
  insights,
  onAction,
  style,
}: {
  title?: string;
  insights: InsightDisplay[];
  onAction?: (route: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  if (insights.length === 0) return null;
  const ordered = [...insights].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const headerColor = INSIGHT_COLORS[ordered[0].severity].border;

  return (
    <View style={[s.card, style]}>
      <View style={s.cardHeader}>
        <View style={[s.cardHeaderIcon, { backgroundColor: headerColor + '18' }]}>
          <Ionicons name="bulb-outline" size={16} color={headerColor} />
        </View>
        <AppText style={s.cardTitle}>{title}</AppText>
        <View style={s.countBadge}>
          <AppText style={s.countText}>{ordered.length}</AppText>
        </View>
      </View>
      <View style={s.itemList}>
        {ordered.map((item, idx) => {
          const palette = INSIGHT_COLORS[item.severity];
          const hasAction = !!(item.actionLabel && item.actionRoute && onAction);
          const Container: any = hasAction ? Pressable : View;
          return (
            <Container
              key={`${item.icon}-${idx}`}
              style={[s.item, idx > 0 && s.itemDivider]}
              onPress={hasAction ? () => onAction!(item.actionRoute!) : undefined}
            >
              <View style={[s.itemIconWrap, { backgroundColor: palette.bg }]}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={16} color={palette.border} />
              </View>
              <View style={s.itemBody}>
                <AppText style={s.itemTitle} numberOfLines={2}>{item.title}</AppText>
                <AppText style={s.itemDesc}>{item.description}</AppText>
                {hasAction && (
                  <View style={s.itemActionRow}>
                    <AppText style={[s.itemActionText, { color: palette.text }]}>{item.actionLabel}</AppText>
                    <Ionicons name="arrow-forward" size={11} color={palette.text} />
                  </View>
                )}
              </View>
              {hasAction && (
                <Ionicons name="chevron-forward" size={16} color="#C8C4E0" style={s.itemChevron} />
              )}
            </Container>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0EEFF',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEFF',
  },
  cardHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1631',
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D73FF',
  },
  itemList: {},
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F5F4FA',
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemBody: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1631',
    lineHeight: 17,
  },
  itemDesc: {
    fontSize: 11.5,
    color: '#6B6883',
    lineHeight: 16,
  },
  itemActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  itemActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  itemChevron: {
    alignSelf: 'center',
  },
});
