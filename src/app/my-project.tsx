import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatFab } from '@/components/chat-fab';
import { ChatWidget } from '@/components/chat-widget';
import { HeaderActions } from '@/components/header-actions';
import { ProjectProgressView, type ClientTask, type ProjectNotes } from '@/components/project-progress-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useChatUnread } from '@/hooks/use-chat-unread';
import { api } from '@/lib/api-client';

const MIA_AVATAR = require('@/assets/images/mia-avatar.png');

export default function MyProjectScreen() {
  const { stored, loading, signOut } = useAuth();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ClientTask[] | null>(null);
  const [notes, setNotes] = useState<ProjectNotes | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<'manager' | 'mia' | null>(null);

  const projectId = stored?.session.role === 'client' ? stored.session.projectId : null;
  const { unread: managerUnread, totalMessages: managerTotal } = useChatUnread(stored?.token ?? null, projectId, 'manager', 'client');
  const { unread: miaUnread } = useChatUnread(stored?.token ?? null, projectId, 'mia', 'client');

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
            <HeaderActions
              items={[
                { key: 'my-projects', label: '📁 My projects', onPress: () => router.push('/my-projects') },
                { key: 'signout', label: 'Sign out', onPress: signOut },
              ]}
            />
          }
        />
      </SafeAreaView>

      <ChatFab
        image={MIA_AVATAR}
        offset={92}
        onPress={() => setActiveChat((v) => (v === 'mia' ? null : 'mia'))}
        unread={miaUnread}
        hint={managerTotal === 0 ? 'Ask MIA anything, 24/7' : undefined}
      />
      <ChatFab
        icon="👤"
        dark
        offset={24}
        onPress={() => setActiveChat((v) => (v === 'manager' ? null : 'manager'))}
        unread={managerUnread}
      />
      {projectId && activeChat && (
        <ChatWidget
          visible
          token={stored.token}
          projectId={projectId}
          role="client"
          channel={activeChat}
          onClose={() => setActiveChat(null)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },
});
