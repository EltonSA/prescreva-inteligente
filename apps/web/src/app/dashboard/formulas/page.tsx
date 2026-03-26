'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
  DrawerCloseButton,
} from '@/components/ui/drawer'
import {
  Plus,
  Pencil,
  Search,
  Beaker,
  Scissors,
  Eye,
  Smile,
  Sparkles,
  Star,
  Heart,
  Loader2,
  ChevronRight,
  BookOpen,
  X,
  Bell,
  FlaskConical,
  Trash2,
  LayoutGrid,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// ── Types ────────────────────────────────────────────────────────────

interface FormulaGroup {
  id: string
  name: string
  description: string
  iconKey: string
  isDefault: boolean
  isSystem: boolean
  /** Tags distintas das fórmulas deste grupo (somente leitura na listagem) */
  formulaTags: string[]
  _count: { formulas: number }
  latestFormulaAt: string | null
  recentCount: number
}

interface LibraryFormulaTag {
  id: string
  tagName: string
}

interface LibraryFormula {
  id: string
  groupId: string
  name: string
  composition: string
  instructions: string
  noveltyDays: number
  isOfficial: boolean
  createdAt: string
  tags?: LibraryFormulaTag[]
}

interface LibraryFormulaWithGroup extends LibraryFormula {
  group: { id: string; name: string; iconKey: string }
}

interface FormulaAiVersion {
  id: string
  title: string
  originalFormulaSnapshot: string
  originalInstructionsSnapshot: string
  userRequest: string
  aiResultFormula: string
  aiResultInstructions: string
  isFavorited: boolean
  createdAt: string
  source: 'library'
  baseFormula?: { name: string; group?: { name: string } }
}

interface ChatFavorite {
  id: string
  title: string
  content: string
  patientName?: string
  isFavorited: boolean
  createdAt: string
  source: 'chat'
}

type FavoriteItem = FormulaAiVersion | ChatFavorite

// ── Icon Map ─────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  { key: 'beaker', label: 'Béquer', Icon: Beaker },
  { key: 'scissors', label: 'Tesoura', Icon: Scissors },
  { key: 'eye', label: 'Olho', Icon: Eye },
  { key: 'smile', label: 'Rosto', Icon: Smile },
  { key: 'sparkles', label: 'Estrelas', Icon: Sparkles },
  { key: 'heart', label: 'Coração', Icon: Heart },
  { key: 'book', label: 'Livro', Icon: BookOpen },
  { key: 'body', label: 'Corpo', Icon: Star },
] as const

function getIconComponent(key: string) {
  return ICON_OPTIONS.find((i) => i.key === key)?.Icon || Beaker
}

// ── Predefined Tags ──────────────────────────────────────────────────

const PREDEFINED_TAGS = [
  'Limpeza', 'Hidratação', 'Anti-idade', 'Acne', 'Manchas',
  'Proteção solar', 'Celulite', 'Flacidez', 'Estrias', 'Firmeza',
  'Esfoliação', 'Olheiras', 'Rugas', 'Bolsas', 'Clareamento',
  'Fortalecimento', 'Queda', 'Caspa', 'Oleosidade', 'Crescimento',
]

const DEFAULT_NOVELTY_DAYS = 7

// ── Group card (Biblioteca / Novidades) ─────────────────────────────

function FormulaGroupCard({
  group,
  isAdmin,
  onOpen,
  onEdit,
  highlightNews,
  showBellInHeader,
}: {
  group: FormulaGroup
  isAdmin: boolean
  onOpen: () => void
  onEdit: (e: React.MouseEvent) => void
  highlightNews?: boolean
  /** Na Biblioteca: sino + total de novidades ao lado das ações do card */
  showBellInHeader?: boolean
}) {
  const IconComp = getIconComponent(group.iconKey)
  const hasNews = group.recentCount > 0
  return (
    <Card
      className={cn(
        'group relative cursor-pointer overflow-hidden border-base-border transition-all hover:border-primary-medium hover:shadow-md',
        highlightNews && 'ring-1 ring-primary-accent/35'
      )}
      onClick={onOpen}
    >
      {highlightNews && (
        <div
          className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-primary-accent via-primary-medium to-primary-dark"
          aria-hidden
        />
      )}
      <CardContent className="flex h-full flex-col p-6 pt-7">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-small bg-primary-light text-primary-dark transition-colors group-hover:bg-primary-medium/40">
              <IconComp className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-h3 text-content-title">{group.name}</h3>
              {hasNews && !showBellInHeader && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-huge bg-primary-accent/10 px-2 py-0.5 text-desc-medium font-medium text-primary-accent">
                  <Bell className="h-3 w-3" strokeWidth={2} aria-hidden />
                  {group.recentCount} nova{group.recentCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {showBellInHeader && hasNews && (
              <span
                className="inline-flex items-center gap-1 rounded-huge bg-primary-accent/12 px-2.5 py-1.5 text-desc-medium font-semibold text-primary-accent"
                title={`${group.recentCount} fórmula${group.recentCount !== 1 ? 's' : ''} em novidades neste grupo`}
              >
                <Bell className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {group.recentCount}
              </span>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(e)
                }}
                className="rounded-tiny p-1.5 text-content-text transition-colors hover:bg-base-disable"
                title="Editar grupo"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
            <ChevronRight
              className="h-5 w-5 text-content-text/70 transition-transform group-hover:translate-x-0.5"
              strokeWidth={1.5}
              aria-hidden
            />
          </div>
        </div>
        <p className="mb-4 line-clamp-2 flex-1 text-paragraph text-content-text">{group.description}</p>
        {(group.formulaTags?.length ?? 0) > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {group.formulaTags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
            {group.formulaTags.length > 4 && (
              <Badge variant="secondary">+{group.formulaTags.length - 4}</Badge>
            )}
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-base-border/70 pt-4">
          <div className="flex items-center gap-1.5 text-desc-medium text-content-text">
            <FlaskConical className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span>
              {group._count.formulas} fórmula{group._count.formulas !== 1 ? 's' : ''}
            </span>
          </div>
          {group.latestFormulaAt && (
            <span className="text-desc-regular text-content-text/70">
              Atualizado {new Date(group.latestFormulaAt).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function NoveltyFormulaCard({
  formula,
  onOpenAi,
  onTagClick,
}: {
  formula: LibraryFormulaWithGroup
  onOpenAi: () => void
  onTagClick?: (tagName: string) => void
}) {
  const GroupIcon = getIconComponent(formula.group.iconKey)
  return (
    <Card
      role="button"
      tabIndex={0}
      className="group relative cursor-pointer overflow-hidden border-base-border transition-all hover:border-primary-medium hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/30"
      onClick={onOpenAi}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenAi()
        }
      }}
    >
      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-primary-accent via-primary-medium to-primary-dark" aria-hidden />
      <CardContent className="relative flex flex-col p-6 pt-7">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-small bg-primary-light text-primary-dark transition-colors group-hover:bg-primary-medium/40">
              <GroupIcon className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-desc-medium text-content-text">{formula.group.name}</p>
              <h3 className="mt-0.5 text-h3 text-content-title">{formula.name}</h3>
              <span className="mt-2 inline-flex items-center gap-1 rounded-huge bg-primary-accent/10 px-2 py-0.5 text-desc-medium font-medium text-primary-accent">
                <Bell className="h-3 w-3" strokeWidth={2} aria-hidden />
                Em destaque
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Sparkles className="h-5 w-5 shrink-0 text-primary-dark" strokeWidth={1.5} aria-hidden />
            <span className="text-center text-[10px] font-semibold leading-tight text-primary-dark sm:text-desc-medium">
              Modificar com IA
            </span>
          </div>
        </div>
        {(formula.tags?.length ?? 0) > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(formula.tags ?? []).slice(0, 5).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onTagClick?.(t.tagName)
                }}
                className="inline-flex items-center rounded-huge bg-primary-light px-2.5 py-1 text-desc-medium text-primary-dark transition-colors hover:bg-primary-medium/50"
              >
                {t.tagName}
              </button>
            ))}
            {(formula.tags ?? []).length > 5 && (
              <Badge variant="secondary">+{(formula.tags ?? []).length - 5}</Badge>
            )}
          </div>
        )}
        <div className="border-t border-base-border/70 pt-4">
          <span className="text-desc-medium text-content-text uppercase tracking-wider">Composição</span>
          <p className="mt-1 line-clamp-3 whitespace-pre-line text-paragraph text-content-title">{formula.composition}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-desc-regular text-content-text/80">
          <span>Cadastro {new Date(formula.createdAt).toLocaleDateString('pt-BR')}</span>
          <span className="text-desc-medium text-content-text/70">Destaque por {formula.noveltyDays} dia{formula.noveltyDays !== 1 ? 's' : ''}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Page ────────────────────────────────────────────────────────

export default function FormulasPage() {
  const { isAdmin } = useAuth()

  const [groups, setGroups] = useState<FormulaGroup[]>([])
  const [noveltyFormulas, setNoveltyFormulas] = useState<LibraryFormulaWithGroup[]>([])
  const [noveltyLoading, setNoveltyLoading] = useState(true)
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [highlightedFormulaId, setHighlightedFormulaId] = useState<string | null>(null)
  const [noveltyTagFilter, setNoveltyTagFilter] = useState<string | null>(null)

  // Drawer states
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<FormulaGroup | null>(null)

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<FormulaGroup | null>(null)
  const [groupFormulas, setGroupFormulas] = useState<LibraryFormula[]>([])
  const [formulaSearch, setFormulaSearch] = useState('')
  const [formulaTagFilter, setFormulaTagFilter] = useState<string | null>(null)

  const [formulaDrawerOpen, setFormulaDrawerOpen] = useState(false)
  const [editingFormula, setEditingFormula] = useState<LibraryFormula | null>(null)

  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiBaseFormula, setAiBaseFormula] = useState<LibraryFormula | null>(null)
  const [aiRequest, setAiRequest] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<FormulaAiVersion | null>(null)

  const [favAiDrawerOpen, setFavAiDrawerOpen] = useState(false)
  const [favAiBase, setFavAiBase] = useState<FavoriteItem | null>(null)
  const [favAiRequest, setFavAiRequest] = useState('')
  const [favAiLoading, setFavAiLoading] = useState(false)
  const [favAiResult, setFavAiResult] = useState<{ title: string; composition: string; instructions: string } | null>(null)

  // Group form
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    iconKey: 'beaker',
  })

  // Formula form
  const [formulaForm, setFormulaForm] = useState({
    name: '',
    composition: '',
    instructions: '',
    noveltyDays: DEFAULT_NOVELTY_DAYS,
    tags: [] as string[],
  })
  const [formulaTagInput, setFormulaTagInput] = useState('')

  const [mainTab, setMainTab] = useState<'novelty' | 'library' | 'favorites'>('library')

  const newsTotal = useMemo(() => groups.reduce((a, g) => a + g.recentCount, 0), [groups])
  const noveltyCount = noveltyLoading ? newsTotal : noveltyFormulas.length

  // ── Load Data ────────────────────────────────────────────────────

  const loadFavorites = useCallback(async () => {
    try {
      const data = await api.get<FavoriteItem[]>('/me/favorite-formulas')
      setFavorites(data)
    } catch (err) {
      console.error('Erro ao carregar favoritos:', err)
    }
  }, [])

  const loadNovelties = useCallback(async () => {
    setNoveltyLoading(true)
    try {
      const data = await api.get<LibraryFormulaWithGroup[]>('/library-formulas/novelties')
      setNoveltyFormulas(data)
    } catch (err) {
      console.error('Erro ao carregar novidades:', err)
      setNoveltyFormulas([])
    } finally {
      setNoveltyLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadGroups()
    void loadFavorites()
    void loadNovelties()
    // Intentional: carregar na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mainTab === 'favorites') void loadFavorites()
  }, [mainTab, loadFavorites])

  async function loadGroups(): Promise<FormulaGroup[] | undefined> {
    setLoading(true)
    try {
      const data = await api.get<FormulaGroup[]>('/formula-groups')
      setGroups(data)
      return data
    } catch (err) {
      console.error('Erro ao carregar grupos:', err)
      return undefined
    } finally {
      setLoading(false)
    }
  }

  async function loadGroupFormulas(groupId: string, search?: string, tag?: string | null) {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (tag) params.set('tag', tag)
      const query = params.toString() ? `?${params}` : ''
      const data = await api.get<LibraryFormula[]>(`/formula-groups/${groupId}/formulas${query}`)
      setGroupFormulas(data)
    } catch (err) {
      console.error('Erro ao carregar fórmulas:', err)
    }
  }

  const filterTagsInDetail = useMemo(() => {
    if (!selectedGroup) return []
    const fromGroup = selectedGroup.formulaTags ?? []
    const fromFormulas = groupFormulas.flatMap((f) => (f.tags ?? []).map((t) => t.tagName))
    const unique = new Set([...fromGroup, ...fromFormulas])
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [selectedGroup, groupFormulas])

  const noveltyTagsFilterList = useMemo(() => {
    const unique = new Set<string>()
    for (const f of noveltyFormulas) {
      for (const t of f.tags ?? []) unique.add(t.tagName)
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [noveltyFormulas])

  const filteredNoveltyFormulas = useMemo(() => {
    if (!noveltyTagFilter) return noveltyFormulas
    return noveltyFormulas.filter((f) => (f.tags ?? []).some((t) => t.tagName === noveltyTagFilter))
  }, [noveltyFormulas, noveltyTagFilter])

  // ── Group Actions ────────────────────────────────────────────────

  function openCreateGroup() {
    setEditingGroup(null)
    setGroupForm({ name: '', description: '', iconKey: 'beaker' })
    setGroupDrawerOpen(true)
  }

  function openEditGroup(group: FormulaGroup) {
    setEditingGroup(group)
    setGroupForm({
      name: group.name,
      description: group.description,
      iconKey: group.iconKey,
    })
    setGroupDrawerOpen(true)
  }

  async function handleGroupSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingGroup) {
        await api.put(`/admin/formula-groups/${editingGroup.id}`, groupForm)
      } else {
        await api.post('/admin/formula-groups', groupForm)
      }
      setGroupDrawerOpen(false)
      const refreshed = await loadGroups()
      if (refreshed && editingGroup && selectedGroup?.id === editingGroup.id) {
        const g = refreshed.find((x) => x.id === editingGroup.id)
        if (g) setSelectedGroup(g)
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar grupo')
    }
  }

  // ── Group Detail ─────────────────────────────────────────────────

  function openGroupDetail(group: FormulaGroup, opts?: { focusFormulaId?: string }) {
    setSelectedGroup(group)
    setFormulaSearch('')
    setFormulaTagFilter(null)
    setHighlightedFormulaId(opts?.focusFormulaId ?? null)
    setGroupFormulas([])
    setDetailDrawerOpen(true)
    loadGroupFormulas(group.id)
  }

  useEffect(() => {
    if (!detailDrawerOpen || !highlightedFormulaId || groupFormulas.length === 0) return
    if (!groupFormulas.some((f) => f.id === highlightedFormulaId)) return
    const t = window.setTimeout(() => {
      document.getElementById(`library-formula-${highlightedFormulaId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 120)
    return () => window.clearTimeout(t)
  }, [detailDrawerOpen, highlightedFormulaId, groupFormulas])

  function handleFormulaSearch(value: string) {
    setFormulaSearch(value)
    if (selectedGroup) {
      loadGroupFormulas(selectedGroup.id, value, formulaTagFilter)
    }
  }

  function applyFormulaTagFilter(tag: string | null) {
    setFormulaTagFilter(tag)
    if (selectedGroup) {
      loadGroupFormulas(selectedGroup.id, formulaSearch, tag)
    }
  }

  // ── Formula Actions ──────────────────────────────────────────────

  function openCreateFormula() {
    setEditingFormula(null)
    setFormulaForm({
      name: '',
      composition: '',
      instructions: '',
      noveltyDays: DEFAULT_NOVELTY_DAYS,
      tags: [],
    })
    setFormulaTagInput('')
    setFormulaDrawerOpen(true)
  }

  function openEditFormula(formula: LibraryFormula) {
    setEditingFormula(formula)
    setFormulaForm({
      name: formula.name,
      composition: formula.composition,
      instructions: formula.instructions,
      noveltyDays: formula.noveltyDays ?? DEFAULT_NOVELTY_DAYS,
      tags: (formula.tags ?? []).map((t) => t.tagName),
    })
    setFormulaTagInput('')
    setFormulaDrawerOpen(true)
  }

  function toggleFormulaTag(tag: string) {
    setFormulaForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  function addFormulaCustomTag() {
    const trimmed = formulaTagInput.trim()
    if (trimmed && !formulaForm.tags.includes(trimmed)) {
      setFormulaForm((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }))
      setFormulaTagInput('')
    }
  }

  async function handleDeleteFormula(formula: LibraryFormula) {
    if (!selectedGroup) return
    if (
      !confirm(
        `Excluir a fórmula "${formula.name}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return
    }
    try {
      await api.delete(`/admin/library-formulas/${formula.id}`)
      if (editingFormula?.id === formula.id) {
        setFormulaDrawerOpen(false)
        setEditingFormula(null)
      }
      if (aiBaseFormula?.id === formula.id) {
        setAiDrawerOpen(false)
        setAiBaseFormula(null)
      }
      loadGroupFormulas(selectedGroup.id, formulaSearch, formulaTagFilter)
      const refreshed = await loadGroups()
      if (refreshed) {
        const g = refreshed.find((x) => x.id === selectedGroup.id)
        if (g) setSelectedGroup(g)
      }
      await loadNovelties()
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir fórmula')
    }
  }

  async function handleFormulaSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGroup) return
    try {
      const noveltyDays = Math.min(
        365,
        Math.max(1, Math.round(Number(formulaForm.noveltyDays)) || DEFAULT_NOVELTY_DAYS),
      )
      if (editingFormula) {
        await api.put(`/admin/library-formulas/${editingFormula.id}`, {
          name: formulaForm.name,
          composition: formulaForm.composition,
          instructions: formulaForm.instructions,
          tags: formulaForm.tags,
          noveltyDays,
        })
      } else {
        await api.post('/admin/library-formulas', {
          name: formulaForm.name,
          composition: formulaForm.composition,
          instructions: formulaForm.instructions,
          tags: formulaForm.tags,
          noveltyDays,
          groupId: selectedGroup.id,
        })
      }
      setFormulaDrawerOpen(false)
      loadGroupFormulas(selectedGroup.id, formulaSearch, formulaTagFilter)
      const refreshed = await loadGroups()
      if (refreshed) {
        const g = refreshed.find((x) => x.id === selectedGroup.id)
        if (g) setSelectedGroup(g)
      }
      await loadNovelties()
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar fórmula')
    }
  }

  // ── AI Modification ──────────────────────────────────────────────

  function openAiModify(formula: LibraryFormula | LibraryFormulaWithGroup) {
    setAiBaseFormula(formula)
    setAiRequest('')
    setAiResult(null)
    setAiDrawerOpen(true)
  }

  async function handleAiModify(e: React.FormEvent) {
    e.preventDefault()
    if (!aiBaseFormula || !aiRequest.trim()) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const result = await api.post<FormulaAiVersion>('/ai/formulas/modify', {
        formulaId: aiBaseFormula.id,
        userRequest: aiRequest,
      })
      setAiResult(result)
    } catch (err: any) {
      alert(err.message || 'Erro ao modificar com IA')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleFavoriteAiResult() {
    if (!aiResult) return
    try {
      await api.patch(`/ai/formulas/${aiResult.id}/favorite`)
      setAiResult({ ...aiResult, isFavorited: true })
      loadFavorites()
    } catch (err: any) {
      alert(err.message || 'Erro ao favoritar')
    }
  }

  // ── Favorites ────────────────────────────────────────────────────

  async function handleUnfavorite(item: FavoriteItem) {
    try {
      if (item.source === 'chat') {
        await api.patch(`/formulas/${item.id}/favorite`)
      } else {
        await api.patch(`/ai/formulas/${item.id}/favorite`)
      }
      setFavorites((prev) => prev.filter((f) => f.id !== item.id))
    } catch (err: any) {
      alert(err.message || 'Erro ao remover favorito')
    }
  }

  // ── Favorite AI Modification ─────────────────────────────────────

  function openFavAiModify(fav: FavoriteItem) {
    setFavAiBase(fav)
    setFavAiRequest('')
    setFavAiResult(null)
    setFavAiDrawerOpen(true)
  }

  async function handleFavAiModify(e: React.FormEvent) {
    e.preventDefault()
    if (!favAiBase || !favAiRequest.trim()) return
    setFavAiLoading(true)
    setFavAiResult(null)
    try {
      const result = await api.post<{ title: string; composition: string; instructions: string }>('/ai/formulas/modify-favorite', {
        favoriteId: favAiBase.id,
        favoriteType: favAiBase.source,
        userRequest: favAiRequest,
      })
      setFavAiResult(result)
    } catch (err: any) {
      alert(err.message || 'Erro ao modificar com IA')
    } finally {
      setFavAiLoading(false)
    }
  }

  async function handleSaveFavAiResult() {
    if (!favAiBase || !favAiResult) return
    try {
      await api.put('/ai/formulas/save-favorite', {
        favoriteId: favAiBase.id,
        favoriteType: favAiBase.source,
        ...favAiResult,
      })
      setFavAiDrawerOpen(false)
      loadFavorites()
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar')
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-h2 text-content-title lg:text-h1">Fórmulas</h1>
          <p className="mt-2 text-paragraph text-content-text lg:mt-3">
            {isAdmin
              ? 'Organize a biblioteca magistral: novidades recentes, grupos e o que você salvou com a IA — tudo em um só lugar.'
              : 'Explore novidades, consulte os grupos da biblioteca e acesse suas fórmulas favoritas.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateGroup} className="shrink-0 self-start sm:self-auto">
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.5} />
            Cadastrar grupo
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
        </div>
      ) : (
        <Tabs
          value={mainTab}
          onValueChange={(v) => setMainTab(v as 'novelty' | 'library' | 'favorites')}
          className="w-full"
        >
          <TabsList className="grid h-auto min-h-[52px] w-full grid-cols-3 gap-1 p-1.5">
            <TabsTrigger value="novelty" className="gap-1.5 px-1.5 sm:gap-2 sm:px-3">
              <Bell className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="hidden sm:inline">Novidades</span>
              <span className="sm:hidden">Nov.</span>
              {noveltyCount > 0 && (
                <span className="rounded-full bg-primary-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {noveltyCount > 99 ? '99+' : noveltyCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-1.5 px-1.5 sm:gap-2 sm:px-3">
              <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="hidden sm:inline">Biblioteca</span>
              <span className="sm:hidden">Bibl.</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1.5 px-1.5 sm:gap-2 sm:px-3">
              <Star className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="hidden sm:inline">Favoritos</span>
              <span className="sm:hidden">Fav.</span>
              {favorites.length > 0 && (
                <span className="rounded-full bg-primary-dark px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {favorites.length > 99 ? '99+' : favorites.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="novelty" className="mt-6">
            <p className="mb-6 max-w-2xl text-paragraph text-content-text">
              Fórmulas em destaque no período de novidades. Toque no card para abrir direto o assistente de{' '}
              <span className="font-semibold text-content-title">Modificar com IA</span> — o mesmo fluxo para
              administradores e usuários.
            </p>
            {noveltyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary-dark" />
              </div>
            ) : noveltyFormulas.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-regular border border-dashed border-base-border bg-base-background px-6 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary-dark">
                  <Bell className="h-7 w-7 opacity-70" strokeWidth={1.5} aria-hidden />
                </div>
                <p className="text-tag-semibold text-content-title">Nenhuma novidade no momento</p>
                <p className="mt-2 max-w-md text-paragraph text-content-text">
                  Quando novas fórmulas forem cadastradas, elas aparecerão aqui conforme o período de destaque definido
                  no cadastro.
                </p>
                <Button type="button" variant="outline" className="mt-6" onClick={() => setMainTab('library')}>
                  Ir para a biblioteca
                </Button>
              </div>
            ) : (
              <>
                {noveltyTagsFilterList.length > 0 && (
                  <div className="mb-6 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-tag-semibold text-content-title">Características</span>
                      {noveltyTagFilter && (
                        <button
                          type="button"
                          onClick={() => setNoveltyTagFilter(null)}
                          className="text-desc-medium text-primary-dark underline underline-offset-2 hover:opacity-90"
                        >
                          Limpar filtro
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {noveltyTagsFilterList.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setNoveltyTagFilter(noveltyTagFilter === tag ? null : tag)}
                          className={cn(
                            'inline-flex items-center rounded-huge px-3 py-1 text-desc-medium transition-colors',
                            noveltyTagFilter === tag
                              ? 'bg-primary-dark text-[#FFFFFF]'
                              : 'bg-base-disable text-content-text hover:bg-primary-light'
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {filteredNoveltyFormulas.length === 0 ? (
                  <div className="rounded-regular border border-base-border bg-base-background px-6 py-12 text-center">
                    <p className="text-paragraph text-content-text">
                      Nenhuma fórmula em novidades com esta característica.
                    </p>
                    <Button type="button" variant="outline" className="mt-4" onClick={() => setNoveltyTagFilter(null)}>
                      Limpar filtro
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredNoveltyFormulas.map((formula) => (
                      <NoveltyFormulaCard
                        key={formula.id}
                        formula={formula}
                        onOpenAi={() => openAiModify(formula)}
                        onTagClick={(tag) => setNoveltyTagFilter((prev) => (prev === tag ? null : tag))}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="library" className="mt-6">
            <p className="mb-6 max-w-2xl text-paragraph text-content-text">
              Todos os grupos da biblioteca magistral. Toque em um card para buscar fórmulas, filtrar por tags ou usar a
              IA para adaptar uma receita.
            </p>
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-regular border border-dashed border-base-border bg-base-background px-6 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary-dark">
                  <FlaskConical className="h-7 w-7 opacity-70" strokeWidth={1.5} aria-hidden />
                </div>
                <p className="text-tag-semibold text-content-title">Nenhum grupo cadastrado</p>
                <p className="mt-2 max-w-md text-paragraph text-content-text">
                  {isAdmin
                    ? 'Comece criando um grupo para organizar as fórmulas da biblioteca.'
                    : 'A biblioteca ainda não possui grupos de fórmulas.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {groups.map((group) => (
                  <FormulaGroupCard
                    key={group.id}
                    group={group}
                    isAdmin={!!isAdmin}
                    highlightNews={group.recentCount > 0}
                    showBellInHeader
                    onOpen={() => openGroupDetail(group)}
                    onEdit={(e) => {
                      e.stopPropagation()
                      openEditGroup(group)
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            <p className="mb-6 max-w-2xl text-paragraph text-content-text">
              Fórmulas que você gerou com a IA (a partir da biblioteca ou do chat) e marcou como favoritas. Remova a
              estrela para tirar da lista.
            </p>
            <div className="space-y-4">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="rounded-regular border border-base-border bg-base-white p-5 transition-colors hover:border-primary-medium"
                >
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h4 className="text-tag-bold text-content-title">{fav.title}</h4>
                      {fav.source === 'library' && fav.baseFormula && (
                        <p className="mt-1 text-desc-regular text-content-text">
                          Baseada em: {fav.baseFormula.name}
                          {fav.baseFormula.group && ` · ${fav.baseFormula.group.name}`}
                        </p>
                      )}
                      {fav.source === 'chat' && fav.patientName && (
                        <p className="mt-1 text-desc-regular text-content-text">Paciente: {fav.patientName}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openFavAiModify(fav)}
                        className="rounded-tiny p-2 text-primary-dark transition-colors hover:bg-primary-light"
                        title="Modificar com IA"
                      >
                        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnfavorite(fav)}
                        className="rounded-tiny p-2 text-primary-accent transition-colors hover:bg-primary-light"
                        title="Remover dos favoritos"
                      >
                        <Star className="h-4 w-4 fill-current" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {fav.source === 'library' ? (
                    <>
                      <div className="text-desc-medium text-content-text mb-1 uppercase tracking-wider">Solicitação</div>
                      <p className="text-paragraph text-content-text mb-4 italic">&quot;{fav.userRequest}&quot;</p>
                      <div className="mb-3">
                        <span className="text-desc-medium text-content-text uppercase tracking-wider">Composição</span>
                        <div className="prose prose-sm mt-1 max-w-none text-paragraph text-content-title">
                          <ReactMarkdown>{fav.aiResultFormula}</ReactMarkdown>
                        </div>
                      </div>
                      <div>
                        <span className="text-desc-medium text-content-text uppercase tracking-wider">Modo de uso</span>
                        <div className="prose prose-sm mt-1 max-w-none text-paragraph text-content-text">
                          <ReactMarkdown>{fav.aiResultInstructions}</ReactMarkdown>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-headings:text-content-title prose-p:text-content-text prose-strong:text-primary-dark prose-li:text-content-text">
                      <ReactMarkdown>{fav.content}</ReactMarkdown>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-base-border/60 pt-4">
                    <span className="text-desc-regular text-content-text">
                      Criada em {new Date(fav.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    <Badge variant={fav.source === 'chat' ? 'default' : 'secondary'}>
                      {fav.source === 'chat' ? 'Chat IA' : 'Biblioteca'}
                    </Badge>
                  </div>
                </div>
              ))}
              {favorites.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-regular border border-dashed border-base-border bg-base-background px-6 py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary-accent">
                    <Star className="h-7 w-7" strokeWidth={1.5} aria-hidden />
                  </div>
                  <p className="text-tag-semibold text-content-title">Nenhum favorito ainda</p>
                  <p className="mt-2 max-w-md text-paragraph text-content-text">
                    Ao gerar uma fórmula com a IA, use &quot;Favoritar&quot; para guardá-la aqui e encontrar rápido depois.
                  </p>
                  <Button type="button" variant="outline" className="mt-6" onClick={() => setMainTab('library')}>
                    Explorar biblioteca
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Drawer: Create/Edit Group ──────────────────────────────── */}
      <Drawer open={groupDrawerOpen} onOpenChange={setGroupDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editingGroup ? 'Editar Grupo' : 'Cadastrar Grupo de Fórmulas'}</DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>
          <form onSubmit={handleGroupSubmit} className="flex flex-col flex-1 overflow-hidden">
            <DrawerBody className="space-y-[24px]">
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">Nome do grupo</label>
                <Input
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Ex: Fórmulas Anti-idade"
                  required
                />
              </div>
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">Descrição</label>
                <Textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Descreva o propósito deste grupo de fórmulas..."
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">Ícone</label>
                <div className="grid grid-cols-4 gap-[8px]">
                  {ICON_OPTIONS.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setGroupForm({ ...groupForm, iconKey: key })}
                      className={`flex flex-col items-center gap-[4px] p-[12px] rounded-small border transition-all ${
                        groupForm.iconKey === key
                          ? 'border-primary-dark bg-primary-light'
                          : 'border-base-border hover:border-primary-medium'
                      }`}
                    >
                      <Icon className="w-[20px] h-[20px] text-primary-dark" strokeWidth={1.5} />
                      <span className="text-desc-medium text-content-text">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </DrawerBody>
            <DrawerFooter>
              <Button type="button" variant="outline" onClick={() => setGroupDrawerOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingGroup ? 'Salvar' : 'Criar Grupo'}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* ── Drawer: Group Detail ───────────────────────────────────── */}
      <Drawer
        open={detailDrawerOpen}
        onOpenChange={(open) => {
          setDetailDrawerOpen(open)
          if (!open) setHighlightedFormulaId(null)
        }}
      >
        <DrawerContent size="wide">
          <DrawerHeader>
            <div className="flex items-center gap-[12px]">
              {selectedGroup && (() => {
                const IconComp = getIconComponent(selectedGroup.iconKey)
                return (
                  <div className="w-10 h-10 rounded-small bg-primary-light flex items-center justify-center">
                    <IconComp className="w-[20px] h-[20px] text-primary-dark" strokeWidth={1.5} />
                  </div>
                )
              })()}
              <div>
                <DrawerTitle>{selectedGroup?.name}</DrawerTitle>
                <p className="text-desc-regular text-content-text mt-[2px]">{selectedGroup?.description}</p>
              </div>
            </div>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody className="space-y-[24px]">
            <div className="flex items-center gap-[12px]">
              <div className="relative flex-1">
                <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-content-text" strokeWidth={1.5} />
                <Input
                  placeholder="Buscar por nome, ingrediente ou tipo de tratamento..."
                  value={formulaSearch}
                  onChange={(e) => handleFormulaSearch(e.target.value)}
                  className="pl-[36px]"
                />
              </div>
              {isAdmin && (
                <Button onClick={openCreateFormula} className="shrink-0">
                  <Plus className="w-[16px] h-[16px]" strokeWidth={1.5} />
                  Nova Fórmula
                </Button>
              )}
            </div>

            {filterTagsInDetail.length > 0 && (
              <div className="space-y-[8px]">
                <div className="flex flex-wrap items-center gap-[12px]">
                  <span className="text-tag-semibold text-content-title">Características</span>
                  {formulaTagFilter && (
                    <button
                      type="button"
                      onClick={() => applyFormulaTagFilter(null)}
                      className="text-desc-medium text-primary-dark underline underline-offset-2 hover:opacity-90"
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-[6px]">
                  {filterTagsInDetail.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => applyFormulaTagFilter(formulaTagFilter === tag ? null : tag)}
                      className={`inline-flex items-center rounded-huge px-[12px] py-1 text-desc-medium transition-colors ${
                        formulaTagFilter === tag
                          ? 'bg-primary-dark text-[#FFFFFF]'
                          : 'bg-base-disable text-content-text hover:bg-primary-light'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-[12px]">
              {groupFormulas.map((formula) => (
                <div
                  key={formula.id}
                  id={`library-formula-${formula.id}`}
                  className={cn(
                    'rounded-small border border-base-border p-[20px] transition-colors hover:border-primary-medium',
                    highlightedFormulaId === formula.id && 'ring-2 ring-primary-accent ring-offset-2'
                  )}
                >
                  <div className="flex items-start justify-between mb-[12px]">
                    <h4 className="text-tag-bold text-content-title">{formula.name}</h4>
                    <div className="flex items-center gap-[4px] shrink-0 ml-[12px]">
                      <Button variant="ghost" size="sm" onClick={() => openAiModify(formula)} title="Modificar com IA">
                        <Sparkles className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEditFormula(formula)} title="Editar">
                            <Pencil className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFormula(formula)}
                            title="Excluir fórmula"
                            className="text-error hover:text-error hover:bg-error/10"
                          >
                            <Trash2 className="w-[14px] h-[14px]" strokeWidth={1.5} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {(formula.tags?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-[6px] mb-[12px]">
                      {(formula.tags ?? []).map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => applyFormulaTagFilter(tag.tagName)}
                          className="inline-flex items-center rounded-huge px-[10px] py-[4px] text-desc-medium bg-base-disable text-content-text hover:bg-primary-light transition-colors"
                          title={`Filtrar por ${tag.tagName}`}
                        >
                          {tag.tagName}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mb-[8px]">
                    <span className="text-desc-medium text-content-text uppercase tracking-wider">Composição</span>
                    <p className="text-paragraph text-content-title mt-[4px] whitespace-pre-line line-clamp-3">
                      {formula.composition}
                    </p>
                  </div>
                  <div>
                    <span className="text-desc-medium text-content-text uppercase tracking-wider">Modo de uso</span>
                    <p className="text-paragraph text-content-text mt-[4px] line-clamp-2">
                      {formula.instructions}
                    </p>
                  </div>
                </div>
              ))}
              {groupFormulas.length === 0 && (
                <div className="py-[32px] text-center text-content-text">
                  {formulaSearch || formulaTagFilter
                    ? 'Nenhuma fórmula encontrada para esta busca ou filtro'
                    : 'Nenhuma fórmula cadastrada neste grupo'}
                </div>
              )}
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* ── Drawer: Create/Edit Formula ────────────────────────────── */}
      <Drawer open={formulaDrawerOpen} onOpenChange={setFormulaDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editingFormula ? 'Editar Fórmula' : 'Cadastrar Nova Fórmula'}</DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>
          <form onSubmit={handleFormulaSubmit} className="flex flex-col flex-1 overflow-hidden">
            <DrawerBody className="space-y-[24px]">
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">Nome da fórmula</label>
                <Input
                  value={formulaForm.name}
                  onChange={(e) => setFormulaForm({ ...formulaForm, name: e.target.value })}
                  placeholder="Ex: Creme Anti-idade Noturno"
                  required
                />
              </div>
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">
                  Composição da fórmula
                </label>
                <p className="text-desc-regular text-content-text mb-[8px]">
                  Inclua ativos, concentrações, base q.s.p. e composição geral
                </p>
                <Textarea
                  value={formulaForm.composition}
                  onChange={(e) => setFormulaForm({ ...formulaForm, composition: e.target.value })}
                  placeholder={"Ácido hialurônico 1%\nNiacinamida 5%\nRetinol 0,3%\nBase creme q.s.p. 30g"}
                  rows={8}
                  required
                />
              </div>
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">Modo de uso</label>
                <Textarea
                  value={formulaForm.instructions}
                  onChange={(e) => setFormulaForm({ ...formulaForm, instructions: e.target.value })}
                  placeholder="Aplicar uma fina camada na face limpa, à noite, antes de dormir..."
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">
                  Tempo em &quot;Novidades&quot;
                </label>
                <p className="text-desc-regular text-content-text mb-[8px]">
                  Quantos dias após o cadastro esta fórmula aparece na seção Novidades da biblioteca (padrão {DEFAULT_NOVELTY_DAYS} dias).
                </p>
                <div className="flex flex-wrap items-center gap-[12px]">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={formulaForm.noveltyDays}
                    onChange={(e) => {
                      const v = e.target.value === '' ? DEFAULT_NOVELTY_DAYS : Number(e.target.value)
                      setFormulaForm({
                        ...formulaForm,
                        noveltyDays: Number.isFinite(v) ? v : DEFAULT_NOVELTY_DAYS,
                      })
                    }}
                    className="max-w-[120px]"
                    required
                  />
                  <span className="text-desc-regular text-content-text">dias (1 a 365)</span>
                </div>
              </div>
              <div>
                  <label className="block text-tag-semibold text-content-title mb-[12px]">
                    Características
                  </label>
                  <p className="text-desc-regular text-content-text mb-[12px]">
                    Essas tags aparecem no card do grupo e permitem filtrar as fórmulas dentro dele.
                  </p>
                  <div className="flex flex-wrap gap-[6px] mb-[12px]">
                    {PREDEFINED_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleFormulaTag(tag)}
                        className={`inline-flex items-center rounded-huge px-[12px] py-1 text-desc-medium transition-colors ${
                          formulaForm.tags.includes(tag)
                            ? 'bg-primary-dark text-[#FFFFFF]'
                            : 'bg-base-disable text-content-text hover:bg-primary-light'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  {formulaForm.tags.filter((t) => !PREDEFINED_TAGS.includes(t)).length > 0 && (
                    <div className="flex flex-wrap gap-[6px] mb-[12px]">
                      {formulaForm.tags.filter((t) => !PREDEFINED_TAGS.includes(t)).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-huge px-[12px] py-1 text-desc-medium bg-primary-dark text-[#FFFFFF]"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => toggleFormulaTag(tag)}
                            className="ml-1 hover:opacity-70"
                            aria-label={`Remover ${tag}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-[8px]">
                    <Input
                      value={formulaTagInput}
                      onChange={(e) => setFormulaTagInput(e.target.value)}
                      placeholder="Nova característica..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addFormulaCustomTag()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={addFormulaCustomTag}>
                      <Plus className="w-[14px] h-[14px]" strokeWidth={1.5} />
                    </Button>
                  </div>
              </div>
            </DrawerBody>
            <DrawerFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              {editingFormula && (
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:mr-auto"
                  onClick={() => handleDeleteFormula(editingFormula)}
                >
                  <Trash2 className="w-[16px] h-[16px]" strokeWidth={1.5} />
                  Excluir fórmula
                </Button>
              )}
              <div className="flex gap-3 w-full sm:w-auto sm:ml-auto sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setFormulaDrawerOpen(false)} className="flex-1 sm:flex-initial">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 sm:flex-initial">
                  {editingFormula ? 'Salvar' : 'Criar Fórmula'}
                </Button>
              </div>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* ── Drawer: AI Modification ────────────────────────────────── */}
      <Drawer open={aiDrawerOpen} onOpenChange={setAiDrawerOpen}>
        <DrawerContent size="wide">
          <DrawerHeader>
            <div>
              <DrawerTitle>Modificar com IA</DrawerTitle>
              <DrawerDescription>
                Altere e melhore fórmulas com auxílio de inteligência artificial
              </DrawerDescription>
            </div>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody className="space-y-[24px]">
            {aiBaseFormula && (
              <>
                <div className="border border-base-border rounded-small p-[20px] bg-base-background">
                  <h4 className="text-tag-bold text-content-title mb-[12px]">Fórmula Base</h4>
                  <p className="text-tag-semibold text-primary-dark mb-[8px]">{aiBaseFormula.name}</p>
                  <div className="mb-[12px]">
                    <span className="text-desc-medium text-content-text uppercase tracking-wider">Composição</span>
                    <p className="text-paragraph text-content-title mt-[4px] whitespace-pre-line">
                      {aiBaseFormula.composition}
                    </p>
                  </div>
                  <div>
                    <span className="text-desc-medium text-content-text uppercase tracking-wider">Modo de uso</span>
                    <p className="text-paragraph text-content-text mt-[4px] whitespace-pre-line">
                      {aiBaseFormula.instructions}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAiModify} className="space-y-[16px]">
                  <div>
                    <label className="block text-tag-semibold text-content-title mb-[12px]">
                      O que você deseja alterar?
                    </label>
                    <Textarea
                      value={aiRequest}
                      onChange={(e) => setAiRequest(e.target.value)}
                      placeholder="Ex: Quero uma versão para pele oleosa, remova ativos agressivos..."
                      rows={4}
                      required
                    />
                    <div className="flex flex-wrap gap-[6px] mt-[8px]">
                      {[
                        'Versão para pele oleosa',
                        'Versão para pele sensível',
                        'Mais hidratante',
                        'Para manchas',
                        'Remover ativos agressivos',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setAiRequest(suggestion)}
                          className="inline-flex items-center rounded-huge px-[10px] py-[4px] text-desc-regular bg-base-disable text-content-text hover:bg-primary-light transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" disabled={aiLoading || !aiRequest.trim()} className="w-full">
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-[16px] h-[16px] animate-spin" />
                        Processando com IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-[16px] h-[16px]" strokeWidth={1.5} />
                        Modificar com IA
                      </>
                    )}
                  </Button>
                </form>

                {aiResult && (
                  <div className="border-2 border-primary-medium rounded-small p-[20px] bg-primary-light/30">
                    <div className="flex items-center justify-between mb-[16px]">
                      <div className="flex items-center gap-[8px]">
                        <Sparkles className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
                        <h4 className="text-tag-bold text-content-title">Resultado da IA</h4>
                      </div>
                      {!aiResult.isFavorited && (
                        <Button variant="secondary" size="sm" onClick={handleFavoriteAiResult}>
                          <Star className="w-[14px] h-[14px]" strokeWidth={1.5} />
                          Favoritar Nova Fórmula
                        </Button>
                      )}
                      {aiResult.isFavorited && (
                        <Badge variant="warning">
                          <Star className="w-[12px] h-[12px] mr-1 fill-current" strokeWidth={1.5} />
                          Favoritada
                        </Badge>
                      )}
                    </div>
                    <p className="text-tag-semibold text-primary-dark mb-[12px]">{aiResult.title}</p>
                    <div className="mb-[12px]">
                      <span className="text-desc-medium text-content-text uppercase tracking-wider">
                        Composição ajustada
                      </span>
                      <div className="text-paragraph text-content-title mt-[4px] whitespace-pre-line prose prose-sm max-w-none">
                        <ReactMarkdown>{aiResult.aiResultFormula}</ReactMarkdown>
                      </div>
                    </div>
                    <div>
                      <span className="text-desc-medium text-content-text uppercase tracking-wider">
                        Modo de uso ajustado
                      </span>
                      <div className="text-paragraph text-content-text mt-[4px] whitespace-pre-line prose prose-sm max-w-none">
                        <ReactMarkdown>{aiResult.aiResultInstructions}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* ── Drawer: AI Modify Favorite ─────────────────────────────── */}
      <Drawer open={favAiDrawerOpen} onOpenChange={setFavAiDrawerOpen}>
        <DrawerContent size="wide">
          <DrawerHeader>
            <div>
              <DrawerTitle>Modificar Fórmula com IA</DrawerTitle>
              <DrawerDescription>
                Altere e melhore sua fórmula favoritada com auxílio da inteligência artificial
              </DrawerDescription>
            </div>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody className="space-y-[24px]">
            {favAiBase && (
              <>
                <div className="border border-base-border rounded-small p-[20px] bg-base-background">
                  <div className="flex items-center gap-[8px] mb-[12px]">
                    <Star className="w-[16px] h-[16px] text-[#E65100] fill-current" strokeWidth={1.5} />
                    <h4 className="text-tag-bold text-content-title">Fórmula Atual</h4>
                    <Badge variant={favAiBase.source === 'chat' ? 'default' : 'secondary'} className="ml-auto">
                      {favAiBase.source === 'chat' ? 'Chat IA' : 'Biblioteca'}
                    </Badge>
                  </div>
                  <p className="text-tag-semibold text-primary-dark mb-[12px]">{favAiBase.title}</p>

                  {favAiBase.source === 'library' ? (
                    <>
                      <div className="mb-[12px]">
                        <span className="text-desc-medium text-content-text uppercase tracking-wider">Composição</span>
                        <div className="text-paragraph text-content-title mt-[4px] whitespace-pre-line prose prose-sm max-w-none">
                          <ReactMarkdown>{(favAiBase as FormulaAiVersion).aiResultFormula}</ReactMarkdown>
                        </div>
                      </div>
                      <div>
                        <span className="text-desc-medium text-content-text uppercase tracking-wider">Modo de uso</span>
                        <div className="text-paragraph text-content-text mt-[4px] whitespace-pre-line prose prose-sm max-w-none">
                          <ReactMarkdown>{(favAiBase as FormulaAiVersion).aiResultInstructions}</ReactMarkdown>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-headings:text-content-title prose-p:text-content-text prose-strong:text-primary-dark prose-li:text-content-text">
                      <ReactMarkdown>{(favAiBase as ChatFavorite).content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                <form onSubmit={handleFavAiModify} className="space-y-[16px]">
                  <div>
                    <label className="block text-tag-semibold text-content-title mb-[12px]">
                      O que você deseja alterar?
                    </label>
                    <Textarea
                      value={favAiRequest}
                      onChange={(e) => setFavAiRequest(e.target.value)}
                      placeholder="Ex: Quero uma versão para pele oleosa, ajuste a concentração do retinol..."
                      rows={4}
                      required
                    />
                    <div className="flex flex-wrap gap-[6px] mt-[8px]">
                      {[
                        'Versão para pele oleosa',
                        'Versão para pele sensível',
                        'Aumentar hidratação',
                        'Reduzir concentrações',
                        'Adaptar para uso noturno',
                        'Remover ativos agressivos',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setFavAiRequest(suggestion)}
                          className="inline-flex items-center rounded-huge px-[10px] py-[4px] text-desc-regular bg-base-disable text-content-text hover:bg-primary-light transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" disabled={favAiLoading || !favAiRequest.trim()} className="w-full">
                    {favAiLoading ? (
                      <>
                        <Loader2 className="w-[16px] h-[16px] animate-spin" />
                        Processando com IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-[16px] h-[16px]" strokeWidth={1.5} />
                        Modificar com IA
                      </>
                    )}
                  </Button>
                </form>

                {favAiResult && (
                  <div className="border-2 border-primary-medium rounded-small p-[20px] bg-primary-light/30">
                    <div className="flex items-center justify-between mb-[16px]">
                      <div className="flex items-center gap-[8px]">
                        <Sparkles className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
                        <h4 className="text-tag-bold text-content-title">Resultado da IA</h4>
                      </div>
                      <Button variant="default" size="sm" onClick={handleSaveFavAiResult}>
                        <Pencil className="w-[14px] h-[14px]" strokeWidth={1.5} />
                        Salvar Alteração
                      </Button>
                    </div>
                    <p className="text-tag-semibold text-primary-dark mb-[12px]">{favAiResult.title}</p>
                    <div className="mb-[12px]">
                      <span className="text-desc-medium text-content-text uppercase tracking-wider">
                        Composição ajustada
                      </span>
                      <div className="text-paragraph text-content-title mt-[4px] whitespace-pre-line prose prose-sm max-w-none">
                        <ReactMarkdown>{favAiResult.composition}</ReactMarkdown>
                      </div>
                    </div>
                    {favAiResult.instructions && (
                      <div>
                        <span className="text-desc-medium text-content-text uppercase tracking-wider">
                          Modo de uso ajustado
                        </span>
                        <div className="text-paragraph text-content-text mt-[4px] whitespace-pre-line prose prose-sm max-w-none">
                          <ReactMarkdown>{favAiResult.instructions}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
