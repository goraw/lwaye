# Terraform staging

This directory owns the AWS staging infrastructure for Lwaye.

## What it creates

- VPC with 2 public and 2 private subnets
- Internet gateway and single NAT gateway
- ALB, target groups, and listener baseline
- ECS cluster
- ECR repositories for `lwaye-api` and `lwaye-admin`
- ECS execution role, API task role, admin task role, GitHub OIDC deploy role
- CloudWatch log groups
- S3 media bucket
- RDS PostgreSQL instance and subnet group
- SSM parameters used by the app runtime

## Inputs

Start by copying `terraform.tfvars.example` to `terraform.tfvars` and filling the sensitive values.

Required values:

- `db_password`

## Local apply flow

```powershell
cd infra/terraform/staging
terraform init
terraform plan -out staging.tfplan
terraform apply staging.tfplan
```

## GitHub Actions workflows

The repo now includes two manual workflows:

- `.github/workflows/terraform-staging-plan.yml`
- `.github/workflows/terraform-staging-apply.yml`

GitHub `staging` environment secret requirements:

- `AWS_GITHUB_ACTIONS_ROLE_ARN`
- `TF_VAR_DB_PASSWORD`

GitHub `staging` environment variable requirements:

- `AWS_REGION`
- `TF_VAR_PUBLIC_API_DOMAIN`

The workflows upload:

- `terraform-staging-plan` from the plan workflow
- `terraform-staging-outputs` from the apply workflow

## Important outputs

After apply, capture these outputs:

- `github_actions_role_arn`
- `aws_region`
- `ecr_api_repository`
- `ecr_admin_repository`
- `ecs_cluster_name`
- `ecs_private_subnet_ids`
- `ecs_security_group_id`
- `public_api_url`
- `staging_task_config`

Use them to:

- populate the GitHub `staging` environment for app deploys
- render `infra/aws/staging.config.json`
- keep the ECS task definition templates aligned with real infrastructure

To export the task config automatically:

```powershell
terraform output -json > outputs.json
npm run aws:export-staging-config
```

## Notes

- The stack intentionally creates the infrastructure baseline, not the ECS services themselves. The GitHub deploy workflow still owns image rollout and service updates.
- RDS is private and only reachable from the ECS security group.
- The S3 bucket is private by default and is accessed through the ECS task role, not static access keys.
- SMS delivery uses AWS SNS through the API task role.
