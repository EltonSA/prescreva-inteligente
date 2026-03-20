'use client'

import { Toaster } from 'react-hot-toast'

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      containerStyle={{ zIndex: 100000 }}
      toastOptions={{
        duration: 4500,
        className: '',
        style: {
          background: 'var(--color-white, #fff)',
          color: 'var(--color-title, #262626)',
          border: '1px solid var(--color-border, #D9D9D9)',
          boxShadow: '0 4px 24px rgba(62, 90, 78, 0.12)',
        },
      }}
    />
  )
}
