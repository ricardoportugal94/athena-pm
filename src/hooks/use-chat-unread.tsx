import { useEffect, useState } from 'react';

import { getLastSeen } from '@/lib/chat-seen';
import { api } from '@/lib/api-client';

// Polls once on mount — good enough for a "there's something new" dot; the
// chat screen itself marks messages seen when it loads.
export function useChatUnread(token: string | null, projectId: string | null, mineRole: 'team' | 'client', enabled = true) {
  const [unread, setUnread] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);

  useEffect(() => {
    if (!projectId || !enabled) return;
    api
      .getChat(token, projectId)
      .then(async (r) => {
        setTotalMessages(r.messages.length);
        const lastSeen = await getLastSeen(projectId);
        const theirs = r.messages.filter((m: { senderRole: string }) => m.senderRole !== mineRole);
        const latest = theirs[theirs.length - 1];
        setUnread(!!latest && (!lastSeen || latest.sentAt > lastSeen));
      })
      .catch(() => {});
  }, [token, projectId, mineRole, enabled]);

  return { unread, totalMessages };
}
