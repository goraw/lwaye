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

The PostgreSQL migration source of truth is in `apps/api/db/migrations`, with a current schema snapshot in `apps/api/db/schema.sql`, seed data in `apps/api/db/seed.sql`, and local Docker setup in `docker-compose.yml`.

Example setup flow:

1. Start Docker Desktop
2. Run `npm run db:up` to boot Postgres
3. Run `npm run db:migrate` to apply unapplied schema changes
4. Run `npm run db:init` to rebuild the local schema from migrations and apply seed data
5. Run `npm run db:reset` to recreate the local database volume when you need a clean state
6. Start the API with `DATABASE_URL=postgres://lwaye:lwaye@127.0.0.1:5432/lwaye` or rely on that same local default

The bootstrap scripts run SQL through the Docker container, so local `psql` is not required.

## Environment

Each app now ships with an environment template:

- `apps/api/.env.example`
- `apps/admin/.env.example`
- `apps/mobile/.env.example`

The API centralizes runtime config validation in `apps/api/src/config.ts`. At startup it now fails fast for invalid production settings, including:

- missing SNS region configuration when `SMS_PROVIDER=sns`
- missing S3 credentials when `STORAGE_PROVIDER=s3`
- missing SMS configuration in production
- invalid `PORT`

For local development, the intended defaults remain:

- API database: `postgres://lwaye:lwaye@127.0.0.1:5432/lwaye`
- admin API base URL: `http://127.0.0.1:4000`
- mobile API base URL: `http://10.0.2.2:4000` for Android emulators

## SMS OTP

The API now supports provider-based OTP delivery.

Local development:
- default provider is `console`
- OTP codes are logged by the API and still returned in the response for the current demo clients

Production option:
- set `SMS_PROVIDER=sns`
- configure `SNS_REGION` or `AWS_REGION`
- optional: set `SNS_SENDER_ID` and `SNS_SMS_TYPE`
- grant `sns:Publish` to the API task role

If `NODE_ENV=production` and no SMS provider is configured, OTP start will fail instead of silently previewing codes.

## Image storage

The API now supports provider-based image storage.

Local development:
- default provider is `local`
- uploaded files are written to `apps/api/uploads`
- the API serves them from `/uploads/...`

Production object storage:
- set `STORAGE_PROVIDER=s3`
- configure `S3_BUCKET`, `S3_REGION`, and `S3_PUBLIC_BASE_URL`
- on AWS, prefer IAM role-based S3 access instead of static access keys
- optional: `S3_ENDPOINT` and `S3_FORCE_PATH_STYLE=true` for S3-compatible providers such as Cloudflare R2 or MinIO

## Push notifications

The API supports provider-based push delivery.

Local development:
- default provider is `console`
- push events are logged by the API

Production option:
- set `PUSH_PROVIDER=expo`
- set `EXPO_PUBLIC_EAS_PROJECT_ID` in `apps/mobile/.env`

## Deployment

Deployment artifacts are now included for the backend and admin apps:

- `apps/api/Dockerfile`
- `apps/admin/Dockerfile`
- `docker-compose.production.yml`
- `docs/deployment.md`
- `infra/aws/README.md`
- `infra/terraform/staging`
- `.github/workflows/deploy-aws.yml`
- `.github/workflows/terraform-staging-plan.yml``r`n- `.github/workflows/terraform-staging-apply.yml`

The local production compose example includes Postgres, a portable migration job, the API service, and the admin service. It uses `apps/api/.env.example` as a checked-in baseline; replace those defaults with secure deployment env values before real rollout. For AWS, Terraform is now the source of truth for staging infrastructure, with one workflow for Terraform and a separate workflow for application deployment and ECS rollout.

## Next steps

1. Apply Terraform and create the first staging environment
2. Add device-level QA for mobile buyer, seller, and admin flows
3. Expand server-side blocking and moderation tooling


