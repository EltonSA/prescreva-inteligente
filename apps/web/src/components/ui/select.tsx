'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded-small border border-base-border bg-base-white px-[12px] py-2 text-paragraph text-content-title',
          'focus:outline-none focus:ring-2 focus:ring-primary-dark/20 focus:border-primary-dark',
          'disabled:cursor-not-allowed disabled:bg-base-disable disabled:opacity-50',
          'transition-all appearance-none cursor-pointer',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = 'Select'

export { Select }
