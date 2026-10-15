import React, { useState, useEffect } from "react"
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    ShieldAlert,
    Check,
    Loader2,
    ArrowUp,
    ArrowDown
} from 'lucide-react'
import ConfirmationModal from "../components/ConfirmationModal"
import Toast from "../components/Toast"
import {
    getRequirements,
    createRequirement,
    updateRequirement,
    deleteRequirement,
    bulkDeleteRequirements
} from "../services/requirementService"
import { useAuth } from "../context/AuthContext"

const Requirements = () => {
    const { admin } = useAuth()
    const isAdmin = admin?.role === 'Admin'
    const permissions = admin?.permissions || {}

    const hasAddAccess = isAdmin || permissions.requireAccessAdd === 'yes'
    const hasEditAccess = isAdmin || permissions.requireAccessEdit === 'yes'
    const hasDeleteAccess = isAdmin || permissions.requireAccessDelete === 'yes'

    const [requirements, setRequirements] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    // Pop-up Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Selection & Bulk Delete State
    const [selectedIds, setSelectedIds] = useState([])
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
    const [isDeletingBulk, setIsDeletingBulk] = useState(false)

    // Single Delete Confirmation State
    const [deleteConfirmItem, setDeleteConfirmItem] = useState(null)

    // Form Data
    const [formData, setFormData] = useState({
        title: '',
        order: 0
    })

    // Errors
    const [errors, setErrors] = useState({})

    // Notifications
    const [notification, setNotification] = useState(null)

    // Show Toast Notification
    const showNotification = (type, message) => {
        setNotification({ type, message })
        setTimeout(() => {
            setNotification(null)
        }, 4000)
    }

    // Fetch requirements on mount
    const fetchRequirementsList = async () => {
        setIsLoading(true)
        try {
            const data = await getRequirements()
            setRequirements(data.requirements || [])
        } catch (e) {
            console.error("Error loading requirements", e)
            showNotification('error', e.response?.data?.message || 'Failed to load requirements')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRequirementsList()
    }, [])

    // Input change handler
    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }))
        }
    }

    // Validate form
    const validateForm = () => {
        const newErrors = {}
        if (!formData.title || !formData.title.trim()) {
            newErrors.title = 'Requirement title is required'
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Open Add Modal
    const handleAddClick = () => {
        const maxOrder = requirements.reduce((max, item) => {
            const ord = Number(item.order) || 0
            return ord > max ? ord : max
        }, 0)

        setEditingId(null)
        setFormData({
            title: '',
            order: maxOrder + 1
        })
        setErrors({})
        setIsEditMode(false)
        setIsModalOpen(true)
    }

    // Open Edit Modal
    const handleEditClick = (item) => {
        setEditingId(item._id || item.id)
        setFormData({
            title: item.title || item.name || '',
            order: item.order !== undefined ? item.order : 0
        })
        setErrors({})
        setIsEditMode(true)
        setIsModalOpen(true)
    }

    // Confirm Single Delete
    const handleDeleteClick = (item) => {
        setDeleteConfirmItem(item)
    }

    // Execute Single Delete
    const executeDelete = async () => {
        if (!deleteConfirmItem) return

        try {
            const id = deleteConfirmItem._id || deleteConfirmItem.id
            const title = deleteConfirmItem.title || deleteConfirmItem.name
            await deleteRequirement(id)
            showNotification('success', `Requirement "${title}" deleted successfully`)
            setDeleteConfirmItem(null)
            setSelectedIds(prev => prev.filter(sId => sId !== id))
            fetchRequirementsList()
        } catch (err) {
            console.error(err)
            showNotification('error', err.response?.data?.message || 'Failed to delete requirement')
        }
    }

    // Execute Bulk Delete
    const executeBulkDelete = async () => {
        if (selectedIds.length === 0) return

        setIsDeletingBulk(true)
        try {
            await bulkDeleteRequirements(selectedIds)
            showNotification('success', `${selectedIds.length} requirement(s) deleted successfully`)
            setSelectedIds([])
            setIsBulkDeleteModalOpen(false)
            fetchRequirementsList()
        } catch (err) {
            console.error("Bulk delete error:", err)
            showNotification('error', err.response?.data?.message || 'Failed to delete selected requirements')
        } finally {
            setIsDeletingBulk(false)
        }
    }

    // Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateForm()) return

        setIsSubmitting(true)
        try {
            const maxOrder = requirements.reduce((max, item) => {
                const ord = Number(item.order) || 0
                return ord > max ? ord : max
            }, 0)

            const payload = {
                title: formData.title.trim(),
                order: formData.order !== undefined && formData.order !== '' ? Number(formData.order) : (maxOrder + 1)
            }

            if (isEditMode && editingId) {
                await updateRequirement(editingId, payload)
                showNotification('success', 'Requirement updated successfully!')
            } else {
                await createRequirement(payload)
                showNotification('success', 'Requirement added successfully!')
            }

            setIsModalOpen(false)
            fetchRequirementsList()
        } catch (err) {
            console.error("Save error:", err)
            showNotification('error', err.response?.data?.message || 'Failed to save requirement')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Move requirement order up or down
    const handleMoveOrder = async (index, direction) => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === filteredRequirements.length - 1)
        ) {
            return
        }

        const targetIndex = direction === 'up' ? index - 1 : index + 1
        const currentItem = filteredRequirements[index]
        const targetItem = filteredRequirements[targetIndex]

        if (!currentItem || !targetItem) return

        // Create array copy sorted by current order
        const newRequirements = [...requirements].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

        const currentPos = newRequirements.findIndex(r => (r._id || r.id) === (currentItem._id || currentItem.id))
        const targetPos = newRequirements.findIndex(r => (r._id || r.id) === (targetItem._id || targetItem.id))

        if (currentPos === -1 || targetPos === -1) return

        // Swap items in list
        const temp = newRequirements[currentPos]
        newRequirements[currentPos] = newRequirements[targetPos]
        newRequirements[targetPos] = temp

        // Reassign sequential order numbers (1-based)
        newRequirements.forEach((item, idx) => {
            item.order = idx + 1
        })

        // Optimistic UI update
        setRequirements([...newRequirements])

        try {
            await Promise.all([
                updateRequirement(currentItem._id || currentItem.id, { order: newRequirements[targetPos].order }),
                updateRequirement(targetItem._id || targetItem.id, { order: newRequirements[currentPos].order })
            ])
            showNotification('success', 'Order updated successfully')
        } catch (err) {
            console.error("Error updating order:", err)
            showNotification('error', 'Failed to update order')
            fetchRequirementsList()
        }
    }

    // Filtered requirements
    const filteredRequirements = requirements.filter(req => {
        const q = searchQuery.toLowerCase().trim()
        if (!q) return true
        const title = (req.title || req.name || '').toLowerCase()
        return title.includes(q)
    })

    // Checkbox selection handlers
    const handleToggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    const handleSelectAll = () => {
        const allFilteredIds = filteredRequirements.map(item => item._id || item.id)
        const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id))

        if (isAllSelected) {
            setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])))
        }
    }

    const isAllSelected =
        filteredRequirements.length > 0 &&
        filteredRequirements.every(item => selectedIds.includes(item._id || item.id))

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-brand-primary">Requirements Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Add, edit, and organize system requirements.</p>
                </div>

                {hasAddAccess && (
                    <button
                        onClick={handleAddClick}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white font-semibold text-sm transition-all shadow-md hover:shadow-brand-primary/10 active:scale-[0.98] cursor-pointer rounded-[5px]"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Requirement</span>
                    </button>
                )}
            </div>

            {/* Notifications */}
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
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search requirements..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all placeholder:text-slate-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {hasDeleteAccess && selectedIds.length > 0 && (
                            <button
                                onClick={() => setIsBulkDeleteModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-[5px] transition-all shadow-sm active:scale-[0.98] cursor-pointer animate-in fade-in"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Selected ({selectedIds.length})</span>
                            </button>
                        )}
                        <div className="text-xs text-slate-400 font-medium">
                            Showing {filteredRequirements.length} of {requirements.length} requirements
                        </div>
                    </div>
                </div>

                {/* Requirements Table */}
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
                                <th className="px-6 py-4">Requirement</th>
                                <th className="px-6 py-4 w-36 text-center">Order</th>
                                <th className="px-6 py-4 text-right w-28">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                                            <p className="text-xs font-medium text-slate-500">Loading requirements...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRequirements.length > 0 ? (
                                filteredRequirements.map((item, index) => {
                                    const itemId = item._id || item.id
                                    const isChecked = selectedIds.includes(itemId)

                                    return (
                                        <tr
                                            key={itemId || index}
                                            className={`transition-colors group ${isChecked ? 'bg-brand-primary/5 hover:bg-brand-primary/10' : 'hover:bg-slate-50/50'
                                                }`}
                                        >
                                            <td className="px-4 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleSelect(itemId)}
                                                    className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary accent-brand-primary cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-bold">{item.title || item.name}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveOrder(index, 'up')}
                                                        disabled={!hasEditAccess || index === 0}
                                                        title="Move Up"
                                                        className="p-1 hover:bg-slate-100 text-slate-700 hover:text-brand-primary disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
                                                    >
                                                        <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                                                    </button>
                                                    <div className="w-7 h-7 rounded-full bg-[#dbe4f0] text-slate-800 font-bold text-xs flex items-center justify-center select-none shadow-xs">
                                                        {item.order !== undefined && item.order > 0 ? item.order : index + 1}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveOrder(index, 'down')}
                                                        disabled={!hasEditAccess || index === filteredRequirements.length - 1}
                                                        title="Move Down"
                                                        className="p-1 hover:bg-slate-100 text-slate-700 hover:text-brand-primary disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
                                                    >
                                                        <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2.5">
                                                    {hasEditAccess && (
                                                        <button
                                                            onClick={() => handleEditClick(item)}
                                                            title={`Edit ${item.title || item.name}`}
                                                            className="p-1.5 border border-transparent rounded-[5px] transition-all hover:bg-white text-slate-500 hover:text-brand-accent hover:border-slate-200 cursor-pointer"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {hasDeleteAccess && (
                                                        <button
                                                            onClick={() => handleDeleteClick(item)}
                                                            title={`Delete ${item.title || item.name}`}
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
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <ShieldAlert className="w-8 h-8 text-slate-300" />
                                            <p className="font-semibold text-sm text-slate-700">No requirements found</p>
                                            <p className="text-xs">
                                                {searchQuery ? 'Try adjusting your search query' : 'Click "New Requirement" to create your first requirement.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Pop-up Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150 w-full h-full min-h-screen">
                    <div className="bg-white rounded-[5px] border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-lg">
                                {isEditMode ? 'Edit Requirement' : 'Add New Requirement'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                    Requirement Title <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Standard Warranty & Guarantee Terms"
                                    className={`w-full px-3 py-2 border rounded-[5px] text-sm focus:outline-none focus:ring-1 transition-all ${errors.title
                                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30'
                                        : 'border-slate-200 focus:border-brand-accent focus:ring-brand-accent'
                                        }`}
                                />
                                {errors.title && (
                                    <p className="text-rose-500 text-xs mt-1 font-medium">{errors.title}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                    Display Order
                                </label>
                                <input
                                    type="number"
                                    name="order"
                                    value={formData.order}
                                    onChange={handleChange}
                                    placeholder="Order position (e.g. 1)"
                                    min="1"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all placeholder:text-slate-400"
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-[5px] transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-5 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-sm font-semibold rounded-[5px] transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>{isEditMode ? 'Update Requirement' : 'Save Requirement'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Single Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteConfirmItem !== null}
                title="Confirm Deletion"
                message={
                    <>
                        Are you sure you want to delete requirement <span className="font-bold text-slate-800">"{deleteConfirmItem?.title || deleteConfirmItem?.name}"</span>? This action cannot be undone.
                    </>
                }
                confirmLabel="Delete Requirement"
                cancelLabel="Cancel"
                onConfirm={executeDelete}
                onCancel={() => setDeleteConfirmItem(null)}
                type="danger"
            />

            {/* Bulk Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={isBulkDeleteModalOpen}
                title="Confirm Bulk Deletion"
                message={
                    <>
                        Are you sure you want to delete <span className="font-bold text-slate-800">{selectedIds.length}</span> selected requirement(s)? This action cannot be undone.
                    </>
                }
                confirmLabel={isDeletingBulk ? "Deleting..." : `Delete ${selectedIds.length} Requirement(s)`}
                cancelLabel="Cancel"
                onConfirm={executeBulkDelete}
                onCancel={() => setIsBulkDeleteModalOpen(false)}
                type="danger"
            />
        </div>
    )
}

export default Requirements