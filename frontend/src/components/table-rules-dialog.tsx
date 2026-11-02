import * as React from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useI18n } from '@/lib/i18n'
import { rulesForTableType } from '@/lib/table-rules'

interface TableRulesDialogProps {
  open: boolean
  tableType: string | null
  onClose: () => void
}

export function TableRulesDialog({ open, tableType, onClose }: TableRulesDialogProps) {
  const { t } = useI18n()
  const options = React.useMemo(() => tableType ? rulesForTableType(tableType) || [] : [], [tableType])
  const [selectedId, setSelectedId] = React.useState(options[0]?.id || '')

  React.useEffect(() => {
    setSelectedId(options[0]?.id || '')
  }, [options])

  const selected = options.find((option) => option.id === selectedId) || options[0]
  const title = selected ? t(selected.label) : tableType || ''
  const content = (option: NonNullable<typeof selected>) => (
    <div className="space-y-4 pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ['Rack', option.rack],
          ['Fouls', option.fouls],
          ['How to win', option.win],
          ['Scoring', option.scoring],
        ] as const).map(([heading, detail]) => (
          <section key={heading} className="rounded-lg bg-muted/40 p-4">
            <h3 className="text-sm font-semibold">{t(heading)}</h3>
            <p className="mt-2 text-sm leading-relaxed">{t(detail)}</p>
          </section>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{option.source}</span>
        <Button asChild size="sm" variant="outline">
          <a href={option.sourceUrl} target="_blank" rel="noreferrer">
            {t('Read official rules')} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t('This quick guide summarizes key rules; consult the official rulebook for full and current details.')}</p>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('Rules for {type}', { type: title })}</DialogTitle>
          <DialogDescription>{t('Official rule sources for this table type.')}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {options.length > 1 ? (
            <Tabs value={selected?.id} onValueChange={setSelectedId}>
              <TabsList className="w-full">
                {options.map((option) => <TabsTrigger key={option.id} value={option.id}>{t(option.label)}</TabsTrigger>)}
              </TabsList>
              {options.map((option) => <TabsContent key={option.id} value={option.id}>{content(option)}</TabsContent>)}
            </Tabs>
          ) : selected ? (
            content(selected)
          ) : (
            <p className="py-4 text-sm text-muted-foreground">{t('No rules are mapped for this table type.')}</p>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
