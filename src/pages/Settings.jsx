import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { Settings, Building2, Shield, Smartphone, RefreshCw, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { settings, setSettings } = useData()
  const { isAdmin } = useAuth()
  const [form, setForm] = useState({ ...settings })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const sections = [
    {
      title: 'Organisation Profile', icon: <Building2 className="w-4 h-4" />,
      fields: [
        { key: 'org_name', label: 'Organisation Name' },
        { key: 'registration_number', label: 'Registration Number (Kenya Companies Act)' },
        { key: 'county', label: 'County of Registration' },
        { key: 'address', label: 'Physical Address' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Admin Email', type: 'email' },
        { key: 'kra_pin', label: 'KRA PIN', placeholder: 'P00XXXXXXX' },
        { key: 'vat_number', label: 'VAT Registration Number (KRA)' },
        { key: 'financial_year_end', label: 'Financial Year End Month' },
      ]
    },
    {
      title: 'Regulatory Registrations', icon: <Shield className="w-4 h-4" />,
      fields: [
        { key: 'cbk_licence_number', label: 'CBK Licence Number', placeholder: 'CBK-INST-YYYY-XXXX' },
        { key: 'sassra_registration', label: 'SASSRA Registration Number', placeholder: 'SASSRA-YYYY-XXXX' },
        { key: 'icpak_registration', label: 'ICPAK Firm Registration', placeholder: 'ICPAK-FXXXX' },
        { key: 'co_op_reg_number', label: 'Commissioner of Co-operatives Reg No.', placeholder: 'KE/COOP/YYYY/XXXX' },
      ]
    },
    {
      title: 'M-Pesa Configuration', icon: <Smartphone className="w-4 h-4" />,
      fields: [
        { key: 'mpesa_shortcode', label: 'M-Pesa Business Shortcode' },
        { key: 'mpesa_env', label: 'Daraja Environment (sandbox / production)' },
      ]
    },
    {
      title: 'Bookkeeping Bridge', icon: <RefreshCw className="w-4 h-4" />,
      fields: [
        { key: 'bridge_api_url', label: 'Bookkeeping API URL', placeholder: 'https://your-api.com' },
      ]
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Kenya regulatory configuration — CBK · SASSRA · ICPAK · KRA</p>
      </div>

      {!isAdmin() && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Settings can only be modified by Admin users. Viewing in read-only mode.
        </div>
      )}

      {sections.map(section => (
        <div key={section.title} className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded-lg text-green-700">{section.icon}</div>
            <h2 className="font-semibold text-gray-800">{section.title}</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.fields.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{field.label}</label>
                <input type={field.type || 'text'} value={form[field.key] || ''} onChange={e => set(field.key, e.target.value)}
                  placeholder={field.placeholder} disabled={!isAdmin()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-50 disabled:text-gray-500" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Bridge toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Enable Bookkeeping Bridge</p>
            <p className="text-xs text-gray-500">Enables live sync between CRM and Roots Bookkeeping system</p>
          </div>
          <input type="checkbox" checked={form.bridge_enabled} onChange={e => set('bridge_enabled', e.target.checked)}
            disabled={!isAdmin()}
            className="w-5 h-5 text-green-600 rounded focus:ring-green-600" />
        </div>
      </div>

      {/* POCAMLA threshold */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-red-100 rounded-lg text-red-700"><Shield className="w-4 h-4" /></div>
          <h2 className="font-semibold text-gray-800">POCAMLA AML Monitoring</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cash Transaction Reporting Threshold</label>
            <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 font-medium">KES 1,000,000 (fixed — POCAMLA s44)</div>
            <p className="text-xs text-gray-400 mt-1">All M-Pesa transactions ≥ KES 1,000,000 are auto-flagged for STR review</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">STR Reporting</label>
            <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600">
              Auto-flag generated — manual STR filing to CBK required within 3 days
            </div>
          </div>
        </div>
      </div>

      {isAdmin() && (
        <div className="flex justify-end">
          <button onClick={() => { setSettings(form); toast.success('Settings saved') }}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      )}
    </div>
  )
}
