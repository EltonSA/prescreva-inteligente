'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { cn } from '@/lib/utils'
import { useFeedbackNavBadges } from '@/hooks/use-feedback-nav-badges'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const { mineNewCount, adminNewCount } = useFeedbackNavBadges()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-light border-t-primary-dark rounded-full animate-spin mx-auto mb-[12px]" />
          <p className="text-paragraph text-content-text">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="h-screen bg-base-background overflow-hidden">
      <Header collapsed={collapsed} onToggleSidebar={() => setCollapsed((v) => !v)} />
      <div className="pt-14 lg:pt-16 flex h-screen">
        <Sidebar collapsed={collapsed} />
        <main
          className={cn(
            'flex-1 overflow-y-auto scrollbar-thin transition-all duration-300',
            'p-4 pb-20 md:p-6 md:pb-24',
            'lg:pb-[32px] lg:p-[32px]',
            collapsed ? 'lg:ml-[72px]' : 'lg:ml-[256px]'
          )}
        >
          {children}
        </main>
      </div>
      <BottomNav mineNewCount={mineNewCount} adminNewCount={adminNewCount} />
    </div>
  )
}
