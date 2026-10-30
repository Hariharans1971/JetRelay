# Security policy

Do not submit passwords, API keys, customer information, identity documents, or unredacted logs in public issues or pull requests.

Report vulnerabilities privately through GitHub private vulnerability reporting if it is enabled. Otherwise contact the repository owner privately to establish a secure reporting channel. A monitored security email and response SLA have not yet been established.

## Current scope

This application serves public aviation reference data and provider observations. Commercial booking and inventory writes are disabled. Customer document storage and production payment processing are not connected.

The existing deployment trusts identity injected by the Sites hosting gateway. On other hosts, never trust caller-supplied `oai-authenticated-user-*` headers. Replace the identity integration with verified sessions before enabling privileged endpoints.

Keep secrets in the deployment provider's secret store. Never commit environment files, credentials, Terraform state or plans. Use least-privilege roles, server-side organisation checks, private database access, encryption, backup and restore verification, and audit logging before accepting private client data.

Real aircraft observations and weather are informational and coverage-dependent. They are not aircraft availability, flight dispatch, navigation, or safety assurances.
