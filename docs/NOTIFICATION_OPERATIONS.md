# JetRelay booking-notification operations

31 October 2026. This describes implemented software, not proof of real email delivery or an always-on service.

## Delivery design

Booking payment updates, parent-charter disruptions, customer cancellation requests and refund status changes enqueue a durable PostgreSQL notification within the same transaction as the business change. A failed transaction cannot leave a notification describing an uncommitted booking update. Unique event keys prevent repeat enqueueing.

The worker claims one job at a time using row locks, SKIP LOCKED and a two-minute lease. Each process drains a bounded batch every 30 seconds while it is awake. It skips processing during database write maintenance. A restarted process can reclaim an expired lease.

Before contacting Resend, the recipient, sender and message are frozen and encrypted using the existing document encryption key. Retries use the same payload and idempotency key. No email addresses, message bodies, passwords or provider credentials are written to application logs or public status pages.

Temporary failures use exponential backoff. Jobs stop after six attempts, after the retry window, or on a permanent provider rejection. Notifications older than 24 hours and retry windows older than 23 hours require manual follow-up. This stays within Resend's documented 24-hour idempotency window and avoids silently resending stale updates after a long outage. Read [Resend idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys).

A sent record means the provider accepted the message; it does not prove inbox placement or customer receipt. Delivery/bounce webhooks, complaint processing and marketing subscriptions are not implemented here. Account verification/reset delivery remains the existing immediate flow. Automatic route-match marketing alerts remain unimplemented.

## Activation and monitoring

Set RESEND_API_KEY and a verified EMAIL_FROM through the host's secure configuration. Preserve DOCUMENT_ENCRYPTION_KEY in your secret-recovery process. PUBLIC_ORIGIN must use HTTPS in production. Existing missing credentials keep delivery disabled; connecting an AI tool does not verify a sender domain.

Administrators can inspect Operations follow-up and Booking notifications in the portal. The private GET /api/v1/admin/operations endpoint returns queue counts, oldest timestamps and refund-review counts; it rejects non-administrators. Clients see only their own notification records. Message bodies and credentials are never returned by these dashboard endpoints.

For a failed job, inspect its sanitized reason and the provider dashboard, contact the customer through an approved support process, and reconcile before any resend. Do not reset attempts or alter event keys to force another email after an uncertain provider result. A dedicated administrator retry/reconciliation workflow is still needed for operator-managed recovery of failed deliveries.

## Hosting boundary

The current worker runs inside the Render web process. A sleeping free web instance does not process jobs. Production use needs always-on compute or a separately provisioned worker, plus externally monitored alerts and a support rota. This release does not purchase a hosting upgrade or claim an enterprise SLA.

## Evidence

Local tests use a test-only sender; no real emails are sent. They cover transactional rollback, enqueue deduplication, missing configuration, encrypted payloads, 429 retry, expired lease recovery, stable retry payload after sender configuration changes, two concurrent worker invocations, stale jobs, permanent rejection and tenant-scoped access. PostgreSQL migration syntax was also applied successfully on an isolated Neon branch before production rollout. Passing those tests does not replace verified-domain acceptance, real mailbox tests or load testing.

Release validation: 48 Node regression tests, 114 isolated marketplace/notification checks, 13 migration checks and four Python reference tests passed. The migration suite also preserves queued encrypted notification payloads. These counts describe local automated checks, not human testing or external delivery certification.
