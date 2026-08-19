// Local (per-device) "last seen" marker for chat unread badges — there's no
// server-side read-receipt concept, this is just enough to know whether to
// show a dot on the chat bubble.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'athena_chat_seen_';

export async function getLastSeen(projectId: string): Promise<string | null> {
  return AsyncStorage.getItem(KEY_PREFIX + projectId);
}

export async function setLastSeen(projectId: string, sentAt: string): Promise<void> {
  await AsyncStorage.setItem(KEY_PREFIX + projectId, sentAt);
}
