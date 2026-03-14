import { createContext, useContext, useState, useCallback } from 'react'
import {
  mockClients, mockMpesaTransactions, mockComplianceFlags,
  mockSassraReport, mockSettings, mockUsers
} from '../data/mockData'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [clients, setClients] = useState(mockClients)
  const [mpesaTxs, setMpesaTxs] = useState(mockMpesaTransactions)
  const [flags, setFlags] = useState(mockComplianceFlags)
  const [sassraReport, setSassraReport] = useState(mockSassraReport)
  const [settings, setSettings] = useState(mockSettings)
  const [users] = useState(mockUsers)
  const [auditLog, setAuditLog] = useState([])

  // ─── Clients ──────────────────────────────────────────────────────────────
  const addClient = useCallback((client) => {
    const newClient = {
      ...client,
      id: crypto.randomUUID(),
      crm_id: `APTIV-KE-${String(clients.length + 1).padStart(5, '0')}`,
      created_at: new Date().toISOString(),
    }
    setClients(prev => [newClient, ...prev])
    return newClient
  }, [clients.length])

  const updateClient = useCallback((id, updates) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c))
  }, [])

  // ─── M-Pesa Transactions ─────────────────────────────────────────────────
  const addMpesaTx = useCallback((tx) => {
    const newTx = { ...tx, id: crypto.randomUUID(), created_at: new Date().toISOString() }
    // Auto-flag if >= KES 1,000,000 (POCAMLA threshold — stored as 100000000 cents)
    if (tx.amount_kes >= 100000000) {
      newTx.aml_flag = true
      addFlag({
        client_id: tx.client_id,
        client_name: tx.client_name,
        severity: 'HIGH',
        flag_type: 'Large Cash Transaction — POCAMLA',
        description: `M-Pesa transaction of KES ${(tx.amount_kes / 100).toLocaleString('en-KE')} exceeds POCAMLA KES 1,000,000 threshold. STR to CBK required.`,
        regulatory_body: 'CBK',
        regulatory_ref: 'POCAMLA s12 — Suspicious Transaction Reporting',
        str_required: true,
        str_filed: false,
        status: 'Open',
        detected_date: new Date().toISOString().split('T')[0],
      })
    }
    setMpesaTxs(prev => [newTx, ...prev])
    return newTx
  }, [])

  // ─── Compliance Flags ────────────────────────────────────────────────────
  const addFlag = useCallback((flag) => {
    setFlags(prev => [{ ...flag, id: crypto.randomUUID(), created_at: new Date().toISOString() }, ...prev])
  }, [])

  const updateFlag = useCallback((id, updates) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, ...updates, updated_at: new Date().toISOString() } : f))
  }, [])

  // ─── Audit Log ───────────────────────────────────────────────────────────
  const addAuditEntry = useCallback((userEmail, action, description, entityType = null, entityId = null) => {
    setAuditLog(prev => [{
      id: crypto.randomUUID(),
      user_email: userEmail,
      action,
      description,
      entity_type: entityType,
      entity_id: entityId,
      created_at: new Date().toISOString(),
    }, ...prev])
  }, [])

  // ─── Derived Stats ───────────────────────────────────────────────────────
  const stats = {
    totalClients: clients.length,
    verifiedKyc: clients.filter(c => c.kyc_status === 'Verified').length,
    pendingKyc: clients.filter(c => ['Pending', 'Incomplete'].includes(c.kyc_status)).length,
    highRisk: clients.filter(c => ['High', 'Very High'].includes(c.aml_risk_rating)).length,
    openFlags: flags.filter(f => f.status !== 'Resolved' && f.status !== 'False Positive').length,
    criticalFlags: flags.filter(f => f.severity === 'CRITICAL' && f.status !== 'Resolved').length,
    strRequired: flags.filter(f => f.str_required && !f.str_filed).length,
    totalMpesaVol: mpesaTxs.filter(t => t.status === 'Completed').reduce((s, t) => s + t.amount_kes, 0),
    unsyncedTxs: mpesaTxs.filter(t => !t.bookkeeping_synced).length,
  }

  return (
    <DataContext.Provider value={{
      clients, mpesaTxs, flags, sassraReport, settings, users, auditLog, stats,
      addClient, updateClient, addMpesaTx, addFlag, updateFlag, addAuditEntry,
      setSettings, setSassraReport,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
