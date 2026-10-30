import * as React from 'react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function Brand() {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg className="h-14 w-14" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill="#111" stroke="#000" strokeWidth="1" />
        <circle cx="50" cy="32" r="19" fill="#fff" />
        <text x="50" y="40" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold" textAnchor="middle" fill="#000">
          8
        </text>
      </svg>
      <span className="text-lg font-extrabold tracking-tight">Pool Tables Manager</span>
    </div>
  )
}

export function LoginPage() {
  const { info, login, setup } = useAuth()
  const isSetup = info ? !info.local_admin_setup : false
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (isSetup) {
      if (password.length < 6) return setError('Password must be at least 6 characters')
      if (password !== confirm) return setError('Passwords do not match')
    } else if (!password) {
      return setError('Enter your admin password')
    }
    setBusy(true)
    const result = isSetup ? await setup(password) : await login(password)
    setBusy(false)
    if (!result.ok) {
      setError(result.error || 'Something went wrong')
      setPassword('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Brand />
          <CardTitle className="pt-3 text-lg">{isSetup ? 'Initial Admin Setup' : 'Admin Login'}</CardTitle>
          <CardDescription>
            {isSetup ? 'Define a local admin password (username: admin). Keep it secure.' : 'Enter the local admin password to manage the venue.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password">{isSetup ? 'New admin password' : 'Admin password'}</Label>
              <Input
                id="password"
                type="password"
                autoFocus
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {isSetup && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : isSetup ? 'Save password & continue' : 'Log in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <a href="/status" className="underline-offset-4 hover:underline">
              Public status board
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
