import { useState, useEffect } from 'react'
import { Mail, Info, Loader2, ArrowLeft, Key } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import logo from "../assets/companyLogo.png"

export default function Login() {
  const { sendLoginOtp, verifyLoginOtp } = useAuth()
  // Step state: 'email' | 'otp'
  const [step, setStep] = useState('email')

  // Form States
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [timer, setTimer] = useState(0)

  // Timer countdown effect for OTP resend
  useEffect(() => {
    let interval = null
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    } else if (timer === 0 && interval) {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [step, timer])

  // Step 1: Handle Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError('Please enter your email address.')
      return
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setIsLoading(true)

    try {
      await sendLoginOtp(trimmedEmail)
      const countdown = parseInt(import.meta.env.VITE_OTP_TIMER_SECONDS, 10) || 60
      setTimer(countdown)
      setStep('otp')
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send verification code. Please check your email.'
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  // Resend OTP handler
  const handleResendOtp = async () => {
    setError('')
    setIsLoading(true)

    const trimmedEmail = email.trim()

    try {
      await sendLoginOtp(trimmedEmail)
      const countdown = parseInt(import.meta.env.VITE_OTP_TIMER_SECONDS, 10) || 60
      setTimer(countdown)
      setOtp('')
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to resend verification code.'
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Handle Verify OTP & Complete Sign In
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedOtp = otp.trim()
    const trimmedEmail = email.trim()

    if (!trimmedOtp) {
      setError('Please enter the 6-digit verification code.')
      return
    }

    if (trimmedOtp.length !== 6) {
      setError('Verification code must be 6 digits.')
      return
    }

    setIsLoading(true)

    try {
      await verifyLoginOtp(trimmedEmail, trimmedOtp)
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Invalid or expired verification code.'
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setError('')
    setOtp('')
    setStep('email')
  }

  return (
    <main className="relative flex items-center justify-center min-h-screen bg-white overflow-hidden font-sans">
      {/* Background visual graphics */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-brand-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[200px] h-[200px] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md p-8 m-4 z-10 bg-white border border-slate-100 rounded-3xl shadow-[0_20px_50px_rgba(2,78,73,0.06)] flex flex-col transition-all duration-300">

        {/* Back Button for OTP View */}
        {step === 'otp' && (
          <button
            onClick={handleBackToEmail}
            className="self-start flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-primary mb-6 transition-colors focus:outline-none cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change Email</span>
          </button>
        )}

        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-25 h-20 rounded-4xl mb-4">
            <img src={logo} alt="logo" className="w-full h-full object-cover" />
          </div>

          <h2 className="text-2xl font-bold text-brand-primary text-center">
            {step === 'email' ? 'Welcome to Quotation Generation' : 'Enter Verification Code'}
          </h2>
          <p className="text-sm text-slate-500 mt-1 text-center">
            {step === 'email'
              ? 'Enter your registered email to receive a login OTP'
              : `We've sent a 6-digit code to ${email}`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl animate-shake">
            {error}
          </div>
        )}

        {/* Step 1: Send OTP Form */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl focus:outline-none focus:border-brand-accent focus:bg-white transition-all text-sm"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-2xl font-semibold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer
              ${isLoading
                  ? 'bg-brand-primary-light cursor-not-allowed opacity-80'
                  : 'bg-brand-primary hover:bg-brand-primary-light hover:shadow-brand-primary/20 active:scale-[0.98]'}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
                  <span>Sending Verification Code...</span>
                </>
              ) : (
                <span>Send OTP</span>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP Form */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            {/* Timer / Resend section */}
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Info className="w-4 h-4 text-brand-primary shrink-0" />
                {timer > 0 ? (
                  <span>Resend code in <strong className="text-brand-primary">{timer}s</strong></span>
                ) : (
                  <span>Code expired or not received?</span>
                )}
              </div>
              {timer === 0 && (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-brand-accent hover:underline font-bold focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2" htmlFor="otp">
                Enter 6-Digit OTP Code
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Key className="w-5 h-5" />
                </span>
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 font-mono tracking-[0.4em] rounded-2xl focus:outline-none focus:border-brand-accent focus:bg-white transition-all text-sm text-center"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-2xl font-semibold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer
              ${isLoading
                  ? 'bg-brand-primary-light cursor-not-allowed opacity-80'
                  : 'bg-brand-primary hover:bg-brand-primary-light hover:shadow-brand-primary/20 active:scale-[0.98]'}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <span>Verify & Sign In</span>
              )}
            </button>
          </form>
        )}

      </div>
    </main>
  )
}
