# EaseMyClean

Professional solar panel cleaning, AMC, and health-audit marketplace. This repo is being built in passes — see **Build Status** below for what's implemented vs. deferred.

## Stack

- **Client:** React (Vite) + Tailwind CSS + React Router + TanStack Query + Axios — `client/`
- **Server:** Node.js + Express + Prisma + PostgreSQL — `server/`
- **Auth:** JWT; OTP-based customer login (mocked — no SMS provider yet); email/password fallback; email/password for staff/admin
- **Payments:** Razorpay (mocked in Pass 1 — no live keys required yet)

## Getting Started (local dev)

### 1. Database

You need a PostgreSQL connection string (Neon, Supabase, Render Postgres, or local Postgres all work).

```
cd server
cp .env.example .env   # already done if you're continuing this session
# edit .env and set DATABASE_URL to your real connection string
npx prisma migrate dev
npm run seed
```

Seeding creates:
- 4 services, 3 AMC plans (Basic Clean / Standard AMC / Premium AMC), 4 cities (Hisar = live, Chandigarh/Panchkula/NCR = upcoming), site settings
- `PageContent` rows for `about` and `health-audit`, and one published sample blog post
- 4 technicians across Hisar/Chandigarh/Panchkula/NCR
- 1 admin (`admin@easemyclean.com` / `Admin@123`) — sign in at `/admin/login`, not the customer `/login`
- 1 demo customer (phone `+919999900001`, email `rohit.demo@easemyclean.com` / `Demo@123`) with a site and 8 bookings spanning every status

### 2. Run both apps

```
# terminal 1
cd server && npm install && npm run dev

# terminal 2
cd client && npm install && npm run dev
```

Client runs on `http://localhost:5173`, API on `http://localhost:5000`. `GET /api/health` should return `{"status":"ok"}`.

### 3. Log in

- **Customer — OTP flow:** enter any phone number on `/login` → the mock OTP is shown directly in the UI (no SMS provider is wired up yet, see Assumptions) and logged server-side.
- **Customer — password flow:** use the seeded demo customer credentials above, or register a new account.
- **Admin/staff:** `/admin/login` (email + password only — this endpoint and the customer login endpoint each reject the other role's credentials).

### 4. Tests

```
cd server && npm test   # needs DATABASE_URL set — several suites hit a real DB
cd client && npm test
```

## Build Status

**Pass 1 — done:** full Prisma schema, public marketing site (Home, Services, AMC & Pricing, Health Audit, About, Contact), OTP + password auth, multi-step booking wizard (service or AMC selection → site → SOP-compliant slot picker → review → mock Razorpay payment), customer dashboard (profile, bookings, payment history, AMC view), server-side price calculation, idempotent payment webhook, auto-generated AMC visit schedule, unit + integration tests.

**Pass 2 — done:** admin panel at `/admin` with its own auth (`/admin/login`, separate token/session from the customer app) — Dashboard (KPI counts), Bookings (list + detail with status/technician assignment, Service Report editor, before/after photo upload via local `/uploads`, "feature on homepage" gallery toggle, Approve & Publish gating so customers never see a draft report), Services CRUD, AMC Plans CRUD, Cities CRUD (drives the public "Where We Operate" section and the booking wizard's city dropdown), Site Settings (contact email/phone/WhatsApp/address, now DB-driven everywhere it used to be hardcoded). Real logo integrated (`client/public/logo.png`, chroma-keyed transparent + a cropped favicon), Tailwind brand tokens updated to the logo's actual extracted colors. New backend tests: login role-gating, admin Services CRUD (incl. delete-guard when a booking references it), city-must-be-live validation on site creation.

**Pass 3 — done:**
- **Customer Management:** Admin → Customers — searchable/filterable list (by name/phone/email, city, AMC status) with computed `bookingCount`/`hasActiveAmc`/`lastBookingDate`; a full customer-360 detail view (profile, sites, complete booking history, every Service Report with photos regardless of publish status, payment history, AMC subscriptions, leads matched by phone, and an admin-only internal notes field — never exposed via any customer-facing endpoint).
- **Blog (SEO):** `BlogPost` model with admin CRUD (`/admin/blog`, markdown editor with live preview, featured-image upload, draft/publish toggle, auto-slug with collision handling) and public pages (`/blog` paginated + category filter, `/blog/:slug`). Markdown is rendered with `marked` and sanitized with `dompurify` before injection. Per-post `<title>`/meta description/OG tags are set dynamically via a `useDocumentMeta` hook — this covers Google (which executes JS before indexing) and the browser tab, but **not** OG scrapers that don't run JS (Facebook/LinkedIn/WhatsApp link previews only ever see `index.html`'s static tags). Real fix for that is SSR or a prerendering step — a genuine infra decision, intentionally left as a Pass 4+ candidate rather than silently half-solved.
- **Page-Content CMS:** generic `PageContent` model (one JSON row per page) backing an admin editor at `/admin/page-content` (About / Health Audit tabs) — the About page's mission/problem text, leadership bios, and milestones, plus the Health Audit page's hero text and checks list, are now DB-driven instead of hardcoded, closing the Section 5.10 gap.
- New backend tests: customer-list aggregation correctness, blog slug uniqueness + draft/published visibility split, page-content upsert round-trip.

**Post-Pass-3 bug fixes — done:**
- **Commercial Quote leads:** the AMC page's "Request a Custom Commercial Quote" form now tags its submission `leadType: COMMERCIAL_QUOTE` (new `LeadType` enum value) instead of being indistinguishable from a general contact-form lead. Built the admin **Leads** screen that didn't exist yet (`/admin/leads`) — filter by lead type/status/search, expandable rows showing the message and plant capacity, inline status updates.
- **Homepage before/after slider:** was showing random Lorem Picsum stock photos (a beach, a photo of grapes) because the seed data happened to use a placeholder image service, not because of a CSS bug — the slider's `GET /api/gallery/featured`-driven, admin-curated-photo architecture from Pass 2 was already correct. Replaced with two procedurally generated, purpose-made solar-panel images (dusty vs. clean, `server/prisma/seed-assets/`, git-tracked) so demo data never depends on an unrelated third-party image service again.
- **Logo sharpness + empty hero image:** verified directly against the live EaseMyClean site — `/assets/logo.png` (242×147px) is the *only* logo asset it serves anywhere (no favicon links, no `srcset`, no higher-res variant to find), so that ceiling is real, not a missed file. What was fixable: my earlier transparency cutout used a hard 0/255 alpha threshold that turned the source's soft anti-aliasing into jagged stair-steps — replaced with a graduated alpha (`client/public/logo.png`, regenerated favicon), and bumped the header's display size ~15% with explicit `width`/`height` attributes. Separately, the hero section's headline/sub-headline/CTAs were never actually missing — only the right-hand image slot was a genuine empty placeholder box (a known Pass 1 stand-in, no real photography existed at the time). Now filled with the same generated clean-panel image used for the before/after slider.

**Deferred to later passes (flagged, not silently dropped):**
- **Pass 4:** Live Razorpay key wiring, PDF service-report/invoice generation, remaining Section 5A modules (repair requests, inventory tracking, vendor/subcontractor management, referral program, multi-site switcher UI, scheme-assistance/warranty waitlist pages), granular RBAC UI beyond ADMIN/STAFF (the `StaffRole` enum exists on `User` but isn't enforced/edited anywhere yet), SSR/prerendering for full OG social-preview support.
- **Deploy (next priority per the user):** `render.yaml`, production env hardening (incl. swapping local `/uploads` disk storage for S3-compatible storage), trial deploy to Render.

## Assumptions Made (flagged for client confirmation, not silently guessed)

- **Brand colors:** extracted by pixel-sampling the real logo (`client/public/logo.png`) rather than eyeballing it — green `#146440`, sky blue `#29A9E6` (new — the logo's swoosh gradient includes blue, which Pass 1's approximation missed), gold/orange `#FCAD34`. `maroon` (`#5A1F35`) isn't in the logo at all; kept as a secondary accent from the original brand deck for footer/badge contrast — flagged as a judgment call, easy to drop if the client wants the palette to match the logo exactly.
- **OTP/SMS:** no SMS or WhatsApp Business API is wired up yet (per spec, deferred until a paid provider is chosen). `server/src/lib/otp.js` logs the OTP and returns it in the API response outside of `production` — this is what the Login page reads to auto-fill the demo flow.
- **Razorpay:** `RAZORPAY_MOCK_MODE=true` by default. `POST /api/payments/create-order` returns a mock order; `POST /api/payments/mock-pay` simulates a successful webhook so the full booking→payment→confirmation flow is testable without real keys.
- **AMC pricing model:** `AMCPlan.basePrice`/`pricePerKw` are treated as a **per-visit** rate (charged each time a scheduled visit is billed), not a single annual lump sum — the spec's pricing table doesn't specify which, so this was the more common billing pattern for Indian AMC services.
- **ROI calculator formula:** the recoverable-savings percentages by dust zone (`HIGH`/`MODERATE`/`LOW`) in `server/src/lib/roiCalculator.js` are estimates for a lead-gen tool, not a precision generation model — flagged for the client to refine with real soiling-loss data.
- **Testimonials:** still static placeholder content (`client/src/components/home/TestimonialCarousel.jsx`) — before/after photos are now DB-driven (Pass 2), but a testimonials CRUD screen wasn't in the Pass 2 ask, so it's still hardcoded.
- **City deletion:** cities have no hard delete-guard (unlike Services/AMC Plans) since `Site.addressJson.city` is a descriptive string, not a foreign key — deleting a city doesn't retroactively touch existing sites/bookings, it just stops appearing as a bookable option.
- **Admin "Reports" nav:** folded into each booking's detail page (a Service Report tab) rather than a separate flat list, to avoid a duplicate view of the same data — reachable via Admin → Bookings → (row).

## Folder Structure

```
easemyclean/
├── client/     React app (public site + customer dashboard + booking flow)
├── server/     Express API + Prisma schema/seed
└── README.md
```
