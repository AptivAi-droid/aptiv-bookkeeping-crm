import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { formatKES } from '../services/mpesa'
import { Smartphone, RefreshCw, AlertTriangle, CheckCircle, Clock, X, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  Completed: { cls: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
  Pending:   { cls: 'bg-amber-100 text-amber-800', icon: <Clock className="w-3 h-3" /> },
  Failed:    { cls: 'bg-red-100 text-red-800',     icon: <X className="w-3 h-3" /> },
  Reversed:  { cls: 'bg-gray-100 text-gray-700',   icon: <RefreshCw className="w-3 h-3" /> },
}

export default function Mpesa() {
  const { mpesaTxs, clients, addMpesaTx, addAuditEntry } = useData()
  const { user, canWrite } = useAuth()
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterAml, setFilterAml] = useState('All')
  const [showStkModal, setShowStkModal] = useState(false)

  const filtered = mpesaTxs.filter(tx => {
    const matchStatus = filterStatus === 'All' || tx.status === filterStatus
    const matchAml = filterAml === 'All' || (filterAml === 'AML Flagged' ? tx.aml_flag : !tx.aml_flag)
    return matchStatus && matchAml
  })

  const totalVol = mpesaTxs.filter(t => t.status === 'Completed').reduce((s, t) => s + t.amount_kes, 0)
  const amlCount = mpesaTxs.filter(t => t.aml_flag).length
  const unsyncedCount = mpesaTxs.filter(t => !t.bookkeeping_synced).length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">M-Pesa Transactions</h1>
          <p className="text-gray-500 text-sm">Safaricom Daraja API · POCAMLA AML Monitoring · KES</p>
        </div>
        {canWrite() && (
          <button onClick={() => setShowStkModal(true)}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> STK Push
          </button>
        )}
      </div>

      {/* Daraja API Status */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">Safaricom Daraja API Bridge</p>
            <div className="flex flex-wrap gap-4 mt-1 text-xs text-green-700">
              <span>• STK Push (Lipa Na M-Pesa)</span>
              <span>• C2B Paybill / Till</span>
              <span>• B2C Member Payouts</span>
              <span>• Transaction Status Query</span>
              <span>• POCAMLA auto-flag &gt; KES 1,000,000</span>
              <span>• Auto-sync to Bookkeeping</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Volume (KES)" value={formatKES(totalVol / 100)} color="green" />
        <StatCard label="Total Transactions" value={mpesaTxs.length} color="blue" />
        <StatCard label="AML Flagged" value={amlCount} color="red" sub="POCAMLA review" />
        <StatCard label="Unsynced to Books" value={unsyncedCount} color="amber" sub="Bridge sync pending" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600">
          <option value="All">All Status</option>
          {['Completed','Pending','Failed','Reversed','Queried'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterAml} onChange={e => setFilterAml(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600">
          <option value="All">All AML Status</option>
          <option value="AML Flagged">AML Flagged Only</option>
          <option value="Clear">Clear</option>
        </select>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['M-Pesa Receipt','Client','Type','Amount (KES)','Date','Status','AML','Bookkeeping'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(tx => {
              const stat = STATUS_CONFIG[tx.status] || STATUS_CONFIG.Pending
              return (
                <tr key={tx.id} className={`hover:bg-gray-50 ${tx.aml_flag ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{tx.mpesa_receipt}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{tx.client_name}</p>
                    <p className="text-xs text-gray-400">{tx.phone_number}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{tx.transaction_type}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatKES(tx.amount_kes / 100)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString('en-KE') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${stat.cls}`}>
                      {stat.icon}{tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tx.aml_flag
                      ? <span className="text-xs font-bold text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />AML ⚠</span>
                      : <span className="text-xs text-green-600">✓ Clear</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {tx.bookkeeping_synced
                      ? <span className="text-xs text-green-600 font-medium">✓ Synced</span>
                      : (
                        <button
                          onClick={() => {
                            toast.success('Syncing to bookkeeping…')
                            addAuditEntry(user?.email, 'MPESA_SYNC', `Manual sync initiated: ${tx.mpesa_receipt}`)
                          }}
                          className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded font-medium">
                          Sync Now
                        </button>
                      )
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <Smartphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No M-Pesa transactions found</p>
          </div>
        )}
      </div>

      {/* STK Push Modal */}
      {showStkModal && (
        <StkPushModal
          clients={clients}
          onClose={() => setShowStkModal(false)}
          onSubmit={(data) => {
            addMpesaTx({
              ...data,
              status: 'Pending',
              transaction_type: 'STK Push',
              transaction_date: new Date().toISOString(),
              mpesa_receipt: `STK${Date.now()}`,
              bookkeeping_synced: false,
            })
            addAuditEntry(user?.email, 'MPESA_STK', `STK Push initiated to ${data.phone_number} for ${formatKES(data.amount_kes / 100)}`)
            toast.success('STK Push sent — awaiting customer confirmation')
            setShowStkModal(false)
          }}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, color, sub }) {
  const colors = {
    green: 'bg-green-50 text-green-800 border-green-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold mt-1">{label}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </div>
  )
}

function StkPushModal({ clients, onClose, onSubmit }) {
  const [clientId, setClientId] = useState('')
  const [amount, setAmount] = useState('')
  const [narrative, setNarrative] = useState('')

  const selectedClient = clients.find(c => c.id === clientId)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!clientId || !amount) { toast.error('Select a client and enter an amount'); return }
    const amountCents = Math.round(parseFloat(amount) * 100)
    onSubmit({
      client_id: clientId,
      client_name: selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : '',
      phone_number: selectedClient?.mpesa_phone || '',
      amount_kes: amountCents,
      narrative,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">STK Push — Lipa Na M-Pesa</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Select Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600">
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.mpesa_phone})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Amount (KES)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            {parseFloat(amount) >= 1000000 && (
              <p className="text-xs text-red-600 mt-1 font-medium">⚠ Exceeds POCAMLA KES 1,000,000 threshold — AML flag will be auto-generated</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Narrative / Reference</label>
            <input type="text" value={narrative} onChange={e => setNarrative(e.target.value)} placeholder="e.g. Monthly savings deposit"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>
          <button type="submit" className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
            <Smartphone className="w-4 h-4" /> Send STK Push
          </button>
        </form>
      </div>
    </div>
  )
}
