import { FileBarChart2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { formatKES } from '../services/mpesa'
export default function Reports() {
  const { clients, mpesaTxs, stats } = useData()
  const totalMpesa = mpesaTxs.filter(t => t.status === 'Completed').reduce((s, t) => s + t.amount_kes, 0)
  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      <p className="text-gray-500 text-sm">ICPAK-compliant financial reports · SASSRA returns · KES</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Members', value: stats.totalClients },
          { label: 'KYC Verified', value: stats.verifiedKyc },
          { label: 'M-Pesa Volume', value: formatKES(totalMpesa / 100) },
          { label: 'AML Flags', value: mpesaTxs.filter(t => t.aml_flag).length },
          { label: 'Open Compliance Issues', value: stats.openFlags },
          { label: 'STRs Due', value: stats.strRequired },
        ].map(r => (
          <div key={r.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{r.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
