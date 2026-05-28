/**
 * Aptiv Bookkeeping CRM — M-Pesa Client
 * Routes through Supabase Edge Function (mpesa-proxy) — NOT Daraja directly.
 * SECURITY: CONSUMER_KEY, CONSUMER_SECRET, PASSKEY in Supabase Vault only.
 */
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase'

async function callMpesaProxy(action, params = {}) {
  if (!SUPABASE_CONFIGURED) {
    console.warn('[M-Pesa] Demo mode — proxy not available')
    return { demo: true, message: 'M-Pesa calls disabled in demo mode' }
  }
  const { data, error } = await supabase.functions.invoke('mpesa-proxy', {
    body: { action, ...params },
  })
  if (error) throw new Error(error.message)
  return data
}

export async function stkPush({ phone, amount, accountRef, description }) {
  if (!/^254[0-9]{9}$/.test(phone)) throw new Error('Phone must be in 254XXXXXXXXX format')
  if (!amount || amount < 1) throw new Error('Amount must be at least KES 1')
  return callMpesaProxy('stk_push', { phone, amount, accountRef, description })
}

export async function queryTransactionStatus(transactionId) {
  if (!transactionId) throw new Error('transactionId is required')
  return callMpesaProxy('query_status', { transactionId })
}

export async function registerC2BUrls() {
  return callMpesaProxy('register_c2b')
}

export function parseStkCallback(callbackBody) {
  const body = callbackBody?.Body?.stkCallback
  if (!body) throw new Error('Invalid M-Pesa callback structure')
  const items = body.CallbackMetadata?.Item || []
  const get = (name) => items.find((i) => i.Name === name)?.Value
  return {
    merchant_request_id: body.MerchantRequestID,
    checkout_request_id: body.CheckoutRequestID,
    result_code: String(body.ResultCode),
    result_desc: body.ResultDesc,
    amount_kes: get('Amount'),
    mpesa_receipt: get('MpesaReceiptNumber'),
    transaction_date: get('TransactionDate'),
    phone_number: String(get('PhoneNumber')),
    success: body.ResultCode === 0,
  }
}

export function formatKES(amount) {
  if (amount === null || amount === undefined) return 'KES 0.00'
  const num = typeof amount === 'number' ? amount : Number(amount)
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function isValidKenyanPhone(phone) {
  return /^254[0-9]{9}$/.test(String(phone).replace(/\s/g, ''))
}

export function normalisePhone(phone) {
  const p = String(phone).replace(/\s|\+|-/g, '')
  if (p.startsWith('254')) return p
  if (p.startsWith('0') && p.length === 10) return `254${p.slice(1)}`
  if (p.length === 9) return `254${p}`
  return p
}

export function isPocamlaThreshold(amountKes) {
  return amountKes >= 1_000_000
}
