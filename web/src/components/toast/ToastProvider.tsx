'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Toast, ToastVariant } from './Toast'

interface ToastItem {
  id: string
  message: React.ReactNode
  variant: ToastVariant
  duration: number
}

interface ToastContextValue {
  addToast: (message: React.ReactNode, variant?: ToastVariant, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 3

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const addToast = React.useCallback(
    (message: React.ReactNode, variant: ToastVariant = 'info', duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => {
        const next = [...prev, { id, message, variant, duration }]
        // Keep only the last MAX_TOASTS
        return next.slice(-MAX_TOASTS)
      })
    },
    []
  )

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const contextValue = React.useMemo(
    () => ({ addToast, removeToast }),
    [addToast, removeToast]
  )

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-label="Notifications"
            className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2"
          >
            {toasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <Toast
                  id={toast.id}
                  variant={toast.variant}
                  message={toast.message}
                  duration={toast.duration}
                  onClose={removeToast}
                />
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
