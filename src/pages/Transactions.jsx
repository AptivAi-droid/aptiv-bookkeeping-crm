// Transactions page — re-uses roots-bookkeeping pattern, adapted for KES
import { useData } from '../contexts/DataContext'
import { formatKES } from '../services/mpesa'
import { CreditCard } from 'lucide-react'

export default function Transactions() {
  const { mpesaTxs } = useData()
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-500 text-sm">All ledger transactions — KES · ICPAK/IFRS Double Entry</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Reference','Client','Type','Amount (KES)','Date','Status','Source'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mpesaTxs.map(tx => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{tx.mpesa_receipt}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{tx.client_name}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{tx.transaction_type}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{formatKES(tx.amount_kes / 100)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString('en-KE') : '—'}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{tx.status}</span></td>
                <td className="px-4 py-3 text-xs text-gray-500">M-Pesa</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
