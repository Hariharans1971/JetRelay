# JetRelay

A whole-aircraft empty-leg marketplace, evolved from the AeroShare aviation workspace.

[Website](https://aeroshare-global.onrender.com/) · [Empty legs](https://aeroshare-global.onrender.com/booking.html) · [User guide](docs/USER_GUIDE.md)

## Current release

This release adds an independent Node.js and PostgreSQL booking platform to the existing aviation-reference app. It does not rely on an unseen FastAPI implementation. The original Next.js/FastAPI commercial repository was not supplied, and no claim of feature parity with it is made.

The public website is on Render in Singapore. Its active database is now the separate jetrelay database in Neon Lakebase Postgres, in AWS North Virginia. The connection uses verified TLS and server-side credentials. The status endpoint also checks all 14 application tables, the two unique partial booking indexes and a read-only transaction. Startup also tests temporary-table writes, uniqueness and savepoint rollback without changing customer records. These infrastructure diagnostics are separate from the isolated marketplace test suite and do not certify commercial readiness.

Check [live service availability](https://aeroshare-global.onrender.com/status.html) for current account, data and activation status.

Join the [public testing pilot](https://aeroshare-global.onrender.com/pilot.html). The [global pilot launch plan](docs/GLOBAL_PILOT_LAUNCH.md) includes competitor research, prepared social copy and a voluntary user-testing protocol. Human testing and marketing reach are not yet measured.

## Implemented

- Separate client, operator and administrator portals, with server-enforced roles.
- Scrypt password hashing, hashed random sessions, HttpOnly Secure SameSite cookies, CSRF and origin checks, session expiry, email verification/reset integration and mandatory admin TOTP.
- Operator applications, aircraft review, confirmed parent charters and reverse-route empty-leg proposals.
- Schedule and insurance validation, administrator approval and an audit trail.
- PostgreSQL transactions, listing locks, an active-booking uniqueness constraint, idempotent whole-aircraft holds and expiry handling.
- Stripe-hosted Checkout integration, signed webhook verification, duplicate-event handling, amount/currency validation, refund review and full-refund integration. Merchant credentials and actual Stripe sandbox/live verification are outstanding.
- AES-256-GCM encrypted private trip-note attachments, authenticated downloads and file type/size checks. Pilot use excludes sensitive identity and medical documents.
- Private saved route preferences. Automated matching notifications are not implemented.
- Global airport search/details, runway references, geography and manufacturer aircraft references. NOAA AWC weather and adsb.lol radar integrations remain subject to provider availability. Radar returned HTTP 429 during production testing.
- Daily public-reference refresh workflow at 00:00 UTC. The scheduled run on 31 October 2026 succeeded and automatically deployed the refreshed snapshot.

## Run

```sh
npm ci --prefix render --ignore-scripts
node render/restore-reference.mjs
node render/build.mjs
node --test tests/*.test.mjs
node dist-node/server.mjs
```

Set DATABASE_URL to a PostgreSQL connection string to enable account services. Migrations run at startup under a database advisory lock. For this deployment, use the direct Neon connection with sslmode=verify-full. Startup migrations and temporary-table checks use this direct connection; the app pool is capped at five. Never commit credentials. The production server binds to 0.0.0.0:$PORT on Node.js 24.

## Verification

39 automated Node tests and 4 Python reference-refresh tests pass. The separate local platform integration run passed 53 checks against the PostgreSQL WASM PGlite engine, including roles, approval, concurrent competing holds, signed local webhook contracts, encrypted document authorization and parent-cancellation effects. Managed connectivity is checked independently by the live status diagnostic; the isolated suite is not a real Stripe sandbox transaction.

Run the explicit integration suite after installing @electric-sql/pglite in an isolated test environment:

```sh
NODE_ENV=test PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node tests/platform.integration.mjs
```

## Research and operational evidence

Read the [database migration record](docs/DATABASE_MIGRATION.md) and the [competitor and launch review](docs/COMPETITOR_AND_LAUNCH_REVIEW.md) and [dependency audit](docs/audits/dependencies-2026-10-31.json). The quality workflow runs regression, reference and isolated marketplace integration checks plus an advisory dependency audit on pushes and pull requests. Its initial GitHub execution must be verified separately.

## Activation and commercial launch

Read [the user guide](docs/USER_GUIDE.md) for the exact connection, merchant, email, administrator and backup steps. Owner-managed credentials are required. No fake inventory, operator or paid booking is seeded in production.

COMMERCIAL_LAUNCH_APPROVED must remain false until merchant onboarding, verified operator agreements, reviewed policies, production backups/restore, operational support and external security review are complete. A public deployment does not constitute aviation approval, a security certification, a payment licence or guaranteed global availability.

The active Neon Free database has no fixed trial expiry under the current plan. It has shared-project storage/compute limits, scale-to-zero and no uptime SLA. The old Render pilot database is retained but is no longer the application database; its expiry does not govern the active Neon database. Free web service sleep, provider rate limits and single-instance request limits make this a pilot rather than an enterprise availability commitment.

## Source map

- public/: responsive travel UI, booking and account portals, public guide and policy notice.
- render/platform/: PostgreSQL schema, account security, transactional marketplace and payment handlers.
- render/server.mjs: Node HTTP server and security headers.
- app/api/[...segments]/route.ts and lib/: retained public aviation APIs and provider adapters.
- render/reference/: SHA-256 verified compressed public snapshot parts.
- scripts/refresh-daily-reference.py and .github/workflows/reference-refresh.yml: public-reference update pipeline.
- infrastructure/aws/: earlier optional AWS foundation, not a deployed backend for this release.

OurAirports and Natural Earth references are public domain. Aircraft observations use adsb.lol under ODbL. Preserve notices in public/data/aviation-data-notice.html. Aircraft photography is reference photography, not evidence of operator inventory. An application-code licence and final brand/trademark clearance have not been selected.

## Global product review and flight discovery

Read the [31 October product research and gap audit](docs/PRODUCT_RESEARCH_2026-10-31.md) and [first paid booking checklist](docs/FIRST_PAID_BOOKING_CHECKLIST.md). Empty-leg discovery now supports passenger capacity, exact or flexible UTC dates, listing currency, earliest departure and price ordering within one currency, plus shareable search links. These features do not activate merchant collection or create real inventory.

Full-refund lifecycle tracking now includes signed callbacks, provider status refresh, duplicate-request protection and client dashboard progress. See [refund operations and acceptance limits](docs/REFUND_OPERATIONS.md). Merchant credentials and real sandbox acceptance remain pending; no live collection has been enabled.

Booking updates now use a durable encrypted email outbox with leases, bounded retries and private queue diagnostics. See [notification operations](docs/NOTIFICATION_OPERATIONS.md). Delivery is disabled until verified sender credentials are configured, and the free web host can sleep. See the [recovery drill and remaining Vercel routing follow-up](docs/RECOVERY_DRILL_2026-10-31.md); a complete production restore rehearsal is still outstanding.
