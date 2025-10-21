import React from 'react'

export default function Modal({ open, title, onClose, children, maxWidth = 'max-w-2xl' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className={`ds-card w-full ${maxWidth} p-6`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="ds-btn ds-btn-outline" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
