'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles, Send, Star, Loader2, RefreshCw, Info, Check, UserCircle,
  FlaskConical, FileText, X, Download, MessageSquare, Trash2, Clock,
  ChevronDown, Search,
} from 'lucide-react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'

interface Patient {
  id: string
  name: string
  age: number
  sex: string
  skinType?: string
  treatmentGoal?: string
}

interface ReferencedAtivo {
  id: string
  name: string
  fileName?: string | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  saved?: boolean
  savedType?: 'favorite' | 'saved'
  referencedAtivos?: ReferencedAtivo[]
}

interface ConversationSummary {
  id: string
  patientId: string
  title?: string
  createdAt: string
  updatedAt: string
  patient: { name: string }
  messages: { content: string; role: string; createdAt: string }[]
}

interface ConversationDetail {
  id: string
  patientId: string
  title?: string
  patient: Patient
  messages: {
    id: string
    role: string
    content: string
    referencedAtivos: ReferencedAtivo[] | null
    createdAt: string
  }[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

function isFormulaResponse(content: string): boolean {
  const indicators = [
    'modo de uso', 'aplicar', 'q.s.p', 'qsp', 'creme base', 'gel base',
    'veículo', 'composição', 'formulação', 'fórmula', '%', 'base q.s.p',
  ]
  const lower = content.toLowerCase()
  return indicators.filter(i => lower.includes(i)).length >= 2
}

function stripBold(text: string): string {
  return text.replace(/\*\*/g, '').trim()
}

function parseFormulaContent(content: string) {
  const lines = content.split('\n')
  let title = ''
  const compositionLines: string[] = []
  const instructionLines: string[] = []
  const observationLines: string[] = []
  let section: 'title' | 'composition' | 'instructions' | 'observations' | 'other' = 'title'
  const modoDeUsoPattern = /^[\s#*]*\*{0,2}modo de uso\*{0,2}[:\s]*/i
  const observacoesPattern = /^[\s#*]*\*{0,2}observa[çc][õo]es\*{0,2}[:\s]*/i

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (observacoesPattern.test(trimmed)) {
      section = 'observations'
      const afterColon = stripBold(trimmed.replace(observacoesPattern, ''))
      if (afterColon) observationLines.push(afterColon)
      continue
    }

    if (modoDeUsoPattern.test(trimmed)) {
      section = 'instructions'
      const afterColon = stripBold(trimmed.replace(modoDeUsoPattern, ''))
      if (afterColon) instructionLines.push(afterColon)
      continue
    }

    if (section === 'title' && !title) {
      const cleaned = trimmed.replace(/^[#*]+\s*/, '').trim()
      if (cleaned) { title = stripBold(cleaned); section = 'composition'; continue }
    }

    if (section === 'observations') observationLines.push(stripBold(trimmed))
    else if (section === 'instructions') instructionLines.push(stripBold(trimmed))
    else compositionLines.push(trimmed)
  }

  if (!title && compositionLines.length > 0) {
    const first = compositionLines[0].replace(/^[#*•\-–]+\s*/, '').trim()
    if (first && !first.includes('%') && first.length < 60) {
      title = stripBold(first)
      compositionLines.shift()
    }
  }

  return {
    title: title || 'Formulação',
    composition: compositionLines.join('\n'),
    instructions: stripBold(instructionLines.join(' ')),
    observations: stripBold(observationLines.join(' ')),
  }
}

function FormulaCard({ content, onFavorite, saving, saved, savedType, referencedAtivos, onOpenAtivo }: {
  content: string
  onFavorite: () => void
  saving: boolean
  saved?: boolean
  savedType?: 'favorite' | 'saved'
  referencedAtivos?: ReferencedAtivo[]
  onOpenAtivo: (ativo: ReferencedAtivo) => void
}) {
  const { title, composition, instructions, observations } = parseFormulaContent(content)

  return (
    <div className="w-full max-w-full lg:max-w-[560px]">
      <div className="rounded-regular border border-primary-medium/30 bg-base-white overflow-hidden shadow-sm border-l-[4px] border-l-primary-dark">
        <div className="p-[24px] pb-[16px]">
          <h4 className="text-h3 text-content-title mb-[16px]">{title}</h4>
          {composition && (
            <div className="text-paragraph text-content-text leading-relaxed">
              <div className="prose prose-sm max-w-none prose-p:my-[2px] prose-li:my-[1px] prose-ul:my-[4px] prose-strong:text-content-title prose-li:text-content-text">
                <ReactMarkdown>{composition}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
        {(instructions || observations) && (
          <div className="mx-[24px] mb-[16px] rounded-small bg-base-background border border-base-border p-[16px]">
            <div className="flex items-start gap-[10px]">
              <div className="w-[22px] h-[22px] rounded-full bg-primary-dark flex items-center justify-center flex-shrink-0 mt-[1px]">
                <Info className="w-[12px] h-[12px] text-[#FFFFFF]" strokeWidth={2} />
              </div>
              <div className="text-paragraph text-content-text leading-relaxed">
                {instructions && (
                  <p>
                    <span className="text-tag-bold text-content-title">Modo de uso: </span>
                    {instructions}
                  </p>
                )}
                {observations && (
                  <p className="mt-[8px]">
                    <span className="text-tag-bold text-content-title">Observações: </span>
                    {observations}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {referencedAtivos && referencedAtivos.length > 0 && (
          <div className="mx-[24px] mb-[24px]">
            <p className="text-desc-medium text-content-text uppercase tracking-wider mb-[8px]">
              Ativos referenciados
            </p>
            <div className="flex flex-wrap gap-[8px]">
              {referencedAtivos.map((ativo) => (
                <button
                  key={ativo.id}
                  onClick={() => onOpenAtivo(ativo)}
                  className="inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-small border border-primary-medium/40 bg-primary-light/40 hover:bg-primary-light hover:border-primary-dark/30 transition-all group cursor-pointer"
                >
                  {ativo.fileName ? (
                    <FileText className="w-[12px] h-[12px] text-primary-dark" strokeWidth={1.5} />
                  ) : (
                    <FlaskConical className="w-[12px] h-[12px] text-primary-dark" strokeWidth={1.5} />
                  )}
                  <span className="text-desc-medium text-primary-dark font-medium">{ativo.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="border-t border-primary-medium/20 px-[24px] py-[12px] flex items-center justify-end">
          {saved ? (
            <span className="flex items-center gap-[8px] text-desc-medium text-primary-dark">
              <Check className="w-[14px] h-[14px]" strokeWidth={2} />
              {savedType === 'favorite' ? 'Salvo nos favoritos' : 'Fórmula salva'}
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onFavorite}
              disabled={saving}
              className="border-primary-dark/20 hover:bg-primary-light hover:border-primary-dark/40"
            >
              <Star className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
              Favoritar Fórmula
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IAPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-[48px]">
        <div className="w-6 h-6 border-2 border-primary-dark border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <IAContent />
    </Suspense>
  )
}

function IAContent() {
  const searchParams = useSearchParams()
  const preselectedPatient = searchParams.get('paciente')
  const { user } = useAuth()

  const avatarUrl = user?.avatar ? `${API_URL}/uploads/${user.avatar}` : null

  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewingAtivo, setViewingAtivo] = useState<ReferencedAtivo | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPatientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    api.get<Patient[]>('/patients').then((data) => {
      setPatients(data)
      if (preselectedPatient) {
        setSelectedPatient(preselectedPatient)
      }
    })
  }, [preselectedPatient])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = useCallback(async (patientId?: string) => {
    try {
      const query = patientId ? `?patientId=${patientId}` : ''
      const data = await api.get<ConversationSummary[]>(`/conversations${query}`)
      setConversations(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (selectedPatient) loadConversations(selectedPatient)
  }, [selectedPatient, loadConversations])

  async function loadConversation(convId: string) {
    try {
      const data = await api.get<ConversationDetail>(`/conversations/${convId}`)
      setActiveConversationId(convId)
      setSelectedPatient(data.patientId)
      setMessages(
        data.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          referencedAtivos: m.referencedAtivos || undefined,
        }))
      )
      setShowHistory(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function deleteConversation(convId: string) {
    if (!confirm('Excluir esta conversa?')) return
    try {
      await api.delete(`/conversations/${convId}`)
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (activeConversationId === convId) {
        setActiveConversationId(null)
        setMessages([])
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function sendMessage() {
    if (!input.trim() || !selectedPatient || loading) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    let convId = activeConversationId

    try {
      if (!convId) {
        const conv = await api.post<{ id: string }>('/conversations', {
          patientId: selectedPatient,
          title: input.trim().slice(0, 80),
        })
        convId = conv.id
        setActiveConversationId(convId)
      }

      await api.post(`/conversations/${convId}/messages`, {
        role: 'user',
        content: userMessage.content,
      })

      const result = await api.post<{ response: string; referencedAtivos: ReferencedAtivo[] }>('/ai/chat', {
        patientId: selectedPatient,
        messages: newMessages,
      })

      await api.post(`/conversations/${convId}/messages`, {
        role: 'assistant',
        content: result.response,
        referencedAtivos: result.referencedAtivos,
      })

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: result.response,
          referencedAtivos: result.referencedAtivos,
        },
      ])

      loadConversations(selectedPatient)
    } catch (err: any) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Erro: ${err.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function saveFormulaAtIndex(index: number, favorite: boolean) {
    if (!selectedPatient) return
    const msg = messages[index]
    if (!msg || msg.role !== 'assistant') return

    setSaving(true)
    try {
      const patient = patients.find((p) => p.id === selectedPatient)
      const { title } = parseFormulaContent(msg.content)
      await api.post('/formulas', {
        title: title || `Fórmula - ${patient?.name} - ${new Date().toLocaleDateString('pt-BR')}`,
        content: msg.content,
        patientId: selectedPatient,
        favorite,
      })

      setMessages(prev => prev.map((m, i) =>
        i === index ? { ...m, saved: true, savedType: favorite ? 'favorite' : 'saved' } : m
      ))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  function newConversation() {
    setActiveConversationId(null)
    setMessages([])
    setInput('')
  }

  const currentPatient = patients.find((p) => p.id === selectedPatient)
  const patientConversations = conversations.filter(c => c.patientId === selectedPatient)

  return (
    <div className="h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-[24px]">
        <div>
          <h1 className="text-h2 lg:text-h1 text-content-title">Criar com IA</h1>
          <p className="text-paragraph text-content-text mt-1 lg:mt-[12px]">Gere fórmulas magistrais com inteligência artificial</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-[12px]">
          {selectedPatient && patientConversations.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <Clock className="w-[14px] h-[14px]" strokeWidth={1.5} />
              <span className="hidden sm:inline">Histórico</span> ({patientConversations.length})
            </Button>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={newConversation}>
              <RefreshCw className="w-[14px] h-[14px]" strokeWidth={1.5} /> <span className="hidden sm:inline">Nova conversa</span>
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 lg:mb-[24px] relative" ref={dropdownRef}>
        <Card className="!p-0 overflow-visible">
          <button
            type="button"
            onClick={() => { setPatientDropdownOpen(!patientDropdownOpen); setPatientSearch('') }}
            className="w-full flex items-center gap-3 lg:gap-[16px] px-3 lg:px-[20px] py-3 lg:py-[14px] text-left cursor-pointer hover:bg-base-background/50 transition-colors rounded-regular"
          >
            <div className={`w-9 lg:w-10 h-9 lg:h-10 rounded-small flex items-center justify-center flex-shrink-0 ${currentPatient ? 'bg-primary-dark' : 'bg-base-disable'}`}>
              <UserCircle className={`w-[20px] h-[20px] ${currentPatient ? 'text-[#FFFFFF]' : 'text-content-text'}`} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              {currentPatient ? (
                <p className="text-tag-bold text-content-title truncate">{currentPatient.name}</p>
              ) : (
                <p className="text-tag-medium text-content-text">Selecione um paciente...</p>
              )}
            </div>
            {currentPatient && (
              <div className="hidden sm:flex items-center gap-[8px] flex-shrink-0">
                <Badge variant="secondary">{currentPatient.age} anos</Badge>
                <Badge variant="secondary">{currentPatient.sex.charAt(0) + currentPatient.sex.slice(1).toLowerCase()}</Badge>
                {currentPatient.skinType && (
                  <Badge variant="secondary">Pele: {currentPatient.skinType}</Badge>
                )}
              </div>
            )}
            <ChevronDown className={`w-[16px] h-[16px] text-content-text flex-shrink-0 transition-transform ${patientDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
          </button>
        </Card>

        {patientDropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-[4px] z-50 bg-base-white border border-base-border rounded-small shadow-lg overflow-hidden">
            <div className="p-[12px] border-b border-base-border">
              <div className="relative">
                <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-content-text" strokeWidth={1.5} />
                <Input
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Buscar paciente..."
                  className="pl-[36px] !h-9 text-paragraph"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[240px] overflow-y-auto scrollbar-thin">
              {patients
                .filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()))
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(p.id)
                      setActiveConversationId(null)
                      setMessages([])
                      setShowHistory(false)
                      setPatientDropdownOpen(false)
                    }}
                    className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] text-left transition-colors ${
                      p.id === selectedPatient
                        ? 'bg-primary-light/50'
                        : 'hover:bg-base-background'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-small flex items-center justify-center flex-shrink-0 ${
                      p.id === selectedPatient ? 'bg-primary-dark' : 'bg-primary-light'
                    }`}>
                      <span className={`text-desc-medium font-bold ${p.id === selectedPatient ? 'text-[#FFFFFF]' : 'text-primary-dark'}`}>
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-tag-medium text-content-title truncate">{p.name}</p>
                      <p className="text-desc-regular text-content-text">
                        {p.age} anos · {p.sex.charAt(0) + p.sex.slice(1).toLowerCase()}{p.skinType ? ` · ${p.skinType}` : ''}
                      </p>
                    </div>
                    {p.id === selectedPatient && (
                      <Check className="w-[16px] h-[16px] text-primary-dark flex-shrink-0" strokeWidth={2} />
                    )}
                  </button>
                ))}
              {patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase())).length === 0 && (
                <div className="px-[16px] py-[24px] text-center text-desc-regular text-content-text">
                  Nenhum paciente encontrado
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex gap-3 lg:gap-[24px] overflow-hidden relative">
        {showHistory && (
          <div className="absolute inset-0 z-20 bg-base-white lg:static lg:inset-auto lg:w-[280px] flex-shrink-0 flex flex-col">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <div className="px-[16px] py-[12px] border-b border-base-border flex items-center justify-between">
                <p className="text-tag-semibold text-content-title">Conversas anteriores</p>
                <button onClick={() => setShowHistory(false)} className="lg:hidden p-1 rounded-small hover:bg-base-disable">
                  <X className="w-4 h-4 text-content-text" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {patientConversations.map((conv) => {
                  const lastMsg = conv.messages[0]
                  const preview = lastMsg?.content?.slice(0, 60) || 'Sem mensagens'
                  const isActive = conv.id === activeConversationId
                  return (
                    <div
                      key={conv.id}
                      className={`px-[16px] py-[12px] border-b border-base-border/50 cursor-pointer transition-colors ${
                        isActive ? 'bg-primary-light/50' : 'hover:bg-base-background'
                      }`}
                      onClick={() => loadConversation(conv.id)}
                    >
                      <div className="flex items-start justify-between gap-[8px]">
                        <div className="min-w-0 flex-1">
                          <p className="text-desc-medium text-content-title truncate">
                            {conv.title || 'Conversa'}
                          </p>
                          <p className="text-desc-regular text-content-text truncate mt-[2px]">
                            {preview}...
                          </p>
                          <p className="text-desc-regular text-content-text/60 mt-[4px]">
                            {new Date(conv.updatedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                          className="p-[4px] rounded-tiny text-content-text/40 hover:text-error hover:bg-error/5 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-[12px] h-[12px]" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                {patientConversations.length === 0 && (
                  <div className="p-[16px] text-center text-desc-regular text-content-text">
                    Nenhuma conversa
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-3 lg:p-[24px] space-y-4 lg:space-y-[24px] scrollbar-thin">
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 rounded-regular bg-primary-light flex items-center justify-center mx-auto mb-[24px]">
                    <Sparkles className="w-[24px] h-[24px] text-primary-dark" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-h3 text-content-title mb-[12px]">
                    Assistente de Prescrições
                  </h3>
                  <p className="text-paragraph text-content-text">
                    {selectedPatient
                      ? 'Digite sua mensagem para começar a criar uma fórmula personalizada.'
                      : 'Selecione um paciente acima para iniciar.'}
                  </p>
                  {selectedPatient && (
                    <>
                      {patientConversations.length > 0 && !showHistory && (
                        <button
                          onClick={() => setShowHistory(true)}
                          className="mt-[16px] inline-flex items-center gap-[8px] px-[16px] py-[8px] rounded-small border border-base-border text-desc-medium text-content-text hover:bg-primary-light/30 transition-all"
                        >
                          <MessageSquare className="w-[14px] h-[14px]" strokeWidth={1.5} />
                          Ver {patientConversations.length} conversa{patientConversations.length !== 1 ? 's' : ''} anterior{patientConversations.length !== 1 ? 'es' : ''}
                        </button>
                      )}
                      <div className="mt-[24px] grid grid-cols-1 gap-[12px]">
                        {[
                          'Crie uma fórmula anti-aging para este paciente',
                          'Sugira um tratamento para manchas',
                          'Formule um protetor solar manipulado',
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setInput(suggestion)}
                            className="text-left px-[24px] py-[12px] rounded-small border border-base-border text-paragraph text-content-text hover:bg-primary-light/30 hover:border-primary-medium transition-all"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-[12px] ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-huge bg-primary-light flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                    <Image src="/ico.ico" alt="IA" width={24} height={24} className="w-[24px] h-[24px] object-contain" />
                  </div>
                )}

                {msg.role === 'assistant' && isFormulaResponse(msg.content) ? (
                  <FormulaCard
                    content={msg.content}
                    onFavorite={() => saveFormulaAtIndex(i, true)}
                    saving={saving}
                    saved={msg.saved}
                    savedType={msg.savedType}
                    referencedAtivos={msg.referencedAtivos}
                    onOpenAtivo={(ativo) => setViewingAtivo(ativo)}
                  />
                ) : msg.role === 'assistant' ? (
                  <div className="max-w-[90%] lg:max-w-[75%] rounded-regular border border-base-border bg-base-white px-3 py-3 lg:px-[24px] lg:py-[24px]">
                    <div className="prose prose-sm max-w-none prose-headings:text-content-title prose-p:text-content-text prose-strong:text-primary-dark prose-li:text-content-text">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[90%] lg:max-w-[75%] rounded-regular px-3 py-2 lg:px-[24px] lg:py-[12px] text-paragraph bg-primary-dark !text-[#FFFFFF]">
                    {msg.content}
                  </div>
                )}

                {msg.role === 'user' && (
                  <div className="w-9 h-9 rounded-huge bg-primary-medium flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={user?.name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-desc-medium text-primary-dark font-bold">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-[12px]">
                <div className="w-9 h-9 rounded-huge bg-primary-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <Image src="/ico.ico" alt="IA" width={24} height={24} className="w-[24px] h-[24px] object-contain" />
                </div>
                <div className="bg-base-white border border-base-border rounded-regular px-[24px] py-[12px]">
                  <div className="flex items-center gap-[12px] text-paragraph text-content-text">
                    <Loader2 className="w-[14px] h-[14px] animate-spin" />
                    Gerando resposta...
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </CardContent>

          <div className="border-t border-base-border p-3 lg:p-[24px]">
            <div className="flex gap-2 lg:gap-[12px]">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={
                  selectedPatient
                    ? 'Digite sua mensagem...'
                    : 'Selecione um paciente primeiro'
                }
                disabled={!selectedPatient || loading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!selectedPatient || !input.trim() || loading}
                size="icon"
              >
                <Send className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {viewingAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 lg:p-0">
          <div className="bg-base-white rounded-regular shadow-2xl w-full h-full lg:w-[90vw] lg:h-[90vh] max-w-5xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-[24px] py-[16px] border-b border-base-border">
              <div className="flex items-center gap-[12px]">
                <div className="w-9 h-9 rounded-small bg-primary-light flex items-center justify-center">
                  <FlaskConical className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-tag-bold text-content-title">{viewingAtivo.name}</h3>
                  {viewingAtivo.fileName && (
                    <p className="text-desc-regular text-content-text">{viewingAtivo.fileName}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-[8px]">
                {viewingAtivo.fileName && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const token = localStorage.getItem('prescreva_token')
                      window.open(`${API_URL}/ativos/${viewingAtivo.id}/download?token=${token}`, '_blank')
                    }}
                  >
                    <Download className="w-[14px] h-[14px]" strokeWidth={1.5} /> Baixar
                  </Button>
                )}
                <button
                  onClick={() => setViewingAtivo(null)}
                  className="p-[8px] rounded-small text-content-text hover:bg-base-disable transition-all"
                >
                  <X className="w-[18px] h-[18px]" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-base-background">
              {viewingAtivo.fileName ? (
                <iframe
                  src={`${API_URL}/ativos/${viewingAtivo.id}/view?token=${localStorage.getItem('prescreva_token')}`}
                  className="w-full h-full border-0"
                  title={`PDF - ${viewingAtivo.name}`}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FlaskConical className="w-[48px] h-[48px] text-primary-dark/30 mx-auto mb-[16px]" strokeWidth={1} />
                    <p className="text-tag-semibold text-content-title mb-[4px]">{viewingAtivo.name}</p>
                    <p className="text-paragraph text-content-text">Este ativo não possui arquivo PDF anexado.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
