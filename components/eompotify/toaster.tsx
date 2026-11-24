'use client'

import { useCallback, useState } from 'react'

export type ToastType = 'success' | 'error'

type ToastItem = { id: number; message: string; type: ToastType; leaving: boolean }

let toastSeq = 0

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastSeq
    setToasts((prev) => [...prev, { id, message, type, leaving: false }])
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 220)
    }, 2600)
  }, [])

  return { toasts, showToast }
}

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium backdrop-blur-md transition-all duration-200 ${
            t.type === 'error'
              ? 'bg-rose-500/95 text-white border-rose-400/40'
              : 'bg-neutral-900/95 text-white border-[#1DB954]/50'
          }`}
          style={t.leaving ? { opacity: 0, transform: 'translateY(-6px)' } : undefined}
        >
          <span className={`w-2 h-2 rounded-full ${t.type === 'error' ? 'bg-white' : 'bg-[#1DB954]'} shrink-0`} />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
