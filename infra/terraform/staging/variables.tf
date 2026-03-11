variable "aws_region" {
  description = "AWS region for the staging environment."
  type        = string
  default     = "us-east-2"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "staging"
}

variable "github_repository" {
  description = "GitHub repository in owner/name format for OIDC trust."
  type        = string
  default     = "goraw/lwaye"
}

variable "vpc_cidr" {
  description = "CIDR block for the staging VPC."
  type        = string
  default     = "10.40.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Two public subnet CIDR blocks."
  type        = list(string)
  default     = ["10.40.0.0/20", "10.40.16.0/20"]
}

variable "private_subnet_cidrs" {
  description = "Two private subnet CIDR blocks."
  type        = list(string)
  default     = ["10.40.128.0/20", "10.40.144.0/20"]
}

variable "db_instance_class" {
  description = "RDS instance class for staging."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB for staging Postgres."
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "lwaye"
}

variable "db_username" {
  description = "Initial database master username."
  type        = string
  default     = "lwaye_admin"
}

variable "db_password" {
  description = "Initial database master password."
  type        = string
  sensitive   = true
}

variable "public_api_domain" {
  description = "Public API base URL for admin builds."
  type        = string
  default     = "https://api-staging.lwaye.com"
}
