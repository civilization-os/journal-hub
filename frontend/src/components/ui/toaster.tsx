import * as React from 'react'
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from './toast'

type ToastData = {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error'
  duration?: number
}

type ToasterContextValue = {
  toast: (data: Omit<ToastData, 'id'>) => void
}

const ToasterContext = React.createContext<ToasterContextValue | null>(null)

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([])

  const toast = React.useCallback((data: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...data, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, data.duration || 3500)
  }, [])

  return (
    <ToasterContext.Provider value={{ toast }}>
      <ToastProvider>
        {children}
        {toasts.map((t) => (
          <Toast key={t.id} variant={t.variant} open>
            <div className="flex-1 min-w-0">
              <ToastTitle>{t.title}</ToastTitle>
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
            </div>
            <ToastClose onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToasterContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToasterContext)
  if (!ctx) throw new Error('useToast must be used within ToasterProvider')
  return ctx
}
