import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing } from '@/constants/theme';

// White rounded card per category — collapsed by default, showing "done/total";
// tap to expand into the task rows (children). Same shape as the old
// athena-app's category cards ("Materials 0/4", "Suppliers 0/5", ...).
export function CategoryCard({ name, done, total, children }: { name: string; done: number; total: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.headerRow}>
        <ThemedText type="smallBold" style={styles.name}>
          {name}
        </ThemedText>
        <ThemedText style={styles.count}>{done}/{total}</ThemedText>
      </Pressable>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: Radius.card, ...Shadow.card, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.three },
  name: { color: '#1C1C1C' },
  count: { color: '#8A8A8A', fontWeight: '600' },
  body: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.two, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
});
