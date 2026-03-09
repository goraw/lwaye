# Deployment

This repository now includes container build targets for the API and admin apps, plus deployment paths for local containers and AWS ECS.

## Artifacts

- `apps/api/Dockerfile`: Node-based API container
- `apps/admin/Dockerfile`: Vite build + Nginx static hosting for the admin app
- `docker-compose.production.yml`: example production topology for Postgres, migration job, API, and admin
- `infra/aws/README.md`: AWS-specific deployment setup and GitHub environment requirements
- `.github/workflows/deploy-aws.yml`: GitHub Actions workflow for ECR + ECS deployment

## Environment

Start from these templates:

- `apps/api/.env.example`
- `apps/admin/.env.example`
- `apps/mobile/.env.example`

The production Compose example reads `apps/api/.env.example` as a baseline. Before a real deployment, replace those defaults with secure environment injection or a private `.env` file outside source control.

## Local container deploy flow

1. Build and start Postgres:
   - `docker compose -f docker-compose.production.yml up -d postgres`
2. Apply migrations:
   - `docker compose -f docker-compose.production.yml run --rm migrate`
3. Start the API and admin services:
   - `docker compose -f docker-compose.production.yml up -d api admin`
4. Verify health:
   - API: `GET /health`
   - Admin: open port `8080`

## AWS deploy flow

1. Provision the AWS resources described in `infra/aws/README.md`.
2. Populate the GitHub environment variables and secret expected by `.github/workflows/deploy-aws.yml`.
3. Update the ECS task definition templates in `infra/aws/ecs` with real role, log, region, and parameter ARNs.
4. Run the `Deploy AWS` workflow from GitHub Actions.

## Notes

- The API container currently runs through `tsx` so it can consume the workspace-local shared package without a separate packaging step.
- The admin build injects `VITE_API_URL` at image build time.
- The AWS workflow uses GitHub OIDC plus `aws-actions/configure-aws-credentials`, `aws-actions/amazon-ecr-login`, `aws-actions/amazon-ecs-render-task-definition`, and `aws-actions/amazon-ecs-deploy-task-definition`.
- The deployment files are an operational baseline, not a full production platform. You still need TLS termination, backup policy, secret rotation, monitoring, and environment-specific infrastructure choices.
