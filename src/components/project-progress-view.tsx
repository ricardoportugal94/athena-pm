import { useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryCard } from '@/components/category-card';
import { HeroPanel } from '@/components/hero-panel';
import { computePoints, ProgressCard } from '@/components/progress-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, PhaseColors, Radius, Spacing } from '@/constants/theme';
import { categoryLabel, phaseLabel, t, type Lang } from '@/i18n';
import { taskName } from '@/i18n/task-names';

export type ClientTask = {
  seedId: string | null;
  name: string;
  order: number;
  process: 'S' | 'D' | 'P' | null;
  phase: 1 | 2 | 3 | null;
  category: string | null;
  status: 'not_started' | 'in_progress' | 'done';
  blocked: boolean;
};

const STATUS_ICON: Record<ClientTask['status'], string> = { not_started: '○', in_progress: '◐', done: '●' };
const STATUS_COLOR: Record<ClientTask['status'], string> = { not_started: '#B8BCC4', in_progress: '#5f55ee', done: '#0f9d9f' };

export function ProjectProgressView({
  projectName,
  tasks,
  lang,
  onChangeLang,
  headerRight,
}: {
  projectName: string;
  tasks: ClientTask[];
  lang: Lang;
  onChangeLang: (l: Lang) => void;
  headerRight?: ReactNode;
}) {
  const phases = useMemo(() => {
    return [1, 2, 3].map((phase) => {
      const phaseTasks = tasks.filter((tk) => tk.phase === phase);
      const categories: { name: string; tasks: ClientTask[] }[] = [];
      for (const tk of [...phaseTasks].sort((a, b) => a.order - b.order)) {
        const cat = categories.find((c) => c.name === tk.category);
        if (cat) cat.tasks.push(tk);
        else categories.push({ name: tk.category ?? '—', tasks: [tk] });
      }
      const done = phaseTasks.filter((tk) => tk.status === 'done').length;
      return { phase, categories, done, total: phaseTasks.length };
    });
  }, [tasks]);

  const totalDone = phases.reduce((s, p) => s + p.done, 0);
  const blockedCount = tasks.filter((tk) => tk.blocked).length;
  const percent = tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0;
  const points = computePoints(Object.fromEntries(phases.map((p) => [p.phase, { done: p.done, total: p.total }])));

  return (
    <ThemedView style={styles.screen}>
      <HeroPanel
        size="title"
        title={projectName}
        subtitle={t('clientTitle', lang)}
        right={
          <ThemedView style={styles.langSwitch}>
            {(['pt', 'en'] as Lang[]).map((l) => (
              <Pressable key={l} onPress={() => onChangeLang(l)} style={[styles.langChip, lang === l && styles.langChipOn]}>
                <ThemedText style={lang === l ? styles.langChipOnText : styles.langChipText}>{l.toUpperCase()}</ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        }
      >
        {headerRight}
      </HeroPanel>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <ProgressCard percent={percent} points={points} label={t('tasksDone', lang)} pointsLabel={t('pointsWord', lang)} />
        {blockedCount > 0 && (
          <ThemedText style={styles.blockedNote}>
            ⚑ {blockedCount} {t('blockedNote', lang)}
          </ThemedText>
        )}

        {phases.map((p) => (
          <View key={p.phase} style={styles.phaseBlock}>
            <View style={[styles.phaseBadge, { backgroundColor: PhaseColors[p.phase] }]}>
              <ThemedText type="phaseHeading" style={styles.phaseBadgeText}>
                {phaseLabel[p.phase][lang]}
              </ThemedText>
            </View>

            {p.categories.map((cat) => (
              <CategoryCard
                key={cat.name}
                name={categoryLabel[cat.name]?.[lang] ?? cat.name}
                done={cat.tasks.filter((tk) => tk.status === 'done').length}
                total={cat.tasks.length}
              >
                {cat.tasks.map((tk) => (
                  <View key={tk.seedId ?? tk.name} style={[styles.taskRow, tk.blocked && styles.taskRowBlocked]}>
                    <ThemedText style={[styles.statusIcon, { color: STATUS_COLOR[tk.status] }]}>{STATUS_ICON[tk.status]}</ThemedText>
                    <ThemedText style={styles.taskName}>{taskName(tk.seedId, tk.name, lang)}</ThemedText>
                  </View>
                ))}
              </CategoryCard>
            ))}
          </View>
        ))}

        <ThemedText style={styles.footer}>{t('poweredBy', lang)}</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  body: { padding: Spacing.four, gap: Spacing.three, maxWidth: 860, alignSelf: 'center', width: '100%', paddingBottom: Spacing.six },
  // Fixed light pill regardless of app theme, so the text color can stay fixed too.
  langSwitch: { flexDirection: 'row', gap: Spacing.one, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: Radius.pill, padding: 3 },
  langChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.pill },
  langChipText: { color: '#2B2E33' },
  langChipOn: { backgroundColor: Brand.ink },
  langChipOnText: { color: Brand.accent },
  blockedNote: { color: '#B5651D', fontWeight: '600' },
  phaseBlock: { gap: Spacing.two, marginTop: Spacing.two },
  // Badge (fixed color bg + fixed dark text) instead of colored text directly
  // on the page — colored text alone had bad contrast against the page
  // background in one of the two themes (e.g. pale green text on a light page).
  phaseBadge: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 12, borderRadius: Radius.pill },
  phaseBadgeText: { color: '#1C1C1C', fontSize: 13 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  taskRowBlocked: { backgroundColor: '#FFF6EC', borderRadius: Radius.small },
  statusIcon: { fontSize: 18 },
  taskName: { flex: 1, color: '#1C1C1C', fontSize: 14 },
  footer: { textAlign: 'center', color: '#9A9A9A', marginTop: Spacing.four },
});
