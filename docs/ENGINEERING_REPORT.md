# AeroShare engineering report — 30 October 2026

## Decision and scope
The original master prompt has been reviewed in full, including its 25 acceptance criteria. The requested goal is a real global commercial platform. The first delivery did not meet that goal: it was a static, illustrative frontend with no live source or real geographic map. This update removes illustrative route inventory, imports real public reference datasets, adds server endpoints and a real geographic map, and implements a live observation adapter with honest availability and freshness handling.

The user selected **“I will provide it”** when asked for the existing Next.js/FastAPI/PostgreSQL repository. That repository has not yet been supplied. Its backend, data, migrations, security, claimed eleven integration tests, Docker images and original ADS-B connector cannot be audited or upgraded from a requirements document. The current Sites repository is the previously created site; it must not be described as the missing original system.

**Commercial launch is not approved.** No operator inventory, genuine empty-leg reference, contract, commercial tracking SLA, cloud account, or operator onboarding evidence was supplied. No booked flight or sale is invented. The platform intentionally denies commercial write operations until a verified backend is connected.

## Audit and implemented changes

| Area | Previous state | Current implementation | Files / evidence |
|---|---|---|---|
| Hosting | Static HTML | Server routes on a Vinext/Cloudflare Worker deployment through Sites; public asset delivery | `.openai/hosting.json`, `vite.config.ts`, `worker/index.ts`, `app/api/[...segments]/route.ts` |
| Airports | 14 hardcoded samples | 86,311 sourced reference records, including closed records; search/map exclude closed facilities | `scripts/import-reference.py`, `scripts/shard-reference.py`, `lib/data/provenance.json` |
| Search | Browser sample list | Server-side query, code matching, ranking, pagination and capped results; bounded public asset shards | `lib/aviation.ts`, public airport-search/detail/geographic shards |
| Runways | None | 48,386 source runway records associated with 41,257 airport identifiers | Airport detail API and provenance tests |
| Global geography | Decorative invented SVG shapes | Actual Natural Earth country/coastline polygons, MapLibre GL JS 6.16; Leaflet 1.9.4 SVG compatibility renderer when WebGL2 is absent | `/data/world.geojson`, `public/radar.mjs`, `public/radar-fallback.mjs` |
| Tracking | None | Backend adsb.lol geographic adapter, normalization, validation, deduplication, timestamps, age labels, capped cache/coalescing, timeout and backoff | `lib/observations.mjs`, 8 unit tests |
| Weather | None | Server-side NOAA AWC METAR connector, 5-minute cache, per-isolate budget and unavailable fallback | `route.ts`; external retrieval has not succeeded in this environment |
| Model references | Unsourced examples | Three manufacturer-sourced model records with specification basis, source URL/date and no inventory claims | `public/app.js`; not a comprehensive aircraft registry |
| Empty legs | Illustrative route cards | No simulated inventory. API returns no approved operator opportunities; no price or bookability is invented | `/api/listings`, discovery and empty-leg screens |
| Personal data | Local enquiry drafts | No new customer contact/itinerary collection; commercial writes fail closed; only model favourites persist locally | Session/access endpoints, frontend |
| Authentication | Portal selector | Hosting identity can establish a customer ID; no self-assigned operator/admin role. Business write endpoints deny unauthenticated/unauthorised requests | `/api/session`, API method handlers |
| Production cloud | Not provisioned | Sites cloud runtime only. AWS/Azure/GCP production accounts and paid infrastructure remain unprovisioned | Proposed architecture/cost plan below |

No pre-existing user database or migration was altered. No paid third-party subscription, cloud account or commercial API contract was activated. Public reference imports are versioned static snapshots, not a continuously refreshed operational database.

## Source/licence and provider comparison

Sources were checked on **30 October 2026** against official pages. Pricing below is in **USD**, excludes tax, and is not a purchase authorisation. “Unknown” means it was not independently established, rather than assumed unlimited.

| Provider | Coverage / functionality | Access and budgets | Commercial use / redistribution / caching | History, latency and cost | Decision |
|---|---|---|---|---|---|
| [adsb.lol](https://api.adsb.lol/docs), [open API](https://www.adsb.lol/docs/open-data/api/), [capacity terms](https://www.adsb.lol/request) | Receiver-dependent global observations; point/radius query up to 250 nm; type, registration and ICAO queries. Does not prove ownership or availability | Public API connectivity succeeded from the executor. Keys can be requested. Official fixed guaranteed free request budget was not identified; best-effort access can be rate-limited | ODbL 1.0. AeroShare publishes the normalized observation query as a separate open derivative database with attribution and machine-readable pagination; no private inventory database is combined. Caching must continue to respect ODbL and provider terms | No purchased SLA or guaranteed latency. [Historical archives](https://www.adsb.lol/docs/open-data/historical/) exist under ODbL; not integrated. Free access has no commercial guarantees; guaranteed capacity requires a provider arrangement | Implemented best-effort adapter; insufficient as the sole guaranteed enterprise feed |
| [OpenSky terms](https://opensky-network.org/about/terms-of-use) | Live/historical aircraft data; coverage depends on sources. No universal private-aircraft visibility promise | Written agreement required for commercial entities **and operational API use**. Auth/budgets depend on that agreement | No commercial use or permitted failover assumed. Contract must expressly resolve map display, cache retention, redistribution and derivative rights | Commercial quote required. Historical access is not a general commercial free tier | Not activated |
| [ADS-B Exchange developer hub](https://www.adsbexchange.com/community/developer-hub/), [commercial licensing](https://support.adsbexchange.com/hc/en-us/articles/37363886073613-I-m-building-a-project-for-my-company-but-we-aren-t-making-money-off-of-it-can-I-get-a-free-API-key) | Global terrestrial network, live position/type queries. Coverage gaps remain | Developer page advertises $10/month for 10,000 requests and 500 ms updates; **that is not a commercial licence** | Commercial-entity projects require commercial licensing; obtain enterprise terms for caching, downstream display and redistribution | Enterprise quote; historical/enriched sets available by product | Request production quote after volume/rights are defined |
| [FlightAware AeroAPI](https://www.flightaware.com/commercial/aeroapi/) | Global flight status/tracks, history/alerts in commercial tiers; satellite datasets are an additional commercial feature | Personal 10 result sets/min; Standard 5/sec; Premium 100/sec, per current product table. API key is backend-only | Personal is not commercial. Standard permits business/B2C derivative use; Premium covers B2B as well. Detailed retention/re-display obligations remain contract-specific | Standard minimum **$100/month**; Premium minimum **$1,000/month**, plus query fees. Premium page lists 99.5% uptime guarantee; actual contract scope must be confirmed | Leading commercial procurement candidate when global contractual support is needed; not activated |
| [AirNav Radar services](https://www.airnavradar.com/api/services), [pricing](https://www.airnavradar.com/api/pricing) | Ground/satellite and other sources; live/historical API products. Actual business-aircraft, redistribution and geographical coverage by plan must be confirmed | Business account; credits per result, not simply per HTTP request. Starter 10,000 credits; higher tiers available | Client/app integration described; complete caching/storage/downstream rights require review, not inference | Starter **$119.95/month**, Developer **$299.95**, Enterprise **$999.95** on published page. No universal latency guarantee inferred | Alternative enterprise quote; not activated |
| [OurAirports](https://ourairports.com/data/) | Worldwide airports, countries, regions and runways; community maintained | Nightly upstream CSV publication. Current site uses a dated, hashed import; not a live aerodrome feed | Public domain; no accuracy/fitness guarantee | No dataset licence charge; hosting/ingestion still has cost | Integrated |
| [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) | Global overview country boundaries and coastlines, **1:110m** scale | Self-hosted geometry avoids an external tile-per-view API | Public domain, including commercial reuse | No data licence charge; no street detail, terrain, aeronautical chart or taxiway guarantees | Integrated genuine geographic overview basemap |
| [MapTiler](https://www.maptiler.com/cloud/pricing/), [terms](https://www.maptiler.com/terms/cloud/) / [Mapbox](https://www.mapbox.com/pricing) | Alternative detailed commercial basemaps and geocoding | Restricted browser tokens, attribution, quotas and plan selection required | MapTiler Free is limited to noncommercial/R&D use; do not launch a selling marketplace on it. Mapbox terms/pricing must be separately scoped | Paid plan/usage quote required; none purchased. No public OSM tile service is used as a production entitlement | Detailed tiles optional after explicit budget approval |
| [NOAA AWC API](https://aviationweather.gov/data/api/), [NWS disclaimer](https://www.weather.gov/disclaimer) | Worldwide METAR/TAF where reported; no guarantee a chosen airport has a current report | Official limit 100 req/min; most queries max 400 records. CORS not permitted; server-side requests required. AeroShare uses 20/min per isolate, five-minute METAR cache | NWS public-domain information unless otherwise noted; preserve source/time, no government endorsement | No data access charge assumed for the documented public service; no purchased SLA. External access currently fails from the preview | Connector implemented; actual weather retrieval remains unverified |
| [FAA releasable registry](https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download) | US civil registry only, not a global registry; source notes personal-information withholding procedures | Download/import pipeline required; not accessed in this change | Do not republish owner personal details or evade withholding. Registration is not charter authorisation | No global specification completeness, airworthiness guarantee or inventory proof inferred | Evaluated, not imported |

EASA/national registries and licensed global aircraft reference providers remain outstanding. No worldwide aircraft ownership database is claimed. Airport geocoding is based on the reference dataset; no address geocoder is required for the current flows. No commercial feed is silently used as an unauthorised failover.

### Observation and freshness policy
Provider `now` (seconds or milliseconds, normalized) minus `seen_pos` produces the observation time. Missing position age/timestamp yields no usable observation. LIVE ≤60 s; DELAYED ≤180 s; STALE ≤600 s. Invalid coordinates, duplicates, invalid ICAO24, future >30 s and age >600 s are rejected. Stale records remain stationary; no invented route, destination or extrapolated aircraft movement is drawn.

Each regional query uses the rounded map centre and a 250 nm radius. Returned positions are filtered again by viewport. Payloads are capped at 1,000 and paginated with `offset`; airports are capped at 350 viewport records and large-airport-only at overview zoom. This is a **query coverage subset**, not every aircraft in the viewport or the world. Display type filtering uses only provider-supplied ICAO types and does not pretend an incomplete static list identifies all private jets.

Backend cache: 30 s, 24 cells/isolate, concurrent request coalescing; client polling 60 s while visible; upstream timeout 10 s; exponential backoff/jitter and Retry-After. Upstream budget 12/min/isolate. Provider health/memory cache are instance-local, not centrally durable. A commercial deployment still needs an account-wide limiter and controlled ingestion service with a contracted request budget. The public API has a 120/min/IP/isolate request guard, not a claim of enterprise DDoS mitigation.

## AWS vs Azure vs GCP

| Requirement | AWS | Microsoft Azure | Google Cloud |
|---|---|---|---|
| Existing container stack | ECS Fargate for separate Next.js and FastAPI services | Container Apps or App Service | Cloud Run services; comparatively simple container scaling |
| Private PostgreSQL | RDS PostgreSQL in private VPC subnets | PostgreSQL Flexible Server private VNET integration/Private Link | Cloud SQL private IP/Private Service Connect |
| Encryption/secrets | RDS/S3 encryption; KMS; Secrets Manager | Encryption at rest; Key Vault and managed identity | Cloud SQL/Storage encryption; Secret Manager, KMS and service accounts |
| Customer/admin identity | Cognito or retained sound original provider; mandatory admin MFA | Entra External ID and appropriate admin policies | Identity Platform or retained provider; IAM is not itself customer login |
| Confidential files | Private S3, Block Public Access, SSE-KMS, scoped presigned URLs | Private Blob + private endpoints/scoped access | Private Cloud Storage + uniform bucket access/scoped URLs |
| Backups and recovery | RDS automated backups/PITR; retained encrypted snapshots; restore testing | PostgreSQL managed backup/PITR; restore testing | Cloud SQL automated backups/PITR explicitly enabled in IaC; restore testing |
| Edge/security | ALB, managed TLS, WAF; CloudFront only when justified; CloudTrail, GuardDuty as scoped | Front Door/Application Gateway WAF; Monitor/Defender as scoped | HTTPS LB/Cloud Armor; Logging/Monitoring/Security Command Center as scoped |
| Operations | More individual network/service components, strong control for the existing stack | Best fit for an existing Microsoft organisation; identity/region complexity must be priced | Simplest container lifecycle, but private database/network, HA and security still cost money |
| Trial/free-tier limits | Eligibility and credits are temporary; not an HA production budget | Trial/12-month offers are not ongoing production cost | $300 trial/usage allowances are not an HA production budget |
| Region proposal | **ap-south-1 (Mumbai)**, subject to confirmed business/data-residency requirements | Central India, if selected | asia-south1 (Mumbai), if selected |
| Primary recommendation | **Recommended for the requested original Next.js/FastAPI/PostgreSQL stack**, subject to original audit and approval | Alternative if client organisation already operates Azure | Alternative if operational simplicity is decisive and no existing cloud commitment |

Recommendation is an engineering judgement, not proof that AWS is universally cheaper. AWS fits the explicitly requested private networking, isolated PostgreSQL, private documents and two container services without replacing the stack. Start in one region with two availability zones; do not add multi-region database writes, Kubernetes, Redis, Kafka or PostGIS without measured need. Use a global CDN for public assets, not for confidential booking payloads.

Official references: [AWS Fargate pricing](https://aws.amazon.com/fargate/pricing/), [RDS PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/), [RDS encryption](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html), [RDS VPC](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html), [Azure Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/), [Azure PostgreSQL pricing](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/), [Azure PostgreSQL private network](https://learn.microsoft.com/en-us/azure/postgresql/network/how-to-networking), [GCP Cloud Run pricing](https://cloud.google.com/run/pricing), [Cloud SQL pricing](https://cloud.google.com/sql/pricing), [Cloud SQL private connectivity](https://docs.cloud.google.com/sql/docs/postgres/connection-options), [Cloud SQL backup/PITR](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/configure-pitr).

### Cost model and approval boundary

**Planning allowances only**, 30 October 2026, USD, Mumbai/India regions for proposed infrastructure, no credits/discounts or tax assumed. These are conservative engineering budget ranges, **not verified calculator exports or supplier quotations**. Official price calculators have been identified; a workload-populated, saved calculator estimate still needs to be prepared against the final architecture and commercial source contract before purchase: [AWS](https://calculator.aws/), [Azure](https://azure.microsoft.com/en-us/pricing/calculator/), [GCP](https://cloud.google.com/products/calculator).

Assumptions: initial 20,000 visits/month, 1 million application API requests/month, 50 GB public egress, 100 GB database storage including growth headroom, 20 GB private files, roughly 10 GB logs/month, two app replicas per service in production, multi-AZ production PostgreSQL, 35-day proposed backup retention. Tracking cost depends on active regions, concurrency, map sessions, provider per-result charging and explicit poll budget—not visitor count alone. At a single active cell/minute, continuous 60 s polling is 43,200 upstream requests per 30-day month before cross-instance effects. Do not select a 10,000-credit plan for that traffic without measurement.

| Proposed AWS component | Monthly production planning allowance | Requirement / boundary |
|---|---:|---|
| Container application hosting, load balancer, private networking/NAT or endpoints | $120–250 | Scope depends on Next.js/FastAPI actual memory/CPU, AZs and external provider access |
| Managed private PostgreSQL + primary storage + multi-AZ capacity | $150–300 | Instance/version/storage/HA must be quoted; no publicly accessible DB |
| Private objects, transfer and public CDN | $10–35 | Versioned document storage, expected 20 GB files/50 GB egress |
| Logs, alarms, audit, secrets, KMS and selected security services | $30–100 | Do not enable every optional security service indiscriminately |
| Additional backup retention/recovery allowance | $15–50 | Deduct provider-included allowances only after actual configuration is quoted |
| **Infrastructure subtotal** | **$325–735/month** | Planning allowance; arithmetic and exclusions below |

Arithmetic: minimum $120+$150+$10+$30+$15 = **$325/month**; maximum $250+$300+$35+$100+$50 = **$735/month**. Use **$325–735/month** as the production infrastructure planning range. Small development may be **$30–100/month** if containers stop when idle and data is synthetic; staging **$100–250/month** if single-AZ without real customer records. These are availability tradeoffs, not the production architecture.

| Environment / alternative | Infrastructure allowance, USD/month | Not included |
|---|---:|---|
| AWS development | $30–100 | Commercial feeds, staff/support, taxes |
| AWS staging | $100–250 | Commercial feeds, staff/support, taxes |
| AWS production | $325–735 | Commercial feeds, staff/support, taxes |
| Azure development / staging / production | $30–120 / $100–300 / $350–850 | Same exclusions; no populated calculator comparison yet |
| GCP development / staging / production | $25–100 / $90–250 / $300–750 | Same exclusions; no populated calculator comparison yet |

Aviation access budget: FlightAware Standard has a published $100 minimum plus usage but **does not cover B2B**; Premium starts at a $1,000 minimum plus usage and may fit a platform selling to both customers and operators. ADS-B Exchange enterprise and adsb.lol guaranteed capacity require quotes. AirNav's entry fee is not a guarantee sufficient per-result volume. Detailed map tiles/geocoding and comprehensive licensed aircraft specifications may add further contract-dependent cost. The current self-hosted public-domain overview map/reference data has no dataset licence fee, but compute/storage/egress are never presumed free.

Thus an AWS production planning range **with FlightAware Premium minimum** is **$1,325–1,735/month plus usage, extra datasets/tiles, support, taxes and overages**. No price cap or production promise follows from this estimate. A cheaper best-effort feed is a product risk tradeoff, not enterprise contractual availability.

No AWS/Azure/GCP paid services are provisioned. Approval is needed only after the repository audit and a concrete provider plan/region/service list/calculator estimate are ready, as required by section 13 of the user's prompt. Existing Sites publication does not mean this target private-network/PostgreSQL architecture is deployed.

## Target data and security architecture
Public airport/model records and open ODbL observations stay separate from operator inventory, internal schedules, proposals, quotations and customer records. The current frontend calls same-origin backend adapters; it never calls a private provider API directly or receives secrets.

For the original transactional backend: use PostgreSQL constraints/transactions and appropriate locks on aircraft schedule/availability versions when accepting quotes. Proposals must link to a valid originating charter, authorised organisation, aircraft, expiry and schedule revision. Admin approval never follows from a public position. Amendments/cancellation require revalidation/suspension. Concurrent acceptance must yield one booking and a conflict for competing requests, with an immutable/tamper-evident audit event recorded transactionally. These rules are **not implemented in the absent backend**, and the current UI does not pretend otherwise.

Data classes: public reference/approved listings; internal organisation/schedule data; confidential contacts/contracts/negotiated quotes/documents; highly restricted credentials/authentication/security records. Backend scoping must derive organisation membership from authenticated identity, not client input. Public map payloads may not carry customer/operator relationships or private itineraries. Signed URL issuance must be scoped, size/type validated, short lived, and malware scanning determined from upload risk.

Current controls: same-origin API calls; hardcoded upstream destinations (no arbitrary URL proxy); bounded inputs; server-side role/identity checks fail closed for commercial writes; no provider keys in browser; no new customer personal-data collection; CSP and response security headers in source; no fabricated booking counts/certifications. The existing source uses no new sensitive Terraform state or local production secret files. Global account-wide abuse controls, admin MFA, encryption/DB roles, private storage, WAF policies and backup restore evidence remain absent.

Proposed recovery objectives, subject to business approval: **RPO 15 minutes, RTO 4 hours**, not achieved/measured. Proposed 35-day encrypted automated backups/PITR; monthly isolated restoration with row counts/checksums and booking/audit integrity checks; quarterly disaster-recovery exercise. An alerting owner/escalation rota, incident runbooks and monitoring for failed backups, provider rate limits, suspicious admin activity, 5xx/latency and access-control failures are required before launch.

Privacy/compliance: operating entities/regions, broker/operator responsibilities, contracting, taxes, passenger requirements, DPAs, GDPR/India DPDP applicability, retention/deletion and data residency require qualified review. No ISO, SOC 2, GDPR compliance or aviation certification claim is made. Payments are not enabled; use an approved hosted payment service if introduced rather than storing card credentials.

## Original acceptance criteria — explicit assessment

| # | Requirement | Assessment |
|---:|---|---|
| 1 | Existing working features preserved | Original repository not supplied; cannot establish |
| 2 | Sourced global airport search | Implemented; source/import tests and Chennai browser journey pass |
| 3 | Aircraft reference provenance | Partial: 3 manufacturer references, not a global aircraft registry |
| 4 | Legitimate licensed tracking source | ODbL adapter and licence disclosure implemented; no commercial SLA |
| 5 | Actual globally updating positions | Adapter implemented; preview external fetch failed. Hosted verification required; never universal coverage |
| 6 | Freshness/source/limitations visible | Implemented |
| 7 | Missing/stale handling honest | Unit-tested, UI unavailable behavior verified |
| 8 | Filters/clustering/viewport queries | Implemented; SVG fallback browser checks; primary WebGL renderer unavailable in test browser |
| 9 | International route search | Global airport selection implemented; actual approved inventory absent |
| 10 | Operators limited to own inventory | Writes denied; real organisation inventory workflow absent |
| 11 | Proposals tied to valid charters | Not implemented; original backend required |
| 12 | Admin approval enforced | Writes denied; approval workflow absent |
| 13 | Real enquiries and quotations | Not implemented; commercial writes disabled |
| 14 | Booking/race prevention | Not implemented; no booking offered |
| 15 | Tenant data isolation | No commercial data accepted; tenant engine unimplemented |
| 16 | Sensitive documents protected | No document uploads enabled; private storage not provisioned |
| 17 | Approved cloud architecture | Cloud recommendation prepared; no paid AWS/Azure/GCP infrastructure activated |
| 18 | Private DB/storage | Not provisioned |
| 19 | Encryption/secrets/IAM/MFA | Platform HTTPS only is insufficient; production controls unconfigured |
| 20 | Restore/monitoring tested | Not done; cannot claim operational |
| 21 | HTTPS/security verified | Source headers implemented; hosted HTTPS verified by deployment, deeper TLS/security review pending |
| 22 | Frontend production build | Vinext production build executed successfully; final unchanged-source build/package required |
| 23 | Backend tests | 13 actual Node data/adapter tests pass; these are not the missing FastAPI/PostgreSQL tests |
| 24 | Browser end-to-end | Airport search/detail and map fallback exercised; full booking journey impossible without backend |
| 25 | Accurate deployment documentation | This report and deployment manifest explicitly distinguish actual implementation from the target |

## Phase-by-phase next implementation plan

| Priority | Coherent change | Affected implementation | Migration/testing impact |
|---|---|---|---|
| 1 | Receive and audit original repository | Actual frontend/backend/config/tests paths must be discovered | Run original checks and 11 claimed PostgreSQL integration tests; do not invent paths/results |
| 2 | Preserve original auth and add tenant/IDOR regression tests | Existing auth/membership/service/query layers | No destructive migration; verify cross-customer/operator/admin attempts |
| 3 | Integrate this public reference data and provider adapter into original FastAPI/MapLibre | Port normalized schemas/search ingestion; preserve licences/cache budgets | Versioned reference backfill separate from schema; no every-position permanent storage |
| 4 | Implement/repair originating charter, schedule, proposal, admin and quotation invariants | Original domain services/schema/migrations | Append reviewed migrations; real PostgreSQL concurrent acceptance tests mandatory |
| 5 | Connect client routes to real listings/enquiry/quote APIs | Existing customer/operator/admin portals | Real end-to-end testing with authorised seeded test organisations, never public invented inventory |
| 6 | Finalise commercial provider contract and AWS calculator plan | Provider secret references, budgets, procurement record, infrastructure source | Approval before paid resources; no secrets in manifests or state committed to Git |
| 7 | Provision approved staging, private PostgreSQL/files, identity/MFA and migration pipeline | Cloud IaC and CI/CD | Review plan; create budgets/alerts; restore/penetration/backup tests before production |
| 8 | Production rollout and operational acceptance | Controlled deployment, runbook, monitoring and business sign-off | Test restore, alerts, legal/privacy pages, capacity and rollback; satisfy all criteria |

## Actual verification commands and limitations
- `node --check public/app.js`, `node --check public/radar.mjs`, `node --check public/radar-fallback.mjs`: executed, pass.
- `node node_modules/typescript/bin/tsc --noEmit --pretty false`: executed, pass after backend/API additions.
- `node --test tests/*.test.mjs`: **13 pass, 0 fail**. Includes normalization, freshness boundaries, invalid/duplicate/missing values, concurrent coalescing/cache, 429/backoff, request budgets, malformed schema, eight-continent airport/code references, search shards, runway data, actual polygons and provenance hashes.
- Production build via Sites helper: executed successfully with server routes and ASSETS binding. Final deployment packaging/build is recorded by the Sites workflow.
- Browser: Chennai search returned four sourced references; Chennai International Airport detail showed MAA/VOMM, geographic coordinates, Asia/Kolkata, runways 07/25 and 12/30 with source dimensions. Pass.
- Browser METAR call: unavailable, not represented as successful weather data.
- Browser MapLibre initialization: WebGL2 unavailable in the test browser. Added and exercised actual geographic SVG compatibility renderer; do not claim primary GPU renderer was browser-verified.
- Browser provider call returned unavailable with an upstream environment error. No fake positions substituted. Deployed API connectivity must be independently verified.
- No Docker, original FastAPI integration, PostgreSQL concurrency, private DB/IAM, backup restoration, central monitoring, admin MFA or full commercial-booking test was run.

The site can deliver real geographic/reference exploration and a best-effort data integration. It is **not currently sellable as an enterprise charter booking platform**. The missing original repository, operator authority/inventory, appropriate production feed capacity, cloud account/budget approval and verified commercial/security workflows are concrete blockers, not UI styling tasks.

## Post-deployment verification addendum — 30 October 2026, 15:49–15:53 UTC

The earlier preview limitations above describe preview observations before the release. The following later checks were performed against the **actual deployed cloud runtime**, not mocked responses:

- Saved application version 2, source commit `07d9596ab5579eb83b68e6dbc48b1fe0ce46d9f8`, was deployed successfully. The first native request timed out at the tool boundary; version/deployment lookup confirmed that it had actually saved and deployed, so no duplicate version was created. Public access was then enabled at the user's explicit request for an online global client website. The same saved version was republished to reconcile the audience change.
- Successful deployment ID: `appgdep_6ae4bc21fbc08191820db08cffe22aa0`. Origin: `https://aeroshare-global.perkyriver1.chatgpt.site`; verified browser landing path `/workspace`. Public browser access works without signing in.
- Deployed London-region map returned **824 provider aircraft observations, 822 within the LIVE threshold** at the screenshot observation. This is a time-specific verification result, not a permanent platform statistic or a global fleet count.
- Selecting an actual displayed aircraft showed source-supplied callsign/type/registration/ICAO24, altitude, ground speed, track, vertical rate, ADS-B position method and observation timestamp. Origin/destination remained unavailable rather than inferred. These aircraft are not represented as charter inventory.
- Selecting Mumbai returned **37 recent observations**, confirming a second real geographic query. Counts change with time and coverage; this does not verify all worldwide regions or all aircraft.
- Deployed `GET /api/weather?icao=VOMM` returned `AVAILABLE` with a real NOAA AWC report observed **2026-10-30T15:30:00Z**: wind 150°/8 kt, temperature 30°C, dew point 27°C, pressure 1013 hPa, and the raw provider METAR. This verifies current METAR retrieval on the cloud runtime; it does not verify TAFs or every global station. The preview's earlier weather failure was not the deployed result.
- Deployed public `GET /api/admin/approvals` rejected the unauthenticated browser with `Sign in required`. This verifies this fail-closed endpoint only, not a complete operator/admin RBAC/tenant system.
- Geographic boundaries, airport markers, clustering, aircraft markers, region switching and aircraft detail selection were browser-tested using the SVG compatibility renderer. The GPU MapLibre path still could not be exercised because this browser lacks WebGL2.
- An independent executor-host HTTPS verification script could not reach the deployed hostname from that host's network. It was stopped; browser/cloud-runtime observations above are the evidence. No network restrictions were bypassed.

Updated acceptance assessments: #5 is now **real provider observations verified in London and Mumbai**, with explicitly non-universal coverage and best-effort refresh. #10–20 remain incomplete for the genuine commercial backend. #24 has additional live data/map/weather read journeys verified, **not** an end-to-end quotation/booking workflow. The application is now a deployed real-reference/live-observation application, but still **not an approved enterprise-selling charter marketplace**.

This addendum is documentation of the already deployed application version; it does not change the deployed runtime or assert that the missing original repository, managed PostgreSQL, private documents, admin MFA, centrally coordinated ingestion, backups, restore tests or commercial booking workflows exist.

## Subsequent request: professional search layout, portal access and AWS daily sync

The client added a BlaBlaCar reference, requested functional portal access and specified AWS/Azure/GCP storage. AWS was selected in the user's choice. The existing site remains hosted on Cloudflare Workers; **no AWS storage or scheduled job has been deployed**.

Changes prepared in this revision:
- Original AeroShare public journey-search layout: horizontal navigation, prominent origin/destination/date/passenger search, clearer exploration pages, operator entry point, customer/admin/operator workspaces and international data references. The reference website could not be inspected: automatic browser approval failed because the approval service was at capacity. No exact visual-match claim is made, and its branding/assets were not copied.
- Replaced blanket `admin_authorised:false` with backend-derived roles. The current verified Site owner's sign-in email is configured as a **secret** server allowlist for admin access; no email is committed or exposed to anonymous visitors. Stable site user IDs are supported for permanent admin assignment. Operators require a server-assigned, verified organisation membership tied to stable user ID. Public visitors cannot self-select privileges.
- Dedicated sign-in/account workspaces replace dead-end access-denied dialogs. Signed-in unverified operators can see their onboarding stage without obtaining inventory publication rights. Admin operational data is available only to authorised identities; sensitive writes remain locked pending the real backend. Actual owner sign-in cannot be impersonated for testing, so positive hosted owner-access testing awaits the owner signing in.
- Added response-size/text bounds, cache observation-count caps, provider timeout regression coverage and shared 30-second edge caching. These reduce resource/ingestion risks; per-isolate request budgets still do not constitute an account-wide contracted quota or a complete enterprise abuse/WAF solution.
- Added an AWS reference-reader integration that accepts only a server-configured HTTPS CloudFront origin, validates versioned manifests and provenance, coalesces checks, and retains the last validated snapshot after a failure. It is dormant until an actual AWS reference origin is connected. Public geography/airport API data can then change without republishing the website.
- Added a daily source-validation and S3 snapshot-publication job. It preserves the active manifest on failed object upload and preserves import provenance on unchanged data. The job passed a dry run against all 86,311 airports, 48,386 runways and 247 country/territory codes; this did **not** publish data to AWS.
- Prepared AWS IaC for private encrypted PostgreSQL, a separate encrypted private-document bucket, a separate public-reference bucket behind read-only CloudFront origin access, a non-root restricted ECS refresh task, a 03:30 Asia/Kolkata daily EventBridge schedule, failure metrics and budgets. HCL syntax parsed; Terraform provider validation, cloud plan/apply, Docker build, actual daily execution, central alert delivery and backup restoration are **not executed**. See `infrastructure/aws/README.md` for deployment boundaries and missing inputs.

Live aircraft updates remain requested every 60 seconds only while the radar is visible. Weather is requested on demand and cached for 5 minutes. The public reference dataset remains the dated bundled snapshot until the AWS pipeline is deployed and its published origin is verified. Preparing a scheduler declaration is not the same as activating unattended daily updates. No automation is advertised as active.

Tests in this revision: 27 actual Node tests passed (access, provider adapter, reference reader and imported references); four Python publication tests passed; global import dry run passed; type checks passed after the changes. Final production build and browser checks are recorded during publication. Full commerce/tenant/MFA/backup/security sign-off remains blocked by missing original code, real operator data and the unconnected AWS account/paid-service approval.
