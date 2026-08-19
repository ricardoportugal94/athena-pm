import { useMemo, type ReactNode } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';

export type ChatAttachment = { url: string; name: string };
export type ChatMessage = {
  senderRole: 'team' | 'client';
  senderName: string;
  body: string;
  sentAt: string;
  attachment?: ChatAttachment | null;
};

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
}

// A Crisp/Intercom-style conversation card: avatar + online dot, date
// separators, bubbles aligned by "is this mine", and a pill composer with a
// round send button — the look the team pointed to as a reference.
export function ChatThreadView({
  responsibleName,
  subtitle,
  messages,
  mineRole,
  text,
  onChangeText,
  onSend,
  sending,
  refreshing,
  onRefresh,
  error,
  headerRight,
  onAttach,
  attaching,
}: {
  responsibleName: string | null;
  subtitle: string;
  messages: ChatMessage[];
  mineRole: 'team' | 'client';
  text: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  error: string | null;
  headerRight?: ReactNode;
  onAttach?: () => void;
  attaching?: boolean;
}) {
  const groups = useMemo(() => {
    const result: { date: string; messages: ChatMessage[] }[] = [];
    for (const m of messages) {
      const label = dateLabel(m.sentAt);
      const last = result[result.length - 1];
      if (last && last.date === label) last.messages.push(m);
      else result.push({ date: label, messages: [m] });
    }
    return result;
  }, [messages]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>{responsibleName ? initials(responsibleName) : '?'}</ThemedText>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.headerText}>
          <ThemedText style={styles.headerName}>{responsibleName ?? 'Unassigned'}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{subtitle}</ThemedText>
        </View>
        {headerRight}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
        {messages.length === 0 && <ThemedText style={styles.empty}>No messages yet.</ThemedText>}
        {groups.map((group) => (
          <View key={group.date}>
            <ThemedText style={styles.dateLabel}>{group.date}</ThemedText>
            {group.messages.map((m, i) => {
              const mine = m.senderRole === mineRole;
              return (
                <View key={i} style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {!mine && <ThemedText style={styles.bubbleSender}>{m.senderName}</ThemedText>}
                    <ThemedText style={mine ? styles.bubbleTextMine : styles.bubbleText}>{m.body}</ThemedText>
                    {m.attachment && (
                      <Pressable onPress={() => Linking.openURL(m.attachment!.url)} style={styles.attachmentChip}>
                        <ThemedText style={styles.attachmentChipText}>📎 {m.attachment.name}</ThemedText>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.composerOuter}>
        <View style={styles.composer}>
          {onAttach && (
            <Pressable style={styles.attachButton} onPress={onAttach} disabled={attaching}>
              <ThemedText style={styles.attachIcon}>{attaching ? '…' : '📎'}</ThemedText>
            </Pressable>
          )}
          <TextInput
            style={styles.input}
            placeholder="Write your message…"
            placeholderTextColor="#9A9A9A"
            value={text}
            onChangeText={onChangeText}
            multiline
          />
          <Pressable
            style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
            onPress={onSend}
            disabled={sending || !text.trim()}
          >
            <ThemedText style={styles.sendIcon}>➤</ThemedText>
          </Pressable>
        </View>
        <ThemedText style={styles.poweredBy}>Athena PM · Portugal Production</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    margin: Spacing.three,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    ...Shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Brand.accent, fontWeight: '800', fontSize: 14 },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3FBF5F',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerText: { flex: 1 },
  headerName: { color: '#1C1C1C', fontWeight: '800', fontSize: 15 },
  headerSubtitle: { color: '#9A9A9A', fontSize: 12 },
  scroll: { flex: 1 },
  body: { padding: Spacing.three, gap: Spacing.one, flexGrow: 1 },
  error: { color: '#E74C3C' },
  empty: { color: '#9A9A9A', textAlign: 'center', marginTop: Spacing.four },
  dateLabel: {
    alignSelf: 'center',
    color: '#9A9A9A',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#F2F2F2',
    borderRadius: Radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginVertical: Spacing.two,
  },
  bubbleRow: { flexDirection: 'row', marginBottom: Spacing.one },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { borderRadius: Radius.card * 0.7, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, maxWidth: '78%' },
  bubbleMine: { backgroundColor: Brand.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#F2F2F2', borderBottomLeftRadius: 4 },
  bubbleSender: { fontSize: 11, fontWeight: '700', color: '#6B6B6B', marginBottom: 2 },
  bubbleText: { color: '#1C1C1C', fontSize: 14 },
  bubbleTextMine: { color: '#1C1C1C', fontSize: 14 },
  attachmentChip: { marginTop: 6, borderRadius: Radius.small, backgroundColor: 'rgba(0,0,0,0.06)', paddingVertical: 4, paddingHorizontal: 8 },
  attachmentChipText: { fontSize: 12, color: '#1C1C1C', fontWeight: '600' },
  composerOuter: { borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: Spacing.three, gap: 4 },
  composer: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' },
  attachButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  attachIcon: { fontSize: 20 },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    color: '#1C1C1C',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.accent, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
  sendIcon: { color: Brand.ink, fontSize: 16, fontWeight: '800' },
  poweredBy: { textAlign: 'center', color: '#B8B8B8', fontSize: 10 },
});
