'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { User, Lock, Check, AlertCircle, Camera } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

const profissoes = [
  'Dermatologista',
  'Farmacêutico(a)',
  'Médico(a) Esteta',
  'Nutricionista',
  'Biomédico(a)',
  'Enfermeiro(a)',
  'Fisioterapeuta',
  'Dentista',
  'Médico(a) Clínico Geral',
  'Médico(a) Ginecologista',
  'Médico(a) Endocrinologista',
  'Médico(a) Geriatra',
  'Médico(a) Pediatra',
  'Médico(a) Ortopedista',
  'Psicólogo(a)',
  'Fonoaudiólogo(a)',
  'Terapeuta Ocupacional',
  'Veterinário(a)',
  'Outro',
]

interface ProfileUser {
  id: string
  name: string
  email: string
  role: string
  profession?: string
  phone?: string
  avatar?: string
}

export default function PerfilPage() {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    nome: '',
    sobrenome: '',
    profession: '',
    phone: '',
    email: '',
  })

  const [senhaForm, setSenhaForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [senhaError, setSenhaError] = useState('')
  const [senhaSuccess, setSenhaSuccess] = useState('')

  useEffect(() => {
    if (user) {
      const parts = user.name?.split(' ') || ['']
      setForm({
        nome: parts[0] || '',
        sobrenome: parts.slice(1).join(' ') || '',
        profession: user.profession || '',
        phone: user.phone || '',
        email: user.email || '',
      })
    }
  }, [user])

  const avatarUrl = user?.avatar ? `${API_URL}/uploads/${user.avatar}` : null

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await api.post<ProfileUser>('/auth/avatar', formData)
      updateUser({ avatar: result.avatar })
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar foto')
      setTimeout(() => setError(''), 3000)
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const fullName = [form.nome, form.sobrenome].filter(Boolean).join(' ')
      const result = await api.put<ProfileUser>('/auth/profile', {
        name: fullName,
        email: form.email,
        phone: form.phone || null,
        profession: form.profession || null,
      })

      updateUser({
        name: result.name,
        email: result.email,
        phone: result.phone,
        profession: result.profession,
      })

      setSuccess('Perfil atualizado com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setSavingPassword(true)
    setSenhaError('')
    setSenhaSuccess('')

    if (senhaForm.newPassword !== senhaForm.confirmPassword) {
      setSenhaError('As senhas não coincidem')
      setSavingPassword(false)
      return
    }

    if (senhaForm.newPassword.length < 6) {
      setSenhaError('A nova senha deve ter no mínimo 6 caracteres')
      setSavingPassword(false)
      return
    }

    try {
      await api.put('/auth/profile', {
        currentPassword: senhaForm.currentPassword,
        password: senhaForm.newPassword,
      })

      setSenhaSuccess('Senha alterada com sucesso!')
      setSenhaForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSenhaSuccess(''), 3000)
    } catch (err: any) {
      setSenhaError(err.message || 'Erro ao alterar senha')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div>
      <div className="mb-4 lg:mb-[32px]">
        <h1 className="text-h2 lg:text-h1 text-content-title">Meu Perfil</h1>
        <p className="text-paragraph text-content-text mt-1 lg:mt-[12px]">
          Gerencie suas informações pessoais e segurança
        </p>
      </div>

      <div className="space-y-[24px]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-[12px]">
              <User className="w-[24px] h-[24px] text-primary-dark" strokeWidth={1.5} />
              <div>
                <CardTitle>Dados Pessoais</CardTitle>
                <CardDescription>Atualize suas informações de perfil</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {success && (
              <div className="mb-[24px] p-[12px] rounded-small bg-primary-light border border-primary-medium flex items-center gap-[12px]">
                <Check className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
                <span className="text-paragraph text-primary-dark">{success}</span>
              </div>
            )}
            {error && (
              <div className="mb-[24px] p-[12px] rounded-small bg-error/5 border border-error/20 flex items-center gap-[12px]">
                <AlertCircle className="w-[18px] h-[18px] text-error" strokeWidth={1.5} />
                <span className="text-paragraph text-error">{error}</span>
              </div>
            )}

            <div className="mb-[32px]">
              <label className="block text-tag-semibold text-content-title mb-[12px]">Foto de perfil</label>
              <div className="flex items-center gap-[24px]">
                <div className="relative group">
                  <div className="w-[80px] h-[80px] rounded-huge bg-primary-light flex items-center justify-center overflow-hidden border-2 border-base-border">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user?.name || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-h2 text-primary-dark">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-huge bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-[24px] h-[24px] text-[#FFFFFF]" strokeWidth={1.5} />
                  </button>
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? 'Enviando...' : 'Alterar foto'}
                  </Button>
                  <p className="text-desc-regular text-content-text mt-[12px]">JPG, PNG ou WEBP. Max 5MB.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-[24px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
                <div>
                  <label className="block text-tag-semibold text-content-title mb-[12px]">Nome</label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Seu nome"
                    required
                  />
                </div>
                <div>
                  <label className="block text-tag-semibold text-content-title mb-[12px]">Sobrenome</label>
                  <Input
                    value={form.sobrenome}
                    onChange={(e) => setForm({ ...form, sobrenome: e.target.value })}
                    placeholder="Seu sobrenome"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
                <div>
                  <label className="block text-tag-semibold text-content-title mb-[12px]">Profissão</label>
                  <Select
                    value={form.profession}
                    onChange={(e) => setForm({ ...form, profession: e.target.value })}
                  >
                    <option value="">Selecione sua profissão</option>
                    {profissoes.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-tag-semibold text-content-title mb-[12px]">
                    Telefone <span className="text-desc-regular text-content-text">(opcional)</span>
                  </label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="max-w-md">
                <label className="block text-tag-semibold text-content-title mb-[12px]">Endereço de e-mail</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div className="pt-[12px]">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-[12px]">
              <Lock className="w-[24px] h-[24px] text-primary-dark" strokeWidth={1.5} />
              <div>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Atualize sua senha de acesso ao sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {senhaSuccess && (
              <div className="mb-[24px] p-[12px] rounded-small bg-primary-light border border-primary-medium flex items-center gap-[12px]">
                <Check className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
                <span className="text-paragraph text-primary-dark">{senhaSuccess}</span>
              </div>
            )}
            {senhaError && (
              <div className="mb-[24px] p-[12px] rounded-small bg-error/5 border border-error/20 flex items-center gap-[12px]">
                <AlertCircle className="w-[18px] h-[18px] text-error" strokeWidth={1.5} />
                <span className="text-paragraph text-error">{senhaError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-[24px]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-[24px]">
                <div>
                  <label className="block text-tag-semibold text-content-title mb-[12px]">Senha atual</label>
                  <Input
                    type="password"
                    value={senhaForm.currentPassword}
                    onChange={(e) => setSenhaForm({ ...senhaForm, currentPassword: e.target.value })}
                    placeholder="Sua senha atual"
                    required
                  />
                </div>
                <div>
                  <label className="block text-tag-semibold text-content-title mb-[12px]">Nova senha</label>
                  <Input
                    type="password"
                    value={senhaForm.newPassword}
                    onChange={(e) => setSenhaForm({ ...senhaForm, newPassword: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-tag-semibold text-content-title mb-[12px]">Confirmar nova senha</label>
                  <Input
                    type="password"
                    value={senhaForm.confirmPassword}
                    onChange={(e) => setSenhaForm({ ...senhaForm, confirmPassword: e.target.value })}
                    placeholder="Repita a nova senha"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="pt-[12px]">
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? 'Alterando...' : 'Alterar senha'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
