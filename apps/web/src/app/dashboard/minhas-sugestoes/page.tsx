'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { markFeedbackMineSeen } from '@/lib/feedback-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TicketConversationDrawer } from '@/components/feedback/ticket-conversation-drawer'
import { TicketThreadUnreadPill } from '@/components/feedback/ticket-thread-unread-pill'
import {
  Loader2,
  MessageSquarePlus,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

type Category = 'SUGESTAO' | 'BUG' | 'OUTRO'
type FeedbackStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'DISMISSED'

interface Row {
  id: string
  title: string
  message: string
  category: Category
  status: FeedbackStatus
  createdAt: string
  updatedAt: string
  lastAdminMessageAt: string | null
  _count: { messages: number }
}

const statusLabel: Record<FeedbackStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluído',
  DISMISSED: 'Descartado',
}

const categoryLabel: Record<Category, string> = {
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

const categoryVisual: Record<
  Category,
  { bar: string; cardBg: string; filterActive: string }
> = {
  SUGESTAO: {
    bar: 'border-l-[4px] border-l-primary-accent',
    cardBg: 'bg-gradient-to-r from-primary-light/40 to-base-white',
    filterActive: 'bg-primary-accent/20 text-primary-dark border-primary-accent ring-2 ring-primary-accent/30',
  },
  BUG: {
    bar: 'border-l-[4px] border-l-[#C62828]',
    cardBg: 'bg-gradient-to-r from-[#FFEBEE]/80 to-base-white',
    filterActive: 'bg-[#FFCDD2]/80 text-[#B71C1C] border-[#E57373] ring-2 ring-[#E57373]/35',
  },
  OUTRO: {
    bar: 'border-l-[4px] border-l-[#3949AB]',
    cardBg: 'bg-gradient-to-r from-[#E8EAF6]/85 to-base-white',
    filterActive: 'bg-[#C5CAE9]/90 text-[#283593] border-[#7986CB] ring-2 ring-[#7986CB]/30',
  },
}

const categoryChip: Record<Category, string> = {
  SUGESTAO: 'border-primary-accent/45 bg-primary-light/65 text-primary-dark',
  BUG: 'border-[#E57373]/45 bg-[#FFEBEE] text-[#B71C1C]',
  OUTRO: 'border-[#7986CB]/45 bg-[#E8EAF6] text-[#283593]',
}

type CategoryFilter = 'all' | Category
type StatusFilter = 'all' | FeedbackStatus

/** Contagem compacta nos filtros (evita texto solto com parênteses) */
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

const statusFilterActive: Record<StatusFilter, string> = {
  all: 'border-primary-dark bg-primary-light/55 text-primary-dark ring-2 ring-primary-dark/12',
  OPEN: 'border-[#F9A825] bg-[#FFFDE7] text-[#F57F17] ring-2 ring-[#FFE082]/90',
  IN_PROGRESS: 'border-primary-medium bg-primary-light/90 text-primary-dark ring-2 ring-primary-medium/40',
  DONE: 'border-primary-accent bg-primary-light text-primary-dark ring-2 ring-primary-accent/35',
  DISMISSED: 'border-base-border bg-base-disable/80 text-content-title ring-2 ring-base-border/70',
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

function MinhasSugestoesInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const openedFromQuery = useRef(false)

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerTicketId, setDrawerTicketId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<CategoryFilter>('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const data = await api.get<Row[]>('/feedback/mine', { skipCache: true })
      setRows(data)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!loading && user?.id) {
      markFeedbackMineSeen(user.id)
    }
  }, [loading, user?.id])

  useEffect(() => {
    const o = searchParams.get('open')
    if (o && !openedFromQuery.current) {
      openedFromQuery.current = true
      setDrawerTicketId(o)
      router.replace('/dashboard/minhas-sugestoes', { scroll: false })
    }
  }, [searchParams, router])

  const categoryCounts = useMemo(() => {
    let sug = 0,
      bug = 0,
      out = 0
    for (const r of rows) {
      if (r.category === 'SUGESTAO') sug++
      else if (r.category === 'BUG') bug++
      else out++
    }
    return { sug, bug, out, total: rows.length }
  }, [rows])

  const statusCounts = useMemo(() => {
    const c: Record<FeedbackStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      DONE: 0,
      DISMISSED: 0,
    }
    for (const r of rows) {
      c[r.status]++
    }
    return c
  }, [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromD = startOfDayLocal(filterDateFrom)
    const toD = endOfDayLocal(filterDateTo)

    return rows.filter((r) => {
      if (filterCategory !== 'all' && r.category !== filterCategory) return false
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      const created = new Date(r.createdAt)
      if (fromD && created < fromD) return false
      if (toD && created > toD) return false
      if (q) {
        const inTitle = r.title.toLowerCase().includes(q)
        const inMsg = r.message.toLowerCase().includes(q)
        if (!inTitle && !inMsg) return false
      }
      return true
    })
  }, [rows, search, filterCategory, filterStatus, filterDateFrom, filterDateTo])

  const hasActiveFilters =
    !!search.trim() ||
    filterCategory !== 'all' ||
    filterStatus !== 'all' ||
    !!filterDateFrom ||
    !!filterDateTo

  const hasRefinementFilters =
    filterCategory !== 'all' || filterStatus !== 'all' || !!filterDateFrom || !!filterDateTo

  function clearFilters() {
    setSearch('')
    setFilterCategory('all')
    setFilterStatus('all')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-h1 text-content-title">Minhas sugestões</h1>
        <p className="text-paragraph text-content-text mt-2">
          Use os filtros para achar um ticket. Toque no card para abrir a conversa à direita.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-base-border">
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-content-text">Você ainda não enviou sugestões.</p>
            <p className="text-desc-regular text-content-text">
              Use <strong>Sugerir melhoria</strong> no menu para abrir o primeiro ticket.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-base-border shadow-sm overflow-hidden">
            <CardContent className="p-4 sm:p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-tag-semibold text-content-title min-w-0">
                  <SlidersHorizontal className="w-4 h-4 shrink-0 text-primary-dark" strokeWidth={1.75} />
                  <span className="min-w-0">Buscar e filtrar</span>
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
                  {!filtersExpanded && hasRefinementFilters && (
                    <span className="hidden sm:inline rounded-full border border-primary-medium/35 bg-primary-light/50 px-2.5 py-0.5 text-[11px] font-medium text-primary-dark">
                      Refinamento ativo
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1"
                    onClick={() => setFiltersExpanded((v) => !v)}
                    aria-expanded={filtersExpanded}
                    aria-controls="mine-filters-detail"
                    id="mine-filters-toggle"
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

              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-text/45"
                  strokeWidth={1.75}
                />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título ou descrição…"
                  className="h-11 pl-10 border-base-border/90 bg-base-background/50"
                  aria-label="Buscar nos seus tickets"
                />
              </div>

              <div
                id="mine-filters-detail"
                role="region"
                aria-labelledby="mine-filters-toggle"
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
                          <FilterCount value={rows.length} />
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

                    <div>
                      <p className="text-tag-semibold text-content-title mb-2">Data de criação</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label htmlFor="mine-from" className="text-desc-medium text-content-text block">
                            De
                          </label>
                          <Input
                            id="mine-from"
                            type="date"
                            value={filterDateFrom}
                            onChange={(e) => setFilterDateFrom(e.target.value)}
                            className="h-11 border-base-border/90 bg-base-background/50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="mine-to" className="text-desc-medium text-content-text block">
                            Até
                          </label>
                          <Input
                            id="mine-to"
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
              </div>

              <p className="text-desc-regular text-content-text/80 border-t border-base-border pt-3">
                Mostrando <strong className="text-content-title">{filteredRows.length}</strong> de{' '}
                <strong className="text-content-title">{rows.length}</strong> ticket(s).
              </p>
            </CardContent>
          </Card>

          {filteredRows.length === 0 ? (
            <Card className="border-base-border border-dashed">
              <CardContent className="py-10 text-center space-y-3">
                <p className="text-paragraph text-content-text">Nenhum ticket com esses filtros ou busca.</p>
                <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {filteredRows.map((r) => {
                const vis = categoryVisual[r.category]
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full rounded-regular border border-base-border p-4 text-left shadow-sm transition-all',
                        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/25',
                        vis.bar,
                        vis.cardBg,
                      )}
                      onClick={() => setDrawerTicketId(r.id)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-tag-bold text-content-title">{r.title}</span>
                            <span
                              className={cn(
                                'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
                                categoryChip[r.category],
                              )}
                            >
                              {categoryLabel[r.category]}
                            </span>
                          </div>
                          <p className="text-desc-regular text-content-text line-clamp-2 mt-1">{r.message}</p>
                        </div>
                        <div className="flex flex-wrap items-end justify-end gap-2 shrink-0">
                          {user?.id ? (
                            <TicketThreadUnreadPill
                              scope="mine"
                              viewerId={user.id}
                              ticketId={r.id}
                              lastPeerMessageAt={r.lastAdminMessageAt}
                              caption="Nova resposta"
                            />
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-base-border/50 bg-base-white px-2 py-0.5 text-[11px] font-medium tabular-nums text-content-text/75"
                              title="Mensagens no ticket"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                              {r._count.messages}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-content-text/50 mt-2 border-t border-base-border/50 pt-2">
                        Criado {new Date(r.createdAt).toLocaleString('pt-BR')}
                        {isTicketClosed(r.status) ? ' · Encerrado' : ''} · Atualizado{' '}
                        {new Date(r.updatedAt).toLocaleString('pt-BR')}
                      </p>
                    </button>
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
        from="mine"
        onOpenChange={(open) => {
          if (!open) setDrawerTicketId(null)
        }}
        onTicketUpdated={load}
      />
    </div>
  )
}

export default function MinhasSugestoesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
        </div>
      }
    >
      <MinhasSugestoesInner />
    </Suspense>
  )
}
