import React, { useState, useEffect, useRef } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
  Plus,
  X,
  Package,
  Check,
  Upload,
  Layers,
  Sparkles,
  FileText,
} from 'lucide-react'
import Toast from "../components/Toast"
import { useAuth } from '../context/AuthContext'
import {
  getProducts,
  createProduct,
  updateProduct
} from "../services/productService"

const IMAGE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/quotation-backend/api'

const getProductImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('data:') || imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  return `${IMAGE_BASE_URL}${imagePath}`
}

export default function AddProduct() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()

  const isEditMode = location.pathname.startsWith('/scales/edit/') || location.pathname.startsWith('/products/edit/')
  const editId = params.id

  const { admin } = useAuth()
  const hasAddAccess = admin?.role === 'Admin' || admin?.permissions?.productAdd === 'yes'
  const hasEditAccess = admin?.role === 'Admin' || admin?.permissions?.productEdit === 'yes'

  useEffect(() => {
    if (isEditMode && !hasEditAccess) {
      navigate('/scales')
    } else if (!isEditMode && !hasAddAccess) {
      navigate('/scales')
    }
  }, [isEditMode, hasEditAccess, hasAddAccess, navigate])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    productType: 'Scale',
    name: '',
    description: '',
    unitPrice: '',
    currency: 'EUR',
    websiteUrl: '',
    youtubeUrl: '',
    technicalData: [],
    accessories: [],
    optionals: []
  })

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [notification, setNotification] = useState(null)

  const technicalDataScrollRef = useRef(null)
  const accessoriesScrollRef = useRef(null)
  const optionalsScrollRef = useRef(null)

  const scrollToBottom = (ref) => {
    setTimeout(() => {
      if (ref.current) {
        ref.current.scrollTo({
          top: ref.current.scrollHeight,
          behavior: 'smooth'
        })
      }
    }, 50)
  }

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  // Fetch product for editing if editId is provided
  useEffect(() => {
    if (isEditMode && editId) {
      const fetchTargetProduct = async () => {
        try {
          const data = await getProducts()
          const prodList = data.products || []
          const target = prodList.find(p => (p._id || p.id) === editId)
          if (target) {
            setFormData({
              id: target._id || target.id,
              productType: target.productType || '',
              name: target.name || '',
              description: target.description || '',
              unitPrice: target.unitPrice ? target.unitPrice.toString() : '',
              currency: 'EUR',
              websiteUrl: target.websiteUrl || target.websiteLink || '',
              youtubeUrl: target.youtubeUrl || target.youtubeLink || '',
              technicalData: target.technicalData && Array.isArray(target.technicalData) ? target.technicalData.map(t => ({
                name: t.name || '',
                value: t.value || ''
              })) : [],
              accessories: target.accessories && Array.isArray(target.accessories) ? target.accessories.map(a => ({
                name: a.name || '',
                description: a.description || '',
                price: a.price ? a.price : '',
                image: a.image || '',
                websiteUrl: a.websiteUrl || a.websiteLink || '',
                youtubeUrl: a.youtubeUrl || a.youtubeLink || ''
              })) : [],
              optionals: target.optionals && Array.isArray(target.optionals) ? target.optionals.map(o => ({
                name: o.name || '',
                description: o.description || '',
                price: o.price ? o.price : '',
                image: o.image || '',
                websiteUrl: o.websiteUrl || o.websiteLink || '',
                youtubeUrl: o.youtubeUrl || o.youtubeLink || ''
              })) : []
            })
            setImageFile(null)
            setImagePreview(target.image ? getProductImageUrl(target.image) : null)
          } else {
            showNotification('error', 'Product not found')
            navigate('/scales')
          }
        } catch (e) {
          console.error("Error loading product detail", e)
          showNotification('error', 'Failed to load product details')
        }
      }
      fetchTargetProduct()
    }
  }, [isEditMode, editId])

  // Handle Main Product Image Upload
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, image: 'Please upload an image file (PNG, JPG, JPEG, WebP)' }))
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'Image size should be less than 5MB' }))
        return
      }

      setImageFile(file)
      setErrors(prev => ({ ...prev, image: '' }))

      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  // Basic input change handler
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // --- TECHNICAL DATA MANAGEMENT ---
  const handleAddTechnicalData = () => {
    setFormData(prev => ({
      ...prev,
      technicalData: [
        ...prev.technicalData,
        { name: '', value: '' }
      ]
    }))
    scrollToBottom(technicalDataScrollRef)
  }

  const handleTechnicalDataChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.technicalData]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, technicalData: updated }
    })
  }

  const handleRemoveTechnicalData = (index) => {
    setFormData(prev => ({
      ...prev,
      technicalData: prev.technicalData.filter((_, i) => i !== index)
    }))
  }

  // --- ACCESSORIES MANAGEMENT ---
  const handleAddAccessory = () => {
    setFormData(prev => ({
      ...prev,
      accessories: [
        ...prev.accessories,
        { name: '', description: '', price: '', image: '', websiteUrl: '', youtubeUrl: '' }
      ]
    }))
    scrollToBottom(accessoriesScrollRef)
  }

  const handleAccessoryChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.accessories]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, accessories: updated }
    })
  }

  const handleAccessoryImageUpload = (index, e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('error', 'Accessory image size should be less than 5MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        handleAccessoryChange(index, 'image', reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAccessory = (index) => {
    setFormData(prev => ({
      ...prev,
      accessories: prev.accessories.filter((_, i) => i !== index)
    }))
  }

  // --- OPTIONALS MANAGEMENT ---
  const handleAddOptional = () => {
    setFormData(prev => ({
      ...prev,
      optionals: [
        ...prev.optionals,
        { name: '', description: '', price: '', image: '', websiteUrl: '', youtubeUrl: '' }
      ]
    }))
    scrollToBottom(optionalsScrollRef)
  }

  const handleOptionalChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.optionals]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, optionals: updated }
    })
  }

  const handleOptionalImageUpload = (index, e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('error', 'Optional image size should be less than 5MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        handleOptionalChange(index, 'image', reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveOptional = (index) => {
    setFormData(prev => ({
      ...prev,
      optionals: prev.optionals.filter((_, i) => i !== index)
    }))
  }



  // Validate form
  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (formData.unitPrice === '' || formData.unitPrice === null) {
      newErrors.unitPrice = 'Unit price is required'
    } else {
      const price = parseFloat(formData.unitPrice)
      if (isNaN(price) || price <= 0) {
        newErrors.unitPrice = 'Please enter a valid positive price'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    const priceValue = parseFloat(formData.unitPrice || 0)

    const productPayload = new FormData()
    productPayload.append('name', formData.name.trim())
    productPayload.append('description', formData.description.trim())
    productPayload.append('unitPrice', priceValue)
    productPayload.append('currency', formData.currency || 'EUR')
    productPayload.append('websiteUrl', formData.websiteUrl.trim())
    productPayload.append('youtubeUrl', formData.youtubeUrl.trim())
    productPayload.append('technicalData', JSON.stringify(formData.technicalData))
    productPayload.append('accessories', JSON.stringify(formData.accessories))
    productPayload.append('optionals', JSON.stringify(formData.optionals))

    if (imageFile) {
      productPayload.append('image', imageFile)
    } else if (imagePreview === null) {
      productPayload.append('image', '')
    }

    try {
      if (isEditMode && formData.id) {
        await updateProduct(formData.id, productPayload)
        showNotification('success', `Product "${formData.name}" updated successfully`)
      } else {
        await createProduct(productPayload)
        showNotification('success', `Product "${formData.name}" created successfully`)
      }
      setTimeout(() => {
        navigate('/scales')
      }, 1000)
    } catch (err) {
      console.error(err)
      showNotification('error', err.response?.data?.message || 'Failed to save product')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-primary">
            {isEditMode ? 'Edit Product / Service' : 'Add New Product / Service'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditMode ? 'Update product details' : 'Add a new product or service'}
          </p>
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

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-200">

        {/* Card 1: Basic Product Information */}
        <div className="bg-white border border-slate-100 rounded-[5px] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-primary" />
              <span>Basic Product Details</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-5">

              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Product / Service Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Industrial Heavy Duty Mixer 500L"
                  className={`w-full px-3 py-2 bg-slate-50/40 border rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white transition-all outline-none ${errors.name
                    ? 'border-rose-400 bg-rose-50/10 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20'
                    }`}
                />
                {errors.name && <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.name}</p>}
              </div>

              {/* Currency & Unit Price */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Currency & Unit Price <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-3">
                  <div className="w-28 shrink-0 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center justify-center gap-1.5 select-none">
                    <span>EUR</span>
                    <span className="text-slate-500 font-semibold">(€)</span>
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-bold text-sm">
                      €
                    </span>
                    <input
                      type="number"
                      name="unitPrice"
                      step="0.01"
                      min="0.01"
                      value={formData.unitPrice}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={`w-full pl-7 pr-3 py-2 bg-slate-50/40 border rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white transition-all outline-none ${errors.unitPrice
                        ? 'border-rose-400 bg-rose-50/10 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20'
                        }`}
                    />
                  </div>
                </div>
                {errors.unitPrice && <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.unitPrice}</p>}
              </div>

              {/* Website Link */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Website Link</label>
                <input
                  type="url"
                  name="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/product-page"
                  className="w-full px-3 py-2 bg-slate-50/40 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all outline-none"
                />
              </div>

              {/* YouTube Link */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">YouTube Link</label>
                <input
                  type="url"
                  name="youtubeUrl"
                  value={formData.youtubeUrl}
                  onChange={handleChange}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 bg-slate-50/40 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all outline-none"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5 flex flex-col justify-between">
              {/* Product Image */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Product Image</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className={`h-24 flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3 text-center group transition-colors relative bg-slate-50/80 hover:bg-slate-100/60 ${imagePreview ? 'w-full sm:flex-1' : 'w-full'}`}>
                    <label className="w-full h-full flex items-center justify-center gap-3 cursor-pointer">
                      <Upload className="w-6 h-6 text-slate-700 group-hover:text-brand-accent transition-colors shrink-0" />
                      <div className="text-left">
                        <span className="block text-xs font-bold text-slate-800 group-hover:text-brand-accent">
                          {imagePreview ? 'Change Image' : 'Upload Image'}
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">PNG, JPG, WebP (Max 5MB)</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {imagePreview && (
                    <div className="w-24 h-24 border border-slate-200 rounded-xl p-1.5 relative bg-white flex items-center justify-center shadow-xs shrink-0 group">
                      <img
                        src={imagePreview}
                        alt="Product Preview"
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow-md transition-all cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {errors.image && <p className="text-[10px] text-rose-600 font-semibold mt-1">{errors.image}</p>}
              </div>

              {/* Product Description */}
              <div className="space-y-1.5 flex-1 flex flex-col">
                <label className="block text-sm font-semibold text-slate-700">
                  Product Description {formData.productType === 'Scale' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  name="description"
                  rows="7"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter comprehensive description, specifications, and parameters..."
                  className={`w-full flex-1 min-h-[140px] px-3 py-2 bg-slate-50/40 border rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white transition-all outline-none ${errors.description
                    ? 'border-rose-400 bg-rose-50/10 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20'
                    }`}
                ></textarea>
                {errors.description && <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.description}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Technical Data, Accessories, Optionals */}
        {/* Card 2: Technical Data Section */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-primary" />
                <span>Technical Data</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Configure technical parameters, specifications, and values for this product.</p>
            </div>
          </div>

          <div ref={technicalDataScrollRef} className="overflow-x-auto max-h-[380px] overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-30 bg-slate-100">
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-100">
                  <th className="py-2.5 px-4 text-xs font-semibold w-1/2">Parameter Name</th>
                  <th className="py-2.5 px-4 text-xs font-semibold w-1/2">Parameter Value</th>
                  <th className="py-2.5 px-3 text-xs font-semibold w-14 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 bg-white">
                {formData.technicalData.map((tech, index) => (
                  <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        placeholder="e.g. Capacity, Voltage, Power..."
                        value={tech.name}
                        onChange={(e) => handleTechnicalDataChange(index, 'name', e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        placeholder="e.g. 500 Liters, 415V 3-Phase..."
                        value={tech.value}
                        onChange={(e) => handleTechnicalDataChange(index, 'value', e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-normal focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveTechnicalData(index)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Delete Parameter"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {formData.technicalData.length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-10 text-center bg-slate-50/30">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <p className="text-xs text-slate-400 font-medium">No technical data added yet.</p>
                        <button
                          type="button"
                          onClick={handleAddTechnicalData}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Technical Parameter</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {formData.technicalData.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddTechnicalData}
                className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 font-semibold text-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New</span>
              </button>
            </div>
          )}
        </div>

        {/* Card 3: Accessories Section */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-accent" />
                <span>Accessories</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Configure standard accessories included or paired with this product.</p>
            </div>
          </div>

          <div ref={accessoriesScrollRef} className="overflow-x-auto max-h-[380px] overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse min-w-[1350px]">
              <thead className="sticky top-0 z-30 bg-slate-100">
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-100">
                  <th className="sticky left-0 bg-slate-100 z-30 py-2.5 px-3 text-xs font-semibold w-16 text-center">Image</th>
                  <th className="sticky left-16 bg-slate-100 z-30 py-2.5 px-3 text-xs font-semibold w-72">Accessory Name <span className="text-rose-500">*</span></th>
                  <th className="py-2.5 px-3 text-xs font-semibold w-64">Description</th>
                  <th className="py-2.5 px-3 text-xs font-semibold w-40">Rate ({formData.currency === 'EUR' ? '€' : '₹'})</th>
                  <th className="py-2.5 px-3 text-xs font-semibold w-72">Website Link</th>
                  <th className="py-2.5 px-3 text-xs font-semibold w-72">YouTube Link</th>
                  <th className="py-2.5 px-3 text-xs font-semibold w-14 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 bg-white">
                {formData.accessories.map((acc, index) => (
                  <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-20 py-2.5 px-3 text-center">
                      {acc.image ? (
                        <div className="w-9 h-9 rounded-lg border border-slate-200 overflow-hidden relative group inline-block">
                          <img src={getProductImageUrl(acc.image)} alt="Accessory" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleAccessoryChange(index, 'image', '')}
                            className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="w-9 h-9 rounded-lg border border-dashed border-slate-300 hover:border-brand-accent bg-slate-50 inline-flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-brand-accent transition-colors">
                          <Upload className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleAccessoryImageUpload(index, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </td>
                    <td className="sticky left-16 bg-white group-hover:bg-slate-50 transition-colors z-20 py-2.5 px-3">
                      <input
                        type="text"
                        placeholder="Enter accessory name..."
                        value={acc.name}
                        onChange={(e) => handleAccessoryChange(index, 'name', e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        placeholder="Optional description..."
                        value={acc.description}
                        onChange={(e) => handleAccessoryChange(index, 'description', e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-normal focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 text-sm font-bold">{formData.currency === 'EUR' ? '€' : '₹'}</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={acc.price || ''}
                          onChange={(e) => handleAccessoryChange(index, 'price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full pl-8 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={acc.websiteUrl || ''}
                        onChange={(e) => handleAccessoryChange(index, 'websiteUrl', e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="url"
                        placeholder="https://youtube.com/..."
                        value={acc.youtubeUrl || ''}
                        onChange={(e) => handleAccessoryChange(index, 'youtubeUrl', e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveAccessory(index)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Delete Row"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {formData.accessories.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-10 text-center bg-slate-50/30">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <p className="text-xs text-slate-400 font-medium">No accessories added yet.</p>
                        <button
                          type="button"
                          onClick={handleAddAccessory}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add New Accessory</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {formData.accessories.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddAccessory}
                className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 font-semibold text-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New</span>
              </button>
            </div>
          )}
        </div>

        {/* Card 4: Optionals Section */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-accent" />
                <span>Optionals</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Configure optional upgrade equipment available for this product.</p>
            </div>
          </div>

          <div ref={optionalsScrollRef} className="overflow-x-auto max-h-[380px] overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse min-w-[1350px]">
              <thead className="sticky top-0 z-30 bg-slate-100">
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-100">
                  <th className="sticky left-0 bg-slate-100 z-30 py-2.5 px-3 text-xs font-semibold w-16 text-center">Image</th>
                  <th className="sticky left-16 bg-slate-100 z-30 py-2.5 px-3 text-xs font-semibold w-72">Optional Feature Name <span className="text-rose-500">*</span></th>
                  <th className="py-2.5 px-3 text-xs font-semibold w-64">Description</th>
                  <th className="py-2.5 px-3 text-xs font-semibold w-40">Rate ({formData.currency === 'EUR' ? '€' : '₹'})</th>
                  <th className="py-2.5 px-3 text-xs font-semibold w-72">Website Link</th>
                  <th className="py-2.5 px-3 text-xs font-semibold w-72">YouTube Link</th>
                  <th className="py-2.5 px-3 text-xs font-semibold w-14 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 bg-white">
                {formData.optionals.map((opt, index) => (
                  <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-20 py-2.5 px-3 text-center">
                      {opt.image ? (
                        <div className="w-9 h-9 rounded-lg border border-slate-200 overflow-hidden relative group inline-block">
                          <img src={getProductImageUrl(opt.image)} alt="Optional" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleOptionalChange(index, 'image', '')}
                            className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="w-9 h-9 rounded-lg border border-dashed border-slate-300 hover:border-brand-accent bg-slate-50 inline-flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-brand-accent transition-colors">
                          <Upload className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleOptionalImageUpload(index, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </td>
                    <td className="sticky left-16 bg-white group-hover:bg-slate-50 transition-colors z-20 py-2.5 px-3">
                      <input
                        type="text"
                        placeholder="Enter optional feature name..."
                        value={opt.name}
                        onChange={(e) => handleOptionalChange(index, 'name', e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        placeholder="Optional description..."
                        value={opt.description}
                        onChange={(e) => handleOptionalChange(index, 'description', e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-normal focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 text-sm font-bold">{formData.currency === 'EUR' ? '€' : '₹'}</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={opt.price || ''}
                          onChange={(e) => handleOptionalChange(index, 'price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full pl-8 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={opt.websiteUrl || ''}
                        onChange={(e) => handleOptionalChange(index, 'websiteUrl', e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="url"
                        placeholder="https://youtube.com/..."
                        value={opt.youtubeUrl || ''}
                        onChange={(e) => handleOptionalChange(index, 'youtubeUrl', e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 bg-slate-50/40 focus:bg-white transition-all"
                      />
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveOptional(index)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Delete Row"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {formData.optionals.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-10 text-center bg-slate-50/30">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <p className="text-xs text-slate-400 font-medium">No optionals added yet.</p>
                        <button
                          type="button"
                          onClick={handleAddOptional}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add New Optional</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {formData.optionals.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddOptional}
                className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 font-semibold text-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/scales')}
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-[5px] transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold rounded-[5px] transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isEditMode ? 'Save Changes' : 'Create Product & Save'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
