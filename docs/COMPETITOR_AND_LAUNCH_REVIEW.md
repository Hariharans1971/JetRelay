# JetRelay: competitor research and commercial launch review

Reviewed 31 October 2026 IST. This document records verified capabilities and outstanding work; it is not a production certification.

## Findings and decisions

| Area | Primary-source finding | JetRelay decision |
| --- | --- | --- |
| Flight data | Flightradar24's API requires a separate subscription and consumes credits per returned entity. Website access is not API access. | Obtain a suitable API subscription and public-display rights before enabling a commercial provider. Budget for aircraft count, refresh interval and concurrent map regions. Do not scrape a competitor or circumvent rate limits. |
| Data licensing | ADS-B Exchange requires a commercial licence for company projects; redistribution requires authorization. | Do not connect an unlicensed third-party feed or expose its data to public users. Obtain contractual display, cache, derivative and retention rights. |
| Empty legs | Victor lets customers filter by route/date and warns that flights can change or be cancelled at short notice. | Retain operator verification, parent-charter linkage, schedule checks, full-aircraft prices, explicit terms and refund review. Radar presence is never evidence of a bookable aircraft. |
| Payment fulfillment | Stripe directs server-side fulfillment using verified webhooks; return-page redirects alone are insufficient. | Existing signed webhooks validate totals, currency and booking linkage, with idempotent processing. Actual provider sandbox purchase/refund remains outstanding. |
| Email | Resend requires a verified domain owned by the sender. | Configure the owner's verified sender domain and credentials; test verification and password-reset delivery. No bypass of customer verification. |
| Hosting | Render says free instances should not be used for production; free databases expire and have no backups. | Upgrade web and database before real bookings; establish and exercise backup/restore and incident procedures. |

## Evidence from this work

- Production dependency audit: zero known vulnerabilities across 16 dependencies; see [saved audit](audits/dependencies-2026-10-31.json). This is an advisory database scan, not a penetration test.
- Node regression tests: 38 checks, including long and malformed Retry-After handling.
- PostgreSQL WASM integration: 53 checks. New checks verify the readiness diagnostic detects a missing booking index. This is still an isolated local engine.
- Managed database: the live status endpoint now independently checks all 13 application tables, both named booking protection indexes and a read-only transaction. Startup additionally exercises writes, savepoint rollback and uniqueness in a temporary table which is dropped at commit, without changing customer records. A successful diagnostic is infrastructure evidence, not a real paid booking test.
- Most recent regional live-feed sample before this review: London 114 observations, Mumbai 12; a New York request returned HTTP 429. These are samples, not current aircraft counts or worldwide availability guarantees.
- Global reference data: 86,311 airport records, including searchable airports across continents. Reference records are not live aircraft inventory.

## Commercial acceptance checklist

| Requirement | Acceptance evidence | Current disposition |
| --- | --- | --- |
| Managed application connection | Live /api/v1/status database.connected, schema_ready, booking_constraints_ready, read_only_transaction and transaction_write_probe true | Verified live on 31 October 2026 |
| Licensed scalable tracking | Executed agreement, API credentials, display permission, load/coverage tests, quota alarms | Owner/provider setup required |
| Merchant onboarding | Business-approved payment account, test and live credentials, signed webhook endpoint | Credentials absent; no real sandbox transaction yet |
| Payment end-to-end | Actual hosted checkout, verified webhook, single confirmation, cancellation and completed refund, payment reconciliation | Local webhook contracts tested; provider test outstanding |
| Transactional email | Verified domain; registration/reset delivered to independent inboxes | Credentials/domain absent |
| Operator supply | Signed operator agreement, actual AOC/registration/insurance verification, real parent charter and approved listing | No verified production inventory |
| Paid infrastructure | Always-on compute, durable paid database, capacity and connection budget | Free pilot remains |
| Recovery | Backup plus measured restore into isolated database, operator runbook and alerts | Not exercised |
| Security | Independent assessment, tenant-access testing, secret rotation, log review and incident response | Automated checks only; external review outstanding |
| Documents | Legal retention/deletion policy, malware scanning and suitable object storage for larger/sensitive documents | Encrypted small trip notes only; no identity/medical documents |
| Daily references | Successful unattended workflow execution with provenance timestamps | Scheduled run completed successfully on 31 October 2026; refreshed snapshot deployed |
| Operations | Real support channel, flight disruption handling and refund ownership | Owner staffing/setup required |

Keep COMMERCIAL_LAUNCH_APPROVED=false until the acceptance evidence exists. Do not enter API secrets in GitHub files, reports or chat; configure them using the provider's secret environment settings.

For an India-registered business, Stripe currently uses invite-only onboarding. Confirm merchant eligibility before choosing it; an approved alternative needs its own implemented and tested adapter. See [Stripe India onboarding](https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india). JetRelay currently implements Stripe only.

## Recommended rollout

1. Keep the public reference/radar pilot accessible with explicit freshness and outage states.
2. Configure verified email and an approved merchant sandbox. Onboard one real consenting operator and use provider test mode for the full booking/refund acceptance run.
3. Activate a licensed tracking contract; test coverage and quotas across representative regions. Provider selection depends on display rights and expected traffic, not only subscription price.
4. Upgrade web/database, exercise restore and incident procedures, and complete independent security and operational review.
5. Approve commercial launch only when the checklist is evidenced. Add shared rate limiting/caching and queue-backed email before scaling beyond one app instance.

Useful future differentiation: explain empty-leg disruption risk before checkout, show evidence-backed verification dates, enable flexible nearby-airport matching and opt-in route alerts, and provide clear refund progress. These are product recommendations; no assertion is made that competitors lack them. Automated matching/email alerts are not implemented today.

## Primary sources

- [Flightradar24 API FAQ](https://fr24api.flightradar24.com/docs/faq)
- [Flightradar24 subscriptions and credits](https://fr24api.flightradar24.com/subscriptions-and-credits/)
- [ADS-B Exchange commercial licensing](https://support.adsbexchange.com/hc/en-us/articles/37363886073613-I-m-building-a-project-for-my-company-but-we-aren-t-making-money-off-of-it-can-I-get-a-free-API-key)
- [ADS-B Exchange data-use policy](https://support.adsbexchange.com/hc/en-us/articles/37364077703693-What-is-ADS-B-Exchange-s-data-use-policy)
- [Victor empty-leg FAQ](https://www.flyvictor.com/en-us/faq/chartering-flight/)
- [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction)
- [Render free-instance limitations](https://render.com/docs/free)
