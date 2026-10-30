resource "aws_ecs_cluster" "jobs" { name = "${local.name}-jobs"
 depends_on = [terraform_data.approval] }
resource "aws_cloudwatch_log_group" "refresh" { name = "/aeroshare/${var.environment}/reference-refresh"
 retention_in_days = 30
 depends_on = [terraform_data.approval] }
resource "aws_iam_role" "refresh_execution" {
  name = "${local.name}-refresh-execution"
  assume_role_policy = jsonencode({Version="2012-10-17",Statement=[{Effect="Allow",Principal={Service="ecs-tasks.amazonaws.com"},Action="sts:AssumeRole",Condition={StringEquals={"aws:SourceAccount"=data.aws_caller_identity.current.account_id}}}]})
  depends_on = [terraform_data.approval]
}
resource "aws_iam_role_policy" "refresh_execution" {
  role = aws_iam_role.refresh_execution.id
  policy = jsonencode({Version="2012-10-17",Statement=[
    {Effect="Allow",Action="ecr:GetAuthorizationToken",Resource="*"},
    {Effect="Allow",Action=["ecr:BatchCheckLayerAvailability","ecr:GetDownloadUrlForLayer","ecr:BatchGetImage"],Resource="arn:aws:ecr:${var.region}:${data.aws_caller_identity.current.account_id}:repository/${split("@", join("/", slice(split("/", var.refresh_image), 1, length(split("/", var.refresh_image)))))[0]}"},
    {Effect="Allow",Action=["logs:CreateLogStream","logs:PutLogEvents"],Resource="${aws_cloudwatch_log_group.refresh.arn}:*"}
  ]})
}

resource "aws_iam_role" "refresh_task" {
  name = "${local.name}-refresh-task"
  assume_role_policy = jsonencode({Version="2012-10-17",Statement=[{Effect="Allow",Principal={Service="ecs-tasks.amazonaws.com"},Action="sts:AssumeRole",Condition={StringEquals={"aws:SourceAccount"=data.aws_caller_identity.current.account_id}}}]})
  depends_on = [terraform_data.approval]
}
resource "aws_iam_role_policy" "refresh_task" {
  role = aws_iam_role.refresh_task.id
  policy = jsonencode({Version="2012-10-17",Statement=[{Effect="Allow",Action=["s3:GetObject","s3:PutObject","s3:AbortMultipartUpload"],Resource=["${aws_s3_bucket.references.arn}/manifest.json","${aws_s3_bucket.references.arn}/snapshots/*"]}]})
}
resource "aws_ecs_task_definition" "refresh" {
  family = "${local.name}-reference-refresh"
  requires_compatibilities = ["FARGATE"]
  network_mode = "awsvpc"
  cpu = "512"
  memory = "2048"
  execution_role_arn = aws_iam_role.refresh_execution.arn
  task_role_arn = aws_iam_role.refresh_task.arn
  runtime_platform { operating_system_family = "LINUX"
 cpu_architecture = "X86_64" }
  container_definitions = jsonencode([{name="refresh",image=var.refresh_image,essential=true,readonlyRootFilesystem=false,user="10001:10001",environment=[{name="REFERENCE_BUCKET",value=aws_s3_bucket.references.id},{name="AWS_REGION",value=var.region}],mountPoints=[],logConfiguration={logDriver="awslogs",options={"awslogs-group"=aws_cloudwatch_log_group.refresh.name,"awslogs-region"=var.region,"awslogs-stream-prefix"="job"}},linuxParameters={initProcessEnabled=true}}])
  ephemeral_storage { size_in_gib = 21 }
}
resource "aws_iam_role" "scheduler" {
  name = "${local.name}-refresh-scheduler"
  assume_role_policy = jsonencode({Version="2012-10-17",Statement=[{Effect="Allow",Principal={Service="scheduler.amazonaws.com"},Action="sts:AssumeRole",Condition={StringEquals={"aws:SourceAccount"=data.aws_caller_identity.current.account_id}}}]})
  depends_on = [terraform_data.approval]
}
resource "aws_iam_role_policy" "scheduler" {
  role = aws_iam_role.scheduler.id
  policy = jsonencode({Version="2012-10-17",Statement=[{Effect="Allow",Action="ecs:RunTask",Resource=aws_ecs_task_definition.refresh.arn,Condition={ArnEquals={"ecs:cluster"=aws_ecs_cluster.jobs.arn}}},{Effect="Allow",Action="iam:PassRole",Resource=[aws_iam_role.refresh_execution.arn,aws_iam_role.refresh_task.arn],Condition={StringEquals={"iam:PassedToService"="ecs-tasks.amazonaws.com"}}}]})
}
resource "aws_scheduler_schedule" "daily_reference" {
  name = "${local.name}-daily-reference"
  schedule_expression = "cron(30 3 * * ? *)"
  schedule_expression_timezone = "Asia/Kolkata"
  flexible_time_window { mode = "OFF" }
  target {
    arn = aws_ecs_cluster.jobs.arn
    role_arn = aws_iam_role.scheduler.arn
    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.refresh.arn
      launch_type = "FARGATE"
      task_count = 1
      network_configuration { subnets = aws_subnet.private[*].id
 security_groups = [aws_security_group.application.id]
 assign_public_ip = false }
    }
    retry_policy { maximum_event_age_in_seconds = 3600
 maximum_retry_attempts = 1 }
  }
}
resource "aws_cloudwatch_log_metric_filter" "refresh_failed" { name = "${local.name}-refresh-failed"
 log_group_name = aws_cloudwatch_log_group.refresh.name
 pattern = "{ $.status = \"FAILED\" }"
 metric_transformation { name = "ReferenceRefreshFailed"
 namespace = "AeroShare/${var.environment}"
 value = "1"
 default_value = 0 } }
resource "aws_cloudwatch_metric_alarm" "refresh_failed" {
  alarm_name = "${local.name}-reference-refresh-failed"
  namespace = "AeroShare/${var.environment}"
  metric_name = "ReferenceRefreshFailed"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold = 1
  evaluation_periods = 1
  period = 300
  statistic = "Sum"
  treat_missing_data = "notBreaching"
  alarm_actions = var.alarm_sns_topic_arn == null ? [] : [var.alarm_sns_topic_arn]
}
