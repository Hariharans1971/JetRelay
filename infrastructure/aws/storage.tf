resource "aws_kms_key" "data" { description = "${local.name} data encryption"
 enable_key_rotation = true
 deletion_window_in_days = 30
 depends_on = [terraform_data.approval] }
resource "aws_kms_alias" "data" { name = "alias/${local.name}-data"
 target_key_id = aws_kms_key.data.key_id }
resource "aws_db_subnet_group" "private" { name = "${local.name}-private"
 subnet_ids = aws_subnet.private[*].id }
resource "aws_db_parameter_group" "postgres" {
  name_prefix = "${local.name}-"
  family = "postgres17"
  parameter { name = "rds.force_ssl"
 value = "1" }
  parameter { name = "ssl_min_protocol_version"
 value = "TLSv1.2" }
}
resource "aws_db_instance" "postgres" {
  identifier = "${local.name}-postgres"
  engine = "postgres"
  engine_version = "17"
  instance_class = "db.t4g.medium"
  allocated_storage = 100
  max_allocated_storage = 200
  storage_type = "gp3"
  storage_encrypted = true
  kms_key_id = aws_kms_key.data.arn
  db_name = "aeroshare"
  username = "aeroshare_owner"
  manage_master_user_password = true
  master_user_secret_kms_key_id = aws_kms_key.data.arn
  db_subnet_group_name = aws_db_subnet_group.private.name
  vpc_security_group_ids = [aws_security_group.database.id]
  parameter_group_name = aws_db_parameter_group.postgres.name
  publicly_accessible = false
  multi_az = true
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${local.name}-retained-final"
  backup_retention_period = 35
  copy_tags_to_snapshot = true
  auto_minor_version_upgrade = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  apply_immediately = false
}
resource "aws_s3_bucket" "documents" { bucket = "${local.prefix}-documents"
 force_destroy = false
 depends_on = [terraform_data.approval] }
resource "aws_s3_bucket_public_access_block" "documents" { bucket = aws_s3_bucket.documents.id
 block_public_acls = true
 block_public_policy = true
 ignore_public_acls = true
 restrict_public_buckets = true }
resource "aws_s3_bucket_versioning" "documents" { bucket = aws_s3_bucket.documents.id
 versioning_configuration { status = "Enabled" } }
resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "aws:kms"
 kms_master_key_id = aws_kms_key.data.arn }
 bucket_key_enabled = true }
}
resource "aws_s3_bucket_policy" "documents" {
  bucket = aws_s3_bucket.documents.id
  policy = jsonencode({Version="2012-10-17",Statement=[{Sid="DenyInsecureTransport",Effect="Deny",Principal="*",Action="s3:*",Resource=[aws_s3_bucket.documents.arn,"${aws_s3_bucket.documents.arn}/*"],Condition={Bool={"aws:SecureTransport"="false"}}}]})
}
resource "aws_s3_bucket" "references" { bucket = "${local.prefix}-public-reference"
 force_destroy = false
 depends_on = [terraform_data.approval] }
resource "aws_s3_bucket_public_access_block" "references" { bucket = aws_s3_bucket.references.id
 block_public_acls = true
 block_public_policy = true
 ignore_public_acls = true
 restrict_public_buckets = true }
resource "aws_s3_bucket_versioning" "references" { bucket = aws_s3_bucket.references.id
 versioning_configuration { status = "Enabled" } }
resource "aws_s3_bucket_server_side_encryption_configuration" "references" {
  bucket = aws_s3_bucket.references.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}
resource "aws_cloudfront_origin_access_control" "references" { name = "${local.name}-reference"
 origin_access_control_origin_type = "s3"
 signing_behavior = "always"
 signing_protocol = "sigv4" }
resource "aws_cloudfront_distribution" "references" {
  enabled = true
  comment = "Public aviation reference data only
 never private customer or operator documents."
  price_class = "PriceClass_All"
  origin { domain_name = aws_s3_bucket.references.bucket_regional_domain_name
 origin_id = "reference-s3"
 origin_access_control_id = aws_cloudfront_origin_access_control.references.id }
  default_cache_behavior { allowed_methods = ["GET","HEAD"]
 cached_methods = ["GET","HEAD"]
 target_origin_id = "reference-s3"
 viewer_protocol_policy = "redirect-to-https"
 compress = true
 min_ttl = 0
 default_ttl = 86400
 max_ttl = 31536000
 forwarded_values { query_string = false
 cookies { forward = "none" } } }
  ordered_cache_behavior { path_pattern = "manifest.json"
 allowed_methods = ["GET","HEAD"]
 cached_methods = ["GET","HEAD"]
 target_origin_id = "reference-s3"
 viewer_protocol_policy = "redirect-to-https"
 compress = true
 min_ttl = 0
 default_ttl = 30
 max_ttl = 60
 forwarded_values { query_string = false
 cookies { forward = "none" } } }
  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate { cloudfront_default_certificate = true }
}
resource "aws_s3_bucket_policy" "references" {
  bucket = aws_s3_bucket.references.id
  policy = jsonencode({Version="2012-10-17",Statement=[{Sid="CloudFrontReadOnly",Effect="Allow",Principal={Service="cloudfront.amazonaws.com"},Action="s3:GetObject",Resource="${aws_s3_bucket.references.arn}/*",Condition={StringEquals={"AWS:SourceArn"=aws_cloudfront_distribution.references.arn}}},{Sid="DenyInsecureTransport",Effect="Deny",Principal="*",Action="s3:*",Resource=[aws_s3_bucket.references.arn,"${aws_s3_bucket.references.arn}/*"],Condition={Bool={"aws:SecureTransport"="false"}}}]})
}
resource "aws_budgets_budget" "monthly" {
  name = "${local.name}-monthly"
  budget_type = "COST"
  limit_amount = tostring(var.approved_monthly_budget_usd)
  limit_unit = "USD"
  time_unit = "MONTHLY"
  dynamic "notification" {
    for_each = var.alarm_sns_topic_arn == null ? [] : [1]
    content { comparison_operator = "GREATER_THAN"
 threshold = 80
 threshold_type = "PERCENTAGE"
 notification_type = "ACTUAL"
 subscriber_sns_topic_arns = [var.alarm_sns_topic_arn] }
  }
}
