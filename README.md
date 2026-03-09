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

## SMS OTP

The API now supports provider-based OTP delivery.

Local development:
- default provider is `console`
- OTP codes are logged by the API and still returned in the response for the current demo clients

Production options:
- set `SMS_PROVIDER=twilio`
- configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_PHONE`
- in production, OTP codes are no longer returned in the response preview

If `NODE_ENV=production` and no SMS provider is configured, OTP start will fail instead of silently previewing codes.

## Next steps

1. Replace local image storage with object storage/CDN
2. Add push notifications, CI, migrations, and end-to-end tests
3. Add device-level QA for mobile buyer, seller, and admin flows
