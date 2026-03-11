# GitHub environment map

Create a GitHub environment named `staging` and set these values.

## Secret

- `AWS_GITHUB_ACTIONS_ROLE_ARN`
  - Example: `arn:aws:iam::128055990601:role/github-actions-lwaye-staging-deploy`

## Variables

- `AWS_REGION`
  - Example: `us-east-2`
- `AWS_ECR_API_REPOSITORY`
  - Example: `lwaye-api`
- `AWS_ECR_ADMIN_REPOSITORY`
  - Example: `lwaye-admin`
- `AWS_PUBLIC_API_URL`
  - Example: `https://api-staging.lwaye.com`
- `AWS_ECS_CLUSTER`
  - Example: `lwaye-staging`
- `AWS_ECS_API_SERVICE`
  - Example: `lwaye-api-staging`
- `AWS_ECS_ADMIN_SERVICE`
  - Example: `lwaye-admin-staging`
- `AWS_ECS_SUBNETS`
  - Example: `subnet-aaa,subnet-bbb`
- `AWS_ECS_SECURITY_GROUPS`
  - Example: `sg-aaa,sg-bbb`
- `AWS_ECS_ASSIGN_PUBLIC_IP`
  - Example: `DISABLED`

## Notes

- `AWS_PUBLIC_API_URL` is injected into the admin image build, so it must be the public API URL the browser can reach.
- `AWS_ECS_SUBNETS` and `AWS_ECS_SECURITY_GROUPS` are used by the migration task as well as service updates.
- If your API and admin services need different security groups, split the workflow later. For the first staging deployment, a shared ECS security group is the simplest path.
- The API task role should include `sns:Publish` and S3 access through IAM because no static S3 credentials are used.
