# Mother & Child (মা ও শিশু) — Bangladesh Platform

**Tagline:** Every Story. Every Little Moment.

A bilingual (**Bengali default `bn` / English `en`**) social discovery, motherhood Q&A, paediatric Doctor Corner, Mother's Guide, private Baby Growth Tracker, and multi-vendor BDT (`৳`) Marketplace built for families across Bangladesh.

---

## Architecture Overview
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + React Router v7 + `vite-plugin-pwa` (installable PWA with offline shell caching).
- **Backend**: Express + Vite middleware (`server.ts`, port `3000`) serving `/api/v1/*` REST APIs with file-backed persistence (`data/db.json`) and pure domain logic (`src/lib/domain.ts`).
- **Authentication & Security Rules**: Firebase Authentication (Google Sign-In) & Firestore (`firebase-applet-config.json`, `firebase-blueprint.json`, `firestore.rules` with owner-scoped PII isolation and role checks).

## Core Modules & Routes
- **Social Discovery & Reels**: `/`, `/discover`, `/following`, `/trending`, `/videos` (vertical short-video Reels player with product tags).
- **Content Creation Studio**: `/create`, `/create/photo`, `/create/video`, `/create/question`, `/create/poll` (enforces 180s short-video limit and required captions/categories).
- **Community Q&A & Polls**: `/community`, `/questions` (supports anonymous mode, best answer marking, and live community voting).
- **Doctor Corner & Appointments**: `/doctors`, `/doctors/:id`, `/appointments` (emergency red-flag banner, verified doctor directory, slot double-booking prevention, sandbox bKash/Nagad/Card booking).
- **Bilingual Mother's Guide**: `/guide`, `/pregnancy`, `/baby-care`, `/mother-care`, `/child-development` (medically reviewed reference library + editorial CMS).
- **Private Baby Growth Tracker**: `/baby-tracker` (WHO-inspired weight/height evaluation bands, Bangladesh EPI vaccination checklist, milestones, and instant profile deletion).
- **Multi-Vendor Marketplace & Checkout**: `/marketplace`, `/marketplace/categories/:slug`, `/products/:id`, `/shops/:slug`, `/cart`, `/checkout`, `/orders`, `/wishlist` (Dhaka `৳60` / Outside Dhaka `৳120` delivery, parent order splitting into seller sub-orders, COD explicitly marked unpaid until delivery).
- **Role Dashboards & Moderation**: `/creator/dashboard`, `/seller/dashboard`, `/doctor/dashboard`, `/admin` (doctor verification queue, moderation reports, audit trail).

## Local Commands
- `npm run dev` — Run Express + Vite dev server on `http://localhost:3000`
- `npm run build` — Build production client bundle (`dist/`)
- `npm run lint` — TypeScript check (`tsc --noEmit`)
- `npx --yes tsx --test src/lib/domain.test.ts firestore.rules.test.ts` — Run unit & security rule structure tests
- `npx eslint DRAFT_firestore.rules` — Validate Firestore security rules
