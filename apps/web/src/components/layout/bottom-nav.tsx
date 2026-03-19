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
  BookOpen,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'USER'] },
  { name: 'Usuários', href: '/dashboard/usuarios', icon: Users, roles: ['ADMIN'] },
  { name: 'Pacientes', href: '/dashboard/pacientes', icon: UserCircle, roles: ['ADMIN', 'USER'] },
  { name: 'Fórmulas', href: '/dashboard/formulas', icon: BookOpen, roles: ['ADMIN', 'USER'] },
  { name: 'Ativos', href: '/dashboard/ativos', icon: FlaskConical, roles: ['ADMIN', 'USER'] },
  { name: 'IA', href: '/dashboard/ia', icon: Sparkles, roles: ['ADMIN', 'USER'] },
  { name: 'Config', href: '/dashboard/configuracoes', icon: SettingsIcon, roles: ['ADMIN'] },
]

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const filteredNav = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-base-white border-t border-base-border lg:hidden">
      <div className="flex items-center justify-around h-14 px-2">
        {filteredNav.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-center min-w-0 flex-1 py-2"
              title={item.name}
            >
              <div
                className={cn(
                  'w-10 h-10 flex items-center justify-center transition-colors',
                  isActive
                    ? 'bg-primary-accent rounded-small'
                    : 'rounded-tiny border border-solid border-[#C0D2BE]'
                )}
              >
                <item.icon
                  className={cn(
                    'w-[20px] h-[20px]',
                    isActive ? 'text-white' : 'text-content-text'
                  )}
                  strokeWidth={1.5}
                />
              </div>
            </Link>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
