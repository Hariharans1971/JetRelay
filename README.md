# AeroShare

**Real aviation data. Clear provenance. A global charter marketplace in development.**

[Live website](https://aeroshare-global.perkyriver1.chatgpt.site) · [Repository](https://github.com/Hariharans1971/AeroShare) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)

## Deployment status

| Component | Status |
| --- | --- |
| Public website | Published on Sites / Cloudflare Workers |
| Airport and runway reference data | Dated, hashed snapshot; 247 country/territory codes |
| Aircraft observations | Real provider feed; refreshes while radar is visible, subject to coverage |
| Daily unattended reference refresh | Job prepared; not activated |
| Render | Account connected; services and databases not provisioned |
| AWS | Infrastructure prepared; not deployed |
| Booking, payments, private customer storage | Not enabled |

Publishing code to GitHub does not deploy it or activate daily updates. The current application is not yet ready to accept commercial bookings or sensitive customer documents.

Global aviation reference and observation workspace with a cloud backend. The original Next.js/FastAPI/PostgreSQL repository described in the master prompt has not yet been supplied. This repository continues the previously published Sites application; it is not a verified replacement for the missing commercial system.

## Actual implementation
- 86,311 OurAirports reference records and 48,386 runway records from a dated, hashed global public-domain snapshot.
- Server-side airport/city/country/IATA/ICAO search and bounded viewport queries; no global-aircraft browser download.
- Real Natural Earth country/coastline geometry, MapLibre GL JS 6.16.0, and a Leaflet SVG fallback when WebGL2 is unavailable. Overview-level geography, not a navigation chart.
- Backend adsb.lol ODbL aircraft observation adapter, timestamps/freshness, coordinate validation, coalescing, cache budgets and exponential backoff.
- Server-side NOAA AWC METAR connector with unavailable/error handling; actual external retrieval remains subject to provider access.
- No fake listings, prices, bookings, operators or live positions. No approved inventory exists. Commercial writes fail closed.
- Three manufacturer-sourced aircraft model references with source links and specification assumptions.
- Cloud deployment through Sites/Cloudflare Workers; **not** the proposed private AWS/PostgreSQL enterprise architecture.

## Read before commercial launch
[Full engineering report](docs/ENGINEERING_REPORT.md) contains the full prompt audit, all 25 acceptance criteria, source/licence comparison, AWS/Azure/GCP architecture/cost comparison, missing security/business workflows and phased implementation plan. The marketplace is not approved for commercial booking or enterprise resale. Original source, authorised operator inventory, identity/tenancy/transactional workflows and production controls are still required.

## Source layout
- `app/api/[...segments]/route.ts`: same-origin data APIs, constrained inputs, session/access and fail-closed write endpoints.
- `lib/aviation.ts`: sharded airport search/details/geography and inferred time zones.
- `lib/observations.mjs`: independent provider normalization/cache/backoff service, testable without cloud credentials.
- `public/workspace.html`, `app.js`, `style.css`: frontend.
- `public/radar.mjs`, `radar-fallback.mjs`: MapLibre and SVG geographic renderers.
- `public/data`: public reference shards and licence notice only; no private data.
- `lib/data/provenance.json`: source hashes, import date and counts.
- `scripts/import-reference.py`, `scripts/shard-reference.py`: reproducible reference ingestion; downloads are deliberately separate from import/migration.

## Verification
```
node --test tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit --pretty false
node --check public/app.js
node --check public/radar.mjs
node --check public/radar-fallback.mjs
```
Use the Sites build helper and source workflow for build/package/publication. Local preview uses `sites-preview start` according to the Sites skill. The production ASSETS binding must be preserved in the Vite configuration.

No database migrations, commercial cloud account, paid subscription or private provider credential is included. No cloud state or secret belongs in Git. Do not replace missing source observations with test fixtures in the production runtime.

## Runtime and deployment prerequisites

The retained project uses TypeScript, React, Vinext/Next-compatible routes, and Cloudflare Workers. Node.js 22.13 or later and the package manager version declared in `package.json` are required. Use the existing install/build scripts and preserve the ASSETS binding. The current `start` command is a local Wrangler preview command, not a Render production server.

For a Render migration, adapt Cloudflare module imports and asset reads, provide a production HTTP server listening on the assigned port, replace hosting identity with verified sessions, and validate deployment before enabling privileged workflows. Do not forward untrusted identity headers. See [AWS foundation](infrastructure/aws/README.md), [engineering report](docs/ENGINEERING_REPORT.md), and [repository settings](docs/GITHUB_ABOUT.md).

## Data and licensing

OurAirports and Natural Earth supply public-domain reference data. Aircraft observations use adsb.lol under ODbL 1.0; NOAA AWC supplies weather observations. Preserve the source-specific notices in `public/data/aviation-data-notice.html` and bundled vendor licences. Airport time zones are geographic estimates. Manufacturer model specifications are reference information, not verified aircraft inventory.

An application-code licence has not been selected. No open-source licence or commercial security certification should be inferred from this public repository.

## Render runtime

The `render/` adapter serves the existing interface and public aviation APIs on Node.js 24, bound to `0.0.0.0:$PORT`. Hosting identity headers are removed before routing; account access and commercial writes stay disabled until verified authentication and transactional storage are implemented.

```sh
npm ci --prefix render --ignore-scripts
node render/restore-reference.mjs
node render/build.mjs
node --test tests/*.test.mjs
node dist-node/server.mjs
```

The full dated public reference snapshot is preserved losslessly in `render/reference/snapshot-*.part`, with SHA-256 checks on every part. The restore command verifies and expands it into `public/data`. Source import and sharding scripts remain included. These are public reference files, not private customer storage.

Render build: `npm ci --prefix render --ignore-scripts && node render/restore-reference.mjs && node render/build.mjs && node --test tests/*.test.mjs`. Start: `node dist-node/server.mjs`. Set `NODE_VERSION=24.22.1`. A free instance can suspend when idle; this is an initial public-data deployment, not a high-availability commercial service.
