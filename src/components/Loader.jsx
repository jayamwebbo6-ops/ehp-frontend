import { Loader2 } from 'lucide-react'

export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] h-full w-full py-12 animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-accent" />
        <div className="absolute w-12 h-12 rounded-full border-2 border-brand-accent-light/30 border-t-transparent animate-ping opacity-75" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500 tracking-wide">Loading account details...</p>
    </div>
  )
}
