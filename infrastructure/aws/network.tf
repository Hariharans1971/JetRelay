resource "aws_vpc" "main" {
  cidr_block = "10.72.0.0/16"
  enable_dns_support = true
  enable_dns_hostnames = true
  depends_on = [terraform_data.approval]
}
resource "aws_internet_gateway" "main" { vpc_id = aws_vpc.main.id }
resource "aws_subnet" "public" {
  count = 2
  vpc_id = aws_vpc.main.id
  cidr_block = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = local.azs[count.index]
  map_public_ip_on_launch = false
}
resource "aws_subnet" "private" {
  count = 2
  vpc_id = aws_vpc.main.id
  cidr_block = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = local.azs[count.index]
  map_public_ip_on_launch = false
}
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"
 gateway_id = aws_internet_gateway.main.id }
}
resource "aws_route_table_association" "public" { count = 2
 subnet_id = aws_subnet.public[count.index].id
 route_table_id = aws_route_table.public.id }
resource "aws_eip" "nat" { count = 2
 domain = "vpc" }
resource "aws_nat_gateway" "main" {
  count = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id = aws_subnet.public[count.index].id
  depends_on = [aws_internet_gateway.main]
}
resource "aws_route_table" "private" {
  count = 2
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"
 nat_gateway_id = aws_nat_gateway.main[count.index].id }
}
resource "aws_route_table_association" "private" { count = 2
 subnet_id = aws_subnet.private[count.index].id
 route_table_id = aws_route_table.private[count.index].id }
resource "aws_vpc_endpoint" "s3" {
  vpc_id = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = aws_route_table.private[*].id
}
resource "aws_security_group" "application" {
  name_prefix = "${local.name}-app-"
  description = "Reserved for the private application backend
 no inbound public rule."
  vpc_id = aws_vpc.main.id
  egress { from_port = 443
 to_port = 443
 protocol = "tcp"
 cidr_blocks = ["0.0.0.0/0"] }
}
resource "aws_security_group" "database" {
  name_prefix = "${local.name}-db-"
  description = "Private PostgreSQL accepts only application security-group traffic."
  vpc_id = aws_vpc.main.id
}
resource "aws_vpc_security_group_ingress_rule" "database" {
  security_group_id = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.application.id
  from_port = 5432
  to_port = 5432
  ip_protocol = "tcp"
}
resource "aws_vpc_security_group_egress_rule" "database" {
  security_group_id = aws_security_group.application.id
  referenced_security_group_id = aws_security_group.database.id
  from_port = 5432
  to_port = 5432
  ip_protocol = "tcp"
}
