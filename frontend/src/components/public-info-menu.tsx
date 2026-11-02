import * as React from 'react'
import { Menu as MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiDrinks, type Drink, type SettingsMap } from '@/lib/api'
import { groupDrinks } from '@/lib/menu'
import { money } from '@/lib/format'
import { localizedWeekday, parseWeeklyOpeningHours } from '@/lib/opening-hours'
import { useI18n } from '@/lib/i18n'

export function PublicInfoMenu({ settings, settingsLoading, settingsError }: { settings: SettingsMap | null; settingsLoading: boolean; settingsError: boolean }) {
  const { language, t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [tab, setTab] = React.useState<'hours' | 'drinks'>('hours')
  const [drinks, setDrinks] = React.useState<Drink[]>([])
  const [drinksLoading, setDrinksLoading] = React.useState(false)
  const [drinksError, setDrinksError] = React.useState(false)

  React.useEffect(() => {
    if (!open || tab !== 'drinks') return
    let active = true
    setDrinksLoading(true)
    setDrinksError(false)
    void apiDrinks(language)
      .then((result) => {
        if (!active) return
        if (result.ok && result.data) setDrinks(result.data)
        else setDrinksError(true)
      })
      .finally(() => {
        if (active) setDrinksLoading(false)
      })
    return () => { active = false }
  }, [language, open, tab])

  const hours = parseWeeklyOpeningHours(settings?.venue_opening_hours)
  const groups = React.useMemo(() => groupDrinks(drinks), [drinks])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MenuIcon className="h-4 w-4" /> {t('Menu')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Menu')}</DialogTitle>
          <DialogDescription>{t('Public venue information and available drinks.')}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Tabs value={tab} onValueChange={(value) => setTab(value as 'hours' | 'drinks')}>
            <TabsList className="w-full">
              <TabsTrigger value="hours">{t('Opening Hours')}</TabsTrigger>
              <TabsTrigger value="drinks">{t('Drinks Menu')}</TabsTrigger>
            </TabsList>
            <TabsContent value="hours" className="pt-4">
              {settingsLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('Loading…')}</p>
              ) : settingsError ? (
                <p className="py-4 text-center text-sm text-destructive">{t('Unable to load opening hours.')}</p>
              ) : !hours ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('Opening hours are not configured.')}</p>
              ) : (
                <div className="space-y-2">
                  {hours.map((day, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 border-b pb-2 last:border-0">
                      <span className="font-medium">{localizedWeekday(index, language)}</span>
                      <span className={day.isOpen ? 'tabular-nums' : 'text-muted-foreground'}>
                        {day.isOpen ? `${day.opensAt} – ${day.closesAt}` : t('Closed')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="drinks" className="pt-4">
              {drinksLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('Loading…')}</p>
              ) : drinksError ? (
                <p className="py-4 text-center text-sm text-destructive">{t('Unable to load drinks.')}</p>
              ) : groups.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('No drinks configured.')}</p>
              ) : (
                <div className="space-y-5">
                  {groups.map((group) => {
                    const Icon = group.icon
                    return (
                      <section key={group.value} className="space-y-2">
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                          <Icon className="h-4 w-4" /> {t(group.label)}
                        </h3>
                        <div className="space-y-2">
                          {group.drinks.map((drink) => (
                            <div key={drink.id} className="flex items-center justify-between gap-4 rounded-md bg-muted/40 px-3 py-2 text-sm">
                              <span>{drink.name}</span>
                              <span className="shrink-0 font-medium tabular-nums">{money(drink.price_cents, settings?.currency || '$')}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
