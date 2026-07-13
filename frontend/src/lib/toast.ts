import { create } from 'zustand'

export interface ToastMessage {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error'
}

interface ToastStore {
  toasts: ToastMessage[]
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
  dismissToast: (id: string) => void
}

let toastIdCounter = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = String(++toastIdCounter)
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, 4000)
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().addToast({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    useToastStore.getState().addToast({ title, description, variant: 'error' }),
  info: (title: string, description?: string) =>
    useToastStore.getState().addToast({ title, description, variant: 'default' }),
}
