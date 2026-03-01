<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-check.svg" width="80" height="80" alt="Warrify Logo" />
  <h1>Warrify</h1>
  <p>AI-Powered Consumer Justice & Warranty Management Platform</p>
</div>

## Features

- **Smart Dashboard**: Track product warranties with expiry indicators, risk scores, and advanced filters.
- **AI-Powered OCR**: Auto-fill product details by simply uploading an invoice image (even faded thermal receipts).
- **Document Quality Classifier**: ML-based analysis detects faded receipts vs. valid invoices.
- **AI Advisor (Multi-AI)**: NVIDIA Qwen → Gemini 2.0 → Groq → rule-based fallback for warranty guidance, claim drafting, and risk analysis.
- **Automated Notifications**: Scheduled email reminders for warranties expiring in 30 or 7 days.
- **Multilingual Support**: English, Hindi, and Marathi.
- **Service Center Directory**: Contact details and nearby centers for major electronics/appliance brands (DB-driven).
- **AI Claim Email Generation**: Draft professional warranty claim emails in seconds.
- **UNEP Environmental Impact**: Track CO₂e and e-waste savings per product.
- **Secure Architecture**: Firebase Auth, Supabase RLS, rate limiting, Helmet headers, safe file uploads.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite, Framer Motion
- **Backend**: Express.js, TypeScript, Supabase (PostgreSQL)
- **Auth**: Firebase Authentication + Supabase user sync
- **AI/ML**: NVIDIA Qwen 2.5-7B, Google Gemini 2.0, Groq Llama 3, Tesseract.js (OCR)
- **Email**: Nodemailer (Gmail)
- **Security**: Helmet, CORS, express-rate-limit

## Architecture

```
Frontend (React/Vite) ─── API ─── Express.js Backend
                                    │
                          ┌─────────┼─────────┐
                          │         │         │
                     Supabase  Firebase   AI APIs
                     (PostgreSQL) (Auth)  (NVIDIA/Gemini/Groq)
```

**Business data** (brands, categories, service centers, risk rules, impact factors) is stored in Supabase and served via `/api/meta/catalog` and `/api/service`. Hardcoded fallbacks exist during migration.

## Run Locally

**Prerequisites:** Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```

   Required keys:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - `VITE_FIREBASE_*` keys
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   - At least one AI key: `GEMINI_API_KEY`, `NVIDIA_API_KEY`, or `GROQ_API_KEY`

3. Run the DB migration in Supabase SQL Editor:
   - `supabase-schema.sql` (initial tables)
   - `supabase-migration-v2.sql` (business data tables + seed)

4. Run the app:
   ```bash
   npm run dev
   ```

5. The app will be available at `http://localhost:3000`.

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/meta/catalog` | All metadata: brands, categories, warranty options, claim statuses, quick actions |
| `GET /api/service` | List all supported brands |
| `GET /api/service/:brand` | Service center info for a specific brand |
| `GET /api/products` | User's products (requires auth) |
| `POST /api/products` | Add a product (requires auth) |
| `GET /api/products/:id/risk-assessment` | AI risk assessment for a product |
| `POST /api/assistant` | AI advisor chat |
| `GET /api/admin/stats` | Platform statistics with UNEP impact data |
| `POST /api/seed-demo` | Seed demo data (requires `DEMO_MODE=true`) |

## Demo Data

Set `DEMO_MODE=true` in your `.env` file, then call:
```bash
curl -X POST http://localhost:3000/api/seed-demo
```

Sample invoice images for OCR testing are in the `demo-invoices/` folder.
