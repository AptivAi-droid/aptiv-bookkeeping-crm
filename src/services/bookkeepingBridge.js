/**
 * Aptiv Bookkeeping CRM — Bookkeeping Bridge
 * Bidirectional API bridge between Aptiv CRM and Roots Co-op Bookkeeping System
 * Syncs: client records, transactions, compliance flags, KYC status
 */

const BRIDGE_URL = import.meta.env.VITE_BOOKKEEPING_API_URL
const BRIDGE_KEY = import.meta.env.VITE_BOOKKEEPING_API_KEY

const headers = () => ({
  'Content-Type': 'application/json',
  'X-API-Key': BRIDGE_KEY,
  'X-Source': 'aptiv-bookkeeping-crm-kenya',
})

async function bridgeRequest(path, method = 'GET', body = null) {
  const opts = { method, headers: headers() }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BRIDGE_URL}${path}`, opts)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Bridge error [${res.status}]: ${err}`)
  }
  return res.json()
}

// ─── Client Sync ──────────────────────────────────────────────────────────────
/** Push a new CRM client to the bookkeeping members table */
export async function pushClientToBookkeeping(client) {
  return bridgeRequest('/members', 'POST', {
    member_number: client.crm_id,
    first_name: client.first_name,
    last_name: client.last_name,
    id_number: client.national_id,
    phone: client.phone,
    email: client.email,
    address: client.address,
    kyc_status: client.kyc_status,
    source: 'aptiv-crm-kenya',
  })
}

/** Pull bookkeeping member record by CRM ID */
export async function pullMemberFromBookkeeping(crmId) {
  return bridgeRequest(`/members/${crmId}`)
}

/** Update KYC/FICA status in bookkeeping when CRM flags change */
export async function updateKycStatusInBookkeeping(crmId, kycStatus) {
  return bridgeRequest(`/members/${crmId}/kyc`, 'PATCH', { kyc_status: kycStatus })
}

// ─── Transaction Sync ─────────────────────────────────────────────────────────
/** Push an M-Pesa transaction from CRM into bookkeeping ledger */
export async function pushMpesaTransactionToBookkeeping(tx) {
  return bridgeRequest('/transactions', 'POST', {
    date: tx.transaction_date,
    member_id: tx.member_id,
    member_name: tx.member_name,
    type: tx.transaction_type,
    amount: tx.amount_kes,
    currency: 'KES',
    reference: tx.mpesa_receipt,
    description: `M-Pesa: ${tx.mpesa_receipt}`,
    source: 'mpesa-daraja',
    mpesa_receipt: tx.mpesa_receipt,
  })
}

/** Fetch all transactions for a member from bookkeeping */
export async function fetchMemberTransactions(memberId) {
  return bridgeRequest(`/members/${memberId}/transactions`)
}

// ─── Compliance Sync ──────────────────────────────────────────────────────────
/** Push a compliance flag from CRM to bookkeeping */
export async function pushComplianceFlagToBookkeeping(flag) {
  return bridgeRequest('/compliance', 'POST', {
    member_id: flag.member_id,
    category: flag.severity,
    type: flag.flag_type,
    description: flag.description,
    regulatory_reference: flag.regulatory_ref,
    source: 'aptiv-crm-kenya',
  })
}

/** Pull open compliance flags for a member */
export async function fetchComplianceFlagsFromBookkeeping(memberId) {
  return bridgeRequest(`/members/${memberId}/compliance`)
}

// ─── Balance Sync ─────────────────────────────────────────────────────────────
/** Fetch member account balances from bookkeeping (KES) */
export async function fetchMemberBalances(memberId) {
  return bridgeRequest(`/members/${memberId}/balances`)
}

// ─── Health Check ─────────────────────────────────────────────────────────────
export async function checkBridgeHealth() {
  try {
    const res = await bridgeRequest('/health')
    return { connected: true, ...res }
  } catch {
    return { connected: false, message: 'Bookkeeping bridge unreachable' }
  }
}
