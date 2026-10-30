# AeroShare AWS foundation — prepared, not deployed

This directory is an **undeployed infrastructure proposal**, not evidence that client data is already in AWS. No AWS deployment connection is available in this session. The original Next.js/FastAPI/PostgreSQL source is also still missing. A production readiness claim would be false.

## Proposed security boundary

- Region: `ap-south-1` (Mumbai), two availability zones; validate legal/data-residency requirements with the client before deployment.
- RDS PostgreSQL 17, multi-AZ, private subnets, no public accessibility, application-security-group-only ingress, forced SSL/TLS 1.2 minimum, encrypted storage/backups, KMS rotation, 35-day automatic backup retention, deletion protection and final snapshot retention.
- Master credentials are generated/managed by RDS in Secrets Manager; Terraform does not create or output plaintext database passwords. A separate least-privilege application database role must be created before the business backend can use the database; do not use the master role for application queries.
- Private S3 documents bucket, Block Public Access, SSE-KMS, versioning and denial of insecure transport. No public CloudFront origin points at this bucket. Scoped upload/download APIs, file validation/scanning, retention policy, and tenant authorisation are not implemented by a bucket alone.
- A **different**, non-public S3 bucket stores public-domain airport/reference snapshots. A read-only CloudFront origin-access-control policy serves only this public reference dataset worldwide. This is not a route for customer/booking/operator documents.
- A non-root ECS Fargate job checks the official sources daily at **03:30 Asia/Kolkata**, validates inputs, uploads a new immutable snapshot, and switches `manifest.json` only after all snapshot objects upload. Unchanged inputs update `last_checked_at` without changing the source import date. The task has no document-bucket or database permissions. It needs writable ephemeral scratch to assemble public-data shards; the container is not privileged and does not accept network ingress.
- The worker can read the AWS reference origin through the server-only `AEROSHARE_REFERENCE_ORIGIN` value. It validates the manifest and preserves the last validated snapshot on source failure. No AWS keys are shipped to browsers. The live aircraft feed remains a separate, best-effort provider adapter, not a daily replacement for real-time updates.
- CloudWatch job failure metrics/alarms are declared. An actual client-owned SNS alert topic must be supplied and delivery tested. A budget is declared, but **budget alerts are not a spending cap**. A missing alert recipient/topic is a launch blocker.

## What this foundation does not deploy

It does not deploy the missing FastAPI business API, full customer/operator tenancy, PostgreSQL schema/migrations/least-privilege application role, verified operator onboarding, quotation acceptance, schedule exclusion constraints, private-document upload APIs, Cognito/admin MFA integration, full audit trail, a contractual global ADS-B SLA, multi-region disaster recovery, legal compliance or a verified backup restoration. These must be implemented and tested against the actual application; access to RDS/S3 does not implement them automatically.

## Required inputs before any apply

1. Client-owned AWS account/role through an approved secure connection, ideally AWS IAM Identity Center/temporary credentials. Do not paste cloud keys into chat or commit them to source.
2. Original application repository and operational/business requirements.
3. Region/residency choice, concrete workload-priced calculator estimate, and explicit approval of paid provisioning. The prior engineering report gives **planning allowances**, not a supplier quote: roughly $325–735/month production infrastructure, excluding commercial aviation data, taxes, usage overages and support. Final foundation/task/NAT/transfer costs must be quoted before spending.
4. Separate encrypted/private Terraform state bucket with restricted IAM and locking; supply the backend settings through an untracked backend file. Do not store state/plan/secret tfvars in Git.
5. Client-owned ECR image built from the supplied Dockerfile and pinned by SHA-256 digest, with vulnerability review. Actual container build/runtime testing remains outstanding because Docker is not available here.
6. Approved SNS notification destination, operational owners, restore objectives, and incident/escalation plan.

## Review and verification sequence

- Offline checks in this session: HCL parsed successfully by `python-hcl2`; the job's source validation dry run and four publication/rollback tests passed.
- **Not executed**: Terraform provider-schema validation, AWS plan/apply, image build, cloud job execution, private-network connectivity, backup restore or alert delivery. A Terraform binary download did not complete; do not equate HCL parsing with `terraform validate`.
- After connection, run a reviewed `terraform init` against the approved encrypted backend, `terraform fmt -check`, `terraform validate`, then generate/review a plan. Do not run `apply` without the explicit paid-resource approval required in section 13 of the user's prompt. Variables deliberately default to no approved budget/approval record.
- Bootstrap a genuinely empty staging database, create application roles and append-only reviewed migrations, configure the original backend and identity/MFA, test tenant isolation and transactional conflicts, and restore a backup into an isolated environment.
- Build/scan/push the reference job image by immutable digest, execute the job once, read back `manifest.json` and a published airport record through CloudFront, then configure `AEROSHARE_REFERENCE_ORIGIN` as a server-side runtime setting and redeploy the site. Verify the reader reports `AWS_REFERENCE_SNAPSHOT` and the actual `last_checked_at`.
- Verify the enabled EventBridge schedule, a real scheduled occurrence, failure alert delivery, and retention. Before that evidence exists, report daily sync as **prepared / not active**.

Terraform uses default CloudFront TLS for its generated hostname. Configure and verify the client domain/certificate/TLS policy and HTTPS redirects before commercial launch. Do not claim a particular cryptographic protocol or certification solely from these declarations.
