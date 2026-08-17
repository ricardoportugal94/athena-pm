import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';

// Points per phase mirror the old athena-app's PHASE_CONFIGS (30/82/78 = 190
// total) — kept for the same "energy", spread evenly across each phase's tasks.
export const PHASE_POINTS: Record<number, number> = { 1: 30, 2: 82, 3: 78 };

export function computePoints(tasksByPhase: Record<number, { done: number; total: number }>) {
  return Object.entries(tasksByPhase).reduce((sum, [phase, { done, total }]) => {
    if (!total) return sum;
    return sum + Math.round((done / total) * PHASE_POINTS[Number(phase)]);
  }, 0);
}

export function ProgressCard({ percent, points, label, pointsLabel }: { percent: number; points: number; label: string; pointsLabel: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <ThemedText type="subtitle" style={styles.percent}>
          {percent}% {label}
        </ThemedText>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
      </View>
      <View style={styles.badge}>
        <ThemedText style={styles.star}>★</ThemedText>
        <ThemedText style={styles.points}>{points}</ThemedText>
        <ThemedText style={styles.pointsLabel}>{pointsLabel}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    ...Shadow.card,
  },
  left: { flex: 1, gap: Spacing.two },
  percent: { color: Brand.ink, fontSize: 20 },
  track: { height: 6, backgroundColor: '#EAEAEA', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Brand.accent, borderRadius: 3 },
  badge: { backgroundColor: Brand.accent, borderRadius: Radius.card * 0.7, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, alignItems: 'center', minWidth: 68 },
  star: { color: '#B8860B', fontSize: 18, lineHeight: 20 },
  points: { color: Brand.ink, fontWeight: '900', fontSize: 20, lineHeight: 22 },
  pointsLabel: { color: '#4A5A00', fontSize: 10, fontWeight: '700' },
});
