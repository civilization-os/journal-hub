import * as React from 'react'
import { cn } from '@/lib/utils'

function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'priority-high' | 'priority-medium' | 'priority-low'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary text-primary-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground',
        variant === 'outline' && 'border border-border text-foreground',
        variant === 'priority-high' && 'border border-red-200 text-red-600',
        variant === 'priority-medium' && 'border border-amber-200 text-amber-600',
        variant === 'priority-low' && 'border border-gray-200 text-gray-500',
        className
      )}
      {...props}
    />
  )
}

export { Badge }
