import React, { useState, useEffect, useRef } from "react"
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Signature,
  Upload,
  Save,
  AlertCircle,
  Trash2,
  Building,
  X,
  Sparkles,
  Landmark,
  Plus,
  Edit,
  ArrowUp,
  ArrowDown,
  Paperclip,
  FileSpreadsheet,
  Image as ImageIcon
} from 'lucide-react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import Toast from "../components/Toast"
import ConfirmationModal from "../components/ConfirmationModal"
import { useAuth } from '../context/AuthContext'
import { getSettings, updateSettings } from '../services/settingService'

const IMAGE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/quotation-backend/api'

const getImageUrl = (filename) => {
  if (!filename) return ''
  if (filename.startsWith('data:') || filename.startsWith('http://') || filename.startsWith('https://')) return filename
  return `${IMAGE_BASE_URL}${filename}`
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry"
]

export default function Settings() {
  const { admin } = useAuth()
  const hasEditAccess = admin?.role === 'Admin' || admin?.permissions?.settingsAccess === 'yes'

  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    state: '',
    mobileNumber: '',
    emailAddress: '',
    hasGst: 'no',
    gstNumber: '',
    gstRate: '',
    authorizedSignatory: '',
    companyLogo: '',
    companySeal: '',
    pdfHeaderImage: '',
    pdfFooterImage: '',
    authSignatoryImage: '',
    defaultMailSubject: '',
    defaultMailBody: '',
    businessType: 'product',
    firstPageContent: '',
    showFirstPageContent: true,
    firstPageContentSpare: '',
    showFirstPageContentSpare: true
  })

  const [coverTab, setCoverTab] = useState('Scale') // 'Scale' | 'Spare Parts'
  const [sectionsTab, setSectionsTab] = useState('Scale') // 'Scale' | 'Spare Parts'
  const coverTabRef = useRef(coverTab)
  useEffect(() => {
    coverTabRef.current = coverTab
  }, [coverTab])

  const [bankTab, setBankTab] = useState('India') // 'India' | 'Europe'
  const [mailAttachments, setMailAttachments] = useState([])

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getAttachmentIcon = (ext) => {
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
      return <ImageIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
    }
    if (['pdf'].includes(ext)) {
      return <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
    }
    return <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
  }

  const handleAttachmentFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const MAX_SIZE = 15 * 1024 * 1024 // 15MB
    const validFiles = []
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        setNotification({
          type: 'error',
          message: `File "${file.name}" exceeds the 15MB limit.`
        })
        continue
      }
      validFiles.push({
        file,
        filename: file.name,
        originalName: file.name,
        size: file.size,
        mimetype: file.type
      })
    }

    if (validFiles.length > 0) {
      setMailAttachments(prev => [...prev, ...validFiles])
    }

    e.target.value = ''
  }

  const handleRemoveAttachment = (indexToRemove) => {
    setMailAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const [fileObjects, setFileObjects] = useState({
    companyLogo: null,
    companySeal: null,
    pdfHeaderImage: null,
    pdfFooterImage: null,
    authSignatoryImage: null,
    bankQrCodeIndia: null,
    bankQrCodeEurope: null
  })

  const [bankDetails, setBankDetails] = useState({
    qrCodeIndia: '',
    qrCodeEurope: '',
    bankContentIndia: '',
    bankContentEurope: '',
    showBankDetails: true
  })

  const handleBankChange = (field, value) => {
    setBankDetails(prev => ({
      ...prev,
      [field]: value
    }))
    if (errors[`bankDetails.${field}`]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[`bankDetails.${field}`]
        return next
      })
    }
  }

  const handleBankFileChangeIndia = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, bankQrCodeIndia: 'Please upload an image file (PNG, JPG, WEBP, SVG)' }))
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, bankQrCodeIndia: 'Image size should be less than 2MB' }))
        return
      }

      setFileObjects(prev => ({ ...prev, bankQrCodeIndia: file }))

      const reader = new FileReader()
      reader.onloadend = () => {
        setBankDetails(prev => ({ ...prev, qrCodeIndia: reader.result }))
        setErrors(prev => {
          const next = { ...prev }
          delete next.bankQrCodeIndia
          return next
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const removeBankFileIndia = () => {
    setBankDetails(prev => ({ ...prev, qrCodeIndia: '' }))
    setFileObjects(prev => ({ ...prev, bankQrCodeIndia: null }))
  }

  const handleBankFileChangeEurope = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, bankQrCodeEurope: 'Please upload an image file (PNG, JPG, WEBP, SVG)' }))
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, bankQrCodeEurope: 'Image size should be less than 2MB' }))
        return
      }

      setFileObjects(prev => ({ ...prev, bankQrCodeEurope: file }))

      const reader = new FileReader()
      reader.onloadend = () => {
        setBankDetails(prev => ({ ...prev, qrCodeEurope: reader.result }))
        setErrors(prev => {
          const next = { ...prev }
          delete next.bankQrCodeEurope
          return next
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const removeBankFileEurope = () => {
    setBankDetails(prev => ({ ...prev, qrCodeEurope: '' }))
    setFileObjects(prev => ({ ...prev, bankQrCodeEurope: null }))
  }

  const getBankInputClass = (fieldName) => {
    const baseClass = "w-full pl-10 pr-4 py-2.5 bg-white border transition-all text-sm focus:outline-none rounded-[5px] text-slate-800"
    if (errors[fieldName]) {
      return `${baseClass} border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/10`
    }
    return `${baseClass} border-slate-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent`
  }

  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState('')

  // Dynamic Custom Sections states & refs
  const [sections, setSections] = useState([])
  const [sectionsSpare, setSectionsSpare] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [sectionTitle, setSectionTitle] = useState('')
  const [sectionIsActive, setSectionIsActive] = useState(true)
  const [deleteConfirmSection, setDeleteConfirmSection] = useState(null)

  const modalEditorRef = useRef(null)
  const modalQuillRef = useRef(null)

  const firstPageEditorRef = useRef(null)
  const firstPageQuillRef = useRef(null)
  const bankIndiaEditorRef = useRef(null)
  const bankIndiaQuillRef = useRef(null)
  const bankEuropeEditorRef = useRef(null)
  const bankEuropeQuillRef = useRef(null)

  const [hasSetFirstPageContent, setHasSetFirstPageContent] = useState(false)
  const [firstPageCharCount, setFirstPageCharCount] = useState(0)
  const [showLimitToast, setShowLimitToast] = useState(false)

  // Auto-dismiss the limit toast warning after 3 seconds
  useEffect(() => {
    if (showLimitToast) {
      const timer = setTimeout(() => {
        setShowLimitToast(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showLimitToast])

  // Handle tab switch for cover page
  const handleCoverTabChange = (tab) => {
    if (firstPageQuillRef.current) {
      const html = firstPageQuillRef.current.root.innerHTML
      if (coverTab === 'Scale') {
        setFormData(prev => ({ ...prev, firstPageContent: html }))
      } else {
        setFormData(prev => ({ ...prev, firstPageContentSpare: html }))
      }
    }
    setCoverTab(tab)
  }

  // Initialize First Page Content Quill Editor
  useEffect(() => {
    if (firstPageEditorRef.current && !firstPageQuillRef.current) {
      firstPageQuillRef.current = new Quill(firstPageEditorRef.current, {
        theme: 'snow',
        placeholder: 'Enter first page cover or introduction content here...',
        readOnly: !hasEditAccess,
        modules: {
          toolbar: hasEditAccess ? [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
          ] : false
        }
      })

      firstPageQuillRef.current.on('text-change', () => {
        const text = firstPageQuillRef.current.getText()
        const length = text.endsWith('\n') ? text.length - 1 : text.length
        const html = firstPageQuillRef.current.root.innerHTML
        
        if (coverTabRef.current === 'Scale') {
          setFormData(prev => ({ ...prev, firstPageContent: html }))
        } else {
          setFormData(prev => ({ ...prev, firstPageContentSpare: html }))
        }

        // Clear firstPageContent validation error if user types
        if (length > 0) {
          setErrors(prev => {
            const next = { ...prev }
            delete next.firstPageContent
            return next
          })
        }

        if (length > 2560) {
          // Delete extra characters at the end
          firstPageQuillRef.current.deleteText(2560, length - 2560)
          const newText = firstPageQuillRef.current.getText()
          const newLength = newText.endsWith('\n') ? newText.length - 1 : newText.length
          setFirstPageCharCount(newLength)
          setShowLimitToast(true)
        } else {
          setFirstPageCharCount(length)
        }
      })
    }
  }, [hasEditAccess])

  // Synchronize cover content into editor when coverTab changes or data is loaded
  useEffect(() => {
    if (firstPageQuillRef.current) {
      const content = coverTab === 'Scale' ? formData.firstPageContent : formData.firstPageContentSpare
      firstPageQuillRef.current.root.innerHTML = content || ''
      const text = firstPageQuillRef.current.getText()
      const length = text.endsWith('\n') ? text.length - 1 : text.length
      setFirstPageCharCount(length)
    }
  }, [coverTab, hasSetFirstPageContent])

  // Initialize Bank India Quill Editor
  useEffect(() => {
    if (bankTab === 'India' && bankIndiaEditorRef.current && !bankIndiaQuillRef.current) {
      const quill = new Quill(bankIndiaEditorRef.current, {
        theme: 'snow',
        placeholder: 'Enter India bank details in rich text format...',
        readOnly: !hasEditAccess,
        modules: {
          toolbar: hasEditAccess ? [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
          ] : false
        }
      })
      bankIndiaQuillRef.current = quill

      const defaultIndia = bankDetails.bankContentIndia ||
        `<p><strong>Bank Name:</strong> SBI BANK</p><p><strong>Account Number:</strong> 123456789012</p><p><strong>IFSC Code:</strong> HDFC0004567</p><p><strong>Branch Name:</strong> Chennai Main Branch</p>`
      
      quill.root.innerHTML = defaultIndia

      quill.on('text-change', () => {
        const html = quill.root.innerHTML
        setBankDetails(prev => ({ ...prev, bankContentIndia: html }))
      })
    }
    return () => {
      if (bankTab !== 'India') {
        bankIndiaQuillRef.current = null
      }
    }
  }, [bankTab, hasEditAccess])

  // Initialize Bank Europe Quill Editor
  useEffect(() => {
    if (bankTab === 'Europe' && bankEuropeEditorRef.current && !bankEuropeQuillRef.current) {
      const quill = new Quill(bankEuropeEditorRef.current, {
        theme: 'snow',
        placeholder: 'Enter Europe bank details in rich text format (IBAN, BIC/SWIFT)...',
        readOnly: !hasEditAccess,
        modules: {
          toolbar: hasEditAccess ? [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
          ] : false
        }
      })
      bankEuropeQuillRef.current = quill

      const defaultEurope = bankDetails.bankContentEurope ||
        `<p><strong>Bank Name:</strong> Deutsche Bank / BNP Paribas</p><p><strong>IBAN:</strong> DE89370400440532013000</p><p><strong>BIC / SWIFT Code:</strong> DEUTDEDBXXX</p><p><strong>Branch:</strong> Frankfurt Main Branch</p>`

      quill.root.innerHTML = defaultEurope

      quill.on('text-change', () => {
        const html = quill.root.innerHTML
        setBankDetails(prev => ({ ...prev, bankContentEurope: html }))
      })
    }
    return () => {
      if (bankTab !== 'Europe') {
        bankEuropeQuillRef.current = null
      }
    }
  }, [bankTab, hasEditAccess])

  // Initialize Quill Editor inside Modal when opened
  useEffect(() => {
    if (isModalOpen && modalEditorRef.current && !modalQuillRef.current) {
      modalQuillRef.current = new Quill(modalEditorRef.current, {
        theme: 'snow',
        placeholder: 'Enter section content here...',
        readOnly: !hasEditAccess,
        modules: {
          toolbar: hasEditAccess ? [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
          ] : false
        }
      })

      // Set initial content if editing
      if (editingSection) {
        modalQuillRef.current.root.innerHTML = editingSection.content || ''
      } else {
        modalQuillRef.current.root.innerHTML = ''
      }
    }

    return () => {
      if (!isModalOpen) {
        modalQuillRef.current = null
      }
    }
  }, [isModalOpen, editingSection, hasEditAccess])

  // Load saved settings & custom sections on mount
  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        const data = await getSettings()
        const settings = data.settings
        if (settings) {
          setFormData({
            companyName: settings.companyDetails?.companyName || '',
            address: settings.companyDetails?.address || '',
            state: settings.companyDetails?.state || '',
            mobileNumber: settings.companyDetails?.mobileNumber || '',
            emailAddress: settings.companyDetails?.emailAddress || '',
            hasGst: settings.companyDetails?.hasGst ? 'yes' : 'no',
            gstNumber: settings.companyDetails?.gstNumber || '',
            gstRate: settings.companyDetails?.gstRate || settings.companyDetails?.igstRate || '',
            authorizedSignatory: settings.companyDetails?.authorizedSignatory || '',
            companyLogo: settings.companyDetails?.companyLogo || '',
            companySeal: settings.companyDetails?.companySeal || '',
            pdfHeaderImage: settings.companyDetails?.pdfHeaderImage || '',
            pdfFooterImage: settings.companyDetails?.pdfFooterImage || '',
            authSignatoryImage: settings.companyDetails?.authSignatoryImage || '',
            defaultMailSubject: settings.defaultMailAndSubject?.subject || '',
            defaultMailBody: settings.defaultMailAndSubject?.body || '',
            businessType: settings.companyDetails?.businessType || 'product',
            firstPageContent: settings.companyDetails?.firstPageContent || '',
            showFirstPageContent: settings.companyDetails?.showFirstPageContent === true,
            firstPageContentSpare: settings.companyDetails?.firstPageContentSpare || '',
            showFirstPageContentSpare: settings.companyDetails?.showFirstPageContentSpare === true
          })
          setMailAttachments(settings.defaultMailAndSubject?.attachments || [])
          setHasSetFirstPageContent(true)

          if (settings.bankDetails) {
            setBankDetails({
              qrCodeIndia: settings.bankDetails.qrCodeIndia || '',
              qrCodeEurope: settings.bankDetails.qrCodeEurope || '',
              bankContentIndia: settings.bankDetails.bankContentIndia || '',
              bankContentEurope: settings.bankDetails.bankContentEurope || '',
              showBankDetails: settings.bankDetails.showBankDetails !== false
            })
          }
          if (settings.sections) {
            setSections([...settings.sections].sort((a, b) => (a.order || 0) - (b.order || 0)))
          }
          if (settings.sectionsSpare) {
            setSectionsSpare([...settings.sectionsSpare].sort((a, b) => (a.order || 0) - (b.order || 0)))
          }
        }
      } catch (err) {
        console.error('Failed to fetch settings from backend', err)
      }
    }

    fetchSettingsData()
  }, [])

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
      alert("Please enter a section title")
      return
    }
    const content = modalQuillRef.current ? modalQuillRef.current.root.innerHTML : ''
    const updateTargetSections = sectionsTab === 'Scale' ? setSections : setSectionsSpare

    if (editingSection) {
      // Edit mode
      const editTargetId = editingSection.tempId || editingSection._id
      updateTargetSections(prev => prev.map(sec => {
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
      updateTargetSections(prev => [
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
    const updateTargetSections = sectionsTab === 'Scale' ? setSections : setSectionsSpare
    updateTargetSections(prev => prev.filter(sec => {
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

    const updateTargetSections = sectionsTab === 'Scale' ? setSections : setSectionsSpare
    updateTargetSections(prev => prev.map(sec => {
      const secId = sec.tempId || sec._id
      const isMatch = (targetId && secId && targetId === secId) ||
        sec === targetSec ||
        (targetTitle && sec.title === targetTitle)
      return isMatch ? { ...sec, isActive: !sec.isActive } : sec
    }))
  }

  const handleMoveSectionUp = (index) => {
    if (index === 0) return
    const updateTargetSections = sectionsTab === 'Scale' ? setSections : setSectionsSpare
    updateTargetSections(prev => {
      const updated = [...prev]
      const temp = updated[index]
      updated[index] = updated[index - 1]
      updated[index - 1] = temp
      return updated.map((sec, idx) => ({ ...sec, order: idx }))
    })
  }

  const handleMoveSectionDown = (index) => {
    const activeSections = sectionsTab === 'Scale' ? sections : sectionsSpare
    if (index === activeSections.length - 1) return
    const updateTargetSections = sectionsTab === 'Scale' ? setSections : setSectionsSpare
    updateTargetSections(prev => {
      const updated = [...prev]
      const temp = updated[index]
      updated[index] = updated[index + 1]
      updated[index + 1] = temp
      return updated.map((sec, idx) => ({ ...sec, order: idx }))
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, [fieldName]: 'Please upload an image file (PNG, JPG, WEBP, SVG)' }))
        return
      }
      // Validate file size (under 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, [fieldName]: 'Image size should be less than 2MB' }))
        return
      }

      setFileObjects(prev => ({ ...prev, [fieldName]: file }))

      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [fieldName]: reader.result }))
        setErrors(prev => {
          const next = { ...prev }
          delete next[fieldName]
          return next
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const removeFile = (fieldName) => {
    setFormData(prev => ({ ...prev, [fieldName]: '' }))
    setFileObjects(prev => ({ ...prev, [fieldName]: null }))
  }

  const validateForm = () => {
    const tempErrors = {}
    if (!formData.companyName.trim()) tempErrors.companyName = 'Company Name is required'
    if (!formData.state) tempErrors.state = 'State selection is required'
    if (!formData.address.trim()) tempErrors.address = 'Address is required'

    if (formData.showFirstPageContent) {
      const text = firstPageQuillRef.current ? firstPageQuillRef.current.getText().trim() : '';
      if (!text) {
        tempErrors.firstPageContent = 'Cover Page Content is required when Cover Page is enabled';
      }
    }

    // Mobile Validation
    const rawMobile = formData.mobileNumber.trim().replace(/[- ]/g, '')
    if (!formData.mobileNumber.trim()) {
      tempErrors.mobileNumber = 'Mobile Number is required'
    } else if (!/^\d{10}$/.test(rawMobile)) {
      tempErrors.mobileNumber = 'Please enter a valid 10-digit mobile number'
    }

    // Email Validation
    if (!formData.emailAddress.trim()) {
      tempErrors.emailAddress = 'Email Address is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.emailAddress.trim())) {
      tempErrors.emailAddress = 'Please enter a valid email address'
    }

    if (formData.hasGst === 'yes') {
      if (!formData.gstNumber || !formData.gstNumber.trim()) {
        tempErrors.gstNumber = 'GST Number is required'
      }
      if (formData.gstRate === '' || isNaN(parseFloat(formData.gstRate))) {
        tempErrors.gstRate = 'GST rate is required'
      }
    }

    if (!formData.authorizedSignatory.trim()) tempErrors.authorizedSignatory = 'Authorized Signatory is required'
    if (!formData.companyLogo) tempErrors.companyLogo = 'Company Logo is required'

    setErrors(tempErrors)
    return tempErrors
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaveStatus(null)
    setErrorMessage('')

    if (!hasEditAccess) {
      setErrorMessage('You do not have permission to edit settings.')
      setSaveStatus('error')
      return
    }

    const validationErrors = validateForm()
    const isValid = Object.keys(validationErrors).length === 0

    if (isValid) {
      setIsSaving(true)
      try {
        const fd = new FormData()
        fd.append('companyName', formData.companyName || '')
        fd.append('state', formData.state || '')
        fd.append('address', formData.address || '')
        fd.append('mobileNumber', formData.mobileNumber || '')
        fd.append('emailAddress', formData.emailAddress || '')
        fd.append('authorizedSignatory', formData.authorizedSignatory || '')
        fd.append('hasGst', formData.hasGst === 'yes' ? 'yes' : 'no')
        fd.append('gstNumber', formData.hasGst === 'yes' ? (formData.gstNumber || '') : '')
        fd.append('gstRate', formData.hasGst === 'yes' ? (formData.gstRate || '') : '')

        fd.append('defaultMailSubject', formData.defaultMailSubject || '')
        fd.append('defaultMailBody', formData.defaultMailBody || '')

        // Existing mail attachments preserved
        const preservedAttachments = mailAttachments.filter(item => !item.file)
        fd.append('existingAttachments', JSON.stringify(preservedAttachments))

        // New uploaded mail attachments
        mailAttachments.filter(item => item.file).forEach(item => {
          fd.append('mailAttachments', item.file)
        })

        fd.append('businessType', formData.businessType || 'product')
        const orderedSections = sections.map((sec, idx) => ({
          ...sec,
          order: idx
        }))
        const orderedSectionsSpare = sectionsSpare.map((sec, idx) => ({
          ...sec,
          order: idx
        }))
        fd.append('sections', JSON.stringify(orderedSections))
        fd.append('sectionsSpare', JSON.stringify(orderedSectionsSpare))

        // Ensure active coverTab Quill content is synced to formData before saving
        const currentQuillHtml = firstPageQuillRef.current ? firstPageQuillRef.current.root.innerHTML : ''
        const finalScaleCover = coverTab === 'Scale' ? currentQuillHtml : formData.firstPageContent
        const finalSpareCover = coverTab === 'Spare Parts' ? currentQuillHtml : formData.firstPageContentSpare

        fd.append('firstPageContent', finalScaleCover || '')
        fd.append('showFirstPageContent', formData.showFirstPageContent ? 'true' : 'false')
        fd.append('firstPageContentSpare', finalSpareCover || '')
        fd.append('showFirstPageContentSpare', formData.showFirstPageContentSpare ? 'true' : 'false')

        // Sync active Bank Quill content before saving
        const indiaQuillHtml = bankIndiaQuillRef.current ? bankIndiaQuillRef.current.root.innerHTML : bankDetails.bankContentIndia
        const europeQuillHtml = bankEuropeQuillRef.current ? bankEuropeQuillRef.current.root.innerHTML : bankDetails.bankContentEurope

        const cleanedBankDetails = {
          qrCodeIndia: (bankDetails.qrCodeIndia && bankDetails.qrCodeIndia.startsWith('data:')) ? '' : (bankDetails.qrCodeIndia || ''),
          qrCodeEurope: (bankDetails.qrCodeEurope && bankDetails.qrCodeEurope.startsWith('data:')) ? '' : (bankDetails.qrCodeEurope || ''),
          bankContentIndia: indiaQuillHtml || bankDetails.bankContentIndia || '',
          bankContentEurope: europeQuillHtml || bankDetails.bankContentEurope || '',
          showBankDetails: bankDetails.showBankDetails !== false
        }
        fd.append('bankDetails', JSON.stringify(cleanedBankDetails))

        if (fileObjects.bankQrCodeIndia) {
          fd.append('bankQrCodeIndia', fileObjects.bankQrCodeIndia)
        } else if (bankDetails.qrCodeIndia === '') {
          fd.append('bankQrCodeIndia', '')
        }

        if (fileObjects.bankQrCodeEurope) {
          fd.append('bankQrCodeEurope', fileObjects.bankQrCodeEurope)
        } else if (bankDetails.qrCodeEurope === '') {
          fd.append('bankQrCodeEurope', '')
        }

        const fileFields = ['companyLogo', 'companySeal', 'pdfHeaderImage', 'pdfFooterImage', 'authSignatoryImage']
        fileFields.forEach(field => {
          if (fileObjects[field]) {
            fd.append(field, fileObjects[field])
          } else if (formData[field] === '') {
            fd.append(field, '')
          }
        })

        const response = await updateSettings(fd)

        // Update states with updated settings from backend
        if (response.settings) {
          const settings = response.settings
          setFormData({
            companyName: settings.companyDetails?.companyName || '',
            address: settings.companyDetails?.address || '',
            state: settings.companyDetails?.state || '',
            mobileNumber: settings.companyDetails?.mobileNumber || '',
            emailAddress: settings.companyDetails?.emailAddress || '',
            hasGst: settings.companyDetails?.hasGst ? 'yes' : 'no',
            gstNumber: settings.companyDetails?.gstNumber || '',
            gstRate: settings.companyDetails?.gstRate || settings.companyDetails?.igstRate || '',
            authorizedSignatory: settings.companyDetails?.authorizedSignatory || '',
            companyLogo: settings.companyDetails?.companyLogo || '',
            companySeal: settings.companyDetails?.companySeal || '',
            pdfHeaderImage: settings.companyDetails?.pdfHeaderImage || '',
            pdfFooterImage: settings.companyDetails?.pdfFooterImage || '',
            authSignatoryImage: settings.companyDetails?.authSignatoryImage || '',
            defaultMailSubject: settings.defaultMailAndSubject?.subject || '',
            defaultMailBody: settings.defaultMailAndSubject?.body || '',
            businessType: settings.companyDetails?.businessType || 'product',
            firstPageContent: settings.companyDetails?.firstPageContent || '',
            showFirstPageContent: settings.companyDetails?.showFirstPageContent === true,
            firstPageContentSpare: settings.companyDetails?.firstPageContentSpare || '',
            showFirstPageContentSpare: settings.companyDetails?.showFirstPageContentSpare === true
          })
          setMailAttachments(settings.defaultMailAndSubject?.attachments || [])

          if (settings.bankDetails) {
            setBankDetails({
              qrCodeIndia: settings.bankDetails.qrCodeIndia || '',
              qrCodeEurope: settings.bankDetails.qrCodeEurope || '',
              bankContentIndia: settings.bankDetails.bankContentIndia || '',
              bankContentEurope: settings.bankDetails.bankContentEurope || '',
              showBankDetails: settings.bankDetails.showBankDetails !== false
            })
          }

          if (settings.sections) {
            setSections(settings.sections)
          }

          if (settings.sectionsSpare) {
            setSectionsSpare(settings.sectionsSpare)
          }

          // Reset file objects since they are now saved on the server
          setFileObjects({
            companyLogo: null,
            companySeal: null,
            pdfHeaderImage: null,
            pdfFooterImage: null,
            authSignatoryImage: null,
            bankQrCodeIndia: null,
            bankQrCodeEurope: null
          })
        }

        setSaveStatus('success')
        setTimeout(() => setSaveStatus(null), 3000)
      } catch (err) {
        console.error('Failed to save settings', err)
        const serverMsg = err.response?.data?.message || err.message || 'Failed to save settings. Please try again.'
        setErrorMessage(serverMsg)
        setSaveStatus('error')
      } finally {
        setIsSaving(false)
      }
    } else {
      setErrorMessage('Validation Error! Please check the highlighted inputs with red borders and fill them out correctly.')
      setSaveStatus('error')
      // Auto-scroll to first error element
      const firstErrorKey = Object.keys(validationErrors)[0]
      if (firstErrorKey) {
        const element = document.getElementsByName(firstErrorKey)[0]
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.focus()
        }
      }
    }
  }

  const getInputClass = (fieldName) => {
    const baseClass = "w-full pl-10 pr-4 py-2.5 bg-white border transition-all text-sm focus:outline-none rounded-[5px] text-slate-800"
    if (errors[fieldName]) {
      return `${baseClass} border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/10`
    }
    return `${baseClass} border-slate-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent`
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-primary">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure company profiles, contact details, GST, and brand assets for quotations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasEditAccess}
            className={`flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm transition-all shadow-md rounded-[5px]
            ${(isSaving || !hasEditAccess)
                ? 'bg-brand-primary/80 cursor-not-allowed'
                : 'bg-brand-primary hover:bg-brand-primary-light hover:shadow-brand-primary/10 active:scale-[0.98] cursor-pointer'}`}
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving...' : !hasEditAccess ? 'View Only' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-300">

        {/* Validation Status Notification */}
        {saveStatus === 'success' && (
          <Toast
            type="success"
            message="Settings Saved Successfully!"
            onClose={() => setSaveStatus(null)}
          />
        )}

        {saveStatus === 'error' && (
          <Toast
            type="error"
            message={errorMessage || "Validation Error! Please check the highlighted inputs with red borders and fill them out correctly."}
            onClose={() => setSaveStatus(null)}
          />
        )}

        {showLimitToast && (
          <Toast
            type="warning"
            message="Cover page content cannot exceed 2,560 characters."
            onClose={() => setShowLimitToast(false)}
          />
        )}

        {/* Section 1: Profile & Signatory Details */}
        <div className="bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
            <Building className="w-4.5 h-4.5 text-brand-accent" />
            <span>Company Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Company Name */}
            <div className="space-y-1.5">
              <label htmlFor="companyName" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Building2 className="w-4.5 h-4.5" />
                </span>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  placeholder="e.g. Alpha Solutions Pvt Ltd"
                  value={formData.companyName}
                  onChange={handleChange}
                  disabled={!hasEditAccess}
                  className={getInputClass('companyName')}
                />
              </div>
              {errors.companyName && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.companyName}</span>
                </p>
              )}
            </div>

            {/* State selection */}
            <div className="space-y-1.5">
              <label htmlFor="state" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                State <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <MapPin className="w-4.5 h-4.5" />
                </span>
                <select
                  id="state"
                  name="state"
                  value={formData.state || ''}
                  onChange={handleChange}
                  disabled={!hasEditAccess}
                  className={getInputClass('state')}
                >
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              {errors.state && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.state}</span>
                </p>
              )}
            </div>

            {/* Authorized Signatory */}
            <div className="col-span-1 sm:col-span-2 space-y-1.5">
              <label htmlFor="authorizedSignatory" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Authorized Signatory <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Signature className="w-4.5 h-4.5" />
                </span>
                <input
                  id="authorizedSignatory"
                  name="authorizedSignatory"
                  type="text"
                  placeholder="e.g. Director / Authorized Partner name"
                  value={formData.authorizedSignatory}
                  onChange={handleChange}
                  disabled={!hasEditAccess}
                  className={getInputClass('authorizedSignatory')}
                />
              </div>
              {errors.authorizedSignatory && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.authorizedSignatory}</span>
                </p>
              )}
            </div>

            {/* Address */}
            <div className="col-span-1 sm:col-span-2 space-y-1.5">
              <label htmlFor="address" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Company Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute top-3 left-3.5 text-slate-400">
                  <MapPin className="w-4.5 h-4.5" />
                </span>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  placeholder="Enter full physical address..."
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!hasEditAccess}
                  className={`w-full pl-10 pr-4 py-2.5 bg-white border transition-all text-sm focus:outline-none rounded-[5px] text-slate-800
                  ${errors.address ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/10' : 'border-slate-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent'}`}
                />
              </div>
              {errors.address && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.address}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label htmlFor="mobileNumber" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Phone className="w-4.5 h-4.5" />
                </span>
                <input
                  id="mobileNumber"
                  name="mobileNumber"
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  disabled={!hasEditAccess}
                  className={getInputClass('mobileNumber')}
                />
              </div>
              {errors.mobileNumber && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.mobileNumber}</span>
                </p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="emailAddress" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="w-4.5 h-4.5" />
                </span>
                <input
                  id="emailAddress"
                  name="emailAddress"
                  type="email"
                  placeholder="billing@company.com"
                  value={formData.emailAddress}
                  onChange={handleChange}
                  disabled={!hasEditAccess}
                  className={getInputClass('emailAddress')}
                />
              </div>
              {errors.emailAddress && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.emailAddress}</span>
                </p>
              )}
            </div>

            {/* GST Registration option (Yes/No) */}
            <div className="col-span-1 sm:col-span-2 space-y-2 border-t border-slate-50 pt-4">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                GST Registration
              </label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 text-sm text-slate-700 font-semibold ${hasEditAccess ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <input
                    type="radio"
                    name="hasGst"
                    value="yes"
                    checked={formData.hasGst === 'yes'}
                    onChange={handleChange}
                    disabled={!hasEditAccess}
                    className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-350"
                  />
                  <span>Yes</span>
                </label>
                <label className={`flex items-center gap-2 text-sm text-slate-700 font-semibold ${hasEditAccess ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <input
                    type="radio"
                    name="hasGst"
                    value="no"
                    checked={formData.hasGst === 'no'}
                    onChange={handleChange}
                    disabled={!hasEditAccess}
                    className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-350"
                  />
                  <span>No</span>
                </label>
              </div>

              {/* GST Conditional Fields */}
              {formData.hasGst === 'yes' && (
                <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50/20 border border-slate-100 rounded-[5px] animate-in fade-in duration-200">
                  {/* GST Number */}
                  <div className="space-y-1.5">
                    <label htmlFor="gstNumber" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      GST Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="gstNumber"
                      name="gstNumber"
                      type="text"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={formData.gstNumber}
                      onChange={handleChange}
                      disabled={!hasEditAccess}
                      className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white uppercase text-slate-800"
                    />
                    {errors.gstNumber && (
                      <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.gstNumber}</span>
                      </p>
                    )}
                  </div>

                  {/* GST Rate */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label htmlFor="gstRate" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      GST Rate (%) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="gstRate"
                      name="gstRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g. 18"
                      value={formData.gstRate}
                      onChange={handleChange}
                      disabled={!hasEditAccess}
                      className="w-32 px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white text-slate-800"
                    />
                    {errors.gstRate && (
                      <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.gstRate}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Business Type option (Product/Service) */}

            {/* {formData.hasGst === 'yes' && (
              <div className="col-span-1 sm:col-span-2 space-y-2 border-t border-slate-50 pt-4">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Services Type
                </label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 text-sm text-slate-700 font-semibold ${hasEditAccess ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="radio"
                      name="businessType"
                      value="product"
                      checked={formData.businessType === 'product'}
                      onChange={handleChange}
                      disabled={!hasEditAccess}
                      className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-350"
                    />
                    <span>Product Based</span>
                  </label>
                  <label className={`flex items-center gap-2 text-sm text-slate-700 font-semibold ${hasEditAccess ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="radio"
                      name="businessType"
                      value="service"
                      checked={formData.businessType === 'service'}
                      onChange={handleChange}
                      disabled={!hasEditAccess}
                      className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-350"
                    />
                    <span>Service Based</span>
                  </label>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-normal font-medium">
                  {formData.businessType === 'product' ? (
                    <span><strong>Note:</strong> In <strong>Product Based</strong> mode, GST is calculated and displayed for each individual product line item inside the quotation table.</span>
                  ) : (
                    <span><strong>Note:</strong> In <strong>Service Based</strong> mode, GST is calculated and displayed as a single consolidated amount on the total taxable price at the bottom of the quotation.</span>
                  )}
                </p>
              </div>
            )} */}

          </div>

          {/* Branding Upload Section Header & Info */}
          <div className="border-t border-slate-50 pt-5 space-y-3">
            <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-100 rounded-[5px]">
              <AlertCircle className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
              <div className="text-xs text-slate-500 leading-relaxed font-medium">
                <span className="font-bold text-slate-700 block mb-0.5">Image Upload Guidelines</span>
                For optimal layout and print rendering on quotations, please upload images in transparent <strong>PNG format</strong> or with a solid <strong>white background</strong>.
              </div>
            </div>

            {/* Branding Upload Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">

              {/* Company Logo (Mandatory) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Company Logo <span className="text-rose-500">*</span>
                </label>

                {!formData.companyLogo ? (
                  <label className={`group border border-dashed rounded-[5px] p-6 flex flex-col items-center justify-center gap-1.5 transition-colors bg-slate-50/50 h-44
                ${errors.companyLogo ? 'border-rose-300 bg-rose-50/5' : 'border-slate-200'}
                ${hasEditAccess ? 'cursor-pointer hover:bg-slate-50 hover:border-brand-accent' : 'cursor-not-allowed'}`}>
                    <div className="p-2.5 bg-white border border-slate-100 rounded-full shadow-sm text-slate-400 group-hover:text-brand-accent group-hover:border-brand-accent-light transition-all">
                      <Upload className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-brand-primary block">Upload Logo</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">PNG, JPG, WEBP or SVG (Max 2MB)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'companyLogo')}
                      disabled={!hasEditAccess}
                    />
                  </label>
                ) : (
                  <div className="border border-slate-100 p-3 rounded-[5px] bg-slate-50 flex flex-col items-center gap-2 relative group/preview h-44 justify-between">
                    <div className="w-full h-24 flex items-center justify-center bg-white border border-slate-100 rounded-[5px] p-1.5 overflow-hidden shadow-inner">
                      <img
                        src={getImageUrl(formData.companyLogo)}
                        alt="Company Logo Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    {hasEditAccess && (
                      <button
                        type="button"
                        onClick={() => removeFile('companyLogo')}
                        className="flex items-center justify-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs font-semibold rounded-[5px] transition-colors cursor-pointer w-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Logo</span>
                      </button>
                    )}
                  </div>
                )}

                {errors.companyLogo && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.companyLogo}</span>
                  </p>
                )}
              </div>

              {/* Company Seal (Optional) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Company Seal <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                </label>

                {!formData.companySeal ? (
                  <label className={`group border border-dashed rounded-[5px] p-6 flex flex-col items-center justify-center gap-1.5 transition-colors bg-slate-50/50 h-44
                ${errors.companySeal ? 'border-rose-300 bg-rose-50/5' : 'border-slate-200'}
                ${hasEditAccess ? 'cursor-pointer hover:bg-slate-50 hover:border-brand-accent' : 'cursor-not-allowed'}`}>
                    <div className="p-2 bg-white border border-slate-100 rounded-full shadow-sm text-slate-400 group-hover:text-brand-accent group-hover:border-brand-accent-light transition-all">
                      <Upload className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-brand-primary block">Upload Seal</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">PNG, JPG, WEBP or SVG (Max 2MB)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'companySeal')}
                      disabled={!hasEditAccess}
                    />
                  </label>
                ) : (
                  <div className="border border-slate-100 p-3 rounded-[5px] bg-slate-50 flex flex-col items-center gap-2 relative group/preview h-44 justify-between">
                    <div className="w-full h-24 flex items-center justify-center bg-white border border-slate-100 rounded-[5px] p-1.5 overflow-hidden shadow-inner">
                      <img
                        src={getImageUrl(formData.companySeal)}
                        alt="Company Seal Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    {hasEditAccess && (
                      <button
                        type="button"
                        onClick={() => removeFile('companySeal')}
                        className="flex items-center justify-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs font-semibold rounded-[5px] transition-colors cursor-pointer w-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Seal</span>
                      </button>
                    )}
                  </div>
                )}

                {errors.companySeal && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.companySeal}</span>
                  </p>
                )}
              </div>

              {/* PDF Header Image (Optional) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  PDF Header Image <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                </label>

                {!formData.pdfHeaderImage ? (
                  <label className={`group border border-dashed rounded-[5px] p-6 flex flex-col items-center justify-center gap-1.5 transition-colors bg-slate-50/50 h-44
                ${errors.pdfHeaderImage ? 'border-rose-300 bg-rose-50/5' : 'border-slate-200'}
                ${hasEditAccess ? 'cursor-pointer hover:bg-slate-50 hover:border-brand-accent' : 'cursor-not-allowed'}`}>
                    <div className="p-2 bg-white border border-slate-100 rounded-full shadow-sm text-slate-400 group-hover:text-brand-accent group-hover:border-brand-accent-light transition-all">
                      <Upload className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-brand-primary block">Upload Header Image</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">PNG, JPG, WEBP or SVG (Max 2MB)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'pdfHeaderImage')}
                      disabled={!hasEditAccess}
                    />
                  </label>
                ) : (
                  <div className="border border-slate-100 p-3 rounded-[5px] bg-slate-50 flex flex-col items-center gap-2 relative group/preview h-44 justify-between">
                    <div className="w-full h-24 flex items-center justify-center bg-white border border-slate-100 rounded-[5px] p-1.5 overflow-hidden shadow-inner">
                      <img
                        src={getImageUrl(formData.pdfHeaderImage)}
                        alt="PDF Header Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    {hasEditAccess && (
                      <button
                        type="button"
                        onClick={() => removeFile('pdfHeaderImage')}
                        className="flex items-center justify-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs font-semibold rounded-[5px] transition-colors cursor-pointer w-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Header</span>
                      </button>
                    )}
                  </div>
                )}

                {errors.pdfHeaderImage && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.pdfHeaderImage}</span>
                  </p>
                )}
              </div>

              {/* PDF Footer Image (Optional) */}
              {/* <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  PDF Footer Image <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                </label>

                {!formData.pdfFooterImage ? (
                  <label className={`group border border-dashed rounded-[5px] p-6 flex flex-col items-center justify-center gap-1.5 transition-colors bg-slate-50/50 h-44
                ${errors.pdfFooterImage ? 'border-rose-300 bg-rose-50/5' : 'border-slate-200'}
                ${hasEditAccess ? 'cursor-pointer hover:bg-slate-50 hover:border-brand-accent' : 'cursor-not-allowed'}`}>
                    <div className="p-2 bg-white border border-slate-100 rounded-full shadow-sm text-slate-400 group-hover:text-brand-accent group-hover:border-brand-accent-light transition-all">
                      <Upload className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-brand-primary block">Upload Footer Image</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">PNG, JPG, WEBP or SVG (Max 2MB)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'pdfFooterImage')}
                      disabled={!hasEditAccess}
                    />
                  </label>
                ) : (
                  <div className="border border-slate-100 p-3 rounded-[5px] bg-slate-50 flex flex-col items-center gap-2 relative group/preview h-44 justify-between">
                    <div className="w-full h-24 flex items-center justify-center bg-white border border-slate-100 rounded-[5px] p-1.5 overflow-hidden shadow-inner">
                      <img
                        src={getImageUrl(formData.pdfFooterImage)}
                        alt="PDF Footer Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    {hasEditAccess && (
                      <button
                        type="button"
                        onClick={() => removeFile('pdfFooterImage')}
                        className="flex items-center justify-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs font-semibold rounded-[5px] transition-colors cursor-pointer w-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Footer</span>
                      </button>
                    )}
                  </div>
                )}

                {errors.pdfFooterImage && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.pdfFooterImage}</span>
                  </p>
                )}
              </div> */}

              {/* Authorized Signatory Image (Optional) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Authorized Signatory Image <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                </label>
                <p className="text-[10px] text-slate-400 font-medium leading-normal">
                  For optimal rendering, upload a transparent PNG image, or a white background image with a black signature.
                </p>

                {!formData.authSignatoryImage ? (
                  <label className={`group border border-dashed rounded-[5px] p-6 flex flex-col items-center justify-center gap-1.5 transition-colors bg-slate-50/50 h-44
                ${errors.authSignatoryImage ? 'border-rose-300 bg-rose-50/5' : 'border-slate-200'}
                ${hasEditAccess ? 'cursor-pointer hover:bg-slate-50 hover:border-brand-accent' : 'cursor-not-allowed'}`}>
                    <div className="p-2 bg-white border border-slate-100 rounded-full shadow-sm text-slate-400 group-hover:text-brand-accent group-hover:border-brand-accent-light transition-all">
                      <Upload className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-center px-2">
                      <span className="text-xs font-bold text-brand-primary block">Upload Signature Image</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Transparent PNG or White BG with Black Signature (Max 2MB)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'authSignatoryImage')}
                      disabled={!hasEditAccess}
                    />
                  </label>
                ) : (
                  <div className="border border-slate-100 p-3 rounded-[5px] bg-slate-50 flex flex-col items-center gap-2 relative group/preview h-44 justify-between">
                    <div className="w-full h-24 flex items-center justify-center bg-white border border-slate-100 rounded-[5px] p-1.5 overflow-hidden shadow-inner">
                      <img
                        src={getImageUrl(formData.authSignatoryImage)}
                        alt="Signature Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    {hasEditAccess && (
                      <button
                        type="button"
                        onClick={() => removeFile('authSignatoryImage')}
                        className="flex items-center justify-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs font-semibold rounded-[5px] transition-colors cursor-pointer w-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Signature</span>
                      </button>
                    )}
                  </div>
                )}

                {errors.authSignatoryImage && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.authSignatoryImage}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 1 Footer Action */}
          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasEditAccess}
              className={`flex items-center justify-center gap-2 px-5 py-2 text-white font-semibold text-xs transition-all shadow-sm rounded-[5px]
              ${(isSaving || !hasEditAccess)
                  ? 'bg-brand-primary/80 cursor-not-allowed'
                  : 'bg-brand-primary hover:bg-brand-primary-light active:scale-[0.98] cursor-pointer'}`}
            >
              {isSaving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : !hasEditAccess ? 'View Only' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Section 2: First Page Cover / Intro Content */}
        <div className="bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-50 pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-brand-accent" />
              <span>First Page Cover / Intro Content</span>
            </h2>

            {/* Filter Tabs for Cover Page */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCoverTabChange('Scale')}
                className={`px-4 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer border shadow-xs ${coverTab === 'Scale'
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                Scale Cover
              </button>
              <button
                type="button"
                onClick={() => handleCoverTabChange('Spare Parts')}
                className={`px-4 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer border shadow-xs ${coverTab === 'Spare Parts'
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                Spare Parts Cover
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-450 leading-relaxed font-medium">
              If enabled, this cover page / introduction content is printed on the first page of the quotation document for <strong>{coverTab}</strong>, occupying the first page fully. The quotation line items and details will start on the second page.
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                  {coverTab} Cover Page Content
                </label>
                <span className="text-xs font-bold text-slate-400">
                  {firstPageCharCount.toLocaleString()} / 2,560 characters
                </span>
              </div>
              <div name="firstPageContent" className={`bg-white rounded-[5px] border ${errors.firstPageContent ? 'border-rose-500 bg-rose-50/10' : 'border-slate-250'}`}>
                <div ref={firstPageEditorRef} className="text-sm" style={{ minHeight: '280px' }} />
              </div>
              {errors.firstPageContent && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.firstPageContent}</span>
                </p>
              )}
            </div>
          </div>

          {/* Section 2 Footer Action */}
          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasEditAccess}
              className={`flex items-center justify-center gap-2 px-5 py-2 text-white font-semibold text-xs transition-all shadow-sm rounded-[5px]
              ${(isSaving || !hasEditAccess)
                  ? 'bg-brand-primary/80 cursor-not-allowed'
                  : 'bg-brand-primary hover:bg-brand-primary-light active:scale-[0.98] cursor-pointer'}`}
            >
              {isSaving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : !hasEditAccess ? 'View Only' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Section 3: Default Mail & Subject Settings */}
        <div className="bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
            <Mail className="w-4.5 h-4.5 text-brand-accent" />
            <span>Default Mail & Subject Settings</span>
          </h2>

          <div className="grid grid-cols-1 gap-5">
            {/* Default Mail Subject */}
            <div className="space-y-1.5">
              <label htmlFor="defaultMailSubject" className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                Mail Subject
              </label>
              <input
                id="defaultMailSubject"
                name="defaultMailSubject"
                type="text"
                placeholder="e.g. Official Business Quotation"
                value={formData.defaultMailSubject || ''}
                onChange={handleChange}
                disabled={!hasEditAccess}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all text-sm focus:outline-none rounded-[5px] text-slate-800"
              />
            </div>

            {/* Default Mail Body */}
            <div className="space-y-1.5">
              <label htmlFor="defaultMailBody" className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                Mail Body
              </label>
              <textarea
                id="defaultMailBody"
                name="defaultMailBody"
                rows={6}
                placeholder="Dear [Contact Person Name],..."
                value={formData.defaultMailBody || ''}
                onChange={handleChange}
                disabled={!hasEditAccess}
                className="min-h-[150px] w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all text-sm focus:outline-none rounded-[5px] text-slate-800 resize-y"
              />
              <p className="text-[11px] text-slate-400 font-medium">
                Tip: You can use placeholders like <strong>[Contact Person Name]</strong> (or <strong>{'{Contact Person}'}</strong>) and <strong>[Company Name]</strong>.
              </p>
            </div>
          </div>

          {/* Section 3 Footer Action */}
          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasEditAccess}
              className={`flex items-center justify-center gap-2 px-5 py-2 text-white font-semibold text-xs transition-all shadow-sm rounded-[5px]
              ${(isSaving || !hasEditAccess)
                  ? 'bg-brand-primary/80 cursor-not-allowed'
                  : 'bg-brand-primary hover:bg-brand-primary-light active:scale-[0.98] cursor-pointer'}`}
            >
              {isSaving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : !hasEditAccess ? 'View Only' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Dedicated Section: Attachment */}
        <div className="bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-50 pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Paperclip className="w-4.5 h-4.5 text-brand-accent" />
              <span>Attachment</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              Attached PDFs will automatically append as next pages of quotation PDF (Max 15MB each)
            </span>
          </div>

          <div className="space-y-3">
            {/* Attachments Chips & Add Button matching the wireframe */}
            <div className="flex flex-wrap items-center gap-2.5 p-4 bg-slate-50/60 border border-slate-200 rounded-[5px] min-h-[58px]">
              {mailAttachments.map((att, index) => {
                const displayName = att.originalName || att.filename || `Attachment-${index + 1}`
                const ext = (displayName.split('.').pop() || '').toLowerCase()
                return (
                  <div
                    key={att._id || att.id || att.path || index}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-[5px] text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-300 transition-colors group"
                    title={displayName}
                  >
                    {getAttachmentIcon(ext)}
                    <span className="max-w-[140px] sm:max-w-[220px] truncate">{displayName}</span>
                    {att.size ? (
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({formatFileSize(att.size)})
                      </span>
                    ) : null}
                    {hasEditAccess && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer ml-0.5"
                        title="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Add Attachment (+) Button */}
              {hasEditAccess && (
                <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 border border-dashed border-slate-300 hover:border-brand-accent bg-white hover:bg-brand-accent/5 text-slate-600 hover:text-brand-accent rounded-[5px] text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add File</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleAttachmentFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.xlsx,.xls,.csv,.doc,.docx,.txt"
                  />
                </label>
              )}

              {mailAttachments.length === 0 && !hasEditAccess && (
                <span className="text-xs text-slate-400 italic">No attachments configured</span>
              )}
            </div>
          </div>

          {/* Attachment Card Footer Action */}
          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasEditAccess}
              className={`flex items-center justify-center gap-2 px-5 py-2 text-white font-semibold text-xs transition-all shadow-sm rounded-[5px]
              ${(isSaving || !hasEditAccess)
                  ? 'bg-brand-primary/80 cursor-not-allowed'
                  : 'bg-brand-primary hover:bg-brand-primary-light active:scale-[0.98] cursor-pointer'}`}
            >
              {isSaving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : !hasEditAccess ? 'View Only' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Section 4: Bank Details */}
        <div className="bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-50 pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Landmark className="w-4.5 h-4.5 text-brand-accent" />
                <span>Bank Details</span>
              </h2>

              {/* Bank Country Filter Tabs */}
              <div className="flex items-center gap-2 sm:ml-4">
                <button
                  type="button"
                  onClick={() => setBankTab('India')}
                  className={`px-3.5 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer border ${bankTab === 'India'
                      ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  India (INR) Bank
                </button>
                <button
                  type="button"
                  onClick={() => setBankTab('Europe')}
                  className={`px-3.5 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer border ${bankTab === 'Europe'
                      ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  Europe (EUR) Bank
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-650 uppercase tracking-wider">Show in Quotation:</span>
              <button
                type="button"
                disabled={!hasEditAccess}
                onClick={() => handleBankChange('showBankDetails', !bankDetails.showBankDetails)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${bankDetails.showBankDetails ? 'bg-brand-accent' : 'bg-slate-200'
                  } ${hasEditAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${bankDetails.showBankDetails ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>

          {/* TAB 1: INDIA BANK DETAILS */}
          {bankTab === 'India' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Left 3 cols: India Quill Editor */}
                <div className="md:col-span-3 space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                    India Bank Details Content
                  </label>
                  <div className="bg-white rounded-[5px] border border-slate-200 bank-quill-container">
                    <div ref={bankIndiaEditorRef} className="text-sm" />
                  </div>
                </div>

                {/* Right 1 col: India QR Upload */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    India QR Code Image
                  </label>

                  {!bankDetails.qrCodeIndia ? (
                    <label className={`group border border-dashed rounded-[5px] p-2 flex flex-col items-center justify-center gap-1 transition-colors bg-white h-[148px]
                  ${errors.bankQrCodeIndia ? 'border-rose-300 bg-rose-50/5' : 'border-slate-200'}
                  ${hasEditAccess ? 'cursor-pointer hover:bg-slate-50 hover:border-brand-accent' : 'cursor-not-allowed'}`}>
                      <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm text-slate-400 group-hover:text-brand-accent transition-all">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-center">
                        <span className="text-[11px] font-bold text-brand-primary block">Upload India QR</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">PNG, JPG, WEBP or SVG (Max 2MB)</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBankFileChangeIndia}
                        disabled={!hasEditAccess}
                      />
                    </label>
                  ) : (
                    <div className="border border-slate-200 p-2 rounded-[5px] bg-slate-50 flex flex-col items-center gap-1.5 relative h-[148px] justify-between">
                      <div className="w-full h-20 flex items-center justify-center bg-white border border-slate-100 rounded-[5px] p-1 overflow-hidden shadow-inner">
                        <img
                          src={getImageUrl(bankDetails.qrCodeIndia)}
                          alt="India Bank QR Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      {hasEditAccess && (
                        <button
                          type="button"
                          onClick={removeBankFileIndia}
                          className="flex items-center justify-center gap-1 px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-[10px] font-semibold rounded-[5px] transition-colors cursor-pointer w-full"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove India QR</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EUROPE BANK DETAILS */}
          {bankTab === 'Europe' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Left 3 cols: Europe Quill Editor */}
                <div className="md:col-span-3 space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Europe Bank Details Content
                  </label>
                  <div className="bg-white rounded-[5px] border border-slate-200 bank-quill-container">
                    <div ref={bankEuropeEditorRef} className="text-sm" />
                  </div>
                </div>

                {/* Right 1 col: Europe QR Upload */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Europe QR Code Image
                  </label>

                  {!bankDetails.qrCodeEurope ? (
                    <label className={`group border border-dashed rounded-[5px] p-2 flex flex-col items-center justify-center gap-1 transition-colors bg-white h-[148px]
                  ${errors.bankQrCodeEurope ? 'border-rose-300 bg-rose-50/5' : 'border-slate-200'}
                  ${hasEditAccess ? 'cursor-pointer hover:bg-slate-50 hover:border-brand-accent' : 'cursor-not-allowed'}`}>
                      <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm text-slate-400 group-hover:text-brand-accent transition-all">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-center">
                        <span className="text-[11px] font-bold text-brand-primary block">Upload Europe QR</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">PNG, JPG, WEBP or SVG (Max 2MB)</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBankFileChangeEurope}
                        disabled={!hasEditAccess}
                      />
                    </label>
                  ) : (
                    <div className="border border-slate-200 p-2 rounded-[5px] bg-slate-50 flex flex-col items-center gap-1.5 relative h-[148px] justify-between">
                      <div className="w-full h-20 flex items-center justify-center bg-white border border-slate-100 rounded-[5px] p-1 overflow-hidden shadow-inner">
                        <img
                          src={getImageUrl(bankDetails.qrCodeEurope)}
                          alt="Europe Bank QR Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      {hasEditAccess && (
                        <button
                          type="button"
                          onClick={removeBankFileEurope}
                          className="flex items-center justify-center gap-1 px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-[10px] font-semibold rounded-[5px] transition-colors cursor-pointer w-full"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove Europe QR</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 4 Footer Action */}
          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasEditAccess}
              className={`flex items-center justify-center gap-2 px-5 py-2 text-white font-semibold text-xs transition-all shadow-sm rounded-[5px]
              ${(isSaving || !hasEditAccess)
                  ? 'bg-brand-primary/80 cursor-not-allowed'
                  : 'bg-brand-primary hover:bg-brand-primary-light active:scale-[0.98] cursor-pointer'}`}
            >
              {isSaving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : !hasEditAccess ? 'View Only' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Section 5: Dynamic Custom Sections */}
        <div className="bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-50 pb-3">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-brand-accent" />
                <span>Quotation Custom Sections</span>
              </h2>
              {/* Filter Tabs for Custom Sections */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSectionsTab('Scale')}
                  className={`px-4 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer border shadow-xs ${sectionsTab === 'Scale'
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  Scale
                </button>
                <button
                  type="button"
                  onClick={() => setSectionsTab('Spare Parts')}
                  className={`px-4 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer border shadow-xs ${sectionsTab === 'Spare Parts'
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  Spare Parts
                </button>
              </div>
            </div>

            {hasEditAccess && (
              <button
                type="button"
                onClick={handleOpenAddSection}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-primary text-white font-semibold text-xs transition-all hover:bg-brand-primary-light active:scale-[0.98] rounded-[5px] shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section ({sectionsTab})</span>
              </button>
            )}
          </div>

          {/* Sections Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-[5px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-5 py-3">Section Title ({sectionsTab})</th>
                  <th className="px-5 py-3 w-32 text-center">Status</th>
                  {hasEditAccess && <th className="px-5 py-3 w-40 text-center">Order</th>}
                  {hasEditAccess && <th className="px-5 py-3 w-32 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 text-sm">
                {(sectionsTab === 'Scale' ? sections : sectionsSpare).length === 0 ? (
                  <tr>
                    <td colSpan={hasEditAccess ? 4 : 2} className="px-5 py-10 text-center text-slate-400 font-medium">
                      No custom sections added for {sectionsTab} yet. Click "Add Section ({sectionsTab})" to create one.
                    </td>
                  </tr>
                ) : (
                  (sectionsTab === 'Scale' ? sections : sectionsSpare).map((sec, idx) => (
                    <tr key={sec._id || sec.tempId || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {sec.title}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          disabled={!hasEditAccess}
                          onClick={() => handleToggleSectionActive(sec._id, sec.tempId)}
                          className={`px-3 py-1 text-xs font-bold rounded-full transition-all uppercase tracking-wide
                            ${sec.isActive !== false
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'}
                            ${hasEditAccess ? 'cursor-pointer hover:scale-[1.03]' : 'cursor-not-allowed'}`}
                        >
                          {sec.isActive !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      {hasEditAccess && (
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
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
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs select-none">
                              {idx + 1}
                            </span>
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
                          </div>
                        </td>
                      )}
                      {hasEditAccess && (
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSection(sec)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-primary rounded-[5px] transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                              title="Edit Section"
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
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Form Actions Footer */}
          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !hasEditAccess}
              className={`flex items-center justify-center gap-2 px-5 py-2 text-white font-semibold text-xs transition-all shadow-sm rounded-[5px]
              ${(isSaving || !hasEditAccess)
                  ? 'bg-brand-primary/80 cursor-not-allowed'
                  : 'bg-brand-primary hover:bg-brand-primary-light active:scale-[0.98] cursor-pointer'}`}
            >
              {isSaving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : !hasEditAccess ? 'View Only' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Add/Edit Section Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200 animate-[fadeIn_0.2s_ease-out] w-full h-full min-h-screen">
          <div className="bg-white w-full max-w-2xl rounded-[5px] shadow-xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingSection ? 'Edit Custom Section' : 'Add New Custom Section'}
              </h3>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Section Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Section Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Terms of Warranty"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  disabled={!hasEditAccess}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent text-slate-800"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-[5px]">
                <div>
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-semibold text-slate-700">Show in Quotation</span>
                  <span className="text-[11px] text-slate-400 font-medium">Toggle whether this section renders in default quotations.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSectionIsActive(prev => !prev)}
                  disabled={!hasEditAccess}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none
                    ${sectionIsActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${sectionIsActive ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              {/* Rich Text Content */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Section Content
                </label>
                <div className="relative">
                  <div
                    ref={modalEditorRef}
                    className="w-full bg-white text-sm text-slate-800 border border-slate-200 rounded-[5px]"
                    style={{ minHeight: '150px' }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-[5px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {hasEditAccess && (
                <button
                  type="button"
                  onClick={handleSaveSection}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-light text-white font-semibold text-xs rounded-[5px] transition-colors shadow-sm cursor-pointer"
                >
                  Save Section
                </button>
              )}
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
            Are you sure you want to delete section <span className="font-bold text-slate-800">"{deleteConfirmSection?.title}"</span>? This action cannot be undone.
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