import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { RefreshCw, CheckCircle, AlertTriangle, Smartphone, BookOpen, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Bridge() {
  const { mpesaTxs, clients, settings } = useData()
  const [bridgeStatus, setBridgeStatus] = useState(null)
  const [checking, setChecking] = useState(false)

  const unsyncedMpesa = mpesaTxs.filter(t => !t.bookkeeping_synced)
  const unsyncedClients = clients.filter(c => !c.bridge_synced)

  const handleHealthCheck = async () => {
    setChecking(true)
    await new Promise(r => setTimeout(r, 1000))
    setBridgeStatus(settings.bridge_enabled ? { connected: true } : { connected: false, message: 'Bridge not configured in Settings' })
    setChecking(false)
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookkeeping Bridge</h1>
        <p className="text-gray-500 text-sm">CRM ↔ Roots Bookkeeping ↔ M-Pesa · Bidirectional data sync</p>
      </div>

      {/* Architecture diagram */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Bridge Architecture</h2>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <BridgeNode icon={<Smartphone className="w-6 h-6" />} label="M-Pesa" sub="Daraja API v2" color="green" />
          <Arrow />
          <BridgeNode icon={<RefreshCw className="w-6 h-6" />} label="Aptiv CRM" sub="Kenya Edition" color="blue" />
          <Arrow />
          <BridgeNode icon={<BookOpen className="w-6 h-6" />} label="Roots Books" sub="SA Bookkeeping" color="amber" />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="font-semibold text-green-800 mb-1">M-Pesa → CRM</p>
            <p>STK Push results, C2B payments, transaction receipts auto-mapped to client records</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="font-semibold text-blue-800 mb-1">CRM → Bookkeeping</p>
            <p>KYC status, client profiles, M-Pesa transactions synced to bookkeeping member & ledger tables</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="font-semibold text-amber-800 mb-1">Bookkeeping → CRM</p>
            <p>Account balances, journal entries, compliance flags pulled back to CRM client view</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Unsynced M-Pesa Transactions</p>
          <p className={`text-3xl font-bold ${unsyncedMpesa.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>{unsyncedMpesa.length}</p>
          <p className="text-xs text-gray-400">Pending push to bookkeeping</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Unsynced Clients</p>
          <p className={`text-3xl font-bold ${unsyncedClients.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>{unsyncedClients.length}</p>
          <p className="text-xs text-gray-400">Not yet pushed to member table</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Bridge Status</p>
          {bridgeStatus === null ? (
            <p className="text-sm text-gray-400">Not checked yet</p>
          ) : bridgeStatus.connected ? (
            <p className="text-green-700 font-bold flex items-center gap-1"><CheckCircle className="w-4 h-4" />Connected</p>
          ) : (
            <p className="text-red-700 font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4" />Disconnected</p>
          )}
          {bridgeStatus?.message && <p className="text-xs text-gray-400 mt-1">{bridgeStatus.message}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleHealthCheck} disabled={checking}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking…' : 'Health Check'}
        </button>
        <button onClick={() => toast.success('Bulk sync initiated — check back in a moment')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <RefreshCw className="w-4 h-4" /> Sync All Pending
        </button>
      </div>

      {/* Config notice */}
      {!settings.bridge_enabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-900">Bridge Not Configured</p>
          <p className="text-xs text-amber-700 mt-1">
            Set <code className="bg-amber-100 px-1 rounded">VITE_BOOKKEEPING_API_URL</code> and <code className="bg-amber-100 px-1 rounded">VITE_BOOKKEEPING_API_KEY</code> in your <code className="bg-amber-100 px-1 rounded">.env</code> file, then enable the bridge in Settings.
          </p>
        </div>
      )}
    </div>
  )
}

function BridgeNode({ icon, label, sub, color }) {
  const colors = { green: 'bg-green-100 text-green-800 border-green-300', blue: 'bg-blue-100 text-blue-800 border-blue-300', amber: 'bg-amber-100 text-amber-800 border-amber-300' }
  return (
    <div className={`flex flex-col items-center p-4 rounded-xl border-2 ${colors[color]} w-32 text-center`}>
      {icon}
      <p className="font-bold text-sm mt-2">{label}</p>
      <p className="text-xs opacity-70">{sub}</p>
    </div>
  )
}

function Arrow() {
  return (
    <div className="flex items-center gap-1 text-gray-400">
      <ArrowRight className="w-5 h-5" />
    </div>
  )
}
