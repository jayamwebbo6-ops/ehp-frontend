import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Wrench,
  X,
  ShieldAlert,
  Loader2
} from 'lucide-react'
import { getSpareParts, deleteSparePart, bulkDeleteSpareParts } from '../services/sparePartService'
import ConfirmationModal from '../components/ConfirmationModal'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/quotation-backend/api'

const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('data:') || imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  return `${API_BASE_URL}${imagePath}`
}

export default function AllSpareParts() {
  const { admin } = useAuth()
  const isAdmin = admin?.role === 'Admin'
  const permissions = admin?.permissions || {}

  const hasAddAccess = isAdmin || permissions.sparePartsAdd === 'yes'
  const hasEditAccess = isAdmin || permissions.sparePartsEdit === 'yes'
  const hasDeleteAccess = isAdmin || permissions.sparePartsDelete === 'yes'

  const navigate = useNavigate()
  const [spareParts, setSpareParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Delete confirmation state
  const [deleteConfirmPart, setDeleteConfirmPart] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Selection & Bulk Delete state
  const [selectedIds, setSelectedIds] = useState([])
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)

  // Toast notification state
  const [notification, setNotification] = useState(null)

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const fetchPartsList = async () => {
    setLoading(true)
    try {
      const data = await getSpareParts()
      setSpareParts(data.spareParts || [])
    } catch (err) {
      console.error('Error fetching spare parts:', err)
      showNotification('error', err.response?.data?.message || 'Failed to load spare parts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPartsList()
  }, [])

  // Filter spare parts by search query
  const filteredParts = useMemo(() => {
    let result = spareParts

    if (!searchQuery.trim()) return result

    const q = searchQuery.toLowerCase().trim()
    return result.filter(p => {
      const nameMatch = (p.name || '').toLowerCase().includes(q)
      const artMatch = (p.artNo || '').toLowerCase().includes(q)
      const hsnMatch = (p.hsnCode || '').toLowerCase().includes(q)
      const descMatch = (p.description || '').toLowerCase().includes(q)
      return nameMatch || artMatch || hsnMatch || descMatch
    })
  }, [spareParts, searchQuery])

  // Checkbox selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredParts.map(item => item._id || item.id)
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id))

    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])))
    }
  }

  const isAllSelected =
    filteredParts.length > 0 &&
    filteredParts.every(item => selectedIds.includes(item._id || item.id))

  const handleDeleteClick = (part) => {
    setDeleteConfirmPart(part)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmPart) return
    const partId = deleteConfirmPart._id || deleteConfirmPart.id
    const partName = deleteConfirmPart.name
    setIsDeleting(true)
    try {
      await deleteSparePart(partId)
      showNotification('success', `Spare Part "${partName}" deleted successfully`)
      setDeleteConfirmPart(null)
      setSelectedIds(prev => prev.filter(sId => sId !== partId))
      fetchPartsList()
    } catch (err) {
      console.error('Error deleting spare part:', err)
      showNotification('error', err.response?.data?.message || 'Failed to delete spare part')
    } finally {
      setIsDeleting(false)
    }
  }

  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return

    setIsDeletingBulk(true)
    try {
      await bulkDeleteSpareParts(selectedIds)
      showNotification('success', `${selectedIds.length} spare part(s) deleted successfully`)
      setSelectedIds([])
      setIsBulkDeleteModalOpen(false)
      fetchPartsList()
    } catch (err) {
      console.error("Bulk delete error:", err)
      showNotification('error', err.response?.data?.message || 'Failed to delete selected spare parts')
    } finally {
      setIsDeletingBulk(false)
    }
  }

  const formatPrice = (price, currency) => {
    const symbol = currency === 'EUR' ? '€' : (currency === 'INR' ? '₹' : '€')
    const num = parseFloat(price || 0)
    return `${symbol}\u00A0${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-primary">All Spare Parts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage spare parts inventory, article numbers, HSN codes, and pricing catalog.
          </p>
        </div>

        {hasAddAccess && (
          <button
            type="button"
            onClick={() => navigate('/spare-parts/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white font-semibold text-sm transition-all shadow-md hover:shadow-brand-primary/10 active:scale-[0.98] cursor-pointer rounded-[5px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Spare Part</span>
          </button>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <Toast
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Main Workspace Card */}
      <div className="bg-white border border-slate-100 rounded-[5px] shadow-sm p-6 space-y-6">
        {/* Search & Bulk Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by Name, ART NO, HSN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {hasDeleteAccess && selectedIds.length > 0 && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-[5px] transition-all shadow-sm active:scale-[0.98] cursor-pointer animate-in fade-in"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            )}
            <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
              Showing {filteredParts.length} spare part(s)
            </div>
          </div>
        </div>

        {/* Spare Parts Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-[5px]">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary accent-brand-primary cursor-pointer"
                  />
                </th>
                <th className="px-4 py-4 w-16 text-center">Image</th>
                <th className="px-6 py-4">Spare Part Name</th>
                <th className="px-6 py-4">ART NO</th>
                <th className="px-6 py-4">HSN Code</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-right w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                      <p className="text-xs font-medium text-slate-500">Loading spare parts catalog...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredParts.length > 0 ? (
                filteredParts.map((part) => {
                  const partId = part._id || part.id
                  const isChecked = selectedIds.includes(partId)
                  const imgUrl = part.image ? getImageUrl(part.image) : ''

                  return (
                    <tr
                      key={partId}
                      className={`transition-colors group ${isChecked ? 'bg-brand-primary/5 hover:bg-brand-primary/10' : 'hover:bg-slate-50/50'}`}
                    >
                      {/* Selection Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(partId)}
                          className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary accent-brand-primary cursor-pointer"
                        />
                      </td>

                      {/* Image */}
                      <td className="px-4 py-4 text-center">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={part.name}
                            className="w-10 h-10 object-cover rounded border border-slate-200 mx-auto"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
                            <Wrench className="w-5 h-5" />
                          </div>
                        )}
                      </td>

                      {/* Spare Part Name */}
                      <td className="px-6 py-4 font-bold text-slate-800 whitespace-pre-line">
                        <div>
                          <span>{part.name}</span>
                          {part.description && (
                            <p className="text-xs text-slate-400 font-normal line-clamp-1 mt-0.5" title={part.description}>
                              {part.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* ART NO */}
                      <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                        {part.artNo ? (
                          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200/80">
                            {part.artNo}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* HSN Code */}
                      <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                        {part.hsnCode ? (
                          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200/80">
                            {part.hsnCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 text-right font-extrabold text-slate-800 whitespace-nowrap">
                        {formatPrice(part.price, part.currency)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2.5">
                          {hasEditAccess && (
                            <button
                              type="button"
                              onClick={() => navigate(`/spare-parts/edit/${partId}`)}
                              title={`Edit ${part.name}`}
                              className="p-1.5 border border-transparent rounded-[5px] transition-all hover:bg-white text-slate-500 hover:text-brand-accent hover:border-slate-200 cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {hasDeleteAccess && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(part)}
                              title={`Delete ${part.name}`}
                              className="p-1.5 border border-transparent rounded-[5px] transition-all hover:bg-white text-slate-500 hover:text-rose-600 hover:border-slate-200 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-sm text-slate-700">
                        {searchQuery ? 'No matching spare parts found' : 'No spare parts in catalog'}
                      </p>
                      <p className="text-xs">
                        {searchQuery
                          ? 'Try adjusting your search query'
                          : 'Click "Add Spare Part" to create your first spare part entry.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmPart !== null}
        title="Delete Spare Part"
        message={
          <>
            Are you sure you want to delete <strong className="text-slate-800">"{deleteConfirmPart?.name}"</strong>? This action cannot be undone.
          </>
        }
        confirmLabel={isDeleting ? "Deleting..." : "Delete Spare Part"}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmPart(null)}
        type="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        title="Confirm Bulk Deletion"
        message={
          <>
            Are you sure you want to delete <strong className="text-slate-800">{selectedIds.length}</strong> selected spare part(s)? This action cannot be undone.
          </>
        }
        confirmLabel={isDeletingBulk ? "Deleting..." : `Delete ${selectedIds.length} Spare Part(s)`}
        cancelLabel="Cancel"
        onConfirm={executeBulkDelete}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
        type="danger"
      />
    </div>
  )
}
