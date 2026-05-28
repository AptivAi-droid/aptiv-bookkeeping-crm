/**
 * Aptiv Bookkeeping CRM — Bookkeeping Bridge Client
 * Calls the Supabase Edge Function (bridge-proxy) — NOT the bridge API directly.
 * SECURITY: BRIDGE_API_KEY is a server-side secret in Supabase Vault.
 */
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase'

async function bridgeCall(path, method = 'GET', body = null) {
  if (!SUPABASE_CONFIGURED) return { connected: false, message: 'Bridge unavailable in demo mode' }
  const { data, error } = await supabase.functions.invoke('bridge-proxy', {
    body: { path, method, body },
  })
  if (error) throw new Error(error.message)
  return data
}

export async function pushClientToBookkeeping(client) {
  return bridgeCall('/members', 'POST', {
    member_number: client.crm_id, first_name: client.first_name, last_name: client.last_name,
    id_number: client.national_id_number, phone: client.phone, email: client.email,
    address: client.physical_address, kyc_status: client.kyc_status, source: 'aptiv-crm-kenya',
  })
}

export async function pullMemberFromBookkeeping(crmId) {
  return bridgeCall(`/members/${encodeURIComponent(crmId)}`)
}

export async function updateKycStatusInBookkeeping(crmId, kycStatus) {
  return bridgeCall(`/members/${encodeURIComponent(crmId)}/kyc`, 'PATCH', { kyc_status: kycStatus })
}

export async function pushMpesaTransactionToBookkeeping(tx) {
  return bridgeCall('/transactions', 'POST', {
    date: tx.transaction_date, member_id: tx.client_id, member_name: tx.client_name,
    type: tx.transaction_type, amount: tx.amount_kes, currency: 'KES',
    reference: tx.mpesa_receipt, description: `M-Pesa: ${tx.mpesa_receipt}`,
    source: 'mpesa-daraja', mpesa_receipt: tx.mpesa_receipt,
  })
}

export async function fetchMemberTransactions(memberId) {
  return bridgeCall(`/members/${encodeURIComponent(memberId)}/transactions`)
}

export async function pushComplianceFlagToBookkeeping(flag) {
  return bridgeCall('/compliance', 'POST', {
    member_id: flag.client_id, category: flag.severity, type: flag.flag_type,
    description: flag.description, regulatory_reference: flag.regulatory_ref,
    source: 'aptiv-crm-kenya',
  })
}

export async function fetchComplianceFlagsFromBookkeeping(memberId) {
  return bridgeCall(`/members/${encodeURIComponent(memberId)}/compliance`)
}

export async function fetchMemberBalances(memberId) {
  return bridgeCall(`/members/${encodeURIComponent(memberId)}/balances`)
}

export async function checkBridgeHealth() {
  try { const res = await bridgeCall('/health'); return { connected: true, ...res } }
  catch { return { connected: false, message: 'Bookkeeping bridge unreachable' } }
}
