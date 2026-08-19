import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';

export type TaskDetailValue = {
  applicable: boolean;
  blocked: boolean;
  blockerReason: string;
  blockerOwner: string;
  blockerExpectedDate: string;
  notes: string;
};

export function TaskDetailModal({
  visible,
  taskName,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  taskName: string;
  initial: TaskDetailValue | null;
  onClose: () => void;
  onSave: (value: TaskDetailValue) => void;
}) {
  const [value, setValue] = useState<TaskDetailValue | null>(initial);

  if (!value) return null;

  const set = <K extends keyof TaskDetailValue>(key: K, v: TaskDetailValue[K]) => setValue({ ...value, [key]: v });

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={styles.body}>
            <ThemedText type="smallBold" style={styles.title}>
              Task details
            </ThemedText>
            <ThemedText style={styles.taskName}>{taskName}</ThemedText>

            <Pressable style={styles.toggleRow} onPress={() => set('applicable', !value.applicable)}>
              <View style={[styles.checkbox, !value.applicable && styles.checkboxOn]}>
                {!value.applicable && <ThemedText style={styles.checkboxMark}>✕</ThemedText>}
              </View>
              <ThemedText style={styles.toggleLabel}>Not applicable to this project</ThemedText>
            </Pressable>

            <Pressable style={styles.toggleRow} onPress={() => set('blocked', !value.blocked)}>
              <View style={[styles.checkbox, value.blocked && styles.checkboxOnBlocked]}>
                {value.blocked && <ThemedText style={styles.checkboxMark}>⚑</ThemedText>}
              </View>
              <ThemedText style={styles.toggleLabel}>Blocked</ThemedText>
            </Pressable>

            {value.blocked && (
              <View style={styles.blockerFields}>
                <TextInput
                  placeholderTextColor="#9A9A9A"
                  style={styles.input}
                  placeholder="Blocker reason"
                  value={value.blockerReason}
                  onChangeText={(v) => set('blockerReason', v)}
                />
                <TextInput
                  placeholderTextColor="#9A9A9A"
                  style={styles.input}
                  placeholder="Who needs to unblock this"
                  value={value.blockerOwner}
                  onChangeText={(v) => set('blockerOwner', v)}
                />
                <TextInput
                  placeholderTextColor="#9A9A9A"
                  style={styles.input}
                  placeholder="Expected date (YYYY-MM-DD)"
                  value={value.blockerExpectedDate}
                  onChangeText={(v) => set('blockerExpectedDate', v)}
                />
              </View>
            )}

            <ThemedText style={styles.notesLabel}>INTERNAL NOTES · NOT VISIBLE TO CLIENT</ThemedText>
            <TextInput
              placeholderTextColor="#9A9A9A"
              style={[styles.input, styles.notesInput]}
              placeholder="Any description goes here…"
              value={value.notes}
              onChangeText={(v) => set('notes', v)}
              multiline
            />

            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancelButton}>
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={() => onSave(value)} style={styles.saveButton}>
                <ThemedText style={styles.saveText}>Save</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  card: { backgroundColor: '#FFFFFF', borderRadius: Radius.card, padding: Spacing.four, width: '100%', maxWidth: 420, maxHeight: '85%' },
  body: { gap: Spacing.two },
  title: { color: '#1C1C1C', fontSize: 16 },
  taskName: { color: '#6B6B6B', fontSize: 13, marginBottom: Spacing.one },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 6 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.small,
    borderWidth: 1.5,
    borderColor: '#C9C9C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#5C3A1E', borderColor: '#5C3A1E' },
  checkboxOnBlocked: { backgroundColor: '#e16b16', borderColor: '#e16b16' },
  checkboxMark: { color: '#FFFFFF', fontSize: 12 },
  toggleLabel: { color: '#1C1C1C', fontSize: 14, flex: 1 },
  blockerFields: { gap: Spacing.two, marginLeft: Spacing.four },
  input: { backgroundColor: '#F2F2F2', color: '#1C1C1C', borderRadius: Radius.card * 0.7, padding: Spacing.three, fontSize: 14 },
  notesLabel: { color: '#9A9A9A', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: Spacing.one },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginTop: Spacing.two },
  cancelButton: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  cancelText: { color: '#8A8A8A', fontWeight: '600' },
  saveButton: { backgroundColor: Brand.accent, borderRadius: Radius.pill, paddingVertical: Spacing.two, paddingHorizontal: Spacing.four },
  saveText: { color: Brand.ink, fontWeight: '800' },
});
