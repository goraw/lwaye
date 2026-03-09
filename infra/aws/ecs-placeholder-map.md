# ECS placeholder map

This map shows what each placeholder area in the ECS task definition templates should point to in staging.

## Common replacements

- `arn:aws:iam::123456789012:role/lwaye-ecs-execution-role`
  - Replace with the staging ECS task execution role ARN
- `us-east-1`
  - Replace with your staging AWS region
- `/ecs/lwaye-*`
  - Replace with your staging CloudWatch log groups

## API task definition

File: `infra/aws/ecs/api-task-definition.json`

Replace these secret references with staging values:

- `DATABASE_URL`
  - SSM parameter or secret holding the RDS connection string
- `TWILIO_ACCOUNT_SID`
  - SSM parameter
- `TWILIO_AUTH_TOKEN`
  - Secrets Manager secret
- `TWILIO_FROM_PHONE`
  - SSM parameter
- `S3_BUCKET`
  - SSM parameter
- `S3_REGION`
  - SSM parameter
- `S3_ACCESS_KEY_ID`
  - Secrets Manager secret
- `S3_SECRET_ACCESS_KEY`
  - Secrets Manager secret
- `S3_PUBLIC_BASE_URL`
  - SSM parameter

## Admin task definition

File: `infra/aws/ecs/admin-task-definition.json`

Replace:

- execution role ARN
- admin task role ARN
- region in the log configuration
- log group name

## Migration task definition

File: `infra/aws/ecs/migrate-task-definition.json`

Use the same secret and parameter sources as the API task definition. The migration task should use the same API task role unless you intentionally split database access from runtime access.
