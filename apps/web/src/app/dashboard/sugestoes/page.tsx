'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { markFeedbackAdminSeen } from '@/lib/feedback-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TicketConversationDrawer } from '@/components/feedback/ticket-conversation-drawer'
import { TicketThreadUnreadPill } from '@/components/feedback/ticket-thread-unread-pill'
import { Loader2, MessageSquarePlus, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

type FeedbackStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'DISMISSED'
type FeedbackCategory = 'SUGESTAO' | 'BUG' | 'OUTRO'

interface Ticket {
  id: string
  title: string
  message: string
  category: FeedbackCategory
  status: FeedbackStatus
  createdAt: string
  updatedAt: string
  lastUserMessageAt: string | null
  user: { id: string; name: string; email: string; role: string }
  _count: { messages: number }
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

/** Borda esquerda + fundo suave por tipo — facilita escanear a lista */
const categoryVisual: Record<
  FeedbackCategory,
  { bar: string; cardBg: string; badgeClass: string; filterActive: string }
> = {
  SUGESTAO: {
    bar: 'border-l-[5px] border-l-primary-accent',
    cardBg: 'bg-gradient-to-r from-primary-light/45 to-base-white',
    badgeClass: 'bg-primary-accent/15 text-primary-dark border border-primary-accent/35 font-semibold',
    filterActive: 'bg-primary-accent/20 text-primary-dark border-primary-accent ring-2 ring-primary-accent/30',
  },
  BUG: {
    bar: 'border-l-[5px] border-l-[#C62828]',
    cardBg: 'bg-gradient-to-r from-[#FFEBEE]/90 to-base-white',
    badgeClass: 'bg-[#FFCDD2]/90 text-[#B71C1C] border border-[#E57373]/60 font-semibold',
    filterActive: 'bg-[#FFCDD2]/80 text-[#B71C1C] border-[#E57373] ring-2 ring-[#E57373]/35',
  },
  OUTRO: {
    bar: 'border-l-[5px] border-l-[#3949AB]',
    cardBg: 'bg-gradient-to-r from-[#E8EAF6]/95 to-base-white',
    badgeClass: 'bg-[#C5CAE9]/80 text-[#283593] border border-[#7986CB]/45 font-semibold',
    filterActive: 'bg-[#C5CAE9]/90 text-[#283593] border-[#7986CB] ring-2 ring-[#7986CB]/30',
  },
}

type CategoryFilter = 'all' | FeedbackCategory
type StatusFilter = 'all' | FeedbackStatus

const statusFilterActive: Record<StatusFilter, string> = {
  all: 'border-primary-dark bg-primary-light/55 text-primary-dark ring-2 ring-primary-dark/12',
  OPEN: 'border-[#F9A825] bg-[#FFFDE7] text-[#F57F17] ring-2 ring-[#FFE082]/90',
  IN_PROGRESS: 'border-primary-medium bg-primary-light/90 text-primary-dark ring-2 ring-primary-medium/40',
  DONE: 'border-primary-accent bg-primary-light text-primary-dark ring-2 ring-primary-accent/35',
  DISMISSED: 'border-base-border bg-base-disable/80 text-content-title ring-2 ring-base-border/70',
}

function FilterCount({ value }: { value: number }) {
  return (
    <span
      className="inline-flex min-w-[1.375rem] items-center justify-center rounded-full border border-base-border/50 bg-base-white px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none text-content-text/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      aria-hidden
    >
      {value}
    </span>
  )
}

function isTicketClosed(status: FeedbackStatus) {
  return status === 'DONE' || status === 'DISMISSED'
}

function startOfDayLocal(ymd: string): Date | null {
  if (!ymd) return null
  const d = new Date(`${ymd}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function endOfDayLocal(ymd: string): Date | null {
  if (!ymd) return null
  const d = new Date(`${ymd}T23:59:59.999`)
  return Number.isNaN(d.getTime()) ? null : d
}

export default function SugestoesAdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerTicketId, setDrawerTicketId] = useState<string | null>(null)

  const [filterUserId, setFilterUserId] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<CategoryFilter>('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [authLoading, isAdmin, router])

  async function load() {
    setLoading(true)
    try {
      const data = await api.get<Ticket[]>('/feedback/admin', { skipCache: true })
      setTickets(data)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar sugestões')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin])

  useEffect(() => {
    if (isAdmin && !loading && user?.id) {
      markFeedbackAdminSeen(user.id)
    }
  }, [isAdmin, loading, user?.id])

  const userOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>()
    for (const t of tickets) {
      if (!map.has(t.user.id)) {
        map.set(t.user.id, { id: t.user.id, name: t.user.name, email: t.user.email })
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [tickets])

  const filteredTickets = useMemo(() => {
    const fromD = startOfDayLocal(filterDateFrom)
    const toD = endOfDayLocal(filterDateTo)

    return tickets.filter((t) => {
      if (filterUserId && t.user.id !== filterUserId) return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      if (filterStatus !== 'all' && t.status !== filterStatus) return false
      const created = new Date(t.createdAt)
      if (fromD && created < fromD) return false
      if (toD && created > toD) return false
      return true
    })
  }, [tickets, filterUserId, filterCategory, filterStatus, filterDateFrom, filterDateTo])

  const hasActiveFilters =
    !!filterUserId ||
    filterCategory !== 'all' ||
    filterStatus !== 'all' ||
    !!filterDateFrom ||
    !!filterDateTo

  function clearFilters() {
    setFilterUserId('')
    setFilterCategory('all')
    setFilterStatus('all')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const categoryCounts = useMemo(() => {
    let sug = 0,
      bug = 0,
      out = 0
    for (const t of tickets) {
      if (t.category === 'SUGESTAO') sug++
      else if (t.category === 'BUG') bug++
      else out++
    }
    return { sug, bug, out, total: tickets.length }
  }, [tickets])

  const statusCounts = useMemo(() => {
    const c: Record<FeedbackStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      DONE: 0,
      DISMISSED: 0,
    }
    for (const t of tickets) {
      c[t.status]++
    }
    return c
  }, [tickets])

  if (authLoading || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-h1 text-content-title">Todas as sugestões</h1>
        <p className="text-paragraph text-content-text mt-2">
          Filtre por usuário, status, período e tipo. Cada tipo tem uma cor na lista para leitura rápida.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
        </div>
      ) : tickets.length === 0 ? (
        <Card className="border-base-border">
          <CardContent className="py-12 text-center text-content-text">
            Nenhuma sugestão registrada ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-base-border shadow-sm overflow-hidden">
            <CardContent className="p-4 sm:p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-tag-semibold text-content-title min-w-0">
                  <SlidersHorizontal className="w-4 h-4 shrink-0 text-primary-dark" strokeWidth={1.75} />
                  <span className="min-w-0">Filtros</span>
                  {hasActiveFilters && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-desc-medium text-error hover:bg-error/5"
                      onClick={clearFilters}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                  {!filtersExpanded && hasActiveFilters && (
                    <span className="hidden sm:inline rounded-full border border-primary-medium/35 bg-primary-light/50 px-2.5 py-0.5 text-[11px] font-medium text-primary-dark">
                      Filtros ativos
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1"
                    onClick={() => setFiltersExpanded((v) => !v)}
                    aria-expanded={filtersExpanded}
                    aria-controls="admin-filters-detail"
                    id="admin-filters-toggle"
                  >
                    {filtersExpanded ? (
                      <>
                        Recolher filtros
                        <ChevronUp className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </>
                    ) : (
                      <>
                        Mostrar filtros
                        <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div
                id="admin-filters-detail"
                role="region"
                aria-labelledby="admin-filters-toggle"
                className={cn(
                  'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                  filtersExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-5 pb-0.5" inert={!filtersExpanded ? true : undefined}>
                    <div>
                      <p className="text-tag-semibold text-content-title mb-2">Tipo</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setFilterCategory('all')}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-small border px-3 py-2.5 text-tag-medium transition-all',
                            filterCategory === 'all'
                              ? 'border-primary-dark bg-primary-light/50 text-primary-dark ring-2 ring-primary-dark/15'
                              : 'border-base-border bg-base-white text-content-text hover:bg-base-disable/50',
                          )}
                        >
                          Todos
                          <FilterCount value={categoryCounts.total} />
                        </button>
                        {(['SUGESTAO', 'BUG', 'OUTRO'] as const).map((cat) => {
                          const n =
                            cat === 'SUGESTAO'
                              ? categoryCounts.sug
                              : cat === 'BUG'
                                ? categoryCounts.bug
                                : categoryCounts.out
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setFilterCategory(cat)}
                              className={cn(
                                'inline-flex items-center gap-2 rounded-small border px-3 py-2.5 text-tag-medium transition-all',
                                filterCategory === cat
                                  ? categoryVisual[cat].filterActive
                                  : 'border-base-border bg-base-white text-content-text hover:bg-base-disable/50',
                              )}
                            >
                              {categoryLabel[cat]}
                              <FilterCount value={n} />
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-tag-semibold text-content-title mb-2">Status</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setFilterStatus('all')}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-small border px-3 py-2.5 text-tag-medium transition-all',
                            filterStatus === 'all'
                              ? statusFilterActive.all
                              : 'border-base-border bg-base-white text-content-text hover:bg-base-disable/50',
                          )}
                        >
                          Todos
                          <FilterCount value={tickets.length} />
                        </button>
                        {(['OPEN', 'IN_PROGRESS', 'DONE', 'DISMISSED'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFilterStatus(s)}
                            className={cn(
                              'inline-flex items-center gap-2 rounded-small border px-3 py-2.5 text-tag-medium transition-all',
                              filterStatus === s
                                ? statusFilterActive[s]
                                : 'border-base-border bg-base-white text-content-text hover:bg-base-disable/50',
                            )}
                          >
                            {statusLabel[s]}
                            <FilterCount value={statusCounts[s]} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1.5">
                        <label htmlFor="flt-user" className="text-tag-semibold text-content-title block">
                          Usuário
                        </label>
                        <Select
                          id="flt-user"
                          value={filterUserId}
                          onChange={(e) => setFilterUserId(e.target.value)}
                          className="w-full h-11 border-base-border/90 bg-base-background/50"
                        >
                          <option value="">Todos os usuários</option>
                          {userOptions.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} — {u.email}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="flt-from" className="text-desc-medium text-content-text block">
                          Data inicial
                        </label>
                        <Input
                          id="flt-from"
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                          className="h-11 border-base-border/90 bg-base-background/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="flt-to" className="text-desc-medium text-content-text block">
                          Data final
                        </label>
                        <Input
                          id="flt-to"
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                          className="h-11 border-base-border/90 bg-base-background/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-desc-regular text-content-text/80 border-t border-base-border pt-3">
                Mostrando <strong className="text-content-title">{filteredTickets.length}</strong> de{' '}
                <strong className="text-content-title">{tickets.length}</strong> ticket(s) — ordenados do mais
                recente ao mais antigo (por atualização).
              </p>
            </CardContent>
          </Card>

          {filteredTickets.length === 0 ? (
            <Card className="border-base-border border-dashed">
              <CardContent className="py-10 text-center space-y-3">
                <p className="text-paragraph text-content-text">Nenhum ticket com os filtros atuais.</p>
                <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {filteredTickets.map((t) => {
                const vis = categoryVisual[t.category]
                return (
                  <li key={t.id}>
                    <Card
                      className={cn(
                        'border border-base-border shadow-sm overflow-hidden transition-shadow hover:shadow-md',
                        vis.bar,
                        vis.cardBg,
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-huge px-2.5 py-0.5 text-[11px] uppercase tracking-wide',
                                  vis.badgeClass,
                                )}
                              >
                                {categoryLabel[t.category]}
                              </span>
                              <Badge variant={statusVariant[t.status]}>{statusLabel[t.status]}</Badge>
                            </div>
                            <p className="text-h3 text-content-title mt-1">{t.title}</p>
                            <p className="text-desc-regular text-content-text mt-1">
                              <span className="font-medium text-content-title">{t.user.name}</span> ·{' '}
                              {t.user.email}
                            </p>
                            <p className="text-paragraph text-content-text line-clamp-2 mt-2">{t.message}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <span className="text-desc-regular text-content-text/70 flex items-center gap-1">
                                <MessageSquarePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                                {t._count.messages} resposta{t._count.messages !== 1 ? 's' : ''}
                              </span>
                              <span className="text-[11px] text-content-text/50">
                                Criado {new Date(t.createdAt).toLocaleString('pt-BR')} · Atualizado{' '}
                                {new Date(t.updatedAt).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {user?.id ? (
                              <TicketThreadUnreadPill
                                scope="admin"
                                viewerId={user.id}
                                ticketId={t.id}
                                lastPeerMessageAt={t.lastUserMessageAt}
                                caption="Nova pergunta"
                              />
                            ) : null}
                            <Button
                              type="button"
                              variant={isTicketClosed(t.status) ? 'outline' : 'default'}
                              className="shrink-0"
                              onClick={() => setDrawerTicketId(t.id)}
                            >
                              {isTicketClosed(t.status) ? 'Ver histórico' : 'Abrir conversa'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => load()}>
              Atualizar lista
            </Button>
          </div>
        </>
      )}

      <TicketConversationDrawer
        open={!!drawerTicketId}
        ticketId={drawerTicketId}
        from="admin"
        onOpenChange={(open) => {
          if (!open) setDrawerTicketId(null)
        }}
        onTicketUpdated={load}
      />
    </div>
  )
}
