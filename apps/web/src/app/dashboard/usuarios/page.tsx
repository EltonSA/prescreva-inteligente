'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Pencil, Search, Trash2, ShieldBan, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { DualUsdBrlPair } from '@/components/metrics/dual-usd-brl'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  profession?: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
  lastLogin?: string
  createdAt: string
  _count?: { formulas: number }
  aiOpenAiCallsThisMonth?: number
  aiPromptTokensThisMonth?: number
  aiCompletionTokensThisMonth?: number
  aiEstimatedUsdThisMonth?: number
  aiAvgUsdPerCallThisMonth?: number
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [usdToBrlRate, setUsdToBrlRate] = useState(5.05)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', profession: '', role: 'USER' as 'ADMIN' | 'USER',
  })

  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const data = await api.get<{ users: User[]; usdToBrlRate?: number }>('/users', { skipCache: true })
    setUsers(data.users)
    setUsdToBrlRate(typeof data.usdToBrlRate === 'number' && data.usdToBrlRate > 0 ? data.usdToBrlRate : 5.05)
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', email: '', password: '', phone: '', profession: '', role: 'USER' })
    setIsOpen(true)
  }

  function openEdit(user: User) {
    setEditing(user)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      profession: user.profession || '',
      role: user.role,
    })
    setIsOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form }
    if (!payload.password) delete (payload as any).password

    if (editing) {
      await api.put(`/users/${editing.id}`, payload)
    } else {
      await api.post('/users', payload)
    }
    setIsOpen(false)
    loadUsers()
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setActionLoading(true)
    try {
      await api.delete(`/users/${confirmDelete.id}`)
      toast.success('Usuário excluído com sucesso')
      loadUsers()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir usuário')
    } finally {
      setActionLoading(false)
      setConfirmDelete(null)
    }
  }

  async function handleToggleActive() {
    if (!confirmToggle) return
    setActionLoading(true)
    try {
      await api.patch(`/users/${confirmToggle.id}/toggle-active`)
      toast.success(
        confirmToggle.isActive
          ? `${confirmToggle.name} foi bloqueado`
          : `${confirmToggle.name} foi desbloqueado`
      )
      loadUsers()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status')
    } finally {
      setActionLoading(false)
      setConfirmToggle(null)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-[24px]">
        <div>
          <h1 className="text-h2 lg:text-h1 text-content-title">Gerenciamento de Usuários</h1>
          <p className="text-paragraph text-content-text mt-1 lg:mt-[12px]">
            Gerencie os usuários do sistema. Uso OpenAI (chamadas, tokens, custo estimado) no mês atual (UTC). Valores em
            real usam o <code className="text-xs bg-base-border/40 px-1 rounded">bid</code> da AwesomeAPI (cache 5 min); se falhar, <code className="text-xs bg-base-border/40 px-1 rounded">USD_BRL_RATE</code> no .env.
          </p>
        </div>
        <Button onClick={openCreate} className="self-start sm:self-auto">
          <Plus className="w-[18px] h-[18px]" strokeWidth={1.5} />
          Novo usuário
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center gap-[12px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-content-text" strokeWidth={1.5} />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-[40px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-[24px]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-base-border">
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Nome</th>
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Email</th>
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Admin</th>
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Status</th>
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Fórmulas</th>
                  <th className="text-center py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Chamadas IA</th>
                  <th className="text-center py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider min-w-[140px]">Tokens</th>
                  <th className="text-center py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider min-w-[120px]">Gasto est.</th>
                  <th className="text-left py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Último login</th>
                  <th className="text-right py-[12px] px-[12px] text-desc-medium text-content-text uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-base-border/50 hover:bg-primary-light/30 transition-colors">
                    <td className="py-[12px] px-[12px]">
                      <div className="flex items-center gap-[12px]">
                        <div className={`w-9 h-9 rounded-huge flex items-center justify-center ${user.isActive ? 'bg-primary-light' : 'bg-base-disable'}`}>
                          <span className={`text-tag-semibold ${user.isActive ? 'text-primary-dark' : 'text-content-text'}`}>
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-tag-semibold text-content-title">{user.name}</p>
                          <p className="text-desc-regular text-content-text">{user.profession || 'Sem profissão'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-[12px] px-[12px] text-paragraph text-content-text">{user.email}</td>
                    <td className="py-[12px] px-[12px]">
                      <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {user.role === 'ADMIN' ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                    <td className="py-[12px] px-[12px]">
                      <Badge variant={user.isActive ? 'success' : 'destructive'}>
                        {user.isActive ? 'Ativo' : 'Bloqueado'}
                      </Badge>
                    </td>
                    <td className="py-[12px] px-[12px] text-paragraph text-content-text">
                      {user._count?.formulas || 0}
                    </td>
                    <td className="py-[12px] px-[12px] text-center text-paragraph text-content-title">
                      {user.aiOpenAiCallsThisMonth ?? 0}
                    </td>
                    <td className="py-[12px] px-[12px] text-center text-desc-regular text-content-text">
                      {(user.aiOpenAiCallsThisMonth ?? 0) > 0 ? (
                        <span>
                          {(user.aiPromptTokensThisMonth ?? 0).toLocaleString('pt-BR')} entrada ·{' '}
                          {(user.aiCompletionTokensThisMonth ?? 0).toLocaleString('pt-BR')} saída
                        </span>
                      ) : (
                        <span className="text-content-text/50">—</span>
                      )}
                    </td>
                    <td className="py-[12px] px-[12px] text-center text-desc-regular text-content-text">
                      {(user.aiOpenAiCallsThisMonth ?? 0) > 0 ? (
                        <div className="flex flex-col gap-1 items-center">
                          <DualUsdBrlPair
                            usd={user.aiEstimatedUsdThisMonth ?? 0}
                            rate={usdToBrlRate}
                            mode="total"
                          />
                          <DualUsdBrlPair
                            usd={user.aiAvgUsdPerCallThisMonth ?? 0}
                            rate={usdToBrlRate}
                            mode="avg"
                          />
                        </div>
                      ) : (
                        <span className="text-content-text/50">—</span>
                      )}
                    </td>
                    <td className="py-[12px] px-[12px] text-paragraph text-content-text">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString('pt-BR')
                        : 'Nunca'}
                    </td>
                    <td className="py-[12px] px-[12px] text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(user)} title="Editar">
                          <Pencil className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmToggle(user)}
                          title={user.isActive ? 'Bloquear acesso' : 'Desbloquear acesso'}
                        >
                          {user.isActive ? (
                            <ShieldBan className="w-[14px] h-[14px] text-[#E65100]" strokeWidth={1.5} />
                          ) : (
                            <ShieldCheck className="w-[14px] h-[14px] text-primary-dark" strokeWidth={1.5} />
                          )}
                        </Button>
{/*                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete(user)}
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-[14px] h-[14px] text-error" strokeWidth={1.5} />
                        </Button>*/}
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan={10} className="py-[48px] text-center">
                      <div className="w-6 h-6 border-2 border-primary-dark border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-[48px] text-center text-content-text">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Drawer de criação/edição */}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editing ? 'Editar usuário' : 'Novo usuário'}</DrawerTitle>
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
                <label className="block text-tag-semibold text-content-title mb-[12px]">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">
                  Senha {editing && '(deixe vazio para manter)'}
                </label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editing}
                  minLength={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-[24px]">
                <div>
                  <label className="block text-tag-semibold text-content-title mb-[12px]">Telefone</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-tag-semibold text-content-title mb-[12px]">Profissão</label>
                  <Input
                    value={form.profession}
                    onChange={(e) => setForm({ ...form, profession: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">Permissão</label>
                <Select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'USER' })}
                >
                  <option value="USER">Usuário</option>
                  <option value="ADMIN">Administrador</option>
                </Select>
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

      {/* Dialog de confirmação - Excluir */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{confirmDelete?.name}</strong>?
              Todos os dados deste usuário (pacientes, fórmulas, conversas) serão removidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação - Bloquear/Desbloquear */}
      <Dialog open={!!confirmToggle} onOpenChange={() => setConfirmToggle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmToggle?.isActive ? 'Bloquear acesso' : 'Desbloquear acesso'}
            </DialogTitle>
            <DialogDescription>
              {confirmToggle?.isActive
                ? <>Tem certeza que deseja bloquear <strong>{confirmToggle?.name}</strong>? O usuário não conseguirá mais fazer login.</>
                : <>Deseja desbloquear <strong>{confirmToggle?.name}</strong>? O usuário poderá fazer login novamente.</>
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmToggle(null)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button
              variant={confirmToggle?.isActive ? 'destructive' : 'default'}
              onClick={handleToggleActive}
              disabled={actionLoading}
            >
              {actionLoading
                ? 'Processando...'
                : confirmToggle?.isActive ? 'Bloquear' : 'Desbloquear'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
