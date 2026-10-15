import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../services/authService'
import { getSettings } from '../services/settingService'
import Toast from './Toast'
import CurrencyRateWidget from './CurrencyRateWidget'

const IMAGE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/quotation-backend/api'

const getImageUrl = (filename) => {
  if (!filename) return ''
  if (filename.startsWith('data:') || filename.startsWith('http://') || filename.startsWith('https://')) return filename
  return `${IMAGE_BASE_URL}${filename}`
}

const getPageTitle = (pathname) => {
  if (pathname === '/' || pathname === '') return 'Dashboard Overview'
  if (pathname.startsWith('/quotations/spare-parts/new')) return 'New Spare Part Quotation'
  if (pathname.startsWith('/quotations/spare-parts/edit')) return 'Edit Spare Part Quotation'
  if (pathname.startsWith('/quotations/new')) return 'New Scale Quotation'
  if (pathname.startsWith('/quotations/edit')) return 'Edit Scale Quotation'
  if (pathname.startsWith('/quotations')) return 'Quotations Management'
  if (pathname.startsWith('/scales/new') || pathname.startsWith('/products/new')) return 'Add New Scale'
  if (pathname.startsWith('/scales/edit') || pathname.startsWith('/products/edit')) return 'Edit Scale'
  if (pathname.startsWith('/scales') || pathname.startsWith('/products')) return 'Scale Products'
  if (pathname.startsWith('/spare-parts/new')) return 'Add Spare Part'
  if (pathname.startsWith('/spare-parts/edit')) return 'Edit Spare Part'
  if (pathname.startsWith('/spare-parts')) return 'Spare Parts Catalog'
  if (pathname.startsWith('/requirements')) return 'Requirements & Tasks'
  if (pathname.startsWith('/users')) return 'User Management'
  if (pathname.startsWith('/settings')) return 'System Settings'
  return 'Dashboard'
}

import {
  LayoutDashboard,
  Users,
  Package,
  ReceiptText,
  FileText,
  Building2,
  UserCog,
  BarChart3,
  LogOut,
  ChevronDown,
  X,
  Menu,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Settings,
  User,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Key,
  Loader2,
  PlusSquare,
  Grid,
  Wrench
} from 'lucide-react'

export default function Layout({ onLogout }) {
  const { admin, updateAdminDetails } = useAuth()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false)
      }
    }
    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserDropdownOpen])

  // Profile info states (fetched from AuthContext or defaults)
  const [profileName, setProfileName] = useState('Young Alaska')
  const [profileEmail, setProfileEmail] = useState('alskayng@gmail.com')
  const [profileRole, setProfileRole] = useState('Sub-Admin')

  useEffect(() => {
    if (admin) {
      setProfileName(admin.username || 'Young Alaska')
      setProfileEmail(admin.email || 'alskayng@gmail.com')
      setProfileRole(admin.role || 'Sub-Admin')
    }
  }, [admin])

  // Company settings states
  const [companyName, setCompanyName] = useState('Quotation')
  const [companyLogo, setCompanyLogo] = useState(null)

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const data = await getSettings()
        if (data?.settings?.companyDetails) {
          const { companyName: name, companyLogo: logo } = data.settings.companyDetails
          if (name) setCompanyName(name)
          if (logo) setCompanyLogo(getImageUrl(logo))
        }
      } catch (e) {
        console.error('Failed to fetch sidebar settings', e)
      }
    }
    fetchCompanySettings()
  }, [location.pathname])

  // Profile modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    email: '',
  })

  const [profileErrors, setProfileErrors] = useState({})
  const [profileNotification, setProfileNotification] = useState(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const handleEditProfileChange = (e) => {
    const { name, value } = e.target
    setEditProfileData(prev => ({
      ...prev,
      [name]: value
    }))
    if (profileErrors[name]) {
      setProfileErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateProfileForm = () => {
    const errors = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!editProfileData.name.trim()) {
      errors.name = 'Name is required'
    }

    if (!editProfileData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!emailRegex.test(editProfileData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    setProfileErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    if (!validateProfileForm()) return

    try {
      setIsSavingProfile(true)
      setProfileNotification(null)
      const updateData = {
        name: editProfileData.name.trim(),
        email: editProfileData.email.trim(),
      }

      const res = await updateProfile(updateData)

      updateAdminDetails({
        username: res.admin.username,
        email: res.admin.email
      })
      setProfileName(res.admin.username)
      setProfileEmail(res.admin.email)

      setProfileNotification({ type: 'success', message: 'Profile updated successfully!' })
      setTimeout(() => {
        setProfileNotification(null)
        setIsProfileModalOpen(false)
        setIsSavingProfile(false)
      }, 1500)
    } catch (err) {
      console.error(err)
      const errorMsg = err.response?.data?.message || 'Failed to update profile'
      setProfileNotification({ type: 'error', message: errorMsg })
      setIsSavingProfile(false)
    }
  }

  const openProfileModal = () => {
    setEditProfileData({
      name: profileName,
      email: profileEmail,
    })
    setProfileErrors({})
    setProfileNotification(null)
    setIsSavingProfile(false)
    setIsProfileModalOpen(true)
  }

  const getInitials = (name) => {
    if (!name) return 'YA'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Navigation configuration - mutually exclusive dropdown submenus
  const [openSubmenu, setOpenSubmenu] = useState(() => {
    if (location.pathname.startsWith('/spare-parts')) return 'spare-parts'
    if (location.pathname.startsWith('/scales') || location.pathname.startsWith('/products')) return 'products'
    return 'products'
  })

  useEffect(() => {
    if (location.pathname.startsWith('/spare-parts')) {
      setOpenSubmenu('spare-parts')
    } else if (location.pathname.startsWith('/scales') || location.pathname.startsWith('/products')) {
      setOpenSubmenu('products')
    }
  }, [location.pathname])

  const isAdmin = admin?.role === 'Admin'
  const permissions = admin?.permissions || {}

  const generalNav = [
    {
      name: 'Dashboard',
      path: '/',
      show: true,
      icon: (active) => (
        <LayoutDashboard className={`w-5 h-5 ${active ? 'text-white' : 'text-brand-primary'}`} />
      )
    },
    {
      name: 'Scales',
      path: '/scales',
      hasSubmenu: true,
      isDropdownOpen: openSubmenu === 'products',
      toggleDropdown: () => setOpenSubmenu(prev => prev === 'products' ? null : 'products'),
      show: isAdmin || permissions.productAccess === 'yes',
      icon: (active, isHighlighted) => (
        <Package className={`w-5 h-5 ${active ? 'text-white' : 'text-brand-primary'}`} />
      ),
      subItems: [
        {
          name: 'Add Scale',
          path: '/scales/new',
          show: isAdmin || (permissions.productAccess === 'yes' && permissions.productAdd === 'yes'),
          icon: <PlusSquare className="w-4 h-4" />
        },
        {
          name: 'All Scales',
          path: '/scales',
          show: isAdmin || permissions.productAccess === 'yes',
          icon: <Grid className="w-4 h-4" />
        }
      ].filter(sub => sub.show)
    },
    {
      name: 'Spare Parts',
      path: '/spare-parts',
      hasSubmenu: true,
      isDropdownOpen: openSubmenu === 'spare-parts',
      toggleDropdown: () => setOpenSubmenu(prev => prev === 'spare-parts' ? null : 'spare-parts'),
      show: isAdmin || permissions.sparePartsAccess === 'yes',
      icon: (active, isHighlighted) => (
        <Wrench className={`w-5 h-5 ${active ? 'text-white' : 'text-brand-primary'}`} />
      ),
      subItems: [
        {
          name: 'Add Spare Part',
          path: '/spare-parts/new',
          show: isAdmin || (permissions.sparePartsAccess === 'yes' && permissions.sparePartsAdd === 'yes'),
          icon: <PlusSquare className="w-4 h-4" />
        },
        {
          name: 'All Spare Parts',
          path: '/spare-parts',
          show: isAdmin || permissions.sparePartsAccess === 'yes',
          icon: <Grid className="w-4 h-4" />
        }
      ].filter(sub => sub.show)
    },
    {
      name: 'Requirements',
      path: '/requirements',
      show: isAdmin || permissions.requireAccess === 'yes',
      icon: (active) => (
        <FileText className={`w-5 h-5 ${active ? 'text-white' : 'text-brand-primary'}`} />
      )
    },
    {
      name: 'Quotation Generation',
      path: '/quotations',
      show: isAdmin || permissions.quotationAccess === 'yes',
      icon: (active) => (
        <ReceiptText className={`w-5 h-5 ${active ? 'text-white' : 'text-brand-primary'}`} />
      )
    },
    {
      name: 'Settings',
      path: '/settings',
      show: isAdmin || permissions.settingsAccess === 'yes',
      icon: (active) => (
        <Settings className={`w-5 h-5 ${active ? 'text-white' : 'text-brand-primary'}`} />
      )
    },
    {
      name: 'User Management',
      path: '/users',
      show: isAdmin,
      icon: (active) => (
        <UserCog className={`w-5 h-5 ${active ? 'text-white' : 'text-brand-primary'}`} />
      )
    }
  ].filter(item => item.show)


  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname === path || (path !== '/scales' && path !== '/products' && location.pathname.startsWith(path))
  }

  return (
    <div className="flex min-h-screen bg-bg-light overflow-x-hidden">
      {/* Mobile backdrop overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col justify-between bg-white border-r border-slate-100 transition-all duration-300 transform lg:static lg:h-screen
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Sidebar Header */}
          <div className={`flex items-center justify-between h-20 border-b border-slate-200/80 transition-all duration-300 ${isSidebarOpen ? 'px-6' : 'px-4 lg:justify-center'}`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-accent-light text-brand-accent shrink-0 overflow-hidden">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt="Logo"
                    className="w-full h-full object-contain"
                    onError={() => setCompanyLogo(null)}
                  />
                ) : (
                  <ReceiptText className="w-5 h-5" />
                )}
              </div>
              {isSidebarOpen && (
                <span className="text-xl font-bold tracking-tight text-brand-primary whitespace-nowrap animate-in fade-in duration-300 truncate max-w-[140px]">
                  {companyName}
                </span>
              )}
            </div>

            {/* Close button for mobile menu */}
            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-brand-primary rounded-lg hover:bg-slate-50 lg:hidden focus:outline-none cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Collapse/Expand button for desktop */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:block p-1.5 text-slate-400 hover:text-brand-primary rounded-lg hover:bg-slate-50 focus:outline-none cursor-pointer transition-colors"
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarOpen ? (
                <ChevronsLeft className="w-5 h-5" />
              ) : (
                <ChevronsRight className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-7 overflow-y-auto">
            {/* General Section */}
            <div>
              {isSidebarOpen && (
                <span className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Quotation Generation
                </span>
              )}
              <ul className="space-y-1">
                {generalNav.map((item) => {
                  const isParentActive = item.hasSubmenu
                    ? location.pathname.startsWith(item.path)
                    : isActive(item.path)

                  if (item.hasSubmenu) {
                    const hasActiveChild = location.pathname.startsWith(item.path)
                    const isParentHighlighted = item.isDropdownOpen || hasActiveChild

                    return (
                      <li key={item.name} className="space-y-1">
                        <button
                          type="button"
                          onClick={item.toggleDropdown}
                          className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                          ${isParentHighlighted
                              ? 'bg-brand-accent-light text-brand-primary border border-brand-accent/20 font-semibold shadow-xs'
                              : 'bg-slate-50 text-brand-primary hover:bg-slate-100 hover:text-brand-primary'}
                          ${!isSidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            {item.icon(false, isParentHighlighted)}
                            {isSidebarOpen && (
                              <span className="whitespace-nowrap animate-in fade-in duration-300">{item.name}</span>
                            )}
                          </div>
                          {isSidebarOpen && (
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 text-brand-primary ${item.isDropdownOpen ? 'rotate-180' : ''}`} />
                          )}
                        </button>

                        {/* Submenu items */}
                        {item.isDropdownOpen && isSidebarOpen && (
                          <ul className="pl-4 mt-1 space-y-1 animate-in fade-in duration-150">
                            {item.subItems.map((sub) => {
                              const subActive = location.pathname === sub.path || (sub.path === item.path && location.pathname === item.path)
                              return (
                                <li key={sub.name}>
                                  <Link
                                    to={sub.path}
                                    onClick={() => {
                                      if (window.innerWidth < 1024) {
                                        setIsSidebarOpen(false)
                                      }
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-150
            ${subActive
                                        ? 'bg-brand-accent text-white shadow-sm font-semibold'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-brand-primary'}`}
                                  >
                                    <span className={`flex items-center justify-center shrink-0 transition-colors ${subActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-primary'}`}>
                                      {sub.icon}
                                    </span>
                                    <span className="whitespace-nowrap truncate">{sub.name}</span>
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    )
                  }

                  return (
                    <li key={item.name}>
                      <Link
                        to={item.path}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            setIsSidebarOpen(false)
                          }
                        }}
                        title={!isSidebarOpen ? item.name : undefined}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                        ${isParentActive
                            ? 'bg-brand-accent text-white shadow-sm shadow-brand-accent/20 font-semibold'
                            : 'bg-slate-50 text-brand-primary hover:bg-slate-100 hover:text-brand-primary'}
                        ${!isSidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon(isParentActive)}
                          {isSidebarOpen && (
                            <span className="whitespace-nowrap animate-in fade-in duration-300">{item.name}</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t border-slate-50 bg-white transition-all duration-300 ${isSidebarOpen ? 'p-4' : 'lg:p-2'}`}>
          {/* User profile dropdown area */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              aria-label="User profile menu"
              aria-expanded={isUserDropdownOpen}
              className={`flex items-center justify-between w-full p-2 rounded-xl transition-all text-left focus:outline-none cursor-pointer border bg-brand-accent-light text-brand-primary border-brand-accent/20 shadow-sm
              ${!isSidebarOpen ? 'lg:justify-center lg:p-1.5' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 transition-colors bg-brand-accent text-white">
                  <span className="z-10">{getInitials(profileName)}</span>
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent/20 to-transparent" />
                </div>
                {isSidebarOpen && (
                  <div className="min-w-0 animate-in fade-in duration-300">
                    <p className="text-xs font-semibold text-slate-800 truncate">{profileName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{profileEmail}</p>
                  </div>
                )}
              </div>
              {isSidebarOpen && (
                <ChevronsUpDown className="w-4 h-4 shrink-0 transition-colors text-brand-accent" />
              )}
            </button>

            {/* Dropdown Menu */}
            {isUserDropdownOpen && (
              <div className={`absolute bottom-full left-0 right-0 z-50 mb-2 p-1.5 bg-white border border-slate-100 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200
              ${!isSidebarOpen ? 'lg:w-48 lg:left-1/2 lg:-translate-x-1/2' : ''}`}>
                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false)
                    openProfileModal()
                    if (window.innerWidth < 1024) {
                      setIsSidebarOpen(false)
                    }
                  }}
                  className="flex items-center w-full gap-2.5 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 shrink-0 text-slate-500" />
                  <span>My Profile</span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  onClick={onLogout}
                  className="flex items-center w-full gap-2.5 px-3 py-2 text-sm text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 sm:h-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 bg-white shadow-2xs shrink-0">
          {/* Left section: mobile toggle + logo / desktop page title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg lg:hidden focus:outline-none cursor-pointer transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Mobile logo & company */}
            <div className="flex items-center gap-2.5 lg:hidden min-w-0">
              <div className="w-7 h-7 rounded-lg bg-brand-accent-light text-brand-accent flex items-center justify-center overflow-hidden shrink-0">
                {companyLogo ? (
                  <img src={companyLogo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ReceiptText className="w-4 h-4" />
                )}
              </div>
              <span className="text-base font-bold text-brand-primary truncate max-w-[120px] sm:max-w-[180px]">
                {companyName}
              </span>
            </div>

            {/* Desktop breadcrumb / current page indicator */}
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-400">Quotation System</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-800 tracking-tight">{getPageTitle(location.pathname)}</span>
            </div>
          </div>

          {/* Right section: Currency Exchange Rate Widget */}
          <div className="flex items-center gap-2 sm:gap-3">
            <CurrencyRateWidget />
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8">
          <Outlet key={location.pathname} />
        </main>
      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 w-full h-full min-h-screen">
          <div className="relative w-full max-w-md max-h-[85vh] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-50 px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-brand-accent" />
                <span>My Profile</span>
              </h2>
              <button
                onClick={() => {
                  setIsProfileModalOpen(false)
                  setProfileErrors({})
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleProfileSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">

              {/* User Info Section */}
              <div className="flex items-center gap-4 p-4 bg-brand-accent-light/30 border border-brand-accent/10 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-brand-accent text-white font-bold text-lg flex items-center justify-center border border-brand-accent/20 uppercase shadow-sm">
                  {getInitials(profileName)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{profileName}</h3>
                  <p className="text-xs text-slate-500 font-medium">{profileEmail}</p>
                  <span className="inline-flex items-center px-2 py-0.5 mt-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[10px] font-semibold uppercase tracking-wide">
                    {profileRole}
                  </span>
                </div>
              </div>

              {/* Profile Details Section */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <User className="w-3.5 h-3.5 text-brand-accent" />
                  <span>Profile Details</span>
                </h4>

                {/* Profile notification moved to Toast */}

                {/* Name Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={editProfileData.name}
                    onChange={handleEditProfileChange}
                    placeholder="Enter your name"
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all
                      ${profileErrors.name
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/10'
                        : 'border-slate-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent'}`}
                  />
                  {profileErrors.name && (
                    <p className="text-[11px] text-rose-600 font-medium">{profileErrors.name}</p>
                  )}
                </div>

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editProfileData.email}
                    onChange={handleEditProfileChange}
                    placeholder="Enter email address"
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all
                      ${profileErrors.email
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/10'
                        : 'border-slate-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent'}`}
                  />
                  {profileErrors.email && (
                    <p className="text-[11px] text-rose-600 font-medium">{profileErrors.email}</p>
                  )}
                </div>
              </div>



              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  disabled={isSavingProfile}
                  onClick={() => {
                    setIsProfileModalOpen(false)
                    setProfileErrors({})
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition-all shadow-md hover:shadow-brand-primary/10 active:scale-[0.98] cursor-pointer rounded-xl flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSavingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Profile Toast Notification */}
      {profileNotification && (
        <Toast
          type={profileNotification.type}
          message={profileNotification.message}
          onClose={() => setProfileNotification(null)}
        />
      )}
    </div>
  )
}
