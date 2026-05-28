import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ErrorBoundary'
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

// ââ GitHub Pages SPA routing fix ââââââââââââââââââââââââââââââââââââââââââââââ
// 404.html encodes the path as /?/<path>; this restores it before React Router runs
;(function () {
  if (window.location.search[1] === '/') {
    var decoded = window.location.search.slice(1).split('&').map(function (s) {
      return s.replace(/~and~/g, '&')
    }).join('?')
    window.history.replaceState(
      null, null,
      window.location.pathname.replace(/\/$/, '') + decoded + window.location.hash
    )
  }
})()

// ââ Protected route âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a2e1a]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-300 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-green-200 text-sm">Loading Aptiv Bookkeeping CRMâ¦</p>
          <p className="text-green-500 text-xs mt-1">Kenya Edition Â· CBK Â· SASSRA Â· ICPAK</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

// ââ App routes ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard"    element={<ErrorBoundary pageName="Dashboard"><Dashboard /></ErrorBoundary>} />
        <Route path="/clients"      element={<ErrorBoundary pageName="Clients"><Clients /></ErrorBoundary>} />
        <Route path="/mpesa"        element={<ErrorBoundary pageName="M-Pesa"><Mpesa /></ErrorBoundary>} />
        <Route path="/transactions" element={<ErrorBoundary pageName="Transactions"><Transactions /></ErrorBoundary>} />
        <Route path="/compliance"   element={<ErrorBoundary pageName="Compliance"><Compliance /></ErrorBoundary>} />
        <Route path="/sassra"       element={<ErrorBoundary pageName="SASSRA"><Sassra /></ErrorBoundary>} />
        <Route path="/coop"         element={<ErrorBoundary pageName="Co-op Register"><CoopRegister /></ErrorBoundary>} />
        <Route path="/bridge"       element={<ErrorBoundary pageName="Bridge"><Bridge /></ErrorBoundary>} />
        <Route path="/reports"      element={<ErrorBoundary pageName="Reports"><Reports /></ErrorBoundary>} />
        <Route path="/journal"      element={<ErrorBoundary pageName="Journal"><Journal /></ErrorBoundary>} />
        <Route path="/audit"        element={<ErrorBoundary pageName="Audit Log"><AuditLog /></ErrorBoundary>} />
        <Route path="/settings"     element={<ErrorBoundary pageName="Settings"><SettingsPage /></ErrorBoundary>} />
      </Route>

      {/* Catch-all â redirect unknown paths to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// ââ Root ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function App() {
  return (
    <ErrorBoundary pageName="the application">
      <BrowserRouter basename="/aptiv-bookkeeping-crm">
        <AuthProvider>
          <DataProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  borderRadius: '8px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                },
                success: { style: { background: '#166534', color: 'white' } },
                error:   { style: { background: '#dc2626', color: 'white' } },
              }}
            />
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
