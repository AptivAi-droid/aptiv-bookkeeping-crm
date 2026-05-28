import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import {
  mockClients, mockMpesaTransactions, mockComplianceFlags,
  mockSassraReport, mockSettings, mockUsers,
} from '../data/mockData'
import { isPocamlaThreshold } from '../services/mpesa'
import toast from 'react-hot-toast'

const DataContext = createContext(null)

// ââ ID generation (collision-safe, not array-length dependent) ââââââââââââââââ
function generateCrmId(existingIds) {
  let n = existingIds.length + 1
  let id
  const existing = new Set(existingIds)
  do {
    id = `APTIV-KE-${String(n).padStart(5, '0')}`
    n++
  } while (existing.has(id))
  return id
}

export function DataProvider({ children }) {
  const [clients,     setClients]     = useState([])
  const [mpesaTxs,    setMpesaTxs]    = useState([])
  const [flags,       setFlags]       = useState([])
  const [sassraReport,setSassraReport]= useState(null)
  const [settings,    setSettings]    = useState(null)
  const [users,       setUsers]       = useState([])
  const [auditLog,    setAuditLog]    = useState([])
  const [loading,     setLoading]     = useState(true)

  // Track whether we've done the initial load
  const initialised = useRef(false)

  // ââ Initialise data ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    if (!SUPABASE_CONFIGURED) {
      // Demo mode â use mock data immediately
      setClients(mockClients)
      setMpesaTxs(mockMpesaTransactions)
      setFlags(mockComplianceFlags)
      setSassraReport(mockSassraReport)
      setSettings(mockSettings)
      setUsers(mockUsers)
      setLoading(false)
      return
    }

    // Live mode â fetch from Supabase
    ;(async () => {
      try {
        const [
          { data: clientsData,  error: clientsErr  },
          { data: mpesaData,    error: mpesaErr    },
          { data: flagsData,    error: flagsErr    },
          { data: sassraData,   error: sassraErr   },
          { data: settingsData, error: settingsErr },
          { data: usersData,    error: usersErr    },
          { data: auditData,    error: auditErr    },
        ] = await Promise.all([
          supabase.from('ab_clients').select('*').order('created_at', { ascending: false }),
          supabase.from('ab_mpesa_transactions').select('*').order('created_at', { ascending: false }).limit(500),
          supabase.from('ab_compliance_flags').select('*').order('created_at', { ascending: false }),
          supabase.from('ab_sassra_reports').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('ab_settings').select('*').maybeSingle(),
          supabase.from('ab_users').select('*'),
          supabase.from('ab_audit_log').select('*').order('created_at', { ascending: false }).limit(200),
        ])

        const errors = [clientsErr, mpesaErr, flagsErr, sassraErr, settingsErr, usersErr, auditErr].filter(Boolean)
        if (errors.length) {
          console.error('[DataContext] Supabase load errors:', errors)
          toast.error('Some data failed to load â check console')
        }

        setClients(clientsData || [])
        setMpesaTxs(mpesaData || [])
        setFlags(flagsData || [])
        setSassraReport(sassraData || mockSassraReport)
        setSettings(settingsData || mockSettings)
        setUsers(usersData || [])
        setAuditLog(auditData || [])
      } catch (err) {
        console.error('[DataContext] Critical load failure:', err)
        toast.error('Failed to load data from database')
        // Fallback to mock so the app remains usable
        setClients(mockClients)
        setMpesaTxs(mockMpesaTransactions)
        setFlags(mockComplianceFlags)
        setSassraReport(mockSassraReport)
        setSettings(mockSettings)
        setUsers(mockUsers)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ââ Clients ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const addClient = useCallback(async (clientData) => {
    const crm_id = generateCrmId(clients.map(c => c.crm_id))
    const newClient = {
      ...clientData,
      crm_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (SUPABASE_CONFIGURED) {
      const { data, error } = await supabase.from('ab_clients').insert(newClient).select().single()
      if (error) throw new Error(`Failed to add client: ${error.message}`)
      setClients(prev => [data, ...prev])
      return data
    }
    const withId = { ...newClient, id: crypto.randomUUID() }
    setClients(prev => [withId, ...prev])
    return withId
  }, [clients])

  const updateClient = useCallback(async (id, updates) => {
    const updated = { ...updates, updated_at: new Date().toISOString() }
    if (SUPABASE_CONFIGURED) {
      const { data, error } = await supabase.from('ab_clients').update(updated).eq('id', id).select().single()
      if (error) throw new Error(`Failed to update client: ${error.message}`)
      setClients(prev => prev.map(c => c.id === id ? data : c))
      return data
    }
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
  }, [])

  // ââ M-Pesa Transactions âââââââââââââââââââââââââââââââââââââââââââââââââââ
  const addMpesaTx = useCallback(async (tx) => {
    const pocamlaFlag = isPocamlaThreshold(tx.amount_kes) // amount in whole KES
    const newTx = {
      ...tx,
      aml_flag: pocamlaFlag || tx.aml_flag || false,
      created_at: new Date().toISOString(),
    }

    let savedTx = newTx
    if (SUPABASE_CONFIGURED) {
      const { data, error } = await supabase.from('ab_mpesa_transactions').insert(newTx).select().single()
      if (error) throw new Error(`Failed to record M-Pesa tx: ${error.message}`)
      savedTx = data
    } else {
      savedTx = { ...newTx, id: crypto.randomUUID() }
    }

    setMpesaTxs(prev => [savedTx, ...prev])

    // Auto-create POCAMLA flag if threshold exceeded
    if (pocamlaFlag) {
      await addFlag({
        client_id:       tx.client_id,
        client_name:     tx.client_name,
        mpesa_tx_id:     savedTx.id,
        severity:        'HIGH',
        flag_type:       'Large Cash Transaction â POCAMLA',
        description:     `M-Pesa transaction of KES ${tx.amount_kes.toLocaleString('en-KE')} exceeds POCAMLA KES 1,000,000 threshold. STR to CBK required within 3 days.`,
        regulatory_body: 'CBK',
        regulatory_ref:  'POCAMLA s12 â Suspicious Transaction Reporting',
        str_required:    true,
        str_filed:       false,
        status:          'Open',
        detected_date:   new Date().toISOString().split('T')[0],
      })
    }

    return savedTx
  }, []) // addFlag is stable (defined below with no deps)

  // ââ Compliance Flags ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const addFlag = useCallback(async (flag) => {
    const newFlag = { ...flag, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    if (SUPABASE_CONFIGURED) {
      const { data, error } = await supabase.from('ab_compliance_flags').insert(newFlag).select().single()
      if (error) throw new Error(`Failed to add flag: ${error.message}`)
      setFlags(prev => [data, ...prev])
      return data
    }
    const withId = { ...newFlag, id: crypto.randomUUID() }
    setFlags(prev => [withId, ...prev])
    return withId
  }, [])

  const updateFlag = useCallback(async (id, updates) => {
    const updated = { ...updates, updated_at: new Date().toISOString() }
    if (SUPABASE_CONFIGURED) {
      const { data, error } = await supabase.from('ab_compliance_flags').update(updated).eq('id', id).select().single()
      if (error) throw new Error(`Failed to update flag: ${error.message}`)
      setFlags(prev => prev.map(f => f.id === id ? data : f))
      return data
    }
    setFlags(prev => prev.map(f => f.id === id ? { ...f, ...updated } : f))
  }, [])

  // ââ Audit Log âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const addAuditEntry = useCallback(async (userEmail, action, description, entityType = null, entityId = null) => {
    const entry = {
      user_email:  userEmail || 'unknown',
      user_role:   null,
      action,
      description,
      entity_type: entityType,
      entity_id:   entityId || null,
      created_at:  new Date().toISOString(),
    }
    if (SUPABASE_CONFIGURED) {
      // Fire-and-forget â audit log failures should not block user actions
      supabase.from('ab_audit_log').insert(entry).then(({ error }) => {
        if (error) console.error('[Audit] Failed to write log:', error.message)
      })
    }
    setAuditLog(prev => [{ ...entry, id: crypto.randomUUID() }, ...prev])
  }, [])

  // ââ Settings update âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const saveSettings = useCallback(async (newSettings) => {
    if (SUPABASE_CONFIGURED) {
      const { data, error } = await supabase.from('ab_settings').update(newSettings).eq('id', newSettings.id).select().single()
      if (error) throw new Error(`Failed to save settings: ${error.message}`)
      setSettings(data)
      return data
    }
    setSettings(newSettings)
    return newSettings
  }, [])

  // ââ Derived Stats âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const stats = {
    totalClients:  clients.length,
    verifiedKyc:   clients.filter(c => c.kyc_status === 'Verified').length,
    pendingKyc:    clients.filter(c => ['Pending', 'Incomplete'].includes(c.kyc_status)).length,
    highRisk:      clients.filter(c => ['High', 'Very High'].includes(c.aml_risk_rating)).length,
    openFlags:     flags.filter(f => !['Resolved', 'False Positive'].includes(f.status)).length,
    criticalFlags: flags.filter(f => f.severity === 'CRITICAL' && f.status !== 'Resolved').length,
    strRequired:   flags.filter(f => f.str_required && !f.str_filed).length,
    totalMpesaVol: mpesaTxs.filter(t => t.status === 'Completed').reduce((s, t) => s + (t.amount_kes || 0), 0),
    unsyncedTxs:   mpesaTxs.filter(t => !t.bookkeeping_synced).length,
    // SASSRA prudential ratios â from most recent sassra report if available
    sassraCapital:  sassraReport?.capital_adequacy_ratio || null,
    sassraLiquidity:sassraReport?.liquidity_ratio        || null,
    sassraLoanAsset:sassraReport?.loan_to_asset_ratio    || null,
    sassraBorrowing:sassraReport?.external_borrowing_ratio || null,
  }

  return (
    <DataContext.Provider value={{
      loading,
      clients, mpesaTxs, flags, sassraReport, settings, users, auditLog, stats,
      addClient, updateClient,
      addMpesaTx, addFlag, updateFlag,
      addAuditEntry,
      setSettings: saveSettings,
      setSassraReport,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
