import { useData } from '../contexts/DataContext'
import { formatKES } from '../services/mpesa'
import { Users, ShieldAlert, Smartphone, AlertTriangle, CheckCircle, Clock, FileCheck, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const { stats, clients, flags, mpesaTxs } = useData()

  const recentFlags = flags.filter(f => f.status !== 'Resolved').slice(0, 4)
  const recentMpesa = mpesaTxs.slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aptiv Bookkeeping CRM</h1>
        <p className="text-gray-500 text-sm">Kenya Edition — CBK · SASSRA · ICPAK · POCAMLA · Commissioner of Co-operatives</p>
      </div>

      {/* Regulatory banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-4 text-xs text-green-800">
          <span className="font-semibold text-green-900">🇰🇪 Active Regulatory Framework:</span>
          <span>• POCAMLA — KES 1M AML threshold</span>
          <span>• CBK KYC Directive 2013</span>
          <span>• SASSRA Prudential Standards</span>
          <span>• ICPAK/IFRS Chart of Accounts</span>
          <span>• Commissioner of Co-operatives Act</span>
          <span>• Data Protection Act 2019</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Users className="w-5 h-5" />} value={stats.totalClients} label="Total Clients" sub={`${stats.verifiedKyc} KYC Verified`} color="blue" />
        <KpiCard icon={<Clock className="w-5 h-5" />} value={stats.pendingKyc} label="KYC Pending" sub="Require action" color="amber" />
        <KpiCard icon={<ShieldAlert className="w-5 h-5" />} value={stats.openFlags} label="Open Flags" sub={`${stats.criticalFlags} critical`} color="red" />
        <KpiCard icon={<Smartphone className="w-5 h-5" />} value={formatKES(stats.totalMpesaVol / 100)} label="M-Pesa Volume" sub="All time" color="green" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<AlertTriangle className="w-5 h-5" />} value={stats.strRequired} label="STRs Due to CBK" sub="Suspicious tx reports" color="red" />
        <KpiCard icon={<TrendingUp className="w-5 h-5" />} value={stats.highRisk} label="High-Risk Clients" sub="AML rating: High/Very High" color="amber" />
        <KpiCard icon={<FileCheck className="w-5 h-5" />} value={stats.unsyncedTxs} label="Unsynced to Bookkeeping" sub="Bridge sync required" color="blue" />
        <KpiCard icon={<CheckCircle className="w-5 h-5" />} value={`${Math.round((stats.verifiedKyc / Math.max(stats.totalClients,1)) * 100)}%`} label="KYC Completion Rate" sub="CBK target: 100%" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Compliance Flags */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" /> Open Compliance Flags
            </h2>
            <a href="/compliance" className="text-xs text-green-700 hover:underline">View all</a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentFlags.length === 0 && (
              <div className="p-5 text-center text-gray-400 text-sm">No open flags</div>
            )}
            {recentFlags.map(f => (
              <div key={f.id} className="px-5 py-3 flex items-start gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                  f.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                  f.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                  f.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                }`}>{f.severity}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.flag_type}</p>
                  <p className="text-xs text-gray-500">{f.client_name} · {f.regulatory_body}</p>
                  {f.str_required && !f.str_filed && (
                    <p className="text-xs text-red-600 font-medium mt-0.5">⚠ STR required — not yet filed</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent M-Pesa Transactions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-green-600" /> Recent M-Pesa
            </h2>
            <a href="/mpesa" className="text-xs text-green-700 hover:underline">View all</a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentMpesa.map(tx => (
              <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{tx.client_name}</p>
                  <p className="text-xs text-gray-500">{tx.mpesa_receipt} · {tx.transaction_type}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.aml_flag ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatKES(tx.amount_kes / 100)}
                  </p>
                  <p className={`text-xs ${tx.bookkeeping_synced ? 'text-green-600' : 'text-amber-600'}`}>
                    {tx.bookkeeping_synced ? '✓ Synced' : '⏳ Pending sync'}
                  </p>
                  {tx.aml_flag && <p className="text-xs text-red-500 font-medium">AML ⚠</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SASSRA Quick Ratios */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-green-600" /> SASSRA Prudential Ratios — Q1 2026
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <RatioCard label="Capital Adequacy" value="14.2%" min="10%" status="pass" />
          <RatioCard label="Liquidity Ratio" value="18.5%" min="15%" status="pass" />
          <RatioCard label="Loan-to-Asset" value="52.3%" max="70%" status="pass" />
          <RatioCard label="External Borrowing" value="8.1%" max="25%" status="pass" />
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon, value, label, sub, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="opacity-70">{icon}</div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold mt-1">{label}</div>
      <div className="text-xs opacity-70">{sub}</div>
    </div>
  )
}

function RatioCard({ label, value, min, max, status }) {
  return (
    <div className={`rounded-lg border p-3 ${status === 'pass' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${status === 'pass' ? 'text-green-700' : 'text-red-700'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">
        {min && `Min: ${min}`}{max && `Max: ${max}`} — SASSRA
      </p>
      <p className={`text-xs font-semibold mt-1 ${status === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
        {status === 'pass' ? '✓ Compliant' : '✗ Breach'}
      </p>
    </div>
  )
}
