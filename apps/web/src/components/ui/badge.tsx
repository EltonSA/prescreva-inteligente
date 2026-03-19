import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'warning' | 'success'
}

const variantStyles: Record<string, string> = {
  default: 'bg-primary-light text-primary-dark',
  secondary: 'bg-base-disable text-content-text',
  destructive: 'bg-error/10 text-error',
  warning: 'bg-[#FFF3E0] text-[#E65100]',
  success: 'bg-primary-light text-primary-dark',
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-huge px-[12px] py-1 text-desc-medium transition-colors',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
export type { BadgeProps }
