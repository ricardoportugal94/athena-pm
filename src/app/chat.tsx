import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeroPanel } from '@/components/hero-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api-client';

type ChatMessage = { senderRole: 'team' | 'client'; senderName: string; body: string; sentAt: string };

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
        <HeroPanel
          title="Chat"
          subtitle={responsible ? `With ${responsible.name}` : 'No one assigned yet'}
          right={
            <Pressable onPress={() => router.back()} style={styles.pillButton}>
              <ThemedText style={styles.pillButtonText}>Close</ThemedText>
            </Pressable>
          }
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}
          {messages.length === 0 && <ThemedText style={styles.empty}>No messages yet.</ThemedText>}
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.senderRole === 'client' ? styles.bubbleMine : styles.bubbleTheirs]}>
              <ThemedText style={styles.bubbleSender}>{m.senderName}</ThemedText>
              <ThemedText style={styles.bubbleText}>{m.body}</ThemedText>
            </View>
          ))}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor="#9A9A9A"
            value={text}
            onChangeText={setText}
            multiline
          />
          <Pressable style={styles.sendButton} onPress={send} disabled={sending}>
            <ThemedText style={styles.sendButtonText}>Send</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  pillButton: { borderWidth: 1.5, borderColor: Brand.ink, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  pillButtonText: { color: Brand.ink, fontWeight: '700', fontSize: 12 },
  scroll: { flex: 1 },
  body: { padding: Spacing.four, gap: Spacing.two, maxWidth: 720, alignSelf: 'center', width: '100%' },
  error: { color: '#E74C3C' },
  empty: { color: '#9A9A9A', textAlign: 'center', marginTop: Spacing.four },
  bubble: { borderRadius: Radius.card * 0.7, padding: Spacing.two, maxWidth: '85%' },
  bubbleMine: { backgroundColor: Brand.accent, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: '#F2F2F2', alignSelf: 'flex-start' },
  bubbleSender: { fontSize: 11, fontWeight: '700', color: '#6B6B6B', marginBottom: 2 },
  bubbleText: { color: '#1C1C1C', fontSize: 14 },
  composer: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#F2F2F2', color: '#1C1C1C', borderRadius: Radius.card * 0.7, padding: Spacing.three, fontSize: 14, maxHeight: 100 },
  sendButton: { backgroundColor: Brand.accent, borderRadius: Radius.pill, paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, justifyContent: 'center' },
  sendButtonText: { color: Brand.ink, fontWeight: '800' },
});
