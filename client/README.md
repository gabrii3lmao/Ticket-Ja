# Ticket Já — Client

Nuxt 4 SPA (customer/organizer/admin frontend) for the Ticket Já API. It is a standalone Yarn 4 project under `client/`; the NestJS API lives at the repo root and runs on `http://localhost:3000`.

See `AGENTS.md` for the full architecture and conventions.

## Commands

```bash
yarn install     # installs deps; postinstall runs `nuxt prepare`
yarn dev         # dev server on http://localhost:5173 (proxies /api and /docs to :3000)
yarn build       # production build
yarn generate    # static SPA -> .output/public (used by the API's Docker image)
yarn typecheck   # vue-tsc type checking
yarn preview     # preview a production build
```

## Structure

```
app/
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

Domain folders under `composables/` are registered in `nuxt.config.ts` (`imports.dirs`) and components use `pathPrefix: false`, so names stay flat and auto-imported. The admin/organizer CRUD pages are thin wrappers over shared page components in `components/event/` and `components/venue/`.
