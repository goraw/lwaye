# Deployment

This repository now includes container build targets for the API and admin apps, plus a production-oriented Docker Compose example.

## Artifacts

- `apps/api/Dockerfile`: Node-based API container
- `apps/admin/Dockerfile`: Vite build + Nginx static hosting for the admin app
- `docker-compose.production.yml`: example production topology for Postgres, migration job, API, and admin

## Environment

Start from these templates:

- `apps/api/.env.example`
- `apps/admin/.env.example`
- `apps/mobile/.env.example`

The production Compose example reads `apps/api/.env.example` as a baseline. Before a real deployment, replace those defaults with secure environment injection or a private `.env` file outside source control.

## Deploy flow

1. Build and start Postgres:
   - `docker compose -f docker-compose.production.yml up -d postgres`
2. Apply migrations:
   - `docker compose -f docker-compose.production.yml run --rm migrate`
3. Start the API and admin services:
   - `docker compose -f docker-compose.production.yml up -d api admin`
4. Verify health:
   - API: `GET /health`
   - Admin: open port `8080`

## Notes

- The API container currently runs through `tsx` so it can consume the workspace-local shared package without a separate packaging step.
- The admin build injects `VITE_API_URL` at image build time.
- The production Compose file is an example baseline, not a complete hardened production stack. For a real deployment, terminate TLS at a reverse proxy or load balancer, store secrets outside the repo, and use managed Postgres backups.
