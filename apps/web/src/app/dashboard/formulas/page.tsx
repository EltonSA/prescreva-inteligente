'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// ── Types ────────────────────────────────────────────────────────────

interface FormulaGroupTag {
  id: string
  tagName: string
}

interface FormulaGroup {
  id: string
  name: string
  description: string
  iconKey: string
  isDefault: boolean
  isSystem: boolean
  tags: FormulaGroupTag[]
  _count: { formulas: number }
  latestFormulaAt: string | null
  recentCount: number
}

interface LibraryFormula {
  id: string
  groupId: string
  name: string
  composition: string
  instructions: string
  isOfficial: boolean
  createdAt: string
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

// ── Main Page ────────────────────────────────────────────────────────

export default function FormulasPage() {
  const { isAdmin, user } = useAuth()

  const [groups, setGroups] = useState<FormulaGroup[]>([])
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  // Drawer states
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<FormulaGroup | null>(null)

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<FormulaGroup | null>(null)
  const [groupFormulas, setGroupFormulas] = useState<LibraryFormula[]>([])
  const [formulaSearch, setFormulaSearch] = useState('')

  const [formulaDrawerOpen, setFormulaDrawerOpen] = useState(false)
  const [editingFormula, setEditingFormula] = useState<LibraryFormula | null>(null)

  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiBaseFormula, setAiBaseFormula] = useState<LibraryFormula | null>(null)
  const [aiRequest, setAiRequest] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<FormulaAiVersion | null>(null)

  const [favoritesDrawerOpen, setFavoritesDrawerOpen] = useState(false)

  // Group form
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    iconKey: 'beaker',
    tags: [] as string[],
  })
  const [newTagInput, setNewTagInput] = useState('')

  // Formula form
  const [formulaForm, setFormulaForm] = useState({
    name: '',
    composition: '',
    instructions: '',
  })

  // ── Load Data ────────────────────────────────────────────────────

  useEffect(() => {
    loadGroups()
    loadFavorites()
  }, [])

  async function loadGroups() {
    setLoading(true)
    try {
      const data = await api.get<FormulaGroup[]>('/formula-groups')
      setGroups(data)
    } catch (err) {
      console.error('Erro ao carregar grupos:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadFavorites() {
    try {
      const data = await api.get<FavoriteItem[]>('/me/favorite-formulas')
      setFavorites(data)
    } catch (err) {
      console.error('Erro ao carregar favoritos:', err)
    }
  }

  async function loadGroupFormulas(groupId: string, search?: string) {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : ''
      const data = await api.get<LibraryFormula[]>(`/formula-groups/${groupId}/formulas${query}`)
      setGroupFormulas(data)
    } catch (err) {
      console.error('Erro ao carregar fórmulas:', err)
    }
  }

  // ── Group Actions ────────────────────────────────────────────────

  function openCreateGroup() {
    setEditingGroup(null)
    setGroupForm({ name: '', description: '', iconKey: 'beaker', tags: [] })
    setGroupDrawerOpen(true)
  }

  function openEditGroup(group: FormulaGroup) {
    setEditingGroup(group)
    setGroupForm({
      name: group.name,
      description: group.description,
      iconKey: group.iconKey,
      tags: group.tags.map((t) => t.tagName),
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
      loadGroups()
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar grupo')
    }
  }

  function toggleTag(tag: string) {
    setGroupForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  function addCustomTag() {
    const trimmed = newTagInput.trim()
    if (trimmed && !groupForm.tags.includes(trimmed)) {
      setGroupForm((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }))
      setNewTagInput('')
    }
  }

  // ── Group Detail ─────────────────────────────────────────────────

  function openGroupDetail(group: FormulaGroup) {
    setSelectedGroup(group)
    setFormulaSearch('')
    setGroupFormulas([])
    setDetailDrawerOpen(true)
    loadGroupFormulas(group.id)
  }

  function handleFormulaSearch(value: string) {
    setFormulaSearch(value)
    if (selectedGroup) {
      loadGroupFormulas(selectedGroup.id, value)
    }
  }

  // ── Formula Actions ──────────────────────────────────────────────

  function openCreateFormula() {
    setEditingFormula(null)
    setFormulaForm({ name: '', composition: '', instructions: '' })
    setFormulaDrawerOpen(true)
  }

  function openEditFormula(formula: LibraryFormula) {
    setEditingFormula(formula)
    setFormulaForm({
      name: formula.name,
      composition: formula.composition,
      instructions: formula.instructions,
    })
    setFormulaDrawerOpen(true)
  }

  async function handleFormulaSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGroup) return
    try {
      if (editingFormula) {
        await api.put(`/admin/library-formulas/${editingFormula.id}`, formulaForm)
      } else {
        await api.post('/admin/library-formulas', {
          ...formulaForm,
          groupId: selectedGroup.id,
        })
      }
      setFormulaDrawerOpen(false)
      loadGroupFormulas(selectedGroup.id, formulaSearch)
      loadGroups()
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar fórmula')
    }
  }

  // ── AI Modification ──────────────────────────────────────────────

  function openAiModify(formula: LibraryFormula) {
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

  function openFavorites() {
    loadFavorites()
    setFavoritesDrawerOpen(true)
  }

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

  // ── Render ───────────────────────────────────────────────────────

  const hasFavorites = favorites.length > 0

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-[24px]">
        <div>
          <h1 className="text-h2 lg:text-h1 text-content-title">Fórmulas</h1>
          <p className="text-paragraph text-content-text mt-1 lg:mt-[12px]">
            {isAdmin
              ? 'Gerencie grupos e fórmulas da biblioteca magistral'
              : 'Consulte as fórmulas disponíveis na biblioteca'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateGroup} className="self-start sm:self-auto">
            <Plus className="w-[18px] h-[18px]" strokeWidth={1.5} />
            Cadastrar Grupo
          </Button>
        )}
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-[48px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary-dark" />
        </div>
      ) : (
        <>
          {/* Cards com novidades primeiro */}
          {groups.some((g) => g.recentCount > 0) && (
            <div className="mb-[32px]">
              <div className="flex items-center gap-[8px] mb-[16px]">
                <Bell className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
                <h2 className="text-h3 text-content-title">Novidades na biblioteca</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
                {groups.filter((g) => g.recentCount > 0).map((group) => {
                  const IconComp = getIconComponent(group.iconKey)
                  return (
                    <Card
                      key={group.id}
                      className="hover:shadow-md transition-shadow cursor-pointer border-primary-accent/40 relative overflow-hidden"
                      onClick={() => openGroupDetail(group)}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary-accent" />
                      <CardContent className="p-[24px]">
                        <div className="flex items-start justify-between mb-[16px]">
                          <div className="w-12 h-12 rounded-small bg-primary-light flex items-center justify-center">
                            <IconComp className="w-[24px] h-[24px] text-primary-dark" strokeWidth={1.5} />
                          </div>
                          <div className="flex items-center gap-[6px]">
                            <span className="inline-flex items-center gap-[4px] rounded-huge bg-primary-accent px-[10px] py-[3px] text-desc-medium text-[#FFFFFF] font-semibold">
                              <Bell className="w-[11px] h-[11px]" strokeWidth={2} />
                              {group.recentCount} nova{group.recentCount !== 1 ? 's' : ''}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditGroup(group) }}
                                className="p-[6px] rounded-tiny text-content-text hover:bg-base-disable transition-colors"
                                title="Editar grupo"
                              >
                                <Pencil className="w-[14px] h-[14px]" strokeWidth={1.5} />
                              </button>
                            )}
                            <ChevronRight className="w-[18px] h-[18px] text-content-text" strokeWidth={1.5} />
                          </div>
                        </div>
                        <h3 className="text-h3 text-content-title mb-[8px]">{group.name}</h3>
                        <p className="text-paragraph text-content-text mb-[16px] line-clamp-2">
                          {group.description}
                        </p>
                        <div className="flex flex-wrap gap-[6px] mb-[12px]">
                          {group.tags.slice(0, 4).map((tag) => (
                            <Badge key={tag.id} variant="default">{tag.tagName}</Badge>
                          ))}
                          {group.tags.length > 4 && (
                            <Badge variant="secondary">+{group.tags.length - 4}</Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-[6px]">
                            <FlaskConical className="w-[13px] h-[13px] text-content-text" strokeWidth={1.5} />
                            <span className="text-desc-medium text-content-text">
                              {group._count.formulas} fórmula{group._count.formulas !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {group.latestFormulaAt && (
                            <span className="text-desc-regular text-content-text">
                              Última: {new Date(group.latestFormulaAt).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Todos os grupos + favoritos */}
          <div className="mb-[16px]">
            <h2 className="text-h3 text-content-title">
              {groups.some((g) => g.recentCount > 0) ? 'Todos os grupos' : 'Grupos de fórmulas'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
            {/* Virtual Favorites Group */}
            {hasFavorites && (
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer border-[#E65100]/20"
                onClick={openFavorites}
              >
                <CardContent className="p-[24px] flex flex-col h-full">
                  <div className="flex items-start justify-between mb-[16px]">
                    <div className="w-12 h-12 rounded-small bg-[#FFF3E0] flex items-center justify-center">
                      <Star className="w-[24px] h-[24px] text-[#E65100]" strokeWidth={1.5} />
                    </div>
                    <ChevronRight className="w-[18px] h-[18px] text-content-text mt-[4px]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-h3 text-content-title mb-[8px]">Fórmulas Favoritadas</h3>
                  <p className="text-paragraph text-content-text mb-[16px] line-clamp-2 flex-1">
                    Suas fórmulas personalizadas geradas e favoritadas com auxílio da IA
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="warning">
                      <Star className="w-[11px] h-[11px] mr-[4px] fill-current" strokeWidth={1.5} />
                      {favorites.length} fórmula{favorites.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Formula Groups */}
            {groups.map((group) => {
              const IconComp = getIconComponent(group.iconKey)
              const hasNews = group.recentCount > 0
              return (
                <Card
                  key={group.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openGroupDetail(group)}
                >
                  <CardContent className="p-[24px] flex flex-col h-full">
                    <div className="flex items-start justify-between mb-[16px]">
                      <div className="w-12 h-12 rounded-small bg-primary-light flex items-center justify-center">
                        <IconComp className="w-[24px] h-[24px] text-primary-dark" strokeWidth={1.5} />
                      </div>
                      <div className="flex items-center gap-[4px]">
                        {hasNews && (
                          <span className="inline-flex items-center gap-[4px] rounded-huge bg-primary-accent/10 px-[8px] py-[2px] text-desc-medium text-primary-accent font-medium">
                            <Bell className="w-[10px] h-[10px]" strokeWidth={2} />
                            {group.recentCount}
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditGroup(group) }}
                            className="p-[6px] rounded-tiny text-content-text hover:bg-base-disable transition-colors"
                            title="Editar grupo"
                          >
                            <Pencil className="w-[14px] h-[14px]" strokeWidth={1.5} />
                          </button>
                        )}
                        <ChevronRight className="w-[18px] h-[18px] text-content-text" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h3 className="text-h3 text-content-title mb-[8px]">{group.name}</h3>
                    <p className="text-paragraph text-content-text mb-[16px] line-clamp-2 flex-1">
                      {group.description}
                    </p>
                    <div className="flex flex-wrap gap-[6px] mb-[12px]">
                      {group.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag.id} variant="default">{tag.tagName}</Badge>
                      ))}
                      {group.tags.length > 4 && (
                        <Badge variant="secondary">+{group.tags.length - 4}</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-[8px]">
                      <div className="flex items-center gap-[6px]">
                        <FlaskConical className="w-[13px] h-[13px] text-content-text" strokeWidth={1.5} />
                        <span className="text-desc-medium text-content-text">
                          {group._count.formulas} fórmula{group._count.formulas !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {group.latestFormulaAt && (
                        <span className="text-desc-regular text-content-text">
                          {new Date(group.latestFormulaAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {groups.length === 0 && !loading && (
              <div className="col-span-full py-[48px] text-center text-content-text">
                Nenhum grupo de fórmulas encontrado
              </div>
            )}
          </div>
        </>
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
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">
                  Características / Tags
                </label>
                <div className="flex flex-wrap gap-[6px] mb-[12px]">
                  {PREDEFINED_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`inline-flex items-center rounded-huge px-[12px] py-1 text-desc-medium transition-colors ${
                        groupForm.tags.includes(tag)
                          ? 'bg-primary-dark text-[#FFFFFF]'
                          : 'bg-base-disable text-content-text hover:bg-primary-light'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {groupForm.tags.filter((t) => !PREDEFINED_TAGS.includes(t)).length > 0 && (
                  <div className="flex flex-wrap gap-[6px] mb-[12px]">
                    {groupForm.tags.filter((t) => !PREDEFINED_TAGS.includes(t)).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-huge px-[12px] py-1 text-desc-medium bg-primary-dark text-[#FFFFFF]"
                      >
                        {tag}
                        <button type="button" onClick={() => toggleTag(tag)} className="ml-1 hover:opacity-70">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-[8px]">
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Nova característica..."
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addCustomTag}>
                    <Plus className="w-[14px] h-[14px]" strokeWidth={1.5} />
                  </Button>
                </div>
                {groupForm.tags.length === 0 && (
                  <p className="text-desc-regular text-error mt-[8px]">Selecione pelo menos 1 característica</p>
                )}
              </div>
            </DrawerBody>
            <DrawerFooter>
              <Button type="button" variant="outline" onClick={() => setGroupDrawerOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={groupForm.tags.length === 0}>
                {editingGroup ? 'Salvar' : 'Criar Grupo'}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* ── Drawer: Group Detail ───────────────────────────────────── */}
      <Drawer open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen}>
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

            <div className="space-y-[12px]">
              {groupFormulas.map((formula) => (
                <div
                  key={formula.id}
                  className="border border-base-border rounded-small p-[20px] hover:border-primary-medium transition-colors"
                >
                  <div className="flex items-start justify-between mb-[12px]">
                    <h4 className="text-tag-bold text-content-title">{formula.name}</h4>
                    <div className="flex items-center gap-[4px] shrink-0 ml-[12px]">
                      <Button variant="ghost" size="sm" onClick={() => openAiModify(formula)} title="Modificar com IA">
                        <Sparkles className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => openEditFormula(formula)} title="Editar">
                          <Pencil className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                      )}
                    </div>
                  </div>
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
                  {formulaSearch
                    ? 'Nenhuma fórmula encontrada para esta busca'
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
            </DrawerBody>
            <DrawerFooter>
              <Button type="button" variant="outline" onClick={() => setFormulaDrawerOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingFormula ? 'Salvar' : 'Criar Fórmula'}</Button>
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

      {/* ── Drawer: Favorites ──────────────────────────────────────── */}
      <Drawer open={favoritesDrawerOpen} onOpenChange={setFavoritesDrawerOpen}>
        <DrawerContent size="wide">
          <DrawerHeader>
            <div className="flex items-center gap-[12px]">
              <div className="w-10 h-10 rounded-small bg-[#FFF3E0] flex items-center justify-center">
                <Star className="w-[20px] h-[20px] text-[#E65100]" strokeWidth={1.5} />
              </div>
              <div>
                <DrawerTitle>Fórmulas Favoritadas</DrawerTitle>
                <p className="text-desc-regular text-content-text mt-[2px]">
                  Suas fórmulas personalizadas geradas com IA
                </p>
              </div>
            </div>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody className="space-y-[12px]">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="border border-base-border rounded-small p-[20px] hover:border-primary-medium transition-colors"
              >
                <div className="flex items-start justify-between mb-[12px]">
                  <div>
                    <h4 className="text-tag-bold text-content-title">{fav.title}</h4>
                    {fav.source === 'library' && fav.baseFormula && (
                      <p className="text-desc-regular text-content-text mt-[2px]">
                        Baseada em: {fav.baseFormula.name}
                        {fav.baseFormula.group && ` · ${fav.baseFormula.group.name}`}
                      </p>
                    )}
                    {fav.source === 'chat' && fav.patientName && (
                      <p className="text-desc-regular text-content-text mt-[2px]">
                        Paciente: {fav.patientName}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnfavorite(fav)}
                    className="p-[6px] rounded-tiny text-[#E65100] hover:bg-[#FFF3E0] transition-colors shrink-0"
                    title="Remover dos favoritos"
                  >
                    <Star className="w-[16px] h-[16px] fill-current" strokeWidth={1.5} />
                  </button>
                </div>

                {fav.source === 'library' ? (
                  <>
                    <div className="text-desc-medium text-content-text mb-[4px] uppercase tracking-wider">
                      Solicitação
                    </div>
                    <p className="text-paragraph text-content-text mb-[12px] italic">"{fav.userRequest}"</p>
                    <div className="mb-[8px]">
                      <span className="text-desc-medium text-content-text uppercase tracking-wider">Composição</span>
                      <div className="text-paragraph text-content-title mt-[4px] whitespace-pre-line prose prose-sm max-w-none">
                        <ReactMarkdown>{fav.aiResultFormula}</ReactMarkdown>
                      </div>
                    </div>
                    <div>
                      <span className="text-desc-medium text-content-text uppercase tracking-wider">Modo de uso</span>
                      <div className="text-paragraph text-content-text mt-[4px] whitespace-pre-line prose prose-sm max-w-none">
                        <ReactMarkdown>{fav.aiResultInstructions}</ReactMarkdown>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="prose prose-sm max-w-none prose-headings:text-content-title prose-p:text-content-text prose-strong:text-primary-dark prose-li:text-content-text">
                    <ReactMarkdown>{fav.content}</ReactMarkdown>
                  </div>
                )}

                <div className="mt-[12px] pt-[12px] border-t border-base-border/50 flex items-center justify-between">
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
              <div className="py-[32px] text-center text-content-text">
                Você ainda não favoritou nenhuma fórmula
              </div>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
