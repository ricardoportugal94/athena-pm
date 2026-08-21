import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderActions } from '@/components/header-actions';
import { HeroPanel } from '@/components/hero-panel';
import { ProjectSearchModal } from '@/components/project-search-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemeToggle } from '@/hooks/use-theme';
import { api, type ProjectSummary, type ProjectWithStats } from '@/lib/api-client';

// The client-facing counterpart to the admin's own project list (team/index)
// — same hero banner, same search-row-plus-button shape, same progress
// cards. The differences are all about scope, not looks: the search only
// ever filters this client's own linked projects, the button requests
// another project (pending admin approval) instead of creating one, and
// tapping a card switches the active session into that project instead of
// opening an edit/delete toolbar.
export default function MyProjectsScreen() {
  const { stored, loading, signIn, signOut } = useAuth();
  const { scheme, toggle } = useThemeToggle();

  const [projects, setProjects] = useState<ProjectWithStats[] | null>(null);
  const [pending, setPending] = useState<ProjectSummary[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const token = stored?.token ?? null;

  const load = useCallback(() => {
    if (!token) return;
    api
      .myProjects(token)
      .then((r) => {
        setProjects(r.projects);
        setPending(r.pending);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  useEffect(load, [load]);

  if (loading) return null;
  if (!stored || stored.session.role !== 'client') return <Redirect href="/" />;
  // Captured as its own const so the "client" narrowing survives into the
  // renderItem closure below — TS doesn't carry property-access narrowing
  // (stored.session.role) across function boundaries.
  const session = stored.session;

  const filtered = (projects ?? []).filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  const openProject = async (project: ProjectWithStats) => {
    setSwitchingId(project.id);
    setError(null);
    try {
      const res = await api.switchProject(token!, project.id);
      await signIn(res);
      router.replace('/my-project');
    } catch (e: any) {
      setError(e.message);
      setSwitchingId(null);
    }
  };

  const requestProject = async (project: ProjectSummary) => {
    const res = await api.linkProject(token!, project.id);
    setAddingProject(false);
    setPending((prev) => [...prev, project]);
    setPendingNotice(`Request sent for "${res.projectName}" — it'll show up here once the Portugal Production team approves it.`);
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HeroPanel
          title="ATHENA"
          subtitle="THE SDP MATRIX"
          right={
            <HeaderActions
              items={[
                { key: 'theme', label: scheme === 'dark' ? '☀️' : '🌙', onPress: toggle },
                { key: 'signout', label: 'Sign out', onPress: signOut },
              ]}
            />
          }
        >
          <View style={styles.heroBottomRow}>
            <ThemedText style={styles.clientEmail}>{session.email}</ThemedText>
          </View>
        </HeroPanel>

        <ThemedView style={styles.body}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            My Projects
          </ThemedText>

          <ThemedView style={styles.newRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search your projects"
              placeholderTextColor="#9A9A9A"
              style={styles.input}
            />
            <Pressable style={styles.addButton} onPress={() => setAddingProject(true)}>
              <ThemedText style={styles.addButtonText}>+ Add project</ThemedText>
            </Pressable>
          </ThemedView>
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}
          {pendingNotice && <ThemedText style={styles.hint}>{pendingNotice}</ThemedText>}

          <FlatList
            style={styles.listFlex}
            data={filtered}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={styles.projectCard}
                disabled={!!switchingId}
                onPress={() => (item.id === session.projectId ? router.replace('/my-project') : openProject(item))}
              >
                <View style={styles.projectCardTop}>
                  <ThemedText type="smallBold" style={styles.projectCardText}>
                    {item.name}
                  </ThemedText>
                  {switchingId === item.id ? <ActivityIndicator color={Brand.ink} /> : <ThemedText style={styles.chevron}>›</ThemedText>}
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${item.percent}%` }]} />
                </View>
                <View style={styles.statsRow}>
                  <ThemedText style={styles.statsText}>
                    {item.percent}% · {item.done}/{item.total} tasks
                  </ThemedText>
                  {item.blocked > 0 && (
                    <View style={styles.blockedBadge}>
                      <ThemedText style={styles.blockedBadgeText}>⚑ {item.blocked} blocked</ThemedText>
                    </View>
                  )}
                </View>
              </Pressable>
            )}
            ListFooterComponent={
              pending.length > 0 ? (
                <View style={styles.pendingSection}>
                  <ThemedText style={styles.pendingSectionTitle}>Waiting for approval</ThemedText>
                  {pending.map((p) => (
                    <View key={p.id} style={styles.pendingCard}>
                      <ThemedText style={styles.pendingCardText}>{p.name}</ThemedText>
                      <View style={styles.pendingBadge}>
                        <ThemedText style={styles.pendingBadgeText}>Pending</ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null
            }
            ListEmptyComponent={projects ? <ThemedText themeColor="textSecondary">No projects yet.</ThemedText> : null}
          />
        </ThemedView>
      </SafeAreaView>

      <ProjectSearchModal
        visible={addingProject}
        title="Request another project"
        onCancel={() => setAddingProject(false)}
        onSubmit={requestProject}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  heroBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientEmail: { color: '#4A5A00', fontWeight: '600' },
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
  addButton: { backgroundColor: Brand.accent, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, justifyContent: 'center' },
  addButtonText: { color: Brand.ink, fontWeight: '800' },
  error: { color: '#E74C3C' },
  hint: { color: '#8A8A8A', fontSize: 12 },
  listFlex: { flex: 1 },
  list: { gap: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.six },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    ...Shadow.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  projectCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectCardText: { color: '#1C1C1C', fontSize: 16 },
  chevron: { color: '#B8BCC4', fontSize: 20, fontWeight: '700' },
  track: { height: 6, backgroundColor: '#EAEAEA', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Brand.accent, borderRadius: 3 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsText: { color: '#8A8A8A', fontSize: 12, fontWeight: '600' },
  blockedBadge: { backgroundColor: '#FFF6EC', borderRadius: Radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  blockedBadgeText: { color: '#B5651D', fontSize: 11, fontWeight: '700' },
  pendingSection: { marginTop: Spacing.two, gap: Spacing.two },
  pendingSectionTitle: { color: '#8A8A8A', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    ...Shadow.card,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    opacity: 0.7,
  },
  pendingCardText: { color: '#1C1C1C', fontSize: 15 },
  pendingBadge: { backgroundColor: '#FFF1CC', borderRadius: Radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  pendingBadgeText: { color: '#8A6D00', fontWeight: '700', fontSize: 11 },
});
