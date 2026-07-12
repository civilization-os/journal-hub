import * as React from 'react'
import { useToastStore } from '@/lib/toast'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'

type ToastData = {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error'
}

type ToasterContextValue = {
  toast: (data: Omit<ToastData, 'id'>) => void
}

const ToasterContext = React.createContext<ToasterContextValue | null>(null)

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const { toasts, dismissToast, addToast } = useToastStore()

  const toastFn = React.useCallback((data: Omit<ToastData, 'id'>) => {
    addToast(data)
  }, [addToast])

  return (
    <ToasterContext.Provider value={{ toast: toastFn }}>
      {children}
      {/* Toast Portal List */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-2.5 w-80 max-w-[calc(100vw-2rem)] select-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border bg-white p-4 shadow-sm transition-all duration-200 animate-in slide-in-from-top-2 ${
              t.variant === 'success' ? 'border-l-2 border-l-emerald-500 border-zinc-100' :
              t.variant === 'error' ? 'border-l-2 border-l-rose-500 border-zinc-100' :
              'border-l-2 border-l-zinc-500 border-zinc-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.variant === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {t.variant === 'error' && <AlertCircle className="h-4 w-4 text-rose-500" />}
              {t.variant === 'default' && <Info className="h-4 w-4 text-zinc-500" />}
            </div>
            <div className="flex-1 min-w-0">
              {t.title && <div className="text-xs font-semibold text-zinc-900 leading-tight">{t.title}</div>}
              {t.description && <div className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{t.description}</div>}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 p-0.5 text-zinc-400 hover:text-zinc-600 rounded-md transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToasterContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToasterContext)
  if (!ctx) throw new Error('useToast must be used within ToasterProvider')
  return ctx
}
