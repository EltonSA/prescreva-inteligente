'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { markFeedbackThreadSeen } from '@/lib/feedback-thread-seen'

type FeedbackStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'DISMISSED'
type FeedbackCategory = 'SUGESTAO' | 'BUG' | 'OUTRO'

interface ThreadMessage {
  id: string
  body: string
  createdAt: string
  author: { id: string; name: string; role: string }
}

export interface TicketDetail {
  id: string
  title: string
  message: string
  category: FeedbackCategory
  status: FeedbackStatus
  createdAt: string
  updatedAt: string
  userId: string
  user: { id: string; name: string; email: string; role: string }
  messages: ThreadMessage[]
}

export function isTicketClosedStatus(status: FeedbackStatus) {
  return status === 'DONE' || status === 'DISMISSED'
}

const statusLabel: Record<FeedbackStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluído',
  DISMISSED: 'Descartado',
}

const categoryLabel: Record<FeedbackCategory, string> = {
  SUGESTAO: 'Sugestão',
  BUG: 'Bug',
  OUTRO: 'Outro',
}

const statusVariant: Record<FeedbackStatus, 'default' | 'secondary' | 'success' | 'warning'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'secondary',
  DONE: 'success',
  DISMISSED: 'default',
}

function backHref(isAdmin: boolean, from: string | null) {
  if (from === 'admin') return '/dashboard/sugestoes'
  if (from === 'mine') return '/dashboard/minhas-sugestoes'
  return isAdmin ? '/dashboard/sugestoes' : '/dashboard/minhas-sugestoes'
}

function resolveThreadScope(
  from: string | null,
  isAdminUser: boolean,
  ticketUserId: string,
  viewerId: string,
): 'admin' | 'mine' | null {
  if (from === 'admin') return 'admin'
  if (from === 'mine') return 'mine'
  if (ticketUserId === viewerId) return 'mine'
  if (isAdminUser) return 'admin'
  return null
}

export function TicketDetailView({
  ticketId,
  from,
  variant = 'page',
  onTicketUpdated,
}: {
  ticketId: string
  from: string | null
  variant?: 'page' | 'panel'
  onTicketUpdated?: () => void
}) {
  const { user, isAdmin } = useAuth()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<TicketDetail>(`/feedback/${ticketId}`, { skipCache: true })
      setTicket(data)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível carregar o ticket')
      setTicket(null)
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (loading || !ticket || !user) return
    const scope = resolveThreadScope(from, isAdmin, ticket.userId, user.id)
    if (scope) markFeedbackThreadSeen(scope, user.id, ticket.id)
  }, [loading, ticket?.id, ticket?.userId, user?.id, from, isAdmin])

  async function sendReply() {
    const text = reply.trim()
    if (text.length < 1) {
      toast.error('Escreva uma mensagem')
      return
    }
    setSending(true)
    try {
      const msg = await api.post<ThreadMessage>(`/feedback/${ticketId}/messages`, { content: text })
      setReply('')
      setTicket((t) => (t ? { ...t, messages: [...t.messages, msg], updatedAt: new Date().toISOString() } : t))
      toast.success('Mensagem enviada')
      onTicketUpdated?.()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar')
    } finally {
      setSending(false)
    }
  }

  async function updateStatus(status: FeedbackStatus) {
    if (!ticket) return
    setStatusUpdating(true)
    try {
      const updated = await api.patch<TicketDetail & { _count?: { messages: number } }>(`/feedback/${ticket.id}`, {
        status,
      })
      setTicket((t) =>
        t
          ? {
              ...t,
              status: updated.status,
            }
          : t,
      )
      toast.success('Status atualizado')
      onTicketUpdated?.()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar status')
    } finally {
      setStatusUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center', variant === 'panel' ? 'min-h-[200px]' : 'min-h-[40vh]')}>
        <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className={cn('space-y-4', variant === 'page' && 'max-w-2xl mx-auto')}>
        {variant === 'page' && (
          <Link
            href={backHref(!!isAdmin, from)}
            className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        )}
        <p className="text-content-text">Ticket não encontrado ou sem permissão.</p>
      </div>
    )
  }

  const bh = backHref(!!isAdmin, from)
  const isClosed = isTicketClosedStatus(ticket.status)

  return (
    <div className={cn('space-y-5', variant === 'page' && 'max-w-3xl mx-auto pb-8')}>
      {variant === 'page' && (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={bh}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{categoryLabel[ticket.category]}</Badge>
            <Badge variant={statusVariant[ticket.status]}>{statusLabel[ticket.status]}</Badge>
          </div>
        </div>
      )}

      {variant === 'panel' && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{categoryLabel[ticket.category]}</Badge>
          <Badge variant={statusVariant[ticket.status]}>{statusLabel[ticket.status]}</Badge>
          {isClosed && (
            <span className="text-desc-medium text-content-text/80">Encerrado — só leitura</span>
          )}
        </div>
      )}

      <div>
        {variant === 'page' ? (
          <h1 className="text-h1 text-content-title">{ticket.title}</h1>
        ) : (
          <h2 className="text-h2 text-content-title pr-2">{ticket.title}</h2>
        )}
        <p className="text-desc-regular text-content-text mt-1">
          Aberto por <span className="font-medium text-content-title">{ticket.user.name}</span> ·{' '}
          {ticket.user.email}
        </p>
        {isAdmin && (
          <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <span className="text-tag-semibold text-content-title">Status do ticket</span>
            {isClosed ? (
              <p className="text-desc-regular text-content-text">
                Encerrado — não pode ser reaberto nem receber novas mensagens.
              </p>
            ) : (
              <>
                <Select
                  className="max-w-[220px]"
                  value={ticket.status}
                  disabled={statusUpdating}
                  onChange={(e) => updateStatus(e.target.value as FeedbackStatus)}
                >
                  {(Object.keys(statusLabel) as FeedbackStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {statusLabel[s]}
                    </option>
                  ))}
                </Select>
                {statusUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary-dark" />}
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-h3 text-content-title">Conversa</h3>
        <p className="text-desc-regular text-content-text -mt-1">
          {isClosed
            ? 'Histórico do ticket (encerrado).'
            : 'Mensagens registradas neste ticket — mesmo histórico para você e a equipe.'}
        </p>

        <ul className="space-y-3">
          <li
            className={cn(
              'rounded-regular border px-3 py-3',
              ticket.userId === user?.id
                ? 'border-primary-medium/40 bg-primary-light/25 ml-0 mr-2 sm:mr-8'
                : 'border-base-border bg-base-background/80 ml-2 sm:ml-8 mr-0',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <span className="text-tag-semibold text-content-title">{ticket.user.name}</span>
              <span className="text-[11px] text-content-text/60">
                {new Date(ticket.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
            <p className="text-tag-medium text-primary-dark/80 mb-1">Descrição inicial</p>
            <p className="text-paragraph text-content-text whitespace-pre-wrap text-[15px] leading-relaxed">
              {ticket.message}
            </p>
          </li>

          {ticket.messages.map((m) => {
            const mine = m.author.id === user?.id
            const staff = m.author.role === 'ADMIN'
            return (
              <li
                key={m.id}
                className={cn(
                  'rounded-regular border px-3 py-3',
                  mine
                    ? 'border-primary-medium/40 bg-primary-light/25 ml-0 mr-2 sm:mr-8'
                    : 'border-base-border bg-base-white ml-2 sm:ml-8 mr-0',
                  staff && !mine && 'ring-1 ring-primary-accent/25',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="text-tag-semibold text-content-title">
                    {m.author.name}
                    {staff && (
                      <Badge variant="default" className="ml-2 text-[10px] py-0">
                        Equipe
                      </Badge>
                    )}
                  </span>
                  <span className="text-[11px] text-content-text/60">
                    {new Date(m.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-paragraph text-content-text whitespace-pre-wrap text-[15px] leading-relaxed">
                  {m.body}
                </p>
              </li>
            )
          })}
        </ul>
      </div>

      {isClosed ? (
        <div className="rounded-regular border border-base-border bg-base-disable/30 px-4 py-3">
          <p className="text-paragraph text-content-text">
            Este ticket foi encerrado. Não é possível enviar novas mensagens nem reabri-lo.
          </p>
          <p className="text-desc-regular text-content-text/80 mt-2">
            Para um novo assunto, abra outra sugestão pelo menu <strong>Sugerir melhoria</strong>.
          </p>
        </div>
      ) : (
        <div className="rounded-regular border border-base-border bg-base-white p-4 space-y-3">
          <label htmlFor="ticket-reply" className="text-tag-semibold text-content-title">
            Nova mensagem
          </label>
          <Textarea
            id="ticket-reply"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Escreva sua resposta…"
            rows={variant === 'panel' ? 3 : 4}
            className="resize-y min-h-[88px]"
          />
          <Button type="button" onClick={() => sendReply()} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              'Enviar mensagem'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
