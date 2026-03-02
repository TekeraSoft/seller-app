import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.userBlock}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>BW</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Good Morning</Text>
              <Text style={styles.userName}>Bruce Wayne</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton}>
              <Ionicons name="search" size={16} color="#1E1E1E" />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <Ionicons name="settings-outline" size={16} color="#1E1E1E" />
            </Pressable>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard title="Total Sales" value="3,700" hint="Last week: 3,457" delta="↑ 7%" />
          <MetricCard title="Total Customers" value="2,400" hint="Last week: 2,243" delta="↑ 7%" />
          <MetricCard title="Total Revenue" value="$7,600" hint="Last week: 8,000" delta="↓ 5%" negative />
          <MetricCard title="Total Sales" value="268" hint="Last week: 233" delta="↑ 15%" />
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHead}>
            <Text style={styles.overviewTitle}>Sales Overview</Text>
            <Pressable style={styles.arrowButton}>
              <Ionicons name="arrow-forward" size={14} color="#333" />
            </Pressable>
          </View>

          <View style={styles.chartWrap}>
            <View style={styles.simpleScoreWrap}>
              <Text style={styles.simpleScorePercent}>75%</Text>
              <Text style={styles.simpleScoreSub}>Sales Growth</Text>
            </View>

            <View style={styles.goalRow}>
              <Ionicons name="information-circle-outline" size={12} color="#B1B1B8" />
              <Text style={styles.goalText}>You're 12% away from your monthly sales goal!</Text>
            </View>
          </View>

          <View style={styles.legendRow}>
            <Legend color="#5E4BCE" label="Net Profit" />
            <Legend color="#8D73FF" label="Gross Revenue" />
            <Legend color="#DCDCE2" label="Target" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  title,
  value,
  hint,
  delta,
  negative,
}: {
  title: string;
  value: string;
  hint: string;
  delta: string;
  negative?: boolean;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHead}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Ionicons name="information-circle-outline" size={12} color="#C1C1C7" />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <View style={styles.metricFoot}>
        <Text style={styles.metricHint}>{hint}</Text>
        <Text style={[styles.metricDelta, negative && styles.metricDeltaNegative]}>{delta}</Text>
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EFEFF2',
  },
  screen: {
    flex: 1,
    backgroundColor: '#EFEFF2',
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 94,
    gap: 10,
  },
  headerRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0C4A8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F1F1F',
    fontFamily: Fonts.sans,
  },
  greeting: {
    fontSize: 10,
    color: '#9A9AA3',
    fontFamily: Fonts.sans,
  },
  userName: {
    fontSize: 14,
    color: '#151515',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECECEF',
    padding: 10,
    gap: 4,
  },
  metricHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricTitle: {
    fontSize: 10,
    color: '#52525A',
    fontFamily: Fonts.sans,
  },
  metricValue: {
    fontSize: 38,
    lineHeight: 40,
    color: '#151515',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  metricFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricHint: {
    fontSize: 9,
    color: '#A1A1AA',
    fontFamily: Fonts.sans,
  },
  metricDelta: {
    fontSize: 10,
    color: '#7F67FF',
    fontFamily: Fonts.mono,
  },
  metricDeltaNegative: {
    color: '#FF5E78',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECECEF',
    padding: 12,
    gap: 8,
  },
  overviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewTitle: {
    fontSize: 14,
    color: '#121212',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  arrowButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F6F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrap: {
    alignItems: 'center',
  },
  simpleScoreWrap: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  simpleScorePercent: {
    fontSize: 48,
    lineHeight: 50,
    color: '#1A1A1A',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  simpleScoreSub: {
    marginTop: -2,
    fontSize: 13,
    color: '#8A8A95',
    fontFamily: Fonts.sans,
  },
  goalRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalText: {
    fontSize: 10,
    color: '#A2A2AB',
    fontFamily: Fonts.sans,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#5B5B63',
    fontFamily: Fonts.sans,
  },
});
