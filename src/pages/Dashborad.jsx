import React, { useState, useEffect, useRef } from 'react'
import {
  Plus,
  ArrowUpRight,
  Clock,
  FileText,
  Users,
  Package,
  Wrench,
  Layers,
  ChevronRight,
  ShieldAlert,
  Eye,
  Download,
  Mail,
  Send,
  Loader2,
  Check,
  AlertCircle,
  X,
  ChevronDown,
  Edit3,
  CheckCircle2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { downloadPDF, generatePDFBase64 } from '../services/pdfService'
import CurrentClassicTemplate from '../components/quotation-templates/CurrentClassicTemplate'
import SparePartsTemplate from '../components/quotation-templates/SparePartsTemplate'
import Toast from '../components/Toast'
import { formatDate } from '../util/DateFormat'
import { getQuotations, sendQuotationEmail } from '../services/quotationService'
import { getProducts } from '../services/productService'
import { getSpareParts } from '../services/sparePartService'
import { getSettings } from '../services/settingService'
import { getSafeQuotationFilename } from '../util/QuestionNumber'

export default function Dashborad() {
  const navigate = useNavigate()
  const pdfRef = useRef(null)

  const [stats, setStats] = useState({
    totalQuotations: 0,
    totalCustomers: 0,
    totalProducts: 0,
    scaleProductsCount: 0,
    sparePartsCount: 0
  })

  const [recentQuotes, setRecentQuotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [notification, setNotification] = useState(null)

  // Download states
  const [downloadingQuoteId, setDownloadingQuoteId] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // Email modal states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [emailQuote, setEmailQuote] = useState(null)
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: ''
  })
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const [selectedQuotation, setSelectedQuotation] = useState(null)
  const [companySettings, setCompanySettings] = useState(null)
  const [settings, setSettings] = useState(null)

  const IMAGE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/quotation-backend/api'

  const getImageUrl = (filename) => {
    if (!filename) return ''
    if (filename.startsWith('data:') || filename.startsWith('http://') || filename.startsWith('https://')) return filename
    return `${IMAGE_BASE_URL}${filename}`
  }

  const isStateMatching = () => {
    if (!selectedQuotation || !companySettings) return false
    const customerCountry = (selectedQuotation.country || '').trim().toLowerCase()
    const companyCountry = (companySettings.country || companySettings.state || '').trim().toLowerCase()
    return customerCountry !== '' && companyCountry !== '' && customerCountry === companyCountry
  }

  // Helpers
  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const handleViewClick = (quote) => {
    navigate('/quotations', { state: { openPreviewId: quote._id || quote.id } })
  }

  // Shared PDF compiler that resolves with the HTML and filename
  const generatePDFData = (quote) => {
    return new Promise((resolve, reject) => {
      setSelectedQuotation(quote)

      // Wait a brief moment for React state update to render the off-screen template
      setTimeout(() => {
        const element = pdfRef.current
        if (!element) {
          reject(new Error('Failed to initialize PDF template.'))
          return
        }

        const filename = getSafeQuotationFilename('Quotation', quote.quoteNo)
        try {
          const html = element.outerHTML
          resolve({ html, filename })
        } catch (err) {
          reject(err)
        }
      }, 150)
    })
  }

  // Real PDF Download handler using shared PDF compiler
  const handleDownloadClick = async (quote) => {
    const targetId = quote._id || quote.id
    setDownloadingQuoteId(targetId)
    setDownloadProgress(20)
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => Math.min(prev + 15, 90))
    }, 100)

    try {
      const { html, filename } = await generatePDFData(quote)
      clearInterval(progressInterval)
      setDownloadProgress(80)
      await downloadPDF(html, filename + '.pdf')
      setDownloadProgress(100)
      showNotification('success', 'PDF downloaded successfully!')
    } catch (err) {
      clearInterval(progressInterval)
      console.error(err)
      showNotification('error', err.message || 'Failed to generate PDF.')
    } finally {
      setDownloadingQuoteId(null)
      setDownloadProgress(0)
    }
  }

  const handleEmailClick = (quote) => {
    setEmailQuote(quote)

    let subject = settings?.defaultMailAndSubject?.subject || ``
    let bodyTemplate = settings?.defaultMailAndSubject?.body || ``

    const contactPerson = quote.customerName || 'Customer'
    const companyName = companySettings?.companyName || 'ABC Technologies Pvt Ltd'
    const quoteNo = quote.quoteNo || ''

    subject = subject
      .replace(/\[Contact Person Name\]/g, contactPerson)
      .replace(/\[Content Person Name\]/g, contactPerson)
      .replace(/\{Contact Person\}/g, contactPerson)
      .replace(/\{Content Person\}/g, contactPerson)
      .replace(/\[Company Name\]/g, companyName)
      .replace(/\[Quotation Number\]/g, quoteNo)
      .replace(/\{Quotation Number\}/g, quoteNo)

    let body = bodyTemplate
      .replace(/\[Contact Person Name\]/g, contactPerson)
      .replace(/\[Content Person Name\]/g, contactPerson)
      .replace(/\{Contact Person\}/g, contactPerson)
      .replace(/\{Content Person\}/g, contactPerson)
      .replace(/\[Company Name\]/g, companyName)
      .replace(/\[Quotation Number\]/g, quoteNo)
      .replace(/\{Quotation Number\}/g, quoteNo)

    // Fallback if not configured in settings
    if (!subject) {
      subject = `Quotation ${quoteNo} from ${companyName}`
    }
    if (!body) {
      body = `Dear ${contactPerson},\n\nPlease find attached the quotation ${quoteNo} for your review.\n\nBest regards,\n${companyName}`
    }

    const defaultAttachments = settings?.defaultMailAndSubject?.attachments || []

    setEmailData({
      to: quote.customerEmail || '',
      subject: subject,
      message: body,
      attachments: [...defaultAttachments]
    })
    setIsEmailModalOpen(true)
  }

  const handleSendEmail = async (e) => {
    e.preventDefault()
    if (!emailData.to.trim()) {
      showNotification('error', 'Recipient email is required')
      return
    }

    setIsSendingEmail(true)

    try {
      // 1. Generate PDF data
      const { html, filename } = await generatePDFData(emailQuote)
      const base64 = await generatePDFBase64(html)

      // 2. Call backend service to send the email
      await sendQuotationEmail({
        to: emailData.to,
        subject: emailData.subject,
        message: emailData.message,
        pdfBase64: base64,
        filename: filename + '.pdf',
        attachments: emailData.attachments || [],
        quoteId: emailQuote._id || emailQuote.id
      })

      showNotification('success', `Quotation ${emailQuote.quoteNo} sent to ${emailData.to} successfully`)
      setIsEmailModalOpen(false)
    } catch (err) {
      console.error("Email sending failed:", err)
      showNotification('error', err.response?.data?.message || err.message || 'Failed to send email.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true)
      let loadedQuotes = []
      let loadedScaleProducts = []
      let loadedSpareParts = []

      try {
        const quotesData = await getQuotations()
        loadedQuotes = quotesData.quotations || []
      } catch (e) {
        console.error("Error loading quotations for dashboard", e)
      }

      try {
        const productsData = await getProducts()
        loadedScaleProducts = productsData.products || []
      } catch (e) {
        console.error("Error loading scale products for dashboard", e)
      }

      try {
        const sparePartsData = await getSpareParts()
        loadedSpareParts = sparePartsData.spareParts || []
      } catch (e) {
        console.error("Error loading spare parts for dashboard", e)
      }

      // Load customers
      const savedCustomers = localStorage.getItem('quotation_customers_list')
      let loadedCustomers = []
      if (savedCustomers) {
        try {
          loadedCustomers = JSON.parse(savedCustomers)
        } catch (e) {
          console.error("Error loading customers for dashboard", e)
        }
      }

      // Load company settings
      try {
        const settingsData = await getSettings()
        if (settingsData?.settings) {
          setSettings(settingsData.settings)
          if (settingsData.settings.companyDetails) {
            setCompanySettings({
              ...settingsData.settings.companyDetails,
              bankDetails: settingsData.settings.bankDetails
            })
          }
        }
      } catch (e) {
        console.error("Error loading company settings for dashboard", e)
      }

      setStats({
        totalQuotations: loadedQuotes.length,
        totalCustomers: loadedCustomers.length,
        scaleProductsCount: loadedScaleProducts.length,
        sparePartsCount: loadedSpareParts.length,
        totalProducts: loadedScaleProducts.length + loadedSpareParts.length
      })

      // Get the most recent 5 quotations (sorted by date descending)
      const sorted = [...loadedQuotes].sort((a, b) => {
        const dateA = new Date(a.date || 0)
        const dateB = new Date(b.date || 0)
        return dateB - dateA
      })
      setRecentQuotes(sorted.slice(0, 5))
      setIsLoading(false)
    }

    loadDashboardData()
  }, [])

  return (
    <div>
      <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-300 font-sans">

        {/* Notifications */}
        {notification && (
          <Toast
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-brand-primary">Dashboard Overview</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time metrics, active product catalog, and quotation activity.</p>
          </div>
        </div>

        {/* Metric Cards Grid (Top) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1: Total Quotations */}
          <div className="relative overflow-hidden bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Quotations</span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight transition-transform group-hover:translate-x-1 duration-200">
                  {stats.totalQuotations}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-[5px] bg-brand-primary/5 text-brand-primary flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Card 2: Scale Products */}
          <div className="relative overflow-hidden bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Scale Products</span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight transition-transform group-hover:translate-x-1 duration-200">
                  {stats.scaleProductsCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-[5px] bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Card 3: Spare Parts Products */}
          <div className="relative overflow-hidden bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Spare Parts</span>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight transition-transform group-hover:translate-x-1 duration-200">
                  {stats.sparePartsCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-[5px] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Wrench className="w-6 h-6" />
              </div>
            </div>
          </div>

        </div>

        {/* Recent Activity Card */}
        <div className="bg-white border border-slate-100 rounded-[5px] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-accent" />
              <span>Recent Quotations</span>
            </h2>
            <button
              onClick={() => navigate('/quotations')}
              className="text-xs font-bold text-brand-primary hover:text-brand-accent transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-[5px]">
            <table className="w-full text-left border-collapse text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Quotation Number</th>
                  <th className="px-6 py-4">Product Type</th>
                  <th className="px-6 py-4">Customer Name / Company</th>
                  <th className="px-6 py-4 text-right">Estimated Total</th>
                  <th className="px-6 py-4 text-right w-36">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [...Array(5)].map((_, index) => (
                    <tr key={index}>
                      {/* Quotation number and date skeleton */}
                      <td className="px-6 py-4">
                        <div className="animate-pulse space-y-1">
                          <div className="h-4 w-20 bg-slate-200 rounded"></div>
                          <div className="h-3 w-24 bg-slate-100 rounded"></div>
                        </div>
                      </td>
                      {/* Product Type skeleton */}
                      <td className="px-6 py-4">
                        <div className="h-5 w-20 bg-slate-200 rounded animate-pulse"></div>
                      </td>
                      {/* Customer Name / Company skeleton */}
                      <td className="px-6 py-4">
                        <div className="animate-pulse">
                          <div className="h-4 w-32 bg-slate-200 rounded mb-1.5"></div>
                          <div className="h-3 w-24 bg-slate-100 rounded"></div>
                        </div>
                      </td>
                      {/* Amount skeleton */}
                      <td className="px-6 py-4 text-right">
                        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse ml-auto"></div>
                      </td>
                      {/* Actions skeleton */}
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 bg-slate-200 rounded-[5px] animate-pulse"
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : recentQuotes.length > 0 ? (
                  recentQuotes.map((qt) => (
                    <tr key={qt._id || qt.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-800">{qt.quoteNo}</span>
                          {qt.date && (
                            <span className="text-xs text-slate-500 font-semibold">
                              Date: {formatDate(qt.date)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {qt.productType === 'Spare Parts' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-600 text-white shadow-xs">
                            Spare Parts
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white shadow-xs">
                            Scale
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{qt.customerName}</p>
                        {qt.companyName && (
                          <p className="text-xs text-slate-400 font-medium">{qt.companyName}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-800">
                        {qt.currency === 'EUR' ? '€ ' : (qt.amount && (qt.amount.includes('€') || qt.amount.includes('₹')) ? '' : '₹ ')}{qt.grandTotal ? qt.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : (qt.amount || '0.00')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {downloadingQuoteId === (qt._id || qt.id) ? (
                          <div className="flex items-center justify-end gap-1.5 text-xs text-brand-primary font-bold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{downloadProgress}%</span>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleViewClick(qt)}
                              title="View Preview"
                              className="p-1.5 hover:bg-white text-slate-500 hover:text-brand-accent rounded-[5px] border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadClick(qt)}
                              title="Download PDF"
                              className="p-1.5 hover:bg-white text-slate-500 hover:text-brand-accent rounded-[5px] border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEmailClick(qt)}
                              title="Share to Mail"
                              className="p-1.5 hover:bg-white text-slate-500 hover:text-brand-accent rounded-[5px] border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShieldAlert className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-sm">No quotations found</p>
                        <p className="text-xs">Create your first quotation by clicking "New Quotation" above.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Email Composer Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 w-full h-full min-h-screen">
          <div className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-[5px] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-50 px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Mail className="w-4.5 h-4.5 text-brand-accent" />
                <span>Email Quotation: {emailQuote?.quoteNo}</span>
              </h2>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              {/* Recipient Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Recipient Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={emailData.to}
                  onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="e.g. client@company.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white text-slate-800"
                />
              </div>

              {/* Subject Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white text-slate-800"
                />
              </div>

              {/* Message Body Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Message Body
                </label>
                <textarea
                  rows={5}
                  value={emailData.message}
                  onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white text-slate-800 font-sans"
                />
              </div>

              <div className="bg-slate-50/20 border border-slate-100 p-3 rounded-[5px] text-[10px] text-slate-500 font-medium">
                • The quotation PDF will be attached to the email automatically.
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-[5px] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="flex items-center gap-1.5 px-5 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition-all shadow-md active:scale-[0.98] cursor-pointer rounded-[5px] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Email</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Hidden off-screen wrapper for row-level downloads */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {selectedQuotation && (
          selectedQuotation.productType === 'Spare Parts' ? (
            <SparePartsTemplate
              ref={pdfRef}
              formData={selectedQuotation}
              companySettings={companySettings}
              getImageUrl={getImageUrl}
            />
          ) : (
            <CurrentClassicTemplate
              ref={pdfRef}
              formData={selectedQuotation}
              companySettings={companySettings}
              getImageUrl={getImageUrl}
              isStateMatching={isStateMatching}
            />
          )
        )}
      </div>
    </div>
  )
}
