# Validation results

Verified on 5 November 2026 in an isolated local Windows test environment with PostgreSQL 18.6, Node.js 20.11.1, and `pg` 8.23.1. Use a currently supported Node LTS release and patched PostgreSQL for deployment.

## Automated tests

24 checks passed, 0 failed, 0 skipped: 14 client tests, 9 database integration subtests, and their parent integration test. Database tests used real PostgreSQL connections and distinct authenticated staff logins.

- Clerks could read public book information and sell; cost, private tables, catalog writes, and audit access were denied.
- Managers could see costs and maintain books, but could not make administrator adjustments or read the audit.
- Administrators could adjust stock and inspect history, but could not edit base tables, delete movements, or become the schema owner.
- Schema creation and temporary-table creation were denied to staff.
- Negative/nonfinite money, excessive precision, invalid quantities, duplicate stock codes, and overselling were rejected.
- SQL-looking titles were stored literally through parameterized queries.
- Repeating a stock request changed inventory once. Changed arguments or another staff login could not reuse that ID. Retrying after later inventory activity returned the original result.
- Eight concurrent copies of one request produced one movement.
- Eight concurrent attempts to sell the last copy produced exactly one successful sale and seven rejections, leaving quantity zero.
- Rolling back a sale also rolled back its movement history.
- Stale catalog edits failed; inactive books rejected new stock movements. Audit entries identified the authenticated staff login.
- Client checks covered exact money strings, identifier allowlists, pagination, UUIDs, stock limits, and TLS configuration/downgrade resistance.

## Capacity and speed observation

The integration test inserted **10,000 synthetic book records**, in addition to behavioral-test records. All were accessible through the permitted catalog view. A title-prefix search returned the expected 100 matches.

| Measurement | Observed result |
|---|---:|
| Books, including indexes | 2,220,032 bytes |
| Catalog audit, including indexes | 3,268,608 bytes |
| Stock movements, including indexes | 65,536 bytes |
| Average of 100 indexed SKU lookups | 0.268 ms |

Lookup timing used a warm local database and an already-open connection. It excludes LAN latency, connection setup, and production traffic, and is not a service-level promise. These sizes cover the three application tables and indexes, not PostgreSQL binaries, cluster catalogs, transaction logs, or backups. History grows as staff work; the book count alone does not determine long-term storage needs.

## Separate demo and client smoke check

Executed `002_demo_10000.sql` against a separate fresh database:

- Exactly **10,000 books** and **205,000 synthetic copies** loaded.
- Every book's quantity reconciled with its movement history: **0 mismatches**.
- Seed execution took about **1.9 seconds** in this environment.
- The actual command-line client searched the demo catalog and added a book using an authenticated manager login.
- Running the seed again safely failed without replacing the existing inventory.

`npm audit --omit=dev` reported **0 known dependency vulnerabilities** at the time of verification. That is a point-in-time registry check, not a guarantee of security.

## Deployment checks still required

No store server was supplied, so this package has **not been deployed on the store network**. The local database tests used loopback with SCRAM password authentication; actual store certificates, certificate hostname matching, firewall rules, production credentials, backup scheduling, backup restoration, and live load must be verified during deployment. TLS configuration is covered by client unit tests, not an end-to-end store-network TLS test. The `create_staff.psql` interactive password prompt and backup commands require the PostgreSQL client tools on the deployment machine.

See [README.md](README.md) for installation, operation, recovery, and reproduction of the test suite. Tests require a fresh isolated cluster and deliberately refuse existing application roles or schemas.

## Optional interface, version 1.1

Reran the suites on 9 November 2026 with an isolated PostgreSQL 18.6 database. All **40 CLI, parser, and database checks** and all **15 web checks** passed. The web tests exercised actual staff logins, permissions, request security, guided previews, confirmation and cancellation, safe repeated confirmation, exact book-number search, and English and Chinese requests through the HTTP interface.

The local preview returned HTTP 200. The in-app browser could not connect to the isolated server, and Windows browser automation stopped because it could not verify the browser's current URL. Visual verification of the language switch and guided fields remains pending. The [browser checklist in UI-SETUP.md](UI-SETUP.md#browser-checklist-for-the-administrator) gives the steps to verify both against a test catalog.
