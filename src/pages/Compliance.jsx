import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { ShieldAlert, AlertTriangle, CheckCircle, Clock, X, Info, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const SEV_CONFIG = {
  CRITICAL: { cls: 'bg-red-200 text-red-900 border-red-300',   dot: 'bg-red-600',   icon: <AlertTriangle className="w-4 h-4" /> },
  HIGH:     { cls: 'bg-red-100 text-red-800 border-red-200',   dot: 'bg-red-500',   icon: <AlertTriangle className="w-4 h-4" /> },
  MEDIUM:   { cls: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500', icon: <Info className="w-4 h-4" /> },
  LOW:      { cls: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-400',  icon: <Info className="w-4 h-4" /> },
}

const STATUS_CONFIG = {
  'Open':          { cls: 'bg-red-100 text-red-700' },
  'In Review':     { cls: 'bg-amber-100 text-amber-700' },
  'Escalated':     { cls: 'bg-orange-100 text-orange-700' },
  'STR Filed':     { cls: 'bg-purple-100 text-purple-700' },
  'Resolved':      { cls: 'bg-green-100 text-green-700' },
  'False Positive':{ cls: 'bg-gray-100 text-gray-700' },
}

export default function Compliance() {
  const { flags, updateFlag, addAuditEntry } = useData()
  const { user, isCompliance } = useAuth()
  const [filterSev, setFilterSev] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterBody, setFilterBody] = useState('All')
  const [selected, setSelected] = useState(null)
  const [resolveNote, setResolveNote] = useState('')
  const [strRef, setStrRef] = useState('')

  const filtered = flags.filter(f => {
    const matchSev    = filterSev    === 'All' || f.severity === filterSev
    const matchStatus = filterStatus === 'All' || f.status === filterStatus
    const matchBody   = filterBody   === 'All' || f.regulatory_body === filterBody
    return matchSev && matchStatus && matchBody
  })

  const counts = {
    critical: flags.filter(f => f.severity === 'CRITICAL' && f.status !== 'Resolved').length,
    high:     flags.filter(f => f.severity === 'HIGH'     && f.status !== 'Resolved').length,
    medium:   flags.filter(f => f.severity === 'MEDIUM'   && f.status !== 'Resolved').length,
    low:      flags.filter(f => f.severity === 'LOW'      && f.status !== 'Resolved').length,
    strPending: flags.filter(f => f.str_required && !f.str_filed).length,
    resolved: flags.filter(f => f.status === 'Resolved').length,
  }

  const handleResolve = () => {
    if (!resolveNote.trim()) { toast.error('Resolution note required'); return }
    updateFlag(selected.id, { status: 'Resolved', resolved_date: new Date().toISOString().split('T')[0], resolution_notes: resolveNote, assigned_to: user?.id })
    addAuditEntry(user?.email, 'COMPLIANCE_RESOLVE', `Resolved flag: ${selected.flag_type} — ${selected.client_name}`)
    toast.success('Flag resolved')
    setSelected(null); setResolveNote('')
  }

  const handleFileStr = () => {
    if (!strRef.trim()) { toast.error('Enter STR reference number'); return }
    updateFlag(selected.id, { status: 'STR Filed', str_filed: true, str_filed_date: new Date().toISOString().split('T')[0], str_reference: strRef })
    addAuditEntry(user?.email, 'STR_FILED', `STR filed to CBK: ${strRef} for ${selected.client_name} — ${selected.flag_type}`)
    toast.success(`STR ${strRef} filed to CBK`)
    setSelected(null); setStrRef('')
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Engine</h1>
        <p className="text-gray-500 text-sm">POCAMLA · CBK · SASSRA · ICPAK · Commissioner of Co-operatives · Data Protection Act 2019</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <SummaryCard count={counts.critical} label="Critical" color="red-900" />
        <SummaryCard count={counts.high}     label="High"     color="red" />
        <SummaryCard count={counts.medium}   label="Medium"   color="amber" />
        <SummaryCard count={counts.low}      label="Low"      color="blue" />
        <SummaryCard count={counts.strPending} label="STRs Due" color="purple" />
        <SummaryCard count={counts.resolved} label="Resolved" color="green" />
      </div>

      {/* Regulatory Reference */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-red-900 mb-2">🇰🇪 Kenya Regulatory Reference</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-red-800">
          <span>• POCAMLA s12: STR to CBK within 3 days of suspicion</span>
          <span>• POCAMLA s44: KES 1,000,000+ cash transactions reported</span>
          <span>• CBK KYC Directive 2013: identity & address verification</span>
          <span>• SASSRA Rule 11: capital adequacy ≥ 10%, liquidity ≥ 15%</span>
          <span>• ICPAK: IFRS-compliant financial statements</span>
          <span>• Co-operatives Act: member register & AGM requirements</span>
          <span>• Data Protection Act 2019: member data consent & audit trail</span>
          <span>• Income Tax Act Cap 470: KRA PIN for all members</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {['All','CRITICAL','HIGH','MEDIUM','LOW'].map(s => (
          <button key={s} onClick={() => setFilterSev(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filterSev === s ? 'bg-green-700 text-white border-green-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}>{s}</button>
        ))}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="All">All Status</option>
          {['Open','In Review','Escalated','STR Filed','Resolved','False Positive'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterBody} onChange={e => setFilterBody(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="All">All Regulators</option>
          {['CBK','SASSRA','ICPAK','Commissioner of Co-operatives','POCAMLA','KRA','DPO'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Flags List */}
      <div className="space-y-3">
        {filtered.map(flag => {
          const sev = SEV_CONFIG[flag.severity]
          const stat = STATUS_CONFIG[flag.status] || { cls: 'bg-gray-100 text-gray-700' }
          return (
            <div key={flag.id} className={`bg-white rounded-xl border p-5 ${
              ['CRITICAL','HIGH'].includes(flag.severity) && !['Resolved','False Positive'].includes(flag.status)
                ? 'border-red-200 shadow-sm shadow-red-50' : 'border-gray-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg border flex-shrink-0 ${sev.cls}`}>{sev.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${sev.cls}`}>{flag.severity}</span>
                    <span className="font-semibold text-gray-900 text-sm">{flag.flag_type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.cls}`}>{flag.status}</span>
                    {flag.regulatory_body && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{flag.regulatory_body}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{flag.description}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                    {flag.client_name && <span>Client: <span className="text-gray-600 font-medium">{flag.client_name}</span></span>}
                    <span>Detected: <span className="text-gray-600">{flag.detected_date}</span></span>
                    {flag.regulatory_ref && <span>Ref: <span className="text-gray-500 italic">{flag.regulatory_ref}</span></span>}
                    {flag.str_required && (
                      <span className={`font-semibold ${flag.str_filed ? 'text-purple-600' : 'text-red-600'}`}>
                        {flag.str_filed ? `✓ STR Filed: ${flag.str_reference}` : '⚠ STR NOT YET FILED — Due to CBK'}
                      </span>
                    )}
                  </div>
                  {flag.resolution_notes && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg text-xs text-green-800">
                      <span className="font-semibold">Resolution: </span>{flag.resolution_notes}
                    </div>
                  )}
                </div>
                {isCompliance() && !['Resolved','False Positive'].includes(flag.status) && (
                  <button onClick={() => setSelected(flag)}
                    className="flex-shrink-0 text-sm bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg font-medium">
                    Manage
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-green-400" />
          <p className="font-semibold text-green-700 text-lg">No compliance flags</p>
          <p className="text-sm">Matching your current filters</p>
        </div>
      )}

      {/* Manage Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Manage Compliance Flag</h2>
              <button onClick={() => { setSelected(null); setResolveNote(''); setStrRef('') }}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className={`p-3 rounded-lg border ${SEV_CONFIG[selected.severity].cls}`}>
                <p className="font-semibold text-sm">{selected.flag_type}</p>
                <p className="text-sm mt-1">{selected.description}</p>
                {selected.regulatory_ref && <p className="text-xs mt-1 italic opacity-80">{selected.regulatory_ref}</p>}
              </div>

              {/* STR Filing */}
              {selected.str_required && !selected.str_filed && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                  <p className="text-xs font-bold text-red-800 flex items-center gap-1"><FileText className="w-3 h-3" />
                    STR Required — File to CBK within 3 working days (POCAMLA s12)
                  </p>
                  <input value={strRef} onChange={e => setStrRef(e.target.value)}
                    placeholder="CBK STR reference number…"
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  <button onClick={handleFileStr}
                    className="w-full bg-red-700 hover:bg-red-800 text-white py-2 rounded-lg text-sm font-medium">
                    File STR to CBK
                  </button>
                </div>
              )}

              {/* Resolution */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Resolution Notes *</label>
                <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} rows={3}
                  placeholder="Describe the action taken…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { updateFlag(selected.id, { status: 'In Review', assigned_to: user?.id }); toast.success('Assigned for review'); setSelected(null) }}
                  className="flex-1 px-4 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-sm font-medium">
                  Take Ownership
                </button>
                <button onClick={handleResolve}
                  className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-medium">
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ count, label, color }) {
  const colors = {
    'red-900': 'bg-red-100 border-red-300 text-red-900',
    red:    'bg-red-50 border-red-200 text-red-800',
    amber:  'bg-amber-50 border-amber-200 text-amber-800',
    blue:   'bg-blue-50 border-blue-200 text-blue-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    green:  'bg-green-50 border-green-200 text-green-800',
  }
  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs font-semibold mt-1">{label}</div>
    </div>
  )
}
