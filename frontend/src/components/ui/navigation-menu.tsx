import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { NavigationMenu as NavigationMenuPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

function NavigationMenu({ className, children, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Root>) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn('group/navigation-menu relative flex w-full max-w-full justify-start', className)}
      {...props}
    >
      {children}
      <div className="absolute top-full left-0 flex w-full justify-center">
        <NavigationMenuPrimitive.Viewport
          data-slot="navigation-menu-viewport"
          className="relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full origin-top-center overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md transition-[width,height] duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 md:w-[var(--radix-navigation-menu-viewport-width)]"
        />
      </div>
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn('flex flex-wrap items-center gap-1', className)}
      {...props}
    />
  )
}

function NavigationMenuItem({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return <NavigationMenuPrimitive.Item data-slot="navigation-menu-item" className={cn('relative', className)} {...props} />
}

function NavigationMenuTrigger({ className, children, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(
        'group/navigation-menu-trigger inline-flex h-9 items-center justify-center gap-1 rounded-md bg-background px-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200 group-data-[state=open]/navigation-menu-trigger:rotate-180" aria-hidden="true" />
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        'absolute top-0 left-0 w-full p-1.5 data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=from-]:zoom-in-95 data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out data-[motion^=to-]:zoom-out-95 md:w-auto',
        className,
      )}
      {...props}
    />
  )
}

function NavigationMenuLink({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn('block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      {...props}
    />
  )
}

export { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink }
