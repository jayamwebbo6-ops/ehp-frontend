import React, { useState, useEffect, useRef } from "react"
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Eye,
  ShieldAlert,
  Download,
  Loader2,
  Printer,
  Calendar,
  RotateCcw,
  Copy,
  Mail,
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  MoreHorizontal,
  Wrench,
  Package,
  ChevronDown
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { downloadPDF, generatePDFBase64 } from '../services/pdfService'
import CurrentClassicTemplate from '../components/quotation-templates/CurrentClassicTemplate'
import SparePartsTemplate from '../components/quotation-templates/SparePartsTemplate'
import ConfirmationModal from "../components/ConfirmationModal"
import Toast from "../components/Toast"
import { formatDate } from '../util/DateFormat'
import { useAuth } from '../context/AuthContext'
import { getSettings } from '../services/settingService'
import { getQuotations, deleteQuotation, bulkDeleteQuotations, createQuotation, sendQuotationEmail } from '../services/quotationService'
import { generateNextQuotationNumber, getSafeQuotationFilename } from '../util/QuestionNumber'

const getPaginationRange = (currentPage, totalPages) => {
  if (totalPages <= 10) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const range = []
  range.push(1)

  const start = Math.max(2, currentPage - 4)
  const end = Math.min(totalPages - 1, currentPage + 4)

  if (start > 2) {
    range.push('...')
  }

  for (let i = start; i <= end; i++) {
    range.push(i)
  }

  if (end < totalPages - 1) {
    range.push('...')
  }

  range.push(totalPages)

  return range
}

const IMAGE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/quotation-backend/api'

const getImageUrl = (filename) => {
  if (!filename) return ''
  if (filename.startsWith('data:') || filename.startsWith('http://') || filename.startsWith('https://')) return filename
  return `${IMAGE_BASE_URL}${filename}`
}

const SAMPLE_QUOTATION = {
  _id: "sample-quotation-id",
  id: "sample-quotation-id",
  quoteNo: "QT-SAMPLE-001",
  date: new Date().toISOString().split('T')[0],
  validity: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  customerName: "Jane Smith",
  companyName: "Nexus Manufacturing Ltd",
  customerEmail: "jane.smith@nexusmfg.com",
  customerMobile: "+91 99887 76655",
  address: "Plot No. 45, Sector 4, IMT Manesar, Gurugram, Haryana - 122050",
  state: "Haryana",
  subject: "Supply of High-Efficiency Machinery & Spare Parts Kit",
  businessType: "product",
  discountPercent: 10,
  discountAmount: 15500,
  subTotal: 155000,
  taxableAmount: 139500,
  cgstAmount: 12555,
  sgstAmount: 12555,
  igstAmount: 25110,
  cgstTotal: 12555,
  sgstTotal: 12555,
  igstTotal: 25110,
  grandTotal: 164610,
  amountInWords: "Rupees One Lakh Sixty-Four Thousand Six Hundred Ten Only",
  version: 1,
  deliveryTerms: {
    period: "2-3 Weeks",
    location: "CIF Destination",
    freight: "Included in Pricing"
  },
  paymentTerms: "<p>100% against delivery of materials.</p>",
  warranty: "<p>12 Months warranty from the date of commissioning.</p>",
  remarks: "This is a sample quotation preview for layout validation.",
  termsAndConditions: "<p>Standard warranty and payment terms apply. Goods once sold will not be taken back.</p>",
  items: [
    {
      productName: "Industrial Heavy Duty Mixer 500L",
      productDesc: "Stainless steel mixing unit with speed control and automatic safety locking",
      qty: 1,
      unit: "Nos",
      price: 120000,
      gstPercent: 18,
      cgstPercent: 9,
      sgstPercent: 9,
      igstPercent: 0,
      cgstAmount: 10800,
      sgstAmount: 10800,
      igstAmount: 0,
      image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150"
    },
    {
      productName: "Standard Spare Parts Kit A",
      productDesc: "Essential replacement parts including O-rings, gaskets, and nozzles for maintenance.",
      qty: 1,
      unit: "Kit",
      price: 35000,
      gstPercent: 10,
      cgstPercent: 5,
      sgstPercent: 5,
      igstPercent: 0,
      cgstAmount: 1750,
      sgstAmount: 1750,
      igstAmount: 0
    }
  ]
}

const SAMPLE_SPARE_PARTS_QUOTATION = {
  _id: "sample-spare-parts-id",
  id: "sample-spare-parts-id",
  quoteNo: "QT-SPARE-SAMPLE-001",
  productType: "Spare Parts",
  date: new Date().toISOString().split('T')[0],
  validity: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  customerName: "Jane Smith",
  companyName: "Nexus Manufacturing Ltd",
  customerEmail: "jane.smith@nexusmfg.com",
  customerMobile: "+91 99887 76655",
  address: "Plot No. 45, Sector 4, IMT Manesar, Gurugram, Haryana - 122050",
  state: "Haryana",
  country: "India",
  currency: "INR",
  subject: "",
  discountPercent: 5,
  discountAmount: 1750,
  subTotal: 35000,
  taxableAmount: 33250,
  cgstAmount: 2992.5,
  sgstAmount: 2992.5,
  igstAmount: 5985,
  cgstTotal: 2992.5,
  sgstTotal: 2992.5,
  igstTotal: 5985,
  grandTotal: 39235,
  amountInWords: "Rupees Thirty-Nine Thousand Two Hundred Thirty-Five Only",
  version: 1,
  deliveryTerms: {
    period: "1-2 Weeks",
    location: "Ex-Works / CIF Destination",
    freight: "Included"
  },
  paymentTerms: "<p>100% advance against proforma invoice.</p>",
  warranty: "<p>6 Months warranty on manufacturing defects.</p>",
  remarks: "This is a sample spare parts quotation preview for layout validation.",
  termsAndConditions: "<p>Standard spare parts replacement policy applies.</p>",
  items: [
    {
      productName: "High Precision Load Cell Sensor 500kg",
      productDesc: "Stainless steel hermetically sealed load cell for industrial scale maintenance.",
      artNo: "SP-LC-500",
      hsnCode: "90318000",
      qty: 2,
      unit: "Nos",
      price: 12500,
      gstPercent: 18,
      cgstPercent: 9,
      sgstPercent: 9,
      igstPercent: 0,
      cgstAmount: 1125,
      sgstAmount: 1125,
      igstAmount: 0
    },
    {
      productName: "Digital Indicator Controller Display Unit",
      productDesc: "Multi-range LED digital weight indicator module.",
      artNo: "SP-IND-901",
      hsnCode: "90319000",
      qty: 1,
      unit: "Nos",
      price: 10000,
      gstPercent: 18,
      cgstPercent: 9,
      sgstPercent: 9,
      igstPercent: 0,
      cgstAmount: 900,
      sgstAmount: 900,
      igstAmount: 0
    }
  ]
}

export default function QuotationGeneration() {
  const navigate = useNavigate()
  const location = useLocation()
  const { admin } = useAuth()
  const pdfRef = useRef(null)

  const isStateMatching = () => {
    if (!selectedQuotation || !companySettings) return false
    const customerCountry = (selectedQuotation.country || '').trim().toLowerCase()
    const companyCountry = (companySettings.country || companySettings.state || '').trim().toLowerCase()
    return customerCountry !== '' && companyCountry !== '' && customerCountry === companyCountry
  }

  const hasAddAccess = admin?.role === 'Admin' || admin?.permissions?.quotationAdd === 'yes'
  const hasEditAccess = admin?.role === 'Admin' || admin?.permissions?.quotationEdit === 'yes'
  const hasDeleteAccess = admin?.role === 'Admin' || admin?.permissions?.quotationDelete === 'yes'
  const [quotations, setQuotations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')
  const [filterVersion, setFilterVersion] = useState('')
  const [filterProductType, setFilterProductType] = useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Preview modal states
  const [selectedQuotation, setSelectedQuotation] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Company settings (loaded for B2B branding on PDF preview)
  const [companySettings, setCompanySettings] = useState(null)
  const [settings, setSettings] = useState(null)

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState([])
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)

  // Delete confirmation states
  const [deleteConfirmQuote, setDeleteConfirmQuote] = useState(null)

  // Download simulation states
  const [downloadingQuoteId, setDownloadingQuoteId] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // Toast notifications
  const [notification, setNotification] = useState(null)

  // 3-Dots Action Menu state
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })

  // Sample Preview Menu state
  const [isSampleMenuOpen, setIsSampleMenuOpen] = useState(false)
  const sampleMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-menu-container') && !e.target.closest('.action-menu-dropdown')) {
        setActiveMenuId(null)
      }
      if (sampleMenuRef.current && !sampleMenuRef.current.contains(e.target)) {
        setIsSampleMenuOpen(false)
      }
    }
    const handleScroll = () => {
      setActiveMenuId(null)
      setIsSampleMenuOpen(false)
    }

    document.addEventListener('click', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  const handleMenuClick = (e, qId) => {
    e.stopPropagation()
    if (activeMenuId === qId) {
      setActiveMenuId(null)
    } else {
      const rect = e.currentTarget.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      })
      setActiveMenuId(qId)
    }
  }

  // Email Composer Modal states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [emailQuote, setEmailQuote] = useState(null)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: ''
  })

  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('quoteNo')
  const [sortOrder, setSortOrder] = useState('asc')

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const fetchQuotationsList = async () => {
    try {
      setLoading(true);
      const data = await getQuotations()
      const list = data.quotations || []
      setQuotations(list)

      // Auto-open preview from navigation state if present
      if (location.state?.openPreviewId) {
        const quote = list.find(q => (q._id || q.id || '').toString() === location.state.openPreviewId.toString())
        if (quote) {
          setSelectedQuotation(quote)
          setIsPreviewOpen(true)
        }
      }
    } catch (e) {
      console.error("Error loading quotations from backend", e)
    } finally {
      setLoading(false);
    }
  }

  // Load data on mount
  useEffect(() => {
    fetchQuotationsList()

    if (location.state?.message) {
      setNotification({
        type: location.state.type || 'success',
        message: location.state.message
      })
      setTimeout(() => setNotification(null), 4000)
    }

    // Company Settings from backend
    const fetchCompanySettings = async () => {
      try {
        const data = await getSettings()
        if (data?.settings) {
          setSettings(data.settings)
          if (data.settings.companyDetails) {
            setCompanySettings({
              ...data.settings.companyDetails,
              bankDetails: data.settings.bankDetails
            })
          }
        }
      } catch (e) {
        console.error("Error loading company settings from backend", e)
      }
    }
    fetchCompanySettings()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterDateStart, filterDateEnd, filterVersion, filterProductType])

  // Show Toast
  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  // Dynamic unique versions list from actual documents
  const uniqueVersions = Array.from(
    new Set(quotations.map(q => {
      const val = q.version
      return typeof val === 'number' ? `V${val}` : (val || 'V1')
    }))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  // Filter
  const filteredQuotations = quotations.filter(q => {
    // Search Query Filter
    const matchesSearch =
      q.quoteNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.companyName && q.companyName.toLowerCase().includes(searchQuery.toLowerCase()))

    // Version Filter
    const matchesVersion = !filterVersion || (() => {
      const qVer = typeof q.version === 'number' ? `V${q.version}` : (q.version || 'V1')
      return qVer === filterVersion
    })()

    // Product Type Filter
    const matchesProductType = !filterProductType || (() => {
      const pType = q.productType || 'Scale'
      if (filterProductType === 'Spare Parts') {
        return pType === 'Spare Parts'
      } else if (filterProductType === 'Scale') {
        return pType !== 'Spare Parts'
      }
      return pType === filterProductType
    })()

    // Date Filter
    let matchesDate = true
    if (filterDateStart && q.date < filterDateStart) {
      matchesDate = false
    }
    if (filterDateEnd && q.date > filterDateEnd) {
      matchesDate = false
    }

    return matchesSearch && matchesVersion && matchesProductType && matchesDate
  })

  // Checkbox selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredQuotations.map(item => item._id || item.id)
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id))

    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])))
    }
  }

  const isAllSelected =
    filteredQuotations.length > 0 &&
    filteredQuotations.every(item => selectedIds.includes(item._id || item.id))

  // Delete handler
  const handleDeleteClick = (quote) => {
    setDeleteConfirmQuote(quote)
  }

  const executeDelete = async () => {
    if (!deleteConfirmQuote) return
    const targetId = deleteConfirmQuote._id || deleteConfirmQuote.id
    try {
      await deleteQuotation(targetId)
      showNotification('success', `Quotation "${deleteConfirmQuote.quoteNo}" deleted successfully`)
      setSelectedIds(prev => prev.filter(sId => sId !== targetId))
      fetchQuotationsList()
    } catch (e) {
      console.error("Error deleting quotation", e)
      showNotification('error', e.response?.data?.message || 'Failed to delete quotation')
    } finally {
      setDeleteConfirmQuote(null)
    }
  }

  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return

    setIsDeletingBulk(true)
    try {
      await bulkDeleteQuotations(selectedIds)
      showNotification('success', `${selectedIds.length} quotation(s) deleted successfully`)
      setSelectedIds([])
      setIsBulkDeleteModalOpen(false)
      fetchQuotationsList()
    } catch (err) {
      console.error("Bulk delete error:", err)
      showNotification('error', err.response?.data?.message || 'Failed to delete selected quotations')
    } finally {
      setIsDeletingBulk(false)
    }
  }

  const handleDuplicate = async (quote) => {
    const isSpare = (quote.productType === 'Spare Parts') || (quote.quoteNo && /SPARES/i.test(quote.quoteNo))
    const newQuoteNo = generateNextQuotationNumber(quotations, isSpare ? 'spares' : 'scale')

    // Copy quote and change only ID, quoteNo and version
    const duplicatedQuote = {
      ...quote,
      quoteNo: newQuoteNo,
      version: 1
    }

    // Remove read-only properties
    delete duplicatedQuote._id
    delete duplicatedQuote.id
    delete duplicatedQuote.createdAt
    delete duplicatedQuote.updatedAt

    // Clean up items (ensure Mongoose doesn't throw ValidationError due to extra sub-document read-only properties)
    if (duplicatedQuote.items) {
      duplicatedQuote.items = duplicatedQuote.items.map(item => ({
        productId: item.productId || '',
        productName: item.productName || item.desc || item.name,
        productDesc: item.productDesc || '',
        qty: item.qty,
        unit: item.unit || 'Nos',
        price: item.price !== undefined ? item.price : (item.unitPrice || 0),
        gstPercent: item.gstPercent || 0,
        cgstPercent: item.cgstPercent || 0,
        sgstPercent: item.sgstPercent || 0,
        igstPercent: item.igstPercent || 0,
        cgstAmount: item.cgstAmount || 0,
        sgstAmount: item.sgstAmount || 0,
        igstAmount: item.igstAmount || 0,
        desc: item.desc || '',
        image: item.image || '',
        websiteUrl: item.websiteUrl || item.websiteLink || '',
        youtubeUrl: item.youtubeUrl || item.youtubeLink || '',
        technicalData: item.technicalData || [],
        selectedAccessories: item.selectedAccessories || [],
        selectedOptionals: item.selectedOptionals || []
      }))
    }

    if (duplicatedQuote.sections) {
      duplicatedQuote.sections = duplicatedQuote.sections.map(sec => ({
        title: sec.title,
        content: sec.content,
        isActive: sec.isActive !== false
      }))
    }

    try {
      await createQuotation(duplicatedQuote)
      showNotification('success', `Quotation "${quote.quoteNo}" duplicated as "${newQuoteNo}"`)
      fetchQuotationsList()
    } catch (e) {
      console.error("Error duplicating quotation", e)
      showNotification('error', e.response?.data?.message || 'Failed to duplicate quotation')
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

    const defaultAttachments = settings?.defaultMailAndSubject?.attachments || []

    setEmailData({
      to: quote.customerEmail || '',
      subject: subject,
      message: body,
      attachments: [...defaultAttachments]
    })
    setIsEmailModalOpen(true)
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

  // Real PDF Email sender handler using shared PDF compiler
  const handleSendEmailSubmit = async (e) => {
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

  // Sort by selected column, with quote number and version as secondary criteria
  const sortedQuotations = [...filteredQuotations].sort((a, b) => {
    let valA = a[sortField] || ''
    let valB = b[sortField] || ''

    if (typeof valA === 'string') valA = valA.trim().toLowerCase()
    if (typeof valB === 'string') valB = valB.trim().toLowerCase()

    let comp = 0
    if (sortField === 'quoteNo') {
      comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
      if (comp === 0) {
        const verA = typeof a.version === 'number' ? `V${a.version}` : (a.version || '')
        const verB = typeof b.version === 'number' ? `V${b.version}` : (b.version || '')
        comp = verA.localeCompare(verB, undefined, { numeric: true })
      }
    } else {
      if (typeof valA === 'number' && typeof valB === 'number') {
        comp = valA - valB
      } else {
        comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
      }
      if (comp === 0) {
        const quoteA = a.quoteNo || ''
        const quoteB = b.quoteNo || ''
        comp = quoteA.localeCompare(quoteB, undefined, { numeric: true, sensitivity: 'base' })
        if (comp === 0) {
          const verA = typeof a.version === 'number' ? `V${a.version}` : (a.version || '')
          const verB = typeof b.version === 'number' ? `V${b.version}` : (b.version || '')
          comp = verA.localeCompare(verB, undefined, { numeric: true })
        }
      }
    }

    return sortOrder === 'asc' ? comp : -comp
  })

  // Pagination calculations
  const totalPages = Math.ceil(sortedQuotations.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentQuotations = sortedQuotations.slice(indexOfFirstItem, indexOfLastItem)

  // Type selection modal state
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)

  const handleOpenSamplePreview = (type = 'Scale') => {
    const baseSample = type === 'Spare Parts' ? SAMPLE_SPARE_PARTS_QUOTATION : SAMPLE_QUOTATION
    const dynamicSample = {
      ...baseSample,
      sections: (type === 'Spare Parts' ? (settings?.sectionsSpare || settings?.sections) : settings?.sections) || []
    }
    setSelectedQuotation(dynamicSample)
    setIsPreviewOpen(true)
    setIsSampleMenuOpen(false)
  }

  return (
    <div>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-primary">Quotation Management</h1>
            <p className="text-sm text-slate-500 mt-1">Generate, edit, and print official business quotations and version configurations.</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Sample Preview Dropdown */}
            <div ref={sampleMenuRef} className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsSampleMenuOpen(prev => !prev)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-[5px] border border-slate-200 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                <span>Sample Preview</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSampleMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSampleMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-[5px] shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-150 text-left">
                  <button
                    type="button"
                    onClick={() => handleOpenSamplePreview('Scale')}
                    className="w-full px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-accent flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-blue-500" />
                    <span>Scale Sample Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenSamplePreview('Spare Parts')}
                    className="w-full px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-accent flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100/60"
                  >
                    <Wrench className="w-4 h-4 text-amber-500" />
                    <span>Spare Parts Sample Preview</span>
                  </button>
                </div>
              )}
            </div>
            {hasAddAccess && (
              <button
                type="button"
                onClick={() => setIsTypeModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white font-semibold text-sm transition-all shadow-md hover:shadow-brand-primary/10 active:scale-[0.98] cursor-pointer rounded-[5px]"
              >
                <Plus className="w-4 h-4" />
                <span>New Quotation</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <Toast
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}

        {/* Table Workspace */}
        <div className="bg-white border border-slate-100 rounded-[5px] shadow-sm p-6 space-y-6">

          {/* Controls */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-end">
              {/* Search */}
              <div className="space-y-1 sm:col-span-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by quote, customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all placeholder:text-slate-400 bg-white"
                  />
                </div>
              </div>

              {/* Product Type Filter */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Type</label>
                <select
                  value={filterProductType}
                  onChange={(e) => setFilterProductType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white text-slate-600 font-medium"
                >
                  <option value="">All Product Types</option>
                  <option value="Scale">Scale</option>
                  <option value="Spare Parts">Spare Parts</option>
                </select>
              </div>

              {/* From Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">From Date</label>
                <input
                  type="date"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                  onClick={(e) => e.target.showPicker()}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white"
                />
              </div>

              {/* To Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">To Date</label>
                <input
                  type="date"
                  value={filterDateEnd}
                  onClick={(e) => e.target.showPicker()}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white"
                />
              </div>

              {/* Version Filter */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Version</label>
                <select
                  value={filterVersion}
                  onChange={(e) => setFilterVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white text-slate-600 font-medium"
                >
                  <option value="">All Versions</option>
                  {uniqueVersions.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-2 border-t border-slate-100/50">
              <div className="flex items-center gap-2">
                {selectedIds.length > 0 && hasDeleteAccess && (
                  <button
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-[5px] transition-all shadow-sm active:scale-[0.98] cursor-pointer animate-in fade-in"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedIds.length})</span>
                  </button>
                )}
              </div>

              {(searchQuery || filterDateStart || filterDateEnd || filterVersion || filterProductType) && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setFilterDateStart('')
                    setFilterDateEnd('')
                    setFilterVersion('')
                    setFilterProductType('')
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-brand-accent hover:text-brand-accent text-slate-500 text-xs font-semibold rounded-[5px] transition-all cursor-pointer bg-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Quotations List Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-[5px]">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {hasDeleteAccess && (
                    <th className="px-4 py-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-brand-primary border-slate-300 rounded focus:ring-brand-accent cursor-pointer accent-brand-primary"
                      />
                    </th>
                  )}
                  <th
                    className="px-6 py-4 cursor-pointer select-none hover:bg-slate-100 hover:text-slate-800 transition-colors"
                    onClick={() => handleSort('quoteNo')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Quotation Number</span>
                      {sortField === 'quoteNo' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-brand-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-brand-primary" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Mobile Number</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(5)].map((_, index) => (
                    <tr key={index}>
                      {hasDeleteAccess && (
                        <td className="px-4 py-4 text-center">
                          <div className="w-4 h-4 bg-slate-200 rounded animate-pulse mx-auto"></div>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="animate-pulse">
                          <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
                          <div className="h-3 w-16 bg-slate-100 rounded"></div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="animate-pulse">
                          <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
                          <div className="h-3 w-24 bg-slate-100 rounded"></div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="h-4 w-28 bg-slate-200 rounded animate-pulse"></div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="h-4 w-40 bg-slate-200 rounded animate-pulse"></div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className="w-8 h-8 bg-slate-200 rounded animate-pulse"
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : currentQuotations.length > 0 ? (
                  currentQuotations.map((quote) => (
                    <tr key={quote._id || quote.id} className="hover:bg-slate-50/50 transition-colors group">
                      {hasDeleteAccess && (
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(quote._id || quote.id)}
                            onChange={() => handleToggleSelect(quote._id || quote.id)}
                            className="w-4 h-4 text-brand-primary border-slate-300 rounded focus:ring-brand-accent cursor-pointer accent-brand-primary"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{quote.quoteNo}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-brand-accent-light text-brand-accent border border-brand-accent/10 rounded-[3px] font-bold text-[10px]">
                            {typeof quote.version === 'number' ? `V${quote.version}` : (quote.version || 'V1')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-medium">Date: {formatDate(quote.date)}</span>
                          {quote.productType === 'Spare Parts' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white shadow-xs">
                              <Wrench className="w-3 h-3 text-white" />
                              <span>Spare Parts</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                              <Package className="w-3 h-3 text-white" />
                              <span>Scale</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{quote.customerName}</p>
                        {quote.companyName && (
                          <p className="text-xs text-slate-450 font-medium">{quote.companyName}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{quote.customerMobile}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{quote.customerEmail}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2 relative action-menu-container">
                          {/* Direct Quick Actions: View PDF, Email, Download */}
                          <button
                            onClick={() => {
                              setSelectedQuotation(quote)
                              setIsPreviewOpen(true)
                            }}
                            title="View PDF Sheet"
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-accent rounded-[5px] border border-transparent transition-all cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEmailClick(quote)}
                            title="Send via Email"
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-accent rounded-[5px] border border-transparent transition-all cursor-pointer"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadClick(quote)}
                            disabled={downloadingQuoteId === (quote._id || quote.id)}
                            title="Download PDF"
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-accent rounded-[5px] border border-transparent transition-all cursor-pointer flex items-center justify-center min-w-[28px]"
                          >
                            {downloadingQuoteId === (quote._id || quote.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          {/* 3-Dots Action Menu Trigger */}
                          <div>
                            {(hasEditAccess || hasDeleteAccess || hasEditAccess) && (
                            <button
                              type="button"
                              onClick={(e) => handleMenuClick(e, quote._id || quote.id)}
                              title="More Actions"
                              className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <MoreHorizontal className="w-4.5 h-4.5" />
                            </button>
                            )}

                            {/* 3-Dots Dropdown Menu */}
                            {activeMenuId === (quote._id || quote.id) && (
                              <div
                                style={{ top: menuPosition.top, right: menuPosition.right }}
                                className="fixed w-36 bg-white rounded-lg shadow-2xl border border-slate-100 py-1.5 z-[9999] text-left animate-in fade-in zoom-in-95 duration-150 action-menu-dropdown"
                              >
                                {hasEditAccess && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null)
                                      if (quote.productType === 'Spare Parts') {
                                        navigate(`/quotations/spare-parts/edit/${quote._id || quote.id}`)
                                      } else {
                                        navigate(`/quotations/edit/${quote._id || quote.id}`)
                                      }
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-accent flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                )}
                                {hasAddAccess && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null)
                                      handleDuplicate(quote)
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-accent flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Duplicate</span>
                                  </button>
                                )}
                                {hasDeleteAccess && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null)
                                      handleDeleteClick(quote)
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={hasDeleteAccess ? 6 : 5} className="px-6 py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShieldAlert className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-sm">No quotations found</p>
                        <p className="text-xs">Adjust your search query or generate a new quotation sheet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500 font-medium">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedQuotations.length)} of {sortedQuotations.length} quotations
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-[5px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Previous
                </button>

                {getPaginationRange(currentPage, totalPages).map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-400">
                        ...
                      </span>
                    )
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-[5px] transition-all cursor-pointer
                      ${currentPage === pageNum
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'}`}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-[5px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Simulated Download Progress Bar */}
          {downloadingQuoteId && (
            <div className="space-y-1.5 p-4 bg-slate-50 border border-slate-100 rounded-[5px] animate-in fade-in duration-200">
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>Compiling A4 PDF layout, tables and signature stamps...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-accent h-full transition-all duration-300 rounded-full"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirmQuote !== null}
          title="Confirm Quotation Deletion"
          message={
            <>
              Are you sure you want to delete quotation <span className="font-bold text-slate-800">"{deleteConfirmQuote?.quoteNo}"</span>? This action cannot be undone.
            </>
          }
          confirmLabel="Delete Quotation"
          cancelLabel="Cancel"
          onConfirm={executeDelete}
          onCancel={() => setDeleteConfirmQuote(null)}
          type="danger"
        />

        {/* Bulk Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={isBulkDeleteModalOpen}
          title="Confirm Bulk Deletion"
          message={
            <>
              Are you sure you want to delete <strong className="text-slate-800">{selectedIds.length}</strong> selected quotation(s)? This action cannot be undone.
            </>
          }
          confirmLabel={isDeletingBulk ? "Deleting..." : `Delete ${selectedIds.length} Quotation(s)`}
          cancelLabel="Cancel"
          onConfirm={executeBulkDelete}
          onCancel={() => setIsBulkDeleteModalOpen(false)}
          type="danger"
        />

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

      {/* Select Quotation Type Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 w-full h-full min-h-screen">
          <div className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-50 px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-primary" />
                <span>Select Quotation Type</span>
              </h2>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Options */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Choose the category of quotation you would like to generate:
              </p>

              <div className="grid grid-cols-1 gap-3">
                {/* Scale Option */}
                <button
                  type="button"
                  onClick={() => {
                    setIsTypeModalOpen(false)
                    navigate('/quotations/new?productType=Scale')
                  }}
                  className="flex items-center gap-4 p-4 border border-slate-200 hover:border-brand-primary rounded-xl bg-slate-50/50 hover:bg-brand-primary/5 transition-all text-left group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 group-hover:text-brand-primary transition-colors">
                      Scale / Products &amp; Services
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Standard product quotation with scale specifications, technical parameters &amp; accessories.
                    </p>
                  </div>
                </button>

                {/* Spare Parts Option */}
                <button
                  type="button"
                  onClick={() => {
                    setIsTypeModalOpen(false)
                    navigate('/quotations/spare-parts/new')
                  }}
                  className="flex items-center gap-4 p-4 border border-slate-200 hover:border-brand-accent rounded-xl bg-slate-50/50 hover:bg-brand-accent-light/40 transition-all text-left group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-accent-light text-brand-accent flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 group-hover:text-brand-accent transition-colors">
                      Spare Parts
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Spare parts quotation with article numbers, HSN codes, and Spare Parts terms.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Quotation Viewer Sub-modal (Detailed A4 Format) */}
      {isPreviewOpen && selectedQuotation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 w-full h-full min-h-screen">
          <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-50 px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Quotation Preview
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[5px] font-mono font-medium border border-slate-200">
                    {selectedQuotation.quoteNo}
                  </span>
                  <span className="text-[10px] bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-2 py-0.5 rounded-[5px] font-bold uppercase tracking-wider">
                    {typeof selectedQuotation.version === 'number'
                      ? `V${selectedQuotation.version}`
                      : (selectedQuotation.version || 'V1')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedQuotation.quoteNo === 'QT-SAMPLE-001' && (
              <div className="bg-brand-primary/5 border-b border-brand-primary/10 px-6 py-3 text-xs text-brand-primary font-medium flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-6">
                <div className="flex items-start gap-2.5 flex-1">
                  <Info className="w-4 h-4 shrink-0 text-brand-accent mt-0.5 animate-pulse" />
                  <span className="leading-relaxed">
                    Only the <strong>Quotation metadata</strong>, <strong>Organization Details</strong>, and <strong>Item Details</strong> are static sample data. All terms &amp; conditions are loaded directly from your System Settings.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewOpen(false)
                    navigate('/settings')
                  }}
                  className="text-brand-accent hover:underline font-bold text-left cursor-pointer focus:outline-none shrink-0 p-0 bg-transparent border-0 leading-relaxed self-start"
                >
                  If you need to make changes, go to Settings and change to see the preview again.
                </button>
              </div>
            )}

            {/* A4 Invoice Container Scrollable Body */}
            <div className="p-8 overflow-y-auto flex-1 flex justify-center">
              <div className="">
                {selectedQuotation.productType === 'Spare Parts' ? (
                  <SparePartsTemplate
                    formData={selectedQuotation}
                    companySettings={companySettings}
                    getImageUrl={getImageUrl}
                  />
                ) : (
                  <CurrentClassicTemplate
                    formData={selectedQuotation}
                    companySettings={companySettings}
                    getImageUrl={getImageUrl}
                    isStateMatching={isStateMatching}
                  />
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-[5px] transition-all cursor-pointer"
              >
                Close Preview
              </button>

              <button
                type="button"
                disabled={downloadingQuoteId === (selectedQuotation._id || selectedQuotation.id)}
                onClick={() => {
                  handleDownloadClick(selectedQuotation);
                }}
                className="flex items-center gap-1.5 px-5 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition-all shadow-md active:scale-[0.98] cursor-pointer rounded-[5px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingQuoteId === (selectedQuotation._id || selectedQuotation.id) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>
                  {downloadingQuoteId === (selectedQuotation._id || selectedQuotation.id)
                    ? "Downloading..."
                    : "Download PDF"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

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
            <form onSubmit={handleSendEmailSubmit} className="p-6 space-y-4">
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white text-slate-800 font-sans resize-y"
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
    </div>
  )
}