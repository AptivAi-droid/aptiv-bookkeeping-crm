import { useData } from '../contexts/DataContext'
import { Shield } from 'lucide-react'
export default function AuditLog() {
  const { auditLog } = useData()
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm">Immutable audit trail — Kenya Data Protection Act 2019</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Time','User','Action','Description'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {auditLog.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No audit entries yet</td></tr>
            )}
            {auditLog.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(e.created_at).toLocaleString('en-KE')}</td>
                <td className="px-4 py-3 text-xs text-gray-700">{e.user_email}</td>
                <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{e.action}</span></td>
                <td className="px-4 py-3 text-xs text-gray-600">{e.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
