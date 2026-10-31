# Recovery drill and routing incident — 31 October 2026

## Result and limits

The saved post-migration snapshot could be read after restoration. Its migration receipt reports 13 copied application tables and zero copied application rows. This is historical snapshot evidence, not a successful isolated production-recovery rehearsal, a current backup schedule or proof that future customer files can be recovered.

## Incident

At approximately 11:13 UTC, the restore was requested with finalization enabled. That was an execution mistake: finalization reassigned the original compute and default-branch identity to the snapshot branch. A new branch name did not provide isolation when finalization was enabled.

The original data branch was retained. It was restored as the default and renamed main. Application user, booking and payment counts were checked on both branches during correction; each was zero. No loss of JetRelay customer records was observed in those checks. Unrelated applications/databases were not inspected or certified.

Neon rejected moving the original Vercel-managed compute back, requiring the Vercel production association to be changed first. That provider-managed association remains a follow-up item. Do not delete or expire the restored branch while that association exists.

JetRelay's Render configuration instead uses a non-secret DATABASE_HOST override to reach the preserved original branch through its separate compute. The existing password remains inside Render; the application requires verified TLS for this override. An initial attempt to resend the complete connection string was rejected by automatic approval review because it would transmit a database password. No full connection string was resent. The hostname-only update was accepted.

The corrective Render deployment completed at 11:19:52 UTC. The original branch is main/default; JetRelay uses its preserved database. The Vercel-managed endpoint association must be reviewed through the owner's Vercel integration before any restored-branch cleanup or claimed complete project recovery.

## Safer recovery procedure

1. Record the source/default branch IDs, compute-to-branch associations, active application configuration and provider-managed restrictions before a drill. Branch names alone are insufficient.
2. For an inspection drill, explicitly disable finalization. Never use finalization as part of an isolation check. Consult [Neon's restore API reference](https://api-docs.neon.tech/reference/restoresnapshot) before executing.
3. Verify that the source/default branch and production computes have not moved before any test writes or cleanup.
4. Restore only into a clearly separate environment, use explicit database/branch IDs and keep credentials out of source and reports.
5. Verify row counts, encrypted fixture recovery and application behavior. Preserve the encryption key separately; a database snapshot alone does not recover that secret.
6. Test promotion or endpoint cutover only as an explicitly planned production recovery with the relevant hosting/integration account connected, measured outage allowance and rollback procedure.
7. Establish recurring backups, retention, recovery objectives and an independently repeated restore drill before commercial launch. Those remain unverified.

The schema-test branch and empty routing-parking branch have next-day expiration. The Vercel-associated restored branch does not: its dependency must be resolved first.
