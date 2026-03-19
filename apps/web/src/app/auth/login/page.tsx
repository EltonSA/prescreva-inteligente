'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary-dark text-white flex-col justify-center px-[48px]">
        <div className="max-w-md">
          <div className="mb-[32px]">
            <Image src="/logo.png" alt="Prescreva Inteligente" width={220} height={60} className="h-12 w-auto brightness-0 invert" />
          </div>
          <h2 className="text-h1 text-white mb-[24px] leading-tight">
            Prescrições magistrais com inteligência artificial
          </h2>
          <p className="text-paragraph text-primary-light leading-relaxed text-base">
            Crie fórmulas personalizadas com auxílio de IA, gerencie pacientes e otimize sua prática clínica.
          </p>
          <div className="mt-[48px] grid grid-cols-3 gap-[24px]">
            <div className="text-center">
              <div className="text-h2 text-white font-bold">IA</div>
              <div className="text-desc-medium text-primary-light mt-1">Assistente</div>
            </div>
            <div className="text-center">
              <div className="text-h2 text-white font-bold">RAG</div>
              <div className="text-desc-medium text-primary-light mt-1">Base de dados</div>
            </div>
            <div className="text-center">
              <div className="text-h2 text-white font-bold">SaaS</div>
              <div className="text-desc-medium text-primary-light mt-1">Multi-tenant</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-[24px] py-[48px] bg-base-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-[32px]">
            <Image src="/logo.png" alt="Prescreva Inteligente" width={180} height={48} className="h-10 w-auto" />
          </div>

          <div className="bg-base-white rounded-regular border border-base-border p-[32px]">
            <div className="mb-[24px]">
              <h2 className="text-h2 text-content-title">Bem-vindo de volta</h2>
              <p className="text-paragraph text-content-text mt-[12px]">
                Entre com suas credenciais para acessar o sistema
              </p>
            </div>

            {error && (
              <div className="mb-[24px] p-[12px] rounded-small bg-error/5 border border-error/20 text-error text-paragraph">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-[24px]">
              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">Email</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-tag-semibold text-content-title mb-[12px]">Senha</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-[12px] top-1/2 -translate-y-1/2 text-content-text hover:text-content-title transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-[24px] text-center text-desc-regular text-content-text">
              Prescreva Inteligente v1.0
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
