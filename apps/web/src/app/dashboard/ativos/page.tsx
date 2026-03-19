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
import {
  Plus, Pencil, Trash2, Search, FlaskConical, Download, FileText, Upload, Cpu, Eye, X,
} from 'lucide-react'

interface Ativo {
  id: string
  name: string
  description?: string
  filePath?: string
  fileName?: string
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
  const [form, setForm] = useState({ name: '', description: '' })
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Ativo | null>(null)
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
    setForm({ name: '', description: '' })
    setFile(null)
    setIsOpen(true)
  }

  function openEdit(a: Ativo) {
    setEditing(a)
    setForm({ name: a.name, description: a.description || '' })
    setFile(null)
    setIsOpen(true)
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
        formData.append('file', file)
        await api.post('/ativos', formData)
      } else {
        await api.post('/ativos', form)
      }
    }
    setIsOpen(false)
    loadAtivos()
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
                    {a.fileName && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setViewing(a)} title="Visualizar">
                          <Eye className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
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
                        onClick={() => handleProcess(a.id)}
                        disabled={processing === a.id}
                        title="Processar"
                      >
                        <Cpu className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
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

                {/* Mobile: layout empilhado */}
                <div className="md:hidden">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-small bg-primary-light flex items-center justify-center flex-shrink-0">
                      <FlaskConical className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-tag-semibold text-content-title">{a.name}</p>
                      <p className="text-desc-regular text-content-text line-clamp-1 mt-0.5">{a.description || 'Sem descrição'}</p>
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        {a.fileName && (
                          <Badge variant="success">
                            <FileText className="w-[12px] h-[12px] mr-1" strokeWidth={1.5} /> PDF
                          </Badge>
                        )}
                        <span className="text-desc-regular text-content-text">
                          {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-2 -mr-1">
                    {a.fileName && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setViewing(a)} title="Visualizar">
                          <Eye className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
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
                        onClick={() => handleProcess(a.id)}
                        disabled={processing === a.id}
                        title="Processar"
                      >
                        <Cpu className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
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
              <div>
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
    </div>
  )
}
