import { Link } from 'react-router-dom'
import { Beer, CircleDot, Database, Users, BarChart3, Settings2, Wallet } from 'lucide-react'
import { useSettings } from '@/components/settings/settings-context'
import { Card, CardContent } from '@/components/ui/card'

const TILES = [
  { to: '/admin/drinks', icon: Beer, title: 'Drinks Menu', desc: 'Add, edit or remove drinks' },
  { to: '/admin/tables', icon: CircleDot, title: 'Table Types & Inventory', desc: 'Manage table types and add/remove tables' },
  { to: '/admin/subscriptions', icon: Users, title: 'Subscriptions', desc: 'Create and remove subscriptions' },
  { to: '/admin/reports', icon: BarChart3, title: 'Reports', desc: 'Generate financial reports' },
  { to: '/settings', icon: Settings2, title: 'Settings', desc: 'Configure app, fiscal, email and security settings' },
]

export function AdminHomePage() {
  const { settings } = useSettings()
  const tiles = [
    ...TILES.slice(0, 3),
    ...(settings.pos_enabled === 'true'
      ? [{ to: '/admin/cash', icon: Wallet, title: 'Cash & Payments', desc: 'Cash-shift reconciliation and recorded payments' }]
      : []),
    ...TILES.slice(3),
    { to: '/admin/backup', icon: Database, title: 'Database Backup', desc: 'Download a compressed backup or restore one' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the venue configuration and inventory.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-2 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="pt-1 text-base font-bold">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
