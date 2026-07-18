# Ticket-Já API

## Docker / Podman

This project includes two Docker Compose files for different scenarios.

### Files

- **`compose.yaml`** — Development: runs only the **PostgreSQL 15** database. The API runs directly on the host via `yarn start:dev`, connecting to `localhost:5432` (as configured in `.env`).
- **`compose.prod.yaml`** — Production: runs **PostgreSQL 15** + the **NestJS API** built from the `production` target in the `Dockerfile`. The `DATABASE_URL` is overridden to point to the `db` container.

### Usage

**Development** (database only):

```bash
docker compose up -d
```

Or with Podman:

```bash
podman-compose up -d
```

**Production** (database + API):

```bash
docker compose -f compose.prod.yaml up -d --build
```

Or with Podman:

```bash
podman-compose -f compose.prod.yaml up -d --build
```

**Stop containers:**

```bash
docker compose down
docker compose -f compose.prod.yaml down
```

> The `.env` file already contains `DATABASE_URL` for local development with the dev compose database. In production, `compose.prod.yaml` sets `DATABASE_URL` to point to the `db` service inside the Docker network.

## Project setup

```bash
yarn install
```

## Database

This project uses **Prisma 7** with **PostgreSQL 15**.

### Migrations

```bash
# Generate Prisma client
npx prisma generate

# Apply pending migrations
npx prisma migrate deploy

# Create a new migration after schema changes
npx prisma migrate dev --name describe_your_change
```

### Seed

Populates the database with initial data (admin user + sample events):

```bash
npx prisma db seed
```

The seed creates:
| User | Email | Password |
|---|---|---|
| Admin | `admin@email.com` | `123456` |

And two sample events linked to the admin user.

## Compile and run the project

```bash
# development
yarn run start

# watch mode
yarn run start:dev

# production mode
yarn run start:prod
```

## Run tests

```bash
# unit tests
yarn run test

# e2e tests
yarn run test:e2e

# test coverage
yarn run test:cov
```
