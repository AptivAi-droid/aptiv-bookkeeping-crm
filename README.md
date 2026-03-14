# Aptiv Bookkeeping CRM — Kenya Edition

> Compliance-first CRM and bookkeeping system for Kenyan co-operative financial institutions.

**Built by Aptiv Consulting · Powered by Aptiv AI**

---

## Regulatory Compliance

| Regulator | Coverage |
|---|---|
| **CBK** (Central Bank of Kenya) | KYC Directive 2013 — identity, address, source of funds verification |
| **POCAMLA** | AML monitoring, KES 1,000,000 threshold auto-flagging, STR filing workflow |
| **SASSRA** | Prudential ratios (capital adequacy ≥10%, liquidity ≥15%), quarterly returns |
| **ICPAK** | IFRS-compliant chart of accounts, double-entry journal |
| **Commissioner of Co-operatives** | Member register, AGM eligibility, share capital tracking |
| **KRA** | KRA PIN capture, VAT registration |
| **Data Protection Act 2019** | Immutable audit log, member data consent |

---

## Features

- **Clients & KYC** — Full onboarding with CBK KYC checklist, PEP screening, AML risk rating
- **M-Pesa Integration** — Daraja API v2 (STK Push, C2B, B2C, B2B), POCAMLA auto-flagging
- **Compliance Engine** — POCAMLA / CBK / SASSRA / ICPAK flag management, STR filing workflow
- **SASSRA Reports** — Prudential ratio dashboard, quarterly return submission
- **Co-op Register** — Commissioner of Co-operatives member register, share capital, AGM tracking
- **Bookkeeping Bridge** — Bidirectional API sync with Roots Co-op Bookkeeping system
- **Journal** — ICPAK/IFRS double-entry journal (KES)
- **Audit Log** — Permanent, immutable audit trail (Data Protection Act 2019)
- **Currency** — All amounts in **KES (Kenya Shillings)**

---

## Tech Stack

- React 19 + Vite 7
- Tailwind CSS v4
- Supabase (PostgreSQL + RLS + Auth)
- Safaricom Daraja API v2 (M-Pesa)
- React Router v7
- Recharts

---

## Environment Setup

Copy `.env.example` to `.env` and fill in:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MPESA_CONSUMER_KEY=
VITE_MPESA_CONSUMER_SECRET=
VITE_MPESA_SHORTCODE=
VITE_MPESA_PASSKEY=
VITE_MPESA_CALLBACK_URL=
VITE_MPESA_ENV=sandbox
VITE_BOOKKEEPING_API_URL=
VITE_BOOKKEEPING_API_KEY=
```

---

## Database

Run `supabase/schema.sql` in your Supabase project SQL editor.

The schema creates:
- 14 tables with full RLS policies
- Kenya-specific KYC, AML, SASSRA, co-op fields
- ICPAK/IFRS chart of accounts (seeded)
- Immutable audit log (no DELETE policy)

---

## Deployment

```bash
npm install
npm run dev       # Development
npm run build     # Production build
```

Netlify-ready (`netlify.toml` included).

---

## Related Projects

- **roots-bookkeeping** — SA CFI Co-operative Bookkeeping System (FICA/SARB/CBDA)
- This project is the Kenya-market edition. Same replication pattern applies for other regions.

---

*Aptiv Bookkeeping CRM v1.0 · Kenya Edition · © Aptiv Consulting*
