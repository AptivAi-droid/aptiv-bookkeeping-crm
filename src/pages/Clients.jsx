import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { formatKES } from '../services/mpesa'
import { Users, Plus, Search, CheckCircle, Clock, AlertTriangle, X, ShieldAlert, User } from 'lucide-react'
import toast from 'react-hot-toast'

const KYC_CONFIG = {
  Verified:     { cls: 'bg-green-100 text-green-800',  icon: <CheckCircle className="w-3 h-3" /> },
  Pending:      { cls: 'bg-amber-100 text-amber-800',   icon: <Clock className="w-3 h-3" /> },
  Incomplete:   { cls: 'bg-red-100 text-red-800',      icon: <AlertTriangle className="w-3 h-3" /> },
  Rejected:     { cls: 'bg-red-100 text-red-800',      icon: <X className="w-3 h-3" /> },
  'Under Review': { cls: 'bg-blue-100 text-blue-800',  icon: <Clock className="w-3 h-3" /> },
}

const AML_CONFIG = {
  Low:       'bg-green-100 text-green-800',
  Medium:    'bg-amber-100 text-amber-800',
  High:      'bg-red-100 text-red-800',
  'Very High': 'bg-red-200 text-red-900',
}

const COUNTIES = [
  'Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Malindi','Kitale',
  'Garissa','Kakamega','Kiambu','Machakos','Meru','Nyeri','Kisii','Other'
]

export default function Clients() {
  const { clients, addClient, updateClient, addAuditEntry } = useData()
  const { user, canWrite } = useAuth()
  const [search, setSearch] = useState('')
  const [filterKyc, setFilterKyc] = useState('All')
  const [filterAml, setFilterAml] = useState('All')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showKycPanel, setShowKycPanel] = useState(false)

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      c.first_name?.toLowerCase().includes(q) ||
      c.last_name?.toLowerCase().includes(q) ||
      c.crm_id?.toLowerCase().includes(q) ||
      c.national_id_number?.includes(q) ||
      c.kra_pin?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    const matchKyc = filterKyc === 'All' || c.kyc_status === filterKyc
    const matchAml = filterAml === 'All' || c.aml_risk_rating === filterAml
    return matchSearch && matchKyc && matchAml
  })

  const handleVerifyKyc = (clientId) => {
    updateClient(clientId, { kyc_status: 'Verified', kyc_verified_date: new Date().toISOString().split('T')[0], kyc_verified_by: user?.id })
    addAuditEntry(user?.email, 'KYC', `KYC verified for client ${clientId}`, 'client', clientId)
    toast.success('KYC verified successfully')
    setShowKycPanel(false)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients & KYC</h1>
          <p className="text-gray-500 text-sm">CBK KYC Directive · POCAMLA · Data Protection Act 2019</p>
        </div>
        {canWrite() && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        )}
      </div>

      {/* CBK Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-900 mb-1">CBK KYC Requirements</p>
        <div className="flex flex-wrap gap-3 text-xs text-blue-700">
          <span>• National ID / Passport / Alien ID required</span>
          <span>• KRA PIN for tax compliance</span>
          <span>• Proof of address (utility bill/bank statement)</span>
          <span>• Source of funds documentation</span>
          <span>• PEP screening — enhanced due diligence if PEP</span>
          <span>• Annual KYC refresh</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, KRA PIN, phone…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
        </div>
        <select value={filterKyc} onChange={e => setFilterKyc(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600">
          <option value="All">All KYC Status</option>
          {['Verified','Pending','Incomplete','Rejected','Under Review'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterAml} onChange={e => setFilterAml(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600">
          <option value="All">All AML Risk</option>
          {['Low','Medium','High','Very High'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Client Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['CRM ID','Client','ID / KRA PIN','Phone','KYC Status','AML Risk','SACCO Balance','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(c => {
              const kyc = KYC_CONFIG[c.kyc_status] || KYC_CONFIG.Pending
              return (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.crm_id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.first_name} {c.last_name}</div>
                    <div className="text-xs text-gray-400">{c.client_type} · {c.county}</div>
                    {c.aml_pep_status && <div className="text-xs text-red-600 font-semibold">⚠ PEP</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div>{c.national_id_number || c.passport_number || c.alien_id_number || <span className="text-red-400">Missing</span>}</div>
                    <div className="text-gray-400">{c.kra_pin || <span className="text-amber-500">No KRA PIN</span>}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full w-fit ${kyc.cls}`}>
                      {kyc.icon}{c.kyc_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${AML_CONFIG[c.aml_risk_rating]}`}>
                      {c.aml_risk_rating}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="text-gray-600">{formatKES(c.sacco_savings_balance / 100)}</div>
                    <div className="text-gray-400">Loan: {formatKES(c.sacco_loan_balance / 100)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setSelected(c); setShowKycPanel(true) }}
                        className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded font-medium">
                        View KYC
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No clients found</p>
          </div>
        )}
      </div>

      {/* KYC Detail Panel */}
      {showKycPanel && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selected.first_name} {selected.last_name}</h2>
                <p className="text-sm text-gray-500">{selected.crm_id} · {selected.client_type}</p>
              </div>
              <button onClick={() => setShowKycPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* KYC Checklist */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-green-600" /> KYC Checklist — CBK Directive 2013
                </h3>
                <div className="space-y-2">
                  <KycItem label="Government-issued ID (National ID / Passport / Alien ID)" done={!!selected.national_id_number || !!selected.passport_number} value={selected.national_id_number || selected.passport_number || selected.alien_id_number} />
                  <KycItem label="KRA PIN (Income Tax Act Cap 470)" done={!!selected.kra_pin} value={selected.kra_pin} />
                  <KycItem label="Proof of Address verified" done={selected.kyc_doc_address_verified} />
                  <KycItem label="Source of Funds documented (POCAMLA s44)" done={selected.source_of_funds_docs} value={selected.source_of_funds} />
                  <KycItem label="PEP Screening completed" done={selected.aml_sanctions_checked} extra={selected.aml_pep_status ? '⚠ PEP Identified — EDD Required' : 'No PEP status'} warn={selected.aml_pep_status} />
                  <KycItem label="UN/OFAC/AU Sanctions check" done={selected.aml_sanctions_checked} />
                </div>
              </div>

              {/* ID Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="National ID" value={selected.national_id_number} />
                <Detail label="KRA PIN" value={selected.kra_pin} />
                <Detail label="Passport" value={selected.passport_number} />
                <Detail label="Alien ID" value={selected.alien_id_number} />
                <Detail label="County" value={selected.county} />
                <Detail label="Phone (M-Pesa)" value={selected.mpesa_phone} />
                <Detail label="AML Risk Rating" value={selected.aml_risk_rating} />
                <Detail label="SASSRA Member Class" value={selected.sassra_member_class} />
                <Detail label="SACCO Admission Date" value={selected.sassra_admission_date} />
                <Detail label="Co-op Reg Number" value={selected.co_op_reg_number} />
              </div>

              {/* SACCO Balances */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-3">SACCO Balances (KES)</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-xs text-gray-500">Share Capital</p><p className="font-bold text-green-700">{formatKES(selected.sacco_share_capital / 100)}</p></div>
                  <div><p className="text-xs text-gray-500">Savings</p><p className="font-bold text-blue-700">{formatKES(selected.sacco_savings_balance / 100)}</p></div>
                  <div><p className="text-xs text-gray-500">Loan Balance</p><p className="font-bold text-red-700">{formatKES(selected.sacco_loan_balance / 100)}</p></div>
                </div>
              </div>

              {/* Actions */}
              {canWrite() && selected.kyc_status !== 'Verified' && (
                <button onClick={() => handleVerifyKyc(selected.id)}
                  className="w-full bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Mark KYC as Verified
                </button>
              )}
              {selected.kyc_status === 'Verified' && (
                <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-semibold py-2 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle className="w-4 h-4" /> KYC Fully Verified — CBK Compliant
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAdd && (
        <AddClientModal
          counties={COUNTIES}
          onClose={() => setShowAdd(false)}
          onAdd={(data) => {
            addClient(data)
            addAuditEntry(user?.email, 'CLIENT_ADD', `New client onboarded: ${data.first_name} ${data.last_name}`)
            toast.success('Client added successfully')
            setShowAdd(false)
          }}
        />
      )}
    </div>
  )
}

function KycItem({ label, done, value, extra, warn }) {
  return (
    <div className={`flex items-start gap-3 p-2.5 rounded-lg ${done ? 'bg-green-50' : 'bg-red-50'}`}>
      <span className={`flex-shrink-0 mt-0.5 ${done ? 'text-green-600' : 'text-red-500'}`}>
        {done ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      </span>
      <div>
        <p className={`text-xs font-medium ${done ? 'text-green-800' : 'text-red-800'}`}>{label}</p>
        {value && <p className="text-xs text-gray-500 mt-0.5">{value}</p>}
        {extra && <p className={`text-xs mt-0.5 font-semibold ${warn ? 'text-red-600' : 'text-gray-500'}`}>{extra}</p>}
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-medium text-gray-900 ${!value ? 'text-red-400 italic' : ''}`}>{value || 'Not provided'}</p>
    </div>
  )
}

function AddClientModal({ onClose, onAdd, counties }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', national_id_number: '', kra_pin: '',
    phone: '', email: '', county: 'Nairobi', physical_address: '',
    client_type: 'Individual', sassra_member_class: 'Individual',
    source_of_funds: '', aml_pep_status: false,
    kyc_status: 'Pending', aml_risk_rating: 'Low',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.phone) {
      toast.error('First name, last name, and phone are required')
      return
    }
    if (!form.national_id_number && !form.kra_pin) {
      toast.error('At minimum, provide a National ID or KRA PIN (CBK KYC requirement)')
      return
    }
    onAdd({
      ...form,
      sacco_share_capital: 100000,
      sacco_savings_balance: 0,
      sacco_loan_balance: 0,
      mpesa_phone: form.phone,
      kyc_doc_id_verified: !!form.national_id_number,
      kyc_doc_address_verified: false,
      kyc_doc_income_verified: false,
      source_of_funds_docs: false,
      bridge_synced: false,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold">Onboard New Client</h2>
          <p className="text-xs text-gray-500">CBK KYC · POCAMLA · SASSRA</p>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Section title="Personal Information">
            <FormRow>
              <Field label="First Name *" value={form.first_name} onChange={v => set('first_name', v)} />
              <Field label="Last Name / Entity Name *" value={form.last_name} onChange={v => set('last_name', v)} />
            </FormRow>
            <FormRow>
              <Field label="National ID Number" value={form.national_id_number} onChange={v => set('national_id_number', v)} placeholder="8-digit national ID" />
              <Field label="KRA PIN" value={form.kra_pin} onChange={v => set('kra_pin', v)} placeholder="e.g. A001234567B" />
            </FormRow>
            <FormRow>
              <Field label="Phone (M-Pesa) *" value={form.phone} onChange={v => set('phone', v)} placeholder="254XXXXXXXXX" />
              <Field label="Email" value={form.email} onChange={v => set('email', v)} type="email" />
            </FormRow>
            <FormRow>
              <SelectField label="County" value={form.county} onChange={v => set('county', v)} options={counties} />
              <Field label="Physical Address" value={form.physical_address} onChange={v => set('physical_address', v)} />
            </FormRow>
          </Section>

          <Section title="AML / POCAMLA">
            <FormRow>
              <SelectField label="Client Type" value={form.client_type} onChange={v => set('client_type', v)}
                options={['Individual','Corporate','Co-operative','Partnership','NGO']} />
              <SelectField label="SASSRA Member Class" value={form.sassra_member_class} onChange={v => set('sassra_member_class', v)}
                options={['Individual','Corporate','Institutional','Youth']} />
            </FormRow>
            <FormRow>
              <Field label="Source of Funds (POCAMLA s44)" value={form.source_of_funds} onChange={v => set('source_of_funds', v)} placeholder="Employment, Business, Agriculture…" />
              <SelectField label="Initial AML Risk Rating" value={form.aml_risk_rating} onChange={v => set('aml_risk_rating', v)}
                options={['Low','Medium','High','Very High']} />
            </FormRow>
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <input type="checkbox" id="pep" checked={form.aml_pep_status} onChange={e => set('aml_pep_status', e.target.checked)}
                className="w-4 h-4 text-green-600" />
              <label htmlFor="pep" className="text-sm font-medium text-amber-800">
                ⚠ Politically Exposed Person (PEP) — Enhanced Due Diligence required (POCAMLA s44)
              </label>
            </div>
          </Section>

          <button type="submit" className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-sm">
            Onboard Client
          </button>
        </form>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
function FormRow({ children }) { return <div className="grid grid-cols-2 gap-3">{children}</div> }
function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
    </div>
  )
}
function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}
