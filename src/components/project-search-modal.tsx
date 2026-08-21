import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { api, type ProjectSummary } from '@/lib/api-client';

// A Modal-based "search for a project by name, then act on it" — the same
// join-an-existing-project pattern used at signup, reusable anywhere a
// client needs to pick a project by searching (not from a fixed list).
export function ProjectSearchModal({
  visible,
  title,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onSubmit: (project: ProjectSummary) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProjectSummary[]>([]);
  const [selected, setSelected] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    const id = setTimeout(() => api.searchProjects(query).then(setResults).catch(() => {}), 250);
    return () => clearTimeout(id);
  }, [query, selected]);

  const reset = () => {
    setQuery('');
    setResults([]);
    setSelected(null);
    setError(null);
  };

  const cancel = () => {
    reset();
    onCancel();
  };

  const submit = async () => {
    if (!selected) return setError('Choose a project from the list.');
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(selected);
      reset();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={cancel}>
      <Pressable style={styles.backdrop} onPress={cancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <ThemedText type="smallBold" style={styles.title}>
            {title}
          </ThemedText>
          <TextInput
            placeholderTextColor="#9A9A9A"
            style={styles.input}
            placeholder="Search for the project/brand name…"
            value={selected?.name ?? query}
            onChangeText={(v) => {
              setSelected(null);
              setQuery(v);
            }}
            autoFocus
          />
          {!selected && query.trim().length >= 2 && (
            <View style={styles.resultsBox}>
              {results.length === 0 && <ThemedText style={styles.noResults}>No project found.</ThemedText>}
              {results.map((r) => (
                <Pressable key={r.id} onPress={() => setSelected(r)} style={styles.resultRow}>
                  <ThemedText style={styles.resultText}>{r.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          )}

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <View style={styles.actions}>
            <Pressable onPress={cancel} style={styles.cancelButton}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>
            <Pressable onPress={submit} disabled={submitting} style={styles.submitButton}>
              {submitting ? <ActivityIndicator color={Brand.ink} /> : <ThemedText style={styles.submitText}>Add</ThemedText>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  card: { backgroundColor: '#FFFFFF', borderRadius: Radius.card, padding: Spacing.four, width: '100%', maxWidth: 400, gap: Spacing.two },
  title: { color: '#1C1C1C' },
  input: { backgroundColor: '#F2F2F2', color: '#1C1C1C', borderRadius: Radius.card * 0.6, padding: Spacing.two, fontSize: 15 },
  resultsBox: { backgroundColor: '#F2F2F2', borderRadius: Radius.small, overflow: 'hidden', maxHeight: 200 },
  resultRow: { padding: Spacing.two, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  resultText: { color: '#1C1C1C' },
  noResults: { color: '#9A9A9A', fontSize: 12, textAlign: 'center', padding: Spacing.two },
  error: { color: '#E74C3C' },
  actions: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  cancelButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.pill, backgroundColor: '#F2F2F2' },
  cancelText: { color: '#6B6B6B', fontWeight: '700', fontSize: 12 },
  submitButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.pill, backgroundColor: Brand.accent },
  submitText: { color: Brand.ink, fontWeight: '800', fontSize: 12 },
});
