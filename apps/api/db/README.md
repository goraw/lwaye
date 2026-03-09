# Database Schema

The current PostgreSQL database definition lives in two forms:

- `apps/api/db/migrations/`: source of truth for incremental schema changes
- `apps/api/db/schema.sql`: snapshot of the latest full schema

## Coverage

The schema maps directly to the marketplace API and shared types:

- `users`, `phone_verifications`, `sessions`, `profiles`
- `categories`, `locations`
- `listings`, `listing_images`, `favorites`
- `chat_threads`, `messages`
- `reports`, `moderation_actions`

## Why migrations exist

Migrations let existing environments move forward safely without dropping data. New schema changes should be added as a new numbered SQL file in `apps/api/db/migrations/` instead of editing production databases manually.

## Local workflow

- `npm run db:up`: start Postgres in Docker
- `npm run db:migrate`: apply unapplied migrations only
- `npm run db:init`: rebuild `public`, apply all migrations, then apply seed data
- `npm run db:reset`: recreate the Docker volume and rerun `db:init`

## Applying manually

If you need to inspect or apply SQL by hand, point `DATABASE_URL` at the Docker Postgres instance and use `psql` against the migration files in order.
