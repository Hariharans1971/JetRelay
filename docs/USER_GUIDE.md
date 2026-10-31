# JetRelay user guide

JetRelay helps travellers find whole-aircraft empty-leg flights and gives operators a controlled way to publish return journeys. Airport references and weather work independently of booking services. The current release is a pilot, with activation requirements described below.

## Website and workspaces

Website: https://aeroshare-global.onrender.com/
Empty-leg search: /booking.html
Client sign-in: /portal.html?role=client
Operator sign-in: /portal.html?role=operator
Administrator sign-in: /portal.html?role=admin
Help: /guide.html
Live service status: /status.html

A different login page does not grant a different role. The backend checks the account role on every privileged operation. Public registration creates only a client or operator account. Administrators require the owner’s setup token and an authenticator code.

## Travellers

1. Open the website and choose departure and destination airports from the suggestions. Airport identifiers are reference codes such as VABB for Mumbai and VIDP for Delhi.
2. Choose a departure date. Empty legs are one-way opportunities. Search the other direction separately for a return journey.
3. Review approved flights on the results page. The total is for the whole aircraft, not one passenger seat. Check the operator name, registration, capacity, flight time and cancellation terms.
4. Create a client account and verify your email. Account creation requires a password of at least 12 characters. Email delivery must be configured before verification links can arrive.
5. Select Hold this aircraft. Enter the passenger count and accept the displayed operator terms. The backend allows only one active whole-aircraft hold or confirmed booking per listing.
6. Open My bookings. A hold lasts 31 minutes. Use Pay securely when merchant checkout is activated. The browser redirects to Stripe’s hosted checkout. JetRelay never asks you to type card details into its own forms.
7. Return to your dashboard. A success redirect alone does not confirm payment. A valid signed payment event must update the booking. Never travel based only on a hold or screenshot.
8. Request cancellation from the dashboard. A paid booking enters review. The operator’s actual contract governs eligibility. An administrator can issue a full refund through the configured payment provider.

If no flights match, save a route preference after signing in. The preference is stored privately. Automatic matching emails are not part of this release. You can also try nearby dates or airports.

Confirmed bookings allow encrypted PDF, PNG and JPEG attachments up to 32 KB. This pilot is intended for trip notes, not passports, identity documents or medical records. A document is available only to the booking owner, its operator and an administrator. Downloads are attachments and never public URLs.

## Operators

1. Register an operator account and sign in through the Operator workspace.
2. Submit the company’s legal name, country and air operator certificate or licence reference. This creates a pending application. A number in a form is not evidence of a valid licence.
3. Add an aircraft registration, model, passenger capacity and insurance expiry date. The administrator must independently verify the aircraft and operator.
4. Record the original confirmed charter with the aircraft reference, origin, destination, departure, arrival and your contract reference. Times entered in the form use your device time zone and the backend stores UTC timestamps.
5. Propose the reverse empty leg using the parent charter reference. For a Mumbai to Delhi charter, use Delhi to Mumbai for the return. Set the full price in the currency’s minor units: INR 200,000 is 20,000,000 paise. Specify the currency and cancellation terms.
6. Allow at least 30 minutes after the parent flight arrives. The return must depart within 72 hours. The backend rejects overlapping aircraft schedules.
7. Wait for administrator approval. A pending proposal never appears in public results.
8. If the original charter is cancelled, use Cancel charter. The platform withdraws linked empty legs. Unpaid holds are cancelled and affected paid bookings enter refund review. Contact affected travellers through your established operations process. Automatic customer emails are not yet implemented.

## Administrators

The first administrator uses First administrator setup on the Admin page. Retrieve ADMIN_BOOTSTRAP_TOKEN from the web service’s Render environment settings. Generate an authenticator secret in the form and add it manually to a trusted authenticator app as a time-based account. Enter its current six-digit code, a unique password and your account details. After setup, remove the bootstrap token from the server environment. There is no shared or default administrator password.

Review operator applications against actual licensing records and contractual authority. Review aircraft registration, insurance and authority to offer the aircraft. Record evidence in the review notes. Approve the parent-linked empty-leg proposal only after checking its schedule and price. Review actions create audit entries.

The dashboard shows bookings and the audit history. Full refunds require a recorded paid booking and configured Stripe credentials. A refund request is not marked complete until Stripe reports success. Partial refunds, disputes, chargebacks, operator payouts and automated reconciliation need further implementation or an external operations process.

## Owner activation

The Render web service is aeroshare-global in the Singapore region. The active database is the separate jetrelay database on Neon in AWS North Virginia. The old Render jetrelay-pilot database is retained as a migration fallback and is no longer active. The application is connected to the database. Live checks confirmed all 13 tables, booking protection indexes and temporary-table write and rollback tests. Use /status.html to check current availability. The following connection steps are for setup or recovery.

1. In Neon, open the JetRelay database and obtain its direct PostgreSQL connection string using verified TLS. Keep the connection string private.
2. Open the aeroshare-global web service, then Environment. Set DATABASE_URL to that value and save with a new deployment. Do not put it in GitHub, screenshots or chat.
3. Check /api/v1/status. The database must report connected true. A startup migration creates the platform tables automatically. If it reports unavailable, inspect runtime logs and verify the Neon destination, TLS configuration and credentials.
4. Set RESEND_API_KEY and EMAIL_FROM using an authenticated email provider account and verified sender domain. Test verification and password-reset delivery with accounts you control.
5. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET using test credentials first. Configure the webhook destination as https://aeroshare-global.onrender.com/api/v1/payments/webhook for checkout.session.completed and checkout.session.async_payment_succeeded. Run real provider sandbox payments and refund tests before using live keys.
6. Preserve DOCUMENT_ENCRYPTION_KEY securely. Losing or changing it makes existing encrypted attachments unreadable. Keep a protected copy under your organisation’s secret-recovery process.
7. Set up the first administrator, then remove ADMIN_BOOTSTRAP_TOKEN. There is no public administrator signup.
8. The active Neon Free database has no fixed trial expiry, but storage/compute quotas and scale-to-zero apply. A post-migration snapshot exists. Arrange ongoing backups and prove a restore works before commercial use. The free Render web service can sleep when idle.
9. Complete legal terms, privacy, refunds, support, operator agreements, jurisdiction and merchant approval. The built-in Terms page is a product notice, not a substitute for reviewed commercial contracts.
10. Enable live collection only after those checks. COMMERCIAL_LAUNCH_APPROVED remains false until the owner has completed the launch review.

## Reference data and troubleshooting

Airport and runway records come from OurAirports. Country boundaries come from Natural Earth. These are real reference datasets with source fingerprints and import timestamps. They do not guarantee an airport is operational or suitable for a flight.

Radar uses adsb.lol aircraft observations. During testing the Render server received HTTP 429. The app backs off and displays unavailable. Do not interpret a missing position as no aircraft or invent an available flight from a tracked jet. A reliable production radar feed requires an agreed provider quota or service plan.

Weather uses NOAA Aviation Weather Center. A live VOMM METAR was retrieved during testing. Reports have observation times and may be absent or delayed. The display is informational and is not a dispatch or flight-safety decision tool.

A daily OurAirports refresh workflow is configured in GitHub Actions for 00:00 UTC, which is 05:30 IST. The scheduled GitHub Actions run completed successfully on 31 October 2026, refreshed the snapshot at 09:40 IST and automatically deployed it to Render. Failed downloads must leave the committed snapshot unchanged. GitHub Actions can delay schedules or require the repository owner to enable workflows.

If the page says the database is waiting, repeat the owner connection steps. If checkout is unavailable, merchant credentials are missing or the launch gate is closed. If a hold expires, search again rather than reuse an old checkout. If the aircraft disappears after a parent charter cancellation, the operator must resolve availability and refund obligations before any travel.

## Flexible flight discovery

On the empty-leg search page, choose passenger count to exclude aircraft with insufficient capacity. Choose a departure date and exact, one-day or three-day flexibility on either side. Search dates use UTC; result cards show departure and arrival in both device time and UTC. Check the operator itinerary before travel.

Filter by listing currency before selecting lowest price. This sorts whole-aircraft totals within that currency; it does not convert currencies. Earliest departure works across currencies. Copy search link shares the filters, not an account session or a reservation. A shared search may produce different results as availability changes. Searches show at most 100 available flights and ask you to refine filters when more exist.
