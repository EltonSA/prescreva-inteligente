import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-small border border-base-border bg-base-white px-[12px] py-2 text-paragraph text-content-title',
          'placeholder:text-content-text/50',
          'focus:outline-none focus:ring-2 focus:ring-primary-dark/20 focus:border-primary-dark',
          'disabled:cursor-not-allowed disabled:bg-base-disable disabled:opacity-50',
          'transition-all',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
