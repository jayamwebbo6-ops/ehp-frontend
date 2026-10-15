import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  RefreshCw,
  X,
  ShieldAlert,
  Loader2,
  Eye,
  Layers,
  ExternalLink,
  Youtube
} from 'lucide-react'
import { getProducts, deleteProduct, bulkDeleteProducts } from '../services/productService'
import ConfirmationModal from '../components/ConfirmationModal'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/quotation-backend/api'

const getProductImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('data:') || imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  return `${API_BASE_URL}${imagePath}`
}

export default function AllProducts() {
  const { admin } = useAuth()
  const isAdmin = admin?.role === 'Admin'
  const permissions = admin?.permissions || {}

  const hasAddAccess = isAdmin || permissions.productAdd === 'yes'
  const hasEditAccess = isAdmin || permissions.productEdit === 'yes'
  const hasDeleteAccess = isAdmin || permissions.productDelete === 'yes'

  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Delete confirmation state
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)



  // Selection & Bulk Delete state
  const [selectedIds, setSelectedIds] = useState([])
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)

  // View Options Modal state
  const [viewOptionsProduct, setViewOptionsProduct] = useState(null)

  // Toast notification state
  const [notification, setNotification] = useState(null)

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const fetchProductList = async () => {
    setLoading(true)
    try {
      const data = await getProducts()
      setProducts(data.products || [])
    } catch (err) {
      console.error('Error fetching products:', err)
      showNotification('error', err.response?.data?.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductList()
  }, [])

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    let result = products

    if (!searchQuery.trim()) return result

    const q = searchQuery.toLowerCase().trim()
    return result.filter(p => {
      const nameMatch = (p.name || '').toLowerCase().includes(q)
      const descMatch = (p.description || '').toLowerCase().includes(q)
      const techMatch = (p.technicalData || []).some(
        t => (t.name || '').toLowerCase().includes(q) || (t.value || '').toLowerCase().includes(q)
      )
      const accMatch = (p.accessories || []).some(
        a => (a.name || '').toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q)
      )
      const optMatch = (p.optionals || []).some(
        o => (o.name || '').toLowerCase().includes(q) || (o.description || '').toLowerCase().includes(q)
      )
      return nameMatch || descMatch || techMatch || accMatch || optMatch
    })
  }, [products, searchQuery])

  // Checkbox selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredProducts.map(item => item._id || item.id)
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id))

    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])))
    }
  }

  const isAllSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every(item => selectedIds.includes(item._id || item.id))

  const handleDeleteClick = (product) => {
    setDeleteConfirmProduct(product)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmProduct) return
    const prodId = deleteConfirmProduct._id || deleteConfirmProduct.id
    const prodName = deleteConfirmProduct.name
    setIsDeleting(true)
    try {
      await deleteProduct(prodId)
      showNotification('success', `Product "${prodName}" deleted successfully`)
      setDeleteConfirmProduct(null)
      setSelectedIds(prev => prev.filter(sId => sId !== prodId))
      fetchProductList()
    } catch (err) {
      console.error('Error deleting product:', err)
      showNotification('error', err.response?.data?.message || 'Failed to delete product')
    } finally {
      setIsDeleting(false)
    }
  }

  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return

    setIsDeletingBulk(true)
    try {
      await bulkDeleteProducts(selectedIds)
      showNotification('success', `${selectedIds.length} product(s) deleted successfully`)
      setSelectedIds([])
      setIsBulkDeleteModalOpen(false)
      fetchProductList()
    } catch (err) {
      console.error("Bulk delete error:", err)
      showNotification('error', err.response?.data?.message || 'Failed to delete selected products')
    } finally {
      setIsDeletingBulk(false)
    }
  }

  const formatPrice = (price, currency) => {
    const symbol = currency === 'EUR' ? '€' : '₹'
    const num = parseFloat(price || 0)
    return `${symbol}\u00A0${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-primary">Product List</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your equipment catalog, rates, technical specifications, and optional accessories.
          </p>
        </div>

        {hasAddAccess && (
            <button
              type="button"
              onClick={() => navigate('/scales/new')}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white font-semibold text-sm transition-all shadow-md hover:shadow-brand-primary/10 active:scale-[0.98] cursor-pointer rounded-[5px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
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
        {/* Table Search & Controls & Bulk Action Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search products..."
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
              Showing {filteredProducts.length} product(s)
            </div>
          </div>
        </div>

        {/* Products Table */}
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
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4 max-w-xs">Description</th>
                <th className="px-6 py-4 text-right">Unit Price</th>
                <th className="px-6 py-4 text-center">Options</th>
                <th className="px-6 py-4 text-right w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                      <p className="text-xs font-medium text-slate-500">Loading products catalog...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const pId = p._id || p.id
                  const isChecked = selectedIds.includes(pId)
                  const accCount = p.accessories?.length || 0
                  const optCount = p.optionals?.length || 0
                  const totalOptions = accCount + optCount
                  const imageUrl = p.image ? getProductImageUrl(p.image) : ''

                  return (
                    <tr
                      key={pId}
                      className={`transition-colors group ${isChecked ? 'bg-brand-primary/5 hover:bg-brand-primary/10' : 'hover:bg-slate-50/50'}`}
                    >
                      {/* Selection Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(pId)}
                          className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary accent-brand-primary cursor-pointer"
                        />
                      </td>

                      {/* Image */}
                      <td className="px-4 py-4 text-center">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded border border-slate-200 mx-auto"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {p.name}
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 max-w-md">
                        <p className="text-slate-500 text-xs leading-relaxed" title={p.description || ''}>
                          {p.description 
                            ? (p.description.length > 100 
                                ? `${p.description.substring(0, 100)}...` 
                                : p.description) 
                            : '-'}
                        </p>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 text-right font-extrabold text-slate-800 whitespace-nowrap">
                        {formatPrice(p.unitPrice, p.currency)}
                      </td>

                      {/* Options */}
                      <td className="px-6 py-4 text-center">
                        {totalOptions > 0 ? (
                          <button
                            type="button"
                            onClick={() => setViewOptionsProduct(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-primary/5 hover:bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-semibold text-xs rounded-[5px] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                            title="View Accessories & Optionals"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2.5">
                          {hasEditAccess && (
                            <button
                              type="button"
                              onClick={() => navigate(`/scales/edit/${pId}`)}
                              title={`Edit ${p.name}`}
                              className="p-1.5 border border-transparent rounded-[5px] transition-all hover:bg-white text-slate-500 hover:text-brand-accent hover:border-slate-200 cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {hasDeleteAccess && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(p)}
                              title={`Delete ${p.name}`}
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
                        {searchQuery ? 'No matching products found' : 'No products in catalog'}
                      </p>
                      <p className="text-xs">
                        {searchQuery
                          ? 'Try adjusting your search query'
                          : 'Click "Add New Product" to create your first product.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Accessories & Optionals Pop-up Modal */}
      {viewOptionsProduct && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150 w-full h-full min-h-screen">
          <div className="bg-white rounded-[5px] border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-primary" />
                  <span>Options & Accessories</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Product: <strong className="text-slate-700">{viewOptionsProduct.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setViewOptionsProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Accessories Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span>Accessories</span>
                  <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                    {viewOptionsProduct.accessories?.length || 0} item(s)
                  </span>
                </h4>

                {viewOptionsProduct.accessories && viewOptionsProduct.accessories.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {viewOptionsProduct.accessories.map((acc, idx) => {
                      const accImg = getProductImageUrl(acc.image)
                      return (
                        <div key={idx} className="flex items-start gap-4 p-3 border border-slate-100 bg-slate-50/40 rounded-[5px]">
                          {accImg ? (
                            <img
                              src={accImg}
                              alt={acc.name}
                              className="w-12 h-12 object-cover rounded border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="font-bold text-slate-800 text-sm truncate">{acc.name}</h5>
                              <span className="text-xs font-extrabold text-slate-800 shrink-0 whitespace-nowrap">
                                {formatPrice(acc.price, viewOptionsProduct.currency)}
                              </span>
                            </div>
                            {acc.description && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{acc.description}</p>
                            )}
                            {(acc.websiteUrl || acc.youtubeUrl) && (
                              <div className="flex items-center gap-3 mt-2">
                                {acc.websiteUrl && (
                                  <a
                                    href={acc.websiteUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-brand-primary hover:underline font-medium"
                                  >
                                    <ExternalLink className="w-3 h-3" /> Website
                                  </a>
                                )}
                                {acc.youtubeUrl && (
                                  <a
                                    href={acc.youtubeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:underline font-medium"
                                  >
                                    <Youtube className="w-3 h-3" /> YouTube Video
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">No accessories added for this product.</p>
                )}
              </div>

              {/* Optionals Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span>Optionals</span>
                  <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                    {viewOptionsProduct.optionals?.length || 0} item(s)
                  </span>
                </h4>

                {viewOptionsProduct.optionals && viewOptionsProduct.optionals.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {viewOptionsProduct.optionals.map((opt, idx) => {
                      const optImg = getProductImageUrl(opt.image)
                      return (
                        <div key={idx} className="flex items-start gap-4 p-3 border border-slate-100 bg-slate-50/40 rounded-[5px]">
                          {optImg ? (
                            <img
                              src={optImg}
                              alt={opt.name}
                              className="w-12 h-12 object-cover rounded border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="font-bold text-slate-800 text-sm truncate">{opt.name}</h5>
                              <span className="text-xs font-extrabold text-slate-800 shrink-0 whitespace-nowrap">
                                {formatPrice(opt.price, viewOptionsProduct.currency)}
                              </span>
                            </div>
                            {opt.description && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{opt.description}</p>
                            )}
                            {(opt.websiteUrl || opt.youtubeUrl) && (
                              <div className="flex items-center gap-3 mt-2">
                                {opt.websiteUrl && (
                                  <a
                                    href={opt.websiteUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-brand-primary hover:underline font-medium"
                                  >
                                    <ExternalLink className="w-3 h-3" /> Website
                                  </a>
                                )}
                                {opt.youtubeUrl && (
                                  <a
                                    href={opt.youtubeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:underline font-medium"
                                  >
                                    <Youtube className="w-3 h-3" /> YouTube Video
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">No optional items added for this product.</p>
                )}
              </div>


            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewOptionsProduct(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-[5px] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmProduct !== null}
        title="Delete Product"
        message={
          <>
            Are you sure you want to delete <strong className="text-slate-800">"{deleteConfirmProduct?.name}"</strong>? This will remove the product from the catalog.
          </>
        }
        confirmLabel={isDeleting ? "Deleting..." : "Delete Product"}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmProduct(null)}
        type="danger"
      />



      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        title="Confirm Bulk Deletion"
        message={
          <>
            Are you sure you want to delete <strong className="text-slate-800">{selectedIds.length}</strong> selected product(s)? This action cannot be undone.
          </>
        }
        confirmLabel={isDeletingBulk ? "Deleting..." : `Delete ${selectedIds.length} Product(s)`}
        cancelLabel="Cancel"
        onConfirm={executeBulkDelete}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
        type="danger"
      />
    </div>
  )
}

