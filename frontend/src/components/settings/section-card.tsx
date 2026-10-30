import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  icon: LucideIcon
  title: string
  description?: string
  className?: string
  danger?: boolean
  children: React.ReactNode
}

export function SectionCard({ icon: Icon, title, description, className, danger, children }: SectionCardProps) {
  return (
    <Card className={cn(danger && 'border-destructive/40 bg-destructive/[0.04]', className)}>
      <CardHeader className="flex-row items-start gap-3 space-y-0 pb-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            danger ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && (
            <CardDescription className="text-[13px] leading-relaxed">{description}</CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  )
}
