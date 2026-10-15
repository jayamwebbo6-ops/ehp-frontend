import React from 'react'
import { Trash2, ShieldAlert, X, Check } from 'lucide-react'

export default function ConfirmationModal({ 
  isOpen, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?", 
  confirmLabel = "Confirm", 
  cancelLabel = "Cancel", 
  onConfirm, 
  onCancel, 
  type = "danger" // "danger" | "info" | "success"
}) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-50 border border-rose-100 text-rose-600">
            <Trash2 className="h-6 w-6" />
          </div>
        )
      case 'success':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
            <Check className="h-6 w-6" />
          </div>
        )
      default: // info
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-brand-accent-light border border-brand-accent/20 text-brand-primary">
            <ShieldAlert className="h-6 w-6" />
          </div>
        )
    }
  }

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return "px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-md hover:shadow-rose-600/10 active:scale-[0.98] cursor-pointer rounded-[5px]"
      case 'success':
        return "px-5 py-2 bg-emerald-650 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-md hover:shadow-emerald-600/10 active:scale-[0.98] cursor-pointer rounded-[5px]"
      default: // info
        return "px-5 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition-all shadow-md hover:shadow-brand-primary/10 active:scale-[0.98] cursor-pointer rounded-[5px]"
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 w-full h-full min-h-screen">
      <div className="relative w-full max-w-sm bg-white border border-slate-200 shadow-2xl rounded-[5px] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Close Button top-right */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Close confirmation dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Body */}
        <div className="p-6 text-center space-y-4 pt-8">
          {getIcon()}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            <div className="text-sm text-slate-500 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-[5px] transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={getConfirmButtonClass()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
