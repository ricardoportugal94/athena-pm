import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { HeaderActions } from '@/components/header-actions';
import { HeroPanel } from '@/components/hero-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { api, type ProjectSummary } from '@/lib/api-client';

type ClientAccountRow = { taskId: string; email: string; projectId: string; projectName: string; status: 'active' | 'pending' };

export default function ClientsScreen() {
  const { stored } = useAuth();
  const token = stored!.token;

  const [accounts, setAccounts] = useState<ClientAccountRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<ClientAccountRow | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; tempPassword: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientAccountRow | null>(null);
  const [deleteClientTarget, setDeleteClientTarget] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<string | null>(null);
  const [blockedEmails, setBlockedEmails] = useState<string[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    api.listClientAccounts(token).then(setAccounts).catch((e) => setError(e.message));
  }, [token]);

  const loadBlocked = useCallback(() => {
    api.listBlockedEmails(token).then((r) => setBlockedEmails(r.emails)).catch((e) => setError(e.message));
  }, [token]);

  useEffect(load, [load]);
  useEffect(loadBlocked, [loadBlocked]);

  // One client can be linked to several projects, each its own account row
  // sharing the same email/password — group them so the list shows one card
  // per client instead of the same email repeated once per project.
  const grouped = useMemo(() => {
    const byEmail = new Map<string, ClientAccountRow[]>();
    for (const a of accounts ?? []) {
      const list = byEmail.get(a.email) ?? [];
      list.push(a);
      byEmail.set(a.email, list);
    }
    return Array.from(byEmail.entries()).map(([email, rows]) => ({ email, rows }));
  }, [accounts]);

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

  const doApprove = async (account: ClientAccountRow) => {
    try {
      await api.approveClientAccount(token, account.taskId);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doDeleteClient = async (email: string) => {
    try {
      await api.deleteAllClientAccounts(token, email);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doBlock = async (email: string) => {
    try {
      await api.blockClientEmail(token, email);
      load();
      loadBlocked();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doUnblock = async (email: string) => {
    try {
      await api.unblockEmail(token, email);
      loadBlocked();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copyPassword = async () => {
    if (!resetResult?.tempPassword) return;
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
            <HeaderActions
              items={[
                { key: 'add', label: '+ Add client', onPress: () => setShowAdd(true) },
                { key: 'blocked', label: `🚫 Blocked (${blockedEmails.length})`, onPress: () => setShowBlocked(true) },
                { key: 'home', label: '🏠 Home', onPress: () => router.push('/team') },
              ]}
            />
          }
        />

        <ThemedView style={styles.body}>
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          {showAdd && (
            <AddClientForm
              token={token}
              onCancel={() => setShowAdd(false)}
              onAdded={(result) => {
                setShowAdd(false);
                load();
                if (result.tempPassword) setResetResult({ email: result.email, tempPassword: result.tempPassword });
              }}
            />
          )}

          <FlatList
            style={styles.listFlex}
            data={grouped}
            keyExtractor={(g) => g.email}
            contentContainerStyle={styles.list}
            renderItem={({ item: group }) => (
              <View style={styles.card}>
                <ThemedText type="smallBold" style={styles.email}>
                  {group.email}
                </ThemedText>

                {group.rows.map((row) => (
                  <View key={row.taskId} style={styles.projectRow}>
                    <View style={styles.projectRowMain}>
                      <ThemedText style={styles.projectName}>{row.projectName}</ThemedText>
                      {row.status === 'pending' && (
                        <View style={styles.pendingBadge}>
                          <ThemedText style={styles.pendingBadgeText}>Pending approval</ThemedText>
                        </View>
                      )}
                    </View>
                    {row.status === 'pending' ? (
                      <View style={styles.projectRowActions}>
                        <Pressable onPress={() => doApprove(row)} style={styles.smallButton}>
                          <ThemedText style={styles.smallButtonTextGreen}>Approve</ThemedText>
                        </Pressable>
                        <Pressable onPress={() => setDeleteTarget(row)} style={styles.smallButton}>
                          <ThemedText style={styles.smallButtonTextRed}>Reject</ThemedText>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable onPress={() => setDeleteTarget(row)} style={styles.smallButton}>
                        <ThemedText style={styles.smallButtonTextRed}>Remove</ThemedText>
                      </Pressable>
                    )}
                  </View>
                ))}

                <View style={styles.actions}>
                  <Pressable onPress={() => setResetTarget(group.rows[0])} style={styles.resetButton}>
                    <ThemedText style={styles.resetButtonText}>Reset password</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => setDeleteClientTarget(group.email)} style={styles.deleteClientButton}>
                    <ThemedText style={styles.deleteClientButtonText}>Delete client</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => setBlockTarget(group.email)} style={styles.blockButton}>
                    <ThemedText style={styles.blockButtonText}>Block</ThemedText>
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
        title={resetResult?.tempPassword ? 'New temporary password' : 'Project added'}
        message={
          resetResult
            ? resetResult.tempPassword
              ? `${resetResult.email}\n\n${resetResult.tempPassword}\n\nCopy and send this password to the client — it won't be shown again.`
              : `${resetResult.email} can now open this project too — same password as their other one(s).`
            : undefined
        }
        cancelLabel="Close"
        onCancel={() => setResetResult(null)}
        options={resetResult?.tempPassword ? [{ label: copied ? 'Copied!' : 'Copy password', onPress: copyPassword }] : []}
      />

      <ActionSheet
        visible={!!deleteTarget}
        title={deleteTarget?.status === 'pending' ? 'Reject request?' : 'Remove project?'}
        message={
          deleteTarget
            ? deleteTarget.status === 'pending'
              ? `${deleteTarget.email} — won't gain access to "${deleteTarget.projectName}". Their other project(s), if any, are not affected.`
              : `${deleteTarget.email} — loses access to "${deleteTarget.projectName}". Their other project(s), if any, are not affected. The project and its tasks in ClickUp are not affected either way.`
            : undefined
        }
        cancelLabel="Cancel"
        onCancel={() => setDeleteTarget(null)}
        options={
          deleteTarget
            ? [{ label: deleteTarget.status === 'pending' ? 'Reject' : 'Remove', destructive: true, onPress: () => doDelete(deleteTarget) }]
            : []
        }
      />

      <ActionSheet
        visible={!!deleteClientTarget}
        title="Delete client?"
        message={deleteClientTarget ? `${deleteClientTarget} — removes ALL of their projects at once. They could sign up again later.` : undefined}
        cancelLabel="Cancel"
        onCancel={() => setDeleteClientTarget(null)}
        options={
          deleteClientTarget ? [{ label: 'Delete client', destructive: true, onPress: () => doDeleteClient(deleteClientTarget) }] : []
        }
      />

      <ActionSheet
        visible={!!blockTarget}
        title="Block this email?"
        message={
          blockTarget
            ? `${blockTarget} — removes ALL of their projects and permanently blocks them from logging in, signing up, or using Google sign-in again. Undo it from "Blocked" in the header.`
            : undefined
        }
        cancelLabel="Cancel"
        onCancel={() => setBlockTarget(null)}
        options={blockTarget ? [{ label: 'Block', destructive: true, onPress: () => doBlock(blockTarget) }] : []}
      />

      <ActionSheet
        visible={showBlocked}
        title="Blocked emails"
        message={blockedEmails.length === 0 ? 'No blocked emails.' : 'Tap an email to unblock it.'}
        cancelLabel="Close"
        onCancel={() => setShowBlocked(false)}
        options={blockedEmails.map((email) => ({ label: email, onPress: () => doUnblock(email) }))}
      />
    </ThemedView>
  );
}

// Links an email to a project — a new email gets a fresh temp password; an
// email that already has an account just gains this project, same password.
function AddClientForm({
  token,
  onCancel,
  onAdded,
}: {
  token: string;
  onCancel: () => void;
  onAdded: (result: { email: string; tempPassword: string | null }) => void;
}) {
  const [email, setEmail] = useState('');
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

  const submit = async () => {
    if (!email.trim()) return setError('Enter the client\'s email.');
    if (!selected) return setError('Choose a project from the list.');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.addClientAccount(token, email.trim(), selected.id);
      onAdded({ email: email.trim(), tempPassword: res.tempPassword });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.addCard}>
      <ThemedText type="smallBold" style={styles.addTitle}>
        Add client to a project
      </ThemedText>
      <TextInput
        placeholderTextColor="#9A9A9A"
        style={styles.addInput}
        placeholder="Client email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholderTextColor="#9A9A9A"
        style={styles.addInput}
        placeholder="Search for the project/brand name…"
        value={selected?.name ?? query}
        onChangeText={(v) => {
          setSelected(null);
          setQuery(v);
        }}
      />
      {!selected && query.trim().length >= 2 && (
        <View style={styles.addResultsBox}>
          {results.length === 0 && <ThemedText style={styles.addNoResults}>No project found.</ThemedText>}
          {results.map((r) => (
            <Pressable key={r.id} onPress={() => setSelected(r)} style={styles.addResultRow}>
              <ThemedText style={styles.addResultText}>{r.name}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <View style={styles.addActions}>
        <Pressable onPress={onCancel} style={styles.addCancelButton}>
          <ThemedText style={styles.addCancelText}>Cancel</ThemedText>
        </Pressable>
        <Pressable onPress={submit} disabled={submitting} style={styles.addSubmitButton}>
          {submitting ? <ActivityIndicator color="#191919" /> : <ThemedText style={styles.addSubmitText}>Add</ThemedText>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  body: { flex: 1, padding: Spacing.four, gap: Spacing.three, maxWidth: 720, alignSelf: 'center', width: '100%' },
  error: { color: '#E74C3C' },
  listFlex: { flex: 1 },
  list: { gap: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.six },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    ...Shadow.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  pendingBadge: { backgroundColor: '#FFF1CC', borderRadius: Radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  pendingBadgeText: { color: '#8A6D00', fontWeight: '700', fontSize: 10 },
  email: { color: '#1C1C1C', fontSize: 15 },
  projectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: Spacing.one,
  },
  projectRowMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flexWrap: 'wrap', flex: 1 },
  projectRowActions: { flexDirection: 'row', gap: Spacing.one },
  projectName: { color: '#4A4A4A', fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap', marginTop: 4 },
  resetButton: { backgroundColor: '#F2F2F2', borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 12 },
  resetButtonText: { color: '#7A8F00', fontWeight: '700', fontSize: 12 },
  deleteClientButton: { backgroundColor: '#F2F2F2', borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 12 },
  deleteClientButtonText: { color: '#C0392B', fontWeight: '700', fontSize: 12 },
  blockButton: { backgroundColor: '#3B1010', borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 12 },
  blockButtonText: { color: '#FF8A80', fontWeight: '700', fontSize: 12 },
  smallButton: { backgroundColor: '#F2F2F2', borderRadius: Radius.pill, paddingVertical: 5, paddingHorizontal: 10 },
  smallButtonTextGreen: { color: '#7A8F00', fontWeight: '700', fontSize: 11 },
  smallButtonTextRed: { color: '#C0392B', fontWeight: '700', fontSize: 11 },
  addCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.card, ...Shadow.card, padding: Spacing.three, gap: Spacing.two },
  addTitle: { color: '#1C1C1C' },
  addInput: { backgroundColor: '#F2F2F2', color: '#1C1C1C', borderRadius: Radius.card * 0.6, padding: Spacing.two, fontSize: 14 },
  addResultsBox: { backgroundColor: '#F2F2F2', borderRadius: Radius.small, overflow: 'hidden' },
  addResultRow: { padding: Spacing.two, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  addResultText: { color: '#1C1C1C' },
  addNoResults: { color: '#9A9A9A', fontSize: 12, textAlign: 'center', padding: Spacing.two },
  addActions: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  addCancelButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.pill, backgroundColor: '#F2F2F2' },
  addCancelText: { color: '#6B6B6B', fontWeight: '700', fontSize: 12 },
  addSubmitButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.pill, backgroundColor: '#E4F577' },
  addSubmitText: { color: '#191919', fontWeight: '800', fontSize: 12 },
});
