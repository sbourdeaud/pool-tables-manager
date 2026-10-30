import * as React from 'react'
import { apiGetSettings, apiPatchSetting, type SettingsMap } from '@/lib/api'
import { useToast } from '@/components/toast'

interface SettingsContextValue {
  settings: SettingsMap
  loading: boolean
  loadError: string | null
  refresh: () => Promise<void>
  save: (key: string, value: string) => Promise<boolean>
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const [settings, setSettings] = React.useState<SettingsMap>({})
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    try {
      const next = await apiGetSettings()
      setSettings(next)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const save = React.useCallback(
    async (key: string, value: string) => {
      const result = await apiPatchSetting(key, value)
      if (result === 'ok') {
        setSettings((current) => ({ ...current, [key]: value }))
        toast({ title: 'Saved' })
        return true
      }
      if (result === 'unauthorized') {
        toast({
          title: 'Not signed in as admin',
          description: 'Log in through the classic app (header link), then try again.',
          variant: 'error',
        })
      } else {
        toast({ title: 'Failed to save', description: 'Please try again.', variant: 'error' })
      }
      return false
    },
    [toast],
  )

  return (
    <SettingsContext.Provider value={{ settings, loading, loadError, refresh, save }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = React.useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
