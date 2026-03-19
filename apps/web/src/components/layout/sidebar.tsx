'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import {
  LayoutDashboard,
  Users,
  UserCircle,
  FlaskConical,
  Sparkles,
  Settings as SettingsIcon,
  LogOut,
  BookOpen,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'USER'] },
  { name: 'Usuários', href: '/dashboard/usuarios', icon: Users, roles: ['ADMIN'] },
  { name: 'Pacientes', href: '/dashboard/pacientes', icon: UserCircle, roles: ['ADMIN', 'USER'] },
  { name: 'Fórmulas', href: '/dashboard/formulas', icon: BookOpen, roles: ['ADMIN', 'USER'] },
  { name: 'Ativos', href: '/dashboard/ativos', icon: FlaskConical, roles: ['ADMIN', 'USER'] },
  { name: 'Prescrever com IA', href: '/dashboard/ia', icon: Sparkles, roles: ['ADMIN', 'USER'] },
  { name: 'Configurações', href: '/dashboard/configuracoes', icon: SettingsIcon, roles: ['ADMIN'] },
]

interface SidebarProps {
  collapsed?: boolean
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const filteredNav = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  )

  const avatarUrl = user?.avatar ? `${API_URL}/uploads/${user.avatar}` : null

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] bg-base-white border-r border-base-border flex-col transition-all duration-300 hidden lg:flex',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* User profile area */}
      <div className={cn('border-b border-base-border', collapsed ? 'px-[8px] pt-[16px] pb-[12px]' : 'px-[12px] pt-[24px] pb-[12px]')}>
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              'rounded-full bg-primary-light flex items-center justify-center overflow-hidden border-[3px] border-primary-medium transition-all duration-300',
              collapsed ? 'w-[40px] h-[40px] mb-[8px]' : 'w-[72px] h-[72px] mb-[12px]'
            )}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.name || ''} className="w-full h-full object-cover" />
            ) : (
              <UserCircle className={cn('text-primary-dark', collapsed ? 'w-[24px] h-[24px]' : 'w-[40px] h-[40px]')} strokeWidth={1} />
            )}
          </div>
          {!collapsed && (
            <>
              <p className="text-tag-bold text-content-title truncate w-full">{user?.name}</p>
              <p className="text-desc-medium text-primary-dark mt-[4px]">{user?.profession || 'Profissional'}</p>
            </>
          )}
          <div className={cn('flex items-center mt-[12px]', collapsed ? 'flex-col gap-[8px]' : 'gap-[12px]')}>
            <Link
              href="/dashboard/perfil"
              className={cn(
                'w-9 h-9 rounded-small flex items-center justify-center transition-all',
                pathname === '/dashboard/perfil'
                  ? 'bg-primary-accent'
                  : 'border border-base-border hover:bg-primary-light'
              )}
              title="Configurações do perfil"
            >
              <SettingsIcon
                className={cn(
                  'w-[18px] h-[18px]',
                  pathname === '/dashboard/perfil' ? '!text-[#FFFFFF]' : 'text-content-text'
                )}
                strokeWidth={1.5}
              />
            </Link>
            <button
              onClick={logout}
              className="w-9 h-9 rounded-small flex items-center justify-center border border-base-border hover:bg-error/5 transition-all"
              title="Sair"
            >
              <LogOut className="w-[18px] h-[18px] text-content-text" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-[12px] py-[12px] space-y-1 overflow-y-auto scrollbar-thin">
        {filteredNav.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-small text-tag-medium transition-all border border-solid border-base-border',
                collapsed ? 'justify-center px-0 py-[12px]' : 'gap-[12px] px-[12px] py-[12px]',
                isActive
                  ? 'bg-primary-accent !text-[#FFFFFF] font-semibold !border-primary-accent'
                  : 'text-content-text hover:bg-primary-light'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  'w-[18px] h-[18px] flex-shrink-0',
                  isActive ? '!text-[#FFFFFF]' : 'text-content-text'
                )}
                strokeWidth={1.5}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Logout bottom */}
      <div className="border-t border-base-border p-[12px]">
        <button
          onClick={logout}
          className={cn(
            'flex items-center w-full rounded-small text-tag-medium text-error hover:bg-error/5 transition-all',
            collapsed ? 'justify-center px-0 py-[12px]' : 'gap-[12px] px-[12px] py-[12px]'
          )}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
          {!collapsed && 'Sair'}
        </button>
      </div>
    </aside>
  )
}
