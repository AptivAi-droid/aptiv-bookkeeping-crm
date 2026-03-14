/**
 * Aptiv Bookkeeping CRM — M-Pesa Daraja API Bridge
 * Safaricom Daraja v2 Integration
 * Supports: STK Push, C2B, B2C, Transaction Status, Account Balance
 * Currency: KES (Kenya Shillings)
 */

const MPESA_ENV = import.meta.env.VITE_MPESA_ENV || 'sandbox'
const BASE_URL = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

const CONSUMER_KEY = import.meta.env.VITE_MPESA_CONSUMER_KEY
const CONSUMER_SECRET = import.meta.env.VITE_MPESA_CONSUMER_SECRET
const SHORTCODE = import.meta.env.VITE_MPESA_SHORTCODE
const PASSKEY = import.meta.env.VITE_MPESA_PASSKEY
const CALLBACK_URL = import.meta.env.VITE_MPESA_CALLBACK_URL

// ─── Token Management ─────────────────────────────────────────────────────────
let cachedToken = null
let tokenExpiry = null

export async function getMpesaToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken
  }
  const credentials = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`)
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  })
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status}`)
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

// ─── STK Push (Lipa Na M-Pesa Online) ─────────────────────────────────────────
/**
 * Initiates an STK Push to a client's phone
 * @param {string} phone - Client phone in 254XXXXXXXXX format
 * @param {number} amount - Amount in KES
 * @param {string} accountRef - Client/account reference
 * @param {string} description - Transaction description
 */
export async function stkPush({ phone, amount, accountRef, description }) {
  const token = await getMpesaToken()
  const timestamp = getTimestamp()
  const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`)

  const payload = {
    BusinessShortCode: SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: `${CALLBACK_URL}/stk`,
    AccountReference: accountRef,
    TransactionDesc: description || 'Aptiv Bookkeeping CRM Payment',
  }

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (data.ResponseCode !== '0') throw new Error(data.ResponseDescription || 'STK Push failed')
  return data
}

// ─── C2B Register URLs ─────────────────────────────────────────────────────────
export async function registerC2BUrls() {
  const token = await getMpesaToken()
  const res = await fetch(`${BASE_URL}/mpesa/c2b/v1/registerurl`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ShortCode: SHORTCODE,
      ResponseType: 'Completed',
      ConfirmationURL: `${CALLBACK_URL}/c2b/confirm`,
      ValidationURL: `${CALLBACK_URL}/c2b/validate`,
    }),
  })
  return res.json()
}

// ─── Transaction Status Query ──────────────────────────────────────────────────
export async function queryTransactionStatus(transactionId) {
  const token = await getMpesaToken()
  const res = await fetch(`${BASE_URL}/mpesa/transactionstatus/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Initiator: 'aptiv_crm',
      SecurityCredential: '',
      CommandID: 'TransactionStatusQuery',
      TransactionID: transactionId,
      PartyA: SHORTCODE,
      IdentifierType: '4',
      ResultURL: `${CALLBACK_URL}/status`,
      QueueTimeOutURL: `${CALLBACK_URL}/timeout`,
      Remarks: 'Aptiv CRM status query',
      Occasion: '',
    }),
  })
  return res.json()
}

// ─── Account Balance ───────────────────────────────────────────────────────────
export async function getAccountBalance() {
  const token = await getMpesaToken()
  const res = await fetch(`${BASE_URL}/mpesa/accountbalance/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Initiator: 'aptiv_crm',
      SecurityCredential: '',
      CommandID: 'AccountBalance',
      PartyA: SHORTCODE,
      IdentifierType: '4',
      Remarks: 'Aptiv CRM balance query',
      QueueTimeOutURL: `${CALLBACK_URL}/timeout`,
      ResultURL: `${CALLBACK_URL}/balance`,
    }),
  })
  return res.json()
}

// ─── Parse M-Pesa Callback ─────────────────────────────────────────────────────
/**
 * Parses an incoming M-Pesa STK Push callback into a normalised transaction object
 * Maps directly to ab_mpesa_transactions table
 */
export function parseStkCallback(callbackBody) {
  const body = callbackBody?.Body?.stkCallback
  if (!body) throw new Error('Invalid M-Pesa callback structure')

  const items = body.CallbackMetadata?.Item || []
  const get = (name) => items.find(i => i.Name === name)?.Value

  return {
    merchant_request_id: body.MerchantRequestID,
    checkout_request_id: body.CheckoutRequestID,
    result_code: body.ResultCode,
    result_desc: body.ResultDesc,
    amount_kes: get('Amount'),
    mpesa_receipt: get('MpesaReceiptNumber'),
    transaction_date: get('TransactionDate'),
    phone_number: get('PhoneNumber'),
    success: body.ResultCode === 0,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getTimestamp() {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
}

// ─── KES Formatter ────────────────────────────────────────────────────────────
export function formatKES(amount) {
  if (amount === null || amount === undefined) return 'KES 0.00'
  const num = typeof amount === 'number' ? amount : Number(amount) / 100
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
