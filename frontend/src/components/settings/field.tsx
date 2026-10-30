import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useSettings } from '@/components/settings/settings-context'

export function Field({
  label,
  help,
  children,
}: {
  label: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="block">{label}</Label>
      {children}
      {help && <p className="text-xs leading-relaxed text-muted-foreground">{help}</p>}
    </div>
  )
}

interface SettingFieldProps {
  name: string
  label: string
  help?: string
  type?: string
  placeholder?: string
  fallback?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  min?: string
  max?: string
  className?: string
}

/**
 * Text/number input bound to one server setting. Saves on blur (or Enter),
 * matching the legacy auto-save behaviour, with toast feedback from the context.
 */
export function SettingField({ name, label, help, type = 'text', placeholder, fallback, inputMode, min, max, className }: SettingFieldProps) {
  const { settings, save } = useSettings()
  const current = settings[name] ?? fallback ?? ''
  const [value, setValue] = React.useState(current)

  React.useEffect(() => {
    setValue(current)
  }, [current])

  const commit = () => {
    if (value !== current) void save(name, value)
  }

  return (
    <Field label={label} help={help}>
      <Input
        className={className}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        min={min}
        max={max}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </Field>
  )
}
