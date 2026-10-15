import React, { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Settings,
  Eye,
  Info,
  X,
  Download,
  Upload,
  Edit,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Package,
  Wrench,
  Landmark,
  Calculator
} from 'lucide-react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { useAuth } from '../context/AuthContext'
import { getSettings } from '../services/settingService'
import { getQuotations, getQuotationById, createQuotation, updateQuotation } from '../services/quotationService'
import { getSpareParts } from '../services/sparePartService'
import { downloadPDF } from '../services/pdfService'
import SparePartsTemplate from '../components/quotation-templates/SparePartsTemplate'
import ConfirmationModal from '../components/ConfirmationModal'
import { formatDateForInput } from '../util/DateFormat'
import { fetchLiveExchangeRate, convertCurrency, getCurrencySymbol, getRateMode, getManualRate } from '../util/Curencyconvert'
import { generateNextQuotationNumber, getSafeQuotationFilename, isQuotationNumberExists, parseQuotationNumberParts } from '../util/QuestionNumber'

const IMAGE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/quotation-backend/api'

const getImageUrl = (filename) => {
  if (!filename) return ''
  if (filename.startsWith('data:') || filename.startsWith('blob:') || filename.startsWith('http://') || filename.startsWith('https://')) return filename
  return `${IMAGE_BASE_URL}${filename}`
}

function convertNumberToWords(amount) {
  const num = Math.floor(amount || 0)
  if (num === 0) return "Zero Only"

  const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const double = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

  const convertLessThanThousand = (n) => {
    let str = ""
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + " Hundred"
      n %= 100
      if (n > 0) {
        str += " and "
      }
    }
    if (n >= 20) {
      str += double[Math.floor(n / 10)] + " "
      n %= 10
    }
    if (n > 0) {
      str += single[n] + " "
    }
    return str.trim()
  }

  let words = ""
  let rem = num

  if (rem >= 10000000) {
    words += convertLessThanThousand(Math.floor(rem / 10000000)) + " Crore "
    rem %= 10000000
  }
  if (rem >= 100000) {
    words += convertLessThanThousand(Math.floor(rem / 100000)) + " Lakh "
    rem %= 100000
  }
  if (rem >= 1000) {
    words += convertLessThanThousand(Math.floor(rem / 1000)) + " Thousand "
    rem %= 1000
  }
  if (rem > 0) {
    if (words.trim().length > 0 && (rem < 100 || rem % 100 === 0)) {
      words += "and "
    }
    words += convertLessThanThousand(rem)
  }

  return words.trim() + " Only"
}

export default function AddSparePartQuotation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isEditMode = !!id

  const { admin, loading } = useAuth()
  const hasAddAccess = admin?.role === 'Admin' || admin?.permissions?.quotationAdd === 'yes'
  const hasEditAccess = admin?.role === 'Admin' || admin?.permissions?.quotationEdit === 'yes'

  useEffect(() => {
    if (loading || !admin) return
    if (isEditMode && !hasEditAccess) {
      navigate('/quotations')
    } else if (!isEditMode && !hasAddAccess) {
      navigate('/quotations')
    }
  }, [loading, admin, isEditMode, hasEditAccess, hasAddAccess, navigate])

  const [customers, setCustomers] = useState([])
  const [spareParts, setSpareParts] = useState([])
  const [allQuotations, setAllQuotations] = useState([])
  const [companySettings, setCompanySettings] = useState(null)

  // Active tab state: 'customer' | 'products' | 'section' | 'intro_content' | 'preview'
  const [activeTab, setActiveTab] = useState('customer')

  const [showVersionModal, setShowVersionModal] = useState(false)
  const [versionOptions, setVersionOptions] = useState({ exists: false, highestVersionStr: 'V1', highestVersionNum: 1, matchingQuotes: [] })
  const [saveAsNewVersion, setSaveAsNewVersion] = useState(false)

  const [formData, setFormData] = useState({
    quoteNo: '',
    productType: 'Spare Parts',
    version: 1,
    date: new Date().toISOString().split('T')[0],
    validity: '',
    currency: 'EUR',
    refNo: '',
    isConfidential: false,
    subject: '',
    introContent: '',

    // Customer Details
    customerId: '',
    customerName: '',
    companyName: '',
    country: '',
    customerMobile: '',
    customerEmail: '',
    address: '',
    shippingAddress: '',
    gstOption: 'withGst',
    gstNumber: '',
    roundOff: true,

    // Items
    items: [],

    // Financial
    subTotal: 0,
    discountPercent: '',
    discountAmount: 0,
    taxableAmount: 0,
    gstPercent: 0,
    gstAmount: 0,
    grandTotal: 0,
    amountInWords: '',
    businessType: 'product',

    // Additional Charges (Hidden for Spare Parts)
    transportStorage: {
      show: false,
      name: '',
      price: 0,
      currency: 'EUR',
      gstOption: '',
      gstPercent: 0
    },
    installation: {
      show: false,
      name: '',
      price: 0,
      currency: 'EUR',
      gstOption: '',
      gstPercent: 0
    },

    // Bank & settings
    showBankDetails: true,
    showProductImages: true,
    bankDetails: {
      bankContentIndia: '',
      bankContentEurope: '',
      qrCodeIndia: '',
      qrCodeEurope: '',
      showBankDetails: true
    }
  })

  // Item entry state
  const [newItem, setNewItem] = useState({
    productId: '',
    productName: '',
    productDesc: '',
    artNo: '',
    hsnCode: '',
    qty: 1,
    unit: 'Nos',
    basePrice: '',
    price: '',
    gstPercent: '',
    image: ''
  })

  // Quill refs
  const modalEditorRef = useRef(null)
  const modalQuillRef = useRef(null)
  const introEditorRef = useRef(null)
  const introQuillRef = useRef(null)

  // Sections
  const [sections, setSections] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [sectionTitle, setSectionTitle] = useState('')
  const [deleteConfirmSection, setDeleteConfirmSection] = useState(null)

  const previewRef = useRef(null)
  const [errors, setErrors] = useState({})
  const [notification, setNotification] = useState(null)
  const [isSavingAndDownloading, setIsSavingAndDownloading] = useState(false)
  const [selectedQrFile, setSelectedQrFile] = useState(null)
  const [exchangeRate, setExchangeRate] = useState(110.31)

  // Fetch exchange rate (respects manual vs live mode)
  useEffect(() => {
    const fetchRate = async () => {
      const mode = getRateMode()
      if (mode === 'manual') {
        const manual = getManualRate()
        if (manual) {
          setExchangeRate(manual)
          return
        }
      }
      const rate = await fetchLiveExchangeRate()
      if (rate) setExchangeRate(rate)
    }
    fetchRate()

    const handleRateUpdate = (e) => {
      if (e?.detail?.rate) {
        setExchangeRate(e.detail.rate)
      } else {
        fetchRate()
      }
    }
    window.addEventListener('exchangeRateUpdated', handleRateUpdate)
    return () => window.removeEventListener('exchangeRateUpdated', handleRateUpdate)
  }, [])

  // Load directories and initial data
  useEffect(() => {
    const fetchSparePartsData = async () => {
      try {
        const data = await getSpareParts()
        setSpareParts(data.spareParts || [])
      } catch (e) {
        console.error("Error loading spare parts", e)
      }
    }
    fetchSparePartsData()

    const fetchAllQuotations = async () => {
      try {
        const data = await getQuotations()
        const list = data.quotations || []
        setAllQuotations(list)

        const uniqueCustomersMap = new Map()
        list.forEach(q => {
          if (q.companyName || q.customerName) {
            const key = `${q.companyName || ''}-${q.customerName || ''}`.trim().toLowerCase()
            if (!uniqueCustomersMap.has(key)) {
              uniqueCustomersMap.set(key, {
                id: q.customerId || q._id || q.id || key,
                name: q.customerName || '',
                company: q.companyName || '',
                mobile: q.customerMobile || '',
                email: q.customerEmail || '',
                address: q.address || '',
                gst: q.gstNumber || '',
                country: q.country || ''
              })
            }
          }
        })
        setCustomers(Array.from(uniqueCustomersMap.values()))

        if (!isEditMode) {
          const nextQuoteNo = generateNextQuotationNumber(list, 'spares')
          setFormData(prev => ({ ...prev, quoteNo: nextQuoteNo }))
        }
      } catch (e) {
        console.error("Error loading quotations", e)
      }
    }
    fetchAllQuotations()

    const fetchCompanySettings = async () => {
      try {
        const data = await getSettings()
        const settings = data?.settings
        if (settings) {
          const companyDetails = settings.companyDetails || {}
          const defaultIntro = companyDetails.firstPageContentSpare || settings.firstPageContentSpare || companyDetails.firstPageContent || settings.firstPageContent || ''

          setCompanySettings({
            ...companyDetails,
            bankDetails: settings.bankDetails,
            firstPageContent: defaultIntro
          })

          let defaultGstRate = 0
          const baseGstRate = parseFloat(companyDetails.gstRate || companyDetails.igstRate || settings.gstRate || settings.igstRate)
          if (!isNaN(baseGstRate)) {
            defaultGstRate = baseGstRate
          }

          if (!isEditMode) {
            const targetSections = (settings.sectionsSpare && settings.sectionsSpare.length > 0) ? settings.sectionsSpare : settings.sections
            if (targetSections && targetSections.length > 0) {
              const sorted = [...targetSections].sort((a, b) => (a.order || 0) - (b.order || 0))
              setSections(sorted.map((sec, idx) => ({
                tempId: sec._id || sec.tempId || `sec-setting-${idx}-${Date.now()}`,
                _id: sec._id,
                title: sec.title,
                content: sec.content,
                isActive: sec.isActive !== false,
                order: sec.order || idx
              })))
            } else {
              setSections([
                {
                  tempId: 'sec-spare-pay',
                  title: "Spare Parts Payment & Delivery Terms",
                  content: `<ul>\n  <li><strong>100% Advance Payment:</strong> Required with formal Purchase Order for spare parts dispatch.</li>\n  <li><strong>Dispatch Lead Time:</strong> Within 3 to 5 business days from payment receipt.</li>\n  <li><strong>Currency:</strong> All prices quoted in EUR/INR as specified.</li>\n</ul>`,
                  isActive: true
                },
                {
                  tempId: 'sec-spare-war',
                  title: "Warranty & Guarantee",
                  content: `<ul>\n  <li><strong>6 Months Guarantee:</strong> On genuine replacement components against manufacturing defects.</li>\n  <li>Excludes wear-and-tear parts and damage from improper installation.</li>\n</ul>`,
                  isActive: true
                }
              ])
            }

            setFormData(prev => ({
              ...prev,
              gstPercent: defaultGstRate,
              introContent: defaultIntro,
              showBankDetails: settings.bankDetails?.showBankDetails !== false,
              bankDetails: {
                bankContentIndia: settings.bankDetails?.bankContentIndia || '',
                bankContentEurope: settings.bankDetails?.bankContentEurope || '',
                qrCodeIndia: settings.bankDetails?.qrCodeIndia || '',
                qrCodeEurope: settings.bankDetails?.qrCodeEurope || '',
                showBankDetails: settings.bankDetails?.showBankDetails !== false
              }
            }))
          }
        }
      } catch (e) {
        console.error("Error loading company settings", e)
      }
    }
    fetchCompanySettings()

    if (isEditMode) {
      const fetchQuotationData = async () => {
        try {
          const data = await getQuotationById(id)
          const quoteToEdit = data.quotation
          if (quoteToEdit) {
            if (quoteToEdit.sections && quoteToEdit.sections.length > 0) {
              const sorted = [...quoteToEdit.sections].sort((a, b) => (a.order || 0) - (b.order || 0))
              setSections(sorted.map((sec, idx) => ({
                tempId: sec._id || sec.tempId || `sec-quote-${idx}-${Date.now()}`,
                ...sec,
                isActive: sec.isActive !== false
              })))
            }

            const sparePartsList = (await getSpareParts().catch(() => ({ spareParts: [] })))?.spareParts || []
            const convertedItems = (quoteToEdit.items || []).map(item => {
              const matchedPart = sparePartsList.find(sp => 
                (sp._id || sp.id || '').toString() === (item.productId || '').toString() ||
                (sp.name && item.productName && sp.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
              )
              return {
                ...item,
                productName: item.productName || item.desc || '',
                productDesc: item.productDesc || '',
                artNo: item.artNo || matchedPart?.artNo || '',
                hsnCode: item.hsnCode || matchedPart?.hsnCode || '',
                image: item.image || item.img || matchedPart?.image || ''
              }
            })

            let loadedGstOption = quoteToEdit.gstOption
            if (!loadedGstOption) {
              if ((quoteToEdit.country || '').toLowerCase().includes('india')) {
                loadedGstOption = (quoteToEdit.gstAmount > 0 || quoteToEdit.gstPercent > 0) ? 'withGst' : 'withoutGst'
              } else {
                loadedGstOption = 'withoutGst'
              }
            }

            setFormData(prev => ({
              ...prev,
              ...quoteToEdit,
              productType: 'Spare Parts',
              gstOption: loadedGstOption,
              currency: quoteToEdit.currency || 'EUR',
              items: convertedItems,
              transportStorage: {
                show: false,
                name: quoteToEdit.transportStorage?.name || '',
                price: quoteToEdit.transportStorage?.price || 0,
                currency: quoteToEdit.transportStorage?.currency || 'EUR',
                gstOption: quoteToEdit.transportStorage?.gstOption || '',
                gstPercent: quoteToEdit.transportStorage?.gstPercent || 0
              },
              installation: {
                show: false,
                name: quoteToEdit.installation?.name || '',
                price: quoteToEdit.installation?.price || 0,
                currency: quoteToEdit.installation?.currency || 'EUR',
                gstOption: quoteToEdit.installation?.gstOption || '',
                gstPercent: quoteToEdit.installation?.gstPercent || 0
              },
              introContent: quoteToEdit.introContent !== undefined ? quoteToEdit.introContent : (companySettings?.introContent || ''),
              showBankDetails: quoteToEdit.showBankDetails !== undefined ? quoteToEdit.showBankDetails : (companySettings?.bankDetails?.showBankDetails !== false),
              bankDetails: {
                bankContentIndia: quoteToEdit.bankDetails?.bankContentIndia || companySettings?.bankDetails?.bankContentIndia || '',
                bankContentEurope: quoteToEdit.bankDetails?.bankContentEurope || companySettings?.bankDetails?.bankContentEurope || '',
                qrCodeIndia: quoteToEdit.bankDetails?.qrCodeIndia || companySettings?.bankDetails?.qrCodeIndia || '',
                qrCodeEurope: quoteToEdit.bankDetails?.qrCodeEurope || companySettings?.bankDetails?.qrCodeEurope || '',
                showBankDetails: quoteToEdit.bankDetails?.showBankDetails !== undefined ? quoteToEdit.bankDetails?.showBankDetails : (companySettings?.bankDetails?.showBankDetails !== false)
              }
            }))
          }
        } catch (e) {
          console.error("Error loading quotation data", e)
        }
      }
      fetchQuotationData()
    } else {
      const today = new Date()
      const validDate = new Date()
      validDate.setMonth(today.getMonth() + 1)
      setFormData(prev => ({
        ...prev,
        validity: validDate.toISOString().split('T')[0]
      }))
    }
  }, [id, isEditMode])

  // Sync sections
  useEffect(() => {
    setFormData(prev => ({ ...prev, sections }))
  }, [sections])

  // Recalculate financial totals
  useEffect(() => {
    const isEUR = formData.currency === 'EUR'
    const isGstEnabled = !isEUR

    const subTotal = formData.items.reduce((sum, item) => sum + (item.qty * parseFloat(item.price || 0)), 0)
    const discountAmount = subTotal * (parseFloat(formData.discountPercent || 0) / 100)
    const taxableAmount = subTotal - discountAmount
    const gstRate = isGstEnabled ? parseFloat(formData.gstPercent || 0) : 0
    const gstAmount = isGstEnabled ? taxableAmount * (gstRate / 100) : 0

    let grandTotal = taxableAmount + gstAmount
    if (formData.roundOff) {
      grandTotal = Math.round(grandTotal)
    }

    setFormData(prev => ({
      ...prev,
      subTotal,
      discountAmount,
      taxableAmount,
      gstAmount,
      grandTotal,
      amountInWords: convertNumberToWords(grandTotal)
    }))
  }, [formData.items, formData.discountPercent, formData.gstPercent, formData.roundOff, formData.currency, formData.country])

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Custom Bank QRCode Upload Handler
  const handleCustomBankChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, [field]: value }
    }))
  }

  const handleBankQrCodeUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        showNotification('error', 'Please upload a valid image file (PNG, JPG, WEBP, SVG)')
        return
      }
      setSelectedQrFile(file)
      const previewUrl = URL.createObjectURL(file)
      setFormData(prev => ({
        ...prev,
        bankDetails: { ...prev.bankDetails, qrCode: previewUrl }
      }))
      showNotification('success', 'Custom QR Code selected!')
    }
  }

  const handleRemoveBankQrCode = () => {
    setSelectedQrFile(null)
    setFormData(prev => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, qrCode: '' }
    }))
  }

  // Quill setup for Modal
  useEffect(() => {
    if (isModalOpen && modalEditorRef.current && !modalQuillRef.current) {
      const container = modalEditorRef.current
      if (container.parentElement) {
        container.parentElement.querySelectorAll('.ql-toolbar').forEach(tb => tb.remove())
      }
      container.innerHTML = ''

      const quill = new Quill(container, {
        theme: 'snow',
        placeholder: 'Enter section content...',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
          ]
        }
      })
      modalQuillRef.current = quill
      quill.root.innerHTML = editingSection ? (editingSection.content || '') : ''
    }
    return () => {
      if (!isModalOpen) {
        modalQuillRef.current = null
      }
    }
  }, [isModalOpen, editingSection])

  // Quill setup for Intro Content
  useEffect(() => {
    if (activeTab === 'intro_content' && introEditorRef.current && !introQuillRef.current) {
      const container = introEditorRef.current
      if (container.parentElement) {
        container.parentElement.querySelectorAll('.ql-toolbar').forEach(tb => tb.remove())
      }
      container.innerHTML = ''

      const quill = new Quill(container, {
        theme: 'snow',
        placeholder: 'Enter introduction text / cover letter for spare parts quotation...',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
          ]
        }
      })
      introQuillRef.current = quill
      const defaultIntro = formData.introContent || companySettings?.firstPageContent || ''
      quill.root.innerHTML = defaultIntro

      quill.on('text-change', () => {
        setFormData(prev => ({ ...prev, introContent: quill.root.innerHTML }))
      })
    }
    return () => {
      if (activeTab !== 'intro_content') {
        introQuillRef.current = null
      }
    }
  }, [activeTab, companySettings])

  const handleQuoteSeqChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '')
    const { prefix, suffix } = parseQuotationNumberParts(formData.quoteNo, 'spares')
    const newQuoteNo = rawDigits ? `${prefix}${rawDigits}${suffix}` : ''

    setFormData(prev => ({
      ...prev,
      quoteNo: newQuoteNo
    }))

    if (!rawDigits) {
      setErrors(prev => ({ ...prev, quoteNo: 'Quotation sequence number is required' }))
    } else {
      const isDup = isQuotationNumberExists(newQuoteNo, allQuotations, isEditMode ? id : null)
      setErrors(prev => ({
        ...prev,
        quoteNo: isDup 
          ? `Quotation number "${newQuoteNo}" already exists. Duplicate quotation numbers are not allowed.` 
          : undefined
      }))
    }
  }

  const handleQuoteSeqBlur = () => {
    const { prefix, seqStr, suffix } = parseQuotationNumberParts(formData.quoteNo, 'spares')
    if (seqStr) {
      const padded = seqStr.padStart(3, '0')
      const newQuoteNo = `${prefix}${padded}${suffix}`
      setFormData(prev => ({ ...prev, quoteNo: newQuoteNo }))
      const isDup = isQuotationNumberExists(newQuoteNo, allQuotations, isEditMode ? id : null)
      setErrors(prev => ({
        ...prev,
        quoteNo: isDup 
          ? `Quotation number "${newQuoteNo}" already exists. Duplicate quotation numbers are not allowed.` 
          : undefined
      }))
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    if (name === 'quoteNo') {
      const isDup = isQuotationNumberExists(value, allQuotations, isEditMode ? id : null)
      setErrors(prev => ({
        ...prev,
        quoteNo: isDup 
          ? `Quotation number "${value.trim()}" already exists. Duplicate quotation numbers are not allowed.` 
          : undefined
      }))
    }

    setFormData(prev => {
      let updated = { ...prev, [name]: type === 'checkbox' ? checked : value }

      if (name === 'country' || name === 'currency') {
        let newCurrency = prev.currency
        if (name === 'country') {
          const valLower = (value || '').toLowerCase()
          if (valLower.includes('europe') || valLower.includes('germany') || valLower.includes('france') || valLower.includes('italy')) {
            newCurrency = 'EUR'
            updated.gstPercent = 0
            if (updated.items && updated.items.length > 0) {
              updated.items = updated.items.map(item => ({ ...item, gstPercent: 0 }))
            }
          } else if (valLower.includes('india')) {
            newCurrency = 'INR'
            const defaultGstRate = parseFloat(companySettings?.gstRate || companySettings?.igstRate) || 18
            updated.gstPercent = defaultGstRate
            if (updated.items && updated.items.length > 0) {
              updated.items = updated.items.map(item => ({ ...item, gstPercent: defaultGstRate }))
            }
          }
        } else if (name === 'currency') {
          newCurrency = value
        }

        const oldCurrency = prev.currency
        if (newCurrency !== oldCurrency) {
          const rate = exchangeRate || 110.31

          // Convert items if present
          if (prev.items && prev.items.length > 0) {
            updated.items = prev.items.map(item => {
              let p = parseFloat(item.price || 0)
              let bp = parseFloat(item.basePrice || 0)
              if (oldCurrency === 'EUR' && newCurrency === 'INR') {
                p = Math.round(p * rate)
                bp = Math.round(bp * rate)
              } else if (oldCurrency === 'INR' && newCurrency === 'EUR') {
                p = parseFloat((p / rate).toFixed(2))
                bp = parseFloat((bp / rate).toFixed(2))
              }
              return { ...item, price: p, basePrice: bp }
            })
          }
          updated.currency = newCurrency

          // Convert active item input in form if present
          if (newItem.productId) {
            const sp = spareParts.find(p => (p._id || p.id || '').toString() === newItem.productId.toString())
            if (sp) {
              const spCurr = sp.currency || 'EUR'
              const converted = convertCurrency(sp.price, spCurr, newCurrency, rate)
              setNewItem(prevItem => ({
                ...prevItem,
                price: converted.toString(),
                basePrice: converted.toString()
              }))
            }
          } else if (newItem.price) {
            const p = parseFloat(newItem.price || 0)
            if (!isNaN(p) && p > 0) {
              const newP = oldCurrency === 'EUR' && newCurrency === 'INR'
                ? Math.round(p * rate)
                : parseFloat((p / rate).toFixed(2))
              setNewItem(prevItem => ({
                ...prevItem,
                price: newP.toString(),
                basePrice: newP.toString()
              }))
            }
          }
        }
      }

      if (name === 'companyName' && value) {
        const found = customers.find(c => c.company && c.company.trim().toLowerCase() === value.trim().toLowerCase())
        if (found) {
          const custCountry = found.country || updated.country || ''
          let custCurrency = updated.currency
          if (custCountry) {
            const valLower = custCountry.toLowerCase()
            if (valLower.includes('europe') || valLower.includes('germany')) {
              custCurrency = 'EUR'
            } else if (valLower.includes('india')) {
              custCurrency = 'INR'
            }
          }

          const oldCurrency = prev.currency
          if (custCurrency !== oldCurrency) {
            const rate = exchangeRate || 110.31
            if (prev.items && prev.items.length > 0) {
              updated.items = prev.items.map(item => {
                let p = parseFloat(item.price || 0)
                let bp = parseFloat(item.basePrice || 0)
                if (oldCurrency === 'EUR' && custCurrency === 'INR') {
                  p = Math.round(p * rate)
                  bp = Math.round(bp * rate)
                } else if (oldCurrency === 'INR' && custCurrency === 'EUR') {
                  p = parseFloat((p / rate).toFixed(2))
                  bp = parseFloat((bp / rate).toFixed(2))
                }
                return { ...item, price: p, basePrice: bp }
              })
            }

            // Convert active item input in form if present
            if (newItem.productId) {
              const sp = spareParts.find(p => (p._id || p.id || '').toString() === newItem.productId.toString())
              if (sp) {
                const spCurr = sp.currency || 'EUR'
                const converted = convertCurrency(sp.price, spCurr, custCurrency, rate)
                setNewItem(prevItem => ({
                  ...prevItem,
                  price: converted.toString(),
                  basePrice: converted.toString()
                }))
              }
            } else if (newItem.price) {
              const p = parseFloat(newItem.price || 0)
              if (!isNaN(p) && p > 0) {
                const newP = oldCurrency === 'EUR' && custCurrency === 'INR'
                  ? Math.round(p * rate)
                  : parseFloat((p / rate).toFixed(2))
                setNewItem(prevItem => ({
                  ...prevItem,
                  price: newP.toString(),
                  basePrice: newP.toString()
                }))
              }
            }
          }

          updated = {
            ...updated,
            customerId: found.id,
            customerName: found.name || updated.customerName,
            customerMobile: found.mobile || updated.customerMobile,
            customerEmail: found.email || updated.customerEmail,
            address: found.address || updated.address,
            gstNumber: found.gst || updated.gstNumber,
            country: custCountry,
            currency: custCurrency
          }
        }
      }
      return updated
    })

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleProductSelect = (e) => {
    const prodId = e.target.value
    if (!prodId) {
      setNewItem({
        productId: '',
        productName: '',
        productDesc: '',
        artNo: '',
        hsnCode: '',
        qty: 1,
        unit: 'Nos',
        basePrice: '',
        price: '',
        gstPercent: '',
        image: ''
      })
      return
    }

    const sp = spareParts.find(p => (p._id || p.id || '').toString() === prodId.toString())
    if (sp) {
      const rawPrice = parseFloat(sp.price || 0)
      const spCurr = sp.currency || 'EUR'
      let unitPrice = rawPrice
      if (spCurr === 'EUR' && formData.currency === 'INR') {
        unitPrice = Math.round(rawPrice * exchangeRate)
      } else if (spCurr === 'INR' && formData.currency === 'EUR') {
        unitPrice = parseFloat((rawPrice / exchangeRate).toFixed(2))
      }

      setNewItem({
        productId: sp._id || sp.id,
        productName: sp.name || '',
        productDesc: sp.description || "",
        artNo: sp.artNo || '',
        hsnCode: sp.hsnCode || '',
        qty: 1,
        unit: 'Nos',
        basePrice: unitPrice.toString(),
        price: unitPrice.toString(),
        gstPercent: sp.gstPercent || '',
        image: sp.image || ''
      })
    }
  }

  const handleAddItem = () => {
    if (!newItem.productName.trim()) {
      showNotification('error', 'Spare Part Name is required')
      return
    }
    const unitPrice = parseFloat(newItem.price || 0)
    if (isNaN(unitPrice) || unitPrice <= 0) {
      showNotification('error', 'Please enter a valid unit price')
      return
    }

    const itemToAdd = {
      ...newItem,
      id: `sp-item-${Date.now()}`,
      qty: Number(newItem.qty) || 1,
      price: unitPrice,
      desc: newItem.productDesc ? `${newItem.productName}\n${newItem.productDesc}` : newItem.productName
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, itemToAdd]
    }))

    setNewItem({
      productId: '',
      productName: '',
      productDesc: '',
      artNo: '',
      hsnCode: '',
      qty: 1,
      unit: 'Nos',
      basePrice: '',
      price: '',
      gstPercent: '',
      image: ''
    })
    showNotification('success', 'Spare part item added to quotation!')
  }

  const fmtAmt = (n) => {
    if (formData.roundOff) {
      return Math.round(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }
    return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handleIncreaseQty = (index) => {
    setFormData(prev => {
      const updated = [...prev.items]
      updated[index] = { ...updated[index], qty: (Number(updated[index].qty) || 1) + 1 }
      return { ...prev, items: updated }
    })
  }

  const handleDecreaseQty = (index) => {
    setFormData(prev => {
      const updated = [...prev.items]
      const currentQty = Number(updated[index].qty) || 1
      if (currentQty > 1) {
        updated[index] = { ...updated[index], qty: currentQty - 1 }
      }
      return { ...prev, items: updated }
    })
  }

  const handleEditTableItem = (index) => {
    const itemToEdit = formData.items[index]
    if (!itemToEdit) return
    setNewItem({
      productId: itemToEdit.productId || '',
      productName: itemToEdit.productName || itemToEdit.desc || '',
      productDesc: itemToEdit.productDesc || '',
      artNo: itemToEdit.artNo || '',
      hsnCode: itemToEdit.hsnCode || '',
      qty: itemToEdit.qty || 1,
      unit: itemToEdit.unit || 'Nos',
      basePrice: itemToEdit.price ? itemToEdit.price.toString() : '',
      price: itemToEdit.price ? itemToEdit.price.toString() : '',
      gstPercent: itemToEdit.gstPercent || '',
      image: itemToEdit.image || ''
    })
    handleRemoveItem(index)
    showNotification('info', 'Item loaded into top panel for editing.')
  }

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }))
  }

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.items]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, items: updated }
    })
  }

  const handleMoveSectionUp = (index) => {
    if (index === 0) return
    setSections(prev => {
      const updated = [...prev]
      const temp = updated[index]
      updated[index] = updated[index - 1]
      updated[index - 1] = temp
      return updated.map((sec, idx) => ({ ...sec, order: idx }))
    })
  }

  const handleMoveSectionDown = (index) => {
    if (index === sections.length - 1) return
    setSections(prev => {
      const updated = [...prev]
      const temp = updated[index]
      updated[index] = updated[index + 1]
      updated[index + 1] = temp
      return updated.map((sec, idx) => ({ ...sec, order: idx }))
    })
  }

  const handleToggleSectionActive = (targetId, secondArg) => {
    setSections(prev => prev.map(sec => {
      const secId = sec._id || sec.tempId
      const isMatch = (secId && (secId === targetId || secId === secondArg)) || sec.title === targetId
      return isMatch ? { ...sec, isActive: !sec.isActive } : sec
    }))
  }

  const handleConfirmDeleteSection = () => {
    if (!deleteConfirmSection) return
    const deleteTargetId = deleteConfirmSection.tempId || deleteConfirmSection._id
    setSections(prev => prev.filter(sec =>
      sec !== deleteConfirmSection &&
      (sec._id !== deleteTargetId && sec.tempId !== deleteTargetId)
    ))
    setDeleteConfirmSection(null)
    showNotification('success', 'Section deleted successfully!')
  }

  const validateTab = (tab) => {
    const errs = {}
    if (tab === 'customer') {
      if (!formData.quoteNo?.trim()) {
        errs.quoteNo = 'Quotation number is required'
      } else if (isQuotationNumberExists(formData.quoteNo, allQuotations, isEditMode ? id : null)) {
        errs.quoteNo = `Quotation number "${formData.quoteNo.trim()}" already exists. Duplicate quotation numbers are not allowed.`
      }
      if (!formData.companyName.trim()) errs.companyName = 'Company name is required'
      if (!formData.customerName.trim()) errs.customerName = 'Customer contact name is required'
    } else if (tab === 'products') {
      if (formData.items.length === 0) {
        showNotification('error', 'Please add at least one spare part item')
        return false
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const checkQuotationExistsAndGetVersions = (quoteNo) => {
    if (!quoteNo) return { exists: false, matchingQuotes: [] }
    const matching = allQuotations.filter(q => q && q.quoteNo && q.quoteNo.trim().toLowerCase() === quoteNo.trim().toLowerCase())
    if (matching.length === 0) return { exists: false, matchingQuotes: [] }

    let maxNum = 1
    matching.forEach(q => {
      const num = typeof q.version === 'number' ? q.version : (parseInt(String(q.version).replace(/\D/g, '')) || 1)
      if (num > maxNum) maxNum = num
    })

    return {
      exists: true,
      matchingQuotes: matching,
      highestVersionNum: maxNum,
      highestVersionStr: `V${maxNum}`
    }
  }

  const handleTabChange = (nextTab) => {
    if (activeTab === 'customer' && nextTab !== 'customer') {
      if (!validateTab('customer')) return
    }
    if (nextTab === 'section' || nextTab === 'intro_content' || nextTab === 'preview') {
      if (!validateTab('products')) return
    }

    if (nextTab === 'preview') {
      if (isQuotationNumberExists(formData.quoteNo, allQuotations, isEditMode ? id : null)) {
        showNotification('error', `Quotation number "${formData.quoteNo.trim()}" already exists. Duplicate quotation numbers are not allowed.`)
        setActiveTab('customer')
        setErrors(prev => ({
          ...prev,
          quoteNo: `Quotation number "${formData.quoteNo.trim()}" already exists. Duplicate quotation numbers are not allowed.`
        }))
        return
      }
      setFormData(prev => ({ ...prev, version: isEditMode ? (Number(prev.version) || 1) : 1 }))
      setActiveTab('preview')
      scrollToTop()
    } else {
      setActiveTab(nextTab)
      scrollToTop()
    }
  }

  const handleSaveQuotation = async () => {
    if (!validateTab('customer') || !validateTab('products')) return
    if (isQuotationNumberExists(formData.quoteNo, allQuotations, isEditMode ? id : null)) {
      showNotification('error', `Quotation number "${formData.quoteNo.trim()}" already exists. Duplicate quotation numbers are not allowed.`)
      setActiveTab('customer')
      setErrors(prev => ({
        ...prev,
        quoteNo: `Quotation number "${formData.quoteNo.trim()}" already exists. Duplicate quotation numbers are not allowed.`
      }))
      return
    }

    setIsSavingAndDownloading(true)
    try {
      const isEuropeBank = formData.country === 'Europe' || formData.currency === 'EUR'
      const bankDetailsPayload = {
        showBankDetails: formData.showBankDetails !== false,
        bankContentIndia: isEuropeBank ? '' : (formData.bankDetails?.bankContentIndia || companySettings?.bankDetails?.bankContentIndia || ''),
        qrCodeIndia: isEuropeBank ? '' : (formData.bankDetails?.qrCodeIndia || companySettings?.bankDetails?.qrCodeIndia || ''),
        bankContentEurope: isEuropeBank ? (formData.bankDetails?.bankContentEurope || companySettings?.bankDetails?.bankContentEurope || '') : '',
        qrCodeEurope: isEuropeBank ? (formData.bankDetails?.qrCodeEurope || companySettings?.bankDetails?.qrCodeEurope || '') : ''
      }

      const payload = {
        ...formData,
        bankDetails: bankDetailsPayload,
        productType: 'Spare Parts',
        gstOption: formData.gstOption || ((formData.country || '').toLowerCase().includes('india') ? 'withGst' : 'withoutGst'),
        transportStorage: {
          show: false,
          name: formData.transportStorage?.name || '',
          price: formData.transportStorage?.price || 0,
          currency: formData.transportStorage?.currency || 'EUR',
          gstOption: formData.transportStorage?.gstOption || '',
          gstPercent: formData.transportStorage?.gstPercent || 0
        },
        installation: {
          show: false,
          name: formData.installation?.name || '',
          price: formData.installation?.price || 0,
          currency: formData.installation?.currency || 'EUR',
          gstOption: formData.installation?.gstOption || '',
          gstPercent: formData.installation?.gstPercent || 0
        },
        sections: sections.filter(s => s.isActive !== false)
      }

      delete payload._id
      delete payload.id

      let successMsg = 'Spare Parts Quotation saved successfully!'
      if (isEditMode && !saveAsNewVersion) {
        await updateQuotation(id, payload)
        successMsg = 'Spare Parts Quotation updated successfully!'
      } else {
        await createQuotation(payload)
      }

      if (previewRef.current) {
        try {
          const filename = `${getSafeQuotationFilename('SpareParts-Quotation', formData.quoteNo)}.pdf`
          const html = previewRef.current.outerHTML
          await downloadPDF(html, filename)
        } catch (pdfErr) {
          console.error("PDF generation failed during save:", pdfErr)
        }
      }

      navigate('/quotations', { state: { message: successMsg, type: 'success' } })
    } catch (err) {
      console.error("Save error:", err)
      showNotification('error', 'Failed to save quotation. Please try again.')
      setIsSavingAndDownloading(false)
    }
  }

  const handleDownloadPDF = async () => {
    const filename = getSafeQuotationFilename('SpareParts-Quotation', formData.quoteNo)
    const element = previewRef.current
    if (!element) return

    setIsSavingAndDownloading(true)
    try {
      const html = element.outerHTML
      await downloadPDF(html, `${filename}.pdf`)
      showNotification('success', 'PDF downloaded successfully!')
    } catch (err) {
      console.error("PDF generation failed:", err)
      showNotification('error', 'Failed to generate PDF')
    } finally {
      setIsSavingAndDownloading(false)
    }
  }

  const currSymbol = formData.currency === 'EUR' ? '€' : '₹'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-start items-start sm:items-center gap-4 bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotations')}
            className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-brand-primary">
                {isEditMode ? 'Edit Spare Parts Quotation' : 'Generate Spare Parts Quotation'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Spare Parts
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Configure client details, subject line, spare parts items, terms, and compile live preview.</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 border text-sm flex items-center gap-3 rounded-[5px] animate-in fade-in slide-in-from-top-2 duration-200
          ${notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-rose-50 border-rose-100 text-rose-700'}`}
        >
          {notification.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <div>
            <span className="font-bold">{notification.type === 'success' ? 'Success! ' : ''}</span>
            {notification.message}
          </div>
        </div>
      )}

      {/* Tab Navigation Workspace */}
      <div className="flex flex-col md:flex-row border-b border-slate-200 bg-white px-4 sm:px-6 py-3 border border-slate-100 rounded-[5px] shadow-sm gap-2">
        <button
          onClick={() => handleTabChange('customer')}
          className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer text-left md:text-center
            ${activeTab === 'customer'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          1. Customer
        </button>
        <button
          onClick={() => handleTabChange('products')}
          className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer text-left md:text-center
            ${activeTab === 'products'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          2. Spare Parts Items
        </button>
        <button
          onClick={() => handleTabChange('section')}
          className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer text-left md:text-center
            ${activeTab === 'section'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          3. Sections
        </button>
        <button
          onClick={() => handleTabChange('intro_content')}
          className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer text-left md:text-center
            ${activeTab === 'intro_content'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          4. Intro Content
        </button>
        <button
          onClick={() => handleTabChange('preview')}
          className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-between md:justify-center gap-1.5
            ${activeTab === 'preview'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-slate-500 hover:text-brand-accent hover:bg-brand-accent-light'}`}
        >
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            <span>5. Preview</span>
          </span>
        </button>
      </div>

      {/* Tab Contents Workspace */}
      <div className="space-y-3.5 mt-2.5">

        {/* TAB 1: CUSTOMER DETAILS */}
        <div className={activeTab === 'customer' ? 'bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-6' : 'hidden'}>
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
            Quotation Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Quotation Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Quotation Number <span className="text-rose-500">*</span>
              </label>
              <div className={`flex items-stretch border rounded-[5px] bg-white transition-all overflow-hidden focus-within:ring-1 focus-within:ring-brand-accent focus-within:border-brand-accent ${
                errors.quoteNo ? 'border-rose-350 bg-rose-50/10 ring-1 ring-rose-350' : 'border-slate-200'
              }`}>
                <span className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-semibold font-mono text-slate-600 bg-slate-100 border-r border-slate-200 select-none cursor-not-allowed whitespace-nowrap">
                  {parseQuotationNumberParts(formData.quoteNo, 'spares').prefix}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={parseQuotationNumberParts(formData.quoteNo, 'spares').seqStr}
                  onChange={handleQuoteSeqChange}
                  onBlur={handleQuoteSeqBlur}
                  placeholder="065"
                  className="flex-1 min-w-0 px-3 py-2 text-sm font-bold font-mono text-slate-800 text-center focus:outline-none bg-white placeholder:text-slate-300"
                />
                <span className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-semibold font-mono text-slate-600 bg-slate-100 border-l border-slate-200 select-none cursor-not-allowed whitespace-nowrap">
                  {parseQuotationNumberParts(formData.quoteNo, 'spares').suffix}
                </span>
              </div>
              {errors.quoteNo && <p className="text-[11px] text-rose-600 font-semibold">{errors.quoteNo}</p>}
            </div>

            {/* Quotation Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Quotation Date
              </label>
              <input
                type="date"
                name="date"
                value={formatDateForInput(formData.date)}
                onChange={handleInputChange}
                onClick={(e) => e.target.showPicker()}
                className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Organization Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  list="companyList"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="Enter company name..."
                  className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all ${errors.companyName ? 'border-rose-350 bg-rose-50/10' : 'border-slate-200 bg-white text-slate-800'
                    }`}
                />
                <datalist id="companyList">
                  {customers.map((c, idx) => <option key={c.id || idx} value={c.company} />)}
                </datalist>
                {errors.companyName && <p className="text-[11px] text-rose-600 font-semibold">{errors.companyName}</p>}
              </div>

              {/* Contact Person */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Contact Person <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Enter Contact Person"
                  className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all ${errors.customerName ? 'border-rose-350 bg-rose-50/10' : 'border-slate-200 bg-white text-slate-800'
                    }`}
                />
                {errors.customerName && <p className="text-[11px] text-rose-600 font-semibold">{errors.customerName}</p>}
              </div>

              {/* Country & Currency in the same row */}
              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Country */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="country"
                    value={formData.country || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white text-slate-800 ${errors.country ? 'border-rose-350 bg-rose-50/10' : 'border-slate-200'
                      }`}
                  >
                    <option value="">-- Select Country --</option>
                    <option value="Europe">Europe</option>
                    <option value="India">India</option>
                  </select>
                  {errors.country && <p className="text-[11px] text-rose-600 font-semibold">{errors.country}</p>}
                </div>

                {/* Currency */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Currency <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="currency"
                    value={formData.currency || 'EUR'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white font-semibold text-slate-800"
                  >
                    <option value="EUR">EUR (€) - Euro (Default)</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                  </select>
                </div>
              </div>

              {/* GST Number - Only for India */}
              {(formData.country || '').toLowerCase().includes('india') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Client GST Number (15 Digits)
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {(formData.gstNumber || '').length}/15
                    </span>
                  </div>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber || ''}
                    maxLength={15}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15)
                      handleInputChange({
                        target: {
                          name: 'gstNumber',
                          value: cleanVal
                        }
                      })
                    }}
                    placeholder="e.g. 33AABCA1234A1Z5"
                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white text-slate-800 uppercase font-bold tracking-wider placeholder:font-normal placeholder:tracking-normal"
                  />
                  <p className="text-[11px] text-slate-400">
                    GST is calculated only after entering the client GST number.
                  </p>
                </div>
              )}

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="customerMobile"
                  value={formData.customerMobile}
                  onChange={handleInputChange}
                  placeholder="Enter phone..."
                  className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all ${errors.customerMobile ? 'border-rose-350 bg-rose-50/10' : 'border-slate-200 bg-white text-slate-800'
                    }`}
                />
                {errors.customerMobile && <p className="text-[11px] text-rose-600 font-semibold">{errors.customerMobile}</p>}
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  placeholder="Enter email..."
                  className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all ${errors.customerEmail ? 'border-rose-350 bg-rose-50/10' : 'border-slate-200 bg-white text-slate-800'
                    }`}
                />
                {errors.customerEmail && <p className="text-[11px] text-rose-600 font-semibold">{errors.customerEmail}</p>}
              </div>

              {/* Full Address */}
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Full Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter full address details..."
                  className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all ${errors.address ? 'border-rose-355 bg-rose-50/10' : 'border-slate-200 bg-white text-slate-800'
                    }`}
                />
                {errors.address && <p className="text-[11px] text-rose-600 font-semibold">{errors.address}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleTabChange('products')}
              className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold rounded-[5px] transition-colors cursor-pointer"
            >
              Continue to Spare Parts Items →
            </button>
          </div>
        </div>

        {/* TAB 2: SPARE PARTS ITEMS */}
        <div className={activeTab === 'products' ? 'space-y-3.5' : 'hidden'}>
          {/* Card 1: Add Spare Part Item */}
          <div className="bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-800">
                Add Spare Part Items
              </h2>
             
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Select from Spare Parts Directory
                </label>
                <select
                  onChange={handleProductSelect}
                  value={newItem.productId}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800"
                >
                  <option value="">-- Select Spare Part --</option>
                  {spareParts.map(sp => {
                    const spCurr = sp.currency || 'EUR'
                    const convertedPrice = convertCurrency(sp.price, spCurr, formData.currency, exchangeRate)
                    return (
                      <option key={sp._id || sp.id} value={sp._id || sp.id}>
                        {sp.name} {sp.artNo ? `(Art: ${sp.artNo})` : ''} - {currSymbol}{convertedPrice ? convertedPrice.toLocaleString() : '0'}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Spare Part Name *
                </label>
                <input
                  type="text"
                  value={newItem.productName}
                  onChange={e => setNewItem(prev => ({ ...prev, productName: e.target.value }))}
                  placeholder="Item title..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Article Number (ART NO)
                </label>
                <input
                  type="text"
                  value={newItem.artNo}
                  onChange={e => setNewItem(prev => ({ ...prev, artNo: e.target.value }))}
                  placeholder="Article Number..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  HSN Code
                </label>
                <input
                  type="text"
                  value={newItem.hsnCode}
                  onChange={e => setNewItem(prev => ({ ...prev, hsnCode: e.target.value }))}
                  placeholder="HSN Code..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Unit Price ({currSymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={e => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Description / Details
              </label>
              <textarea
                rows={2}
                value={newItem.productDesc}
                onChange={e => setNewItem(prev => ({ ...prev, productDesc: e.target.value }))}
                placeholder="Item notes or specification breakdown..."
                className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white font-semibold text-xs rounded-[5px] transition-all shadow-md active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Submit</span>
              </button>
            </div>
          </div>

          {/* Card 2: Added Products List Table Section */}
          <div className="bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-primary" />
                <span>ADDED PRODUCTS LIST ({formData.items.length})</span>
              </h3>
            </div>

            <div className="border border-slate-200 rounded-[5px] overflow-auto max-h-[420px] bg-white shadow-xs">
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-100/80 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-500 text-xs">
                    <th className="px-6 py-3.5 w-16 text-center">S.NO</th>
                    <th className="px-6 py-3.5">DESCRIPTION</th>
                    <th className="px-6 py-3.5 w-32 text-center">QTY</th>
                    <th className="px-6 py-3.5 w-24 text-center">UNIT</th>
                    <th className="px-6 py-3.5 w-36 text-right">RATE ({currSymbol})</th>
                    <th className="px-6 py-3.5 w-40 text-right">AMOUNT ({currSymbol})</th>
                    <th className="px-6 py-3.5 w-24 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {formData.items.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 font-medium text-xs">
                        No spare part items added yet. Choose a component above to populate the quotation table.
                      </td>
                    </tr>
                  ) : (
                    formData.items.map((item, index) => {
                      const itemTotal = item.qty * parseFloat(item.price || 0)

                      return (
                        <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors">
                          {/* S.NO */}
                          <td className="px-6 py-4 text-center font-bold text-slate-500 text-sm">
                            {index + 1}
                          </td>

                          {/* DESCRIPTION */}
                          <td className="px-6 py-4 text-xs">
                            <div className="flex items-center gap-3">
                              {item.image && (
                                <div className="w-12 h-12 rounded border border-slate-200 overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center p-1">
                                  <img
                                    src={getImageUrl(item.image)}
                                    alt={item.productName}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-sm">{item.productName}</span>
                                {item.productDesc && (
                                  <span className="text-xs text-slate-500 font-normal mt-0.5 whitespace-pre-line leading-relaxed">
                                    {item.productDesc}
                                  </span>
                                )}
                                {item.artNo && (
                                  <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    Art No: {item.artNo}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* QTY */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDecreaseQty(index)}
                                disabled={item.qty <= 1}
                                className="w-6 h-6 flex items-center justify-center border border-slate-200 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="font-bold text-slate-800 text-sm w-7 text-center select-none">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleIncreaseQty(index)}
                                className="w-6 h-6 flex items-center justify-center border border-slate-200 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* UNIT */}
                          <td className="px-6 py-4 text-center text-slate-600 font-medium text-sm">
                            {item.unit || 'Nos'}
                          </td>

                          {/* RATE */}
                          <td className="px-6 py-4 text-right font-bold text-slate-800 text-sm">
                            {currSymbol}{fmtAmt(parseFloat(item.price || 0))}
                          </td>

                          {/* AMOUNT */}
                          <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-sm">
                            {currSymbol}{fmtAmt(itemTotal)}
                          </td>

                          {/* ACTION */}
                          <td className="px-6 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditTableItem(index)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-brand-primary transition-colors cursor-pointer"
                                title="Edit item options & specs"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Financial Summary & Pricing Calculation Section */}
          <div className="bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-brand-accent" />
                <span>Financial Summary & Pricing Calculation</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Amount in words */}
              <div className="md:col-span-7 space-y-3">
                <div className="space-y-1.5 p-4 bg-slate-50 border border-slate-100 rounded-[5px]">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span>Amount in Words (Auto-generated)</span>
                  </span>
                  <p className="font-bold text-brand-primary italic text-xs leading-relaxed mt-1">
                    {formData.amountInWords || 'Zero Only'}
                  </p>
                </div>

                {/* Value Rounding Option */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-[5px] space-y-2">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Value Rounding Option
                  </span>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="radio"
                        name="roundOff"
                        checked={!formData.roundOff}
                        onChange={() => setFormData(prev => ({ ...prev, roundOff: false }))}
                        className="text-brand-accent focus:ring-brand-accent cursor-pointer"
                      />
                      <span>Point Value (with 2 decimal places)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="radio"
                        name="roundOff"
                        checked={formData.roundOff}
                        onChange={() => setFormData(prev => ({ ...prev, roundOff: true }))}
                        className="text-brand-accent focus:ring-brand-accent cursor-pointer"
                      />
                      <span>Round Value (no decimal places)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Math Summary */}
              <div className="md:col-span-5 space-y-3.5 p-4 bg-slate-50 border border-slate-200 rounded-[5px] text-sm text-slate-700 font-medium">
                {/* Sub Total */}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Sub Total:</span>
                  <span className="font-bold">{currSymbol}{fmtAmt(formData.subTotal)}</span>
                </div>

                {/* Discount */}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <span>Discount (%) :</span>
                    <input
                      type="number"
                      max="100"
                      name="discountPercent"
                      value={formData.discountPercent !== undefined && formData.discountPercent !== null ? formData.discountPercent : ''}
                      onChange={handleInputChange}
                      className="w-16 px-2.5 py-1 border border-slate-200 rounded-[5px] text-center text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all"
                    />
                  </span>
                  <span className="text-emerald-600 font-bold">- {currSymbol}{fmtAmt(formData.discountAmount)}</span>
                </div>

                {/* Taxable Amount */}
                <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-2">
                  <span className="text-slate-500">Taxable Amount:</span>
                  <span className="font-bold text-slate-800">{currSymbol}{fmtAmt(formData.taxableAmount)}</span>
                </div>

                {/* GST (%) - Applicable for INR */}
                {formData.currency !== 'EUR' && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <span>GST (%) :</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        name="gstPercent"
                        value={formData.gstPercent !== undefined && formData.gstPercent !== null ? formData.gstPercent : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0)
                          setFormData(prev => ({
                            ...prev,
                            gstPercent: val,
                            items: prev.items.map(item => ({
                              ...item,
                              gstPercent: val
                            }))
                          }))
                        }}
                        className="w-16 px-2.5 py-1 border border-slate-200 rounded-[5px] text-center text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all"
                      />
                    </span>
                    <span className="font-bold text-slate-800">{currSymbol}{fmtAmt(formData.gstAmount || 0)}</span>
                  </div>
                )}

                {/* Grand Total */}
                <div className="flex justify-between items-center text-brand-primary border-t border-slate-300 pt-2.5 text-base font-extrabold">
                  <span>GRAND TOTAL:</span>
                  <span>{currSymbol}{fmtAmt(formData.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('customer')}
              className="px-5 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Customer
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('section')}
              className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold rounded-[5px] transition-colors cursor-pointer"
            >
              Continue to Sections
            </button>
          </div>
        </div>

        {/* TAB 3: CUSTOM SECTIONS & BANK DETAILS */}
        <div
          className={
            activeTab === 'section'
              ? 'bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-6'
              : 'hidden'
          }
        >
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
            Bank Details & Sections
          </h2>

          {/* Panel 1: QUOTATION PRINT SETTINGS */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-[5px] flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-brand-accent" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Quotation Print Settings
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">
                  Show Bank Details in Quotation:
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      showBankDetails: prev.showBankDetails === false
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.showBankDetails !== false
                      ? 'bg-brand-accent'
                      : 'bg-slate-200'
                    } cursor-pointer`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.showBankDetails !== false
                        ? 'translate-x-5'
                        : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Panel 2: ACTIVE BANK DETAILS FOR THIS QUOTATION */}
          {formData.showBankDetails !== false && (
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-[5px] space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-brand-accent" />
                  <span>Active Bank Details for Quotation</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-[5px] text-[11px] font-bold bg-brand-primary text-white">
                  {(formData.country === 'Europe' || formData.currency === 'EUR') ? 'Europe (EUR) Bank' : 'India (INR) Bank'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-4 pt-1">
                {(formData.country === 'Europe' || formData.currency === 'EUR') ? (
                  <>
                    {(formData.bankDetails?.qrCodeEurope || companySettings?.bankDetails?.qrCodeEurope) && (
                      <div className="border border-slate-200 bg-white p-2 rounded-[5px] flex flex-col items-center shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 mb-1">Europe QR Code</span>
                        <img
                          src={getImageUrl(formData.bankDetails?.qrCodeEurope || companySettings?.bankDetails?.qrCodeEurope)}
                          alt="Europe Bank QR"
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                    )}
                    <div className="bg-white p-3 border border-slate-200 rounded-[5px] w-full text-xs text-slate-800 space-y-1">
                      <div
                        className="prose prose-sm max-w-none text-slate-800 text-xs"
                        dangerouslySetInnerHTML={{ __html: formData.bankDetails?.bankContentEurope || companySettings?.bankDetails?.bankContentEurope || '<p class="text-slate-400">No Europe bank details configured in Settings.</p>' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {(formData.bankDetails?.qrCodeIndia || companySettings?.bankDetails?.qrCodeIndia) && (
                      <div className="border border-slate-200 bg-white p-2 rounded-[5px] flex flex-col items-center shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 mb-1">India QR Code</span>
                        <img
                          src={getImageUrl(formData.bankDetails?.qrCodeIndia || companySettings?.bankDetails?.qrCodeIndia)}
                          alt="India Bank QR"
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                    )}
                    <div className="bg-white p-3 border border-slate-200 rounded-[5px] w-full text-xs text-slate-800 space-y-1">
                      <div
                        className="prose prose-sm max-w-none text-slate-800 text-xs"
                        dangerouslySetInnerHTML={{ __html: formData.bankDetails?.bankContentIndia || companySettings?.bankDetails?.bankContentIndia || '<p class="text-slate-400">No India bank details configured in Settings.</p>' }}
                      />
                    </div>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Note: Bank details are automatically selected based on the selected Customer Country (or Currency). You can update default bank details in <strong>Settings</strong>.
              </p>
            </div>
          )}

          {/* Panel 3: CUSTOM SECTIONS FOR THIS QUOTATION */}
          <div className="bg-white border border-slate-200 rounded-[5px] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-accent" />
                <span>Custom Sections for this Quotation</span>
              </h3>

              <button
                type="button"
                onClick={() => {
                  setEditingSection(null);
                  setSectionTitle('');
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary text-white text-[11px] font-bold rounded-[5px] transition-all hover:bg-brand-primary-light active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="px-5 py-3">Section Title</th>
                    <th className="px-5 py-3 w-32 text-center">Include</th>
                    <th className="px-5 py-3 w-40 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {sections.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-8 text-center text-slate-400 font-medium"
                      >
                        No sections added yet. Click "Add Section" to create one.
                      </td>
                    </tr>
                  ) : (
                    sections.map((sec, idx) => (
                      <tr
                        key={sec._id || sec.tempId || idx}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-semibold text-slate-800">
                          {sec.title}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleSectionActive(sec._id, sec.tempId)
                            }
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-all uppercase tracking-wide cursor-pointer ${sec.isActive !== false
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                          >
                            {sec.isActive !== false ? 'Yes' : 'No'}
                          </button>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleMoveSectionUp(idx)}
                              disabled={idx === 0}
                              className={`p-1.5 hover:bg-slate-100 rounded-[5px] transition-colors border border-transparent hover:border-slate-200 ${idx === 0
                                  ? 'text-slate-200 cursor-not-allowed'
                                  : 'text-slate-500 hover:text-brand-primary cursor-pointer'
                                }`}
                              title="Move Up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMoveSectionDown(idx)}
                              disabled={idx === sections.length - 1}
                              className={`p-1.5 hover:bg-slate-100 rounded-[5px] transition-colors border border-transparent hover:border-slate-200 ${idx === sections.length - 1
                                  ? 'text-slate-200 cursor-not-allowed'
                                  : 'text-slate-500 hover:text-brand-primary cursor-pointer'
                                }`}
                              title="Move Down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingSection(sec);
                                setSectionTitle(sec.title);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-primary rounded-[5px] transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                              title="Edit Section"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteConfirmSection(sec)}
                              className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-[5px] transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                              title="Delete Section"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="px-5 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
            >
              ← Back to Spare Parts Items
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('intro_content')}
              className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold rounded-[5px] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Continue to Intro Content</span>
              <span>→</span>
            </button>
          </div>
        </div>


        {/* TAB 4: INTRO CONTENT */}
        <div className={activeTab === 'intro_content' ? 'bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-6' : 'hidden'}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 text-left">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-primary" />
                <span>Introduction Content / Cover Letter</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Customize the introductory greeting text that appears at the top/beginning of this spare parts quotation sheet.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-left">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Introductory Text Content
                </label>
                {companySettings?.firstPageContent && (
                  <button
                    type="button"
                    onClick={() => {
                      const resetText = companySettings.firstPageContent
                      setFormData(prev => ({ ...prev, introContent: resetText }))
                      if (introQuillRef.current) {
                        introQuillRef.current.root.innerHTML = resetText
                      }
                    }}
                    className="text-xs font-semibold text-brand-accent hover:underline cursor-pointer"
                  >
                    Reset to Default Settings Intro
                  </button>
                )}
              </div>
              <div className="bg-white rounded-[5px]">
                <div ref={introEditorRef} className="min-h-[220px]" />
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => handleTabChange('section')}
              className="px-5 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Sections
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('preview')}
              className="px-6 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-semibold rounded-[5px] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4" />
              <span>Continue to Preview</span>
            </button>
          </div>
        </div>

        {/* TAB 5: PREVIEW */}
        <div className={activeTab === 'preview' ? 'bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-6' : 'hidden'}>
          {/* Dynamic Preview Workspace */}
          <div className="flex justify-center bg-slate-100 p-6 md:p-8 rounded-[5px] border border-slate-200 overflow-x-auto">
            <SparePartsTemplate
              ref={previewRef}
              formData={formData}
              companySettings={companySettings}
              exchangeRate={exchangeRate}
              getImageUrl={getImageUrl}
            />
          </div>

          {/* Back & Save Buttons */}
          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('intro_content')}
              className="px-5 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Intro Content
            </button>

            <button
              type="button"
              onClick={handleSaveQuotation}
              disabled={isSavingAndDownloading}
              className="flex items-center gap-2 px-6 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold rounded-[5px] shadow transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{isSavingAndDownloading ? 'Saving...' : 'Save & Download'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Section Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 w-full h-full min-h-screen">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-[5px] overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                {editingSection ? 'Edit Section Content' : 'Add Custom Section'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Section Title *</label>
                <input
                  type="text"
                  value={sectionTitle}
                  onChange={e => setSectionTitle(e.target.value)}
                  placeholder="e.g. Terms & Conditions"
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Section Content</label>
                <div ref={modalEditorRef} className="min-h-[160px] bg-white border border-slate-200 rounded-[5px]" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-[5px] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!sectionTitle.trim()) return
                  const content = modalQuillRef.current ? modalQuillRef.current.root.innerHTML : ''
                  if (editingSection) {
                    setSections(prev => prev.map(s => s === editingSection ? { ...s, title: sectionTitle, content } : s))
                  } else {
                    setSections(prev => [...prev, { tempId: `sec-${Date.now()}`, title: sectionTitle, content, isActive: true }])
                  }
                  setIsModalOpen(false)
                }}
                className="px-5 py-2 bg-brand-primary text-white text-xs font-semibold rounded-[5px] hover:bg-brand-primary-light cursor-pointer"
              >
                Save Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 w-full h-full min-h-screen">
          <div className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-[5px] overflow-hidden p-6 space-y-6 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-800">Quotation Version Detection</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Quotation number <span className="font-semibold text-slate-600">&quot;{formData.quoteNo}&quot;</span> already exists ({versionOptions.highestVersionStr}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setSaveAsNewVersion(false)
                  setShowVersionModal(false)
                  setActiveTab('preview')
                }}
                className="w-full text-left p-4 border border-slate-100 hover:border-brand-accent hover:bg-brand-accent-light/10 rounded-[5px] transition-all duration-200 group cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-800 group-hover:text-brand-accent">
                    Overwrite Version ({versionOptions.highestVersionStr})
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Update existing quotation document directly.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSaveAsNewVersion(true)
                  setFormData(prev => ({ ...prev, version: (versionOptions.highestVersionNum || 1) + 1 }))
                  setShowVersionModal(false)
                  setActiveTab('preview')
                }}
                className="w-full text-left p-4 border border-slate-100 hover:border-brand-accent hover:bg-brand-accent-light/10 rounded-[5px] transition-all duration-200 group cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-800 group-hover:text-brand-accent">
                    Create New Version (V{(versionOptions.highestVersionNum || 1) + 1})
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Increments version number to V{(versionOptions.highestVersionNum || 1) + 1} and saves as new document.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for Save & Download */}
      {isSavingAndDownloading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 w-full h-full min-h-screen">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
            {/* Elegant modern spinner */}
            <div className="relative w-16 h-16 animate-in duration-1000">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-brand-accent border-t-transparent animate-spin"></div>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Saving &amp; Downloading</h3>
              <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
                Saving quotation details and compiling your high-quality PDF. Please do not close this window.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Section Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmSection !== null}
        title="Delete Custom Section"
        message={
          <>
            Are you sure you want to delete section <span className="font-bold text-slate-800">&quot;{deleteConfirmSection?.title}&quot;</span>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete Section"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDeleteSection}
        onCancel={() => setDeleteConfirmSection(null)}
        type="danger"
      />
    </div>
  )
}
