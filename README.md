# Lwaye

Lwaye is a mobile-first marketplace MVP tailored for the Ethiopian market. This repository is organized as a monorepo with:

- `apps/api`: backend API for auth, listings, chat, favorites, reports, and admin moderation
- `apps/mobile`: React Native app skeleton for buyers and sellers
- `apps/admin`: web admin console for moderation and taxonomy management
- `packages/shared`: shared marketplace types, localization strings, and Addis Ababa seed metadata

## Intended stack

- React Native + TypeScript for mobile
- Node.js + TypeScript backend
- PostgreSQL-compatible domain model, currently scaffolded with in-memory repositories
- Lightweight React admin UI

## Next steps

1. Install dependencies with `npm.cmd install`
2. Replace in-memory repositories with PostgreSQL persistence
3. Wire OTP, object storage, push notifications, and real auth
4. Add CI, migrations, and end-to-end tests
