import { NavLink } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import {
  LayoutDashboard, Users, CreditCard, ShieldAlert,
  FileBarChart2, Settings, LogOut, BookOpen, RefreshCw,
  Building2, Smartphone, FileCheck
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const nav = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients',     icon: Users,            label: 'Clients / KYC' },
  { to: '/mpesa',       icon: Smartphone,       label: 'M-Pesa' },
  { to: '/transactions', icon: CreditCard,      label: 'Transactions' },
  { to: '/compliance',  icon: ShieldAlert,      label: 'Compliance' },
  { to: '/sassra',      icon: FileCheck,        label: 'SASSRA Reports' },
  { to: '/coop',        icon: Building2,        label: 'Co-op Register' },
  { to: '/bridge',      icon: RefreshCw,        label: 'Bookkeeping Bridge' },
  { to: '/reports',     icon: FileBarChart2,    label: 'Reports' },
  { to: '/journal',     icon: BookOpen,         label: 'Journal' },
  { to: '/settings',    icon: Settings,         label: 'Settings' },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const { stats } = useData()

  return (
    <aside className="w-64 bg-[#0a2e1a] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-green-900">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Aptiv Bookkeeping</p>
            <p className="text-green-400 text-xs font-medium">CRM — Kenya</p>
          </div>
        </div>
        <div className="mt-2 px-2 py-1 bg-green-900/50 rounded-lg">
          <p className="text-green-300 text-xs text-center">🇰🇪 KES · CBK · SASSRA · ICPAK</p>
        </div>
      </div>

      {/* Alert badges */}
      {(stats.criticalFlags > 0 || stats.strRequired > 0) && (
        <div className="mx-4 mt-3 p-2 bg-red-900/40 border border-red-700 rounded-lg">
          {stats.criticalFlags > 0 && (
            <p className="text-red-300 text-xs font-medium">⚠ {stats.criticalFlags} critical compliance flag{stats.criticalFlags > 1 ? 's' : ''}</p>
          )}
          {stats.strRequired > 0 && (
            <p className="text-red-300 text-xs font-medium">📋 {stats.strRequired} STR{stats.strRequired > 1 ? 's' : ''} due to CBK</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-700 text-white'
                  : 'text-green-200 hover:bg-green-900/60 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            {label === 'Compliance' && stats.openFlags > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {stats.openFlags > 9 ? '9+' : stats.openFlags}
              </span>
            )}
            {label === 'M-Pesa' && stats.unsyncedTxs > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {stats.unsyncedTxs}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-green-900">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">{user?.first_name?.[0] || 'U'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-green-400 text-xs truncate">{user?.role}</p>
          </div>
        </div>
        <button onClick={signOut} className="flex items-center gap-2 text-green-300 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-900/40 w-full transition-colors">
          <LogOut className="w-3.5 h-3.5" /><span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
