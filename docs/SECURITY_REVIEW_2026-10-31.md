# Secret incident review — 31 October 2026

## GitGuardian incident 39350946

The authenticated dashboard identifies `Hariharans1971/JetRelay`, commit `729e032`, `tests/database-routing.test.mjs`, line 5. The matching source contains a synthetic fixture username/password and a synthetic Neon hostname. This value was authored solely for a URL-routing regression test, never supplied by Neon or used to authenticate to a database.

At inspection, GitGuardian already showed **Resolved / Secret revoked** and **Invalid**. The existing resolution reason is not evidence that any production credential was rotated: this was a test credential. No production credential rotation was performed during this review. Privacy mode remained enabled while inspecting the incident.

The test now constructs a URL with a cryptographically generated ephemeral password in memory. It still verifies hostname-only routing preserves that password and verified TLS. No scanner allowlist or history rewrite was added. The old synthetic fixture remains in historical commits.

## Preventing recurrence

- `scripts/check-secrets.py` rejects literal PostgreSQL URLs containing passwords in tracked files and reports only path and line, without printing values. Test fixtures must generate their passwords at runtime.
- `.github/workflows/secret-scan.yml` runs that check plus Gitleaks across all fetched Git history. Gitleaks 8.30.1 is downloaded from its official release and verified against a pinned SHA-256 before execution. Scanner output is fully redacted.
- Scanner regression tests cover both PostgreSQL schemes, case variation, encoded passwords and passwordless/runtime configuration.

The custom check covers literal URLs only. It cannot prove that credentials assembled from strings, other secret formats, external artifacts or provider configurations are safe. Gitleaks complements it; neither is a penetration test. Workflow failures do not enforce branch protection by themselves.

## Local evidence

- Full-history mirror at commit `318f2eca93fab1ae491b96b8871385dc7aec53b0`: Gitleaks 8.30.1 reported zero findings.
- Separate PostgreSQL URI inspection across 507 Git objects found the single synthetic password-bearing fixture above. Gitleaks' default rules did not flag it, motivating the additional check.
- Updated tracked source: no literal PostgreSQL passwords found by the new check.
- 48 Node regression tests and 6 Python tests passed after this change.

## Requested REA tool

Reviewed and downloaded `morluto/rea` source at `7c9ed94259fef560fdbec0c9b640348c5d54c391`. Installed published `rea-agents@6.8.0` locally with lifecycle scripts disabled; no production dependency, browser integration, agent configuration or credential access was added.

The CLI help command succeeded. Static analysis of an isolated source archive was attempted with an environment containing PATH only. It stopped because the environment's `ps -axo ...` fails with `fatal library error, lookup self`, preventing REA from safely establishing child-process ownership. Its result explicitly reports incomplete coverage. This is not a successful REA application audit, and its incomplete route inventory is not used as assurance. Do not disable REA's process-ownership safety check to bypass this failure.

## Remaining operational work

This review addresses the reported repository incident. Merchant verification, verified notification sender, real operator agreements/inventory, licensed tracking coverage, independent security assessment, and a clean isolated recovery drill remain required before worldwide commercial operation. The earlier recovery incident and managed branch association follow-up remain documented in `RECOVERY_DRILL_2026-10-31.md`.
