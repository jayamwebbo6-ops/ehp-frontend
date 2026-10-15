import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, lazy, Suspense } from 'react'
import Layout from './components/Layout'
import Loader from './components/Loader'
import './App.css'

// Lazy loaded page components
const Login = lazy(() => import('./pages/Login'))
const Dashborad = lazy(() => import('./pages/Dashborad'))
const Settings = lazy(() => import('./pages/Settings'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const AllProducts = lazy(() => import('./pages/AllProducts'))
const AddProduct = lazy(() => import('./pages/AddProduct'))
const QuotationGeneration = lazy(() => import('./pages/QuotationGeneration'))
const AddQuotation = lazy(() => import('./pages/AddQuotation'))
const Requirements = lazy(() => import('./pages/Requirements'))
const AllSpareParts = lazy(() => import('./pages/AllSpareParts'))
const AddSparePart = lazy(() => import('./pages/AddSparePart'))
const AddSparePartQuotation = lazy(() => import('./pages/AddSparePartQuotation'))

import { useAuth } from './context/AuthContext'

function App() {
  const { isAuthenticated, loading, admin, logoutUser } = useAuth()

  if (loading) {
    return <Loader />
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <Login />
            } 
          />
          <Route 
            path="/" 
            element={
              isAuthenticated ? <Layout onLogout={logoutUser} /> : <Navigate to="/login" replace />
            }
          >
            <Route index element={<Dashborad />} />
            <Route path="settings" element={<Settings />} />
            <Route 
              path="users" 
              element={
                isAuthenticated && admin?.role === 'Admin' ? <UserManagement /> : <Navigate to="/" replace />
              } 
            />
            <Route path="requirements" element={<Requirements />} />
            <Route path="scales" element={<AllProducts />} />
            <Route path="scales/new" element={<AddProduct />} />
            <Route path="scales/edit/:id" element={<AddProduct />} />
            <Route path="products" element={<Navigate to="/scales" replace />} />
            <Route path="products/new" element={<Navigate to="/scales/new" replace />} />
            <Route path="products/edit/:id" element={<AddProduct />} />
            <Route path="spare-parts" element={<AllSpareParts />} />
            <Route path="spare-parts/new" element={<AddSparePart />} />
            <Route path="spare-parts/edit/:id" element={<AddSparePart />} />
            <Route path="quotations" element={<QuotationGeneration />} />
            <Route path="quotations/spare-parts/new" element={<AddSparePartQuotation />} />
            <Route path="quotations/spare-parts/edit/:id" element={<AddSparePartQuotation />} />
            <Route path="quotations/new" element={<AddQuotation />} />
            <Route path="quotations/edit/:id" element={<AddQuotation />} />
          </Route>
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
