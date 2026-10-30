import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface SwitchRowProps {
  label: string
  description?: string
  badge?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function SwitchRow({ label, description, badge, checked, onCheckedChange, disabled }: SwitchRowProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-muted/40 p-3">
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {label}
          {badge && <Badge>{badge}</Badge>}
        </span>
        {description && <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>}
      </span>
    </label>
  )
}
