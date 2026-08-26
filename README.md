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
├── order/          # Purchase flow with atomic stock reservation
├── payment/        # Gateway abstraction (ASAAS/PIX), webhooks, expiry job
├── ticket/         # QR code validation, usage tracking
├── admin/          # Organizer application review (ADMIN only)
├── health/         # Health check endpoint (Prisma + Terminus)
└── common/         # Shared filters, pipes, and utilities
```

**Key design decisions:**

- **Global guards** — JWT authentication and role-based access are enforced globally via `APP_GUARD`. Routes opt-out with `@Public()`.
- **Strategy pattern** — Payment providers (ASAAS, Mercado Pago, etc.) implement a common interface, making gateway swaps trivial.
- **Atomic stock control** — Order creation uses Prisma's atomic `decrement` with optimistic locking (`WHERE quantity >= requested`) to prevent overselling under concurrency.
- **Idempotent webhooks** — ASAAS webhook handler deduplicates events by `payment.id + event` to safely handle retries.
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
| Payments | ASAAS (PIX) via Strategy pattern |
| API Docs | Swagger/OpenAPI at `/docs` |
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

The API runs at `http://localhost:3000`. Swagger docs are available at `http://localhost:3000/api` (disabled in production).

## Seed Data

The seed populates the database with realistic test data using Faker:

- **Users** — 1 admin, 2 organizers (with profiles and approved applications), 7 buyers
- **Venues** — 4 venues across Brazil (Arena São Paulo, Estádio Olímpico, Centro de Convenções, Teatro Municipal)
- **Events** — 5 events (3 published, 2 draft) with mixed organizers and venues
- **Categories** — 9 ticket categories across events (Pista, VIP, Arquibancada, Camarote, etc.) with varying prices and stock
- **Coupons** — 3 coupons (percentage and fixed discounts, with expiry dates)
- **Orders** — 8 orders in different states (PAID, PENDING, CANCELED) with corresponding payments (APPROVED, PENDING, FAILED, REFUNDED) and tickets

Default credentials: `admin@email.com` / `organizer@email.com` / `maria@email.com` — password: `123456`

## API Endpoints

All endpoints are documented in Swagger at `/api`. The API is organized into these domain groups:

- **Auth** — Register, sign in, refresh tokens, logout, account deletion
- **Venue** — CRUD with ownership validation and pagination
- **Event** — CRUD with status lifecycle management (DRAFT ↔ PUBLISHED)
- **Category** — CRUD nested under events, with pricing and stock control
- **Order** — Ticket purchase with atomic stock reservation
- **Ticket** — QR code validation, listing, usage tracking
- **Payment** — ASAAS webhook for payment confirmation
- **Admin** — Organizer application review (ADMIN only)
- **Health** — Service health check with Prisma ping

## Payments (ASAAS / PIX)

The payment flow is designed for resilience:

1. `POST /order` reserves stock atomically, then calls the ASAAS gateway **outside** the transaction.
2. If the gateway is down, the API returns `502` — the order stays `PENDING` and the expiry job handles cleanup.
3. ASAAS webhook (`/api/payments/webhook/asaas`) confirms payment, marks the order as `PAID`, and releases tickets.
4. A scheduled job (every 5 minutes) expires `PENDING` payments older than 30 minutes, cancels the order, and restores stock.

## Environment Variables

See `.env.example` for the full list. Key variables:

```bash
DATABASE_URL=         # PostgreSQL connection string
REDIS_URL=            # Redis connection string (cache + rate-limit store)
JWT_SECRET=           # Access token signing key
JWT_REFRESH_SECRET=   # Refresh token signing key
ASAAS_API_KEY=        # ASAAS sandbox/prod API key
ASAAS_BASE_URL=       # e.g. https://sandbox.asaas.com/api/v3
ASAAS_WEBHOOK_TOKEN=  # Secret for incoming webhook authentication
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

## License

UNLICENSED.
