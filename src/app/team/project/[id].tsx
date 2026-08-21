import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { CategoryCard } from '@/components/category-card';
import { ChatFab } from '@/components/chat-fab';
import { ChatWidget } from '@/components/chat-widget';
import { HeaderActions } from '@/components/header-actions';
import { HeroPanel } from '@/components/hero-panel';
import { computePoints, ProgressCard } from '@/components/progress-card';
import { TaskDetailModal, type TaskDetailValue } from '@/components/task-detail-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, PhaseColors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useChatUnread } from '@/hooks/use-chat-unread';
import { useThemeToggle } from '@/hooks/use-theme';
import { api, type TeamMember } from '@/lib/api-client';

const MIA_AVATAR = require('@/assets/images/mia-avatar.png');
import { CATEGORY_LABEL_EN, englishTaskName } from '@/lib/task-names';

const PHASE_LABEL_EN: Record<number, string> = { 1: '1. Prepare', 2: '2. Test', 3: '3. Make' };

type SdpTask = {
  clickupId: string;
  seedId: string | null;
  name: string;
  order: number;
  process: 'S' | 'D' | 'P' | null;
  phase: 1 | 2 | 3 | null;
  category: string | null;
  status: 'not_started' | 'in_progress' | 'done';
  assignees: { id: number; username: string }[];
  applicable: boolean;
  favorite: boolean;
  blocked: boolean;
  blockerReason: string | null;
  blockerOwner: string | null;
  blockerExpectedDate: string | null;
  notes: string | null;
};

type ProjectNotesState = { general: string; phase1: string; phase2: string; phase3: string };
const PHASE_NOTE_KEY: Record<number, keyof ProjectNotesState> = { 1: 'phase1', 2: 'phase2', 3: 'phase3' };

export default function ProjectDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { stored } = useAuth();
  const { scheme, toggle } = useThemeToggle();
  const token = stored!.token;
  const { unread: managerUnread } = useChatUnread(token, id, 'manager', 'team');
  const { unread: miaUnread } = useChatUnread(token, id, 'mia', 'team');
  const [activeChat, setActiveChat] = useState<'manager' | 'mia' | null>(null);

  const [tasks, setTasks] = useState<SdpTask[] | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  // Tasks to (re)assign together — a single task from the row chip, or every
  // task in a category from the category-header chip (one owner per list).
  const [assigneeContext, setAssigneeContext] = useState<SdpTask[] | null>(null);
  const [detailTask, setDetailTask] = useState<SdpTask | null>(null);
  const [notes, setNotes] = useState<ProjectNotesState>({ general: '', phase1: '', phase2: '', phase3: '' });

  const load = useCallback(() => {
    api.getProjectTasks(token, id).then((r) => setTasks(r.tasks)).catch((e) => setError(e.message));
  }, [token, id]);

  useEffect(load, [load]);
  useEffect(() => {
    api.teamMembers(token).then(setMembers);
  }, []);
  useEffect(() => {
    api.getProjectNotes(token, id).then(setNotes).catch(() => {});
  }, [token, id]);

  const saveNote = (scope: keyof ProjectNotesState, body: string) => {
    api.updateProjectNote(token, id, scope, body).catch((e: any) => setError(e.message));
  };

  // Optimistic: update the screen immediately instead of re-fetching all 73
  // tasks after every tap — only re-fetch (to resync with the real state) if
  // the write actually fails.
  const applyLocalUpdate = (taskIds: string[], update: Record<string, unknown>) => {
    setTasks((prev) =>
      prev
        ? prev.map((task) => {
            if (!taskIds.includes(task.clickupId)) return task;
            const next = { ...task };
            if ('status' in update) next.status = update.status as SdpTask['status'];
            if ('applicable' in update) next.applicable = update.applicable as boolean;
            if ('favorite' in update) next.favorite = update.favorite as boolean;
            if ('blocked' in update) next.blocked = update.blocked as boolean;
            if ('blockerReason' in update) next.blockerReason = update.blockerReason as string;
            if ('blockerOwner' in update) next.blockerOwner = update.blockerOwner as string;
            if ('blockerExpectedDate' in update) next.blockerExpectedDate = update.blockerExpectedDate as string;
            if ('notes' in update) next.notes = update.notes as string;
            if ('assigneeId' in update) {
              const assigneeId = update.assigneeId as number | null;
              const member = members.find((m) => m.id === assigneeId);
              next.assignees = assigneeId != null && member ? [{ id: member.id, username: member.username }] : [];
            }
            return next;
          })
        : prev
    );
  };

  const patch = async (taskId: string, update: Record<string, unknown>) => {
    applyLocalUpdate([taskId], update);
    try {
      await api.updateTask(token, id, taskId, update);
    } catch (e: any) {
      setError(e.message);
      load();
    }
  };

  const patchMany = async (taskIds: string[], update: Record<string, unknown>) => {
    applyLocalUpdate(taskIds, update);
    // Sequential, not Promise.all — firing every write at once has been flaky
    // against the free-tier server. Each task also gets its own retries and
    // keeps going even if one fails, so a single flaky write can't silently
    // leave the rest of the category unassigned.
    const failedIds: string[] = [];
    for (const taskId of taskIds) {
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        try {
          await api.updateTask(token, id, taskId, update);
          ok = true;
        } catch {
          // retry
        }
      }
      if (!ok) failedIds.push(taskId);
    }
    if (failedIds.length) {
      const names = (tasks ?? [])
        .filter((task) => failedIds.includes(task.clickupId))
        .map((task) => englishTaskName(task.seedId, task.name));
      setError(`Could not save: ${names.join(', ')}`);
      load();
    }
  };

  const categoryAssigneeLabel = (catTasks: SdpTask[]) => {
    const assigned = catTasks.map((task) => task.assignees[0]).filter(Boolean) as { id: number; username: string }[];
    const uniqueIds = new Set(assigned.map((a) => a.id));
    return uniqueIds.size === 1 ? assigned[0].username : '+ Who?';
  };

  const cycleStatus = (task: SdpTask) => {
    const next: SdpTask['status'] = task.status === 'done' ? 'not_started' : 'done';
    if (next === 'done' && task.assignees.length === 0) {
      setError('Assign someone to this category before marking the task as done.');
      return;
    }
    setError(null);
    patch(task.clickupId, { status: next });
  };

  const toggleFavorite = (task: SdpTask) => patch(task.clickupId, { favorite: !task.favorite });

  const saveTaskDetail = (task: SdpTask, value: TaskDetailValue) => {
    setDetailTask(null);
    patch(task.clickupId, value);
  };

  const shareWithClient = async () => {
    try {
      const res = await api.createClientLink(token, id);
      setShareUrl(res.url);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const phases = useMemo(() => {
    const all = tasks ?? [];
    return [1, 2, 3].map((phase) => {
      const phaseTasks = all.filter((t) => t.phase === phase);
      const categories: { name: string; tasks: SdpTask[] }[] = [];
      for (const t of phaseTasks.sort((a, b) => a.order - b.order)) {
        const cat = categories.find((c) => c.name === t.category);
        if (cat) cat.tasks.push(t);
        else categories.push({ name: t.category ?? '—', tasks: [t] });
      }
      const applicableTasks = phaseTasks.filter((t) => t.applicable);
      const done = applicableTasks.filter((t) => t.status === 'done').length;
      return { phase, title: `Phase ${PHASE_LABEL_EN[phase]}`, categories, done, total: applicableTasks.length };
    });
  }, [tasks]);

  const totalDone = phases.reduce((s, p) => s + p.done, 0);
  const totalCount = phases.reduce((s, p) => s + p.total, 0);
  const percent = totalCount ? Math.round((totalDone / totalCount) * 100) : 0;
  const points = computePoints(Object.fromEntries(phases.map((p) => [p.phase, { done: p.done, total: p.total }])));

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HeroPanel size="title" title={name ?? 'Project'} subtitle="THE SDP MATRIX">
          <HeaderActions
            items={[
              { key: 'home', label: '🏠 Home', onPress: () => router.push('/team') },
              { key: 'theme', label: scheme === 'dark' ? '☀️' : '🌙', onPress: toggle },
              { key: 'link', label: 'Client link', onPress: shareWithClient },
            ]}
          />
        </HeroPanel>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          {tasks && <ProgressCard percent={percent} points={points} label="Complete" pointsLabel="points" />}
          {shareUrl && <ThemedText selectable style={styles.shareUrl}>{shareUrl}</ThemedText>}
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <ThemedText style={styles.noteLabel}>PROJECT NOTES · VISIBLE TO CLIENT</ThemedText>
          <TextInput
            style={[styles.noteInput, scheme === 'light' && styles.noteInputLight]}
            placeholder="Any description goes here…"
            placeholderTextColor="#9A9A9A"
            value={notes.general}
            onChangeText={(v) => setNotes((prev) => ({ ...prev, general: v }))}
            onBlur={() => saveNote('general', notes.general)}
            multiline
          />

          {phases.map((p) => (
            <View key={p.phase} style={styles.phaseBlock}>
              <View style={[styles.phaseBadge, { backgroundColor: PhaseColors[p.phase] }]}>
                <ThemedText type="phaseHeading" style={styles.phaseBadgeText}>
                  {p.title}
                </ThemedText>
              </View>
              <ThemedText style={styles.phaseSub}>{p.done}/{p.total} tasks</ThemedText>
              <ThemedText style={styles.noteLabel}>PHASE NOTES · VISIBLE TO CLIENT</ThemedText>
              <TextInput
                style={[styles.noteInput, scheme === 'light' && styles.noteInputLight]}
                placeholder="Any description goes here…"
                placeholderTextColor="#9A9A9A"
                value={notes[PHASE_NOTE_KEY[p.phase]]}
                onChangeText={(v) => setNotes((prev) => ({ ...prev, [PHASE_NOTE_KEY[p.phase]]: v }))}
                onBlur={() => saveNote(PHASE_NOTE_KEY[p.phase], notes[PHASE_NOTE_KEY[p.phase]])}
                multiline
              />

              {p.categories.map((cat) => (
                <CategoryCard
                  key={cat.name}
                  name={CATEGORY_LABEL_EN[cat.name] ?? cat.name}
                  done={cat.tasks.filter((t) => t.applicable && t.status === 'done').length}
                  total={cat.tasks.filter((t) => t.applicable).length}
                  assigneeLabel={categoryAssigneeLabel(cat.tasks)}
                  onAssigneePress={() => setAssigneeContext(cat.tasks)}
                >
                  {cat.tasks.map((task) => (
                    <View key={task.clickupId} style={[styles.taskRow, task.blocked && styles.taskRowBlocked, !task.applicable && styles.taskRowNotApplicable]}>
                      <Pressable onPress={() => cycleStatus(task)} style={styles.statusTap} disabled={!task.applicable}>
                        <View style={[styles.statusSquare, task.status === 'done' && styles.statusSquareDone]}>
                          {task.status === 'done' && <ThemedText style={styles.statusCheck}>✓</ThemedText>}
                        </View>
                      </Pressable>
                      <Pressable style={styles.taskNameTap} onPress={() => setDetailTask(task)}>
                        <ThemedText style={styles.taskName}>{englishTaskName(task.seedId, task.name)}</ThemedText>
                      </Pressable>
                      {!task.applicable && (
                        <View style={styles.naChip}>
                          <ThemedText style={styles.naChipText}>N/A</ThemedText>
                        </View>
                      )}
                      <Pressable onPress={() => toggleFavorite(task)} style={styles.favoriteTap}>
                        <ThemedText style={[styles.favoriteIcon, task.favorite && styles.favoriteIconOn]}>
                          {task.favorite ? '★' : '☆'}
                        </ThemedText>
                      </Pressable>
                    </View>
                  ))}
                </CategoryCard>
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ActionSheet
        visible={!!assigneeContext}
        title="Assign to"
        cancelLabel="Cancel"
        onCancel={() => setAssigneeContext(null)}
        options={
          assigneeContext
            ? members.map((m) => ({
                label: m.username,
                onPress: () => patchMany(assigneeContext.map((task) => task.clickupId), { assigneeId: m.id }),
              }))
            : []
        }
      />

      <TaskDetailModal
        key={detailTask?.clickupId ?? 'none'}
        visible={!!detailTask}
        taskName={detailTask ? englishTaskName(detailTask.seedId, detailTask.name) : ''}
        initial={
          detailTask
            ? {
                applicable: detailTask.applicable,
                blocked: detailTask.blocked,
                blockerReason: detailTask.blockerReason ?? '',
                blockerOwner: detailTask.blockerOwner ?? '',
                blockerExpectedDate: detailTask.blockerExpectedDate ?? '',
                notes: detailTask.notes ?? '',
              }
            : null
        }
        onClose={() => setDetailTask(null)}
        onSave={(value) => detailTask && saveTaskDetail(detailTask, value)}
      />

      <ChatFab image={MIA_AVATAR} offset={92} unread={miaUnread} onPress={() => setActiveChat((v) => (v === 'mia' ? null : 'mia'))} />
      <ChatFab icon="👤" dark offset={24} unread={managerUnread} onPress={() => setActiveChat((v) => (v === 'manager' ? null : 'manager'))} />
      {activeChat && (
        <ChatWidget
          visible
          token={token}
          projectId={id}
          role="team"
          channel={activeChat}
          members={members}
          onClose={() => setActiveChat(null)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  body: { padding: Spacing.four, gap: Spacing.three, maxWidth: 860, alignSelf: 'center', width: '100%', paddingBottom: Spacing.six },
  shareUrl: { color: '#8CA300' },
  error: { color: '#E74C3C' },
  phaseBlock: { gap: Spacing.two, marginTop: Spacing.two },
  // Badge (fixed color bg + fixed dark text) instead of colored text directly
  // on the page — colored text alone had bad contrast in one of the two themes.
  phaseBadge: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 12, borderRadius: Radius.pill },
  phaseBadgeText: { color: '#1C1C1C', fontSize: 13 },
  phaseSub: { color: '#9A9A9A', fontSize: 12, fontWeight: '600', marginTop: -Spacing.one, marginBottom: Spacing.one },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  taskRowBlocked: { backgroundColor: '#FFF6EC', borderRadius: Radius.small },
  taskRowNotApplicable: { opacity: 0.45 },
  statusTap: { padding: 4 },
  statusSquare: {
    width: 22,
    height: 22,
    borderRadius: Radius.small,
    borderWidth: 1.5,
    borderColor: '#B8BCC4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSquareDone: { backgroundColor: '#0f9d9f', borderColor: '#0f9d9f' },
  statusCheck: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  taskNameTap: { flex: 1 },
  taskName: { color: '#1C1C1C', fontSize: 14 },
  naChip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: Radius.pill, backgroundColor: '#E5E5E5' },
  naChipText: { color: '#6B6B6B', fontSize: 11, fontWeight: '700' },
  favoriteTap: { padding: 4 },
  favoriteIcon: { fontSize: 20, color: '#C9C9C9' },
  favoriteIconOn: { color: '#E0A800' },
  noteLabel: { color: '#9A9A9A', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: -4 },
  noteInput: {
    backgroundColor: '#F2F2F2',
    color: '#1C1C1C',
    borderRadius: Radius.card * 0.7,
    padding: Spacing.three,
    fontSize: 13,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  // The fixed light-gray fill barely stands out against the app's light-mode
  // background (it already contrasts fine in dark mode) — give it a visible
  // border + tint in light mode so it reads as an editable field at a glance.
  noteInputLight: {
    backgroundColor: '#FCFCE8',
    borderWidth: 1.5,
    borderColor: Brand.accent,
  },
});
