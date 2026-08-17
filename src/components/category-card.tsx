import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing } from '@/constants/theme';

// White rounded card per category — collapsed by default, showing "done/total";
// tap to expand into the task rows (children). Same shape as the old
// athena-app's category cards ("Materials 0/4", "Suppliers 0/5", ...).
//
// One person owns each whole category (e.g. "Materials"), so the assignee
// chip sits next to the title and bulk-assigns every task in the category —
// it's a separate tap target from the expand/collapse row.
export function CategoryCard({
  name,
  done,
  total,
  assigneeLabel,
  onAssigneePress,
  children,
}: {
  name: string;
  done: number;
  total: number;
  assigneeLabel?: string;
  onAssigneePress?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => setOpen((v) => !v)} style={styles.titleTap}>
          <ThemedText type="smallBold" style={styles.name}>
            {name}
          </ThemedText>
          <ThemedText style={styles.count}>{done}/{total}</ThemedText>
        </Pressable>
        {onAssigneePress && (
          <Pressable onPress={onAssigneePress} style={styles.assigneeChip}>
            <ThemedText style={styles.assigneeChipText}>{assigneeLabel}</ThemedText>
          </Pressable>
        )}
      </View>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: Radius.card, ...Shadow.card, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.three, gap: Spacing.two },
  titleTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { color: '#1C1C1C' },
  count: { color: '#8A8A8A', fontWeight: '600' },
  assigneeChip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: Radius.pill, backgroundColor: '#E5E5E5' },
  assigneeChipText: { color: '#2B2E33', fontSize: 11 },
  body: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.two, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
});
