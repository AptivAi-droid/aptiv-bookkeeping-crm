# Security Policy — Aptiv Bookkeeping CRM (Kenya Edition)

## Regulatory context

This system handles:
- Personal financial data subject to the **Kenya Data Protection Act 2019**
- AML/KYC data subject to **POCAMLA** and **CBK KYC Directive 2013**
- SACCO financial records subject to **SASSRA** oversight
- ICPAK/IFRS accounting records

## Reporting a vulnerability

If you discover a security vulnerability in this repository:

1. **Do not open a public GitHub issue.**
2. Email **nealtitus@aptivconsulting.com** with subject `[SECURITY] Aptiv CRM — <summary>`
3. Include: description, reproduction steps, potential impact, and any suggested fix
4. We will acknowledge within **48 hours** and aim to resolve critical issues within **7 days**

## Secret management

| Variable | Location | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | GitHub Secrets / `.env` | Public by design — Supabase anon key uses RLS |
| `VITE_SUPABASE_ANON_KEY` | GitHub Secrets / `.env` | Public by design — RLS enforces access |
| `MPESA_CONSUMER_KEY` | Supabase Vault **only** | Server-side via `mpesa-proxy` Edge Function |
| `MPESA_CONSUMER_SECRET` | Supabase Vault **only** | Never in browser bundle |
| `MPESA_PASSKEY` | Supabase Vault **only** | Never in browser bundle |
| `BRIDGE_API_KEY` | Supabase Vault **only** | Never in browser bundle |

**Rule:** Any variable prefixed `VITE_` is bundled into client-side JavaScript and visible to anyone who inspects the built app. Never put sensitive credentials in `VITE_` variables.

## Architecture security controls

- **Row Level Security (RLS)** on all 14 Supabase tables — `get_user_role()` enforced per operation
- **Immutable audit log** (`ab_audit_log`) — no `DELETE` policy, complies with Data Protection Act 2019
- **POCAMLA auto-flagging** — transactions ≥ KES 1,000,000 automatically trigger STR workflow
- **PEP screening flag** — Politically Exposed Persons require Enhanced Due Diligence
- **M-Pesa proxy Edge Function** — Daraja API credentials never leave the server
- **Phone format validation** — `254XXXXXXXXX` enforced at DB level (`CHECK` constraint)
- **KRA PIN format validation** — enforced at DB level
- **Journal double-entry constraint** — debit = credit enforced by DB trigger on `Posted` entries
- **Content Security Policy** — see `netlify.toml` for full CSP header

## Dependency updates

Run `npm audit` before each production deploy. Critical vulnerabilities must be resolved before deployment.

## Access control model

| Role | Read | Write Clients/Tx | Manage Compliance | Admin |
|---|---|---|---|---|
| Admin | ✓ | ✓ | ✓ | ✓ |
| COO | ✓ | ✓ | ✓ | — |
| Compliance Officer | ✓ | — | ✓ | — |
| Viewer | ✓ | — | — | — |
