# WAKA Platform — Setup & Deployment Guide

## Overview

WAKA is a full-stack ride-booking platform for Sierra Leone.
Built with React + TypeScript + TailwindCSS + Supabase, deployed on Netlify.

---

## Step 1 — Create Your Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **New Project**
3. Name it: `waka-production`
4. Set a strong database password (save it)
5. Region: **Choose closest to West Africa** (e.g. EU West)
6. Wait ~2 minutes for provisioning

---

## Step 2 — Run the Database Migration

1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Open `supabase/migration_001_initial.sql` from this project
4. Paste the entire contents into the SQL editor
5. Click **Run**
6. You should see: "Success. No rows returned"

---

## Step 3 — Create Storage Buckets

In Supabase → **Storage** → **New Bucket**, create these 4 buckets:

| Bucket Name        | Public? | Purpose                        |
|--------------------|---------|--------------------------------|
| `driver-documents` | ❌ No   | License and National ID scans  |
| `driver-photos`    | ❌ No   | Driver headshot photos         |
| `vehicle-photos`   | ❌ No   | Vehicle photos                 |
| `avatars`          | ✅ Yes  | Profile pictures               |

For private buckets, RLS is handled by the migration SQL.

---

## Step 4 — Configure Authentication

In Supabase → **Authentication** → **Providers**:

1. Ensure **Email** is enabled
2. Under **Email** settings:
   - ✅ Enable "Confirm email"
   - Set Site URL: `https://your-netlify-domain.netlify.app`
   - Add redirect URLs:
     - `https://your-netlify-domain.netlify.app/auth/verify`
     - `https://your-netlify-domain.netlify.app/auth/reset-password`
     - `http://localhost:5173` (for local dev)

---

## Step 5 — Create the Admin User

After deploying, register normally with:
- **Email**: your admin email
- **Role**: Rider (default)

Then go to Supabase → **Table Editor** → **profiles**:
- Find your user row
- Change `role` from `rider` to `admin`

Now log in — you'll have full admin access.

---

## Step 6 — Configure Environment Variables

**Local development:**
```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Get these from: Supabase → **Project Settings** → **API**

---

## Step 7 — Run Locally

```bash
npm install
npm run dev
```

Open: `http://localhost:5173`

---

## Step 8 — Deploy to Netlify

### Option A: Netlify CLI (Recommended)
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL https://YOUR_PROJECT_ID.supabase.co
netlify env:set VITE_SUPABASE_ANON_KEY your_anon_key
netlify deploy --prod
```

### Option B: Netlify Dashboard
1. Go to [https://netlify.com](https://netlify.com)
2. **Add new site** → **Import from Git**
3. Connect your GitHub repo
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Environment Variables** → Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**

---

## Step 9 — Update Payment Merchant Numbers

In `src/lib/constants.ts`, update the real merchant numbers:

```typescript
export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'orange_money',
    merchant_number: '076-REAL-NUMBER',  // ← Your real Orange Money merchant number
    ...
  },
  {
    id: 'afri_money',
    merchant_number: '077-REAL-NUMBER',  // ← Your real Afri Money merchant number
    ...
  },
  {
    id: 'q_money',
    merchant_number: '078-REAL-NUMBER',  // ← Your real Q Money merchant number
    merchant_id: 'YOUR-MERCHANT-ID',
    ...
  },
]
```

---

## Platform Architecture

```
/src
├── components/
│   ├── auth/          — ProtectedRoute, GuestRoute guards
│   ├── rider/         — RiderBottomNav
│   └── ui/            — Button, Card, Input, Badge, Spinner, etc.
├── hooks/
│   └── useAuth.ts     — Auth state hook
├── lib/
│   ├── supabase.ts    — Supabase client
│   ├── constants.ts   — Fares, payment methods, vehicle config
│   └── database.types.ts — Generated TypeScript types
├── pages/
│   ├── auth/          — Login, Register, ForgotPassword
│   ├── rider/         — Home, Booking, ActiveRide, Payment, Rides, Profile, Rate
│   ├── driver/        — Onboarding, Dashboard, Trip, Earnings, Profile
│   └── admin/         — Dashboard, Drivers, Bookings, Payments, Fares, Users
├── store/
│   └── authStore.ts   — Zustand global auth state
└── types/
    └── index.ts       — All TypeScript types
```

---

## User Flows

### Rider Flow
```
Register → Verify Email → Login
→ Home (Map) → Book a Ride
→ Select Pickup → Select Destination → Choose Vehicle
→ See Fare Estimate → Confirm Booking
→ Payment Page (Select method + submit reference code)
→ Active Ride Tracking (real-time driver location)
→ Trip Complete → Rate Driver
```

### Driver Flow
```
Register (role: driver) → Verify Email → Login
→ Onboarding (4 steps: personal → documents → vehicle → review)
→ Wait for Admin Approval (pending_approval)
→ [Admin Approves] → Dashboard
→ Go Online → Receive Ride Request
→ Accept → Navigate to Pickup → Start Trip → Complete Trip
→ View Earnings
```

### Admin Flow
```
Login (admin role) → Dashboard
→ Review Pending Drivers → Approve/Reject with notes
→ Monitor Live Bookings → Confirm Payments → Adjust Fares
```

---

## Real-Time Features

WAKA uses Supabase Realtime for:
- **Rider**: Live booking status updates, driver location
- **Driver**: Incoming ride request notifications
- **Admin**: Live booking monitor, real-time stats

---

## Map Configuration

Map center defaults to **Freetown, Sierra Leone** `[8.4657, -13.2317]`

Geocoding uses **Nominatim (OpenStreetMap)** — free, no API key required.

Routing uses **OSRM** — free, no API key required.

---

## Security

- All database tables have Row Level Security (RLS) enabled
- Riders can only read/write their own bookings
- Drivers can only read/write their own records
- Admins have full access via the `is_admin()` function
- Document uploads go to private buckets (signed URLs only)
- No sensitive keys in frontend code

---

## Support

Platform: WAKA Sierra Leone
Contact: support@waka.sl
