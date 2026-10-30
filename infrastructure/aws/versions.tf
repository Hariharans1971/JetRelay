terraform {
  required_version = ">= 1.10, < 2.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {}
}
provider "aws" {
  region = var.region
  default_tags { tags = { Project = "AeroShare", Environment = var.environment, ManagedBy = "Terraform" } }
}
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" { state = "available" }
locals {
  name = "aeroshare-${var.environment}"
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
  prefix = "${local.name}-${data.aws_caller_identity.current.account_id}"
}
resource "terraform_data" "approval" {
  lifecycle {
    precondition {
      condition = startswith(var.refresh_image, "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com/")
      error_message = "The scheduled job image must belong to the selected client account and region."
    }
    precondition {
      condition = var.approved_monthly_budget_usd >= 325 && length(var.cost_approval_reference) > 5
      error_message = "Do not provision paid resources before an approved cost plan. Supply the approved budget and approval record only after client approval. Budget alerts do not cap spending."
    }
  }
}
