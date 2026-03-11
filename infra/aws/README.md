# AWS deployment

This repository now includes an AWS deployment path built around ECR and ECS Fargate.

## Preferred infrastructure path

Use Terraform in `infra/terraform/staging` as the source of truth for staging infrastructure. The older ECS JSON and staging config files remain useful for deploy-time task definition rendering, but the underlying AWS resources should be created and updated through Terraform.

## Included files

- `.github/workflows/deploy-aws.yml`
- `infra/aws/ecs/api-task-definition.json`
- `infra/aws/ecs/admin-task-definition.json`
- `infra/aws/ecs/migrate-task-definition.json`
- `infra/aws/staging-checklist.md`
- `infra/aws/github-environment.md`
- `infra/aws/ecs-placeholder-map.md`
- `infra/aws/staging.config.example.json`
- `infra/aws/render-task-definitions.mjs`
- `infra/terraform/staging`

## Recommended AWS shape

- ECR repositories:
  - `lwaye-api`
  - `lwaye-admin`
- ECS Fargate:
  - one cluster for the environment
  - one service for `api`
  - one service for `admin`
  - one standalone task definition for `migrate`
- RDS PostgreSQL for application data
- S3-compatible object storage for listing images
- AWS SNS for OTP SMS delivery
- SSM Parameter Store and Secrets Manager for runtime configuration
- CloudWatch Logs for task logs
- ALB in front of ECS services

## Terraform apply flow

1. Copy `infra/terraform/staging/terraform.tfvars.example` to `infra/terraform/staging/terraform.tfvars`.
2. Fill the sensitive values.
3. Run Terraform from `infra/terraform/staging`.
4. Capture the outputs and use them to populate GitHub `staging` environment variables.
5. Export `staging_task_config` into `infra/aws/staging.config.json` with the Terraform exporter.

## GitHub environment setup

Create GitHub environments such as `staging` and `production`, then define these values per environment.

Environment secret:

- `AWS_GITHUB_ACTIONS_ROLE_ARN`

Environment variables:

- `AWS_REGION`
- `AWS_ECR_API_REPOSITORY`
- `AWS_ECR_ADMIN_REPOSITORY`
- `AWS_PUBLIC_API_URL`
- `AWS_ECS_CLUSTER`
- `AWS_ECS_API_SERVICE`
- `AWS_ECS_ADMIN_SERVICE`
- `AWS_ECS_SUBNETS`
- `AWS_ECS_SECURITY_GROUPS`
- `AWS_ECS_ASSIGN_PUBLIC_IP`

For a concrete staging setup, use:

- `infra/terraform/staging/README.md`
- `infra/aws/staging-checklist.md`
- `infra/aws/github-environment.md`
- `infra/aws/ecs-placeholder-map.md`

## Deploy flow

1. Apply Terraform for staging.
2. Generate concrete staging task definitions.
3. Trigger `Deploy AWS` from GitHub Actions.
4. Choose `staging` or `production`.
5. Leave `run_migrations=true` unless you intentionally want an image-only rollout.
6. The workflow builds and pushes the `api` and `admin` images to ECR.
7. The workflow optionally runs the migration task, then deploys the ECS services.
