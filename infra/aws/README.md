# AWS deployment

This repository now includes an AWS deployment path built around ECR and ECS Fargate.

## Included files

- `.github/workflows/deploy-aws.yml`
- `infra/aws/ecs/api-task-definition.json`
- `infra/aws/ecs/admin-task-definition.json`
- `infra/aws/ecs/migrate-task-definition.json`

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
- SSM Parameter Store and Secrets Manager for runtime configuration
- CloudWatch Logs for task logs
- ALB in front of ECS services

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

Expected value formats:

- `AWS_ECS_SUBNETS`: comma-separated subnet IDs, for example `subnet-aaa,subnet-bbb`
- `AWS_ECS_SECURITY_GROUPS`: comma-separated security group IDs, for example `sg-aaa,sg-bbb`
- `AWS_ECS_ASSIGN_PUBLIC_IP`: `ENABLED` or `DISABLED`

## Required AWS IAM access

The GitHub OIDC role should be allowed to:

- push images to the target ECR repositories
- register ECS task definitions
- update ECS services
- run one-off ECS tasks for migrations
- pass the ECS execution and task roles referenced by the task definitions

## Task definition templates

The committed task definition JSON files are templates. Before the first deployment, replace the placeholder role ARNs, region values, log groups, and secret/parameter ARNs with the real environment values.

## Deploy flow

1. Trigger `Deploy AWS` from GitHub Actions.
2. Choose `staging` or `production`.
3. Leave `run_migrations=true` unless you intentionally want an image-only rollout.
4. The workflow builds and pushes the `api` and `admin` images to ECR.
5. The workflow optionally runs the migration task, then deploys the ECS services.
