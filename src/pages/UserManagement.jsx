import React, { useState, useEffect } from "react"
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Mail,
  User,
  ShieldAlert,
  Check,
  AlertCircle
} from 'lucide-react'
import ConfirmationModal from "../components/ConfirmationModal"
import Toast from "../components/Toast"
import { getUsers, createUser, updateUser, deleteUser } from "../services/userService"

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Delete confirmation state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'Sub-Admin',
    settingsAccess: 'no',
    quotationAccess: 'no',
    quotationAdd: 'no',
    quotationEdit: 'no',
    quotationDelete: 'no',
    productAccess: 'no',
    productAdd: 'no',
    productEdit: 'no',
    productDelete: 'no',
    requireAccess: 'no',
    requireAccessAdd: 'no',
    requireAccessEdit: 'no',
    requireAccessDelete: 'no',
    sparePartsAccess: 'no',
    sparePartsAdd: 'no',
    sparePartsEdit: 'no',
    sparePartsDelete: 'no'
  })

  // Validation Errors
  const [errors, setErrors] = useState({})

  // Status feedback
  const [notification, setNotification] = useState(null) // { type: 'success'|'error', message: '' }

  // Load users from API on mount
  const fetchUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data.users || [])
    } catch (e) {
      console.error("Error loading users", e)
      showNotification('error', e.response?.data?.message || 'Failed to load users')
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Helper to trigger notifications
  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  // Handle Form Input Change
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // Username validation
    if (!formData.username) {
      newErrors.username = 'Username is required'
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Open Modal for Add
  const handleAddClick = () => {
    setEditingUserId(null)
    setFormData({
      username: '',
      email: '',
      role: 'Sub-Admin',
      settingsAccess: 'no',
      quotationAccess: 'no',
      quotationAdd: 'no',
      quotationEdit: 'no',
      quotationDelete: 'no',
      productAccess: 'no',
      productAdd: 'no',
      productEdit: 'no',
      productDelete: 'no',
      requireAccess: 'no',
      requireAccessAdd: 'no',
      requireAccessEdit: 'no',
      requireAccessDelete: 'no',
      sparePartsAccess: 'no',
      sparePartsAdd: 'no',
      sparePartsEdit: 'no',
      sparePartsDelete: 'no'
    })
    setErrors({})
    setIsEditMode(false)
    setIsModalOpen(true)
  }

  // Open Modal for Edit
  const handleEditClick = (user) => {
    setEditingUserId(user._id || user.id)
    setFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      settingsAccess: user.permissions?.settingsAccess || 'no',
      quotationAccess: user.permissions?.quotationAccess || 'no',
      quotationAdd: user.permissions?.quotationAdd || 'no',
      quotationEdit: user.permissions?.quotationEdit || 'no',
      quotationDelete: user.permissions?.quotationDelete || 'no',
      productAccess: user.permissions?.productAccess || 'no',
      productAdd: user.permissions?.productAdd || 'no',
      productEdit: user.permissions?.productEdit || 'no',
      productDelete: user.permissions?.productDelete || 'no',
      requireAccess: user.permissions?.requireAccess || 'no',
      requireAccessAdd: user.permissions?.requireAccessAdd || 'no',
      requireAccessEdit: user.permissions?.requireAccessEdit || 'no',
      requireAccessDelete: user.permissions?.requireAccessDelete || 'no',
      sparePartsAccess: user.permissions?.sparePartsAccess || 'no',
      sparePartsAdd: user.permissions?.sparePartsAdd || 'no',
      sparePartsEdit: user.permissions?.sparePartsEdit || 'no',
      sparePartsDelete: user.permissions?.sparePartsDelete || 'no'
    })
    setErrors({})
    setIsEditMode(true)
    setIsModalOpen(true)
  }

  // Delete User
  const handleDeleteClick = (userToDelete) => {
    if (userToDelete.role === 'Admin') {
      showNotification('error', 'Cannot delete Admin accounts')
      return
    }
    setDeleteConfirmUser({ id: userToDelete._id || userToDelete.id, username: userToDelete.username })
  }

  // Execute Deletion
  const executeDelete = async () => {
    if (!deleteConfirmUser) return

    try {
      const { id, username } = deleteConfirmUser
      await deleteUser(id)
      showNotification('success', `User "${username}" deleted successfully`)
      setDeleteConfirmUser(null)
      fetchUsers()
    } catch (err) {
      console.error(err)
      showNotification('error', err.response?.data?.message || 'Failed to delete user')
    }
  }

  // Form Submit Action
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const permissions = formData.role === 'Sub-Admin' ? {
      settingsAccess: formData.settingsAccess,
      quotationAccess: formData.quotationAccess,
      quotationAdd: formData.quotationAccess === 'yes' ? formData.quotationAdd : 'no',
      quotationEdit: formData.quotationAccess === 'yes' ? formData.quotationEdit : 'no',
      quotationDelete: formData.quotationAccess === 'yes' ? formData.quotationDelete : 'no',
      productAccess: formData.productAccess,
      productAdd: formData.productAccess === 'yes' ? formData.productAdd : 'no',
      productEdit: formData.productAccess === 'yes' ? formData.productEdit : 'no',
      productDelete: formData.productAccess === 'yes' ? formData.productDelete : 'no',
      requireAccess: formData.requireAccess,
      requireAccessAdd: formData.requireAccess === 'yes' ? formData.requireAccessAdd : 'no',
      requireAccessEdit: formData.requireAccess === 'yes' ? formData.requireAccessEdit : 'no',
      requireAccessDelete: formData.requireAccess === 'yes' ? formData.requireAccessDelete : 'no',
      sparePartsAccess: formData.sparePartsAccess,
      sparePartsAdd: formData.sparePartsAccess === 'yes' ? formData.sparePartsAdd : 'no',
      sparePartsEdit: formData.sparePartsAccess === 'yes' ? formData.sparePartsEdit : 'no',
      sparePartsDelete: formData.sparePartsAccess === 'yes' ? formData.sparePartsDelete : 'no'
    } : {
      settingsAccess: 'yes',
      quotationAccess: 'yes',
      quotationAdd: 'yes',
      quotationEdit: 'yes',
      quotationDelete: 'yes',
      productAccess: 'yes',
      productAdd: 'yes',
      productEdit: 'yes',
      productDelete: 'yes',
      requireAccess: 'yes',
      requireAccessAdd: 'yes',
      requireAccessEdit: 'yes',
      requireAccessDelete: 'yes',
      sparePartsAccess: 'yes',
      sparePartsAdd: 'yes',
      sparePartsEdit: 'yes',
      sparePartsDelete: 'yes'
    }

    try {
      setIsLoading(true)
      if (isEditMode) {
        await updateUser(editingUserId, {
          username: formData.username,
          email: formData.email,
          role: formData.role,
          permissions
        })
        showNotification('success', `User "${formData.username}" updated successfully`)
      } else {
        const res = await createUser({
          username: formData.username,
          email: formData.email,
          role: formData.role,
          permissions
        })
        showNotification('success', res.message || `User created successfully`)
      }
      setIsModalOpen(false)
      fetchUsers()
    } catch (err) {
      console.error(err)
      showNotification('error', err.response?.data?.message || 'Action failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter users by search query
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
      case 'Sub-Admin':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
      case 'Editor':
        return 'bg-blue-50 text-blue-700 border border-blue-100'
      default: // Viewer
        return 'bg-slate-100 text-slate-600 border border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 border border-slate-100 rounded-[5px] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-primary">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage system user access credentials, roles, and privileges.</p>
        </div>

        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white font-semibold text-sm transition-all shadow-md hover:shadow-brand-primary/10 active:scale-[0.98] cursor-pointer rounded-[5px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
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
        {/* Table Search & Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-[5px]">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">User Name</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Role / Privilege</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user._id || user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold">{user.username}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-xs font-semibold uppercase tracking-wide shadow-sm ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                        {user.role === 'Sub-Admin' && user.permissions && (
                          <div className="text-[10px] text-slate-500 font-medium space-y-0.5 mt-1.5 border-t border-slate-100 pt-1.5 w-full">
                            <div>• Settings: <span className="font-bold text-slate-700">{user.permissions.settingsAccess === 'yes' ? 'Yes' : 'No'}</span></div>
                            <div>• Quotation: <span className="font-bold text-slate-700">
                              {user.permissions.quotationAccess === 'yes'
                                ? `Yes (${[
                                  user.permissions.quotationAdd === 'yes' ? 'Add' : '',
                                  user.permissions.quotationEdit === 'yes' ? 'Edit' : '',
                                  user.permissions.quotationDelete === 'yes' ? 'Del' : ''
                                ].filter(Boolean).join('/') || 'View Only'})`
                                : 'No'}
                            </span></div>
                            <div>• Product: <span className="font-bold text-slate-700">
                              {user.permissions.productAccess === 'yes'
                                ? `Yes (${[
                                  user.permissions.productAdd === 'yes' ? 'Add' : '',
                                  user.permissions.productEdit === 'yes' ? 'Edit' : '',
                                  user.permissions.productDelete === 'yes' ? 'Del' : ''
                                ].filter(Boolean).join('/') || 'View Only'})`
                                : 'No'}
                            </span></div>
                            <div>• Require Approval: <span className="font-bold text-slate-700">
                              {user.permissions.requireAccess === 'yes'
                                ? `Yes (${[
                                  user.permissions.requireAccessAdd === 'yes' ? 'Add' : '',
                                  user.permissions.requireAccessEdit === 'yes' ? 'Edit' : '',
                                  user.permissions.requireAccessDelete === 'yes' ? 'Del' : ''
                                ].filter(Boolean).join('/') || 'View Only'})`
                                : 'No'}
                            </span></div>
                            <div>• Spare Parts: <span className="font-bold text-slate-700">
                              {user.permissions.sparePartsAccess === 'yes'
                                ? `Yes (${[
                                  user.permissions.sparePartsAdd === 'yes' ? 'Add' : '',
                                  user.permissions.sparePartsEdit === 'yes' ? 'Edit' : '',
                                  user.permissions.sparePartsDelete === 'yes' ? 'Del' : ''
                                ].filter(Boolean).join('/') || 'View Only'})`
                                : 'No'}
                            </span></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2.5">
                        <button
                          onClick={() => handleEditClick(user)}
                          disabled={user.role === 'Admin'}
                          title={user.role === 'Admin' ? "Cannot edit Admin accounts" : `Edit ${user.username}`}
                          className={`p-1.5 border border-transparent rounded-[5px] transition-all
                            ${user.role === 'Admin'
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'hover:bg-white text-slate-500 hover:text-brand-accent hover:border-slate-200 cursor-pointer'}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user)}
                          disabled={user.role === 'Admin'}
                          title={user.role === 'Admin' ? "Cannot delete Admin accounts" : `Delete ${user.username}`}
                          className={`p-1.5 border border-transparent rounded-[5px] transition-all
                            ${user.role === 'Admin'
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'hover:bg-white text-slate-500 hover:text-rose-600 hover:border-slate-200 cursor-pointer'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-sm">No users found</p>
                      <p className="text-xs">Try adjusting your search query or add a new user</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 w-full h-full min-h-screen">
          <div className="relative w-full max-w-md max-h-[85vh] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-[5px] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-50 px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-800">
                {isEditMode ? `Edit User: ${formData.username}` : 'Add New User'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  User Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="e.g. johndoe"
                    className={`w-full pl-9 pr-4 py-2 border rounded-[5px] text-sm focus:outline-none transition-all
                      ${errors.username
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/10'
                        : 'border-slate-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent'}`}
                  />
                </div>
                {errors.username && (
                  <p className="text-[11px] text-rose-600 font-semibold">{errors.username}</p>
                )}
              </div>

              {/* Email Address Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. user@company.com"
                    className={`w-full pl-9 pr-4 py-2 border rounded-[5px] text-sm focus:outline-none transition-all
                      ${errors.email
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/10'
                        : 'border-slate-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent'}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-rose-600 font-semibold">{errors.email}</p>
                )}
              </div>


              {/* Role Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Role / Privilege <span className="text-rose-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[5px] text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all bg-white"
                >
                  <option value="Sub-Admin">Sub-Admin</option>
                </select>
              </div>

              {/* Sub-Admin Access Privileges Panel */}
              {formData.role === 'Sub-Admin' && (
                <div className="p-4 bg-slate-50/20 border border-slate-100 rounded-[5px] space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-brand-accent" />
                    <span>Sub-Admin Access Privileges</span>
                  </h3>

                  {/* Informational Banner */}
                  <div className="flex items-start gap-2 p-2.5 bg-sky-50 border border-sky-100 rounded-[5px] text-[11px] text-sky-800 leading-relaxed font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-sky-600 mt-0.5" />
                    <span>Selecting <strong>"Yes"</strong> grants <strong>View Access Only</strong> by default. Check <strong>Add</strong>, <strong>Edit</strong>, or <strong>Delete</strong> below to grant write privileges.</span>
                  </div>

                  {/* 1. Settings Access */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      1. Settings Page Access
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="settingsAccess"
                          value="yes"
                          checked={formData.settingsAccess === 'yes'}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-300"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="settingsAccess"
                          value="no"
                          checked={formData.settingsAccess === 'no'}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-300"
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>

                  {/* 2. Quotation Access */}
                  <div className="space-y-1.5 border-t border-slate-200/60 pt-3">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      2. Quotation Access
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="quotationAccess"
                          value="yes"
                          checked={formData.quotationAccess === 'yes'}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-300"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="quotationAccess"
                          value="no"
                          checked={formData.quotationAccess === 'no'}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-300"
                        />
                        <span>No</span>
                      </label>
                    </div>

                    {/* Quotation Sub-options shown if yes */}
                    {formData.quotationAccess === 'yes' && (
                      <div className="pl-4 mt-2.5 space-y-2 border-l-2 border-brand-accent/30 animate-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quotation Privileges:</p>
                          <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Yes = View Access</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="quotationAdd"
                              checked={formData.quotationAdd === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, quotationAdd: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Add</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="quotationEdit"
                              checked={formData.quotationEdit === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, quotationEdit: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Edit</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="quotationDelete"
                              checked={formData.quotationDelete === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, quotationDelete: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Delete</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Product Access */}
                  <div className="space-y-1.5 border-t border-slate-200/60 pt-3">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      3. Product Access
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="productAccess"
                          value="yes"
                          checked={formData.productAccess === 'yes'}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-300"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="productAccess"
                          value="no"
                          checked={formData.productAccess === 'no'}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-300"
                        />
                        <span>No</span>
                      </label>
                    </div>

                    {/* Product Sub-options shown if yes */}
                    {formData.productAccess === 'yes' && (
                      <div className="pl-4 mt-2.5 space-y-2 border-l-2 border-brand-accent/30 animate-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Product Privileges:</p>
                          <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Yes = View Access</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="productAdd"
                              checked={formData.productAdd === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, productAdd: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Add</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="productEdit"
                              checked={formData.productEdit === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, productEdit: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Edit</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="productDelete"
                              checked={formData.productDelete === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, productDelete: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Delete</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Require Approval Access */}
                  <div className="space-y-1.5 border-t border-slate-200/60 pt-3">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      4. Require Approval Access
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="requireAccess"
                          value="yes"
                          checked={formData.requireAccess === 'yes'}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-300"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="requireAccess"
                          value="no"
                          checked={formData.requireAccess === 'no'}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-300"
                        />
                        <span>No</span>
                      </label>
                    </div>

                    {/* Product Sub-options shown if yes */}
                    {formData.requireAccess === 'yes' && (
                      <div className="pl-4 mt-2.5 space-y-2 border-l-2 border-brand-accent/30 animate-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Require Approval Access Privileges:</p>
                          <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Yes = View Access</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="requireAccessAdd"
                              checked={formData.requireAccessAdd === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, requireAccessAdd: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Add</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="requireAccessEdit"
                              checked={formData.requireAccessEdit === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, requireAccessEdit: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Edit</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="requireAccessDelete"
                              checked={formData.requireAccessDelete === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, requireAccessDelete: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Delete</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Spare Parts Access */}
                  <div className="space-y-1.5 border-t border-slate-200/60 pt-3">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      5. Spare Parts Access
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="sparePartsAccess"
                          value="yes"
                          checked={formData.sparePartsAccess === 'yes'}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-300"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="sparePartsAccess"
                          value="no"
                          checked={formData.sparePartsAccess === 'no'}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent border-slate-300"
                        />
                        <span>No</span>
                      </label>
                    </div>

                    {/* Spare Parts Sub-options shown if yes */}
                    {formData.sparePartsAccess === 'yes' && (
                      <div className="pl-4 mt-2.5 space-y-2 border-l-2 border-brand-accent/30 animate-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Spare Parts Privileges:</p>
                          <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Yes = View Access</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="sparePartsAdd"
                              checked={formData.sparePartsAdd === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, sparePartsAdd: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Add</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="sparePartsEdit"
                              checked={formData.sparePartsEdit === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, sparePartsEdit: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Edit</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              name="sparePartsDelete"
                              checked={formData.sparePartsDelete === 'yes'}
                              onChange={(e) => setFormData(prev => ({ ...prev, sparePartsDelete: e.target.checked ? 'yes' : 'no' }))}
                              className="w-4 h-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300 bg-white"
                            />
                            <span>Delete</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-[5px] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition-all shadow-md hover:shadow-brand-primary/10 active:scale-[0.98] cursor-pointer rounded-[5px]"
                >
                  {isLoading ? 'Loading...' : isEditMode ? 'Save Changes' : 'Create User'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmUser !== null}
        title="Confirm Deletion"
        message={
          <>
            Are you sure you want to delete user <span className="font-bold text-slate-800">"{deleteConfirmUser?.username}"</span>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete User"
        cancelLabel="Cancel"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmUser(null)}
        type="danger"
      />
    </div>
  )
}