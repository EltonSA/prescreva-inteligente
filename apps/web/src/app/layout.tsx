import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/contexts/auth-context'
import { AppToaster } from '@/components/providers/app-toaster'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Prescreva Inteligente',
  description: 'Sistema inteligente de prescrições magistrais com IA',
  icons: {
    icon: '/ico.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          {children}
          <AppToaster />
        </AuthProvider>
      </body>
    </html>
  )
}
