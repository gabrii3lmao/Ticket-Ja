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

## Seed Data

The seed populates the database with realistic test data using Faker:

- **Users** — 1 admin, 2 organizers (with profiles and approved applications), 7 buyers
- **Venues** — 4 venues across Brazil (Arena São Paulo, Estádio Olímpico, Centro de Convenções, Teatro Municipal)
- **Events** — 5 events (3 published, 2 draft) with mixed organizers and venues
- **Categories** — 9 ticket categories across events (Pista, VIP, Arquibancada, Camarote, etc.) with varying prices and stock
- **Coupons** — 3 coupons (percentage and fixed discounts, with expiry dates)
- **Orders** — 8 orders in different states (PAID, PENDING, CANCELED) with corresponding payments (APPROVED, PENDING, REJECTED) and tickets

Default credentials: `admin@email.com` / `organizer@email.com` / `maria@email.com` — password: `123456`

## API Endpoints

All endpoints are documented in Swagger at `/docs` and in [`docs/API.md`](docs/API.md). The API is organized into these domain groups:

- **Auth** — Register, sign in, refresh tokens, logout, account deletion
- **Venue** — CRUD with ownership validation and pagination
- **Event** — CRUD with status lifecycle management (DRAFT ↔ PUBLISHED)
- **Category** — CRUD nested under events, with pricing and stock control
- **Coupon** — Event-scoped discount coupons with usage limits
- **Order** — Ticket purchase with atomic stock reservation and idempotency
- **Ticket** — QR code validation, listing, usage tracking
- **Admin** — Organizer application review + payment confirmation (ADMIN only)
- **Health** — Service health check (database + Redis)

## Payments (Manual Confirmation)

The payment flow is designed for simplicity and manual control:

1. `POST /order` reserves stock atomically and creates a payment record in `PENDING` status.
2. The order appears in the admin panel (`GET /admin/payments-requests`).
3. The administrator verifies the payment manually (e.g., bank transfer, PIX confirmation).
4. The administrator confirms (`PATCH /admin/payments-requests/:id/confirm`) or rejects (`PATCH /admin/payments-requests/:id/reject`) the payment.
5. Confirmation marks the order as `PAID`. Rejection cancels the order, releases stock, and cancels tickets.
6. **Reservation expiry** — each order is created with a `reservedUntil` timestamp (default 15 min, `ORDER_RESERVATION_TTL_MINUTES`). A scheduled job (`OrderExpirationService`, runs every minute) cancels orders that are still `PENDING` after that time, releasing stock and canceling tickets.

### Idempotency

`POST /order` accepts an optional `Idempotency-Key` header. Repeating the request with the same key (and authenticated user) returns the original order instead of creating a duplicate — useful for retries and double-clicks. The key is stored hashed (`sha256`) with a `[userId, idempotencyKey]` unique constraint, and concurrent requests with the same key are resolved to the first order created.

```http
POST /api/order
Authorization: Bearer <token>
Idempotency-Key: 7f3c... (any unique string per checkout attempt)
Content-Type: application/json
```

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
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — known limitations and roadmap.

## License

UNLICENSED.
