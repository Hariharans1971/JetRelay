# Contributing

Open a focused issue or pull request describing the problem, expected behaviour, and validation. Avoid personal data and secrets in examples.

Preserve source attribution, provider timestamps, freshness states, and truthful unavailable/empty states. Never add invented inventory, prices, verified operators, bookings, or live positions to production data.

Run checks relevant to your change:

```sh
node --test tests/*.test.mjs
python -m unittest discover -s tests -p '*_test.py' -v
node node_modules/typescript/bin/tsc --noEmit --pretty false
node --check public/app.js
node --check public/radar.mjs
node --check public/radar-fallback.mjs
```

Use the retained Sites build tooling for the current Cloudflare target. A Render migration needs an independent runtime adapter, public-asset access, and a verified identity integration. Do not provision paid resources without the owner's cost approval.

Application licensing has not been selected. Contributions do not change third-party licences or establish a commercial readiness certification.
