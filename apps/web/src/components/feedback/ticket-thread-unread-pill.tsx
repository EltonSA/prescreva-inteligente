'use client'

import { useLayoutEffect, useState } from 'react'
import {
  FEEDBACK_THREAD_SEEN_EVENT,
  type FeedbackThreadScope,
  isThreadUnreadFromPeer,
} from '@/lib/feedback-thread-seen'
import { cn } from '@/lib/utils'

/** Indicador estilo WhatsApp quando há mensagem nova do outro lado no fio. */
export function TicketThreadUnreadPill({
  scope,
  viewerId,
  ticketId,
  lastPeerMessageAt,
  caption,
  className,
}: {
  scope: FeedbackThreadScope
  viewerId: string
  ticketId: string
  lastPeerMessageAt: string | null
  caption: string
  className?: string
}) {
  const [unread, setUnread] = useState(false)

  useLayoutEffect(() => {
    const sync = () => {
      if (!viewerId) {
        setUnread(false)
        return
      }
      setUnread(isThreadUnreadFromPeer(scope, viewerId, ticketId, lastPeerMessageAt))
    }
    sync()
    window.addEventListener(FEEDBACK_THREAD_SEEN_EVENT, sync)
    return () => window.removeEventListener(FEEDBACK_THREAD_SEEN_EVENT, sync)
  }, [scope, viewerId, ticketId, lastPeerMessageAt])

  if (!unread) return null

  return (
    <div
      className={cn('flex flex-col items-end gap-0.5', className)}
      title={caption}
    >
      <span className="inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[11px] font-bold tabular-nums leading-none text-white shadow-sm ring-2 ring-white/90">
        +1
      </span>
      <span className="max-w-[7rem] text-right text-[10px] font-semibold leading-tight text-[#128C7E]">
        {caption}
      </span>
    </div>
  )
}
