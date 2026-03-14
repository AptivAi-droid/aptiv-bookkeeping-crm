import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Mpesa from './pages/Mpesa'
import Transactions from './pages/Transactions'
import Compliance from './pages/Compliance'
import Sassra from './pages/Sassra'
import CoopRegister from './pages/CoopRegister'
import Bridge from './pages/Bridge'
import Reports from './pages/Reports'
import Journal from './pages/Journal'
import AuditLog from './pages/AuditLog'
import SettingsPage from './pages/Settings'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a2e1a]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-300 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-green-200 text-sm">Loading Aptiv Bookkeeping CRM…</p>
        <p className="text-green-500 text-xs mt-1">Kenya Edition</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/clients"      element={<Clients />} />
        <Route path="/mpesa"        element={<Mpesa />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/compliance"   element={<Compliance />} />
        <Route path="/sassra"       element={<Sassra />} />
        <Route path="/coop"         element={<CoopRegister />} />
        <Route path="/bridge"       element={<Bridge />} />
        <Route path="/reports"      element={<Reports />} />
        <Route path="/journal"      element={<Journal />} />
        <Route path="/audit"        element={<AuditLog />} />
        <Route path="/settings"     element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: { borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
              success: { style: { background: '#166534', color: 'white' } },
              error:   { style: { background: '#dc2626', color: 'white' } },
            }}
          />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
