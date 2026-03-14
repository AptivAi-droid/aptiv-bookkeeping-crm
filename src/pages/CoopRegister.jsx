import { useData } from '../contexts/DataContext'
import { formatKES } from '../services/mpesa'
import { Building2, Users, CheckCircle } from 'lucide-react'

export default function CoopRegister() {
  const { clients } = useData()
  const coopClients = clients.filter(c => c.client_type === 'Co-operative' || c.sassra_member_class)
  const totalShareCapital = clients.reduce((s, c) => s + (c.sacco_share_capital || 0), 0)
  const totalSavings = clients.reduce((s, c) => s + (c.sacco_savings_balance || 0), 0)
  const totalLoans = clients.reduce((s, c) => s + (c.sacco_loan_balance || 0), 0)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Co-operative Register</h1>
        <p className="text-gray-500 text-sm">Commissioner of Co-operatives — Co-operative Societies Act (Kenya)</p>
      </div>

      {/* Regulatory Info */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-green-900 mb-2">Commissioner of Co-operatives Requirements</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-green-800">
          <span>• Member register must be maintained at registered office</span>
          <span>• AGM required annually within 4 months of FY end</span>
          <span>• Audited accounts submitted to Commissioner annually</span>
          <span>• Member share transfers require board approval</span>
          <span>• Minimum 10 members to register a co-operative</span>
          <span>• Dividends limited to share capital contribution ratio</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Share Capital</p>
          <p className="text-2xl font-bold text-green-700">{formatKES(totalShareCapital / 100)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Savings</p>
          <p className="text-2xl font-bold text-blue-700">{formatKES(totalSavings / 100)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Loan Exposure</p>
          <p className="text-2xl font-bold text-red-700">{formatKES(totalLoans / 100)}</p>
        </div>
      </div>

      {/* Member Register */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-green-600" />
          <h2 className="font-semibold text-gray-900">Member Register</h2>
          <span className="ml-auto text-xs text-gray-500">Total: {clients.length} members</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['CRM ID','Member Name','Type','SASSRA Class','Share Capital','Savings','Loan Exposure','KYC'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.crm_id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{c.client_type}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{c.sassra_member_class || '—'}</td>
                <td className="px-4 py-3 text-xs text-green-700 font-medium">{formatKES(c.sacco_share_capital / 100)}</td>
                <td className="px-4 py-3 text-xs text-blue-700">{formatKES(c.sacco_savings_balance / 100)}</td>
                <td className="px-4 py-3 text-xs text-red-700">{formatKES(c.sacco_loan_balance / 100)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    c.kyc_status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>{c.kyc_status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
