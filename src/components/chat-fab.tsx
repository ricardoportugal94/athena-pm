import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Shadow } from '@/constants/theme';

// Floating round chat entry point, fixed to the bottom-right corner over the
// rest of the screen — the WhatsApp-bubble look the team asked for, instead
// of one more pill crammed into the header row.
export function ChatFab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.fab}>
      <ThemedText style={styles.icon}>💬</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  icon: { fontSize: 24 },
});
