import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { ChatThreadView, type ChatMessage } from '@/components/chat-thread-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { api, type TeamMember } from '@/lib/api-client';
import { setLastSeen } from '@/lib/chat-seen';
import { pickAttachment } from '@/lib/pick-document';

type Channel = 'manager' | 'mia';

// A small floating panel anchored above the ChatFab — like a standard
// website support widget — instead of navigating to a full-screen page.
// Two independent lines share this same component, picked by `channel`:
//   - "manager": human-only, an assigned team member responds when free.
//   - "mia": MIA's own 24/7 line — always replies instantly, no assignment.
export function ChatWidget({
  visible,
  onClose,
  token,
  projectId,
  role,
  channel,
  members,
}: {
  visible: boolean;
  onClose: () => void;
  token: string;
  projectId: string;
  role: 'team' | 'client';
  channel: Channel;
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
      .getChat(token, projectId, channel)
      .then((r) => {
        setResponsible(r.responsible);
        setMessages(r.messages);
        const latest = r.messages[r.messages.length - 1];
        if (latest) setLastSeen(`${channel}:${projectId}`, latest.sentAt);
      })
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    if (visible) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, projectId, channel]);

  if (!visible) return null;

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.sendChatMessage(token, projectId, channel, text.trim());
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

  const title = channel === 'mia' ? '💬 MIA' : '👤 Account manager';
  const subtitle =
    channel === 'mia'
      ? 'Available 24/7'
      : role === 'client'
        ? responsible
          ? `with ${responsible.name}`
          : 'Portugal Production'
        : 'Client chat';
  const placeholder = channel === 'mia' ? 'Ask MIA anything…' : role === 'team' ? 'Message the client…' : 'Write your message…';

  return (
    <>
      <View style={styles.panel}>
        <View style={styles.topBar}>
          <View style={styles.topBarTitleBlock}>
            <ThemedText style={styles.topBarTitle}>{title}</ThemedText>
            <ThemedText style={styles.topBarSubtitle}>{subtitle}</ThemedText>
          </View>
          <View style={styles.topBarActions}>
            {channel === 'manager' && role === 'team' && (
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
          responsibleName={null}
          subtitle=""
          messages={messages}
          mineRole={role}
          placeholder={placeholder}
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
          onAttach={channel === 'manager' ? attachFile : undefined}
          attachHint="attach a file here"
          attaching={attaching}
          greetingTitle={channel === 'mia' ? 'Real-time help' : 'Leave a message'}
          greetingSubtitle={
            channel === 'mia' ? 'Ask me anything, any time — I reply right away' : 'Your account manager will respond as soon as possible'
          }
        />
      </View>

      {channel === 'manager' && role === 'team' && (
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
