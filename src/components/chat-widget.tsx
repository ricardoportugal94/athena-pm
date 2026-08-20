import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { ChatThreadView, type ChatMessage } from '@/components/chat-thread-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { api, type TeamMember } from '@/lib/api-client';
import { setLastSeen } from '@/lib/chat-seen';
import { pickAttachment } from '@/lib/pick-document';

// A small floating panel anchored above the ChatFab — like a standard
// website support widget — instead of navigating to a full-screen page.
// Handles both the client and team sides: the team side additionally lets
// the current responsible be (re)assigned.
export function ChatWidget({
  visible,
  onClose,
  token,
  projectId,
  role,
  members,
}: {
  visible: boolean;
  onClose: () => void;
  token: string;
  projectId: string;
  role: 'team' | 'client';
  members?: TeamMember[];
}) {
  const [responsible, setResponsible] = useState<{ id: number; name: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickingResponsible, setPickingResponsible] = useState(false);

  const load = () => {
    api
      .getChat(token, projectId)
      .then((r) => {
        setResponsible(r.responsible);
        setMessages(r.messages);
        const latest = r.messages[r.messages.length - 1];
        if (latest) setLastSeen(projectId, latest.sentAt);
      })
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    if (visible) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, projectId]);

  if (!visible) return null;

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.sendChatMessage(token, projectId, text.trim());
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
      await api.sendChatAttachment(token, projectId, form);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAttaching(false);
    }
  };

  const assignResponsible = async (member: TeamMember) => {
    try {
      await api.setChatResponsible(token, projectId, member.id, member.username);
      setResponsible({ id: member.id, name: member.username });
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <>
      <View style={styles.panel}>
        <View style={styles.topBar}>
          <View style={styles.topBarTitleBlock}>
            <ThemedText style={styles.topBarTitle}>💬 MIA</ThemedText>
            <ThemedText style={styles.topBarSubtitle}>
              {role === 'client' ? (responsible ? `with ${responsible.name}` : 'Portugal Production') : 'Client chat'}
            </ThemedText>
          </View>
          <View style={styles.topBarActions}>
            {role === 'team' && (
              <Pressable onPress={() => setPickingResponsible(true)} style={styles.assignButton}>
                <ThemedText style={styles.assignButtonText}>{responsible ? 'Change' : 'Assign'}</ThemedText>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.closeButton}>
              <ThemedText style={styles.closeButtonText}>✕</ThemedText>
            </Pressable>
          </View>
        </View>

        <ChatThreadView
          containerStyle={styles.thread}
          showHeader={false}
          responsibleName={role === 'client' ? responsible?.name ?? null : 'Client'}
          subtitle=""
          messages={messages}
          mineRole={role}
          placeholder={role === 'team' ? 'Message the client, or type "MIA, ..." to ask her' : undefined}
          text={text}
          onChangeText={setText}
          onSend={send}
          sending={sending}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          error={error}
          onAttach={attachFile}
          attaching={attaching}
          greetingTitle="Real-time help"
          greetingSubtitle="How can we help?"
        />
      </View>

      {role === 'team' && (
        <ActionSheet
          visible={pickingResponsible}
          title="Assign chat responsible"
          cancelLabel="Cancel"
          onCancel={() => setPickingResponsible(false)}
          options={(members ?? []).map((m) => ({ label: m.username, onPress: () => assignResponsible(m) }))}
        />
      )}
    </>
  );
}

const WIDTH = 340;
const HEIGHT = 480;

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 92,
    right: 20,
    width: WIDTH,
    height: HEIGHT,
    borderRadius: Radius.card,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...Shadow.card,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.ink,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  topBarTitleBlock: { flex: 1 },
  topBarTitle: { color: Brand.accent, fontWeight: '800', fontSize: 14 },
  topBarSubtitle: { color: 'rgba(228,245,119,0.75)', fontSize: 11, marginTop: 1 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  assignButton: { borderWidth: 1.5, borderColor: Brand.accent, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  assignButtonText: { color: Brand.accent, fontWeight: '700', fontSize: 11 },
  closeButton: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  closeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  thread: { flex: 1, margin: 0, maxWidth: undefined, borderRadius: 0 },
});
