'use client'

import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { TicketDetailView } from '@/components/feedback/ticket-detail-view'
import { Loader2 } from 'lucide-react'

function TicketDetailInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const from = searchParams.get('from')

  if (!id) {
    return null
  }

  return <TicketDetailView ticketId={id} from={from} />
}

export default function TicketDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
        </div>
      }
    >
      <TicketDetailInner />
    </Suspense>
  )
}
