# Lwaye

Lwaye is a mobile-first marketplace MVP tailored for the Ethiopian market. This repository is organized as a monorepo with:

- `apps/api`: backend API for auth, listings, chat, favorites, reports, admin moderation, and PostgreSQL schema files
- `apps/mobile`: React Native app skeleton for buyers and sellers
- `apps/admin`: web admin console for moderation and taxonomy management
- `packages/shared`: shared marketplace types, localization strings, and Addis Ababa seed metadata

## Intended stack

- React Native + TypeScript for mobile
- Node.js + TypeScript backend
- PostgreSQL-compatible domain model, currently scaffolded with in-memory repositories
- Lightweight React admin UI

## Database

The first PostgreSQL schema is in `apps/api/db/schema.sql`, with starter seed data in `apps/api/db/seed.sql` and local Docker setup in `docker-compose.yml`.

Example setup flow:

1. Start Postgres with `docker compose up -d postgres`
2. Apply `apps/api/db/schema.sql`
3. Apply `apps/api/db/seed.sql`
4. Replace the in-memory API store with database-backed repositories

## Next steps

1. Replace in-memory repositories with PostgreSQL persistence
2. Wire OTP, object storage, push notifications, and real auth
3. Add CI, migrations, and end-to-end tests
