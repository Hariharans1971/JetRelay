# JetRelay database migration

31 October 2026 IST. The active application database moved from the expiring Render pilot to the dedicated jetrelay database on Neon. The existing website remains hosted on Render.

## Destination

Neon Free in AWS North Virginia, PostgreSQL 18. A dedicated database and database role isolate the JetRelay tables from the existing neondb database. The existing project is managed by Vercel, so creating a new Singapore project through Neon was rejected. Existing neondb tables and connection settings were not modified. Project quotas are shared.

The current Neon Free plan has no fixed trial expiry. It has usage quotas, scale-to-zero and no uptime SLA. This is not a lifetime hosting guarantee. The Render frontend can still sleep when inactive. A paid service and suitable operational acceptance checks remain necessary for commercial availability commitments.

## Migration controls and evidence

- Source writes paused and the live API verified to return DATABASE_MAINTENANCE before copying.
- Source read under a repeatable-read, read-only transaction.
- Destination required empty. Migration writes run in one transaction.
- All 13 application tables checked using row counts and deterministic per-table checksums.
- Source contained zero application records. No customer rows needed transfer.
- Raw PostgreSQL JSON text preserves timestamp microseconds, bytea ciphertext and large bigint values.
- Audit sequence restored safely, including its source state.
- A destination migration receipt records successful verification.
- A post-migration Neon snapshot was created. Restoring that snapshot has not been exercised.
- Application connection uses a direct Neon endpoint and sslmode=verify-full. Credentials remain only in the hosting secret environment, never in GitHub or browser assets.
- The document encryption key, role-based application authentication and private attachment rules remain unchanged.
- One-time migration target cleared before enabling normal writes on the destination.
- Original Render database retained; no source tables or records deleted. Its old trial expiry still applies to that inactive instance.

## Validation

39 Node regression checks, 53 isolated platform checks, 11 isolated migration assertions and four Python reference tests passed. Migration checks cover exact encrypted bytes, bigints, timestamp precision, idempotent retry, occupied-target refusal and rollback after an incomplete copy. These are distinct from the managed database diagnostics exposed by /api/v1/status.

## Operations

Check /status.html and /api/v1/status for provider Neon, connected/schema/booking constraint and transaction checks, with maintenance false. Keep database URLs and encryption keys private. Never restore over an occupied database. Arrange ongoing backup retention and an isolated restore test before real commercial customer data. Credentials, verified inventory, and payment/email acceptance tests are still required for commercial launch.

## References

https://neon.com/pricing
https://neon.com/docs/introduction/plans
https://neon.com/docs/import/migrate-from-render
