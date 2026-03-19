'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER'
  profession?: string
  phone?: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<User>) => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('prescreva_token')
    const savedUser = localStorage.getItem('prescreva_user')

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('prescreva_token')
        localStorage.removeItem('prescreva_user')
      }
    }
    setLoading(false)
  }, [])

  async function login(email: string, password: string) {
    const response = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    })

    localStorage.setItem('prescreva_token', response.token)
    localStorage.setItem('prescreva_user', JSON.stringify(response.user))
    setUser(response.user)
    router.push('/dashboard')
  }

  function logout() {
    localStorage.removeItem('prescreva_token')
    localStorage.removeItem('prescreva_user')
    setUser(null)
    router.push('/auth/login')
  }

  function updateUser(data: Partial<User>) {
    if (!user) return
    const updated = { ...user, ...data }
    setUser(updated)
    localStorage.setItem('prescreva_user', JSON.stringify(updated))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
