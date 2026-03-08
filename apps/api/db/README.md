# Database Schema

`apps/api/db/schema.sql` defines the PostgreSQL schema for the current Lwaye MVP scaffold.

## Coverage

The schema maps directly to the in-memory API store and shared types:

- `users`, `phone_verifications`, `profiles`
- `categories`, `locations`
- `listings`, `listing_images`, `favorites`
- `chat_threads`, `messages`
- `reports`, `moderation_actions`

## Design decisions

- Primary keys are `TEXT` so the database accepts the current prefixed IDs used by the scaffold (`usr-*`, `lst-*`, `thr-*`).
- Enumerated types mirror the TypeScript unions in `packages/shared/src/types.ts`.
- Listing search uses a generated `tsvector` column plus a trigram index on `title` to support MVP keyword search with PostgreSQL only.
- `chat_threads` enforces one buyer thread per listing with `UNIQUE (listing_id, buyer_id)`.
- `favorites` enforces one saved listing per user with `UNIQUE (listing_id, user_id)`.
- `reports` keep a polymorphic `target_type` + `target_id` pair rather than foreign keys because a report can target a listing, user, or message.

## Applying locally

Example with `psql`:

```powershell
psql $env:DATABASE_URL -f apps/api/db/schema.sql
psql $env:DATABASE_URL -f apps/api/db/seed.sql
```

If you run PostgreSQL via Docker, point `DATABASE_URL` at that container before applying the files.
