import React, { useState, useEffect, useRef } from 'react'
import { Edit3, ChevronDown, X } from 'lucide-react'
import {
  getRateMode,
  setRateMode,
  getManualRate,
  setManualRate,
  getCachedLiveRate,
  fetchLiveExchangeRate
} from '../util/Curencyconvert'
import Toast from './Toast'

export default function CurrencyRateWidget() {
  const [rateMode, setRateModeState] = useState(getRateMode() || 'live')
  const [liveRate, setLiveRate] = useState(getCachedLiveRate() || 106.21)
  const [manualRate, setManualRateState] = useState(getManualRate() || 110.31)
  const [isManualMenuOpen, setIsManualMenuOpen] = useState(false)
  const [manualInputValue, setManualInputValue] = useState('')
  const [notification, setNotification] = useState(null)
  const menuRef = useRef(null)

  const syncRates = () => {
    const mode = getRateMode() || 'live'
    setRateModeState(mode)
    const storedManual = getManualRate()
    if (storedManual) setManualRateState(storedManual)
    const cachedLive = getCachedLiveRate()
    if (cachedLive) setLiveRate(cachedLive)
  }

  useEffect(() => {
    syncRates()

    const fetchRate = async () => {
      const rate = await fetchLiveExchangeRate()
      if (rate) setLiveRate(rate)
    }
    fetchRate()

    const handleExternalUpdate = () => {
      syncRates()
    }
    window.addEventListener('exchangeRateUpdated', handleExternalUpdate)
    window.addEventListener('storage', handleExternalUpdate)

    return () => {
      window.removeEventListener('exchangeRateUpdated', handleExternalUpdate)
      window.removeEventListener('storage', handleExternalUpdate)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsManualMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectLive = () => {
    setRateMode('live')
    setRateModeState('live')
    setIsManualMenuOpen(false)
    window.dispatchEvent(new CustomEvent('exchangeRateUpdated', { detail: { mode: 'live', rate: liveRate } }))
    setNotification({
      type: 'success',
      message: `Live Currency activated (1 EUR = ₹${Number(liveRate || 106.21).toFixed(2)})`
    })
  }

  const handleToggleManualMenu = () => {
    if (rateMode !== 'manual') {
      const rateToActivate = manualRate || 110.31
      setManualRate(rateToActivate)
      setRateModeState('manual')
      window.dispatchEvent(new CustomEvent('exchangeRateUpdated', { detail: { mode: 'manual', rate: rateToActivate } }))
      setNotification({
        type: 'success',
        message: `Manual Currency activated (1 EUR = ₹${Number(rateToActivate).toFixed(2)})`
      })
    }
    setIsManualMenuOpen(prev => !prev)
    setManualInputValue(manualRate ? String(manualRate) : '')
  }

  const handleSaveNewManualValue = (e) => {
    e?.preventDefault()
    const num = parseFloat(manualInputValue)
    if (!num || isNaN(num) || num <= 0) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid positive exchange rate'
      })
      return
    }
    const ok = setManualRate(num)
    if (ok) {
      setManualRateState(num)
      setRateModeState('manual')
      setIsManualMenuOpen(false)
      window.dispatchEvent(new CustomEvent('exchangeRateUpdated', { detail: { mode: 'manual', rate: num } }))
      setNotification({
        type: 'success',
        message: `Manual Currency saved & activated: 1 EUR = ₹${num.toFixed(2)}`
      })
    }
  }

  return (
    <>
      {notification && (
        <Toast
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
          duration={3000}
        />
      )}

      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider hidden sm:inline whitespace-nowrap">
          1 EUR RATE:
        </span>

        {/* 1. Live Currency Button */}
        <button
          type="button"
          onClick={handleSelectLive}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[5px] text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
            rateMode === 'live'
              ? 'bg-[#ecfbf6] text-slate-800 border-[#34d399] ring-1 ring-[#34d399]/40 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="Click to activate live market exchange rate"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${rateMode === 'live' ? 'bg-[#10b981] animate-pulse' : 'bg-slate-300'}`} />
          <span className={rateMode === 'live' ? 'text-slate-800 font-bold' : ''}>
            Live: ₹{liveRate ? Number(liveRate).toFixed(2) : '106.21'}
          </span>
          {rateMode === 'live' && (
            <span className="text-[10px] uppercase font-extrabold bg-[#0f8b5a] text-white px-1.5 py-0.5 rounded-[3px] tracking-wide">
              ACTIVE
            </span>
          )}
        </button>

        {/* 2. Manual Entered Currency Button with Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={handleToggleManualMenu}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[5px] text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
              rateMode === 'manual'
                ? 'bg-blue-50 text-blue-900 border-blue-400 shadow-2xs ring-1 ring-blue-400/40'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
            }`}
            title="Click for manual currency options (Activate or Change Value)"
          >
            <Edit3 className="w-3.5 h-3.5 shrink-0 text-slate-600" />
            <span>Manual: ₹{manualRate ? Number(manualRate).toFixed(2) : '110.31'}</span>
            {rateMode === 'manual' && (
              <span className="text-[10px] uppercase font-extrabold bg-blue-600 text-white px-1.5 py-0.5 rounded-[3px] tracking-wide">
                ACTIVE
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${isManualMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown to Change Manual Value */}
          {isManualMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-[6px] shadow-2xl border border-slate-200 p-3.5 z-[100] animate-in fade-in zoom-in-95 duration-150">
              <div className="pb-2 mb-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Change Manual Rate</span>
                <button
                  type="button"
                  onClick={() => setIsManualMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Edit Input Form */}
              <form onSubmit={handleSaveNewManualValue} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    Enter New Rate (1 EUR in INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      autoFocus
                      value={manualInputValue}
                      onChange={(e) => setManualInputValue(e.target.value)}
                      placeholder="e.g. 110.50"
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-[5px] text-sm font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsManualMenuOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-[4px] border border-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-light rounded-[4px] shadow-xs transition-colors cursor-pointer"
                  >
                    Save & Update
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
