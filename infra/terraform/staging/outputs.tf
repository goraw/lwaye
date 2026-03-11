output "aws_region" {
  value = var.aws_region
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "ecr_api_repository" {
  value = aws_ecr_repository.api.name
}

output "ecr_admin_repository" {
  value = aws_ecr_repository.admin.name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "ecs_api_service_name" {
  value = "lwaye-api-${var.environment}"
}

output "ecs_admin_service_name" {
  value = "lwaye-admin-${var.environment}"
}

output "ecs_private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
}

output "public_api_url" {
  value = var.public_api_domain
}

output "rds_endpoint" {
  value = aws_db_instance.this.address
}

output "media_bucket_name" {
  value = aws_s3_bucket.media.bucket
}

output "staging_task_config" {
  value = {
    environment      = var.environment
    region           = var.aws_region
    executionRoleArn = aws_iam_role.ecs_execution.arn
    apiTaskRoleArn   = aws_iam_role.api_task.arn
    adminTaskRoleArn = aws_iam_role.admin_task.arn
    logGroups = {
      api     = aws_cloudwatch_log_group.api.name
      admin   = aws_cloudwatch_log_group.admin.name
      migrate = aws_cloudwatch_log_group.migrate.name
    }
    parameters = {
      databaseUrl       = aws_ssm_parameter.database_url.arn
      s3Bucket          = aws_ssm_parameter.s3_bucket.arn
      s3Region          = aws_ssm_parameter.s3_region.arn
      s3AccessKeyId     = aws_secretsmanager_secret.s3_access_key_id.arn
      s3SecretAccessKey = aws_secretsmanager_secret.s3_secret_access_key.arn
      s3PublicBaseUrl   = aws_ssm_parameter.s3_public_base_url.arn
    }
  }
  sensitive = true
}
