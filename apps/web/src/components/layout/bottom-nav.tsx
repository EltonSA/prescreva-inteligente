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
  MessageSquareText,
  Inbox,
} from 'lucide-react'
import { FeedbackNavBadgeChip } from '@/components/feedback/feedback-nav-badge-chip'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'USER'] },
  { name: 'Usuários', href: '/dashboard/usuarios', icon: Users, roles: ['ADMIN'] },
  { name: 'Pacientes', href: '/dashboard/pacientes', icon: UserCircle, roles: ['ADMIN', 'USER'] },
  { name: 'Fórmulas', href: '/dashboard/formulas', icon: BookOpen, roles: ['ADMIN', 'USER'] },
  { name: 'Ativos', href: '/dashboard/ativos', icon: FlaskConical, roles: ['ADMIN', 'USER'] },
  { name: 'IA', href: '/dashboard/ia', icon: Sparkles, roles: ['ADMIN', 'USER'] },
  { name: 'Minhas', href: '/dashboard/minhas-sugestoes', icon: Inbox, roles: ['ADMIN', 'USER'] },
  { name: 'Sugestões', href: '/dashboard/sugestoes', icon: MessageSquareText, roles: ['ADMIN'] },
  { name: 'Config', href: '/dashboard/configuracoes', icon: SettingsIcon, roles: ['ADMIN'] },
]

interface BottomNavProps {
  mineNewCount?: number
  adminNewCount?: number
}

export function BottomNav({ mineNewCount = 0, adminNewCount = 0 }: BottomNavProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  const filteredNav = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-base-white border-t border-base-border lg:hidden">
      <div className="flex items-center justify-around h-14 px-2">
        {filteredNav.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : item.href === '/dashboard/minhas-sugestoes'
                ? pathname === '/dashboard/minhas-sugestoes' || pathname.startsWith('/dashboard/tickets/')
                : pathname === item.href || pathname.startsWith(item.href + '/')
          const navBadge =
            item.href === '/dashboard/minhas-sugestoes'
              ? mineNewCount
              : item.href === '/dashboard/sugestoes'
                ? adminNewCount
                : 0
          const badgeLabel =
            navBadge > 0 ? `${item.name}, ${navBadge} novo${navBadge > 1 ? 's' : ''}` : undefined
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-center min-w-0 flex-1 py-2"
              title={item.name}
              aria-label={badgeLabel ?? item.name}
            >
              <div
                className={cn(
                  'relative w-10 h-10 flex items-center justify-center transition-colors',
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
                {navBadge > 0 && (
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5">
                    <FeedbackNavBadgeChip
                      count={navBadge}
                      className={isActive ? 'ring-primary-accent' : undefined}
                    />
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
