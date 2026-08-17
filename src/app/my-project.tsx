import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProjectProgressView, type ClientTask } from '@/components/project-progress-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { t } from '@/i18n';
import { api } from '@/lib/api-client';

export default function MyProjectScreen() {
  const { stored, loading, signOut } = useAuth();
  const { lang, setLang } = useLanguage();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ClientTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stored) return;
    api
      .getMyProject(stored.token)
      .then((r) => {
        setProjectName(r.project.name);
        setTasks(r.tasks);
      })
      .catch((e) => setError(e.message));
  }, [stored]);

  if (loading) return null;
  if (!stored || stored.session.role !== 'client') return <Redirect href="/" />;

  if (error) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.centered}>
          <ThemedText>{error}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!tasks || !projectName) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.centered}>
          <ThemedText>{t('loading', lang)}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ProjectProgressView
          projectName={projectName}
          tasks={tasks}
          lang={lang}
          onChangeLang={setLang}
          headerRight={
            <Pressable onPress={signOut} style={styles.signOut}>
              <ThemedText style={styles.signOutText}>{t('signOut', lang)}</ThemedText>
            </Pressable>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },
  signOut: { alignSelf: 'flex-end', borderWidth: 1.5, borderColor: '#1C1C1C', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  signOutText: { color: '#1C1C1C', fontWeight: '700', fontSize: 12 },
});
