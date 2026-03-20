/** Evento para atualizar badges de “novo” em Minhas sugestões / Sugestões (admin). */
export const FEEDBACK_BADGE_REFRESH_EVENT = 'prescreva:feedback-badge-refresh'

export function dispatchFeedbackBadgeRefresh() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(FEEDBACK_BADGE_REFRESH_EVENT))
}

function mineKey(userId: string) {
  return `prescreva:feedback:lastSeen:mine:${userId}`
}

function adminKey(userId: string) {
  return `prescreva:feedback:lastSeen:admin:${userId}`
}

/**
 * Última vez que o usuário “viu” a lista Minhas sugestões.
 * Na primeira vez grava um baseline para não marcar histórico inteiro como novo.
 */
export function getOrInitFeedbackMineLastSeen(userId: string): string {
  if (typeof window === 'undefined') return new Date(0).toISOString()
  const k = mineKey(userId)
  let v = localStorage.getItem(k)
  if (!v) {
    v = new Date().toISOString()
    localStorage.setItem(k, v)
  }
  return v
}

export function markFeedbackMineSeen(userId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(mineKey(userId), new Date().toISOString())
  dispatchFeedbackBadgeRefresh()
}

export function getOrInitFeedbackAdminLastSeen(userId: string): string {
  if (typeof window === 'undefined') return new Date(0).toISOString()
  const k = adminKey(userId)
  let v = localStorage.getItem(k)
  if (!v) {
    v = new Date().toISOString()
    localStorage.setItem(k, v)
  }
  return v
}

export function markFeedbackAdminSeen(userId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(adminKey(userId), new Date().toISOString())
  dispatchFeedbackBadgeRefresh()
}
