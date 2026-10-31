# JetRelay refund operations

Updated 31 October 2026. Full-refund lifecycle handling is implemented and tested with controlled local provider responses. An actual Stripe sandbox purchase/refund and approved merchant credentials are still required before live collection. No money was collected or refunded during these tests.

## What the application now does

- Links a payment to its Stripe PaymentIntent and records the refund reference, amount and status.
- Validates the provider checkout's payment status, amount, currency and booking identity before requesting a full refund.
- Uses a stable per-payment idempotency key for the first refund request. Repeating an administrator request checks the existing refund instead of creating another one.
- Handles signed refund callbacks and retrieves the provider's current refund object rather than trusting an older event snapshot.
- Updates the booking only after a matching full refund succeeds. Pending or failed refunds remain in refund follow-up, rather than appearing completed.
- Ignores a delayed initial pending response when a terminal refund result has already been recorded.
- Records mismatches transactionally; a failed reconciliation does not consume the event receipt and can be retried after correction.
- Shows refund progress in tenant-scoped booking dashboards. Administrators can refresh a tracked refund from the provider.
- Detects partial or multiple refunds and retains administrator review. This is not a partial-refund ledger, dispute system or operator-payout implementation.

## Provider configuration

Configure the existing webhook destination:

https://aeroshare-global.onrender.com/api/v1/payments/webhook

Subscribe to these events in the correct test/live merchant environment:

- checkout.session.completed
- checkout.session.async_payment_succeeded
- refund.created
- refund.updated
- refund.failed

Configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET through Render's secure environment settings. Do not put keys in source, issues or chat. The live-collection gate stays disabled until the [first paid booking checklist](FIRST_PAID_BOOKING_CHECKLIST.md) has evidence.

Relevant official references: [Stripe refund lifecycle](https://docs.stripe.com/refunds), [event types](https://docs.stripe.com/api/events/types), [Refund object](https://docs.stripe.com/api/refunds/object). These describe provider capabilities, not evidence that our merchant connection has passed acceptance.

## Administrator procedure

1. Sign in to the administrator workspace with TOTP. Confirm the affected booking and cancellation terms; verify its paid record and refund eligibility.
2. In Manage a booking refund, enter its reference and choose Request or check full refund. Confirm the action only when the commercial refund decision has been made.
3. If pending, keep the obligation open. Refresh provider refund status or wait for its signed callback. A submitted request is not proof that the customer has received funds.
4. If customer/provider action is required, use the verified provider dashboard and approved customer-support channel. Never collect banking details in a public issue or invent an alternate refund destination.
5. If failed or cancelled, investigate in the provider dashboard and contact the customer. The application does not automatically issue a new refund after a failure. Repeating the same request checks the existing refund. Any alternative refund process must be reconciled and approved by the business.
6. If partial or multiple refunds are detected, reconcile every provider transaction manually. The application deliberately keeps the booking in refund review and does not infer that all money has been returned.
7. If the provider status API is unavailable, the app returns an unavailable result and preserves the previous database state; do not mark a refund complete by editing the database.

## Deployment and acceptance

The startup schema upgrade adds four nullable tracking columns and two unique indexes to the existing payments table. Existing booking/payment rows are retained; no customer data or migration receipt is cleared. Database readiness reports refund_tracking_ready only when those fields and indexes exist. The old Render-to-Neon copy command remains disabled; do not replay a historical migration to apply this additive schema change.

Local verification: 46 Node regression tests, 91 isolated PostgreSQL integration checks and 11 migration checks passed. Refund SDK calls were replaced with a test-only substitute; signatures were generated/checked locally. The test client cannot be set in production. Coverage includes repeat requests, duplicate/out-of-order callbacks, delayed pending responses, failure after completion, identity/currency/amount mismatches, partial/multiple refund review and repeatable schema upgrades that retain existing payment records.

Before enabling live collection, perform actual merchant sandbox checkout, pending-to-success refund, failure follow-up and dashboard checks using controlled accounts. Exercise provider callback delivery/retries and prove customer communication. These tests do not establish bank settlement, legal eligibility, operational staffing or worldwide charter coverage.
