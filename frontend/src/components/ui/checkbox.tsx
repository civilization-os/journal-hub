import * as React from 'react'
import { Check } from 'lucide-react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', checked, onCheckedChange, ...props }, ref) => {
    return (
      <label className={`relative flex items-center justify-center w-4 h-4 cursor-pointer select-none shrink-0 ${className}`}>
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer sr-only"
          {...props}
        />
        <div className="absolute inset-0 rounded border border-zinc-300 bg-white peer-checked:bg-zinc-950 peer-checked:border-zinc-950 transition-all duration-150 flex items-center justify-center text-white shadow-xs">
          <Check className="h-3 w-3 opacity-0 peer-checked:opacity-100 transition-opacity duration-100" />
        </div>
      </label>
    )
  }
)
Checkbox.displayName = 'Checkbox'
