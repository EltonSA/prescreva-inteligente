'use client'

import { cn } from '@/lib/utils'

/** Indicador numérico compacto para novos tickets no menu. */
export function FeedbackNavBadgeChip({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  const text = count > 9 ? '+9+' : `+${count}`
  return (
    <span
      className={cn(
        'pointer-events-none inline-flex min-h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[#25D366] px-1 text-[10px] font-bold tabular-nums leading-none text-white shadow-sm ring-2 ring-base-white',
        className,
      )}
      aria-hidden
    >
      {text}
    </span>
  )
}
