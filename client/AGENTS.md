# AGENTS.md — Client (Nuxt SPA)

Customer/organizer/admin frontend for the Ticket Já API. **This is a standalone Yarn 4 project** — run all commands from `client/`, use `yarn` (never `npm`), and do not touch the NestJS backend at the repo root except to know it runs on `http://localhost:3000`.

## Commands

```bash
yarn install     # postinstall runs `nuxt prepare` (generates .nuxt/ types + tsconfig refs)
yarn dev         # SPA on http://localhost:5173, proxies /api and /docs to :3000
yarn build       # production build
yarn generate    # static SPA -> .output/public (used by the API's Docker build)
yarn typecheck   # vue-tsc via `nuxt typecheck`
yarn preview
```

- `yarn typecheck` (vue-tsc) is the only static check. There is **no lint or test script**. The codebase has a set of **pre-existing type errors** (mostly in `pages/` and a few components); when refactoring, compare the error set before/after rather than expecting a clean run. `yarn build` does not typecheck.
- `tsconfig.json` is only project references to `.nuxt/tsconfig.*`. Nothing typechecks without those, so run `yarn install`/`nuxt prepare` first on a fresh checkout.

## Framework conventions

- Nuxt 4 layout: all source lives under `client/app/`. Code is organized by domain/type:
  - `components/layout/` (`AppHeader`, `AppFooter`, `AdminSidebar`), `components/ui/` (shared primitives), `components/event/`, `components/venue/`, `components/order/`.
  - `composables/` holds infra (`useApi`, `useAuth`) at the root and data hooks in domain folders: `catalog/`, `events/`, `venues/`, `orders/`, `organizers/`, `payments/`.
  - `types/` splits shared DTOs (`api.ts`) from role-specific ones (`admin.ts`, `organizer.ts`) with an `index.ts` barrel.
  - `utils/` holds auto-imported helpers: `api.ts` (fetch client), `format.ts` (`formatDate`, `formatDateTime`, `formatPrice`, `formatDateTimeLocal`), `error.ts` (`getErrorMessage`).
- `ssr: false` — pure SPA. Do not add `server/` routes or rely on SSR-only APIs.
- Nuxt UI v4 + Tailwind v4. Global CSS is `app/assets/css/main.css` (imports `tailwindcss` + `@nuxt/ui` and defines brand tokens under `@theme`). Reuse `UButton`, `UInput`, `UFormField`, `useToast` (`#imports`) and existing `--color-brand-*` / font tokens instead of hardcoding styles. Components support `dark:` variants.
- Components are auto-imported by name. `nuxt.config.ts` sets `components: [{ path: '~/components', pathPrefix: false }]`, so component names ignore folder prefixes (keep filenames unique).
- Composables at the root of `app/composables/` and Pinia stores under `app/stores/` are auto-imported. **Subfolders of `composables/` are not scanned by default** — every domain folder is registered in `nuxt.config.ts` under `imports.dirs`; add a folder there when you create one. Pages do **not** import `useCreateOrderMutation`, `useApi`, `formatDate`, etc.
- Pinia stores use the setup style (`defineStore('x', () => { ... })`).
- The admin and organizer CRUD screens share thin page wrappers over `components/event/EventListPage.vue` / `EventFormPage.vue` and `components/venue/VenueListPage.vue` / `VenueFormPage.vue`; only `definePageMeta` (middleware) and `base-path` differ. Edit the shared component, not the page.

## API access

- Use `useApi()` (`app/composables/useApi.ts`) rather than raw `$fetch`. It wraps `$fetch` with the bearer token from the auth store, and on 401 clears the session and redirects to `/login`.
- Base URL is `runtimeConfig.public.apiBase` (default `/api`, override with `NUXT_PUBLIC_API_BASE`). In dev, `/api` is proxied to `http://localhost:3000/api` via `nitro.devProxy`.
- All request/response types live in `app/types/` (`api.ts` for shared entities, `admin.ts`/`organizer.ts` for role-specific payloads). Backend sends Prisma `Decimal` money fields as **strings** (e.g. `price`, `total`), but `CheckoutItem.unitPrice` is a `number` — mind the conversion.
- Data fetching uses `@tanstack/vue-query` (`useQuery`/`useMutation`), imported directly from `@tanstack/vue-query`. That package is **not** a direct dependency; it comes transitively from `@peterbud/nuxt-query`. Keep `@peterbud/nuxt-query` installed, and follow the existing composable-per-query pattern (`useEventsQuery`, `useMyOrdersQuery`, `useCreateOrderMutation`, …). Invalidate `['my-tickets']` / `['my-orders']` after order mutations. Note `useAsyncQuery` is **not** provided by `@peterbud/nuxt-query`; use `useQuery`-based composables instead.
- API errors expose `error.data.message` (string or string[]); use the shared `getErrorMessage` helper in `app/utils/error.ts`.
- Public catalog endpoints only expose published/global data: `GET /event` returns `PUBLISHED` events only and `GET /venue` returns all venues. The management screens use role-routed endpoints via `useAdminEventsQuery`/`useAdminVenuesQuery`/`useVenuesQuery`: `ADMIN` -> `/admin/events` + `/admin/venues`, `ORGANIZER` -> `/event/mine` + `/venue/mine` (own resources, all statuses). `GET /event` rejects a `status` param, so never send it there; empty filter params are stripped by `utils/api.ts`.

## Auth & routing

- `useAuthStore` persists `auth_token`, `auth_refresh_token`, `auth_user` cookies (7 days) and is restored in `app/app.vue`. `isAuthenticated` requires both token and user.
- Protect pages with `definePageMeta({ middleware: 'auth' })`; role gates are `admin` and `organizer` middleware (both redirect to `/login` or `/`). Layouts: `default` and `admin`.
- Checkout sends an `Idempotency-Key` header generated client-side; keep it stable per checkout attempt (`app/pages/checkout/index.vue`).

## Style

- UI-facing strings are **pt-BR** (pages named `cadastro`, `eventos`, `minha-conta`, `pedidos`, `organizador`); code identifiers, comments, and types are English. Match this split.
- Prettier defaults (no `.prettierrc` here): 2-space indent, single quotes, no semicolons. Note existing files are inconsistent — some use semicolons; follow the file you edit.

## Deployment note

Domain names `client`, but the repo's root `Dockerfile` builds it in a `client-builder` stage (`yarn generate`) and copies `.output/public` into the API image's `public/`, where NestJS serves it via `ServeStaticModule`. The API only serves the SPA if that `public/` directory exists.
