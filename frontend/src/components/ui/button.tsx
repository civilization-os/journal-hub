import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-bold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer'
    
    const variantStyles = {
      default: 'bg-zinc-950 text-white hover:bg-zinc-900 border border-zinc-950 shadow-sm active:scale-[0.98]',
      secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-100 active:scale-[0.98]',
      outline: 'border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] shadow-xs',
      ghost: 'hover:bg-zinc-100 hover:text-zinc-900 text-zinc-500',
      destructive: 'bg-rose-600 text-white hover:bg-rose-500 border border-rose-600 active:scale-[0.98] shadow-sm',
      link: 'text-zinc-900 underline-offset-4 hover:underline p-0 h-auto font-medium',
    }[variant]

    const sizeStyles = {
      default: 'h-9 px-4 py-2',
      sm: 'h-7.5 px-3 text-[11px] rounded-md',
      lg: 'h-10 px-5 text-sm',
      icon: 'h-8.5 w-8.5 rounded-md',
      'icon-sm': 'h-7 w-7 rounded-md',
    }[size]

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles, sizeStyles, className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
