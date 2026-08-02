# Ticket Já API

RESTful API for event ticket sales built with **NestJS 11**, **Prisma 7** and **PostgreSQL 15**.

## Tech Stack

- **Runtime:** Node.js + TypeScript (ES2023)
- **Framework:** NestJS with modular architecture
- **ORM:** Prisma 7 with native PostgreSQL adapter (`@prisma/adapter-pg`)
- **Auth:** JWT via passport-jwt (global guard with `@Public()` bypass)
- **Validation:** class-validator + class-transformer (whitelist + transform enabled)
- **API Docs:** Swagger/OpenAPI at `/api`
- **Testing:** Jest 30 (unit) + Supertest (e2e)
- **Lint/Format:** ESLint 9 (flat config) + Prettier 3
- **Container:** Docker multi-stage + Docker Compose

## Project Structure

```
src/
├── auth/        — Authentication (register, signin, JWT strategy, guards)
├── user/        — User management (create, findByEmail, delete)
├── venue/       — Venue CRUD with ownership, pagination, filters
├── event/       — Event CRUD with ownership, status lifecycle, pagination
├── category/    — Category CRUD with ownership check via parent event
├── order/       — Purchase flow with atomic transactions and stock control
├── ticket/      — Ticket validation (QR code), usage tracking, listing
├── health/      — Health check endpoint (Prisma ping via @nestjs/terminus)
└── common/      — Shared filters (HTTP exception, Prisma exception)
```

## Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Install dependencies
yarn install

# 3. Start PostgreSQL
docker compose up -d

# 4. Generate Prisma client and apply migrations
npx prisma generate
npx prisma migrate deploy

# 5. Seed the database
npx prisma db seed

# 6. Start dev server
yarn start:dev
```

The API is available at `http://localhost:3000` and Swagger docs at `http://localhost:3000/api`.

## Seed Data

The seed creates:

| Entity | Data |
|--------|------|
| **Admin user** | `admin@email.com` / `123456` |
| **Organizer user** | `organizer@email.com` / `123456` |
| **Venue** | Maracanã (Rio de Janeiro) |
| **Event (PUBLISHED)** | Rock in Rio 2026 — 4 categories (Pista, VIP) |
| **Event (DRAFT)** | Lollapalooza 2026 |
| **Order + Tickets** | 2 Pista tickets for the admin user |

## API Endpoints

### Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/auth/register` | Public | Create account |
| `POST` | `/auth/signin` | Public | Sign in (returns JWT) |

### Venue

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/venue` | Bearer | Create venue |
| `GET` | `/venue` | Public | List venues (paginated) |
| `GET` | `/venue/:id` | Public | Get venue by ID |
| `PUT` | `/venue/:id` | Bearer | Update venue |
| `DELETE` | `/venue/:id` | Bearer | Delete venue |

### Event

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/event` | Bearer | Create event |
| `GET` | `/event` | Public | List events (paginated) |
| `GET` | `/event/:id` | Public | Get event by ID |
| `PUT` | `/event/:id` | Bearer | Update event |
| `PATCH` | `/event/:id/status` | Bearer | Update event status |
| `DELETE` | `/event/:id` | Bearer | Delete event |

### Category

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/event/:eventId/category` | Bearer | Create category |
| `GET` | `/event/:eventId/category` | Public | List categories |
| `GET` | `/event/:eventId/category/:id` | Public | Get category by ID |
| `PATCH` | `/event/:eventId/category/:id` | Bearer | Update category |
| `DELETE` | `/event/:eventId/category/:id` | Bearer | Delete category |

### Order

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/order` | Bearer | Create order (purchases tickets) |

### Ticket

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/ticket` | Bearer | List current user tickets |
| `GET` | `/ticket/:id` | Bearer | Get ticket by ID |
| `GET` | `/ticket/validate/:code` | Public | Validate ticket by QR code |
| `PATCH` | `/ticket/:id/use` | Bearer | Mark ticket as used |

## Authentication

All protected endpoints require a Bearer JWT token in the `Authorization` header.

```bash
# Example: signin
curl -X POST http://localhost:3000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@email.com", "password": "123456"}'

# Response: { "accessToken": "eyJhbGciOiJIUzI1NiIs..." }

# Example: list tickets
curl http://localhost:3000/ticket \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Docker / Podman

Both `docker compose` and `podman-compose` are supported.

**Development** — starts only PostgreSQL:

```bash
docker compose up -d
```

**Production** — builds and starts both PostgreSQL and the API:

```bash
docker compose -f compose.prod.yaml up -d --build
```

## Scripts

```bash
yarn start:dev       # Watch mode
yarn start:prod      # Production
yarn test            # Unit tests
yarn test:e2e        # E2E tests (requires running DB)
yarn test:cov        # Coverage report
yarn lint            # ESLint
npx prisma studio    # Database browser
npx prisma db seed   # Seed database
```

## License

UNLICENSED.
