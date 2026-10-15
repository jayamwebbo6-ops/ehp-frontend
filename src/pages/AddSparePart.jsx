import React, { useState, useEffect } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
  Wrench,
  Upload,
  X,
  Check,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import Toast from "../components/Toast"
import { useAuth } from '../context/AuthContext'
import {
  getSpareParts,
  getSparePartById,
  createSparePart,
  updateSparePart
} from "../services/sparePartService"

const IMAGE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/quotation-backend/api'

const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('data:') || imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  return `${IMAGE_BASE_URL}${imagePath}`
}

export default function AddSparePart() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()

  const isEditMode = location.pathname.startsWith('/spare-parts/edit/')
  const editId = params.id

  const { admin } = useAuth()
  const hasAddAccess = admin?.role === 'Admin' || admin?.permissions?.sparePartsAdd === 'yes'
  const hasEditAccess = admin?.role === 'Admin' || admin?.permissions?.sparePartsEdit === 'yes'

  useEffect(() => {
    if (isEditMode && !hasEditAccess) {
      navigate('/spare-parts')
    } 
    else if (!isEditMode && !hasAddAccess) {
      navigate('/spare-parts')
    }
    
  }, [isEditMode, hasEditAccess, hasAddAccess, navigate])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    artNo: '',
    price: '',
    currency: 'EUR',
    hsnCode: '',
    description: ''
  })

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [notification, setNotification] = useState(null)

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  // Fetch spare part for editing
  useEffect(() => {
    if (isEditMode && editId) {
      const fetchTargetPart = async () => {
        try {
          let target;
          try {
            const res = await getSparePartById(editId)
            target = res.sparePart
          } catch {
            const data = await getSpareParts()
            const partsList = data.spareParts || []
            target = partsList.find(p => (p._id || p.id) === editId)
          }

          if (target) {
            setFormData({
              id: target._id || target.id,
              name: target.name || '',
              artNo: target.artNo || '',
              price: target.price !== undefined && target.price !== null ? target.price.toString() : '',
              currency: target.currency || 'EUR',
              hsnCode: target.hsnCode || '',
              description: target.description || ''
            })
            setImageFile(null)
            setImagePreview(target.image ? getImageUrl(target.image) : null)
          } else {
            showNotification('error', 'Spare part not found')
            navigate('/spare-parts')
          }
        } catch (e) {
          console.error("Error loading spare part detail", e)
          showNotification('error', 'Failed to load spare part details')
        }
      }
      fetchTargetPart()
    }
  }, [isEditMode, editId])

  // Image change handler
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

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Spare Parts Name is required'
    }

    if (formData.price === '' || formData.price === null || formData.price === undefined) {
      newErrors.price = 'Unit price is required'
    } else {
      const price = parseFloat(formData.price)
      if (isNaN(price) || price <= 0) {
        newErrors.price = 'Please enter a valid positive unit price'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    const priceValue = formData.price !== '' ? parseFloat(formData.price) : 0

    const payload = new FormData()
    payload.append('name', formData.name.trim())
    payload.append('artNo', formData.artNo.trim())
    payload.append('price', priceValue)
    payload.append('currency', formData.currency || 'EUR')
    payload.append('hsnCode', formData.hsnCode.trim())
    payload.append('description', formData.description.trim())

    if (imageFile) {
      payload.append('image', imageFile)
    } else if (imagePreview === null) {
      payload.append('image', '')
    }

    try {
      if (isEditMode && formData.id) {
        await updateSparePart(formData.id, payload)
        showNotification('success', `Spare Part "${formData.name}" updated successfully`)
      } else {
        await createSparePart(payload)
        showNotification('success', `Spare Part "${formData.name}" created successfully`)
      }
      setTimeout(() => {
        navigate('/spare-parts')
      }, 1000)
    } catch (err) {
      console.error(err)
      showNotification('error', err.response?.data?.message || 'Failed to save spare part')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-primary">
              {isEditMode ? 'Edit Spare Part' : 'Add New Spare Part'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEditMode ? 'Update spare part details, ART NO, HSN Code, and rate.' : 'Enter details for new spare part unit.'}
            </p>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <Toast
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-[5px] shadow-sm p-6 space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-brand-primary" />
            <span>Spare Part Information</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-5">
            {/* Spare Parts Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Spare Parts Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Hydraulic Seal Kit 40mm"
                className={`w-full px-3.5 py-2.5 bg-slate-50/40 border rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white transition-all outline-none ${errors.name
                  ? 'border-rose-400 bg-rose-50/10 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20'
                  }`}
              />
              {errors.name && <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.name}</p>}
            </div>

            {/* ART NO & HSN Code Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ART NO */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  ART NO (Article Number)
                </label>
                <input
                  type="text"
                  name="artNo"
                  value={formData.artNo}
                  onChange={handleChange}
                  placeholder="e.g. ART-904821"
                  className="w-full px-3.5 py-2.5 bg-slate-50/40 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all outline-none"
                />
              </div>

              {/* HSN Code */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  HSN Code
                </label>
                <input
                  type="text"
                  name="hsnCode"
                  value={formData.hsnCode}
                  onChange={handleChange}
                  placeholder="e.g. 84841090"
                  className="w-full px-3.5 py-2.5 bg-slate-50/40 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all outline-none"
                />
              </div>
            </div>

            {/* Price & Currency */}
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
                    name="price"
                    step="0.01"
                    min="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full pl-7 pr-3 py-2 bg-slate-50/40 border rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white transition-all outline-none ${errors.price
                      ? 'border-rose-400 bg-rose-50/10 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20'
                      }`}
                  />
                </div>
              </div>
              {errors.price && <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.price}</p>}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5 flex flex-col justify-between">
            {/* Spare Part Image */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Spare Part Image</label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className={`h-28 flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3 text-center group transition-colors relative bg-slate-50/80 hover:bg-slate-100/60 ${imagePreview ? 'w-full sm:flex-1' : 'w-full'}`}>
                  <label className="w-full h-full flex items-center justify-center gap-3 cursor-pointer">
                    <Upload className="w-6 h-6 text-slate-700 group-hover:text-brand-accent transition-colors shrink-0" />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-slate-800 group-hover:text-brand-accent">
                        {imagePreview ? 'Change Image' : 'Upload Spare Part Image'}
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
                  <div className="w-28 h-28 border border-slate-200 rounded-xl p-1.5 relative bg-white flex items-center justify-center shadow-xs shrink-0 group">
                    <img
                      src={imagePreview}
                      alt="Spare Part Preview"
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

            {/* Description */}
            <div className="space-y-1.5 flex-1 flex flex-col">
              <label className="block text-sm font-semibold text-slate-700">
                Description / Notes <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </label>
              <textarea
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter description or specifications..."
                className="w-full flex-1 min-h-[100px] px-3.5 py-2.5 bg-slate-50/40 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all outline-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => navigate('/spare-parts')}
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold transition-all shadow-md hover:shadow-brand-primary/10 active:scale-[0.98] cursor-pointer rounded-xl flex items-center gap-2 disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditMode ? 'Save Changes' : 'Create Spare Part'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
