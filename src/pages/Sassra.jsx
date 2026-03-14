import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { FileCheck, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

const SASSRA_STANDARDS = [
  { metric: 'Capital Adequacy Ratio', key: 'capital_adequacy_ratio', min: 10, unit: '%', ref: 'SASSRA Rule 11(1)' },
  { metric: 'Liquidity Ratio',        key: 'liquidity_ratio',        min: 15, unit: '%', ref: 'SASSRA Rule 11(2)' },
  { metric: 'Loan-to-Asset Ratio',    key: 'loan_to_asset_ratio',    max: 70, unit: '%', ref: 'SASSRA Rule 12(1)' },
  { metric: 'External Borrowing',     key: 'external_borrowing_ratio', max: 25, unit: '%', ref: 'SASSRA Rule 13' },
]

function isCompliant(metric, value) {
  if (!value) return null
  if (metric.min !== undefined) return value >= metric.min
  if (metric.max !== undefined) return value <= metric.max
  return true
}

export default function Sassra() {
  const { sassraReport, setSassraReport, addAuditEntry } = useData()
  const { user, isCompliance } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...sassraReport })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = () => {
    setSassraReport({ ...form, status: 'Submitted', submitted_date: new Date().toISOString().split('T')[0] })
    addAuditEntry(user?.email, 'SASSRA_SUBMIT', `SASSRA ${form.report_type} for ${form.period} submitted`)
    toast.success('SASSRA report submitted')
    setEditing(false)
  }

  const allCompliant = SASSRA_STANDARDS.every(m => {
    const val = sassraReport[m.key]
    return val ? isCompliant(m, val) : true
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SASSRA Statutory Returns</h1>
          <p className="text-gray-500 text-sm">Sacco Societies Regulatory Authority — Prudential Standards</p>
        </div>
        {isCompliance() && !editing && (
          <button onClick={() => setEditing(true)} className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Edit Report
          </button>
        )}
      </div>

      {/* SASSRA Regulatory Info */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-green-900 mb-2">SASSRA Filing Requirements</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-green-800">
          <span>• Monthly returns: due by 15th of following month</span>
          <span>• Quarterly prudential: due 30 days after quarter-end</span>
          <span>• Annual audited accounts: due 3 months after FY end</span>
          <span>• SASSRA levy: 0.1% of total assets per annum</span>
          <span>• Minimum share capital: KES 10,000,000</span>
          <span>• Statutory reserve: 10% of surplus before dividend</span>
        </div>
      </div>

      {/* Compliance Status */}
      <div className={`rounded-xl border p-4 ${allCompliant ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
        <div className="flex items-center gap-3">
          {allCompliant
            ? <CheckCircle className="w-6 h-6 text-green-700" />
            : <AlertTriangle className="w-6 h-6 text-red-700" />}
          <div>
            <p className={`font-bold text-lg ${allCompliant ? 'text-green-800' : 'text-red-800'}`}>
              {allCompliant ? 'All SASSRA Ratios Compliant' : 'SASSRA Compliance Breach Detected'}
            </p>
            <p className="text-sm text-gray-600">{sassraReport.period} · {sassraReport.report_type}</p>
          </div>
          <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${
            sassraReport.status === 'Submitted' ? 'bg-green-100 text-green-800' :
            sassraReport.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
          }`}>{sassraReport.status}</span>
        </div>
      </div>

      {/* Prudential Ratios */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" /> Prudential Ratios — {sassraReport.period}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SASSRA_STANDARDS.map(m => {
            const val = editing ? form[m.key] : sassraReport[m.key]
            const compliant = isCompliant(m, val)
            return (
              <div key={m.key} className={`rounded-xl border p-4 ${
                compliant === null ? 'border-gray-200' : compliant ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-800">{m.metric}</p>
                  {compliant !== null && (
                    compliant
                      ? <span className="text-xs text-green-700 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" />Compliant</span>
                      : <span className="text-xs text-red-700 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />BREACH</span>
                  )}
                </div>
                {editing ? (
                  <input type="number" value={form[m.key] || ''} onChange={e => set(m.key, parseFloat(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                ) : (
                  <p className={`text-3xl font-bold ${compliant === false ? 'text-red-700' : compliant ? 'text-green-700' : 'text-gray-600'}`}>
                    {val ? `${val}${m.unit}` : '—'}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {m.min !== undefined ? `Min: ${m.min}${m.unit}` : `Max: ${m.max}${m.unit}`} · {m.ref}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Balance Sheet Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Balance Sheet Summary (KES)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Assets',    key: 'total_assets_kes' },
            { label: 'Total Deposits',  key: 'total_deposits_kes' },
            { label: 'Total Loans',     key: 'total_loans_kes' },
            { label: 'Total Equity',    key: 'total_equity_kes' },
          ].map(f => (
            <div key={f.key} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">{f.label}</p>
              {editing ? (
                <input type="number" value={form[f.key] || ''} onChange={e => set(f.key, parseInt(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm mt-1" />
              ) : (
                <p className="font-bold text-gray-900 text-sm mt-1">
                  KES {((sassraReport[f.key] || 0) / 100).toLocaleString('en-KE')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="flex gap-3">
          <button onClick={() => { setForm({ ...sassraReport }); setEditing(false) }}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-medium">
            Save & Submit to SASSRA
          </button>
        </div>
      )}
    </div>
  )
}
