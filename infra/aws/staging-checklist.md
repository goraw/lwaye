# Staging checklist

Use this checklist to prepare the first `staging` deployment.

## 1. Create core AWS resources

- Create an ECR repository for `lwaye-api`
- Create an ECR repository for `lwaye-admin`
- Create an ECS cluster for staging, for example `lwaye-staging`
- Create an RDS PostgreSQL instance or cluster reachable from ECS
- Create an S3 bucket for listing images
- Create CloudWatch log groups:
  - `/ecs/lwaye-api-staging`
  - `/ecs/lwaye-admin-staging`
  - `/ecs/lwaye-migrate-staging`
- Create or identify private subnets for ECS tasks
- Create security groups for:
  - `api` tasks
  - `admin` tasks or ALB target
  - `migrate` task access to Postgres
  - RDS inbound from ECS
- Create an ALB and listeners for the public API and admin endpoints

## 2. Create IAM roles

- ECS task execution role for pulling from ECR and writing logs
- API task role with access to SSM, S3, and SNS publish
- Admin task role if needed
- GitHub OIDC deploy role with permission to:
  - push to ECR
  - register task definitions
  - update ECS services
  - run ECS tasks
  - pass the ECS roles above

## 3. Store runtime configuration

Put these in SSM Parameter Store:

- `DATABASE_URL`
- `S3_BUCKET`
- `S3_REGION`
- `S3_PUBLIC_BASE_URL`

## 4. Update committed templates

Edit these files with staging values:

- `infra/aws/ecs/api-task-definition.json`
- `infra/aws/ecs/admin-task-definition.json`
- `infra/aws/ecs/migrate-task-definition.json`

Replace:

- placeholder account IDs
- region values
- execution/task role ARNs
- CloudWatch log group names
- SSM ARNs

## 5. Configure GitHub `staging` environment

Add the secret and variables documented in `infra/aws/github-environment.md`.

## 6. Bootstrap ECS services

Before using the GitHub workflow, create the initial ECS services once:

- `lwaye-api-staging`
- `lwaye-admin-staging`

After that, the GitHub Actions workflow can update them in place.

## 7. First deploy

1. Push the task definition changes.
2. Trigger `Deploy AWS`.
3. Choose `staging`.
4. Leave `run_migrations=true`.
5. Verify:
   - API health endpoint responds
   - admin app loads
   - migration task exits successfully
   - ECS services stabilize
