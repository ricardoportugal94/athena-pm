import * as Clipboard from 'expo-clipboard';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { HeroPanel } from '@/components/hero-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useThemeToggle } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { api, type ProjectWithStats } from '@/lib/api-client';

export default function ProjectListScreen() {
  const { stored, signOut } = useAuth();
  const { scheme, toggle } = useThemeToggle();
  const { lang } = useLanguage();
  const token = stored!.token;
  const admin = stored!.session as { role: 'admin'; email: string; name: string };

  const [projects, setProjects] = useState<ProjectWithStats[] | null>(null);
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ProjectWithStats | null>(null);

  const load = useCallback(() => {
    api.listProjects(token).then(setProjects).catch((e) => setError(e.message));
    api.listClientAccounts(token).then((accounts) => setClientCount(accounts.length)).catch(() => {});
  }, [token]);

  useEffect(load, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.createProject(token, newName.trim());
      setNewName('');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const copyClientLink = async (projectId: string) => {
    try {
      const res = await api.createClientLink(token, projectId);
      await Clipboard.setStringAsync(res.url);
      setCopiedId(projectId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const startEdit = (project: ProjectWithStats) => {
    setEditingId(project.id);
    setEditValue(project.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    try {
      await api.renameProject(token, editingId, editValue.trim());
      setEditingId(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doDelete = async (project: ProjectWithStats) => {
    try {
      await api.deleteProject(token, project.id);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HeroPanel
          title="ATHENA"
          subtitle={t('sdpMatrix', lang)}
          right={
            <View style={styles.heroActions}>
              <Pressable onPress={toggle} style={styles.pillButton}>
                <ThemedText style={styles.pillButtonText}>{scheme === 'dark' ? '☀️' : '🌙'}</ThemedText>
              </Pressable>
              <Pressable onPress={signOut} style={styles.pillButton}>
                <ThemedText style={styles.pillButtonText}>{t('signOut', lang)}</ThemedText>
              </Pressable>
            </View>
          }
        >
          <View style={styles.heroBottomRow}>
            <ThemedText style={styles.adminName}>{admin.name}</ThemedText>
            {clientCount !== null && (
              <View style={styles.clientCountBadge}>
                <ThemedText style={styles.clientCountText}>
                  {clientCount} {t('registeredClients', lang)}
                </ThemedText>
              </View>
            )}
          </View>
        </HeroPanel>

        <ThemedView style={styles.body}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t('projectsTitle', lang)}
          </ThemedText>

          <ThemedView style={styles.newRow}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder={t('newProjectPlaceholder', lang)}
              placeholderTextColor="#9A9A9A"
              style={styles.input}
            />
            <Pressable style={[styles.createButton, creating && styles.createButtonDisabled]} onPress={handleCreate} disabled={creating}>
              <ThemedText style={styles.createButtonText}>{creating ? t('creatingProject', lang) : t('newProjectButton', lang)}</ThemedText>
            </Pressable>
          </ThemedView>
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <FlatList
            style={styles.listFlex}
            data={projects ?? []}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.projectCard}>
                {editingId === item.id ? (
                  <View style={styles.editRow}>
                    <TextInput value={editValue} onChangeText={setEditValue} style={styles.editInput} autoFocus />
                    <Pressable onPress={saveEdit} style={styles.editSaveButton}>
                      <ThemedText style={styles.editSaveButtonText}>{t('save', lang)}</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => setEditingId(null)} style={styles.editCancelButton}>
                      <ThemedText style={styles.editCancelButtonText}>{t('cancel', lang)}</ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <Link href={{ pathname: '/team/project/[id]', params: { id: item.id, name: item.name } }} asChild>
                    <Pressable style={styles.projectCardMain}>
                      <View style={styles.projectCardTop}>
                        <ThemedText type="smallBold" style={styles.projectCardText}>
                          {item.name}
                        </ThemedText>
                        <ThemedText style={styles.chevron}>›</ThemedText>
                      </View>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${item.percent}%` }]} />
                      </View>
                      <View style={styles.statsRow}>
                        <ThemedText style={styles.statsText}>
                          {item.percent}% · {item.done}/{item.total} {t('tasksWord', lang)}
                        </ThemedText>
                        {item.blocked > 0 && (
                          <View style={styles.blockedBadge}>
                            <ThemedText style={styles.blockedBadgeText}>
                              ⚑ {item.blocked} {t('blockedCountLabel', lang)}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  </Link>
                )}
                {editingId !== item.id && (
                  <View style={styles.actionsRow}>
                    <Pressable onPress={() => copyClientLink(item.id)} style={styles.actionButton}>
                      <ThemedText style={styles.actionButtonText}>{copiedId === item.id ? t('linkCopied', lang) : t('copyClientLink', lang)}</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => startEdit(item)} style={styles.actionButton}>
                      <ThemedText style={styles.actionButtonText}>{t('editNameAction', lang)}</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => setDeleteTarget(item)} style={styles.actionButton}>
                      <ThemedText style={styles.deleteButtonText}>{t('deleteAction', lang)}</ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={projects ? <ThemedText themeColor="textSecondary">{t('noProjectsYet', lang)}</ThemedText> : null}
          />
        </ThemedView>
      </SafeAreaView>

      <ActionSheet
        visible={!!deleteTarget}
        title={t('confirmDeleteTitle', lang)}
        message={deleteTarget ? `"${deleteTarget.name}" — ${t('confirmDeleteBody', lang)}` : undefined}
        cancelLabel={t('cancel', lang)}
        onCancel={() => setDeleteTarget(null)}
        options={deleteTarget ? [{ label: t('deleteAction', lang), destructive: true, onPress: () => doDelete(deleteTarget) }] : []}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  heroActions: { flexDirection: 'row', gap: Spacing.two },
  pillButton: { borderWidth: 1.5, borderColor: Brand.ink, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  pillButtonText: { color: Brand.ink, fontWeight: '700', fontSize: 12 },
  heroBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adminName: { color: '#4A5A00', fontWeight: '600' },
  clientCountBadge: { backgroundColor: Brand.ink, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 12 },
  clientCountText: { color: Brand.accent, fontWeight: '700', fontSize: 12 },
  body: { flex: 1, padding: Spacing.four, gap: Spacing.three, maxWidth: 720, alignSelf: 'center', width: '100%' },
  sectionTitle: { fontSize: 22 },
  newRow: { flexDirection: 'row', gap: Spacing.two },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    color: '#1C1C1C',
    borderRadius: Radius.card * 0.7,
    padding: Spacing.three,
    fontSize: 16,
    ...Shadow.card,
  },
  createButton: { backgroundColor: Brand.accent, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, justifyContent: 'center' },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: Brand.ink, fontWeight: '800' },
  error: { color: '#E74C3C' },
  listFlex: { flex: 1 },
  list: { gap: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.six },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    ...Shadow.card,
    overflow: 'hidden',
  },
  projectCardMain: { padding: Spacing.three, gap: Spacing.two },
  projectCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectCardText: { color: '#1C1C1C', fontSize: 16 },
  chevron: { color: '#B8BCC4', fontSize: 20, fontWeight: '700' },
  track: { height: 6, backgroundColor: '#EAEAEA', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Brand.accent, borderRadius: 3 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsText: { color: '#8A8A8A', fontSize: 12, fontWeight: '600' },
  blockedBadge: { backgroundColor: '#FFF6EC', borderRadius: Radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  blockedBadgeText: { color: '#B5651D', fontSize: 11, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionButton: { flex: 1, padding: Spacing.two, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F0F0F0' },
  actionButtonText: { color: '#7A8F00', fontWeight: '700', fontSize: 12 },
  deleteButtonText: { color: '#C0392B', fontWeight: '700', fontSize: 12 },
  editRow: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  editInput: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    color: '#1C1C1C',
    borderRadius: Radius.small,
    padding: Spacing.two,
    fontSize: 14,
  },
  editSaveButton: { backgroundColor: Brand.accent, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  editSaveButtonText: { color: Brand.ink, fontWeight: '700', fontSize: 12 },
  editCancelButton: { paddingVertical: 6, paddingHorizontal: 8 },
  editCancelButtonText: { color: '#8A8A8A', fontWeight: '600', fontSize: 12 },
});
