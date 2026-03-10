provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "lwaye"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
