import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-small border border-base-border bg-base-white px-[12px] py-[12px] text-paragraph text-content-title',
          'placeholder:text-content-text/50',
          'focus:outline-none focus:ring-2 focus:ring-primary-dark/20 focus:border-primary-dark',
          'disabled:cursor-not-allowed disabled:bg-base-disable disabled:opacity-50',
          'transition-all resize-none',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
