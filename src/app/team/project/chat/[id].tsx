import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { ChatThreadView, type ChatMessage } from '@/components/chat-thread-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { api, type TeamMember } from '@/lib/api-client';
import { setLastSeen } from '@/lib/chat-seen';
import { pickAttachment } from '@/lib/pick-document';

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
  const [attaching, setAttaching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api
      .getChat(token, id)
      .then((r) => {
        setResponsible(r.responsible);
        setMessages(r.messages);
        const latest = r.messages[r.messages.length - 1];
        if (latest) setLastSeen(id, latest.sentAt);
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

  const attachFile = async () => {
    const form = await pickAttachment();
    if (!form) return;
    setAttaching(true);
    try {
      await api.sendChatAttachment(token, id, form);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAttaching(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <View style={styles.topBarPill}>
            <ThemedText style={styles.topBarPillText}>💬 {name ?? 'Chat'}</ThemedText>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <ThemedText style={styles.closeButtonText}>✕</ThemedText>
          </Pressable>
        </View>

        <ChatThreadView
          responsibleName={responsible?.name ?? null}
          subtitle="Client"
          messages={messages}
          mineRole="team"
          text={text}
          onChangeText={setText}
          onSend={send}
          sending={sending}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          error={error}
          onAttach={attachFile}
          attaching={attaching}
          headerRight={
            <Pressable onPress={() => setPickingResponsible(true)} style={styles.assignButton}>
              <ThemedText style={styles.assignButtonText}>{responsible ? 'Change' : 'Assign'}</ThemedText>
            </Pressable>
          }
        />
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
  topBarPill: { backgroundColor: '#1C1C1C', borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 14, flex: 1, marginRight: Spacing.two },
  topBarPillText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  assignButton: { borderWidth: 1.5, borderColor: '#1C1C1C', borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  assignButtonText: { color: '#1C1C1C', fontWeight: '700', fontSize: 12 },
});
