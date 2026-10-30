output "private_database_endpoint" { value = aws_db_instance.postgres.address
 sensitive = true }
output "master_secret_arn" { value = aws_db_instance.postgres.master_user_secret[0].secret_arn
 sensitive = true }
output "private_document_bucket" { value = aws_s3_bucket.documents.id
 sensitive = true }
output "public_reference_origin" { value = "https://${aws_cloudfront_distribution.references.domain_name}" }
output "reference_refresh_schedule" { value = "Daily 03:30 Asia/Kolkata
 active only after the approved Terraform deployment." }
output "application_security_group_id" { value = aws_security_group.application.id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
