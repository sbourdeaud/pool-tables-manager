import * as React from 'react'
import { NavLink, Link } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BuildIdentifier } from '@/components/build-identifier'
import { useSettings } from '@/components/settings/settings-context'
import { applyTheme, getStoredTheme, type Theme } from '@/lib/theme'
import { playPoolBallSound } from '@/lib/audio'
import { cn } from '@/lib/utils'
import { LanguageSelect, useI18n } from '@/lib/i18n'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/admin', label: 'Admin', end: false },
  { to: '/help', label: 'Help', end: false },
]

export function AppHeader() {
  const { settings } = useSettings()
  const { t } = useI18n()
  const [theme, setTheme] = React.useState<Theme>(getStoredTheme())
  const title = settings.app_name?.trim() || 'Pool Tables Manager'

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-2 sm:gap-3 sm:px-6">
        <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-initial" onClick={() => playPoolBallSound()}>
          <svg
            className="h-9 w-9 shrink-0 transition-transform duration-500 ease-in-out hover:rotate-[360deg] hover:scale-110"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="50" cy="50" r="48" fill="#111" stroke="#000" strokeWidth="1" />
            <circle cx="50" cy="32" r="19" fill="#fff" />
            <text x="50" y="40" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold" textAnchor="middle" fill="#000">
              8
            </text>
          </svg>
          <span className="truncate text-lg font-extrabold">{title}</span>
        </Link>
        <nav className="order-last flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:ml-2 sm:w-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              {t(item.label)}
            </NavLink>
          ))}
          <a
            href="/status"
            target="_blank"
            rel="noopener"
            className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
          >
            {t('Public Status')}
          </a>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <LanguageSelect className="mr-1 hidden sm:flex" />
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t('Toggle theme')} title={t('Toggle theme')}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('Log out')}
            title={t('Log out')}
            onClick={() => { window.location.href = '/auth/logout' }}
          >
            <LogOut />
          </Button>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pb-2 sm:px-6">
        <BuildIdentifier />
      </div>
    </header>
  )
}
