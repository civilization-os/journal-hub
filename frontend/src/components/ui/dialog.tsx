import * as React from 'react'
import { X } from 'lucide-react'

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

export function DialogTrigger({ children, ...props }: any) {
  const ctx = React.useContext(DialogContext)
  if (!ctx) return null
  
  const child = React.Children.only(children)
  return React.cloneElement(child, {
    onClick: (e: any) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/15 backdrop-blur-[1px] transition-opacity duration-200" 
        onClick={() => ctx.setOpen(false)}
      />
      
      {/* Content box */}
      <div
        ref={ref}
        className={`relative w-full max-w-lg bg-card border border-zinc-200/80 rounded-xl shadow-md p-6 animate-in zoom-in-95 duration-150 flex flex-col gap-4 z-10 ${className}`}
        {...props}
      >
        {children}
        <button 
          onClick={() => ctx.setOpen(false)}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:text-zinc-600 transition-colors focus-visible:outline-none cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
})
DialogContent.displayName = 'DialogContent'

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`space-y-1 ${className}`} {...props} />
)

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-sm font-bold text-zinc-950 leading-tight ${className}`}
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
    className={`text-xs text-zinc-500 mt-1 leading-relaxed ${className}`}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex justify-end gap-2 mt-4 ${className}`} {...props} />
)
