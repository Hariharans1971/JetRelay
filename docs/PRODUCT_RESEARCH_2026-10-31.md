# JetRelay global product review and implementation record

Reviewed 31 October 2026. Scope: selected public official pages across charter marketplaces, operators, business aviation software and pilot tools; JetRelay source and automated tests. This is not an exhaustive review of every aviation website, a private-account competitor test, a penetration test or a flight-safety certification. Competitor content can change. Product decisions below are our interpretation, not claims that competitors lack these features.

## Market observations

| Official source and regional lens | Observed public pattern | Implication for JetRelay |
| --- | --- | --- |
| [Victor](https://www.flyvictor.com/en-us/faq/chartering-flight/), UK/global | Route/date discovery, aircraft/operator transparency and special cancellation conditions for empty legs | Expose operator identity and cancellation terms; keep dependency on the original charter explicit |
| [Paramount Business Jets](https://www.paramountbusinessjets.com/empty-leg-flights), US/global | Dedicated empty-leg discovery alongside aircraft, airport and advisor resources | Keep the route search central; supply useful reference information without implying every aircraft is for sale |
| [JetSetGo JetSteals](https://jetsetgo.in/jetsteals), India | Empty-leg enquiry form and a stated follow-up window | An accountable operator response process is as important as the form; do not promise response times without staffing |
| [LunaJets](https://www.lunajets.com/en/empty-leg-flights), Europe/global | Repositioning offers and advisor help when travel requirements differ | Flexible discovery is useful; rerouting requires actual operator approval, not an algorithmic promise |
| [Athena Jets](https://www.athenajets.com/empty-legs/), Asia-Pacific | Route/date/flexibility search, whole-aircraft pricing and an update timestamp | Add bounded date flexibility, clear currency and timestamps; never manufacture an inventory freshness time |
| [Air Charter Service](https://www.aircharterservice.com/private-charter/empty-legs), international | Empty-leg explanation and specialist-assisted discovery | Explain the journey and connect supply through consenting operators |
| [Avcon Jet UAE](https://www.avconjet.ae/empty-legs/), Middle East/international | Aircraft, route and date cards with enquiry actions and update subscriptions | Inventory needs an operator-owned lifecycle; cached listings are not proof a flight remains available |
| [ExecuJet contacts](https://www.execujet.com/contact-us/), Africa/Australasia/global | Regional locations, contacts and local operating hours | Publish real support coverage when staffed; do not invent a worldwide support desk. This contact-page review does not verify its booking features |
| [Avinode operators](https://avinode.com/operator/), B2B/global | Fleet marketing, marketplace sourcing, integrations and charter payment workflows | Operator acquisition and contracted inventory connectivity are separate projects, not a free public flight feed |
| [ForeFlight Mobile](https://www.foreflight.com/products/foreflight-mobile/), pilot/global | Dedicated flight planning, weather, charts, documents and pilot workflows | Keep JetRelay focused on commercial discovery/reference. Do not present it as a dispatch, navigation, runway-performance or electronic flight-bag replacement |

Additional Latin America lead: [Flapper's empty-leg update article](https://flyflapper.com/stories/how-to-stay-informed-about-empty-legs/) appeared in search, but opening it hit an anti-bot page. Its current logged-in experience and channel behaviour were not verified. No claim of complete worldwide competitor coverage is made.

No competitor inventory, images, branding, private data or authenticated content was copied. Research does not establish API access, commercial display rights or a partnership.

## What was built in this pass

- Server-side passenger capacity filtering, exact/plus-or-minus one/three-day UTC departure-date discovery and listing-currency filtering.
- Earliest-departure ordering; price ordering only within one selected currency. No currency conversion or misleading comparison of different monetary units.
- Bound SQL parameters, fixed allowlisted sort expressions and validation of calendar dates, passenger integers, currencies and flexible windows.
- Shareable search links containing filters only, with restored search state on reload.
- Both departure and arrival shown in device time and UTC, alongside whole-aircraft total, currency, operator, registration and cancellation terms.
- Bounded first-100 results with an explicit refine-search hint if more are available.
- Protection against an older flight-search response replacing newer results; airport-input changes invalidate pending responses and stale selections.
- A temporary-search-failure message that preserves the search rather than claiming setup is incomplete for every error.

Live browser QA exposed an old-script/new-page mismatch caused by one-hour caching of mutable assets. HTML, JavaScript and CSS now require cache revalidation, and this search release uses versioned script/style URLs to bypass already-cached assets.

No schema migration, production seed inventory or new customer records were required.

## Code and operational gap audit

| Priority | Capability | Verified implementation / remaining work |
| --- | --- | --- |
| P0 | Verified operator supply | Approval roles, aircraft records and parent-charter linkage exist. Actual agreements, credentials, insurance review and real inventory remain owner/operator work |
| P0 | Email and accounts | Registration, password hashing, sessions, CSRF, admin TOTP and email-token flows exist. Verified sender credentials and actual delivery acceptance are missing |
| P0 | Merchant and checkout | Stripe checkout and signed/idempotent local webhook tests exist. Merchant approval, real sandbox purchase/refund and live credentials remain missing |
| P0 | Disruptions and refunds | Parent cancellation withdraws linked listings; paid bookings enter refund review. Full-refund reconciliation now tracks provider callbacks, administrator refresh and customer dashboard progress (see REFUND_OPERATIONS.md). Actual provider sandbox acceptance, partial-refund accounting, disputes/chargebacks and operator payouts remain outstanding |
| P0 | Customer communication | A technical audit trail is not a notification system. A durable encrypted outbox now covers payment, disruption, cancellation and refund updates with leases/retries and private delivery records. Verified sender activation, real mailbox acceptance, delivery/bounce processing and always-on execution remain pending |
| P0 | Recovery | Neon connection/migration and a snapshot exist. Snapshot readability was checked, but a finalization mistake caused a routing incident; the website was redirected to preserved original data. The Vercel-managed association, a clean isolated rehearsal, encryption-key recovery and measured recovery objectives remain unresolved; see RECOVERY_DRILL_2026-10-31.md |
| P0 | Support and commercial terms | Real contact channel, staffing, operator contracts, customer terms, privacy/retention and jurisdiction review remain required |
| P1 | Scalable security | Parameterized SQL, role checks, encrypted notes and secure cookies exist. Independent security assessment, durable shared rate limits, monitoring and multi-instance behaviour need verification before scale |
| P1 | Tracking | Regional ADS-B observations, timestamps and rate-limit backoff exist. All-aircraft/global coverage, uninterrupted availability and a licensed scalable commercial feed do not |
| P1 | Inventory integration | Manual operator workflow exists. Contracted feed adapters, freshness expiry, deduplication and provider-level reconciliation remain future work |
| P1 | Route preferences | Private preferences can be saved. Automatic matching, consent-managed email subscriptions, unsubscribe and queued notifications remain unimplemented |
| P1 | Customer files | Encrypted small trip-note uploads exist. Larger/sensitive document handling needs suitable object storage, scanning, retention/deletion policy, access assessment and operational review |
| P1 | Human usability | Public pilot and feedback form exist. Recruit real consenting travellers/operators; no participant success rate or worldwide device study is claimed |
| P2 | Localization | Device time and UTC plus five listing currencies exist. Translations, local-format review, currency conversion and regional support need explicit implementation/testing |
| P2 | Commercial analytics | Campaign drafts and UTM links exist. Consented analytics, real conversion data and attributable collected revenue have not been established |
| P2 | Pilot operations | Certified charts, flight-plan filing, dispatch, weight/balance, NOTAM completeness, crew duty and runway-performance systems are outside current product scope |

The application's frontend/backend/database connection is necessary infrastructure evidence. It does not prove that a charter can be sold or operated. Keep COMMERCIAL_LAUNCH_APPROVED=false while acceptance evidence is missing. The free infrastructure remains a pilot arrangement, with quotas and sleep behaviour, not a lifetime service guarantee.

## Validation of this change

- Node regression suite: 46 passing tests, including stale airport/search response protection and query guards.
- Isolated PostgreSQL WASM PGlite: 67 integration request/diagnostic checks passed, including filtered inventory, capacity exclusions, bounded flexibility, price ordering and UTC date behaviour with a non-UTC database session.
- Tests use controlled fixtures and local signed payment events. They do not create real flights, customers, purchases or payouts and do not replace provider sandbox acceptance.
- GitHub checks and live deployment verification must be confirmed after this commit; see the repository's checks and Render deployment history for current evidence.

## Build sequence after this release

1. Complete [first paid booking activation](FIRST_PAID_BOOKING_CHECKLIST.md), beginning with a verified operator, business-approved merchant and verified email sender.
2. Implement durable customer notifications and payment/refund reconciliation in an isolated environment; exercise actual provider sandbox success, failure, delay and refund cases.
3. Prove backup restoration, support coverage, privacy handling and capacity; arrange independent security review before collecting commercial payments or sensitive files.
4. Add contracted inventory/tracking feeds with licensing, quota and freshness controls. Roll out regions only where supply and operations are actually supported.
5. Recruit and observe real users with the [pilot plan](GLOBAL_PILOT_LAUNCH.md); prioritize measured task failures rather than adding speculative features.

Completed code in this pass improves discovery. Commercial launch and earnings remain pending the evidence above.
