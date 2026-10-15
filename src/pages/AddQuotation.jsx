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
  Landmark,
  Upload,
  Edit,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Package,
  Calculator
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { useAuth } from '../context/AuthContext'
import { getSettings } from '../services/settingService'
import { getQuotations, getQuotationById, createQuotation, updateQuotation } from '../services/quotationService'
import { getProducts } from '../services/productService'
import { getRequirements } from '../services/requirementService'
import { downloadPDF } from '../services/pdfService'
import CurrentClassicTemplate from '../components/quotation-templates/CurrentClassicTemplate'
import ConfirmationModal from '../components/ConfirmationModal'
import { formatDateForInput } from '../util/DateFormat'
import { 
  convertCurrency, 
  formatCurrency, 
  getCurrencySymbol, 
  convertItemsCurrency, 
  convertNumberToWords,
  fetchLiveExchangeRate,
  getRateMode,
  getManualRate
} from '../util/Curencyconvert'
import { generateNextQuotationNumber, getSafeQuotationFilename, isQuotationNumberExists, parseQuotationNumberParts } from '../util/QuestionNumber'

const IMAGE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/quotation-backend/api'

const getImageUrl = (filename) => {
  if (!filename) return ''
  if (filename.startsWith('data:') || filename.startsWith('blob:') || filename.startsWith('http://') || filename.startsWith('https://')) return filename
  return `${IMAGE_BASE_URL}${filename}`
}

export default function AddQuotation() {
  const navigate = useNavigate()
  const { id } = useParams() // For edit mode
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

  // Available directories for dropdowns
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [dbRequirements, setDbRequirements] = useState([])
  const [allQuotations, setAllQuotations] = useState([])

  // Loaded Company Settings
  const [companySettings, setCompanySettings] = useState(null)
  const isGstEnabled = companySettings?.hasGst === true || companySettings?.hasGst === 'yes'

  // Tab workspace state: 'customer' | 'requirements' | 'products' | 'transport_installation' | 'section' | 'preview'
  const [activeTab, setActiveTab] = useState('customer')

  const [showVersionModal, setShowVersionModal] = useState(false)
  const [versionOptions, setVersionOptions] = useState({ exists: false, highestVersionStr: 'V1', highestVersionNum: 1, matchingQuotes: [] })
  const [saveAsNewVersion, setSaveAsNewVersion] = useState(false)
  const [overwriteExistingQuoteId, setOverwriteExistingQuoteId] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    quoteNo: '',
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

    // Requirements breakdown
    requirementsOption: true,
    requirements: [],

    // Pricing breakdown items
    items: [],

    // Financial
    subTotal: 0,
    discountPercent: '',
    discountAmount: 0,
    taxableAmount: 0,
    gstPercent: 0,
    cgstPercent: 0,
    sgstPercent: 0,
    igstPercent: 0,
    gstAmount: 0,
    igstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    grandTotal: 0,
    amountInWords: '',
    businessType: 'product',

    // Terms
    deliveryPeriod: '',
    deliveryLocation: '',
    freightCharges: '',
    deliveryTerms: '',
    paymentTerms: '',
    warranty: '',
    termsAndConditions: '',
    remarks: '',
    showBankDetails: true,
    showProductImages: true,
    bankDetails: {
      bankContentIndia: '',
      bankContentEurope: '',
      qrCodeIndia: '',
      qrCodeEurope: '',
      showBankDetails: true
    },
    transportStorage: {
      show: true,
      name: 'Transport & storage cart',
      price: '',
      currency: 'INR',
      gstOption: 'withoutGst',
      gstPercent: ''
    },
    installation: {
      show: true,
      name: 'Installation & Commissioning Charges',
      price: '',
      currency: 'INR',
      gstOption: 'withoutGst',
      gstPercent: ''
    }
  })

  // Mini state for adding/configuring a single item
  const [newItem, setNewItem] = useState({
    productId: '',
    productName: '',
    productDesc: '',
    qty: 1,
    unit: 'Nos',
    basePrice: '',
    price: '',
    gstPercent: '',
    cgstPercent: '',
    sgstPercent: '',
    igstPercent: '',
    image: '',
    websiteUrl: '',
    youtubeUrl: '',
    technicalData: [],        // Editable [{ name, value }]
    availableAccessories: [], // Available accessories from product
    selectedAccessories: [],  // Selected accessories
    availableOptionals: [],   // Available optionals from product
    selectedOptionals: []     // Selected optionals
  })

  // Quill refs
  const modalEditorRef = useRef(null)
  const modalQuillRef = useRef(null)
  const introEditorRef = useRef(null)
  const introQuillRef = useRef(null)

  // Dynamic Custom Sections states
  const [sections, setSections] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [sectionTitle, setSectionTitle] = useState('')
  const [sectionIsActive, setSectionIsActive] = useState(true)
  const [deleteConfirmSection, setDeleteConfirmSection] = useState(null)

  // A4 Preview ref for print/download
  const previewRef = useRef(null)

  // Validation Errors
  const [errors, setErrors] = useState({})

  // Notification Toast
  const [notification, setNotification] = useState(null)

  // Loading state for saving and downloading
  const [isSavingAndDownloading, setIsSavingAndDownloading] = useState(false)

  // Store selected QR Code file for uploading during save
  const [selectedQrFile, setSelectedQrFile] = useState(null)

  // Template selector state for A4 preview tab
  const [selectedTemplate, setSelectedTemplate] = useState('current')

  // Exchange Rate EUR to INR (respects manual vs live mode)
  const [exchangeRate, setExchangeRate] = useState(110.31)

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

  // Load directories and default terms
  useEffect(() => {
    // Products
    const fetchProductsData = async () => {
      try {
        const data = await getProducts()
        setProducts(data.products || [])
      } catch (e) {
        console.error("Error loading products from database", e)
      }
    }
    fetchProductsData()

    // Requirements
    const fetchRequirementsData = async () => {
      try {
        const data = await getRequirements()
        const reqList = data.requirements || []
        setDbRequirements(reqList)
        setFormData(prev => {
          if (!prev.requirements || prev.requirements.length === 0) {
            return {
              ...prev,
              requirements: reqList.map(r => ({
                requirementId: r._id || r.id,
                title: r.title || r.name || '',
                value: ''
              }))
            }
          } else {
            const merged = reqList.map(r => {
              const existing = prev.requirements.find(e => e.title === (r.title || r.name) || e.requirementId === (r._id || r.id))
              if (existing) {
                const { option, ...rest } = existing
                return rest
              }
              return {
                requirementId: r._id || r.id,
                title: r.title || r.name || '',
                value: ''
              }
            })
            return { ...prev, requirements: merged }
          }
        })
      } catch (e) {
        console.error("Error loading requirements from database", e)
      }
    }
    fetchRequirementsData()

    // Load all quotations from API for version checking
    const fetchAllQuotations = async () => {
      try {
        const data = await getQuotations()
        const list = data.quotations || []
        setAllQuotations(list)

        // Build list of unique customers from quotations
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
                country: q.country || 'India'
              })
            }
          }
        })
        setCustomers(Array.from(uniqueCustomersMap.values()))

        if (!isEditMode) {
          const nextQuoteNo = generateNextQuotationNumber(list, 'scale');
          setFormData(prev => ({
            ...prev,
            quoteNo: nextQuoteNo
          }))
        }
      } catch (e) {
        console.error("Error loading all quotations from database", e)
      }
    }
    fetchAllQuotations()

    // Company Settings from backend
    const fetchCompanySettings = async () => {
      try {
        const data = await getSettings()
        const settings = data?.settings
        if (settings) {
          if (settings.companyDetails) {
            const companyDetails = settings.companyDetails
            const defaultIntroText = settings.companyDetails?.firstPageContent || settings.firstPageContent || ''
            setCompanySettings({
              ...companyDetails,
              bankDetails: settings.bankDetails,
              firstPageContent: defaultIntroText
            })
            if (!isEditMode) {
              let gstVal = 0
              const baseGstRate = parseFloat(companyDetails.gstRate || companyDetails.igstRate) || 18
              if (companyDetails.hasGst === true || companyDetails.hasGst === 'yes') {
                gstVal = baseGstRate
              } else {
                gstVal = 0
              }

              if (settings.sections && settings.sections.length > 0) {
                const sorted = [...settings.sections].sort((a, b) => (a.order || 0) - (b.order || 0))
                setSections(sorted.map((sec, idx) => ({
                  tempId: sec._id || sec.tempId || `sec-setting-${idx}-${Date.now()}`,
                  _id: sec._id,
                  title: sec.title,
                  content: sec.content,
                  isActive: sec.isActive !== false,
                  order: sec.order || idx
                })))
              } else {
                // Fallback default sections
                const defaultSections = [
                  {
                    tempId: 'sec-def-payment',
                    title: "Payment Terms",
                    content: `<ul>\n  <li><strong>50% Advance Payment:</strong> Payable along with the formal Purchase Order to initiate production.</li>\n  <li><strong>Balance 50% Payment:</strong> Payable against Proforma Invoice and QC verification report prior to shipment dispatch.</li>\n  <li>All payments must be remitted in USD/EUR via secure bank telegraphic wire transfer (T/T).</li>\n  <li>Any delay in balance payment beyond 15 days will incur an interest charge of 1.5% per month.</li>\n</ul>`,
                    isActive: true
                  },
                  {
                    tempId: 'sec-def-delivery',
                    title: "Delivery Terms",
                    content: `<ul>\n  <li><strong>Delivery Period:</strong> Standard dispatch will be made within 10 working days from receipt of advance wire and signed drawing approval.</li>\n  <li><strong>Delivery Location:</strong> Customer Site as specified in the Purchase Order unless agreed otherwise in writing.</li>\n  <li><strong>Freight & Transport:</strong> All quoted prices are inclusive of freight/transport charges to the destination site.</li>\n</ul>`,
                    isActive: true
                  },
                  {
                    tempId: 'sec-def-warranty',
                    title: "Warranty",
                    content: `<ul>\n  <li><strong>12 Months Standard Warranty:</strong> Covers all mechanical, structural, and electrical faults starting from the commissioning/installation date.</li>\n  <li>Warranty includes the cost of replacement parts, engineering labor, and technical remote support.</li>\n  <li>Defects resulting from misuse, lack of maintenance, unauthorized modification, or force majeure are excluded.</li>\n  <li>Option for extended warranty coverage up to 36 months is available upon request.</li>\n</ul>`,
                    isActive: true
                  },
                  {
                    tempId: 'sec-def-tc',
                    title: "Terms & Conditions",
                    content: `<ul>\n  <li><strong>Validity of Quote:</strong> Quoted prices are valid and firm for a period of 30 calendar days from the date of issuance.</li>\n  <li><strong>Delivery Lead Time:</strong> Standard dispatch will be made within 4-6 weeks from receipt of advance wire and signed drawing approval.</li>\n  <li><strong>Shipping Terms:</strong> All quotes are subject to EXW (Ex Works) unless explicitly agreed otherwise in writing.</li>\n  <li><strong>Governing Law:</strong> All disputes and contracts are governed by local commercial laws and jurisdiction courts.</li>\n</ul>`,
                    isActive: true
                  }
                ]
                setSections(defaultSections)
              }
              setFormData(prev => ({
                ...prev,
                gstPercent: gstVal,
                businessType: companyDetails.businessType || 'product',
                subject: settings.defaultMailAndSubject?.subject || prev.subject,
                introContent: prev.introContent || defaultIntroText,
                showBankDetails: settings.bankDetails?.showBankDetails !== false,
                bankDetails: {
                  bankContentIndia: settings.bankDetails?.bankContentIndia || '',
                  bankContentEurope: settings.bankDetails?.bankContentEurope || '',
                  qrCodeIndia: settings.bankDetails?.qrCodeIndia || '',
                  qrCodeEurope: settings.bankDetails?.qrCodeEurope || '',
                  showBankDetails: settings.bankDetails?.showBankDetails !== false
                }
              }))
            } else {
              setFormData(prev => ({
                ...prev,
                businessType: prev.businessType || companyDetails.businessType || 'product'
              }))
            }
          }
        }
      } catch (e) {
        console.error("Error loading company settings from backend", e)
      }
    }
    fetchCompanySettings()

    // Default terms configured in TermsConditions
    let defaultPayment = ''
    let defaultWarranty = ''
    let defaultDelivery = ''
    let defaultRemarks = ''
    let defaultTC = ''

    // If edit mode, load quotation data
    const fetchQuotationData = async () => {
      try {
        const data = await getQuotationById(id)
        const quoteToEdit = data.quotation
        if (quoteToEdit) {
          if (quoteToEdit.productType === 'Spare Parts') {
            navigate(`/quotations/spare-parts/edit/${id}`, { replace: true })
            return
          }
          let convertedTC = quoteToEdit.termsAndConditions
          if (!convertedTC && quoteToEdit.termsList) {
            convertedTC = `<ol>${quoteToEdit.termsList.map(t => `<li>${t}</li>`).join('')}</ol>`
          }

          let convertedDT = quoteToEdit.deliveryTerms
          if (convertedDT && typeof convertedDT === 'object') {
            convertedDT = `<ul>
  <li><strong>Delivery Period:</strong> ${convertedDT.period || 'Within 10 Working Days'}</li>
  <li><strong>Delivery Location:</strong> ${convertedDT.location || 'Customer Site'}</li>
  <li><strong>Freight Charges:</strong> ${convertedDT.freight || 'Included'}</li>
</ul>`
          }

          if (quoteToEdit.sections && quoteToEdit.sections.length > 0) {
            const sorted = [...quoteToEdit.sections].sort((a, b) => (a.order || 0) - (b.order || 0))
            setSections(sorted.map((sec, idx) => ({
              tempId: sec._id || sec.tempId || `sec-quote-${idx}-${Date.now()}`,
              ...sec,
              isActive: sec.isActive !== false
            })))
          } else {
            const fallbackSections = []
            if (quoteToEdit.paymentTerms) fallbackSections.push({ tempId: 'sec-pay', title: "Payment Terms", content: quoteToEdit.paymentTerms, isActive: true })
            if (convertedDT) fallbackSections.push({ tempId: 'sec-del', title: "Delivery Terms", content: convertedDT, isActive: true })
            if (quoteToEdit.warranty) fallbackSections.push({ tempId: 'sec-war', title: "Warranty", content: quoteToEdit.warranty, isActive: true })
            if (convertedTC) fallbackSections.push({ tempId: 'sec-tc', title: "Terms & Conditions", content: convertedTC, isActive: true })
            if (quoteToEdit.remarks) fallbackSections.push({ tempId: 'sec-rem', title: "Remarks", content: quoteToEdit.remarks, isActive: true })
            setSections(fallbackSections)
          }

          // Convert old format (if any) to new format
          const convertedItems = quoteToEdit.items.map(item => {
            const hasCgstSgstIgst = item.cgstPercent !== undefined || item.sgstPercent !== undefined || item.igstPercent !== undefined;
            let cgstPercent = item.cgstPercent ?? 0;
            let sgstPercent = item.sgstPercent ?? 0;
            let igstPercent = item.igstPercent ?? 0;

            if (!hasCgstSgstIgst) {
              const totalGst = parseFloat(item.gstPercent || 0);
              const isInterstate = (quoteToEdit.igstAmount || 0) > 0;
              if (isInterstate) {
                igstPercent = totalGst;
                cgstPercent = 0;
                sgstPercent = 0;
              } else {
                cgstPercent = totalGst / 2;
                sgstPercent = totalGst / 2;
                igstPercent = 0;
              }
            }

            let productNameVal = item.productName || '';
            let productDescVal = item.productDesc || '';

            if (item.productName !== undefined && item.productDesc !== undefined) {
              productNameVal = item.productName;
              productDescVal = item.productDesc;
            } else if (typeof item.desc === 'string' && item.desc.includes('\n')) {
              const parts = item.desc.split('\n')
              productNameVal = parts[0]
              productDescVal = parts.slice(1).join('\n')
            } else {
              productNameVal = item.desc || '';
              productDescVal = '';
            }

            return {
              ...item,
              productName: productNameVal,
              productDesc: productDescVal,
              cgstPercent,
              sgstPercent,
              igstPercent,
              desc: productDescVal ? `${productNameVal}\n${productDescVal}` : productNameVal
            }
          })

          setFormData(prev => {
            let loadedCgstPercent = quoteToEdit.cgstPercent ?? 0
            let loadedSgstPercent = quoteToEdit.sgstPercent ?? 0
            let loadedIgstPercent = quoteToEdit.igstPercent ?? 0
            let loadedGstPercent = quoteToEdit.gstPercent ?? 0

            if (quoteToEdit.businessType === 'service') {
              loadedCgstPercent = 0
              loadedSgstPercent = 0
              loadedIgstPercent = 0
              if (!loadedGstPercent && quoteToEdit.gstAmount && quoteToEdit.taxableAmount) {
                loadedGstPercent = (quoteToEdit.gstAmount / quoteToEdit.taxableAmount) * 100
              }
            }

            let loadedGstOption = quoteToEdit.gstOption
            if (!loadedGstOption) {
              if ((quoteToEdit.country || '').toLowerCase().includes('india')) {
                loadedGstOption = (quoteToEdit.gstAmount > 0 || quoteToEdit.gstPercent > 0) ? 'withGst' : 'withoutGst'
              } else {
                loadedGstOption = 'withoutGst'
              }
            }

            return {
              ...prev,
              ...quoteToEdit,
              country: quoteToEdit.country || '',
              gstOption: loadedGstOption,
              cgstPercent: loadedCgstPercent,
              sgstPercent: loadedSgstPercent,
              igstPercent: loadedIgstPercent,
              gstPercent: loadedGstPercent,
              requirementsOption: quoteToEdit.requirementsOption !== undefined ? quoteToEdit.requirementsOption : true,
              requirements: (quoteToEdit.requirements && quoteToEdit.requirements.length > 0) ? quoteToEdit.requirements : prev.requirements,
              introContent: quoteToEdit.introContent !== undefined ? quoteToEdit.introContent : (companySettings?.introContent || companySettings?.firstPageContent || ''),
              items: convertedItems,
              termsAndConditions: convertedTC || '',
              deliveryTerms: convertedDT || '',
              deliveryPeriod: quoteToEdit.deliveryTerms?.period || 'Within 10 Working Days',
              deliveryLocation: quoteToEdit.deliveryTerms?.location || 'Customer Site',
              freightCharges: quoteToEdit.deliveryTerms?.freight || 'Included',
              showBankDetails: quoteToEdit.showBankDetails !== undefined ? quoteToEdit.showBankDetails : (companySettings?.bankDetails?.showBankDetails !== false),
              showProductImages: quoteToEdit.showProductImages !== undefined ? quoteToEdit.showProductImages : true,
              bankDetails: {
                bankContentIndia: quoteToEdit.bankDetails?.bankContentIndia || companySettings?.bankDetails?.bankContentIndia || '',
                bankContentEurope: quoteToEdit.bankDetails?.bankContentEurope || companySettings?.bankDetails?.bankContentEurope || '',
                qrCodeIndia: quoteToEdit.bankDetails?.qrCodeIndia || companySettings?.bankDetails?.qrCodeIndia || '',
                qrCodeEurope: quoteToEdit.bankDetails?.qrCodeEurope || companySettings?.bankDetails?.qrCodeEurope || '',
                showBankDetails: quoteToEdit.bankDetails?.showBankDetails !== undefined ? quoteToEdit.bankDetails?.showBankDetails : (companySettings?.bankDetails?.showBankDetails !== false)
              },
              transportStorage: {
                show: quoteToEdit.transportStorage?.show !== undefined ? quoteToEdit.transportStorage.show : true,
                name: quoteToEdit.transportStorage?.name || 'Transport & storage cart',
                price: quoteToEdit.transportStorage?.price !== undefined ? quoteToEdit.transportStorage?.price : '',
                currency: 'INR',
                gstOption: quoteToEdit.transportStorage?.gstOption || 'withoutGst',
                gstPercent: quoteToEdit.transportStorage?.gstPercent !== undefined ? quoteToEdit.transportStorage.gstPercent : ''
              },
              installation: {
                show: quoteToEdit.installation?.show !== undefined ? quoteToEdit.installation.show : true,
                name: quoteToEdit.installation?.name || 'Installation & Commissioning Charges',
                price: quoteToEdit.installation?.price !== undefined ? quoteToEdit.installation?.price : '',
                currency: 'INR',
                gstOption: quoteToEdit.installation?.gstOption || 'withoutGst',
                gstPercent: quoteToEdit.installation?.gstPercent !== undefined ? quoteToEdit.installation.gstPercent : ''
              }
            }
          })
        }
      } catch (e) {
        console.error("Error loading quotation to edit from backend", e)
      }
    }

    if (isEditMode) {
      fetchQuotationData()
    }

    // Default dates & auto quote number if new
    if (!isEditMode) {
      const today = new Date()
      const validDate = new Date()
      validDate.setMonth(today.getMonth() + 1)

      const formatStr = (d) => d.toISOString().split('T')[0]

      setFormData(prev => {
        return {
          ...prev,
          validity: formatStr(validDate),
          paymentTerms: prev.paymentTerms || defaultPayment,
          warranty: prev.warranty || defaultWarranty,
          deliveryTerms: prev.deliveryTerms || defaultDelivery,
          remarks: prev.remarks || defaultRemarks,
          termsAndConditions: prev.termsAndConditions || defaultTC
        }
      })
    }
  }, [id, isEditMode])


  const isStateMatching = () => {
    const customerCountry = (formData.country || '').trim().toLowerCase()
    const companyCountry = (companySettings?.country || companySettings?.state || '').trim().toLowerCase()
    return customerCountry !== '' && companyCountry !== '' && customerCountry === companyCountry
  }

  const currSymbol = getCurrencySymbol(formData.currency)

  // Local amount formatter that respects the roundOff toggle and currency
  const fmtAmt = (n) => {
    return formatCurrency(n, formData.currency, { withSymbol: false, decimals: formData.roundOff ? 0 : 2 })
  }

  const calculateChargeBreakdown = (charge) => {
    const rawPrice = parseFloat(charge?.price || 0)
    if (isNaN(rawPrice) || rawPrice <= 0) {
      return { basePrice: 0, gstAmount: 0, totalPrice: 0, rate: 0, isWithGst: false }
    }

    const option = charge?.gstOption || ''
    const isWithGst = option === 'withGst'
    const rate = isWithGst ? (parseFloat(charge?.gstPercent) || 0) : 0

    let basePrice = rawPrice
    let gstAmount = isWithGst ? basePrice * (rate / 100) : 0
    let totalPrice = basePrice + gstAmount

    return { basePrice, gstAmount, totalPrice, rate, isWithGst }
  }

  const calculateItemGst = (item) => {
    const itemSub = item.qty * parseFloat(item.price || 0)
    const itemDiscount = itemSub * (parseFloat(formData.discountPercent || 0) / 100)
    const itemTaxable = itemSub - itemDiscount
    const gstRate = item.gstPercent !== undefined && item.gstPercent !== '' ? parseFloat(item.gstPercent) : parseFloat(formData.gstPercent || 0)
    return itemTaxable * (gstRate / 100)
  }

  // Recalculate totals whenever items, discount percent, GST percent, or businessType changes
  useEffect(() => {
    const subTotal = formData.items.reduce((sum, item) => sum + (item.qty * parseFloat(item.price || 0)), 0)
    const discountAmount = subTotal * (parseFloat(formData.discountPercent || 0) / 100)
    const taxableAmount = subTotal - discountAmount

    let gstAmount = 0
    const isIndia = (formData.country || '').toLowerCase().includes('india')
    const hasClientGst = Boolean(isIndia && formData.gstNumber && formData.gstNumber.trim().length > 0)
    const isGstEnabled = hasClientGst && (formData.currency !== 'EUR') && (companySettings?.hasGst === true || companySettings?.hasGst === 'yes')

    if (isGstEnabled) {
      if (formData.businessType === 'service') {
        const gstRate = parseFloat(formData.gstPercent || 0)
        gstAmount = taxableAmount * (gstRate / 100)
      } else {
        // Product based: sum of all item GSTs
        formData.items.forEach(item => {
          const itemSub = item.qty * parseFloat(item.price || 0)
          const itemDiscount = itemSub * (parseFloat(formData.discountPercent || 0) / 100)
          const itemTaxable = itemSub - itemDiscount
          const itemGstRate = item.gstPercent !== undefined && item.gstPercent !== '' ? parseFloat(item.gstPercent) : parseFloat(formData.gstPercent || 0)
          gstAmount += itemTaxable * (itemGstRate / 100)
        })
      }
    }

    let grandTotal = taxableAmount + gstAmount
    if (formData.roundOff) {
      grandTotal = Math.round(grandTotal)
    }
    const amountInWords = convertNumberToWords(grandTotal)

    setFormData(prev => ({
      ...prev,
      subTotal,
      discountAmount,
      taxableAmount,
      gstAmount,
      igstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      grandTotal,
      amountInWords
    }))
  }, [formData.items, formData.discountPercent, formData.gstPercent, formData.businessType, formData.country, formData.roundOff, formData.currency, formData.gstNumber, companySettings])

  // Initialize Quill Editor inside Modal when opened
  useEffect(() => {
    if (isModalOpen && modalEditorRef.current && !modalQuillRef.current) {
      const container = modalEditorRef.current
      const parent = container.parentElement
      if (parent) {
        const toolbars = parent.querySelectorAll('.ql-toolbar')
        toolbars.forEach(tb => tb.remove())
      }
      container.innerHTML = ''

      const quill = new Quill(container, {
        theme: 'snow',
        placeholder: 'Enter section content here...',
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

      // Set initial content if editing
      if (editingSection) {
        quill.root.innerHTML = editingSection.content || ''
      } else {
        quill.root.innerHTML = ''
      }
    }

    return () => {
      if (!isModalOpen) {
        modalQuillRef.current = null
        if (modalEditorRef.current) {
          const container = modalEditorRef.current
          const parent = container.parentElement
          if (parent) {
            const toolbars = parent.querySelectorAll('.ql-toolbar')
            toolbars.forEach(tb => tb.remove())
          }
          container.innerHTML = ''
        }
      }
    }
  }, [isModalOpen, editingSection])

  // Initialize Intro Content Quill Editor on Tab 6
  useEffect(() => {
    if (activeTab === 'intro_content' && introEditorRef.current && !introQuillRef.current) {
      const container = introEditorRef.current
      const parent = container.parentElement
      if (parent) {
        const toolbars = parent.querySelectorAll('.ql-toolbar')
        toolbars.forEach(tb => tb.remove())
      }
      container.innerHTML = ''

      const quill = new Quill(container, {
        theme: 'snow',
        placeholder: 'Enter introduction text / cover letter for the quotation...',
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
      if (!formData.introContent && defaultIntro) {
        setFormData(prev => ({ ...prev, introContent: defaultIntro }))
      }

      quill.on('text-change', () => {
        const html = quill.root.innerHTML
        setFormData(prev => ({ ...prev, introContent: html }))
      })
    }

    return () => {
      if (activeTab !== 'intro_content') {
        introQuillRef.current = null
        if (introEditorRef.current) {
          const container = introEditorRef.current
          const parent = container.parentElement
          if (parent) {
            const toolbars = parent.querySelectorAll('.ql-toolbar')
            toolbars.forEach(tb => tb.remove())
          }
          container.innerHTML = ''
        }
      }
    }
  }, [activeTab, companySettings])

  const handleOpenAddSection = () => {
    setEditingSection(null)
    setSectionTitle('')
    setSectionIsActive(true)
    setIsModalOpen(true)
  }

  const handleOpenEditSection = (sec) => {
    setEditingSection(sec)
    setSectionTitle(sec.title || '')
    setSectionIsActive(sec.isActive !== false)
    setIsModalOpen(true)
  }

  const handleSaveSection = () => {
    if (!sectionTitle.trim()) {
      showNotification('error', 'Section title is required')
      return
    }
    const content = modalQuillRef.current ? modalQuillRef.current.root.innerHTML : ''

    if (editingSection) {
      // Edit mode
      const editTargetId = editingSection.tempId || editingSection._id
      setSections(prev => prev.map(sec => {
        const secId = sec.tempId || sec._id
        const isMatch = (editTargetId && secId && editTargetId === secId) ||
          sec === editingSection ||
          (editingSection.title && sec.title === editingSection.title)
        return isMatch
          ? { ...sec, title: sectionTitle, content, isActive: sectionIsActive }
          : sec
      }))
    } else {
      // Add mode
      setSections(prev => [
        ...prev,
        {
          tempId: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: sectionTitle,
          content,
          isActive: sectionIsActive,
          order: prev.length
        }
      ])
    }

    setIsModalOpen(false)
    setEditingSection(null)
    setSectionTitle('')
    setSectionIsActive(true)
  }

  const handleOpenDeleteSectionModal = (sec) => {
    setDeleteConfirmSection(sec)
  }

  const handleConfirmDeleteSection = () => {
    if (!deleteConfirmSection) return
    const deleteTargetId = deleteConfirmSection.tempId || deleteConfirmSection._id
    setSections(prev => prev.filter(sec => {
      const secId = sec.tempId || sec._id
      const isMatch = (deleteTargetId && secId && deleteTargetId === secId) ||
        sec === deleteConfirmSection ||
        (deleteConfirmSection.title && sec.title === deleteConfirmSection.title)
      return !isMatch
    }))
    setDeleteConfirmSection(null)
  }

  const handleToggleSectionActive = (targetSec, secondArg) => {
    let targetId = null
    let targetTitle = null

    if (typeof targetSec === 'object' && targetSec !== null) {
      targetId = targetSec.tempId || targetSec._id
      targetTitle = targetSec.title
    } else {
      targetId = targetSec || secondArg
    }

    setSections(prev => prev.map(sec => {
      const secId = sec.tempId || sec._id
      const isMatch = (targetId && secId && targetId === secId) ||
        sec === targetSec ||
        (targetTitle && sec.title === targetTitle)
      return isMatch ? { ...sec, isActive: !sec.isActive } : sec
    }))
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

  // Sync sections to formData for easier inclusion in submit payloads
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      sections
    }))
  }, [sections])

  const handleQuoteSeqChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '')
    const { prefix, suffix } = parseQuotationNumberParts(formData.quoteNo, 'scale')
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
    const { prefix, seqStr, suffix } = parseQuotationNumberParts(formData.quoteNo, 'scale')
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
      let updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }

      if (name === 'country' || name === 'currency') {
        let newCurrency = prev.currency
        if (name === 'country') {
          const valLower = (value || '').toLowerCase()
          if (valLower.includes('europe') || valLower.includes('germany') || valLower.includes('france')) {
            newCurrency = 'EUR'
            updated.gstNumber = ''
            updated.gstPercent = 0
            if (updated.items && updated.items.length > 0) {
              updated.items = updated.items.map(item => ({ ...item, gstPercent: 0 }))
            }
          } else if (valLower.includes('india')) {
            newCurrency = 'INR'
            const hasGst = updated.gstNumber && updated.gstNumber.trim().length > 0
            const defaultGstRate = parseFloat(companySettings?.gstRate || companySettings?.igstRate) || 18
            const activeRate = hasGst ? defaultGstRate : 0
            updated.gstPercent = activeRate
            if (updated.items && updated.items.length > 0) {
              updated.items = updated.items.map(item => ({ ...item, gstPercent: activeRate }))
            }
          }
        } else if (name === 'currency') {
          newCurrency = value
        }

        const oldCurrency = prev.currency
        if (newCurrency !== oldCurrency) {
          const rate = exchangeRate || 110.31

          // Convert items if present using Curencyconvert
          if (prev.items && prev.items.length > 0) {
            updated.items = convertItemsCurrency(prev.items, oldCurrency, newCurrency, rate)
          }

          // Keep transportStorage and installation currency strictly in INR (never convert to EUR)
          updated.transportStorage = {
            ...prev.transportStorage,
            currency: 'INR'
          }

          updated.installation = {
            ...prev.installation,
            currency: 'INR'
          }

          // Also convert any currently active newItem being configured in the mini-form
          setNewItem(prevItem => {
            if (!prevItem.productId && !prevItem.productName) return prevItem
            const convBase = prevItem.basePrice ? convertCurrency(prevItem.basePrice, oldCurrency, newCurrency, rate).toString() : ''
            const convPrice = prevItem.price ? convertCurrency(prevItem.price, oldCurrency, newCurrency, rate).toString() : ''
            const convAccs = (prevItem.availableAccessories || []).map(a => ({
              ...a,
              price: convertCurrency(a.price, oldCurrency, newCurrency, rate)
            }))
            const convSelAccs = (prevItem.selectedAccessories || []).map(a => ({
              ...a,
              price: convertCurrency(a.price, oldCurrency, newCurrency, rate)
            }))
            const convOpts = (prevItem.availableOptionals || []).map(o => ({
              ...o,
              price: convertCurrency(o.price, oldCurrency, newCurrency, rate)
            }))
            const convSelOpts = (prevItem.selectedOptionals || []).map(o => ({
              ...o,
              price: convertCurrency(o.price, oldCurrency, newCurrency, rate)
            }))
            return {
              ...prevItem,
              basePrice: convBase,
              price: convPrice,
              availableAccessories: convAccs,
              selectedAccessories: convSelAccs,
              availableOptionals: convOpts,
              selectedOptionals: convSelOpts
            }
          })
        } else {
          updated.transportStorage = {
            ...prev.transportStorage,
            currency: 'INR'
          }
          updated.installation = {
            ...prev.installation,
            currency: 'INR'
          }
        }
        updated.currency = newCurrency
      }

      if (name === 'gstNumber') {
        const cleanGst = (value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15)
        updated.gstNumber = cleanGst
        if (cleanGst.length > 0) {
          const defaultGstRate = parseFloat(companySettings?.gstRate || companySettings?.igstRate) || 18
          updated.gstPercent = defaultGstRate
          if (updated.items && updated.items.length > 0) {
            updated.items = updated.items.map(item => ({ ...item, gstPercent: defaultGstRate }))
          }
        } else {
          updated.gstPercent = 0
          updated.gstAmount = 0
          if (updated.items && updated.items.length > 0) {
            updated.items = updated.items.map(item => ({ ...item, gstPercent: 0 }))
          }
        }
      }

      // Auto-fill customer details if matching an existing company from datalist/customers list
      if (name === 'companyName' && value) {
        const found = customers.find(c => c.company && c.company.trim().toLowerCase() === value.trim().toLowerCase())
        if (found) {
          const filledGst = (found.gst || updated.gstNumber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15)
          updated = {
            ...updated,
            customerId: found.id,
            customerName: found.name || updated.customerName,
            customerMobile: found.mobile || updated.customerMobile,
            customerEmail: found.email || updated.customerEmail,
            address: found.address || updated.address,
            gstNumber: filledGst,
            country: found.country || updated.country || ''
          }

          if (companySettings && (companySettings.hasGst === true || companySettings.hasGst === 'yes')) {
            const baseGst = parseFloat(companySettings.gstRate || companySettings.igstRate) || 18
            const hasGst = filledGst && filledGst.trim().length > 0
            updated.gstPercent = hasGst ? baseGst : 0
            if (updated.items && updated.items.length > 0) {
              updated.items = updated.items.map(item => ({ ...item, gstPercent: hasGst ? baseGst : 0 }))
            }
          }
        }
      }

      return updated
    })

    // Clear error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleCustomBankChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value
      }
    }))
  }

  const handleBankQrCodeUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        showNotification('error', 'Please upload a valid image file (PNG, JPG, WEBP, SVG)')
        console.log("Please upload a valid image file (PNG, JPG, WEBP, SVG) ")
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        showNotification('error', 'Image size should be less than 2MB')
        console.log("Image size should be less than 2MB")
        return
      }

      setSelectedQrFile(file)
      const previewUrl = URL.createObjectURL(file)
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          qrCode: previewUrl
        }
      }))
      showNotification('success', 'QR Code selected successfully!')
    }
  }

  const handleRemoveBankQrCode = () => {
    setSelectedQrFile(null)
    setFormData(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        qrCode: ''
      }
    }))
  }



  // Convert Product Price Helper based on source currency and target customer currency
  const getConvertedPrice = (price, prodCurrency, targetCurrency) => {
    const rawPrice = parseFloat(price || 0)
    if (!rawPrice) return 0
    const sourceCurr = prodCurrency || 'EUR'
    const targetCurr = targetCurrency || formData.currency || 'EUR'
    return convertCurrency(rawPrice, sourceCurr, targetCurr, exchangeRate)
  }

  // Format Price Helper
  const formatPrice = (price, curr = formData.currency) => {
    return formatCurrency(price, curr)
  }

  // Handle Product Selection for adding item
  const handleProductSelect = (e) => {
    const prodId = e.target.value
    if (!prodId) {
      setNewItem({
        productId: '',
        productName: '',
        productDesc: '',
        qty: 1,
        unit: 'Nos',
        basePrice: '',
        price: '',
        gstPercent: '',
        cgstPercent: '',
        sgstPercent: '',
        igstPercent: '',
        image: '',
        technicalData: [],
        availableAccessories: [],
        selectedAccessories: [],
        availableOptionals: [],
        selectedOptionals: []
      })
      return
    }

    const prod = products.find(p => (p._id || p.id || '').toString() === prodId.toString())
    if (prod) {
      const prodCurrency = prod.currency || 'EUR'
      const convertedUnitPrice = getConvertedPrice(prod.unitPrice, prodCurrency, formData.currency)
      const techData = prod.technicalData ? prod.technicalData.map(t => ({ name: t.name || '', value: t.value || '' })) : []
      const accs = (prod.accessories || []).map(a => ({
        ...a,
        price: getConvertedPrice(a.price, prodCurrency, formData.currency)
      }))
      const opts = (prod.optionals || []).map(o => ({
        ...o,
        price: getConvertedPrice(o.price, prodCurrency, formData.currency)
      }))

      setNewItem({
        productId: prod._id || prod.id,
        productName: prod.name || '',
        productDesc: prod.description || '',
        qty: 1,
        unit: 'Nos',
        basePrice: convertedUnitPrice.toString(),
        price: convertedUnitPrice.toString(),
        gstPercent: '',
        cgstPercent: '',
        sgstPercent: '',
        igstPercent: '',
        image: prod.image || '',
        websiteUrl: prod.websiteUrl || prod.websiteLink || '',
        youtubeUrl: prod.youtubeUrl || prod.youtubeLink || '',
        technicalData: techData,
        availableAccessories: accs,
        selectedAccessories: [],
        availableOptionals: opts,
        selectedOptionals: []
      })
    }
  }

  // Technical Specifications handlers
  const handleAddTechDataRow = () => {
    setNewItem(prev => ({
      ...prev,
      technicalData: [...(prev.technicalData || []), { name: '', value: '' }]
    }))
  }

  const handleTechDataChange = (idx, field, val) => {
    setNewItem(prev => {
      const updated = [...(prev.technicalData || [])]
      updated[idx] = { ...updated[idx], [field]: val }
      return { ...prev, technicalData: updated }
    })
  }

  const handleRemoveTechDataRow = (idx) => {
    setNewItem(prev => ({
      ...prev,
      technicalData: (prev.technicalData || []).filter((_, i) => i !== idx)
    }))
  }

  // Accessories and Optionals Selection handlers
  const handleToggleAccessory = (acc) => {
    setNewItem(prev => {
      const exists = (prev.selectedAccessories || []).some(a => (a._id || a.name) === (acc._id || acc.name))
      const updated = exists
        ? prev.selectedAccessories.filter(a => (a._id || a.name) !== (acc._id || acc.name))
        : [...(prev.selectedAccessories || []), acc]
      return { ...prev, selectedAccessories: updated }
    })
  }

  const handleToggleOptional = (opt) => {
    setNewItem(prev => {
      const exists = (prev.selectedOptionals || []).some(o => (o._id || o.name) === (opt._id || opt.name))
      const updated = exists
        ? prev.selectedOptionals.filter(o => (o._id || o.name) !== (opt._id || opt.name))
        : [...(prev.selectedOptionals || []), opt]
      return { ...prev, selectedOptionals: updated }
    })
  }

  const handleAccessoryPriceChange = (acc, newPriceVal) => {
    setNewItem(prev => {
      const updatedAvailable = (prev.availableAccessories || []).map(a => {
        if ((a._id || a.name) === (acc._id || acc.name)) {
          return { ...a, price: newPriceVal }
        }
        return a
      })

      const updatedSelected = (prev.selectedAccessories || []).map(a => {
        if ((a._id || a.name) === (acc._id || acc.name)) {
          return { ...a, price: newPriceVal }
        }
        return a
      })

      return {
        ...prev,
        availableAccessories: updatedAvailable,
        selectedAccessories: updatedSelected
      }
    })
  }

  const handleOptionalPriceChange = (opt, newPriceVal) => {
    setNewItem(prev => {
      const updatedAvailable = (prev.availableOptionals || []).map(o => {
        if ((o._id || o.name) === (opt._id || opt.name)) {
          return { ...o, price: newPriceVal }
        }
        return o
      })

      const updatedSelected = (prev.selectedOptionals || []).map(o => {
        if ((o._id || o.name) === (opt._id || opt.name)) {
          return { ...o, price: newPriceVal }
        }
        return o
      })

      return {
        ...prev,
        availableOptionals: updatedAvailable,
        selectedOptionals: updatedSelected
      }
    })
  }

  // Real-time calculated rates for newItem
  const currentBasePrice = parseFloat(newItem.basePrice !== '' ? newItem.basePrice : (newItem.price || 0)) || 0
  const currentAccTotal = (newItem.selectedAccessories || []).reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0)
  const currentOptTotal = (newItem.selectedOptionals || []).reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0)
  const currentCalculatedUnitPrice = currentBasePrice + currentAccTotal + currentOptTotal
  const currentCalculatedLineTotal = currentCalculatedUnitPrice * (parseInt(newItem.qty) || 1)

  // Add Item to table
  const handleAddItem = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!newItem.productName.trim()) {
      showNotification('error', 'Item name is required')
      return
    }

    if (isNaN(currentCalculatedUnitPrice) || currentCalculatedUnitPrice <= 0) {
      showNotification('error', 'Please enter a valid unit rate')
      return
    }
    const parsedQty = parseInt(newItem.qty)
    if (isNaN(parsedQty) || parsedQty <= 0) {
      showNotification('error', 'Please enter a valid quantity')
      return
    }

    // Compute item-specific GST rate based on CGST/SGST/IGST inputs
    let itemGstRate = 0
    if (isGstEnabled) {
      itemGstRate = newItem.gstPercent !== '' && newItem.gstPercent !== undefined
        ? parseFloat(newItem.gstPercent)
        : parseFloat(companySettings?.gstRate || 18)
    }

    const item = {
      productId: newItem.productId || '',
      productName: newItem.productName.trim(),
      productDesc: newItem.productDesc.trim(),
      qty: parsedQty,
      unit: newItem.unit.trim(),
      basePrice: currentBasePrice,
      price: currentCalculatedUnitPrice,
      gstPercent: itemGstRate,
      image: newItem.image || '',
      websiteUrl: newItem.websiteUrl || '',
      youtubeUrl: newItem.youtubeUrl || '',
      technicalData: newItem.technicalData || [],
      selectedAccessories: newItem.selectedAccessories || [],
      selectedOptionals: newItem.selectedOptionals || [],
      desc: newItem.productDesc.trim()
        ? `${newItem.productName.trim()}\n${newItem.productDesc.trim()}`
        : newItem.productName.trim()
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }))

    // Reset mini form
    setNewItem({
      productId: '',
      productName: '',
      productDesc: '',
      qty: 1,
      unit: 'Nos',
      basePrice: '',
      price: '',
      gstPercent: '',
      cgstPercent: '',
      sgstPercent: '',
      igstPercent: '',
      image: '',
      websiteUrl: '',
      youtubeUrl: '',
      technicalData: [],
      availableAccessories: [],
      selectedAccessories: [],
      availableOptionals: [],
      selectedOptionals: []
    })
  }

  // Edit item from table
  const handleEditTableItem = (index) => {
    const itemToEdit = formData.items[index]
    if (!itemToEdit) return

    const prod = products.find(p => (p._id || p.id || '').toString() === (itemToEdit.productId || '').toString())

    const accs = prod?.accessories ? prod.accessories.map(a => {
      const convPrice = getConvertedPrice(a.price, prod.currency || 'EUR', formData.currency)
      const sel = (itemToEdit.selectedAccessories || []).find(s => (s._id || s.name) === (a._id || a.name))
      return sel ? { ...a, price: sel.price } : { ...a, price: convPrice }
    }) : (itemToEdit.availableAccessories || [])

    const opts = prod?.optionals ? prod.optionals.map(o => {
      const convPrice = getConvertedPrice(o.price, prod.currency || 'EUR', formData.currency)
      const sel = (itemToEdit.selectedOptionals || []).find(s => (s._id || s.name) === (o._id || o.name))
      return sel ? { ...o, price: sel.price } : { ...o, price: convPrice }
    }) : (itemToEdit.availableOptionals || [])

    setNewItem({
      productId: itemToEdit.productId || '',
      productName: itemToEdit.productName || '',
      productDesc: itemToEdit.productDesc || '',
      qty: itemToEdit.qty || 1,
      unit: itemToEdit.unit || 'Nos',
      basePrice: (itemToEdit.basePrice !== undefined ? itemToEdit.basePrice : itemToEdit.price).toString(),
      price: (itemToEdit.price || 0).toString(),
      gstPercent: itemToEdit.gstPercent || '',
      cgstPercent: itemToEdit.cgstPercent || '',
      sgstPercent: itemToEdit.sgstPercent || '',
      igstPercent: itemToEdit.igstPercent || '',
      image: itemToEdit.image || '',
      websiteUrl: itemToEdit.websiteUrl || itemToEdit.websiteLink || prod?.websiteUrl || prod?.websiteLink || '',
      youtubeUrl: itemToEdit.youtubeUrl || itemToEdit.youtubeLink || prod?.youtubeUrl || prod?.youtubeLink || '',
      technicalData: itemToEdit.technicalData || [],
      availableAccessories: accs,
      selectedAccessories: itemToEdit.selectedAccessories || [],
      availableOptionals: opts,
      selectedOptionals: itemToEdit.selectedOptionals || []
    })

    // Remove from list so user can re-add after editing
    handleRemoveItem(index)
  }


  // Remove Item
  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // Increase Quantity
  const handleIncreaseQty = (index) => {
    setFormData(prev => {
      const updatedItems = [...prev.items]
      updatedItems[index] = {
        ...updatedItems[index],
        qty: updatedItems[index].qty + 1
      }
      return { ...prev, items: updatedItems }
    })
  }

  // Decrease Quantity
  const handleDecreaseQty = (index) => {
    setFormData(prev => {
      const updatedItems = [...prev.items]
      if (updatedItems[index].qty > 1) {
        updatedItems[index] = {
          ...updatedItems[index],
          qty: updatedItems[index].qty - 1
        }
      }
      return { ...prev, items: updatedItems }
    })
  }

  // Helper to scroll page / layout container to top
  const scrollToTop = () => {
    const mainContainer = document.querySelector('main')
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Show Toast
  const showNotification = (type, message) => {
    setNotification({ type, message })
    scrollToTop()
    setTimeout(() => setNotification(null), 4000)
  }

  // Validate current tab before switching
  const validateTab = (tab) => {
    const newErrors = {}
    if (tab === 'customer') {
      if (!formData.quoteNo.trim()) {
        newErrors.quoteNo = 'Quotation number is required'
      } else if (isQuotationNumberExists(formData.quoteNo, allQuotations, isEditMode ? id : null)) {
        newErrors.quoteNo = `Quotation number "${formData.quoteNo.trim()}" already exists. Duplicate quotation numbers are not allowed.`
      }
      if (!formData.customerName.trim()) newErrors.customerName = 'Contact Person is required'

      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Organization Name is required'
      }
      if (!formData.country || !formData.country.trim()) {
        newErrors.country = 'Country is required'
      }

      const phoneRegex = /^[0-9+\s-]{8,15}$/
      if (!formData.customerMobile.trim()) {
        newErrors.customerMobile = 'Mobile Number is required'
      } else if (!phoneRegex.test(formData.customerMobile)) {
        newErrors.customerMobile = 'Please enter a valid mobile number'
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!formData.customerEmail.trim()) {
        newErrors.customerEmail = 'Email Address is required'
      } else if (!emailRegex.test(formData.customerEmail)) {
        newErrors.customerEmail = 'Please enter a valid email address'
      }

      if (!formData.address.trim()) {
        newErrors.address = 'Client Address is required'
      }
    } else if (tab === 'items' || tab === 'products') {
      if (!formData.items || formData.items.length === 0) {
        showNotification('error', 'Please add at least one item to the quotation')
        return false
      }
    } else if (tab === 'transport_installation') {
      if (formData.transportStorage?.show && formData.transportStorage?.gstOption === 'withGst') {
        const rate = formData.transportStorage?.gstPercent
        if (rate === '' || rate === undefined || rate === null || isNaN(parseFloat(rate))) {
          showNotification('error', 'GST Rate is required for Transport & Storage when "With GST" is selected')
          return false
        }
      }
      if (formData.installation?.show && formData.installation?.gstOption === 'withGst') {
        const rate = formData.installation?.gstPercent
        if (rate === '' || rate === undefined || rate === null || isNaN(parseFloat(rate))) {
          showNotification('error', 'GST Rate is required for Installation when "With GST" is selected')
          return false
        }
      }
    }
    setErrors(newErrors)
    const isValid = Object.keys(newErrors).length === 0
    if (!isValid) {
      scrollToTop()
    }
    return isValid
  }

  const checkQuotationExistsAndGetVersions = (quoteNo) => {
    if (!quoteNo) return { exists: false, versions: [], highestVersionStr: 'V1', highestVersionNum: 1, matchingQuotes: [] }
    try {
      const list = allQuotations
      if (!Array.isArray(list)) return { exists: false, versions: [], highestVersionStr: 'V1', highestVersionNum: 1, matchingQuotes: [] }

      // Filter quotes matching the current quoteNo (case-insensitive) safely
      let matching = list.filter(q => q && q.quoteNo && q.quoteNo.trim().toLowerCase() === quoteNo.trim().toLowerCase())

      if (matching.length === 0) {
        return { exists: false, versions: [], highestVersionStr: 'V1', highestVersionNum: 1, matchingQuotes: [] }
      }

      // Extract versions
      const versions = matching.map(q => {
        const v = q.version
        return typeof v === 'number' ? `V${v}` : (v || 'V1')
      })

      // Find the version of the quotation we are currently editing
      const currentEditQuote = isEditMode && id ? matching.find(q => (q._id || q.id || '').toString() === id.toString()) : null
      const currentEditVersionNum = currentEditQuote ? (Number(currentEditQuote.version) || 1) : 1
      const currentEditVersionStr = `V${currentEditVersionNum}`

      // Parse highest version
      let maxNum = 1
      matching.forEach(q => {
        const val = q.version
        let num = 1
        if (typeof val === 'number') {
          num = val
        } else if (typeof val === 'string') {
          num = parseInt(val.replace(/\D/g, '')) || 1
        }
        if (num > maxNum) {
          maxNum = num
        }
      })
      const maxStr = `V${maxNum}`

      return {
        exists: true,
        matchingQuotes: matching,
        versions,
        highestVersionStr: maxStr,
        highestVersionNum: maxNum,
        currentEditVersionStr: currentEditVersionStr
      }
    } catch (e) {
      console.error("Error checking quotation versions:", e)
      return { exists: false, versions: [], highestVersionStr: 'V1', highestVersionNum: 1, matchingQuotes: [] }
    }
  }

  const handleSelectVersionOption = (option) => {
    if (option === 'existing') {
      setSaveAsNewVersion(false)
      if (isEditMode) {
        const currentEditQuote = versionOptions.matchingQuotes.find(q => (q._id || q.id || '').toString() === id.toString())
        const curVerNum = currentEditQuote ? (Number(currentEditQuote.version) || 1) : 1
        setFormData(prev => ({
          ...prev,
          version: curVerNum
        }))
      } else {
        const match = versionOptions.matchingQuotes.find(q => {
          const vNum = typeof q.version === 'number' ? q.version : (parseInt(q.version?.replace(/\D/g, '')) || 1)
          return vNum === versionOptions.highestVersionNum
        })
        if (match) {
          setOverwriteExistingQuoteId(match._id || match.id)
        }
        setFormData(prev => ({
          ...prev,
          version: versionOptions.highestVersionNum
        }))
      }
    } else if (option === 'new') {
      setSaveAsNewVersion(true)
      setOverwriteExistingQuoteId(null)
      const nextVerNum = versionOptions.highestVersionNum + 1
      setFormData(prev => ({
        ...prev,
        version: nextVerNum
      }))
    }
    setShowVersionModal(false)
    setActiveTab('preview')
  }

  const handleTabChange = (nextTab) => {
    // Validate customer tab first if leaving customer tab
    if (activeTab === 'customer' && nextTab !== 'customer') {
      if (!validateTab('customer')) return
    }

    // Validate items/products tab if moving forward from products tab or navigating to subsequent tabs
    const tabsAfterProducts = ['transport_installation', 'section', 'terms', 'intro_content', 'preview']
    if ((activeTab === 'items' || activeTab === 'products') && !['customer', 'requirements'].includes(nextTab)) {
      if (!validateTab('products')) return
    } else if (tabsAfterProducts.includes(nextTab) && activeTab !== 'items' && activeTab !== 'products') {
      if (!validateTab('products')) return
    }

    // Validate transport & installation tab if moving forward from transport_installation or navigating to subsequent tabs
    const tabsAfterTransport = ['section', 'terms', 'intro_content', 'preview']
    if (activeTab === 'transport_installation' && nextTab !== 'customer' && nextTab !== 'requirements' && nextTab !== 'products') {
      if (!validateTab('transport_installation')) return
    } else if (tabsAfterTransport.includes(nextTab) && activeTab !== 'items' && activeTab !== 'products' && activeTab !== 'customer' && activeTab !== 'requirements') {
      if (!validateTab('transport_installation')) return
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
      setFormData(prev => ({
        ...prev,
        version: isEditMode ? (Number(prev.version) || 1) : 1
      }))
      setActiveTab('preview')
    } else {
      setActiveTab(nextTab)
    }
  }

  // Download PDF — directly downloads the PDF file using html2pdf
  const handleDownloadPDF = async (uploadedQrUrl = null) => {
    const filename = getSafeQuotationFilename('Quotation', formData.quoteNo)
    const element = previewRef.current
    if (!element) return

    setIsSavingAndDownloading(true)
    try {
      let html = element.outerHTML
      if (uploadedQrUrl) {
        // replace blob or temporary preview URL with uploaded URL
        html = html.replace(/src="blob:[^"]+"/g, `src="${uploadedQrUrl}"`)
      }
      await downloadPDF(html, filename + '.pdf')
      showNotification('success', 'PDF downloaded successfully!')
    } catch (err) {
      console.error("PDF generation failed:", err)
      showNotification('error', 'Failed to generate PDF. Please try again.')
    } finally {
      setIsSavingAndDownloading(false)
      setSelectedQrFile(null) // reset selected file
      navigate('/quotations')
    }
  }

  // Submit & Save Form
  const handleSaveQuotation = async () => {
    if (!validateTab('customer')) {
      setActiveTab('customer')
      return
    }
    if (isQuotationNumberExists(formData.quoteNo, allQuotations, isEditMode ? id : null)) {
      showNotification('error', `Quotation number "${formData.quoteNo.trim()}" already exists. Duplicate quotation numbers are not allowed.`)
      setActiveTab('customer')
      setErrors(prev => ({
        ...prev,
        quoteNo: `Quotation number "${formData.quoteNo.trim()}" already exists. Duplicate quotation numbers are not allowed.`
      }))
      return
    }
    if (formData.items.length === 0) {
      showNotification('error', 'Please add at least one item under Items Details')
      setActiveTab('items')
      return
    }
    if (!validateTab('transport_installation')) {
      setActiveTab('transport_installation')
      return
    }

    setIsSavingAndDownloading(true)

    // Determine if we are updating an existing document
    let isUpdate = false
    let updateId = null

    if (isEditMode && !saveAsNewVersion) {
      isUpdate = true
      updateId = formData._id || formData.id
    } else if (!isEditMode && overwriteExistingQuoteId) {
      isUpdate = true
      updateId = overwriteExistingQuoteId
    }

    const isEuropeBank = formData.country === 'Europe' || formData.currency === 'EUR'
    const bankDetailsPayload = {
      showBankDetails: formData.showBankDetails !== false,
      bankContentIndia: isEuropeBank ? '' : (formData.bankDetails?.bankContentIndia || companySettings?.bankDetails?.bankContentIndia || ''),
      qrCodeIndia: isEuropeBank ? '' : (formData.bankDetails?.qrCodeIndia || companySettings?.bankDetails?.qrCodeIndia || ''),
      bankContentEurope: isEuropeBank ? (formData.bankDetails?.bankContentEurope || companySettings?.bankDetails?.bankContentEurope || '') : '',
      qrCodeEurope: isEuropeBank ? (formData.bankDetails?.qrCodeEurope || companySettings?.bankDetails?.qrCodeEurope || '') : ''
    }

    // Convert to default EUR for database storage if user was viewing in INR
    const isINR = formData.currency === 'INR'
    const rate = exchangeRate || 110.31

    let dbItems = formData.items
    let dbTransport = { ...formData.transportStorage, currency: 'INR' }
    let dbInstallation = { ...formData.installation, currency: 'INR' }

    if (isINR) {
      dbItems = formData.items.map(item => {
        const eurPrice = convertCurrency(item.price, 'INR', 'EUR', rate)
        const eurBasePrice = convertCurrency(item.basePrice !== undefined ? item.basePrice : item.price, 'INR', 'EUR', rate)
        const eurAccs = Array.isArray(item.selectedAccessories)
          ? item.selectedAccessories.map(a => ({ ...a, price: convertCurrency(a.price, 'INR', 'EUR', rate) }))
          : []
        const eurOpts = Array.isArray(item.selectedOptionals)
          ? item.selectedOptionals.map(o => ({ ...o, price: convertCurrency(o.price, 'INR', 'EUR', rate) }))
          : []

        return {
          ...item,
          price: eurPrice,
          basePrice: eurBasePrice,
          selectedAccessories: eurAccs,
          selectedOptionals: eurOpts
        }
      })
    }

    // Compute EUR totals for database storage
    const dbSubTotal = isINR
      ? dbItems.reduce((sum, item) => sum + ((parseInt(item.qty, 10) || 1) * parseFloat(item.price || 0)), 0)
      : formData.subTotal

    const dbDiscountAmount = (formData.discountPercent && parseFloat(formData.discountPercent) > 0)
      ? (dbSubTotal * (parseFloat(formData.discountPercent) / 100))
      : 0

    const dbTaxableAmount = dbSubTotal - dbDiscountAmount

    let dbGstAmount = 0
    if (companySettings?.hasGst === true || companySettings?.hasGst === 'yes') {
      if (formData.businessType === 'service') {
        const gstRate = parseFloat(formData.gstPercent || 0)
        dbGstAmount = dbTaxableAmount * (gstRate / 100)
      } else {
        dbItems.forEach(item => {
          const itemSub = (parseInt(item.qty, 10) || 1) * parseFloat(item.price || 0)
          const itemDiscount = itemSub * (parseFloat(formData.discountPercent || 0) / 100)
          const itemTaxable = itemSub - itemDiscount
          const itemGstRate = item.gstPercent !== undefined && item.gstPercent !== '' ? parseFloat(item.gstPercent) : parseFloat(formData.gstPercent || 0)
          dbGstAmount += itemTaxable * (itemGstRate / 100)
        })
      }
    }

    let dbGrandTotal = dbTaxableAmount + dbGstAmount
    if (formData.roundOff) {
      dbGrandTotal = Math.round(dbGrandTotal)
    }

    const payload = {
      ...formData,
      currency: 'EUR', // Database ALWAYS stores in default EUR
      subTotal: isINR ? dbSubTotal : formData.subTotal,
      discountAmount: isINR ? dbDiscountAmount : formData.discountAmount,
      taxableAmount: isINR ? dbTaxableAmount : formData.taxableAmount,
      gstAmount: isINR ? dbGstAmount : formData.gstAmount,
      grandTotal: isINR ? dbGrandTotal : formData.grandTotal,
      amount: `€${(isINR ? dbGrandTotal : formData.grandTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      amountInWords: convertNumberToWords(isINR ? dbGrandTotal : formData.grandTotal),
      bankDetails: bankDetailsPayload,
      country: formData.country || '',
      gstOption: formData.gstOption || ((formData.country || '').toLowerCase().includes('india') ? 'withGst' : 'withoutGst'),
      transportStorage: dbTransport,
      installation: dbInstallation,
      deliveryTerms: formData.deliveryTerms || {
        period: formData.deliveryPeriod,
        location: formData.deliveryLocation,
        freight: formData.freightCharges
      },
      sections: sections.map((sec, idx) => ({ ...sec, order: idx }))
    }

    if (Array.isArray(payload.requirements)) {
      payload.requirements = payload.requirements.map(req => ({
        requirementId: req.requirementId || req._id || '',
        title: req.title || '',
        value: req.value || ''
      }))
    }

    // Ensure items format is clean for backend (always in default EUR):
    payload.items = dbItems.map(item => {
      const itemGstRate = item.gstPercent !== undefined && item.gstPercent !== '' ? parseFloat(item.gstPercent) : parseFloat(formData.gstPercent || 0)

      return {
        productId: item.productId || '',
        productName: item.productName || item.desc || item.name || '',
        productDesc: item.productDesc || '',
        qty: item.qty,
        unit: item.unit || 'Nos',
        basePrice: item.basePrice !== undefined ? item.basePrice : (item.price || 0),
        price: item.price !== undefined ? item.price : (item.unitPrice || 0),
        gstPercent: itemGstRate,
        cgstPercent: 0,
        sgstPercent: 0,
        igstPercent: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        desc: item.desc || '',
        image: item.image || '',
        websiteUrl: item.websiteUrl || item.websiteLink || '',
        youtubeUrl: item.youtubeUrl || item.youtubeLink || '',
        technicalData: Array.isArray(item.technicalData) ? item.technicalData.filter(t => t.name || t.value) : [],
        selectedAccessories: Array.isArray(item.selectedAccessories) ? item.selectedAccessories : [],
        selectedOptionals: Array.isArray(item.selectedOptionals) ? item.selectedOptionals : []
      }
    })

    // Clean payload of internal database fields before sending
    delete payload._id
    delete payload.id
    delete payload.__v
    delete payload.createdAt
    delete payload.updatedAt

    try {
      let savedQuotation = null
      if (isUpdate) {
        const responseData = await updateQuotation(updateId, payload)
        savedQuotation = responseData.quotation
        showNotification('success', 'Quotation updated successfully!')
      } else {
        const responseData = await createQuotation(payload)
        savedQuotation = responseData.quotation
        showNotification('success', 'Quotation generated successfully!')
      }

      // Automatically download the PDF on success
      try {
        await handleDownloadPDF()
      } catch (pdfErr) {
        console.error("PDF generation failed during combined action:", pdfErr)
      }

    } catch (e) {
      setIsSavingAndDownloading(false)
      console.error("Error saving quotation", e)
      showNotification('error', e.response?.data?.message || 'Failed to save quotation')
    }
  }

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
            <h1 className="text-2xl font-bold tracking-tight text-brand-primary">
              {isEditMode ? `Edit Quotation Document` : 'Generate New Quotation'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Configure client details, subject line, custom line items, terms, and compile live preview.</p>
          </div>
        </div>

        {/* <button
          onClick={handleSaveQuotation}
          disabled={isSavingAndDownloading}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white font-semibold text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer rounded-[5px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          <span>{isSavingAndDownloading ? 'Processing...' : (isEditMode ? 'Save Changes' : 'Generate & Download')}</span>
        </button> */}
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
          onClick={() => handleTabChange('requirements')}
          className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer text-left md:text-center
            ${activeTab === 'requirements'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          2. Requirements
        </button>
        <button
          onClick={() => handleTabChange('products')}
          className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer text-left md:text-center
            ${(activeTab === 'products' || activeTab === 'items')
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          3. Products
        </button>
        <button
          onClick={() => handleTabChange('transport_installation')}
          className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer text-left md:text-center
            ${activeTab === 'transport_installation'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          4. Transport & Installation
        </button>
        <button
          onClick={() => handleTabChange('section')}
          className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer text-left md:text-center
            ${(activeTab === 'section' || activeTab === 'terms')
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          5. Sections
        </button>
        <button
          onClick={() => handleTabChange('intro_content')}
          className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer text-left md:text-center
            ${activeTab === 'intro_content'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          6. Intro Content
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
            <span>7. Preview</span>
          </span>
        </button>
      </div>

      {/* Tab Contents Workspace */}
      <div className="space-y-3.5 mt-2.5">

        {/* TAB 1: CUSTOMER DETAILS & SUBJECT */}
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
                  {parseQuotationNumberParts(formData.quoteNo, 'scale').prefix}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={parseQuotationNumberParts(formData.quoteNo, 'scale').seqStr}
                  onChange={handleQuoteSeqChange}
                  onBlur={handleQuoteSeqBlur}
                  placeholder="047"
                  className="flex-1 min-w-0 px-3 py-2 text-sm font-bold font-mono text-slate-800 text-center focus:outline-none bg-white placeholder:text-slate-300"
                />
                <span className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-semibold font-mono text-slate-600 bg-slate-100 border-l border-slate-200 select-none cursor-not-allowed whitespace-nowrap">
                  {parseQuotationNumberParts(formData.quoteNo, 'scale').suffix}
                </span>
              </div>
              {errors.quoteNo && <p className="text-[11px] text-rose-600 font-semibold">{errors.quoteNo}</p>}
            </div>



            {/* Dates */}
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
                className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white"
              />
            </div>


            {/* <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Valid Until Date
              </label>
              <input
                type="date"
                name="validity"
                value={formData.validity}
                onChange={handleInputChange}
                onClick={(e) => e.target.showPicker()}
                className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white"
              />
            </div> */}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Organization Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="Enter company name..."
                  list="companies-datalist"
                  className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all ${errors.companyName ? 'border-rose-350 bg-rose-50/10' : 'border-slate-200'}`}
                />
                <datalist id="companies-datalist">
                  {customers.map((c, idx) => (
                    <option key={c.id || idx} value={c.company} />
                  ))}
                </datalist>
                {errors.companyName && <p className="text-[11px] text-rose-600 font-semibold">{errors.companyName}</p>}
              </div>


              {/* Contact Person */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Contact Person <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Enter Contact Person"
                  className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all
                    ${errors.customerName ? 'border-rose-350 bg-rose-50/10' : 'border-slate-200'}`}
                />
                {errors.customerName && <p className="text-[11px] text-rose-600 font-semibold">{errors.customerName}</p>}
              </div>

              {/* Country & Currency in the same row */}
              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Country */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="country"
                    value={formData.country || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all
                      ${errors.country ? 'border-rose-350 bg-rose-50/10' : 'border-slate-200'}`}
                  >
                    <option value="">-- Select Country --</option>
                    <option value="India">India</option>
                    <option value="Europe">Europe</option>
                  </select>
                  {errors.country && <p className="text-[11px] text-rose-600 font-semibold">{errors.country}</p>}
                </div>

                {/* Currency */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Currency <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="currency"
                    value={formData.currency || 'EUR'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white font-semibold transition-all"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent bg-white uppercase font-bold tracking-wider text-slate-800 transition-all placeholder:font-normal placeholder:tracking-normal"
                  />
                  <p className="text-[11px] text-slate-400">
                    GST is calculated only after entering the client GST number.
                  </p>
                </div>
              )}

              {/* Mobile */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="customerMobile"
                  value={formData.customerMobile}
                  onChange={handleInputChange}
                  placeholder="Enter phone..."
                  className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all
                    ${errors.customerMobile ? 'border-rose-350 bg-rose-50/10' : 'border-slate-200'}`}
                />
                {errors.customerMobile && <p className="text-[11px] text-rose-600 font-semibold">{errors.customerMobile}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  placeholder="Enter email..."
                  className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all
                    ${errors.customerEmail ? 'border-rose-350 bg-rose-50/10' : 'border-slate-200'}`}
                />
                {errors.customerEmail && <p className="text-[11px] text-rose-600 font-semibold">{errors.customerEmail}</p>}
              </div>

              {/* Address */}
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Full Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Enter full address details..."
                  className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all
                    ${errors.address ? 'border-rose-355 bg-rose-50/10' : 'border-slate-200'}`}
                />
                {errors.address && <p className="text-[11px] text-rose-600 font-semibold">{errors.address}</p>}
              </div>

              {/* Shipping Address */}
              {/* <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Shipping Address (Optional)
                </label>
                <textarea
                  name="shippingAddress"
                  value={formData.shippingAddress || ''}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Enter shipping address (leave blank to use billing address)..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all"
                />
              </div> */}
            </div>
          </div>

          {/* SUBJECT */}
          {/* <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Quotation Subject Line <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="e.g. Supply and Installation of Industrial Automation Equipment"
                className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all
                  ${errors.subject ? 'border-rose-350 bg-rose-50/10' : 'border-slate-200'}`}
              />
              {errors.subject && <p className="text-[11px] text-rose-600 font-semibold">{errors.subject}</p>}
            </div>
          </div> */}

          {/* Next Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleTabChange('requirements')}
              className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold rounded-[5px] transition-colors cursor-pointer"
            >
              Continue to Requirements
            </button>
          </div>

        </div>

        {/* TAB 2: REQUIREMENTS */}
        <div className={activeTab === 'requirements' ? 'bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-6' : 'hidden'}>

          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-base font-bold text-slate-800">
              Requirement Details
            </h2>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-slate-700">
                Option Status:
              </span>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, requirementsOption: !(prev.requirementsOption !== false) }))}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.requirementsOption !== false ? 'bg-[#005a43]' : 'bg-slate-300'
                  } cursor-pointer`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${formData.requirementsOption !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[5px] overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-12 text-center">#</th>
                  <th className="px-5 py-3.5 w-1/3">Requirement Name</th>
                  <th className="px-5 py-3.5">Input / Specification Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {(!formData.requirements || formData.requirements.length === 0) ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-400 font-medium italic">
                      No requirements configured in database. You can manage requirements from the Requirements menu.
                    </td>
                  </tr>
                ) : (
                  formData.requirements.map((req, idx) => (
                    <tr key={req.requirementId || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-center font-bold text-slate-400 text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-800 text-sm">
                        {req.title}
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={req.value || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setFormData(prev => {
                              const updated = [...(prev.requirements || [])]
                              updated[idx] = { ...updated[idx], value: val }
                              return { ...prev, requirements: updated }
                            })
                          }}
                          placeholder={`Enter ${req.title} details...`}
                          className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800 transition-all"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Back/Next Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('customer')}
              className="px-5 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Customer
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('products')}
              className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold rounded-[5px] transition-colors cursor-pointer"
            >
              Continue to Products
            </button>
          </div>
        </div>

        {/* TAB 3: PRODUCTS */}
        <div className={(activeTab === 'products' || activeTab === 'items') ? 'space-y-3.5' : 'hidden'}>
          {/* Card 1: Add / Configure Product Panel */}
          <div className="bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-800">
                Add Products
              </h2>
            
            </div>

            {/* Primary Product Inputs - Two Rows */}
            <div className="space-y-4">
              {/* Row 1: Product Selection, Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Select Product catalog */}
                <div className="col-span-12 md:col-span-4 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Select Product Catalog
                  </label>
                  <div className="flex items-center gap-2">
                    {newItem.image && (
                      <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center">
                        <img
                          src={getImageUrl(newItem.image)}
                          alt="Product preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <select
                      value={newItem.productId}
                      onChange={handleProductSelect}
                      className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white font-medium text-slate-800 transition-all"
                    >
                      <option value="">-- Custom / Manual Item --</option>
                      {products.map(p => {
                        const convertedPrice = getConvertedPrice(p.unitPrice, p.currency || 'EUR', formData.currency)
                        const symbol = getCurrencySymbol(formData.currency)
                        return (
                          <option key={p._id || p.id} value={p._id || p.id}>
                            {p.name} ({symbol}{convertedPrice ? convertedPrice.toLocaleString() : '0'})
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                {/* Item Name */}
                <div className="col-span-12 md:col-span-4 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Item Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.productName}
                    onChange={(e) => setNewItem(prev => ({ ...prev, productName: e.target.value }))}
                    placeholder="Enter product name..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white font-semibold text-slate-800 transition-all"
                  />
                </div>

                {/* Description */}
                <div className="col-span-12 md:col-span-4 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newItem.productDesc}
                    onChange={(e) => setNewItem(prev => ({ ...prev, productDesc: e.target.value }))}
                    placeholder="Enter product description..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all"
                  />
                </div>

                {/* Website Link */}
                <div className="col-span-12 md:col-span-6 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Website Link
                  </label>
                  <input
                    type="text"
                    value={newItem.websiteUrl || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, websiteUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all"
                  />
                </div>

                {/* YouTube Link */}
                <div className="col-span-12 md:col-span-6 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    YouTube Link
                  </label>
                  <input
                    type="text"
                    value={newItem.youtubeUrl || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    placeholder="https://youtube.com/..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Qty, Unit & Base Rate */}
              <div className="grid grid-cols-12 gap-4 items-end">
                {/* Qty */}
                {/* <div className="col-span-4 md:col-span-2 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.qty}
                    onChange={(e) => setNewItem(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm text-center focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white font-bold transition-all"
                  />
                </div> */}

                {/* Unit */}
                {/* <div className="col-span-4 md:col-span-2 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g. Nos"
                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm text-center focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white transition-all"
                  />
                </div> */}

                {/* Base Rate */}
                <div className="col-span-4 md:col-span-3 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Base({currSymbol})
                  </label>
                  <input
                    type="number"
                    value={newItem.basePrice}
                    onChange={(e) => setNewItem(prev => ({ ...prev, basePrice: e.target.value, price: e.target.value }))}
                    placeholder="Base rate..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white font-medium transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Technical Specifications (Editable Name & Value) */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span>Technical Specifications</span>
                  <span className="text-[10px] font-normal text-slate-400">({newItem.technicalData?.length || 0} items)</span>
                </h4>
                <button
                  type="button"
                  onClick={handleAddTechDataRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px] rounded-[5px] transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3 h-3 text-brand-primary" />
                  <span>Add Spec Row</span>
                </button>
              </div>

              {newItem.technicalData && newItem.technicalData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {newItem.technicalData.map((tech, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tech.name}
                        onChange={(e) => handleTechDataChange(idx, 'name', e.target.value)}
                        placeholder="Spec Name (e.g. Capacity)"
                        className="w-1/2 px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent font-semibold text-slate-800 bg-slate-50/50 transition-all"
                      />
                      <span className="text-slate-400 font-bold">:</span>
                      <input
                        type="text"
                        value={tech.value}
                        onChange={(e) => handleTechDataChange(idx, 'value', e.target.value)}
                        placeholder="Spec Value (e.g. 500 Liters)"
                        className="w-1/2 px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent text-slate-700 bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTechDataRow(idx)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer shrink-0"
                        title="Remove spec"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No technical specs configured. Click "+ Add Spec Row" to add custom parameters.</p>
              )}
            </div>

            {/* Section 3: Select Accessories (Multiple with Editable Price) */}
            {newItem.availableAccessories && newItem.availableAccessories.length > 0 && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Select Accessories ({newItem.selectedAccessories?.length || 0} selected)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-white max-h-48 overflow-y-auto">
                  {newItem.availableAccessories.map((acc, idx) => {
                    const isSelected = (newItem.selectedAccessories || []).some(a => (a._id || a.name) === (acc._id || acc.name))
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 p-2.5 rounded transition-all select-none ${isSelected
                          ? 'border-2 border-emerald-600 bg-emerald-50/90 text-slate-900 shadow-2xs font-semibold'
                          : 'border border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 text-slate-600'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleAccessory(acc)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary accent-brand-primary cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              onClick={() => handleToggleAccessory(acc)}
                              className="font-bold text-xs truncate cursor-pointer hover:underline"
                            >
                              {acc.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[11px] font-bold text-slate-500">{currSymbol}</span>
                              <input
                                type="number"
                                value={acc.price !== undefined ? acc.price : ''}
                                onChange={(e) => handleAccessoryPriceChange(acc, e.target.value)}
                                placeholder="0"
                                className="w-20 px-1.5 py-0.5 border border-slate-300 rounded text-xs text-right font-bold focus:outline-none focus:border-brand-accent bg-white"
                              />
                            </div>
                          </div>
                          {acc.description && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{acc.description}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Section 4: Select Optionals (Multiple with Editable Price) */}
            {newItem.availableOptionals && newItem.availableOptionals.length > 0 && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Select Optional Items ({newItem.selectedOptionals?.length || 0} selected)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-white max-h-48 overflow-y-auto">
                  {newItem.availableOptionals.map((opt, idx) => {
                    const isSelected = (newItem.selectedOptionals || []).some(o => (o._id || o.name) === (opt._id || opt.name))
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 p-2.5 rounded transition-all select-none ${isSelected
                          ? 'border-2 border-emerald-600 bg-emerald-50/90 text-slate-900 shadow-2xs font-semibold'
                          : 'border border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 text-slate-600'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleOptional(opt)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary accent-brand-primary cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              onClick={() => handleToggleOptional(opt)}
                              className="font-bold text-xs truncate cursor-pointer hover:underline"
                            >
                              {opt.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[11px] font-bold text-slate-500">{currSymbol}</span>
                              <input
                                type="number"
                                value={opt.price !== undefined ? opt.price : ''}
                                onChange={(e) => handleOptionalPriceChange(opt, e.target.value)}
                                placeholder="0"
                                className="w-20 px-1.5 py-0.5 border border-slate-300 rounded text-xs text-right font-bold focus:outline-none focus:border-brand-accent bg-white"
                              />
                            </div>
                          </div>
                          {opt.description && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{opt.description}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Section 5: Real-time Price Calculation Summary & Add Button */}
            <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-[5px] border border-slate-200 shadow-xs">
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>Base Rate: <strong className="text-slate-800">{formatPrice(currentBasePrice, formData.currency)}</strong></span>
                  {currentAccTotal > 0 && (
                    <span className="text-emerald-700">Accessories: <strong>+{formatPrice(currentAccTotal, formData.currency)}</strong></span>
                  )}
                  {currentOptTotal > 0 && (
                    <span className="text-indigo-700">Optionals: <strong>+{formatPrice(currentOptTotal, formData.currency)}</strong></span>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2 pt-1">
                  <span>Calculated Unit Rate:</span>
                  <span className="text-brand-primary font-extrabold text-base">{formatPrice(currentCalculatedUnitPrice, formData.currency)}</span>
                  <span className="text-slate-400 text-xs font-normal">| Total Line Amount ({newItem.qty || 1} {newItem.unit || 'Nos'}): <strong className="text-slate-800">{formatPrice(currentCalculatedLineTotal, formData.currency)}</strong></span>
                </div>
              </div>

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

          {/* Card 2: Added Products Table Section */}
          <div className="bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-primary" />
                <span>Added Products List ({formData.items.length})</span>
              </h3>
            </div>
            <div className="border border-slate-200 rounded-[5px] overflow-auto max-h-[420px] bg-white shadow-xs">
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold uppercase tracking-wider text-slate-500 text-xs">
                    <th className="px-6 py-3 w-16 text-center">S.No</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 w-28 text-center">Qty</th>
                    <th className="px-6 py-3 w-24 text-center">Unit</th>
                    <th className="px-6 py-3 w-32 text-right">Rate ({currSymbol})</th>
                    {isGstEnabled && formData.businessType === 'product' && (
                      <th className="px-6 py-3 w-32 text-right">Taxable ({currSymbol})</th>
                    )}

                    <th className="px-6 py-3 w-36 text-right">Amount ({currSymbol})</th>
                    <th className="px-6 py-3 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.length > 0 ? (
                    formData.items.map((item, index) => {
                      const itemSub = item.qty * parseFloat(item.price || 0)
                      const itemTaxable = itemSub
                      const itemGstRate = isGstEnabled && item.gstPercent !== undefined && item.gstPercent !== '' ? parseFloat(item.gstPercent) : (isGstEnabled ? parseFloat(formData.gstPercent || 0) : 0)
                      const itemGst = isGstEnabled ? itemTaxable * (itemGstRate / 100) : 0
                      const itemTotal = isGstEnabled ? itemTaxable + itemGst : itemTaxable

                      return (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3.5 text-center font-bold text-slate-400">{index + 1}</td>
                          <td className="px-6 py-3.5 text-xs text-slate-650">
                            <div className="flex items-center gap-3">
                              {item.image && (
                                <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center">
                                  <img
                                    src={getImageUrl(item.image)}
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-850">{item.productName}</span>
                                {item.productDesc && (
                                  <span className="text-[11px] text-slate-400 font-normal mt-1 whitespace-pre-line leading-relaxed">
                                    {item.productDesc}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDecreaseQty(index)}
                                disabled={item.qty <= 1}
                                className="w-5 h-5 flex items-center justify-center border border-slate-200 rounded-[3px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="font-bold text-slate-800 text-xs w-6 text-center select-none">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleIncreaseQty(index)}
                                className="w-5 h-5 flex items-center justify-center border border-slate-200 rounded-[3px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-center text-slate-500">{item.unit || 'Nos'}</td>
                          <td className="px-6 py-3.5 text-right text-slate-750 font-semibold">
                            {currSymbol}{fmtAmt(parseFloat(item.price || 0))}
                          </td>
                          {isGstEnabled && formData.businessType === 'product' ? (
                            <>
                              <td className="px-6 py-3.5 text-right font-medium text-slate-700">
                                {currSymbol}{fmtAmt(itemTaxable)}
                              </td>
                              <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                                {currSymbol}{fmtAmt(itemTotal)}
                              </td>
                            </>
                          ) : (
                            <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                              {currSymbol}{fmtAmt(itemSub)}
                            </td>
                          )}
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
                  ) : (
                    <tr>
                      <td colSpan={isGstEnabled && formData.businessType === 'product' ? 9 : 7} className="px-6 py-8 text-center text-slate-400 italic">
                        No items added yet. Configure above fields and click "+" to add quotation line items.
                      </td>
                    </tr>
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
                  <span className="block text-[10px] font-bold text-slate-455 uppercase tracking-wide flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span>Amount in Words (Auto-generated)</span>
                  </span>
                  <p className="font-bold text-brand-primary italic text-xs leading-relaxed mt-1">
                    {formData.amountInWords || 'Rupees Zero Only'}
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
                      value={formData.discountPercent !== undefined && formData.discountPercent !== null && formData.discountPercent !== 0 ? formData.discountPercent : ''}
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

                {/* IGST or CGST+SGST breakdown based on matching state */}
                {/* GST breakdown with editable percentage option */}
                {isGstEnabled && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <span>GST (%) :</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        name="gstPercent"
                        value={formData.gstPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
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

          {/* Back/Next Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('requirements')}
              className="px-5 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Requirements
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('transport_installation')}
              className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold rounded-[5px] transition-colors cursor-pointer"
            >
              Continue to Transport & Installation
            </button>
          </div>
        </div>

        {/* TAB 4: TRANSPORT & INSTALLATION CHARGES */}
        <div className={activeTab === 'transport_installation' ? 'bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-6' : 'hidden'}>
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
            Transport & Storage and Installation Charges
          </h2>

          {/* Transport & Storage Charges Card */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-[5px] space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-accent" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Transport & Storage Charges
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">Include Transport & Storage:</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    transportStorage: { ...prev.transportStorage, show: !prev.transportStorage?.show }
                  }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.transportStorage?.show ? 'bg-brand-accent' : 'bg-slate-200'
                    } cursor-pointer`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.transportStorage?.show ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>

            {formData.transportStorage?.show && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                {/* Row 1: Description / Item Name */}
                <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                  <label className="text-xs font-bold text-slate-700 w-full md:w-52 shrink-0 md:pt-2">
                    Description / Item Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex-1">
                    <textarea
                      rows={2}
                      value={formData.transportStorage?.name || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        transportStorage: { ...prev.transportStorage, name: e.target.value }
                      }))}
                      placeholder="e.g. Transport & storage cart"
                      className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800 min-h-[60px] leading-normal transition-all"
                    />
                  </div>
                </div>

                {/* Row 2: Currency & Price Amount */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <label className="text-xs font-bold text-slate-700 w-full md:w-52 shrink-0">
                    Currency & Price Amount <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex-1 flex items-center gap-3">
                    <select
                      disabled
                      value="INR"
                      className="w-32 px-3 py-2 border border-slate-200 rounded-[5px] text-sm bg-slate-100 font-bold text-slate-600 cursor-not-allowed select-none"
                    >
                      <option value="INR">INR (₹)</option>
                    </select>
                    <input
                      type="number"
                      value={formData.transportStorage?.price || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        transportStorage: { ...prev.transportStorage, price: e.target.value, currency: 'INR' }
                      }))}
                      placeholder="₹ 0.00"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800 font-bold transition-all"
                    />
                  </div>
                </div>

                {/* Row 3: GST Option */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 pt-1">
                  <label className="text-xs font-bold text-slate-700 w-full md:w-52 shrink-0">
                    GST Status / Option
                  </label>
                  <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <select
                      value={formData.transportStorage?.gstOption || 'withoutGst'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        transportStorage: { ...prev.transportStorage, gstOption: e.target.value }
                      }))}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white font-medium text-slate-800 transition-all"
                    >
                      <option value="">-- Select GST Option --</option>
                      <option value="withGst">With GST</option>
                      <option value="withoutGst">Without GST</option>
                    </select>
                    {formData.transportStorage?.gstOption === 'withGst' && (
                      <div className="flex items-center gap-1.5 shrink-0 bg-white px-3 py-1.5 border border-slate-200 rounded-[5px]">
                        <span className="text-xs text-slate-500 font-semibold">GST Rate <span className="text-rose-500">*</span>:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.transportStorage?.gstPercent !== undefined ? formData.transportStorage.gstPercent : ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            transportStorage: { ...prev.transportStorage, gstPercent: e.target.value }
                          }))}
                          className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-sm text-center font-bold bg-slate-50 focus:outline-none focus:border-brand-accent"
                        />
                        <span className="text-xs text-slate-600 font-bold">%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Breakdown Summary */}
                {parseFloat(formData.transportStorage?.price || 0) > 0 && (() => {
                  const { basePrice, gstAmount, totalPrice, rate, isWithGst } = calculateChargeBreakdown(formData.transportStorage)
                  const curr = 'INR'
                  return (
                    <div className="mt-3 p-3 bg-slate-100/90 rounded-[5px] border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-slate-600 font-medium">
                        Basic Price: <strong className="text-slate-850 font-bold">{formatPrice(basePrice, curr)}</strong>
                      </span>
                      {isWithGst && (
                        <span className="text-slate-600 font-medium">
                          GST Price ({rate}%): <strong className="text-slate-850 font-bold">{formatPrice(gstAmount, curr)}</strong>
                        </span>
                      )}
                      <span className="text-slate-700 font-bold">
                        Total Price: <strong className="text-brand-accent text-sm font-extrabold">{formatPrice(totalPrice, curr)}</strong>
                      </span>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Installation Charges Card */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-[5px] space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-accent" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Installation Charges Table
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">Include Installation Charges:</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    installation: { ...prev.installation, show: !prev.installation?.show }
                  }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.installation?.show ? 'bg-brand-accent' : 'bg-slate-200'
                    } cursor-pointer`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.installation?.show ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>

            {formData.installation?.show && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                {/* Row 1: Installation Description */}
                <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                  <label className="text-xs font-bold text-slate-700 w-full md:w-52 shrink-0 md:pt-2">
                    Installation Description <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex-1">
                    <textarea
                      rows={2}
                      value={formData.installation?.name || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        installation: { ...prev.installation, name: e.target.value }
                      }))}
                      placeholder="e.g. Installation & Commissioning Charges"
                      className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800 min-h-[60px] leading-normal transition-all"
                    />
                  </div>
                </div>

                {/* Row 2: Currency & Price Amount */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <label className="text-xs font-bold text-slate-700 w-full md:w-52 shrink-0">
                    Currency & Price Amount <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex-1 flex items-center gap-3">
                    <select
                      disabled
                      value="INR"
                      className="w-32 px-3 py-2 border border-slate-200 rounded-[5px] text-sm bg-slate-100 font-bold text-slate-600 cursor-not-allowed select-none"
                    >
                      <option value="INR">INR (₹)</option>
                    </select>
                    <input
                      type="number"
                      value={formData.installation?.price || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        installation: { ...prev.installation, price: e.target.value, currency: 'INR' }
                      }))}
                      placeholder="₹ 0.00"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800 font-bold transition-all"
                    />
                  </div>
                </div>

                {/* Row 3: GST Option */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 pt-1">
                  <label className="text-xs font-bold text-slate-700 w-full md:w-52 shrink-0">
                    GST Status / Option
                  </label>
                  <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <select
                      value={formData.installation?.gstOption || 'withoutGst'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        installation: { ...prev.installation, gstOption: e.target.value }
                      }))}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white font-medium text-slate-800 transition-all"
                    >
                      <option value="">-- Select GST Option --</option>
                      <option value="withGst">With GST</option>
                      <option value="withoutGst">Without GST</option>
                    </select>
                    {formData.installation?.gstOption === 'withGst' && (
                      <div className="flex items-center gap-1.5 shrink-0 bg-white px-3 py-1.5 border border-slate-200 rounded-[5px]">
                        <span className="text-xs text-slate-500 font-semibold">GST Rate <span className="text-rose-500">*</span>:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.installation?.gstPercent !== undefined ? formData.installation.gstPercent : ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            installation: { ...prev.installation, gstPercent: e.target.value }
                          }))}
                          className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-sm text-center font-bold bg-slate-50 focus:outline-none focus:border-brand-accent"
                        />
                        <span className="text-xs text-slate-600 font-bold">%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Breakdown Summary */}
                {parseFloat(formData.installation?.price || 0) > 0 && (() => {
                  const { basePrice, gstAmount, totalPrice, rate, isWithGst } = calculateChargeBreakdown(formData.installation)
                  const curr = 'INR'
                  return (
                    <div className="mt-3 p-3 bg-slate-100/90 rounded-[5px] border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-slate-600 font-medium">
                        Basic Price: <strong className="text-slate-850 font-bold">{formatPrice(basePrice, curr)}</strong>
                      </span>
                      {isWithGst && (
                        <span className="text-slate-600 font-medium">
                          GST Price ({rate}%): <strong className="text-slate-850 font-bold">{formatPrice(gstAmount, curr)}</strong>
                        </span>
                      )}
                      <span className="text-slate-700 font-bold">
                        Total Price: <strong className="text-brand-accent text-sm font-extrabold">{formatPrice(totalPrice, curr)}</strong>
                      </span>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Back/Next Buttons */}
          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="px-5 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Products
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('section')}
              className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold rounded-[5px] transition-colors cursor-pointer"
            >
              Continue to Custom Sections
            </button>
          </div>
        </div>

        {/* TAB 5: SECTION */}
        <div className={(activeTab === 'section' || activeTab === 'terms') ? 'bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-6' : 'hidden'}>
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
            Bank Details & Sections
          </h2>

          {/* Print Options Panel */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-[5px] flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-brand-accent" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Quotation Print Settings</span>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">Show Bank Details in Quotation:</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, showBankDetails: !prev.showBankDetails }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.showBankDetails ? 'bg-brand-accent' : 'bg-slate-200'
                    } cursor-pointer`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.showBankDetails ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
              {/* <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">Show Product Images in Quotation:</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, showProductImages: !prev.showProductImages }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.showProductImages !== false ? 'bg-brand-accent' : 'bg-slate-200'
                    } cursor-pointer`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.showProductImages !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div> */}
            </div>
          </div>

          {/* Bank Details Preview Info Card (shown only when showBankDetails is active) */}
          {formData.showBankDetails && (
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

          {/* Custom Sections Table */}
          <div className="bg-white border border-slate-200 rounded-[5px] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-accent" />
                <span>Custom Sections for this Quotation</span>
              </h3>
              <button
                type="button"
                onClick={handleOpenAddSection}
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
                      <td colSpan={3} className="px-5 py-8 text-center text-slate-400 font-medium">
                        No sections added yet. Click "Add Section" to create one.
                      </td>
                    </tr>
                  ) : (
                    sections.map((sec, idx) => (
                      <tr key={sec._id || sec.tempId || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-slate-800">
                          {sec.title}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSectionActive(sec._id, sec.tempId)}
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-all uppercase tracking-wide cursor-pointer
                              ${sec.isActive !== false
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
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
                              className={`p-1.5 hover:bg-slate-100 rounded-[5px] transition-colors border border-transparent hover:border-slate-200 
                                ${idx === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 hover:text-brand-primary cursor-pointer'}`}
                              title="Move Up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSectionDown(idx)}
                              disabled={idx === sections.length - 1}
                              className={`p-1.5 hover:bg-slate-100 rounded-[5px] transition-colors border border-transparent hover:border-slate-200 
                                ${idx === sections.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 hover:text-brand-primary cursor-pointer'}`}
                              title="Move Down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSection(sec)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-primary rounded-[5px] transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                              title="Edit Content"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteSectionModal(sec)}
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
              onClick={() => setActiveTab('transport_installation')}
              className="px-5 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Transport & Installation
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('intro_content')}
              className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold rounded-[5px] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Continue to Intro Content</span>
            </button>
          </div>
        </div>

        {/* TAB 6: INTRO CONTENT */}
        <div className={activeTab === 'intro_content' ? 'bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-6' : 'hidden'}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 text-left">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-primary" />
                <span>Introduction Content / Cover Letter</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Customize the introductory greeting text that appears at the top/beginning of this quotation sheet.
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
              </div>              <div className="bg-white rounded-[5px]">
                <div ref={introEditorRef} className="min-h-[220px]" />
              </div>
            </div>
          </div>

          {/* Buttons */}
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

        {/* TAB 7: PREVIEW */}
        <div className={activeTab === 'preview' ? 'bg-white p-6 border border-slate-200 rounded-[5px] shadow-xs space-y-6' : 'hidden'}>

          {/* Dynamic Preview Workspace */}
          <div className="flex justify-center bg-slate-100 p-6 md:p-8 rounded-[5px] border border-slate-200 overflow-x-auto">

            {selectedTemplate === 'current' && (
              <CurrentClassicTemplate
                ref={previewRef}
                formData={formData}
                companySettings={companySettings}
                getImageUrl={getImageUrl}
                isStateMatching={isStateMatching}
              />
            )}

            {/* Add new templates here when ready: */}
            {/* selectedTemplate === 'modern' && <ModernTemplate ref={previewRef} formData={formData} ... /> */}

          </div>

          {/* Back Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('section')}
              className="px-5 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Section
            </button>

            <button
              type="button"
              onClick={handleSaveQuotation}
              disabled={isSavingAndDownloading}
              className="flex items-center gap-2 px-6 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold rounded-[5px] shadow transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Save & Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* Version Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 w-full h-full min-h-screen">
          <div className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-[5px] overflow-hidden p-6 space-y-6 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-800">Quotation Version Detection</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Quotation number <span className="font-semibold text-slate-650">"{formData.quoteNo}"</span> already exists.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer animate-in duration-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Edit/Overwrite Existing */}
              <button
                type="button"
                onClick={() => handleSelectVersionOption('existing')}
                className="w-full text-left p-4 border border-slate-100 hover:border-brand-accent hover:bg-brand-accent-light/10 rounded-[5px] transition-all duration-200 group cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-850 group-hover:text-brand-accent">
                    Use Existing Version ({isEditMode ? versionOptions.currentEditVersionStr : versionOptions.highestVersionStr})
                  </span>
                  <span className="text-[10px] bg-slate-50 text-slate-400 border border-slate-100 px-2 py-0.5 rounded font-medium">
                    Overwrite
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-normal">
                  Saves your changes directly to version {isEditMode ? versionOptions.currentEditVersionStr : versionOptions.highestVersionStr}. The original version will be updated.
                </p>
              </button>

              {/* Option 2: Create New Version */}
              <button
                type="button"
                onClick={() => handleSelectVersionOption('new')}
                className="w-full text-left p-4 border border-slate-100 hover:border-brand-accent hover:bg-brand-accent-light/10 rounded-[5px] transition-all duration-200 group cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-850 group-hover:text-brand-accent">
                    Create New Version (V{versionOptions.highestVersionNum + 1})
                  </span>
                  <span className="text-[10px] bg-brand-accent-light text-brand-accent border border-brand-accent/10 px-2 py-0.5 rounded font-bold">
                    New Version
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-normal">
                  Increments the version number by +1. This creates a new standalone quotation document.
                </p>
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-500 text-xs font-semibold rounded-[5px] transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Section Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 w-full h-full min-h-screen">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 text-left">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-accent" />
                <span>{editingSection ? 'Edit Quotation Section' : 'Add Quotation Section'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-left">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Section Title
                </label>
                <input
                  type="text"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  placeholder="e.g. Terms & Conditions"
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Section Content (Rich Text)
                </label>
                <div className="border border-slate-200 rounded-[5px] overflow-hidden bg-white">
                  <div ref={modalEditorRef} className="min-h-[220px]"></div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">Active (Included in Quotation):</span>
                <button
                  type="button"
                  onClick={() => setSectionIsActive(!sectionIsActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${sectionIsActive ? 'bg-brand-accent' : 'bg-slate-200'
                    } cursor-pointer`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${sectionIsActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-500 text-xs font-semibold rounded-[5px] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSection}
                className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold rounded-[5px] transition-all active:scale-[0.98] cursor-pointer"
              >
                Save Section
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