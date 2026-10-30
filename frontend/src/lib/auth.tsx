import * as React from 'react'
import { apiAuthInfo, apiLocalLogin, apiLocalSetup, setUnauthorizedHandler, type AuthInfo } from '@/lib/api'

interface AuthContextValue {
  info: AuthInfo | null
  loading: boolean
  login: (password: string) => Promise<{ ok: boolean; error?: string }>
  setup: (password: string) => Promise<{ ok: boolean; error?: string }>
  refresh: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = React.useState<AuthInfo | null>(null)
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(async () => {
    const result = await apiAuthInfo()
    if (result.ok && result.data) {
      setInfo(result.data)
      // OIDC-enabled and not authenticated: hand off to the server-side OIDC flow
      if (result.data.oidc_enabled && !result.data.authenticated) {
        window.location.href = '/auth/login'
        return
      }
    }
    setLoading(false)
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      void refresh()
    })
    return () => setUnauthorizedHandler(null)
  }, [refresh])

  const login = React.useCallback(async (password: string) => {
    const result = await apiLocalLogin(password)
    if (result.ok) {
      await refresh()
      return { ok: true }
    }
    return { ok: false, error: result.error || 'Login failed (' + result.status + ')' }
  }, [refresh])

  const setup = React.useCallback(async (password: string) => {
    const result = await apiLocalSetup(password)
    if (result.ok) {
      await refresh()
      return { ok: true }
    }
    return { ok: false, error: result.error || 'Setup failed (' + result.status + ')' }
  }, [refresh])

  return <AuthContext.Provider value={{ info, loading, login, setup, refresh }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
