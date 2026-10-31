import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { ToastProvider } from '@/components/toast'
import { SettingsProvider } from '@/components/settings/settings-context'
import { AuthProvider, useAuth } from '@/lib/auth'
import { installClickSounds } from '@/lib/audio'
import { AppHeader } from '@/components/app-header'
import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { AdminHomePage } from '@/pages/admin-home'
import { DrinksPage } from '@/pages/drinks'
import { TablesPage } from '@/pages/tables'
import { SubscriptionsPage } from '@/pages/subscriptions'
import { CashPage } from '@/pages/cash'
import { BackupPage } from '@/pages/backup'
import { Suspense } from 'react'

// Heavy chart/PDF/spreadsheet deps only load when the reports page is opened
const ReportsPage = React.lazy(() => import('@/pages/reports').then((m) => ({ default: m.ReportsPage })))
const HelpPage = React.lazy(() => import('@/pages/help').then((m) => ({ default: m.HelpPage })))
import { SettingsPage } from '@/pages/settings'

function Gate({ children }: { children: React.ReactNode }) {
  const { loading, info } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>
    )
  }
  if (!info?.authenticated) return <LoginPage />
  return <>{children}</>
}

function Shell() {
  React.useEffect(() => installClickSounds(), [])
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminHomePage />} />
          <Route path="/admin/drinks" element={<DrinksPage />} />
          <Route path="/admin/tables" element={<TablesPage />} />
          <Route path="/admin/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/admin/cash" element={<CashPage />} />
          <Route path="/admin/backup" element={<BackupPage />} />
          <Route
            path="/admin/reports"
            element={
              <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading reports…</div>}>
                <ReportsPage />
              </Suspense>
            }
          />
          <Route
            path="/help"
            element={
              <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading help…</div>}>
                <HelpPage />
              </Suspense>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Gate>
              <Shell />
            </Gate>
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
)
