import * as React from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectContextProps {
  value: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const SelectContext = React.createContext<SelectContextProps | null>(null)

interface SelectProps {
  children?: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
}

export function Select({ children, value = '', onValueChange }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, triggerRef }}>
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  )
}

interface SelectValueProps {
  placeholder?: string
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const ctx = React.useContext(SelectContext)
  if (!ctx) return null
  return <span>{ctx.value || placeholder}</span>
}

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext)
  if (!ctx) return null

  return (
    <button
      type="button"
      ref={(node) => {
        ctx.triggerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-lg border border-zinc-700 bg-card px-3 py-1.5 text-xs text-zinc-100 shadow-xs focus:border-zinc-500 focus:outline-none transition-all duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
    </button>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

interface SelectContentProps {
  className?: string
  children?: React.ReactNode
}

export function SelectContent({ className, children }: SelectContentProps) {
  const ctx = React.useContext(SelectContext)
  if (!ctx || !ctx.open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => ctx.setOpen(false)} />
      <div
        className={cn(
          'absolute z-50 mt-1 min-w-[8rem] w-full overflow-hidden rounded-lg border border-zinc-700 bg-card p-1 text-zinc-100 shadow-md animate-in zoom-in-95 duration-100',
          className
        )}
      >
        {children}
      </div>
    </>
  )
}

export const SelectItem = React.forwardRef<
  HTMLDivElement,
  { value: string } & React.HTMLAttributes<HTMLDivElement>
>(({ className, children, value, ...props }, ref) => {
  const ctx = React.useContext(SelectContext)
  if (!ctx) return null

  const isSelected = ctx.value === value

  return (
    <div
      ref={ref}
      onClick={() => {
        ctx.onValueChange?.(value)
        ctx.setOpen(false)
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-7 pr-2 text-xs text-zinc-300 outline-none hover:bg-zinc-800 hover:text-zinc-100 transition-colors',
        isSelected && 'font-bold text-zinc-100 bg-zinc-800/50',
        className
      )}
      {...props}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-zinc-100">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
      <span>{children}</span>
    </div>
  )
})
SelectItem.displayName = 'SelectItem'

interface SelectGroupProps {
  children?: React.ReactNode
}

export function SelectGroup({ children }: SelectGroupProps) {
  return <div className="space-y-0.5">{children}</div>
}
