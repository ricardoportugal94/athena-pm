import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Shadow } from '@/constants/theme';

// Floating round chat entry point, fixed to the bottom-right corner over the
// rest of the screen — the WhatsApp-bubble look the team asked for, instead
// of one more pill crammed into the header row. `hint` renders a small,
// subtle callout next to it (e.g. nudging a first-time client to use it);
// `unread` shows a small red dot when there's a reply the button owner
// hasn't opened yet.
export function ChatFab({
  onPress,
  unread,
  hint,
  icon = '💬',
  dark = false,
  offset = 24,
}: {
  onPress: () => void;
  unread?: boolean;
  hint?: string;
  icon?: string;
  dark?: boolean;
  offset?: number;
}) {
  return (
    <View style={[styles.wrapper, { bottom: offset }]}>
      {hint && (
        <View style={styles.hintBubble}>
          <ThemedText style={styles.hintText}>{hint}</ThemedText>
        </View>
      )}
      <Pressable onPress={onPress} style={[styles.fab, dark && styles.fabDark]}>
        <ThemedText style={styles.icon}>{icon}</ThemedText>
        {unread && <View style={styles.badge} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card * 0.6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: 160,
    ...Shadow.card,
  },
  hintText: { color: '#595959', fontSize: 12, fontWeight: '600' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  fabDark: { backgroundColor: Brand.ink },
  icon: { fontSize: 24 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E74C3C',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
