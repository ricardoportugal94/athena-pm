import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatFab } from '@/components/chat-fab';
import { ProjectProgressView, type ClientTask, type ProjectNotes } from '@/components/project-progress-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useChatUnread } from '@/hooks/use-chat-unread';
import { api } from '@/lib/api-client';

export default function MyProjectScreen() {
  const { stored, loading, signOut } = useAuth();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ClientTask[] | null>(null);
  const [notes, setNotes] = useState<ProjectNotes | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const projectId = stored?.session.role === 'client' ? stored.session.projectId : null;
  const { unread, totalMessages } = useChatUnread(stored?.token ?? null, projectId, 'client');

  useEffect(() => {
    if (!stored) return;
    api
      .getMyProject(stored.token)
      .then((r) => {
        setProjectName(r.project.name);
        setTasks(r.tasks);
      })
      .catch((e) => setError(e.message));
    if (stored.session.role === 'client') {
      api.getProjectNotes(stored.token, stored.session.projectId).then(setNotes).catch(() => {});
    }
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
          <ThemedText>Loading…</ThemedText>
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
          notes={notes}
          headerRight={
            <Pressable onPress={signOut} style={styles.signOut}>
              <ThemedText style={styles.signOutText}>Sign out</ThemedText>
            </Pressable>
          }
        />
      </SafeAreaView>

      <ChatFab
        onPress={() => router.push('/chat')}
        unread={unread}
        hint={totalMessages === 0 ? 'Message my account manager' : undefined}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },
  signOut: { borderWidth: 1.5, borderColor: '#1C1C1C', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  signOutText: { color: '#1C1C1C', fontWeight: '700', fontSize: 12 },
});
