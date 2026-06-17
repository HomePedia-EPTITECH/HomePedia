output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "ecs_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs_tasks.id
}

output "ecs_task_definition_arns" {
  value = { for k, v in aws_ecs_task_definition.jobs : k => v.arn }
}

output "ecr_repository_url" {
  value = aws_ecr_repository.jobs.repository_url
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.address
}

output "s3_bucket_name" {
  value = aws_s3_bucket.data.bucket
}

output "app_secret_arn" {
  value = aws_secretsmanager_secret.app.arn
}
