'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { LoginHeroAppPreviews } from './login-hero-app-previews'
import { LoginHeroIllustration } from './login-hero-illustration'

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
      <div className="hidden lg:flex lg:w-1/2 bg-primary-dark text-white flex-col relative overflow-hidden min-h-screen">
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-primary-light/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-1/3 -right-16 h-64 w-64 rounded-full bg-primary-medium/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-24 right-8 h-72 w-72 rounded-full bg-primary-accent/22 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col px-10 xl:px-14 2xl:px-16 pt-7 pb-8">
          <div className="mt-6 w-full max-w-xl shrink-0 xl:mt-7 xl:max-w-2xl">
            <h2 className="text-h1 text-white mb-[12px] leading-tight">
              Prescrições magistrais com inteligência artificial
            </h2>
            <p className="text-paragraph text-primary-light leading-relaxed text-base mb-0">
              Crie fórmulas personalizadas com auxílio de IA, gerencie pacientes e otimize sua prática clínica.
            </p>
          </div>

          <div
            className="pointer-events-none relative flex min-h-0 flex-1 flex-col items-center justify-center pb-1"
            aria-hidden
          >
            <div className="relative flex w-full max-w-[640px] -translate-y-10 items-center justify-center sm:-translate-y-12 xl:max-w-[700px] xl:-translate-y-14">
              <LoginHeroIllustration className="absolute left-1/2 top-[30%] w-[min(110%,760px)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.16]" />
              <div className="relative z-[1] w-full">
                <LoginHeroAppPreviews className="w-full" />
              </div>
            </div>
          </div>

          <div className="mt-auto flex w-full max-w-2xl flex-wrap items-start justify-between gap-y-6 gap-x-6 border-t border-white/10 pt-8 xl:max-w-none xl:gap-x-10 2xl:gap-x-16 xl:pr-2">
            <div className="min-w-[7rem] text-center sm:text-left">
              <div className="text-tag-bold text-white leading-snug">Magistrais</div>
              <div className="text-desc-medium text-primary-light mt-1 leading-snug">
                Fórmulas sob medida
              </div>
            </div>
            <div className="min-w-[7rem] text-center">
              <div className="text-tag-bold text-white leading-snug">Pacientes</div>
              <div className="text-desc-medium text-primary-light mt-1 leading-snug">
                Histórico e evolução
              </div>
            </div>
            <div className="min-w-[7rem] text-center sm:text-right">
              <div className="text-tag-bold text-white leading-snug">IA</div>
              <div className="text-desc-medium text-primary-light mt-1 leading-snug">
                Apoio à prescrição
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-base-background px-5 py-10 sm:px-8 sm:py-14">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_60%_at_50%_-15%,rgba(192,210,190,0.35),transparent_55%)]"
          aria-hidden
        />
        <div className="relative w-full max-w-[480px] sm:max-w-[500px]">
          <div className="rounded-regular border border-base-border/90 bg-base-white p-9 shadow-[0_4px_28px_rgba(62,90,78,0.07),0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-primary-dark/[0.05] sm:p-11">
            <header className="mb-9 flex flex-col items-center text-center">
              <Image
                src="/logo.png"
                alt="Prescreva Inteligente"
                width={260}
                height={70}
                className="h-[52px] w-auto sm:h-14"
                priority
              />
              <div
                className="mb-4 mt-6 h-1 w-11 rounded-full bg-gradient-to-r from-primary-accent to-primary-medium"
                aria-hidden
              />
              <h2 className="text-h2 tracking-tight text-content-title">Bem-vindo de volta</h2>
              <p className="mt-3 max-w-sm text-paragraph leading-relaxed text-content-text">
                Entre com suas credenciais para acessar o sistema
              </p>
            </header>

            {error && (
              <div
                role="alert"
                className="animate-fade-in mb-6 flex gap-3 rounded-small border border-error/25 bg-error/[0.06] p-3.5 text-paragraph text-error"
              >
                <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="login-email" className="block text-tag-semibold text-content-title">
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 min-h-[48px] border-base-border/90 bg-base-background/60 px-[14px] text-paragraph transition-colors focus:border-primary-accent focus:bg-base-white focus:ring-primary-accent/25"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" className="block text-tag-semibold text-content-title">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 min-h-[48px] border-base-border/90 bg-base-background/60 px-[14px] pr-12 text-paragraph transition-colors focus:border-primary-accent focus:bg-base-white focus:ring-primary-accent/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-tiny text-content-text transition-colors hover:bg-base-disable hover:text-content-title focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent/30"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="h-[52px] w-full rounded-regular text-tag-semibold shadow-md shadow-primary-dark/20 transition-shadow hover:shadow-lg hover:shadow-primary-dark/25"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Entrando…
                    </span>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-9 border-t border-base-border/70 pt-9">
              <div className="rounded-regular border border-primary-medium/35 bg-gradient-to-br from-primary-light/40 to-primary-light/15 px-5 py-5 text-center sm:px-6 sm:py-5">
                <div className="flex items-center justify-center gap-2 text-tag-medium text-content-title">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-base-white/80 text-primary-accent shadow-sm ring-1 ring-primary-medium/25">
                    <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span>Conexão segura</span>
                </div>
                <p className="mt-2 text-desc-regular leading-relaxed text-content-text">
                  Seus dados trafegam com proteção. Entre com tranquilidade.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
