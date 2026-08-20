import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Shadow } from '@/constants/theme';

export type HeaderAction = { key: string; label: string; onPress: () => void };

// Modern grouped action bar for HeroPanel's `right` slot — a single dark pill
// with divider lines between items, replacing the old separate outline
// buttons (border only, no fill) that read as flat/dated on the lime hero.
export function HeaderActions({ items }: { items: HeaderAction[] }) {
  return (
    <View style={styles.shadowWrap}>
      <View style={styles.bar}>
        {items.map((item, i) => (
          <View key={item.key} style={styles.itemRow}>
            {i > 0 && <View style={styles.divider} />}
            <Pressable onPress={item.onPress} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
              <ThemedText style={styles.buttonText}>{item.label}</ThemedText>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Shadow lives on an outer, non-clipping wrapper — the inner view needs
  // overflow:hidden for the pill shape + dividers, which would otherwise
  // clip the shadow itself on web.
  shadowWrap: { borderRadius: Radius.pill, ...Shadow.card },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.ink,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.18)' },
  button: { paddingVertical: 9, paddingHorizontal: 14 },
  buttonPressed: { opacity: 0.6 },
  buttonText: { color: Brand.accent, fontWeight: '700', fontSize: 13, letterSpacing: 0.2 },
});
