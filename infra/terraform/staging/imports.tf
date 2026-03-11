import {
  to = aws_ecr_repository.api
  id = "lwaye-api"
}

import {
  to = aws_ecr_repository.admin
  id = "lwaye-admin"
}

import {
  to = aws_s3_bucket.media
  id = "lwaye-staging-media-us-east-2"
}

import {
  to = aws_cloudwatch_log_group.api
  id = "/ecs/lwaye-api-staging"
}

import {
  to = aws_cloudwatch_log_group.admin
  id = "/ecs/lwaye-admin-staging"
}

import {
  to = aws_cloudwatch_log_group.migrate
  id = "/ecs/lwaye-migrate-staging"
}

import {
  to = aws_iam_role.ecs_execution
  id = "lwaye-ecs-execution-role-staging"
}

import {
  to = aws_iam_role.api_task
  id = "lwaye-api-task-role-staging"
}

import {
  to = aws_iam_role.admin_task
  id = "lwaye-admin-task-role-staging"
}

import {
  to = aws_iam_role.github_deploy
  id = "github-actions-lwaye-staging-deploy"
}

import {
  to = aws_iam_openid_connect_provider.github
  id = "arn:aws:iam::128055990601:oidc-provider/token.actions.githubusercontent.com"
}

import {
  to = aws_db_subnet_group.this
  id = "lwaye-staging-db-subnet-group"
}

import {
  to = aws_iam_role_policy_attachment.ecs_execution_managed
  id = "lwaye-ecs-execution-role-staging/arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
