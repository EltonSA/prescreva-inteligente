export const FEEDBACK_THREAD_SEEN_EVENT = 'prescreva:feedback-thread-seen'

export type FeedbackThreadScope = 'admin' | 'mine'

function storageKey(scope: FeedbackThreadScope, viewerId: string, ticketId: string) {
  return `prescreva:feedback:thread:${scope}:${viewerId}:ticket:${ticketId}`
}

/**
 * Último instante em que o usuário leu o fio deste ticket.
 * Sem valor: alinha ao último evento do outro lado para não pintar histórico como não lido.
 */
export function getOrInitThreadSeenAt(
  scope: FeedbackThreadScope,
  viewerId: string,
  ticketId: string,
  baselinePeerMessageIso: string | null,
): string {
  if (typeof window === 'undefined') return new Date(0).toISOString()
  const k = storageKey(scope, viewerId, ticketId)
  const existing = localStorage.getItem(k)
  if (existing) return existing
  const seed = baselinePeerMessageIso ?? new Date().toISOString()
  localStorage.setItem(k, seed)
  return seed
}

export function isThreadUnreadFromPeer(
  scope: FeedbackThreadScope,
  viewerId: string,
  ticketId: string,
  lastPeerMessageIso: string | null,
): boolean {
  if (!lastPeerMessageIso || typeof window === 'undefined') return false
  const seen = getOrInitThreadSeenAt(scope, viewerId, ticketId, lastPeerMessageIso)
  return new Date(lastPeerMessageIso).getTime() > new Date(seen).getTime()
}

export function markFeedbackThreadSeen(scope: FeedbackThreadScope, viewerId: string, ticketId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(scope, viewerId, ticketId), new Date().toISOString())
  window.dispatchEvent(new Event(FEEDBACK_THREAD_SEEN_EVENT))
}
