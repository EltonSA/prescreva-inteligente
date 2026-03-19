'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
import { Plus, Pencil, Trash2, Search, Eye, Star, FileText, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Formula {
  id: string
  title: string
  content: string
  favorite: boolean
  createdAt: string
}

interface Patient {
  id: string
  name: string
  age: number
  sex: string
  skinType?: string
  phototype?: string
  treatmentGoal?: string
  additionalInfo?: string
  _count?: { formulas: number }
}

export default function PacientesPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [viewing, setViewing] = useState<Patient | null>(null)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [form, setForm] = useState({
    name: '', age: '', sex: 'MASCULINO', skinType: '', phototype: '',
    treatmentGoal: '', additionalInfo: '',
  })

  const [patientFormulas, setPatientFormulas] = useState<Formula[]>([])
  const [loadingFormulas, setLoadingFormulas] = useState(false)
  const [expandedFormula, setExpandedFormula] = useState<string | null>(null)

  useEffect(() => { loadPatients() }, [])

  async function loadPatientFormulas(patientId: string) {
    setLoadingFormulas(true)
    try {
      const data = await api.get<{ formulas: Formula[] }>(`/patients/${patientId}`, { skipCache: true })
      setPatientFormulas(data.formulas || [])
    } catch {
      setPatientFormulas([])
    } finally {
      setLoadingFormulas(false)
    }
  }

  async function loadPatients() {
    const data = await api.get<Patient[]>('/patients')
    setPatients(data)
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setViewing(null)
    setForm({ name: '', age: '', sex: 'MASCULINO', skinType: '', phototype: '', treatmentGoal: '', additionalInfo: '' })
    setIsOpen(true)
  }

  function openEdit(p: Patient) {
    setEditing(p)
    setViewing(null)
    setForm({
      name: p.name, age: String(p.age), sex: p.sex,
      skinType: p.skinType || '', phototype: p.phototype || '',
      treatmentGoal: p.treatmentGoal || '', additionalInfo: p.additionalInfo || '',
    })
    setIsOpen(true)
  }

  function openView(p: Patient) {
    setViewing(p)
    setEditing(null)
    setExpandedFormula(null)
    setIsOpen(true)
    loadPatientFormulas(p.id)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form, age: Number(form.age) }
    if (editing) {
      await api.put(`/patients/${editing.id}`, payload)
    } else {
      await api.post('/patients', payload)
    }
    setIsOpen(false)
    loadPatients()
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este paciente?')) return
    await api.delete(`/patients/${id}`)
    loadPatients()
  }

  function openAI(patientId: string) {
    router.push(`/dashboard/ia?paciente=${patientId}`)
  }

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-[24px]">
        <div>
          <h1 className="text-h2 lg:text-h1 text-content-title">Pacientes</h1>
          <p className="text-paragraph text-content-text mt-1 lg:mt-[12px]">Gerencie seus pacientes</p>
        </div>
        <Button onClick={openCreate} className="self-start sm:self-auto">
          <Plus className="w-[18px] h-[18px]" strokeWidth={1.5} />
          Novo paciente
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-content-text" strokeWidth={1.5} />
            <Input
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-[40px]"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-[24px]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-base-border">
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Nome</th>
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Idade</th>
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Sexo</th>
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Tipo de pele</th>
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Objetivo</th>
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Fórmulas</th>
                  <th className="text-right py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-base-border/50 hover:bg-primary-light/30 transition-colors">
                    <td className="py-[12px] px-[12px]">
                      <p className="text-tag-semibold text-content-title">{p.name}</p>
                    </td>
                    <td className="py-[12px] px-[12px] text-paragraph text-content-text">{p.age} anos</td>
                    <td className="py-[12px] px-[12px]">
                      <Badge variant="secondary">{p.sex}</Badge>
                    </td>
                    <td className="py-[12px] px-[12px] text-paragraph text-content-text">{p.skinType || '-'}</td>
                    <td className="py-[12px] px-[12px] text-paragraph text-content-text max-w-[200px] truncate">
                      {p.treatmentGoal || '-'}
                    </td>
                    <td className="py-[12px] px-[12px] text-paragraph text-content-text">
                      {p._count?.formulas || 0}
                    </td>
                    <td className="py-[12px] px-[12px] text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openView(p)} title="Visualizar">
                          <Eye className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Editar">
                          <Pencil className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openAI(p.id)} title="Criar com IA">
                          <Star className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(p.id)}
                          title="Excluir"
                        >
                          <Trash2 className="w-[14px] h-[14px] text-error" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-[48px] text-center">
                      <div className="w-6 h-6 border-2 border-primary-dark border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-[48px] text-center text-content-text">
                      Nenhum paciente encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent>
          {viewing ? (
            <>
              <DrawerHeader>
                <DrawerTitle>Detalhes do paciente</DrawerTitle>
                <DrawerCloseButton />
              </DrawerHeader>
              <DrawerBody className="space-y-[24px]">
                <div>
                  <p className="text-desc-medium text-content-text mb-1">Nome</p>
                  <p className="text-tag-semibold text-content-title">{viewing.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-[24px]">
                  <div>
                    <p className="text-desc-medium text-content-text mb-1">Idade</p>
                    <p className="text-tag-medium text-content-title">{viewing.age} anos</p>
                  </div>
                  <div>
                    <p className="text-desc-medium text-content-text mb-1">Sexo</p>
                    <Badge>{viewing.sex}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-[24px]">
                  <div>
                    <p className="text-desc-medium text-content-text mb-1">Tipo de pele</p>
                    <p className="text-tag-medium text-content-title">{viewing.skinType || '-'}</p>
                  </div>
                  <div>
                    <p className="text-desc-medium text-content-text mb-1">Fototipo</p>
                    <p className="text-tag-medium text-content-title">{viewing.phototype || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-desc-medium text-content-text mb-1">Objetivo do tratamento</p>
                  <p className="text-paragraph text-content-title">{viewing.treatmentGoal || '-'}</p>
                </div>
                <div>
                  <p className="text-desc-medium text-content-text mb-1">Informações adicionais</p>
                  <p className="text-paragraph text-content-title">{viewing.additionalInfo || '-'}</p>
                </div>

                <div className="border-t border-base-border pt-[24px]">
                  <div className="flex items-center justify-between mb-[16px]">
                    <h3 className="text-h3 text-content-title flex items-center gap-2">
                      <FileText className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
                      Prontuário - Fórmulas salvas
                    </h3>
                    <Badge variant="secondary">{patientFormulas.length}</Badge>
                  </div>

                  {loadingFormulas ? (
                    <div className="flex justify-center py-[24px]">
                      <div className="w-5 h-5 border-2 border-primary-dark border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : patientFormulas.length === 0 ? (
                    <div className="text-center py-[24px] text-content-text text-paragraph">
                      Nenhuma fórmula salva para este paciente
                    </div>
                  ) : (
                    <div className="space-y-[12px]">
                      {patientFormulas.map((formula) => (
                        <div
                          key={formula.id}
                          className="border border-base-border rounded-regular overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedFormula(expandedFormula === formula.id ? null : formula.id)}
                            className="w-full flex items-center justify-between px-[16px] py-[12px] hover:bg-primary-light/30 transition-colors text-left"
                          >
                            <div className="flex items-center gap-[12px] min-w-0">
                              {formula.favorite && (
                                <Star className="w-[14px] h-[14px] text-yellow-500 fill-yellow-500 flex-shrink-0" strokeWidth={1.5} />
                              )}
                              <div className="min-w-0">
                                <p className="text-tag-semibold text-content-title truncate">{formula.title}</p>
                                <p className="text-desc-medium text-content-text flex items-center gap-1 mt-[2px]">
                                  <Clock className="w-[12px] h-[12px]" strokeWidth={1.5} />
                                  {new Date(formula.createdAt).toLocaleDateString('pt-BR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                            {expandedFormula === formula.id ? (
                              <ChevronUp className="w-[16px] h-[16px] text-content-text flex-shrink-0" strokeWidth={1.5} />
                            ) : (
                              <ChevronDown className="w-[16px] h-[16px] text-content-text flex-shrink-0" strokeWidth={1.5} />
                            )}
                          </button>
                          {expandedFormula === formula.id && (
                            <div className="border-t border-base-border px-[16px] py-[16px] bg-base-background">
                              <div className="prose prose-sm max-w-none prose-headings:text-content-title prose-p:text-content-text prose-strong:text-primary-dark prose-li:text-content-text">
                                <ReactMarkdown>{formula.content}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DrawerBody>
              <DrawerFooter>
                <Button variant="secondary" onClick={() => { openEdit(viewing) }}>
                  <Pencil className="w-[14px] h-[14px]" strokeWidth={1.5} />
                  Editar
                </Button>
                <Button onClick={() => openAI(viewing.id)}>
                  <Star className="w-[14px] h-[14px]" strokeWidth={1.5} />
                  Criar com IA
                </Button>
              </DrawerFooter>
            </>
          ) : (
            <>
              <DrawerHeader>
                <DrawerTitle>{editing ? 'Editar paciente' : 'Novo paciente'}</DrawerTitle>
                <DrawerCloseButton />
              </DrawerHeader>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <DrawerBody className="space-y-[24px]">
                  <div className="grid grid-cols-2 gap-[24px]">
                    <div>
                      <label className="block text-tag-semibold text-content-title mb-[12px]">Nome</label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-tag-semibold text-content-title mb-[12px]">Idade</label>
                      <Input
                        type="number"
                        value={form.age}
                        onChange={(e) => setForm({ ...form, age: e.target.value })}
                        required
                        min={0}
                        max={150}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-[12px]">
                    <div>
                      <label className="block text-tag-semibold text-content-title mb-[12px]">Sexo</label>
                      <Select
                        value={form.sex}
                        onChange={(e) => setForm({ ...form, sex: e.target.value })}
                      >
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMININO">Feminino</option>
                        <option value="OUTRO">Outro</option>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-tag-semibold text-content-title mb-[12px]">Tipo de pele</label>
                      <Select
                        value={form.skinType}
                        onChange={(e) => setForm({ ...form, skinType: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        <option value="Normal">Normal</option>
                        <option value="Seca">Seca</option>
                        <option value="Oleosa">Oleosa</option>
                        <option value="Mista">Mista</option>
                        <option value="Sensível">Sensível</option>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-tag-semibold text-content-title mb-[12px]">Fototipo</label>
                      <Select
                        value={form.phototype}
                        onChange={(e) => setForm({ ...form, phototype: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        <option value="I">I - Muito clara</option>
                        <option value="II">II - Clara</option>
                        <option value="III">III - Morena clara</option>
                        <option value="IV">IV - Morena</option>
                        <option value="V">V - Morena escura</option>
                        <option value="VI">VI - Negra</option>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-tag-semibold text-content-title mb-[12px]">Objetivo do tratamento</label>
                    <Textarea
                      value={form.treatmentGoal}
                      onChange={(e) => setForm({ ...form, treatmentGoal: e.target.value })}
                      placeholder="Descreva o objetivo do tratamento..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-tag-semibold text-content-title mb-[12px]">Características adicionais</label>
                    <Textarea
                      value={form.additionalInfo}
                      onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })}
                      placeholder="Alergias, medicamentos em uso, etc..."
                      rows={2}
                    />
                  </div>
                </DrawerBody>
                <DrawerFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editing ? 'Salvar' : 'Criar'}</Button>
                </DrawerFooter>
              </form>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}
