import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { CategoryCard } from '@/components/category-card';
import { HeroPanel } from '@/components/hero-panel';
import { computePoints, ProgressCard } from '@/components/progress-card';
import { TaskDetailModal, type TaskDetailValue } from '@/components/task-detail-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, PhaseColors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useThemeToggle } from '@/hooks/use-theme';
import { categoryLabel, phaseLabel, t } from '@/i18n';
import { taskName } from '@/i18n/task-names';
import { api, type TeamMember } from '@/lib/api-client';

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
  blocked: boolean;
  blockerReason: string | null;
  blockerOwner: string | null;
  blockerExpectedDate: string | null;
  notes: string | null;
};

const STATUS_ICON: Record<SdpTask['status'], string> = { not_started: '○', in_progress: '◐', done: '●' };
const STATUS_COLOR: Record<SdpTask['status'], string> = { not_started: '#B8BCC4', in_progress: '#5f55ee', done: '#0f9d9f' };

export default function ProjectDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { stored } = useAuth();
  const { scheme, toggle } = useThemeToggle();
  const { lang } = useLanguage();
  const token = stored!.token;

  const [tasks, setTasks] = useState<SdpTask[] | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  // Tasks to (re)assign together — a single task from the row chip, or every
  // task in a category from the category-header chip (one owner per list).
  const [assigneeContext, setAssigneeContext] = useState<SdpTask[] | null>(null);
  const [detailTask, setDetailTask] = useState<SdpTask | null>(null);

  const load = useCallback(() => {
    api.getProjectTasks(token, id).then((r) => setTasks(r.tasks)).catch((e) => setError(e.message));
  }, [token, id]);

  useEffect(load, [load]);
  useEffect(() => {
    api.teamMembers(token).then(setMembers);
  }, []);

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
    try {
      // Sequential, not Promise.all — firing every write at once has been
      // flaky against the free-tier server, silently dropping one of them.
      for (const taskId of taskIds) {
        await api.updateTask(token, id, taskId, update);
      }
    } catch (e: any) {
      setError(e.message);
      load();
    }
  };

  const categoryAssigneeLabel = (catTasks: SdpTask[]) => {
    const assigned = catTasks.map((task) => task.assignees[0]).filter(Boolean) as { id: number; username: string }[];
    const uniqueIds = new Set(assigned.map((a) => a.id));
    return uniqueIds.size === 1 ? assigned[0].username : t('whoPlaceholder', lang);
  };

  const cycleStatus = (task: SdpTask) => {
    const next: SdpTask['status'] = task.status === 'done' ? 'not_started' : 'done';
    if (next === 'done' && task.assignees.length === 0) {
      setError(t('missingAssigneeBody', lang));
      return;
    }
    setError(null);
    patch(task.clickupId, { status: next });
  };

  const toggleBlocked = (task: SdpTask) => patch(task.clickupId, { blocked: !task.blocked });

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
      return { phase, title: `${t('phaseWord', lang)} ${phaseLabel[phase][lang]}`, categories, done, total: applicableTasks.length };
    });
  }, [tasks, lang]);

  const totalDone = phases.reduce((s, p) => s + p.done, 0);
  const totalCount = phases.reduce((s, p) => s + p.total, 0);
  const percent = totalCount ? Math.round((totalDone / totalCount) * 100) : 0;
  const points = computePoints(Object.fromEntries(phases.map((p) => [p.phase, { done: p.done, total: p.total }])));

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HeroPanel
          size="title"
          title={name ?? 'Projeto'}
          subtitle={t('sdpMatrix', lang)}
          right={
            <View style={styles.heroActions}>
              <Pressable onPress={() => router.push('/team')} style={styles.pillButton}>
                <ThemedText style={styles.pillButtonText}>{t('homeButton', lang)}</ThemedText>
              </Pressable>
              <Pressable onPress={toggle} style={styles.pillButton}>
                <ThemedText style={styles.pillButtonText}>{scheme === 'dark' ? '☀️' : '🌙'}</ThemedText>
              </Pressable>
              <Pressable onPress={shareWithClient} style={styles.pillButton}>
                <ThemedText style={styles.pillButtonText}>{t('clientLinkButton', lang)}</ThemedText>
              </Pressable>
            </View>
          }
        />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          {tasks && <ProgressCard percent={percent} points={points} label={t('completeLabel', lang)} pointsLabel={t('pointsWord', lang)} />}
          {shareUrl && <ThemedText selectable style={styles.shareUrl}>{shareUrl}</ThemedText>}
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          {phases.map((p) => (
            <View key={p.phase} style={styles.phaseBlock}>
              <View style={[styles.phaseBadge, { backgroundColor: PhaseColors[p.phase] }]}>
                <ThemedText type="phaseHeading" style={styles.phaseBadgeText}>
                  {p.title}
                </ThemedText>
              </View>
              <ThemedText style={styles.phaseSub}>{p.done}/{p.total} {t('tasksWord', lang)}</ThemedText>

              {p.categories.map((cat) => (
                <CategoryCard
                  key={cat.name}
                  name={categoryLabel[cat.name]?.[lang] ?? cat.name}
                  done={cat.tasks.filter((t) => t.applicable && t.status === 'done').length}
                  total={cat.tasks.filter((t) => t.applicable).length}
                  assigneeLabel={categoryAssigneeLabel(cat.tasks)}
                  onAssigneePress={() => setAssigneeContext(cat.tasks)}
                >
                  {cat.tasks.map((task) => (
                    <View key={task.clickupId} style={[styles.taskRow, task.blocked && styles.taskRowBlocked, !task.applicable && styles.taskRowNotApplicable]}>
                      <Pressable onPress={() => cycleStatus(task)} style={styles.statusTap} disabled={!task.applicable}>
                        <ThemedText style={[styles.statusIcon, { color: STATUS_COLOR[task.status] }]}>{STATUS_ICON[task.status]}</ThemedText>
                      </Pressable>
                      <Pressable style={styles.taskNameTap} onPress={() => setDetailTask(task)}>
                        <ThemedText style={styles.taskName}>{taskName(task.seedId, task.name, lang)}</ThemedText>
                      </Pressable>
                      {!task.applicable && (
                        <View style={styles.naChip}>
                          <ThemedText style={styles.naChipText}>{t('notApplicableBadge', lang)}</ThemedText>
                        </View>
                      )}
                      <Pressable onPress={() => toggleBlocked(task)} style={[styles.blockedChip, task.blocked && styles.blockedChipOn]}>
                        <ThemedText style={task.blocked ? styles.blockedChipOnText : styles.blockedChipText}>
                          {task.blocked ? '⚑' : '⚐'}
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
        title={t('assignTo', lang)}
        cancelLabel={t('cancel', lang)}
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
        taskName={detailTask ? taskName(detailTask.seedId, detailTask.name, lang) : ''}
        lang={lang}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  heroActions: { flexDirection: 'row', gap: Spacing.two },
  pillButton: { borderWidth: 1.5, borderColor: Brand.ink, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  pillButtonText: { color: Brand.ink, fontWeight: '700', fontSize: 12 },
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
  statusIcon: { fontSize: 20 },
  taskNameTap: { flex: 1 },
  taskName: { color: '#1C1C1C', fontSize: 14 },
  naChip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: Radius.pill, backgroundColor: '#E5E5E5' },
  naChipText: { color: '#6B6B6B', fontSize: 11, fontWeight: '700' },
  // Fixed light pills regardless of app theme.
  blockedChip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: Radius.pill, backgroundColor: '#F1DCC5' },
  blockedChipText: { color: '#5C3A1E', fontSize: 12 },
  blockedChipOn: { backgroundColor: '#e16b16' },
  blockedChipOnText: { color: '#FFFFFF', fontSize: 12 },
});
