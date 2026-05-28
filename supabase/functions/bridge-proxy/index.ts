/**
 * Aptiv Bookkeeping CRM â Bookkeeping Bridge Proxy
 * Supabase Edge Function â runs server-side (Deno)
 *
 * WHY THIS EXISTS:
 * BRIDGE_API_KEY is a server-only secret and must never appear in VITE_ vars.
 * This function proxies all calls from the CRM to the Roots bookkeeping system.
 *
 * DEPLOY:
 *   supabase secrets set BRIDGE_API_URL=https://your-bookkeeping-api.com
 *   supabase secrets set BRIDGE_API_KEY=your_api_key
 *   supabase functions deploy bridge-proxy
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BRIDGE_URL = Deno.env.get('BRIDGE_API_URL')!
const BRIDGE_KEY = Deno.env.get('BRIDGE_API_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function bridgeRequest(path: string, method = 'GET', body?: unknown) {
  if (!BRIDGE_URL || !BRIDGE_KEY) {
    throw new Error('Bookkeeping bridge not configured â set BRIDGE_API_URL and BRIDGE_API_KEY in Supabase secrets')
  }
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BRIDGE_KEY,
      'X-Source': 'aptiv-bookkeeping-crm-kenya',
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BRIDGE_URL}${path}`, opts)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Bridge [${res.status}]: ${err}`)
  }
  return res.json()
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { action, path, method, body } = await req.json()

    // Allowlist of bridge paths â prevent SSRF
    const ALLOWED_PATHS = /^\/(members|transactions|compliance|health)(\/[a-z0-9\-]+)?(\/[a-z]+)?$/i
    if (action !== 'health' && !ALLOWED_PATHS.test(path || '')) {
      return new Response(JSON.stringify({ error: 'Path not allowed' }), {
        status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const data = await bridgeRequest(path || '/health', method || 'GET', body)
    return new Response(JSON.stringify(data), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
