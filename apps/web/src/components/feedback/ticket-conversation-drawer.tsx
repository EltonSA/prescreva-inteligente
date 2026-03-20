'use client'

import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { TicketDetailView } from '@/components/feedback/ticket-detail-view'

type PanelFrom = 'admin' | 'mine'

export function TicketConversationDrawer({
  open,
  onOpenChange,
  ticketId,
  from,
  onTicketUpdated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string | null
  from: PanelFrom
  onTicketUpdated?: () => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="wide" className="max-w-[min(100vw,640px)] border-l border-base-border">
        <DrawerHeader className="shrink-0">
          <div className="min-w-0 flex-1 pr-2">
            <DrawerTitle className="truncate">Conversa do ticket</DrawerTitle>
            <DrawerDescription className="mt-1">
              {from === 'admin'
                ? 'Responda ao cliente no mesmo fio. Tickets encerrados são só leitura.'
                : 'Acompanhe as respostas da equipe aqui.'}
            </DrawerDescription>
          </div>
          <DrawerCloseButton />
        </DrawerHeader>
        <DrawerBody className="pt-2">
          {ticketId ? (
            <TicketDetailView
              key={ticketId}
              ticketId={ticketId}
              from={from}
              variant="panel"
              onTicketUpdated={onTicketUpdated}
            />
          ) : null}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}
