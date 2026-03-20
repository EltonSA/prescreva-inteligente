const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/proxy'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('prescreva_token')
}

const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 30_000

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('prescreva_token')
      localStorage.removeItem('prescreva_user')
      window.location.href = '/auth/login'
    }
    throw new Error('Não autorizado')
  }

  if (response.status === 204) {
    return {} as T
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({} as Record<string, unknown>))
    const msg =
      (typeof errBody.error === 'string' && errBody.error) ||
      (typeof errBody.message === 'string' && errBody.message) ||
      `Erro na requisição (${response.status})`
    throw new Error(msg)
  }

  return response.json()
}

export const api = {
  get: <T>(endpoint: string, opts?: { skipCache?: boolean }) => {
    const isMethod = !opts?.skipCache
    if (isMethod) {
      const cached = cache.get(endpoint)
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return Promise.resolve(cached.data as T)
      }
    }
    return request<T>(endpoint).then((data) => {
      cache.set(endpoint, { data, ts: Date.now() })
      return data
    })
  },
  post: <T>(endpoint: string, data?: any) => {
    cache.clear()
    return request<T>(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    })
  },
  put: <T>(endpoint: string, data?: any) => {
    cache.clear()
    return request<T>(endpoint, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    })
  },
  patch: <T>(endpoint: string, data?: any) => {
    cache.clear()
    return request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  },
  delete: <T>(endpoint: string) => {
    cache.clear()
    return request<T>(endpoint, { method: 'DELETE' })
  },
  invalidate: (endpoint?: string) => {
    if (endpoint) cache.delete(endpoint)
    else cache.clear()
  },
}
