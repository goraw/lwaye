# Lwaye

Lwaye is a mobile-first marketplace MVP tailored for the Ethiopian market. This repository is organized as a monorepo with:

- `apps/api`: backend API for auth, listings, chat, favorites, reports, admin moderation, and PostgreSQL schema files
- `apps/mobile`: React Native app skeleton for buyers and sellers
- `apps/admin`: web admin console for moderation and taxonomy management
- `packages/shared`: shared marketplace types, localization strings, and Addis Ababa seed metadata

## Intended stack

- React Native + TypeScript for mobile
- Node.js + TypeScript backend
- PostgreSQL-backed API persistence
- Lightweight React admin UI

## Database

The PostgreSQL schema is in `apps/api/db/schema.sql`, with starter seed data in `apps/api/db/seed.sql` and local Docker setup in `docker-compose.yml`.

Example setup flow:

1. Start Docker Desktop
2. Run `npm run db:up` to boot Postgres
3. Run `npm run db:init` to apply schema and seed data
4. Run `npm run db:reset` to recreate the local database volume when you need a clean state
5. Start the API with `DATABASE_URL=postgres://lwaye:lwaye@127.0.0.1:5432/lwaye` or rely on that same local default

The bootstrap scripts run SQL through the Docker container, so local `psql` is not required.

## Next steps

1. Wire mobile and admin clients to the live API instead of shared seed data
2. Replace mock OTP handling with a real provider and secure code hashing
3. Add object storage, push notifications, CI, migrations, and end-to-end tests

