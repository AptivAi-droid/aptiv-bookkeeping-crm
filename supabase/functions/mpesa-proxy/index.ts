/**
 * Aptiv Bookkeeping CRM â M-Pesa Daraja Proxy
 * Supabase Edge Function â runs server-side (Deno)
 *
 * WHY THIS EXISTS:
 * M-Pesa CONSUMER_KEY, CONSUMER_SECRET, and PASSKEY are server-only secrets.
 * They MUST NOT appear in VITE_ env vars (which bundle into the client JS).
 * This function proxies all Daraja API calls from the browser â Safaricom,
 * keeping credentials securely in Supabase Vault / environment.
 *
 * DEPLOY:
 *   supabase secrets set MPESA_CONSUMER_KEY=...
 *   supabase secrets set MPESA_CONSUMER_SECRET=...
 *   supabase secrets set MPESA_SHORTCODE=...
 *   supabase secrets set MPESA_PASSKEY=...
 *   supabase secrets set MPESA_CALLBACK_URL=...
 *   supabase secrets set MPESA_ENV=production
 *   supabase functions deploy mpesa-proxy
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const MPESA_ENV = Deno.env.get('MPESA_ENV') || 'sandbox'
const BASE_URL = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

const CONSUMER_KEY = Deno.env.get('MPESA_CONSUMER_KEY')!
const CONSUMER_SECRET = Deno.env.get('MPESA_CONSUMER_SECRET')!
const SHORTCODE = Deno.env.get('MPESA_SHORTCODE')!
const PASSKEY = Deno.env.get('MPESA_PASSKEY')!
const CALLBACK_URL = Deno.env.get('MPESA_CALLBACK_URL')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ââ Token cache (scoped to function instance lifetime) ââââââââââââââââââââââââ
let cachedToken: string | null = null
let tokenExpiry = 0

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken
  const creds = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`)
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
  })
  if (!res.ok) throw new Error(`Daraja auth failed: ${res.status}`)
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken!
}

function getTimestamp(): string {
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

// ââ Route handlers ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function handleStkPush(body: Record<string, unknown>) {
  const token = await getToken()
  const timestamp = getTimestamp()
  const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`)
  const { phone, amount, accountRef, description } = body as {
    phone: string; amount: number; accountRef: string; description: string
  }

  // Validate phone format: must be 254XXXXXXXXX
  if (!/254[0-9]{9}$/.test(phone)) {
    return new Response(JSON.stringify({ error: 'Invalid phone format. Use 254XXXXXXXXX.' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
  if (!amount || amount < 1) {
    return new Response(JSON.stringify({ error: 'Amount must be >= KES 1' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: `${CALLBACK_URL}/mpesa/stk`,
      AccountReference: accountRef,
      TransactionDesc: description || 'Aptiv Bookkeeping CRM',
    }),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.ok ? 200 : 502,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function handleQueryStatus(body: Record<string, unknown>) {
  const token = await getToken()
  const { transactionId } = body as { transactionId: string }
  const res = await fetch(`${BASE_URL}/mpesa/transactionstatus/v1/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Initiator: 'aptiv_crm',
      SecurityCredential: Deno.env.get('MPESA_SECURITY_CREDENTIAL') || '',
      CommandID: 'TransactionStatusQuery',
      TransactionID: transactionId,
      PartyA: SHORTCODE,
      IdentifierType: '4',
      ResultURL8`{CALLBACK_URL}/mpesa/status`,
      QueueTimeOutURL: `${CALLBACK_URL}/mpesa/timeout`,
      Remarks: 'Aptiv CRM status query',
      Occasion: '',
    }),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.ok ? 200 : 502,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function handleRegisterC2B() {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}/mpesa/c2b/v1/registerurl`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ShortCode: SHORTCODE,
      ResponseType: 'Completed',
      ConfirmationURL: `${CALLBACK_URL}/mpesa/c2b/confirm`,
      ValidationURL: `${CALLBACK_URL}/mpesa/c2b/validate`,
    }),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.ok ? 200 : 502,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ââ Main handler ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { action, ...body } = await req.json()
    switch (action) {
      case 'stk_push':     return handleStkPush(body)
      case 'query_status': return handleQueryStatus(body)
      case 'register_c2b': return handleRegisterC2B()
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
