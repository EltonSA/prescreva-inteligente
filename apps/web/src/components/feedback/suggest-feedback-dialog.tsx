'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { MessageSquarePlus, Loader2, AlertCircle, ListChecks } from 'lucide-react'
import toast from 'react-hot-toast'
import { dispatchFeedbackBadgeRefresh } from '@/lib/feedback-badge'
import { cn } from '@/lib/utils'

type Category = 'SUGESTAO' | 'BUG' | 'OUTRO'

const categoryLabel: Record<Category, string> = {
  SUGESTAO: 'Sugestão',
  BUG: 'Bug / problema',
  OUTRO: 'Outro',
}

const categoryPillActive: Record<Category, string> = {
  SUGESTAO:
    'border-primary-accent bg-primary-light/70 text-primary-dark ring-2 ring-primary-accent/25 shadow-sm',
  BUG: 'border-[#C62828] bg-[#FFEBEE]/90 text-[#B71C1C] ring-2 ring-[#E57373]/25 shadow-sm',
  OUTRO: 'border-[#3949AB] bg-[#E8EAF6]/95 text-[#283593] ring-2 ring-[#7986CB]/25 shadow-sm',
}

const categoryListAccent: Record<Category, string> = {
  SUGESTAO: 'border-l-primary-accent bg-primary-light/20',
  BUG: 'border-l-[#C62828] bg-[#FFEBEE]/40',
  OUTRO: 'border-l-[#3949AB] bg-[#E8EAF6]/50',
}

const statusLabel: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluído',
  DISMISSED: 'Descartado',
}

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'secondary',
  DONE: 'success',
  DISMISSED: 'default',
}

const fieldClass =
  'min-h-[48px] border-base-border/90 bg-base-background/60 px-[14px] text-paragraph transition-colors focus:border-primary-accent focus:bg-base-white focus:ring-primary-accent/25'

interface MineTicket {
  id: string
  title: string
  message: string
  category: Category
  status: string
  createdAt: string
  _count?: { messages: number }
}

export function SuggestFeedbackDialog({
  collapsed,
  children,
}: {
  collapsed?: boolean
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<Category>('SUGESTAO')
  const [sending, setSending] = useState(false)
  const [mine, setMine] = useState<MineTicket[]>([])
  const [loadingMine, setLoadingMine] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function loadMine() {
    setLoadingMine(true)
    try {
      const data = await api.get<MineTicket[]>('/feedback/mine', { skipCache: true })
      setMine(data)
    } catch {
      setMine([])
    } finally {
      setLoadingMine(false)
    }
  }

  useEffect(() => {
    if (open) loadMine()
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (title.trim().length < 3) {
      const t = 'Informe um título (mín. 3 caracteres)'
      setFormError(t)
      toast.error(t)
      return
    }
    if (message.trim().length < 10) {
      const t = 'Descreva com um pouco mais de detalhe (mín. 10 caracteres)'
      setFormError(t)
      toast.error(t)
      return
    }
    setSending(true)
    try {
      await api.post('/feedback', {
        title: title.trim(),
        message: message.trim(),
        category,
      })
      toast.success('Obrigado! Sua sugestão foi registrada.')
      setTitle('')
      setMessage('')
      setCategory('SUGESTAO')
      setFormError(null)
      await loadMine()
      dispatchFeedbackBadgeRefresh()
    } catch (err: unknown) {
      const t = err instanceof Error ? err.message : 'Não foi possível enviar'
      setFormError(t)
      toast.error(t)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <button
            type="button"
            className={cn(
              'flex items-center rounded-small text-tag-medium transition-all border border-solid border-base-border',
              collapsed ? 'justify-center px-0 py-[12px] w-full' : 'gap-[12px] px-[12px] py-[12px] w-full',
              'text-content-text hover:bg-primary-light'
            )}
            title="Sugerir melhoria"
          >
            <MessageSquarePlus className="w-[18px] h-[18px] flex-shrink-0 text-primary-dark" strokeWidth={1.5} />
            {!collapsed && <span className="truncate text-left">Sugerir melhoria</span>}
          </button>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn(
          'max-h-[92vh] overflow-y-auto gap-0 p-0 sm:max-w-[600px]',
          'rounded-regular border border-base-border/90 bg-base-white',
          'shadow-[0_4px_28px_rgba(62,90,78,0.1),0_1px_3px_rgba(0,0,0,0.05)] ring-1 ring-primary-dark/[0.06]',
          '[&>button]:right-4 [&>button]:top-4 [&>button]:rounded-small [&>button]:text-content-text/70 [&>button]:hover:bg-primary-light [&>button]:hover:text-content-title',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_90%_80%_at_50%_-20%,rgba(192,210,190,0.45),transparent_65%)]" />

        <div className="relative px-6 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-9">
          <DialogHeader className="space-y-0 text-left">
            <div className="mb-5 flex flex-col items-center text-center sm:mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-regular bg-primary-light ring-1 ring-primary-medium/35">
                <MessageSquarePlus className="h-6 w-6 text-primary-dark" strokeWidth={1.5} />
              </div>
              <div
                className="mb-3 mt-5 h-1 w-11 rounded-full bg-gradient-to-r from-primary-accent to-primary-medium"
                aria-hidden
              />
              <DialogTitle className="text-h2 tracking-tight text-content-title">Sugerir melhoria</DialogTitle>
              <DialogDescription className="mt-3 max-w-[420px] text-paragraph leading-relaxed text-content-text">
                Abre um ticket para a equipe. Você acompanha e responde em{' '}
                <strong className="font-semibold text-content-title">Minhas sugestões</strong>, no mesmo fio.
              </DialogDescription>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="fb-title" className="block text-tag-semibold text-content-title">
                Título resumido
              </label>
              <Input
                id="fb-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setFormError(null)
                }}
                placeholder="Ex.: Atalho para duplicar fórmula"
                maxLength={160}
                className={fieldClass}
              />
              <p className="text-desc-regular text-content-text/60">Mínimo 3 caracteres · até 160</p>
            </div>

            <div className="space-y-2">
              <span className="block text-tag-semibold text-content-title">Tipo do ticket</span>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {(['SUGESTAO', 'BUG', 'OUTRO'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setCategory(k)
                      setFormError(null)
                    }}
                    className={cn(
                      'flex-1 rounded-small border px-3 py-2.5 text-center text-tag-medium transition-all sm:min-w-[7.5rem]',
                      category === k
                        ? categoryPillActive[k]
                        : 'border-base-border bg-base-white text-content-text hover:border-primary-medium/50 hover:bg-primary-light/30',
                    )}
                  >
                    {categoryLabel[k]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="fb-msg" className="block text-tag-semibold text-content-title">
                Descrição
              </label>
              <Textarea
                id="fb-msg"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  setFormError(null)
                }}
                placeholder="Contexto, o que você esperava e o que aconteceu…"
                rows={5}
                className={cn(
                  'min-h-[132px] resize-y rounded-small border-base-border/90 bg-base-background/60 px-[14px] py-3 text-paragraph transition-colors',
                  'focus:border-primary-accent focus:bg-base-white focus:outline-none focus:ring-2 focus:ring-primary-accent/25',
                )}
              />
              <p className="text-desc-regular text-content-text/60">Mínimo 10 caracteres</p>
            </div>

            {formError && (
              <div
                role="alert"
                className="flex gap-3 rounded-small border border-error/25 bg-error/[0.06] p-3.5 text-paragraph text-error"
              >
                <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
                <span>{formError}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={sending}
              className="h-[52px] w-full rounded-regular text-tag-semibold shadow-md shadow-primary-dark/15 transition-shadow hover:shadow-lg hover:shadow-primary-dark/22"
            >
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enviando…
                </span>
              ) : (
                'Enviar sugestão'
              )}
            </Button>
          </form>

          <div className="mt-8 border-t border-base-border/90 pt-6">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-small bg-base-disable/80 text-primary-dark">
                <ListChecks className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-tag-semibold text-content-title">Suas sugestões recentes</p>
                <p className="text-desc-regular text-content-text/70">Últimos envios e status</p>
              </div>
            </div>

            {loadingMine ? (
              <div className="flex items-center gap-2 py-6 text-desc-regular text-content-text">
                <Loader2 className="h-4 w-4 animate-spin text-primary-dark" />
                Carregando…
              </div>
            ) : mine.length === 0 ? (
              <p className="rounded-small border border-dashed border-base-border bg-base-background/50 px-4 py-5 text-center text-desc-regular text-content-text">
                Nenhuma ainda — envie a primeira usando o formulário acima.
              </p>
            ) : (
              <ul className="max-h-[240px] space-y-2.5 overflow-y-auto pr-1 scrollbar-thin">
                {mine.slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className={cn(
                      'rounded-small border border-base-border/80 border-l-[3px] px-3.5 py-3 shadow-sm',
                      categoryListAccent[t.category],
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-tag-medium text-content-title line-clamp-1 min-w-0 flex-1">
                        {t.title}
                      </span>
                      <Badge variant={statusVariant[t.status] ?? 'secondary'} className="shrink-0">
                        {statusLabel[t.status] ?? t.status}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-desc-regular text-content-text line-clamp-2">{t.message}</p>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-base-border/40 pt-2">
                      <p className="text-[11px] text-content-text/55">
                        {new Date(t.createdAt).toLocaleString('pt-BR')}
                        {typeof t._count?.messages === 'number' && (
                          <span className="ml-2">· {t._count.messages} resposta(s)</span>
                        )}
                      </p>
                      <Link
                        href={`/dashboard/minhas-sugestoes?open=${encodeURIComponent(t.id)}`}
                        onClick={() => setOpen(false)}
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'h-8 border-primary-medium/40 text-[12px] hover:bg-primary-light/50',
                        )}
                      >
                        Abrir conversa
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SuggestFeedbackHeaderButton() {
  return (
    <SuggestFeedbackDialog>
      <button
        type="button"
        className="lg:hidden w-9 h-9 rounded-small flex items-center justify-center border border-base-border hover:bg-primary-light transition-colors"
        title="Sugerir melhoria"
        aria-label="Sugerir melhoria"
      >
        <MessageSquarePlus className="w-[20px] h-[20px] text-primary-dark" strokeWidth={1.5} />
      </button>
    </SuggestFeedbackDialog>
  )
}
