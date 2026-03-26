'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-regular border border-base-border bg-base-disable/60 p-1 text-content-text',
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex flex-1 flex-col items-center justify-center gap-1 rounded-small px-2 py-2.5 text-center text-[11px] font-semibold leading-tight text-content-text transition-all sm:flex-row sm:gap-2 sm:px-3 sm:text-tag-medium',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/25 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-base-white data-[state=active]:text-primary-dark data-[state=active]:shadow-sm',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-6 outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/20 focus-visible:ring-offset-2 rounded-small',
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
