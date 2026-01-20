# Bookstore inventory database

For a first installation on Windows, open [START-HERE.html](START-HERE.html). It walks through setup and a ten-minute rehearsal with a manager, clerk, and administrator.

This package stores book titles, purchasing costs, selling prices, and quantities in one PostgreSQL database shared by the store's computers. It includes a command-line client, an optional English and Chinese browser interface, database permissions, stock history, and tests. The database was tested locally with more than 10,000 books. The store installation is yours to configure using this guide.

For the browser interface and Windows launcher, see [UI-SETUP.md](UI-SETUP.md). Configure the shared database and individual staff accounts first.

Use one central PostgreSQL server and a separate login for each staff member. Install the client on each computer. Do not put database files on a shared drive or synchronize them through a file-sharing service.

## Access levels

| Level | Allowed actions |
| --- | --- |
| Clerk (`bookstore_clerk`) | Search titles, see retail prices and quantities, record sales. Purchasing cost is hidden. |
| Manager (`bookstore_manager`) | All clerk actions, plus see purchasing costs, add/edit books, deactivate titles, and receive stock. |
| Administrator (`bookstore_admin`) | All manager actions, plus make explained stock adjustments and read catalog/stock audit history. |

The installation DBA is separate from these three staff levels. The DBA provisions accounts, configures the server, manages backups, and installs migrations. Staff cannot directly edit the underlying tables or inherit the non-login `bookstore_owner` role. The DBA and server operating-system administrator remain trusted: the audit history is protected from staff edits, not from these privileged operators.

## Install the central database

Requirements: a supported, patched PostgreSQL release, version 17 or later (18 is the target), its `psql` tools, and a supported Node.js LTS release version 20 or later on client computers. Use a dedicated PostgreSQL cluster for this application; the scripts reserve four cluster-wide role names beginning with `bookstore_`.

On the server, unpack this package and open a terminal in its directory. Run these commands as the installation DBA, using the server's secured local administration connection:

```powershell
psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -f sql/000_create_database.psql
psql -X -U postgres -d bookstore -v ON_ERROR_STOP=1 -f sql/001_schema.sql
```

Replace `postgres` if your DBA login differs. Check each command's exit status before continuing. Creation deliberately fails if the database or reserved roles already exist; the schema migration is transactional. Do not rerun it against a populated database. Investigate a collision rather than deleting existing objects.

Configure the store network before enabling staff connections:

1. Give the server a stable private address and hostname. Obtain a TLS certificate whose subject alternative name matches that hostname; keep its private key readable only by the server account and designated administrators.
2. Merge `config/postgresql.conf.example` and `config/pg_hba.conf.example` into the actual server configuration, replacing every hostname, IP address, subnet, and certificate path. The templates are **not ready-to-use network configuration**. PostgreSQL uses the first matching access rule, so earlier broad rules must not bypass the intended restrictions. Keep a tested local DBA connection available.
3. Allow the PostgreSQL port through the firewall only from the store's approved computers/private subnet. Use TLS and SCRAM-SHA-256 authentication. Keep the server off the public Internet, retain the durability settings, and restart or reload PostgreSQL as required by the changed settings.
4. Distribute the trusted CA certificate to staff computers and verify that correct credentials connect, an incorrect CA/hostname fails, and plaintext network connections are refused. Certificate and hostname verification are described in the [PostgreSQL TLS documentation](https://www.postgresql.org/docs/current/libpq-ssl.html).

## Create individual staff accounts

Run as the DBA in the `bookstore` database:

```powershell
psql -X -U postgres -d bookstore -v staff=staff_alice -v access=bookstore_clerk -f sql/create_staff.psql
psql -X -U postgres -d bookstore -v staff=staff_bob -v access=bookstore_manager -f sql/create_staff.psql
psql -X -U postgres -d bookstore -v staff=staff_owner -v access=bookstore_admin -f sql/create_staff.psql
```

Use actual staff names. Each command securely prompts for a password through `psql`'s `\password`; no preset password is included. Staff names must start with `staff_` and use lowercase letters, digits, or underscores. Give each person only the level they need, and never share the DBA account.

The DBA can reset a password with `\password staff_alice`. For a departing employee, disable new logins with `ALTER ROLE staff_alice NOLOGIN;` and terminate that account's existing sessions. Retain the account name for historical attribution. To change a level, revoke its old group membership and grant exactly one new level; do not accumulate unrelated privileges.

## Connect a staff computer

From the unpacked package directory, install the locked dependencies:

```powershell
npm ci
```

In PowerShell, set the actual server name and CA path and enter the staff password without writing it into command history:

```powershell
$env:PGHOST = 'inventory.your-store.example'
$env:PGPORT = '5432'
$env:PGDATABASE = 'bookstore'
$env:PGUSER = 'staff_alice'
$env:BOOKSTORE_CA_FILE = 'C:\Bookstore\certificates\store-ca.pem'
$staffSecret = Read-Host 'Database password' -AsSecureString
$env:PGPASSWORD = [System.Net.NetworkCredential]::new('', $staffSecret).Password
Remove-Variable staffSecret
node client.mjs list
```

The example hostname is a placeholder. The client requires certificate verification for normal use and does not accept an arbitrary connection URL. The password exists in the terminal's environment while the client runs; use a separate protected operating-system account and clear it when finished:

```powershell
Remove-Item Env:PGPASSWORD
```

For an isolated local development database only, `BOOKSTORE_LOCAL_DEV=1` permits plaintext connections when `PGHOST` is exactly `localhost`, `127.0.0.1`, or `::1`. Do not use that setting for the store network.

## Everyday operations

Run `node client.mjs --help` for the full command list. Output is JSON. Books have a unique, case-sensitive stock code (SKU); different editions may share a title. New books start with zero stock.

As a manager:

```powershell
node client.mjs add --sku BK-0001 --title "The Example Book" --cost 8.50 --price 12.99
node client.mjs list "The Example" --cost
```

Use the returned `book_id` in subsequent commands; `1` below is only an example. Generate and **save** a request UUID with the delivery record before receiving stock:

```powershell
node client.mjs uuid
node client.mjs receive --id 1 --units 20 --reason "Delivery PO-100" --request YOUR_SAVED_UUID
```

For a sale, use the clerk's own connection and a new UUID saved with that receipt:

```powershell
node client.mjs uuid
node client.mjs sell --id 1 --units 2 --reason "Receipt R-200" --request YOUR_NEW_SAVED_UUID
```

Replace the UUID placeholders with generated values. If a connection fails and you are unsure whether a stock operation committed, retry using **the same login, UUID, book ID, quantity, and reason**. A successful duplicate returns its original quantity result without changing stock again; that result may differ from the book's current quantity after later sales. A changed payload or login with the same UUID is rejected. A new operation requires a new UUID.

For metadata edits, read the current `version` with `list --cost` first, then supply it:

```powershell
node client.mjs update --id 1 --version 3 --title "The Example Book" --cost 8.50 --price 13.99 --active true
```

Use the actual returned version. A concurrent edit or stock change can make it stale; refresh the record and review the current values before retrying. Deactivate a title with `--active false`; its history remains. Stock changes on inactive books are refused.

Administrators can correct stock with an explained, saved request ID, for example `adjust --id 1 --delta -1 --reason "Damaged copy" --request UUID`. `audit` shows recent catalog edits. For stock history, an administrator can use a PostgreSQL client to query `api.movements`, ordered by `movement_id DESC`. `api.audit_log` contains catalog history. Both views are read-only to staff.

`list "Title prefix"` searches the beginning of titles, ignoring case. Results are ordered by book ID. Use `--limit` up to 100 and pass the last returned `book_id` as `--after` for the next page. Money allows at most two decimal places and is stored exactly. Quantities stay between zero and 1,000,000,000; sales cannot oversell stock.

## Design and limits

Three tables keep the system small: `books` stores the current catalog/stock, `stock_movements` records each successful stock operation, and `catalog_audit` records metadata changes. The current quantity and its history update in one transaction. Row locks coordinate simultaneous stock changes, while unique request IDs prevent duplicate retries. Fixed-permission functions and parameterized client queries control writes; function security follows [PostgreSQL's security-definer guidance](https://www.postgresql.org/docs/current/sql-createfunction.html).

Primary keys, a unique SKU, a title-prefix index, and per-book history indexes support common lookups without adding caches, sharding, or a separate search service. This balances storage and access speed for a store-scale catalog. The ledger grows with activity, so its long-term storage needs can exceed those of 10,000 catalog rows. See `VALIDATION.md` for measured checks rather than assuming a hardware-independent speed guarantee.

This release uses one store currency with two decimal places. Purchasing cost is the current recorded unit cost. The stock ledger captures the retail price at each movement. An administrator can record an explained stock correction. The optional browser interface handles inventory, including stock movements and pricing.

## Sample data and tests

`sql/002_demo_10000.sql` optionally loads 10,000 synthetic books into an empty demonstration database. It is for evaluation, not real inventory; do not load it into the store database. The production setup intentionally starts empty.

The test suite needs a **fresh isolated PostgreSQL cluster** and an empty database named `bookstore_test` or beginning with `bookstore_test`. It creates reserved roles and schemas and leaves test data for inspection, so another database on the production cluster is not sufficient. As an installation test user, set `TEST_DATABASE_URL` securely to that disposable database and run:

```powershell
npm test
```

The tests cover 10,000 records, permission boundaries, invalid values, audit behavior, concurrent sales, and safe retries. Run `npm run test:unit` for the command-line and language parser checks. For the optional interface tests, follow [UI-SETUP.md](UI-SETUP.md). See [VALIDATION.md](VALIDATION.md) for the results and remaining store checks.

## Backups and maintenance

The DBA should schedule at least daily backups, keep encrypted copies off the database server, monitor failures, and regularly prove that restoration works. A daily backup can lose up to a day's changes. If that is unacceptable, configure and test PostgreSQL WAL archiving with point-in-time recovery in addition to backups.

Using a protected DBA connection, create a custom-format database archive and a separate globals backup:

```powershell
pg_dump -U postgres -d bookstore -Fc --create --file bookstore.dump
pg_dumpall -U postgres --globals-only --file globals.sql
```

Use dated filenames and a restricted backup directory. Preserve owners and privileges: do not add `--no-owner` or `--no-acl`. The globals file includes role information and may contain password hashes; encrypt it and restrict access. Back up server configuration and certificate material separately with suitable protection. When connecting remotely with these PostgreSQL tools, set `PGSSLMODE=verify-full` and `PGSSLROOTCERT` to the trusted CA; these tools do not read `BOOKSTORE_CA_FILE`. [PostgreSQL documents the difference between database dumps and cluster-wide role backups](https://www.postgresql.org/docs/current/backup-dump.html).

For a restore drill, use a fresh isolated server, never overwrite the running store. Restore the matching roles first, then the archive. Review the globals file against the target's bootstrap DBA name so an already-existing bootstrap role does not cause a collision; an isolated cluster initialized with a distinct restore-operator name avoids that collision. As that restore operator:

```powershell
psql -X -U restore_operator -d postgres -v ON_ERROR_STOP=1 -f globals.sql
pg_restore -U restore_operator --exit-on-error --create --dbname postgres bookstore.dump
psql -X -U restore_operator -d bookstore -v ON_ERROR_STOP=1 -c "ANALYZE;"
```

Do **not** run the schema migration before restoring: the archive already includes the schema and ownership. Check every exit status. Confirm book counts, stock totals, history, staff login/permissions, and an ordinary sale on the isolated copy before accepting the drill. Keep the restored server isolated until its TLS, access rules, and firewall have been configured. Restore errors require investigation; a partially restored database is not a successful recovery.

Monitor free disk space, audit growth, failed logins, backup age, lock waits, and slow queries. Leave autovacuum enabled. Keep PostgreSQL, Node.js, and client dependencies patched; test updates and recovery before rolling them out. Agree on audit retention before archiving records, because stock request IDs support safe retries for as long as their ledger rows are retained.
