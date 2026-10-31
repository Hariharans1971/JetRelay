# JetRelay: first paid booking launch checklist

Prepared 31 October 2026. This is an execution checklist, not a commercial-readiness certificate.

## Chosen launch scope

Begin with one verified operator and a small set of genuine whole-aircraft empty-leg listings. Use an operator-agreed commission only after a written agreement defines who sells the charter, collects funds, pays the operator and handles refunds. No commission rate or operator partnership has been agreed yet.

Keep the existing Render application, Neon database, Resend integration and Stripe checkout implementation. Merchant eligibility and approval must be established before choosing live payment collection. Do not treat a tracking-feed aircraft as available inventory.

Current checks: the active Neon connection and schema checks passed. Payment and email credentials are absent. Commercial launch is disabled. These results must be checked again after configuration changes.

## Work that needs the owner

| Requirement | Owner action | Evidence before launch |
| --- | --- | --- |
| Business identity | Complete the payment provider's identity and bank verification in its secure dashboard | Merchant account approved for the proposed business activity |
| Email | Provide a domain you control and verify the sender with Resend | Verification and password-reset emails received by controlled test accounts |
| Operator | Agree commercial terms with a legitimate charter operator | Verified operator credentials, aircraft authority/insurance and signed commercial agreement |
| Inventory | Ask the operator to publish actual return-flight availability | Route, dates, aircraft capacity, price/currency, validity and cancellation conditions confirmed |
| Support | Choose a monitored customer support channel | Contact details published and support/refund responsibility assigned |
| Hosting | Decide the operating budget and recovery requirements | Restore rehearsal, monitoring and capacity appropriate to launch traffic |

Never paste secret keys, bank documents or identity documents in GitHub issues or chat. Configure credentials in Render's environment settings. Do not send sensitive documents through the public pilot feedback form.

## Configure and prove the integrations

Follow [the owner activation instructions](USER_GUIDE.md#owner-activation).

1. Preserve the existing database connection and document encryption key.
2. Set RESEND_API_KEY and EMAIL_FROM only after sender verification.
3. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to sandbox credentials first.
4. Register the payment webhook at https://aeroshare-global.onrender.com/api/v1/payments/webhook for checkout.session.completed and checkout.session.async_payment_succeeded.
5. Bootstrap the owner-controlled administrator using the existing process, enable admin TOTP and remove ADMIN_BOOTSTRAP_TOKEN afterward.
6. Run tests with controlled accounts in an isolated environment; do not invent live operators or real flight inventory.

## Required acceptance record

Record date, environment, result and a redacted evidence reference for each item. None of the following provider or human acceptance tests is claimed complete by this document.

- Client registration, verification, password reset and sign-out work with real delivered email.
- Client, operator and admin access restrictions hold; one client cannot access another client's private attachments or bookings.
- A verified operator can publish a valid empty leg linked to a confirmed parent charter.
- Two clients competing for one aircraft cannot both obtain an active booking.
- A real provider sandbox checkout succeeds; cancellation and payment failure recover correctly.
- Duplicate signed webhooks do not confirm or charge twice; invalid signatures are rejected.
- Paid amount, currency and booking identity match; late payments and withdrawn inventory enter reconciliation rather than unsupported travel confirmation.
- A sandbox full refund reaches a successful provider result and is reflected in the application.
- Parent-charter cancellation withdraws the return listing and affected bookings follow the documented refund process.
- Backup restoration succeeds in isolation with the necessary encryption-key recovery.
- Volunteers complete the public pilot checklist on mobile and desktop; record actual feedback without inventing participants.

Partial refunds, disputes, chargebacks, operator payouts and automatic reconciliation are not complete platform features. Establish a documented external operations process or implement and test them before accepting the corresponding obligations.

## Launch decision

Keep COMMERCIAL_LAUNCH_APPROVED=false until the above evidence, operator terms, customer terms and support process have been reviewed by the owner. Only then configure approved live credentials and enable collection. Do not enable the gate simply to remove an unavailable message.

## First-customer campaign

Use [the prepared global pilot campaign](GLOBAL_PILOT_LAUNCH.md) to recruit feedback while payments remain disabled. Metricool currently has YouTube connected; no video has been supplied and no posts have been scheduled. Connect a brand-controlled text-capable social account or supply an appropriate video before publishing.

Measure actual enquiries, verified inventory, completed bookings, refunds and collected commission. Revenue equals collected commission less refunds, payment fees, operator obligations and operating costs. A public website, social post or aircraft observation is not proof of revenue.
