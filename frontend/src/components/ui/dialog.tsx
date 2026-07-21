import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

const DialogContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

export function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(open)

  React.useEffect(() => {
    setInternalOpen(open)
  }, [open])

  const setOpen = React.useCallback((val: boolean) => {
    setInternalOpen(val)
    onOpenChange?.(val)
  }, [onOpenChange])

  return (
    <DialogContext.Provider value={{ open: internalOpen, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  const ctx = React.useContext(DialogContext)
  if (!ctx) return null

  const child = React.Children.only(children) as React.ReactElement<{ onClick?: React.MouseEventHandler }>
  return React.cloneElement(child, {
    onClick: (e: React.MouseEvent) => {
      child.props.onClick?.(e)
      ctx.setOpen(true)
    },
    ...props
  })
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(DialogContext)
  if (!ctx || !ctx.open) return null

  React.useEffect(() => {
    if (!ctx.open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ctx.setOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [ctx.open, ctx])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => ctx.setOpen(false)}
      />

      {/* Content box */}
      <div
        ref={ref}
        className={cn(
          'relative w-full max-w-lg bg-white text-zinc-900 border border-zinc-200 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 z-10',
          className
        )}
        {...props}
      >
        {children}
        <button
          onClick={() => ctx.setOpen(false)}
          className="absolute right-4 top-4 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  )
})
DialogContent.displayName = 'DialogContent'

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-1', className)} {...props} />
)

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-bold leading-none tracking-tight text-foreground', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground mt-1.5', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex justify-end gap-2 mt-4', className)} {...props} />
)
