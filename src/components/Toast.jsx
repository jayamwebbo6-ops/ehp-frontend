import React, { useEffect, useRef } from 'react'
import { Check, AlertCircle, X } from 'lucide-react'

export default function Toast({ type, message, onClose, duration = 4000 }) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        if (onCloseRef.current) onCloseRef.current()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-3.5 px-5 py-3.5 bg-white border border-slate-100 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] animate-in fade-in slide-in-from-top-4 duration-300 max-w-md min-w-[320px]">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border
        ${type === 'success' 
          ? 'bg-emerald-50 border-emerald-100 text-emerald-500' 
          : 'bg-rose-50 border-rose-100 text-rose-500'}`}
      >
        {type === 'success' ? (
          <Check className="w-5 h-5" />
        ) : (
          <AlertCircle className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 leading-snug">
          {message}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:bg-slate-105 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
