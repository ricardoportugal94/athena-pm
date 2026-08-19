import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { HeroPanel } from '@/components/hero-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { api, type TeamMember } from '@/lib/api-client';

type ChatMessage = { senderRole: 'team' | 'client'; senderName: string; body: string; sentAt: string };

export default function TeamChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { stored } = useAuth();
  const token = stored!.token;

  const [responsible, setResponsible] = useState<{ id: number; name: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pickingResponsible, setPickingResponsible] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api
      .getChat(token, id)
      .then((r) => {
        setResponsible(r.responsible);
        setMessages(r.messages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  };

  useEffect(load, [token, id]);
  useEffect(() => {
    api.teamMembers(token).then(setMembers);
  }, []);

  const assignResponsible = async (member: TeamMember) => {
    try {
      await api.setChatResponsible(token, id, member.id, member.username);
      setResponsible({ id: member.id, name: member.username });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.sendChatMessage(token, id, text.trim());
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
          title={`Chat — ${name ?? 'Project'}`}
          subtitle={responsible ? `Responsible: ${responsible.name}` : 'No one assigned yet'}
          right={
            <View style={styles.heroActions}>
              <Pressable onPress={() => setPickingResponsible(true)} style={styles.pillButton}>
                <ThemedText style={styles.pillButtonText}>{responsible ? 'Change' : 'Assign'}</ThemedText>
              </Pressable>
              <Pressable onPress={() => router.back()} style={styles.pillButton}>
                <ThemedText style={styles.pillButtonText}>Close</ThemedText>
              </Pressable>
            </View>
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
            <View key={i} style={[styles.bubble, m.senderRole === 'team' ? styles.bubbleMine : styles.bubbleTheirs]}>
              <ThemedText style={styles.bubbleSender}>{m.senderName}</ThemedText>
              <ThemedText style={styles.bubbleText}>{m.body}</ThemedText>
            </View>
          ))}
        </ScrollView>

        <View style={styles.composerOuter}>
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
        </View>
      </SafeAreaView>

      <ActionSheet
        visible={pickingResponsible}
        title="Assign chat responsible"
        cancelLabel="Cancel"
        onCancel={() => setPickingResponsible(false)}
        options={members.map((m) => ({ label: m.username, onPress: () => assignResponsible(m) }))}
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
  body: { padding: Spacing.four, gap: Spacing.two, maxWidth: 720, alignSelf: 'center', width: '100%' },
  error: { color: '#E74C3C' },
  empty: { color: '#9A9A9A', textAlign: 'center', marginTop: Spacing.four },
  bubble: { borderRadius: Radius.card * 0.7, padding: Spacing.two, maxWidth: '85%' },
  bubbleMine: { backgroundColor: Brand.accent, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: '#F2F2F2', alignSelf: 'flex-start' },
  bubbleSender: { fontSize: 11, fontWeight: '700', color: '#6B6B6B', marginBottom: 2 },
  bubbleText: { color: '#1C1C1C', fontSize: 14 },
  composerOuter: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  composer: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    alignItems: 'flex-end',
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  input: { flex: 1, backgroundColor: '#F2F2F2', color: '#1C1C1C', borderRadius: Radius.card * 0.7, padding: Spacing.three, fontSize: 14, maxHeight: 100 },
  sendButton: { backgroundColor: Brand.accent, borderRadius: Radius.pill, paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, justifyContent: 'center' },
  sendButtonText: { color: Brand.ink, fontWeight: '800' },
});
