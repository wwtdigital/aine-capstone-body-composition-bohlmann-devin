'use client'

import { ReactNode, useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  height?: 'auto' | 'half' | 'full'
}

const heightClass: Record<string, string> = {
  auto: '',
  half: 'h-[50vh]',
  full: 'h-[85vh]',
}

export default function BottomSheet({ open, onClose, title, children, height = 'auto' }: Props) {
  useEffect(() => {
    if (open) {
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
    }
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-page rounded-t-[28px] transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-8 h-1 rounded-full bg-line" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-5 pt-3 pb-1">
            <p className="text-base font-semibold text-ink">{title}</p>
          </div>
        )}

        {/* Content */}
        <div className={`max-h-[85vh] overflow-y-auto ${heightClass[height]}`}>
          {children}
        </div>
      </div>
    </>
  )
}
