# Ticket Já API

RESTful API for event ticket sales built with **NestJS 11**, **Prisma 7**, **PostgreSQL 15** and **Redis**.

## Architecture

The project follows a **modular monolith** architecture with clear domain boundaries:

```
src/
├── auth/           # JWT authentication, guards, role-based access control
├── user/           # User management
├── venue/          # Venue CRUD with ownership validation
├── event/          # Event lifecycle (DRAFT → PUBLISHED), ownership, pagination
├── category/       # Ticket categories with pricing and stock control
├── coupon/         # Event-scoped discount coupons
├── order/          # Purchase flow with atomic stock reservation + reservation expiry job
├── payment/        # Payment confirmation service (manual admin flow)
├── ticket/         # QR code validation, usage tracking
├── admin/          # Organizer application review + payment confirmation (ADMIN only)
├── health/         # Health check endpoint (Prisma + Redis)
└── common/         # Shared filters, pipes, and utilities
```

**Key design decisions:**

- **Global guards** — JWT authentication and role-based access are enforced globally via `APP_GUARD`. Routes opt-out with `@Public()`.
- **Atomic stock control** — Order creation uses Prisma's atomic `decrement` with optimistic locking (`WHERE quantity >= requested`) to prevent overselling under concurrency.
- **Manual payment confirmation** — Payments are verified manually by administrators through the admin panel. No external payment gateways are integrated.
- **Reservation expiry** — Orders are created with a `reservedUntil` deadline; a scheduled job cancels expired `PENDING` orders and releases stock.
- **Idempotent checkout** — `POST /order` accepts an `Idempotency-Key` header to avoid duplicate orders on retries.
- **Cache layer** — Redis-backed cache on read-heavy endpoints (events, venues, categories) with per-method interceptor control.
- **Rate limiting** — Multi-tier throttling (short/medium/long) via `@nestjs/throttler` with Redis storage, stricter limits on auth and order endpoints.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript (ES2023) |
| Framework | NestJS 11 (Express) |
| ORM | Prisma 7 (native PostgreSQL adapter) |
| Database | PostgreSQL 15 |
| Cache / Rate-limit store | Redis 7.4 |
| Auth | JWT (passport-jwt) with refresh tokens |
| Payments | Manual admin confirmation (no gateway) |
| API Docs | Swagger/OpenAPI at `/docs` |
| Frontend | Nuxt 4 SPA (Vue 3 + TypeScript, `ssr: false`) |
| UI | Nuxt UI v4 + Tailwind v4 |
| Client state | Pinia |
| Client data / forms | TanStack Vue Query (`@peterbud/nuxt-query`) + vee-validate/Zod |
| Testing | Jest 30 (unit) + Supertest (e2e) |
| Container | Docker multi-stage + Docker Compose |

## Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Install dependencies
yarn install

# 3. Start PostgreSQL and Redis
docker compose up -d

# 4. Generate Prisma client and apply migrations
yarn prisma generate
yarn prisma migrate deploy

# 5. Seed the database
yarn prisma db seed

# 6. Start dev server
yarn start:dev
```

The API runs at `http://localhost:3000`. Swagger docs are available at `http://localhost:3000/docs` (disabled in production).

## Frontend

The frontend is a **Nuxt 4 SPA** (Vue 3 + TypeScript, `ssr: false`) located in `client/` as a standalone Yarn 4 project. It is a single app serving three roles — **customer**, **organizer** and **admin** — and consumes the API at `/api`.

**Stack:** Nuxt UI v4 + Tailwind v4 for UI, Pinia for client state (auth, checkout), TanStack Vue Query (`@peterbud/nuxt-query`) for data fetching, vee-validate + Zod for forms, and VueUse + `qrcode` where needed.

```
client/app/
├── assets/css/     global Tailwind + Nuxt UI styles
├── components/     layout/ | ui/ | event/ | venue/ | order/
├── composables/    useApi, useAuth + catalog/ events/ venues/ orders/ organizers/ payments/
├── layouts/        default, admin
├── middleware/     auth, admin, organizer
├── pages/          public + admin/ + organizador/ + minha-conta/ + checkout/
├── stores/         auth, checkout (Pinia)
├── types/          api.ts, admin.ts, organizer.ts
└── utils/          api.ts, format.ts, error.ts
```

**Run it from `client/`:**

```bash
yarn install     # postinstall runs `nuxt prepare`
yarn dev         # SPA on http://localhost:5173, proxies /api and /docs to :3000
yarn generate    # static SPA -> .output/public
yarn typecheck   # vue-tsc (no lint/test scripts)
```

The client talks to the API through `useApi()` (adds the bearer token and redirects to `/login` on 401). The base URL is `NUXT_PUBLIC_API_BASE` (default `/api`), and pages are protected with the `auth`, `admin` and `organizer` route middleware. In production the root `Dockerfile` builds the SPA in its `client-builder` stage (`yarn generate`) and copies `.output/public` into the API image's `public/`, where NestJS serves it via `ServeStaticModule`.

See [`client/README.md`](client/README.md) and [`client/AGENTS.md`](client/AGENTS.md) for full conventions.

## Seed Data

The seed populates the database with realistic test data using Faker:

- **Users** — 1 admin, 2 organizers (with profiles and approved applications), 7 buyers
- **Venues** — 4 venues across Brazil (Arena São Paulo, Estádio Olímpico, Centro de Convenções, Teatro Municipal)
- **Events** — 5 events (3 published, 2 draft) with mixed organizers and venues
- **Categories** — 9 ticket categories across events (Pista, VIP, Arquibancada, Camarote, etc.) with varying prices and stock
- **Coupons** — 3 coupons (percentage and fixed discounts, with expiry dates)
- **Orders** — 8 orders in different states (PAID, PENDING, CANCELED) with corresponding payments (APPROVED, PENDING, REJECTED) and tickets

Default credentials: `admin@email.com` / `organizer@email.com` / `maria@email.com` — password: `123456`

## Environment Variables

See `.env.example` for the full list. Key variables:

```bash
DATABASE_URL=                    # PostgreSQL connection string
REDIS_URL=                       # Redis connection string (cache + rate-limit store)
JWT_SECRET=                      # Access token signing key
JWT_REFRESH_SECRET=              # Refresh token signing key
ORDER_RESERVATION_TTL_MINUTES=   # PENDING order reservation TTL (default 15)
```

## Scripts

```bash
yarn start:dev       # Dev server with watch
yarn start:prod      # Production build
yarn test            # Unit tests
yarn test:e2e        # E2E tests (requires running DB)
yarn test:cov        # Coverage report
yarn lint            # ESLint with type-aware rules
yarn build           # Production build
yarn prisma studio    # Database browser
yarn prisma db seed   # Seed database
```

## Documentation

- [`docs/API.md`](docs/API.md) — full endpoint reference with request/response examples.
- [`docs/PAYMENTS.md`](docs/PAYMENTS.md) — manual payment flow, reservation expiry and idempotency.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — design decisions, request lifecycle and conventions.

## License

UNLICENSED.
