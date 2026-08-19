import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { HeroPanel } from '@/components/hero-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api-client';

type ClientAccountRow = { taskId: string; email: string; projectId: string; projectName: string };

export default function ClientsScreen() {
  const { stored } = useAuth();
  const token = stored!.token;

  const [accounts, setAccounts] = useState<ClientAccountRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<ClientAccountRow | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientAccountRow | null>(null);

  const load = useCallback(() => {
    api.listClientAccounts(token).then(setAccounts).catch((e) => setError(e.message));
  }, [token]);

  useEffect(load, [load]);

  const doReset = async (account: ClientAccountRow) => {
    try {
      const res = await api.resetClientPassword(token, account.taskId);
      setResetResult({ email: account.email, tempPassword: res.tempPassword });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doDelete = async (account: ClientAccountRow) => {
    try {
      await api.deleteClientAccount(token, account.taskId);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copyPassword = async () => {
    if (!resetResult) return;
    await Clipboard.setStringAsync(resetResult.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HeroPanel
          size="title"
          title="Clients"
          subtitle="THE SDP MATRIX"
          right={
            <Pressable onPress={() => router.push('/team')} style={styles.pillButton}>
              <ThemedText style={styles.pillButtonText}>🏠 Home</ThemedText>
            </Pressable>
          }
        />

        <ThemedView style={styles.body}>
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <FlatList
            style={styles.listFlex}
            data={accounts ?? []}
            keyExtractor={(a) => a.taskId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardMain}>
                  <ThemedText type="smallBold" style={styles.email}>
                    {item.email}
                  </ThemedText>
                  <ThemedText style={styles.projectName}>{item.projectName}</ThemedText>
                </View>
                <View style={styles.actions}>
                  <Pressable onPress={() => setResetTarget(item)} style={styles.resetButton}>
                    <ThemedText style={styles.resetButtonText}>Reset password</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => setDeleteTarget(item)} style={styles.deleteButton}>
                    <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={accounts ? <ThemedText themeColor="textSecondary">No registered clients yet.</ThemedText> : null}
          />
        </ThemedView>
      </SafeAreaView>

      <ActionSheet
        visible={!!resetTarget}
        title="Reset password?"
        message={resetTarget ? `${resetTarget.email} — The current password stops working. You'll get a new temporary password to give the client.` : undefined}
        cancelLabel="Cancel"
        onCancel={() => setResetTarget(null)}
        options={resetTarget ? [{ label: 'Reset password', destructive: true, onPress: () => doReset(resetTarget) }] : []}
      />

      <ActionSheet
        visible={!!resetResult}
        title="New temporary password"
        message={resetResult ? `${resetResult.email}\n\n${resetResult.tempPassword}\n\nCopy and send this password to the client — it won't be shown again.` : undefined}
        cancelLabel="Close"
        onCancel={() => setResetResult(null)}
        options={resetResult ? [{ label: copied ? 'Copied!' : 'Copy password', onPress: copyPassword }] : []}
      />

      <ActionSheet
        visible={!!deleteTarget}
        title="Delete client?"
        message={deleteTarget ? `${deleteTarget.email} — Deletes the client's account. The project and its tasks in ClickUp are not affected.` : undefined}
        cancelLabel="Cancel"
        onCancel={() => setDeleteTarget(null)}
        options={deleteTarget ? [{ label: 'Delete', destructive: true, onPress: () => doDelete(deleteTarget) }] : []}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  pillButton: { borderWidth: 1.5, borderColor: Brand.ink, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  pillButtonText: { color: Brand.ink, fontWeight: '700', fontSize: 12 },
  body: { flex: 1, padding: Spacing.four, gap: Spacing.three, maxWidth: 720, alignSelf: 'center', width: '100%' },
  error: { color: '#E74C3C' },
  listFlex: { flex: 1 },
  list: { gap: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.six },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    ...Shadow.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardMain: { flex: 1, gap: 2 },
  email: { color: '#1C1C1C', fontSize: 15 },
  projectName: { color: '#8A8A8A', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.one },
  resetButton: { backgroundColor: '#F2F2F2', borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 12 },
  resetButtonText: { color: '#7A8F00', fontWeight: '700', fontSize: 12 },
  deleteButton: { backgroundColor: '#F2F2F2', borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 12 },
  deleteButtonText: { color: '#C0392B', fontWeight: '700', fontSize: 12 },
});
