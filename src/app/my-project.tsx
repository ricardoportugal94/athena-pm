import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { ChatFab } from '@/components/chat-fab';
import { ChatWidget } from '@/components/chat-widget';
import { HeaderActions } from '@/components/header-actions';
import { ProjectProgressView, type ClientTask, type ProjectNotes } from '@/components/project-progress-view';
import { ProjectSearchModal } from '@/components/project-search-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useChatUnread } from '@/hooks/use-chat-unread';
import { api, type ProjectSummary } from '@/lib/api-client';

export default function MyProjectScreen() {
  const { stored, loading, signIn, signOut } = useAuth();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ClientTask[] | null>(null);
  const [notes, setNotes] = useState<ProjectNotes | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<'manager' | 'mia' | null>(null);
  const [myProjects, setMyProjects] = useState<ProjectSummary[]>([]);
  const [pickingProject, setPickingProject] = useState(false);
  const [addingProject, setAddingProject] = useState(false);

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
      api.myProjects(stored.token).then((r) => setMyProjects(r.projects)).catch(() => {});
    }
  }, [stored]);

  const switchProject = async (project: ProjectSummary) => {
    if (!stored) return;
    try {
      const res = await api.switchProject(stored.token, project.id);
      setTasks(null);
      await signIn(res);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const addProject = async (project: ProjectSummary) => {
    if (!stored) return;
    const res = await api.linkProject(stored.token, project.id);
    setAddingProject(false);
    setTasks(null);
    await signIn(res);
  };

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
                ...(myProjects.length > 1 ? [{ key: 'switch', label: '🔀 Switch project', onPress: () => setPickingProject(true) }] : []),
                { key: 'add-project', label: '+ Add project', onPress: () => setAddingProject(true) },
                { key: 'signout', label: 'Sign out', onPress: signOut },
              ]}
            />
          }
        />
      </SafeAreaView>

      <ActionSheet
        visible={pickingProject}
        title="Switch project"
        cancelLabel="Cancel"
        onCancel={() => setPickingProject(false)}
        options={myProjects.map((p) => ({ label: p.name, onPress: () => switchProject(p) }))}
      />

      <ProjectSearchModal
        visible={addingProject}
        title="Add another project"
        onCancel={() => setAddingProject(false)}
        onSubmit={addProject}
      />

      <ChatFab
        icon="💬"
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
