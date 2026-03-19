'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  UserCircle, FlaskConical, Sparkles, Users, ArrowRight, ArrowUpRight,
  ArrowDownRight, MessageSquare, Star, TrendingUp, Minus, Settings,
  Briefcase, CalendarDays,
} from 'lucide-react'
import Link from 'next/link'

interface RecentFormula {
  id: string
  title: string
  patientName?: string
  userName?: string
  createdAt: string
}

interface RecentPatient {
  id: string
  name: string
  userName?: string
  createdAt: string
}

interface TopUser {
  id: string
  name: string
  profession?: string
  avatar?: string
  lastLogin?: string
  patientCount: number
  formulaCount: number
  conversationCount: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface MonthData {
  month: string
  count: number
}

interface ProfessionData {
  profession: string
  count: number
}

interface Stats {
  totalPatients: number
  totalFormulas: number
  totalAtivos: number
  totalConversations: number
  totalFavorites: number
  patientsThisMonth: number
  patientsLastMonth: number
  formulasThisMonth: number
  formulasLastMonth: number
  recentFormulas: RecentFormula[]
  recentPatients: RecentPatient[]
  totalUsers?: number
  usersThisMonth?: number
  topUsers?: TopUser[]
  formulasByMonth?: MonthData[]
  usersByProfession?: ProfessionData[]
}

function calcVariation(current: number, previous: number): { value: number; type: 'up' | 'down' | 'neutral' } {
  if (previous === 0 && current === 0) return { value: 0, type: 'neutral' }
  if (previous === 0) return { value: 100, type: 'up' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0) return { value: pct, type: 'up' }
  if (pct < 0) return { value: Math.abs(pct), type: 'down' }
  return { value: 0, type: 'neutral' }
}

function VariationBadge({ current, previous }: { current: number; previous: number }) {
  const v = calcVariation(current, previous)
  if (v.type === 'neutral') {
    return (
      <span className="inline-flex items-center gap-[4px] text-desc-medium text-content-text">
        <Minus className="w-[12px] h-[12px]" strokeWidth={2} /> 0%
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-[4px] text-desc-medium ${v.type === 'up' ? 'text-primary-dark' : 'text-error'}`}>
      {v.type === 'up' ? (
        <ArrowUpRight className="w-[12px] h-[12px]" strokeWidth={2} />
      ) : (
        <ArrowDownRight className="w-[12px] h-[12px]" strokeWidth={2} />
      )}
      {v.value}%
    </span>
  )
}

function StatCard({ title, value, icon: Icon, href, variation }: {
  title: string
  value: number
  icon: any
  href: string
  variation?: React.ReactNode
}) {
  return (
    <Link href={href} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-3 lg:p-[24px]">
          <div className="flex items-center justify-between mb-3 lg:mb-[16px]">
            <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-small bg-primary-light flex items-center justify-center">
              <Icon className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px] text-primary-dark" strokeWidth={1.5} />
            </div>
            <ArrowRight className="w-[16px] h-[16px] text-content-text" strokeWidth={1.5} />
          </div>
          <div className="text-h2 lg:text-h1 text-content-title">{value}</div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 lg:mt-[8px] gap-1">
            <span className="text-paragraph text-content-text">{title}</span>
            {variation}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function MiniBarChart({ data }: { data: MonthData[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div className="flex items-end gap-[8px] h-[120px]">
      {data.map((d) => {
        const height = Math.max((d.count / maxCount) * 100, 4)
        const monthIdx = parseInt(d.month.split('-')[1], 10) - 1
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-[4px]">
            <span className="text-desc-medium text-content-title">{d.count}</span>
            <div
              className="w-full bg-primary-dark/80 rounded-tiny transition-all hover:bg-primary-dark"
              style={{ height: `${height}%`, minHeight: '4px' }}
            />
            <span className="text-desc-regular text-content-text">{months[monthIdx]}</span>
          </div>
        )
      })}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return 'Nunca'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type PeriodKey = 'all' | '7d' | '30d' | '3m' | '6m' | '12m' | 'custom'

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'all', label: 'Todo período' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '3m', label: '3 meses' },
  { key: '6m', label: '6 meses' },
  { key: '12m', label: '12 meses' },
  { key: 'custom', label: 'Personalizado' },
]

function getDateRange(period: PeriodKey): { startDate?: string; endDate?: string } {
  if (period === 'all') return {}
  const now = new Date()
  const end = now.toISOString().split('T')[0]
  let start: Date
  switch (period) {
    case '7d': start = new Date(now.getTime() - 7 * 86400000); break
    case '30d': start = new Date(now.getTime() - 30 * 86400000); break
    case '3m': start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); break
    case '6m': start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()); break
    case '12m': start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break
    default: return {}
  }
  return { startDate: start.toISOString().split('T')[0], endDate: end }
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodKey>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const fetchStats = useCallback(() => {
    let range: { startDate?: string; endDate?: string }
    if (period === 'custom') {
      range = { startDate: customStart || undefined, endDate: customEnd || undefined }
    } else {
      range = getDateRange(period)
    }
    const params = new URLSearchParams()
    if (range.startDate) params.set('startDate', range.startDate)
    if (range.endDate) params.set('endDate', range.endDate)
    const qs = params.toString()
    return api.get<Stats>(`/dashboard/stats${qs ? `?${qs}` : ''}`, { skipCache: true })
  }, [period, customStart, customEnd])

  useEffect(() => {
    setLoading(true)
    fetchStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [fetchStats])

  // Polling: atualiza a cada 30 segundos
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchStats().then(setStats).catch(console.error)
    }, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchStats])

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-[48px]">
        <div className="w-6 h-6 border-2 border-primary-dark border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 lg:mb-[32px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-h2 lg:text-h1 text-content-title">
              Olá, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-paragraph text-content-text mt-1 lg:mt-[12px]">
              {isAdmin
                ? 'Painel gerencial do Prescreva Inteligente.'
                : 'Bem-vindo ao Prescreva Inteligente. Veja o resumo da sua conta.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="w-[16px] h-[16px] text-content-text flex-shrink-0" strokeWidth={1.5} />
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={`px-3 py-1.5 rounded-small text-desc-medium transition-colors ${
                period === opt.key
                  ? 'bg-primary-accent text-white font-semibold'
                  : 'border border-base-border text-content-text hover:bg-primary-light'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <label className="text-desc-medium text-content-text">De:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 px-3 rounded-small border border-base-border text-paragraph text-content-title bg-base-white focus:outline-none focus:ring-2 focus:ring-primary-dark/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-desc-medium text-content-text">Até:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 px-3 rounded-small border border-base-border text-paragraph text-content-title bg-base-white focus:outline-none focus:ring-2 focus:ring-primary-dark/30"
              />
            </div>
          </div>
        )}
      </div>

      {/* --- STAT CARDS (row 1 — principais com variacao) --- */}
      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 lg:gap-[24px] mb-4 lg:mb-[24px]">
          <StatCard
            title="Usuários"
            value={stats.totalUsers || 0}
            icon={Users}
            href="/dashboard/usuarios"
            variation={
              <span className="text-desc-medium text-primary-dark">
                +{stats.usersThisMonth || 0} este mês
              </span>
            }
          />
          <StatCard
            title="Pacientes (global)"
            value={stats.totalPatients}
            icon={UserCircle}
            href="/dashboard/pacientes"
            variation={<VariationBadge current={stats.patientsThisMonth} previous={stats.patientsLastMonth} />}
          />
          <StatCard
            title="Fórmulas (global)"
            value={stats.totalFormulas}
            icon={FlaskConical}
            href="/dashboard/formulas"
            variation={<VariationBadge current={stats.formulasThisMonth} previous={stats.formulasLastMonth} />}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-[24px] mb-4 lg:mb-[24px]">
          <StatCard
            title="Meus Pacientes"
            value={stats.totalPatients}
            icon={UserCircle}
            href="/dashboard/pacientes"
            variation={<VariationBadge current={stats.patientsThisMonth} previous={stats.patientsLastMonth} />}
          />
          <StatCard
            title="Minhas Fórmulas"
            value={stats.totalFormulas}
            icon={FlaskConical}
            href="/dashboard/formulas"
            variation={<VariationBadge current={stats.formulasThisMonth} previous={stats.formulasLastMonth} />}
          />
        </div>
      )}

      {/* --- STAT CARDS (row 2 — secundarios) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 lg:gap-[24px] mb-4 lg:mb-[32px]">
        <StatCard
          title="Base de Ativos"
          value={stats.totalAtivos}
          icon={Sparkles}
          href="/dashboard/ativos"
        />
        <StatCard
          title="Conversas com PI"
          value={stats.totalConversations}
          icon={MessageSquare}
          href="/dashboard/ia"
        />
        <StatCard
            title="Fórmulas Favoritas"
          value={stats.totalFavorites}
          icon={Star}
          href="/dashboard/formulas"
        />
      </div>

      {/* --- ADMIN: RANKING --- */}
      {isAdmin && stats.topUsers && (
        <Card className="mb-[24px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-[8px]">
              <Users className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
              Ranking de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-base-border">
                    <th className="text-left py-[10px] px-[8px] text-desc-medium text-content-text uppercase tracking-wider">Usuário</th>
                    <th className="text-center py-[10px] px-[8px] text-desc-medium text-content-text uppercase tracking-wider">Pacientes</th>
                    <th className="text-center py-[10px] px-[8px] text-desc-medium text-content-text uppercase tracking-wider">Fórmulas</th>
                    <th className="text-center py-[10px] px-[8px] text-desc-medium text-content-text uppercase tracking-wider">Conversas</th>
                    <th className="text-right py-[10px] px-[8px] text-desc-medium text-content-text uppercase tracking-wider">Último acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topUsers.map((u, i) => (
                    <tr key={u.id} className="border-b border-base-border/50 hover:bg-primary-light/20 transition-colors">
                      <td className="py-[10px] px-[8px]">
                        <div className="flex items-center gap-[10px]">
                          <span className="text-desc-medium text-content-text w-[18px] text-center flex-shrink-0">{i + 1}</span>
                          {u.avatar ? (
                            <img
                              src={`${API_URL}/uploads/${u.avatar}`}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                              <span className="text-desc-medium text-primary-dark font-bold">{u.name.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-tag-medium text-content-title">{u.name}</p>
                            <p className="text-desc-regular text-content-text">{u.profession || 'Não informada'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-[10px] px-[8px] text-center text-tag-medium text-content-title">{u.patientCount}</td>
                      <td className="py-[10px] px-[8px] text-center text-tag-medium text-content-title">{u.formulaCount}</td>
                      <td className="py-[10px] px-[8px] text-center text-tag-medium text-content-title">{u.conversationCount}</td>
                      <td className="py-[10px] px-[8px] text-right text-desc-regular text-content-text">
                        {formatDateTime(u.lastLogin)}
                      </td>
                    </tr>
                  ))}
                  {stats.topUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-[24px] text-center text-content-text">Nenhum usuário encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- ADMIN: FORMULAS POR MES + USUARIOS POR PROFISSAO (lado a lado) --- */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-[24px] mb-4 lg:mb-[32px]">
          {stats.formulasByMonth && stats.formulasByMonth.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-[8px]">
                  <TrendingUp className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
                  Fórmulas por Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniBarChart data={stats.formulasByMonth} />
              </CardContent>
            </Card>
          )}

          {stats.usersByProfession && stats.usersByProfession.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-[8px]">
                  <Briefcase className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
                  Usuários por Profissão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-[8px]">
                {stats.usersByProfession.map((p) => {
                  const total = stats.totalUsers || 1
                  const pct = Math.round((p.count / total) * 100)
                  return (
                    <div key={p.profession}>
                      <div className="flex items-center justify-between mb-[4px]">
                        <span className="text-desc-medium text-content-title">{p.profession}</span>
                        <span className="text-desc-regular text-content-text">{p.count} ({pct}%)</span>
                      </div>
                      <div className="h-[6px] bg-base-disable rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-dark rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* --- RECENT ACTIVITY --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-[24px] mb-4 lg:mb-[32px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-[8px]">
              <FlaskConical className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
              {isAdmin ? 'Últimas Fórmulas do Sistema' : 'Últimas Fórmulas'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentFormulas.length > 0 ? (
              <ul className="space-y-[8px]">
                {stats.recentFormulas.map((f) => (
                  <li key={f.id} className="flex items-center justify-between py-[8px] px-[12px] rounded-small border border-base-border/50 hover:bg-primary-light/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-tag-medium text-content-title truncate">{f.title}</p>
                      <p className="text-desc-regular text-content-text">
                        {f.patientName}{isAdmin && f.userName ? ` · por ${f.userName}` : ''}
                      </p>
                    </div>
                    <span className="text-desc-regular text-content-text flex-shrink-0 ml-[12px]">
                      {formatDate(f.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-paragraph text-content-text text-center py-[16px]">Nenhuma fórmula criada</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-[8px]">
              <UserCircle className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
              {isAdmin ? 'Últimos Pacientes do Sistema' : 'Últimos Pacientes'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentPatients.length > 0 ? (
              <ul className="space-y-[8px]">
                {stats.recentPatients.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-[8px] px-[12px] rounded-small border border-base-border/50 hover:bg-primary-light/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-tag-medium text-content-title truncate">{p.name}</p>
                      {isAdmin && p.userName && (
                        <p className="text-desc-regular text-content-text">por {p.userName}</p>
                      )}
                    </div>
                    <span className="text-desc-regular text-content-text flex-shrink-0 ml-[12px]">
                      {formatDate(p.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-paragraph text-content-text text-center py-[16px]">Nenhum paciente cadastrado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- QUICK ACTIONS --- */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-3 lg:gap-[24px]`}>
        <Card>
          <CardHeader>
            <CardTitle>Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-[12px]">
            <Button
              variant="outline"
              className="w-full justify-start gap-[12px]"
              onClick={() => router.push('/dashboard/pacientes')}
            >
              <UserCircle className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
              Gerenciar pacientes
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-[12px]"
              onClick={() => router.push('/dashboard/ia')}
            >
              <Sparkles className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
              Criar fórmula com PI
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-[12px]"
              onClick={() => router.push('/dashboard/ativos')}
            >
              <FlaskConical className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
              Ver base de ativos
            </Button>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Administração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-[12px]">
              <Button
                variant="outline"
                className="w-full justify-start gap-[12px]"
                onClick={() => router.push('/dashboard/usuarios')}
              >
                <Users className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
                Gerenciar usuários
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-[12px]"
                onClick={() => router.push('/dashboard/configuracoes')}
              >
                <Settings className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.5} />
                Configurar IA
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
