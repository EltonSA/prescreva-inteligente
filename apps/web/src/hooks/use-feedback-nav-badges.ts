'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import {
  FEEDBACK_BADGE_REFRESH_EVENT,
  getOrInitFeedbackAdminLastSeen,
  getOrInitFeedbackMineLastSeen,
} from '@/lib/feedback-badge'

export function useFeedbackNavBadges() {
  const { user } = useAuth()
  const [mineNewCount, setMineNewCount] = useState(0)
  const [adminNewCount, setAdminNewCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) {
      setMineNewCount(0)
      setAdminNewCount(0)
      return
    }
    try {
      const since = getOrInitFeedbackMineLastSeen(user.id)
      const { count } = await api.get<{ count: number }>(
        `/feedback/mine/badge-count?since=${encodeURIComponent(since)}`,
        { skipCache: true },
      )
      setMineNewCount(count)
    } catch {
      setMineNewCount(0)
    }
    if (user.role === 'ADMIN') {
      try {
        const since = getOrInitFeedbackAdminLastSeen(user.id)
        const { count } = await api.get<{ count: number }>(
          `/feedback/admin/badge-count?since=${encodeURIComponent(since)}`,
          { skipCache: true },
        )
        setAdminNewCount(count)
      } catch {
        setAdminNewCount(0)
      }
    } else {
      setAdminNewCount(0)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const t = setInterval(refresh, 45_000)
    const onFocus = () => refresh()
    const onCustom = () => refresh()
    window.addEventListener('focus', onFocus)
    window.addEventListener(FEEDBACK_BADGE_REFRESH_EVENT, onCustom)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(FEEDBACK_BADGE_REFRESH_EVENT, onCustom)
    }
  }, [refresh])

  return { mineNewCount, adminNewCount }
}
