import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatThreadView, type ChatMessage } from '@/components/chat-thread-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api-client';

// Client-side chat screen — reachable only from a logged-in client account
// (my-project.tsx). The signed share-link view (/client/[token]) has no
// session to authenticate a chat with, so it stays read-only progress only.
export default function ChatScreen() {
  const { stored, loading } = useAuth();
  const [responsible, setResponsible] = useState<{ id: number; name: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectId = stored?.session.role === 'client' ? stored.session.projectId : null;

  const load = () => {
    if (!stored || !projectId) return;
    api
      .getChat(stored.token, projectId)
      .then((r) => {
        setResponsible(r.responsible);
        setMessages(r.messages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  };

  useEffect(load, [stored, projectId]);

  if (loading) return null;
  if (!stored || stored.session.role !== 'client' || !projectId) return <Redirect href="/" />;

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.sendChatMessage(stored.token, projectId, text.trim());
      setText('');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <View style={styles.topBarPill}>
            <ThemedText style={styles.topBarPillText}>💬 Chat</ThemedText>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <ThemedText style={styles.closeButtonText}>✕</ThemedText>
          </Pressable>
        </View>

        <ChatThreadView
          responsibleName={responsible?.name ?? null}
          subtitle={responsible ? 'Portugal Production team' : 'No one assigned yet'}
          messages={messages}
          mineRole="client"
          text={text}
          onChangeText={setText}
          onSend={send}
          sending={sending}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          error={error}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  topBarPill: { backgroundColor: '#1C1C1C', borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
  topBarPillText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
