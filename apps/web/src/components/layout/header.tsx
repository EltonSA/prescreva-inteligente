'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { Menu } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface HeaderProps {
  collapsed?: boolean
  onToggleSidebar?: () => void
}

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
  const { user } = useAuth()

  const avatarUrl = user?.avatar ? `${API_URL}/uploads/${user.avatar}` : null

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 lg:h-16 bg-base-white border-b border-base-border flex items-center justify-between lg:grid lg:grid-cols-3 px-4 lg:px-[24px]">
      <div className="hidden lg:flex items-center">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="w-9 h-9 rounded-small flex items-center justify-center hover:bg-primary-light transition-colors"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <Menu className="w-[20px] h-[20px] text-primary-dark" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <Link href="/dashboard" className="flex items-center justify-center gap-[10px]">
        <Image src="/logo.png" alt="Prescreva Inteligente" width={180} height={48} className="h-8 lg:h-9 w-auto" />
        <span className="text-h3 text-content-title hidden md:inline">Prescreva Inteligente</span>
      </Link>

      <Link href="/dashboard/perfil" className="flex items-center gap-2 lg:gap-[12px] justify-end hover:opacity-80 transition-opacity">
        <div className="text-right hidden sm:block">
          <p className="text-tag-semibold text-content-title leading-tight">{user?.name}</p>
          <p className="text-desc-regular text-content-text">{user?.profession || 'Meu Perfil'}</p>
        </div>
        <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-huge bg-primary-light flex items-center justify-center overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.name || ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-tag-bold text-primary-dark">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          )}
        </div>
      </Link>
    </header>
  )
}
