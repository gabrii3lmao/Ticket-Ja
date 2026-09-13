# Architecture

Ticket Já is a **modular monolith** built with NestJS, Prisma, PostgreSQL and Redis. This document describes the main design decisions and conventions. For the payment flow specifically, see [`PAYMENTS.md`](PAYMENTS.md).

## Module boundaries

```
src/
├── auth/        # JWT auth, guards, decorators, refresh-token service
├── user/        # User creation and lookup (used by auth and ActiveUserPipe)
├── venue/       # Venue CRUD (owned by an organizer profile)
├── event/       # Event lifecycle + ownership
├── category/    # Ticket categories (price, stock, sales window)
├── coupon/      # Event-scoped discount coupons
├── order/       # Purchase flow + reservation expiry job
├── payment/     # Payment state transitions (manual admin flow)
├── ticket/      # Ticket listing, QR validation, check-in
├── admin/       # Organizer application review + payment confirmation
├── health/      # Health check (database + Redis)
└── common/      # Global filters, validators, shared utilities
```

Each feature module owns its controller, service, DTOs and specs. Cross-module access happens through exported services (e.g. `OrderModule` imports `PaymentModule` to reuse `PaymentService`).

## Request lifecycle

1. **Global prefix** — every route is served under `/api` (`setGlobalPrefix('api')`).
2. **Global guards** (registered as `APP_GUARD` in `AppModule`), in order:
   - `JwtAuthGuard` — requires a valid access token unless the route is `@Public()`.
   - `RolesGuard` — enforces `@Roles(...)`; routes without it only require authentication.
   - `ThrottlerGuard` — applies the configured rate limits.
3. **Global pipe** — `ValidationPipe` with `whitelist`, `forbidNonWhitelisted` and `transform`, so DTOs strip unknown fields and coerce types.
4. **Controller → Service** — services receive the authenticated user via `@CurrentUser(ActiveUserPipe)`, which re-loads the user from the database (so deleted users cannot act).
5. **Global exception filters** — normalize errors (see [Error handling](#error-handling)).

## Authentication & authorization

- **Access token** — short-lived JWT (`JWT_ACCESS_EXPIRATION`, default `15m`) with `sub`, `email`, `role`.
- **Refresh token** — signed with `JWT_REFRESH_SECRET`, persisted in the `RefreshToken` table, rotated on every `POST /auth/refresh` (the old one is revoked) and revocable on logout. All of a user's tokens can be revoked at once.
- **Roles** — `BUYER`, `ORGANIZER`, `ADMIN`. Organizer capabilities require an approved `OrganizerProfile` (created when an admin approves an `OrganizerAplication`).
- **Ownership** — beyond roles, services validate resource ownership. Organizers can only mutate venues/events/categories/coupons they own; `ADMIN` bypasses ownership checks.
- **Ticket check-in** — `GET /ticket/validate/:code` and `PATCH /ticket/:id/use` require `ADMIN` or the organizer that owns the ticket's event. Buyers can only view their own tickets.

## Purchase flow (atomic stock control)

`POST /order` runs the whole flow inside a single interactive `$transaction`:

1. Validate categories (exist, event `PUBLISHED`, sales window open, event not started) and that all items belong to a **single event**.
2. Reserve stock with an atomic conditional update: `UPDATE ... SET quantity = quantity - X WHERE id = ? AND quantity >= X`. If the update matches no row, the transaction fails with `400` (prevents overselling under concurrency).
3. Resolve the coupon (if any) and consume one use atomically.
4. Compute `subtotal`, 5% `fee`, `discount` and `total`.
5. Create the order, its items, the tickets and a `PENDING` payment.

Any error rolls the transaction back, releasing any stock already decremented.

## Coupons

- Coupons are **event-scoped** and managed by the event owner or an admin.
- `code` is unique and stored uppercased.
- `discountType` is `PERCENTAGE` (value ≤ 100) or `FIXED`; the discount is always capped at the subtotal.
- Redemption is atomic: `currentUses` is incremented with a guarded `updateMany` (`currentUses < maxUses`), so concurrent checkouts cannot exceed `maxUses`.

## Reservation expiry

- Every order is created with `reservedUntil` (`ORDER_RESERVATION_TTL_MINUTES`, default 15).
- `OrderExpirationService` runs a `@Cron` job every minute and cancels `PENDING` orders past the deadline, restoring stock and canceling tickets (`REJECTED`/`CANCELED` with reason `Reservation TTL expired`).
- Cancellation reuses `PaymentService.releaseOrder`, which only acts when the order is still `PENDING` — so it is idempotent and safe against races with the admin confirming at the same time.

## Idempotent checkout

- `POST /order` accepts an optional `Idempotency-Key` header.
- The key is hashed (`sha256`) and stored on `Order.idempotencyKey` with a unique constraint on `[userId, idempotencyKey]`.
- A replay returns the original order; a concurrent duplicate is caught via the unique constraint (`P2002`) and resolved to the first order.
- Requests without the header are never deduplicated.

## Caching

- `CacheModule` is global and Redis-backed (`ttl: 60000`).
- `CacheInterceptor` is applied per-method on read-heavy public endpoints (event, venue, category listings and details).
- There is currently **no cache invalidation** on writes; entries expire after the TTL. See [`LIMITATIONS.md`](LIMITATIONS.md).

## Rate limiting

Three named throttlers are configured globally:

| Name | TTL | Limit |
|------|-----|-------|
| `short` | 1s | 3 |
| `medium` | 10s | 20 |
| `long` | 60s | 100 |

Stricter per-route overrides: `POST /auth/register` and `POST /auth/signin` (3/s), `POST /order` (5/10s). `GET /health` skips throttling.

## Error handling

Errors are normalized by global filters:

- `HttpExceptionFilter` — HTTP exceptions, shape:
  ```json
  { "statusCode": 400, "timestamp": "...", "path": "/api/...", "error": { "message": "..." } }
  ```
- `PrismaClientExceptionFilter` — maps Prisma error codes: `P2000`→400, `P2002`→409, `P2003`→422, `P2025`→404, others→500.
- `ThrottlerExceptionFilter` — `429` with `{ "statusCode": 429, "message": "Too many requests..." }`.

## Conventions

- **Pagination** — list endpoints return `{ data, meta: { total, page, limit, totalPages } }` with `page`/`limit` query params (`limit` capped at 100).
- **Sorting** — `sortBy`/`sortOrder` query params (see [`LIMITATIONS.md`](LIMITATIONS.md) for the current lack of an allowlist).
- **DTOs** — `class-validator` + `class-transformer`, documented with `@ApiProperty`/`@ApiPropertyOptional`.
- **Enums / Prisma client** — imported from `generated/prisma/enums` and `generated/prisma/client`.
- **Tests** — Jest unit specs next to the source (`*.spec.ts`), e2e in `test/` (`*.e2e-spec.ts`). Specs that import `PrismaService` mock `generated/prisma/client` (`jest.mock('generated/prisma/client', () => ({ PrismaClient: class {} }))`). ESLint ignores spec files.

## Deployment

- **Dockerfile** — multi-stage: `development` (watch mode), `builder` (`yarn build`), `production` (runs `dist`, `yarn start:prod`).
- **`compose.yaml`** — PostgreSQL + Redis for local development.
- **`compose.prod.yaml`** — PostgreSQL + Redis + the API image, using `.env.production.local`.
- **Environment** — see `.env.example`. Key variables: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `HEALTH_CHECK_SECRET`, `ORDER_RESERVATION_TTL_MINUTES`.
