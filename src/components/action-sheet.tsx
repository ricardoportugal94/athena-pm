import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

// React Native's Alert.alert is not implemented on web (react-native-web has
// no shim for it) — confirmations and option pickers built on Alert.alert
// silently do nothing in the browser. This is a cross-platform replacement
// built on Modal, which react-native-web does support.
export type ActionSheetOption = { label: string; onPress: () => void; destructive?: boolean };

export function ActionSheet({
  visible,
  title,
  message,
  options,
  cancelLabel,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  options: ActionSheetOption[];
  cancelLabel: string;
  onCancel: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <ThemedText type="smallBold" style={styles.title}>
            {title}
          </ThemedText>
          {message && <ThemedText style={styles.message}>{message}</ThemedText>}
          <ScrollView style={styles.optionsScroll}>
            {options.map((o, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  onCancel();
                  o.onPress();
                }}
                style={styles.option}
              >
                <ThemedText style={o.destructive ? styles.destructiveText : styles.optionText}>{o.label}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={onCancel} style={[styles.option, styles.cancelOption]}>
            <ThemedText style={styles.cancelText}>{cancelLabel}</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  card: { backgroundColor: '#FFFFFF', borderRadius: Radius.card, padding: Spacing.four, width: '100%', maxWidth: 400, maxHeight: '80%', gap: Spacing.two },
  title: { color: '#1C1C1C', fontSize: 16 },
  message: { color: '#6B6B6B', fontSize: 13, marginBottom: Spacing.one },
  optionsScroll: { maxHeight: 280 },
  option: { paddingVertical: Spacing.three, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  optionText: { color: '#1C1C1C', fontSize: 15 },
  destructiveText: { color: '#C0392B', fontSize: 15, fontWeight: '700' },
  cancelOption: { alignItems: 'center' },
  cancelText: { color: '#8A8A8A', fontWeight: '600', fontSize: 15 },
});
