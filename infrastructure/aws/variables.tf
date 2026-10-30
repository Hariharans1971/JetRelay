variable "region" { type = string
 default = "ap-south-1" }
variable "environment" {
  type = string
  default = "staging"
  validation { condition = contains(["staging", "production"], var.environment)
 error_message = "Use separate staging and production deployments/accounts." }
}
variable "approved_monthly_budget_usd" { type = number
 default = 0 }
variable "cost_approval_reference" { type = string
 default = "" }
variable "refresh_image" {
  type = string
  description = "Immutable ECR image URI pinned by sha256 digest
 build the supplied reference-refresh Dockerfile."
  validation { condition = can(regex("^[0-9]{12}\\.dkr\\.ecr\\.[a-z0-9-]+\\.amazonaws\\.com/.+@sha256:[a-f0-9]{64}$", var.refresh_image))
 error_message = "Use a client-owned ECR image pinned by digest." }
}
variable "alarm_sns_topic_arn" { type = string
 default = null
 nullable = true }
