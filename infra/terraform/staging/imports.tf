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
  to = aws_iam_role_policy_attachment.ecs_execution_managed
  id = "lwaye-ecs-execution-role-staging/arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

import {
  to = aws_lb.this
  id = "arn:aws:elasticloadbalancing:us-east-2:128055990601:loadbalancer/app/lwaye-staging-alb/9f36f8f7dd2efa52"
}

import {
  to = aws_lb_target_group.api
  id = "arn:aws:elasticloadbalancing:us-east-2:128055990601:targetgroup/lwaye-staging-api-tg/e41ea72b63e8be70"
}

import {
  to = aws_lb_target_group.admin
  id = "arn:aws:elasticloadbalancing:us-east-2:128055990601:targetgroup/lwaye-staging-admin-tg/154f0361fe5de1b4"
}
