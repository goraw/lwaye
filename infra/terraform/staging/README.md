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
- SSM parameters and Secrets Manager secrets used by the app runtime

## Inputs

Start by copying `terraform.tfvars.example` to `terraform.tfvars` and filling the sensitive values.

Required values:

- `db_password`
- `twilio_account_sid`
- `twilio_auth_token`
- `twilio_from_phone`
- `s3_access_key_id`
- `s3_secret_access_key`

## Apply flow

```powershell
cd infra/terraform/staging
terraform init
terraform plan -out staging.tfplan
terraform apply staging.tfplan
```

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

- populate the GitHub `staging` environment
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
- The S3 bucket is private by default.

