'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerCloseButton,
} from '@/components/ui/drawer'
import { Select } from '@/components/ui/select'
import {
  Plus, Pencil, Trash2, Search, FlaskConical, Download, FileText, Upload, Cpu, Eye, X,
  Sparkles, Loader2,
} from 'lucide-react'

interface Ativo {
  id: string
  name: string
  description?: string
  filePath?: string
  fileName?: string
  usageType?: string
  compatibleForms?: string
  category?: string
  concentrationMin?: string
  concentrationMax?: string
  contraindications?: string
  technicalNotes?: string
  createdAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/proxy'

export default function AtivosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-[48px]">
        <div className="w-6 h-6 border-2 border-primary-dark border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AtivosContent />
    </Suspense>
  )
}

function AtivosContent() {
  const { isAdmin } = useAuth()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const PAGE_SIZE = 50
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Ativo | null>(null)
  const [form, setForm] = useState({
    name: '', description: '', usageType: '', compatibleForms: '',
    category: '', concentrationMin: '', concentrationMax: '',
    contraindications: '', technicalNotes: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [fillingWithAI, setFillingWithAI] = useState(false)
  const [filledFields, setFilledFields] = useState<Set<string>>(new Set())
  const [viewing, setViewing] = useState<Ativo | null>(null)
  const [detailAtivo, setDetailAtivo] = useState<Ativo | null>(null)
  const highlightRef = useRef<HTMLLIElement>(null)
  const sentinelRef = useRef<HTMLLIElement>(null)

  useEffect(() => { loadAtivos() }, [])

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightId, ativos])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search])

  const onSentinel = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting) {
      setVisibleCount((prev) => prev + PAGE_SIZE)
    }
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(onSentinel, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [onSentinel, loading])

  async function loadAtivos() {
    const data = await api.get<Ativo[]>('/ativos')
    setAtivos(data)
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({
      name: '', description: '', usageType: '', compatibleForms: '',
      category: '', concentrationMin: '', concentrationMax: '',
      contraindications: '', technicalNotes: '',
    })
    setFile(null)
    setIsOpen(true)
  }

  function openEdit(a: Ativo) {
    setEditing(a)
    setForm({
      name: a.name, description: a.description || '',
      usageType: a.usageType || '', compatibleForms: a.compatibleForms || '',
      category: a.category || '', concentrationMin: a.concentrationMin || '',
      concentrationMax: a.concentrationMax || '', contraindications: a.contraindications || '',
      technicalNotes: a.technicalNotes || '',
    })
    setFile(null)
    setIsOpen(true)
  }

  function openDetail(a: Ativo) {
    setDetailAtivo(a)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (editing) {
      await api.put(`/ativos/${editing.id}`, form)
    } else {
      if (file) {
        const formData = new FormData()
        formData.append('name', form.name)
        formData.append('description', form.description)
        if (form.usageType) formData.append('usageType', form.usageType)
        if (form.compatibleForms) formData.append('compatibleForms', form.compatibleForms)
        if (form.category) formData.append('category', form.category)
        if (form.concentrationMin) formData.append('concentrationMin', form.concentrationMin)
        if (form.concentrationMax) formData.append('concentrationMax', form.concentrationMax)
        if (form.contraindications) formData.append('contraindications', form.contraindications)
        if (form.technicalNotes) formData.append('technicalNotes', form.technicalNotes)
        formData.append('file', file)
        await api.post('/ativos', formData)
      } else {
        await api.post('/ativos', form)
      }
    }
    setIsOpen(false)
    loadAtivos()
  }

  async function handleAnalyze(id: string) {
    setAnalyzing(id)
    try {
      const updated = await api.post<Ativo>(`/ativos/${id}/analyze`)
      setAtivos(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
      if (detailAtivo?.id === id) setDetailAtivo({ ...detailAtivo, ...updated })
      alert('Ativo analisado com sucesso pela IA!')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAnalyzing(null)
    }
  }

  async function fillWithAI() {
    if (!file && !editing?.filePath) return
    setFillingWithAI(true)
    setFilledFields(new Set())

    try {
      let result: any

      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        result = await api.post<any>('/ativos/analyze-pdf', formData)
      } else if (editing) {
        result = await api.post<any>(`/ativos/${editing.id}/analyze`)
      }

      if (!result) throw new Error('Sem resultado da análise')

      const fieldMap: { key: keyof typeof form; value: string }[] = [
        { key: 'description', value: result.description || '' },
        { key: 'usageType', value: result.usageType || '' },
        { key: 'category', value: result.category || '' },
        { key: 'compatibleForms', value: result.compatibleForms || '' },
        { key: 'concentrationMin', value: result.concentrationMin || '' },
        { key: 'concentrationMax', value: result.concentrationMax || '' },
        { key: 'contraindications', value: result.contraindications || '' },
        { key: 'technicalNotes', value: result.technicalNotes || '' },
      ]

      for (const field of fieldMap) {
        if (field.value && field.value !== 'Não informado') {
          await new Promise(r => setTimeout(r, 150))
          setForm(prev => ({ ...prev, [field.key]: field.value }))
          setFilledFields(prev => new Set(prev).add(field.key))
        }
      }
    } catch (err: any) {
      alert('Erro ao analisar com IA: ' + err.message)
    } finally {
      setFillingWithAI(false)
      setTimeout(() => setFilledFields(new Set()), 3000)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este ativo?')) return
    await api.delete(`/ativos/${id}`)
    loadAtivos()
  }

  async function handleProcess(id: string) {
    setProcessing(id)
    try {
      await api.post(`/ai/process-ativo/${id}`)
      alert('Ativo processado com sucesso!')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessing(null)
    }
  }

  function downloadFile(id: string) {
    const token = localStorage.getItem('prescreva_token')
    window.open(`${API_URL}/ativos/${id}/download?token=${token}`, '_blank')
  }

  const filtered = ativos
    .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-[24px]">
        <div>
          <h1 className="text-h2 lg:text-h1 text-content-title">Base de Ativos</h1>
          <p className="text-paragraph text-content-text mt-1 lg:mt-[12px]">
            {isAdmin ? 'Gerencie os ativos da base de conhecimento' : 'Consulte os ativos disponíveis'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="self-start sm:self-auto">
            <Plus className="w-[18px] h-[18px]" strokeWidth={1.5} />
            Novo ativo
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-content-text" strokeWidth={1.5} />
            <Input
              placeholder="Buscar ativo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-[40px]"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-[24px]">
          {!loading && filtered.length > 0 && (
            <p className="text-desc-regular text-content-text mb-[12px]">
              Exibindo {visible.length} de {filtered.length} ativos
            </p>
          )}
          <ul className="space-y-[12px]">
            {visible.map((a) => (
              <li
                key={a.id}
                ref={a.id === highlightId ? highlightRef : undefined}
                className={`p-3 lg:p-[12px] rounded-small border transition-colors ${
                  a.id === highlightId
                    ? 'border-primary-dark bg-primary-light/50 ring-2 ring-primary-dark/20'
                    : 'border-base-border hover:bg-primary-light/30'
                }`}
              >
                {/* Desktop: tudo em uma linha */}
                <div className="hidden md:flex items-center gap-[12px]">
                  <div className="w-9 h-9 rounded-small bg-primary-light flex items-center justify-center flex-shrink-0">
                    <FlaskConical className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-tag-semibold text-content-title truncate">{a.name}</p>
                    <p className="text-desc-regular text-content-text truncate">{a.description || 'Sem descrição'}</p>
                    <div className="flex items-center flex-wrap gap-1 mt-1">
                      {a.usageType && <Badge variant="secondary">{a.usageType}</Badge>}
                      {a.category && <Badge variant="secondary">{a.category}</Badge>}
                      {(a.concentrationMin || a.concentrationMax) && (
                        <Badge variant="secondary">
                          {[a.concentrationMin, a.concentrationMax].filter(Boolean).join(' - ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-[12px] flex-shrink-0 ml-[12px]">
                    {a.fileName && (
                      <Badge variant="success">
                        <FileText className="w-[12px] h-[12px] mr-1" strokeWidth={1.5} /> PDF
                      </Badge>
                    )}
                    <span className="text-desc-regular text-content-text">
                      {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-[12px]">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(a)} title="Detalhes">
                      <Eye className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                    </Button>
                    {a.fileName && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setViewing(a)} title="Visualizar PDF">
                          <FileText className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadFile(a.id)} title="Baixar">
                          <Download className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                      </>
                    )}
                    {isAdmin && a.filePath && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleProcess(a.id)}
                          disabled={processing === a.id}
                          title="Processar embeddings"
                        >
                          <Cpu className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAnalyze(a.id)}
                          disabled={analyzing === a.id}
                          title="Analisar com IA"
                        >
                          {analyzing === a.id ? (
                            <Loader2 className="w-[14px] h-[14px] text-primary-dark animate-spin" strokeWidth={1.5} />
                          ) : (
                            <Sparkles className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                          )}
                        </Button>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)} title="Editar">
                          <Pencil className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} title="Excluir">
                          <Trash2 className="w-[14px] h-[14px] text-error" strokeWidth={1.5} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile: layout empilhado */}
                <div className="md:hidden">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-small bg-primary-light flex items-center justify-center flex-shrink-0">
                      <FlaskConical className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-tag-semibold text-content-title">{a.name}</p>
                      <p className="text-desc-regular text-content-text line-clamp-1 mt-0.5">{a.description || 'Sem descrição'}</p>
                      <div className="flex items-center flex-wrap gap-1 mt-2">
                        {a.usageType && <Badge variant="secondary">{a.usageType}</Badge>}
                        {a.category && <Badge variant="secondary">{a.category}</Badge>}
                        {a.fileName && (
                          <Badge variant="success">
                            <FileText className="w-[12px] h-[12px] mr-1" strokeWidth={1.5} /> PDF
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-2 -mr-1">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(a)} title="Detalhes">
                      <Eye className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                    </Button>
                    {a.fileName && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setViewing(a)} title="Visualizar PDF">
                          <FileText className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadFile(a.id)} title="Baixar">
                          <Download className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                      </>
                    )}
                    {isAdmin && a.filePath && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAnalyze(a.id)}
                        disabled={analyzing === a.id}
                        title="Analisar com IA"
                      >
                        {analyzing === a.id ? (
                          <Loader2 className="w-[14px] h-[14px] text-primary-dark animate-spin" strokeWidth={1.5} />
                        ) : (
                          <Sparkles className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        )}
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)} title="Editar">
                          <Pencil className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} title="Excluir">
                          <Trash2 className="w-[14px] h-[14px] text-error" strokeWidth={1.5} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {hasMore && (
              <li ref={sentinelRef} className="py-[16px] flex justify-center">
                <div className="w-5 h-5 border-2 border-primary-dark border-t-transparent rounded-full animate-spin" />
              </li>
            )}
            {loading && (
              <li className="py-[48px] flex justify-center">
                <div className="w-6 h-6 border-2 border-primary-dark border-t-transparent rounded-full animate-spin" />
              </li>
            )}
            {!loading && filtered.length === 0 && (
              <li className="py-[48px] text-center text-content-text">
                Nenhum ativo encontrado
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* PDF Viewer Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 lg:p-0">
          <div className="bg-white rounded-2xl shadow-2xl w-full h-full lg:w-[90vw] lg:h-[90vh] max-w-5xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{viewing.name}</h3>
                  <p className="text-xs text-gray-500">{viewing.fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadFile(viewing.id)}>
                  <Download className="w-4 h-4" strokeWidth={1.5} /> Baixar
                </Button>
                <button
                  onClick={() => setViewing(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe
                src={`${API_URL}/ativos/${viewing.id}/view?token=${localStorage.getItem('prescreva_token')}`}
                className="w-full h-full border-0"
                title={`PDF - ${viewing.name}`}
              />
            </div>
          </div>
        </div>
      )}

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editing ? 'Editar ativo' : 'Novo ativo'}</DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <DrawerBody className="space-y-[24px]">
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">Nome</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className={`transition-all duration-500 rounded-small p-[2px] ${filledFields.has('description') ? 'bg-green-50 ring-2 ring-green-400/50' : ''}`}>
                <label className="block text-tag-semibold text-content-title mb-[12px]">Descrição</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descreva o ativo, suas propriedades e indicações..."
                  rows={3}
                />
              </div>
              {!editing && (
                <div>
                  <label className="block text-tag-semibold text-content-title mb-[12px]">
                    Arquivo PDF (opcional)
                  </label>
                  <div className="border-2 border-dashed border-base-border rounded-regular p-[24px] text-center hover:border-primary-dark/40 transition-colors">
                    <Upload className="w-[24px] h-[24px] text-content-text mx-auto mb-[12px]" strokeWidth={1.5} />
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="text-paragraph text-content-text"
                    />
                    {file && (
                      <p className="text-desc-medium text-primary-dark mt-[12px]">{file.name}</p>
                    )}
                  </div>
                </div>
              )}

              {(file || editing?.filePath) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={fillWithAI}
                  disabled={fillingWithAI}
                  className="w-full border-primary-dark/30 hover:bg-primary-light hover:border-primary-dark/50 relative overflow-hidden"
                >
                  {fillingWithAI ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-light/0 via-primary-light/60 to-primary-light/0 animate-shimmer" />
                      <Loader2 className="w-[16px] h-[16px] animate-spin text-primary-dark" strokeWidth={1.5} />
                      <span className="text-primary-dark">Analisando PDF com IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-[16px] h-[16px] text-primary-dark" strokeWidth={1.5} />
                      Preencher com IA
                    </>
                  )}
                </Button>
              )}

              <div className="border-t border-base-border pt-[24px]">
                <p className="text-tag-semibold text-content-title mb-[16px]">Informações técnicas</p>
                <div className="space-y-[16px]">
                  <div className="grid grid-cols-2 gap-[12px]">
                    <div className={`transition-all duration-500 rounded-small p-[2px] ${filledFields.has('usageType') ? 'bg-green-50 ring-2 ring-green-400/50' : ''}`}>
                      <label className="block text-desc-medium text-content-text mb-[8px]">Tipo de uso</label>
                      <Select
                        value={form.usageType}
                        onChange={(e) => setForm({ ...form, usageType: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        <option value="Tópico">Tópico</option>
                        <option value="Oral">Oral</option>
                        <option value="Injetável">Injetável</option>
                        <option value="Tópico/Oral">Tópico/Oral</option>
                        <option value="Tópico/Injetável">Tópico/Injetável</option>
                        <option value="Oral/Injetável">Oral/Injetável</option>
                      </Select>
                    </div>
                    <div className={`transition-all duration-500 rounded-small p-[2px] ${filledFields.has('category') ? 'bg-green-50 ring-2 ring-green-400/50' : ''}`}>
                      <label className="block text-desc-medium text-content-text mb-[8px]">Categoria</label>
                      <Select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        <option value="Despigmentante">Despigmentante</option>
                        <option value="Antioxidante">Antioxidante</option>
                        <option value="Hidratante">Hidratante</option>
                        <option value="Anti-aging">Anti-aging</option>
                        <option value="Ácido">Ácido</option>
                        <option value="Vitamina">Vitamina</option>
                        <option value="Peptídeo">Peptídeo</option>
                        <option value="Protetor Solar">Protetor Solar</option>
                        <option value="Anti-inflamatório">Anti-inflamatório</option>
                        <option value="Antimicrobiano">Antimicrobiano</option>
                        <option value="Cicatrizante">Cicatrizante</option>
                        <option value="Tensor">Tensor</option>
                        <option value="Clareador">Clareador</option>
                        <option value="Esfoliante">Esfoliante</option>
                        <option value="Nutritivo">Nutritivo</option>
                      </Select>
                    </div>
                  </div>
                  <div className={`transition-all duration-500 rounded-small p-[2px] ${filledFields.has('compatibleForms') ? 'bg-green-50 ring-2 ring-green-400/50' : ''}`}>
                    <label className="block text-desc-medium text-content-text mb-[8px]">Formas farmacêuticas compatíveis</label>
                    <Input
                      value={form.compatibleForms}
                      onChange={(e) => setForm({ ...form, compatibleForms: e.target.value })}
                      placeholder="Ex: Creme, Gel, Sérum, Loção, Cápsula"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-[12px]">
                    <div className={`transition-all duration-500 rounded-small p-[2px] ${filledFields.has('concentrationMin') ? 'bg-green-50 ring-2 ring-green-400/50' : ''}`}>
                      <label className="block text-desc-medium text-content-text mb-[8px]">Concentração mínima</label>
                      <Input
                        value={form.concentrationMin}
                        onChange={(e) => setForm({ ...form, concentrationMin: e.target.value })}
                        placeholder="Ex: 0.5%"
                      />
                    </div>
                    <div className={`transition-all duration-500 rounded-small p-[2px] ${filledFields.has('concentrationMax') ? 'bg-green-50 ring-2 ring-green-400/50' : ''}`}>
                      <label className="block text-desc-medium text-content-text mb-[8px]">Concentração máxima</label>
                      <Input
                        value={form.concentrationMax}
                        onChange={(e) => setForm({ ...form, concentrationMax: e.target.value })}
                        placeholder="Ex: 5%"
                      />
                    </div>
                  </div>
                  <div className={`transition-all duration-500 rounded-small p-[2px] ${filledFields.has('contraindications') ? 'bg-green-50 ring-2 ring-green-400/50' : ''}`}>
                    <label className="block text-desc-medium text-content-text mb-[8px]">Contraindicações</label>
                    <Textarea
                      value={form.contraindications}
                      onChange={(e) => setForm({ ...form, contraindications: e.target.value })}
                      placeholder="Ex: Gestantes, pele sensível, uso diurno sem FPS..."
                      rows={2}
                    />
                  </div>
                  <div className={`transition-all duration-500 rounded-small p-[2px] ${filledFields.has('technicalNotes') ? 'bg-green-50 ring-2 ring-green-400/50' : ''}`}>
                    <label className="block text-desc-medium text-content-text mb-[8px]">Observações técnicas</label>
                    <Textarea
                      value={form.technicalNotes}
                      onChange={(e) => setForm({ ...form, technicalNotes: e.target.value })}
                      placeholder="Ex: pH ideal < 3.5, fotossensível, incompatível com niacinamida..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </DrawerBody>
            <DrawerFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editing ? 'Salvar' : 'Criar'}</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Detail Drawer */}
      <Drawer open={!!detailAtivo} onOpenChange={(open) => { if (!open) setDetailAtivo(null) }}>
        <DrawerContent>
          {detailAtivo && (
            <>
              <DrawerHeader>
                <DrawerTitle>Detalhes do ativo</DrawerTitle>
                <DrawerCloseButton />
              </DrawerHeader>
              <DrawerBody className="space-y-[20px]">
                <div>
                  <p className="text-desc-medium text-content-text mb-1">Nome</p>
                  <p className="text-tag-semibold text-content-title">{detailAtivo.name}</p>
                </div>
                <div>
                  <p className="text-desc-medium text-content-text mb-1">Descrição</p>
                  <p className="text-paragraph text-content-title">{detailAtivo.description || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-[16px]">
                  <div>
                    <p className="text-desc-medium text-content-text mb-1">Tipo de uso</p>
                    {detailAtivo.usageType ? (
                      <Badge variant="secondary">{detailAtivo.usageType}</Badge>
                    ) : (
                      <p className="text-tag-medium text-content-title">-</p>
                    )}
                  </div>
                  <div>
                    <p className="text-desc-medium text-content-text mb-1">Categoria</p>
                    {detailAtivo.category ? (
                      <Badge variant="secondary">{detailAtivo.category}</Badge>
                    ) : (
                      <p className="text-tag-medium text-content-title">-</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-desc-medium text-content-text mb-1">Formas compatíveis</p>
                  {detailAtivo.compatibleForms ? (
                    <div className="flex flex-wrap gap-1">
                      {detailAtivo.compatibleForms.split(',').map((f, i) => (
                        <Badge key={i} variant="secondary">{f.trim()}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-tag-medium text-content-title">-</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-[16px]">
                  <div>
                    <p className="text-desc-medium text-content-text mb-1">Concentração mínima</p>
                    <p className="text-tag-medium text-content-title">{detailAtivo.concentrationMin || '-'}</p>
                  </div>
                  <div>
                    <p className="text-desc-medium text-content-text mb-1">Concentração máxima</p>
                    <p className="text-tag-medium text-content-title">{detailAtivo.concentrationMax || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-desc-medium text-content-text mb-1">Contraindicações</p>
                  <p className="text-paragraph text-content-title">{detailAtivo.contraindications || '-'}</p>
                </div>
                <div>
                  <p className="text-desc-medium text-content-text mb-1">Observações técnicas</p>
                  <p className="text-paragraph text-content-title">{detailAtivo.technicalNotes || '-'}</p>
                </div>
                {detailAtivo.fileName && (
                  <div>
                    <p className="text-desc-medium text-content-text mb-1">Arquivo</p>
                    <Badge variant="success">
                      <FileText className="w-[12px] h-[12px] mr-1" strokeWidth={1.5} />
                      {detailAtivo.fileName}
                    </Badge>
                  </div>
                )}
              </DrawerBody>
              <DrawerFooter>
                {isAdmin && detailAtivo.filePath && (
                  <Button
                    variant="outline"
                    onClick={() => handleAnalyze(detailAtivo.id)}
                    disabled={analyzing === detailAtivo.id}
                  >
                    {analyzing === detailAtivo.id ? (
                      <Loader2 className="w-[14px] h-[14px] animate-spin" strokeWidth={1.5} />
                    ) : (
                      <Sparkles className="w-[14px] h-[14px]" strokeWidth={1.5} />
                    )}
                    Analisar com IA
                  </Button>
                )}
                {isAdmin && (
                  <Button onClick={() => { openEdit(detailAtivo); setDetailAtivo(null) }}>
                    <Pencil className="w-[14px] h-[14px]" strokeWidth={1.5} />
                    Editar
                  </Button>
                )}
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}
