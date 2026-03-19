import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-dark !text-[#FFFFFF] hover:bg-primary-dark/90 active:bg-primary-dark/80',
        secondary: 'bg-primary-light text-content-title hover:bg-primary-medium/60',
        outline: 'border border-base-border bg-base-white text-content-text hover:bg-base-disable',
        ghost: 'text-content-text hover:bg-base-disable',
        destructive: 'bg-error !text-[#FFFFFF] hover:bg-error/90',
        link: 'text-primary-dark underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-[24px] py-2 text-[14px] font-semibold rounded-small',
        sm: 'h-8 px-[12px] text-[12px] font-medium rounded-small',
        lg: 'h-12 px-[32px] text-[14px] font-semibold rounded-small',
        icon: 'h-10 w-10 rounded-small',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
