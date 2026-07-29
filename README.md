# Ticket-Já API

RESTful API for event ticket sales built with **NestJS 11**, **Prisma 7** and **PostgreSQL 15**.

## Tech Stack

- **Runtime:** Node.js + TypeScript (ES2023)
- **Framework:** NestJS with modular architecture
- **ORM:** Prisma 7 with native PostgreSQL adapter (`@prisma/adapter-pg`)
- **Auth:** JWT via passport-jwt (global guard with `@Public()` bypass)
- **Validation:** class-validator + class-transformer (whitelist + transform enabled)
- **API Docs:** Swagger/OpenAPI at `/api`
- **Testing:** Jest 30 (unit) + Supertest 7 (e2e)
- **Lint/Format:** ESLint 9 (flat config) + Prettier 3
- **Container:** Docker multi-stage + Docker Compose (dev: PostgreSQL only, prod: API + DB)

## Project structure

```
src/
├── auth/        — Authentication (register, signin, account delete, JWT strategy)
├── user/        — User management (create, findByEmail, delete)
├── event/       — Event CRUD with ownership, pagination, filters and sorting
├── venue/       — Venue CRUD with ownership, pagination, filters and sorting
├── category/    — Category CRUD with ownership check via parent event
├── health/      — Health check endpoint (Prisma ping via @nestjs/terminus)
└── common/      — Shared filters (HTTP exception, Prisma exception)
```

## Quick start

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

# 5. Start dev server (watch mode)
yarn start:dev
```

The API is available at `http://localhost:3000` and Swagger docs at `http://localhost:3000/api`.

## Docker / Podman

Both `docker compose` and `podman-compose` are supported.

**Development** — starts only PostgreSQL. The API runs on the host via `yarn start:dev`.

```bash
# Docker
docker compose up -d

# Podman
podman-compose up -d
```

**Production** — builds and starts both PostgreSQL and the API.

```bash
# Docker
docker compose -f compose.prod.yaml up -d --build

# Podman
podman-compose -f compose.prod.yaml up -d --build
```

**Stop containers:**

```bash
docker compose down
# or
podman-compose down
```

> The `.env` file contains `DATABASE_URL` pointing to `localhost:5432` for local development. In production, `compose.prod.yaml` overrides it to point to the `db` container inside the Docker network.

## Scripts

```bash
yarn start:dev      # Watch mode
yarn start:prod     # Production
yarn test           # Unit tests
yarn test:e2e       # E2E tests
yarn test:cov       # Coverage
yarn lint           # ESLint
npx prisma studio   # DB browser
```
