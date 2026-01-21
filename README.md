# Bookstore inventory database

## Dependencies

- PostgreSQL 17 or later and the `psql` client. I used PostgreSQL 18 for the database tests.
- Node.js 20 or later with npm. Run `npm ci` to install the project dependencies.
- `pg` 8.23.1 is the only direct npm dependency. Both the command-line client and the web server use it to connect to PostgreSQL.

## Database files

| File | Purpose |
| --- | --- |
| `sql/001_schema.sql` | Defines the catalog, stock movement history, audit log, and staff permissions. The `change_stock` function locks the book row before checking the quantity. It saves the new count and the movement record in one transaction. |
| `sql/000_create_database.psql` | Creates the empty `bookstore` database before the schema is applied. |
| `sql/create_staff.psql` | Creates a staff login, assigns it the clerk, manager, or administrator role, and prompts for a password. |
| `sql/health_checks.sql` | A manual check for books whose recorded quantity differs from the sum of their stock movements. It also reports inventory totals and table sizes including indexes. |

## Command line and staff interface

| File | Purpose |
| --- | --- |
| `client.mjs` | Runs inventory commands from the terminal. It checks inputs and passes values to PostgreSQL as query parameters. |
| `web/server.mjs` | Connects to PostgreSQL using each staff member's login. It checks permissions, prepares a preview, and submits the change when the user confirms. |
| `web/intent.mjs` | Interprets supported requests in English and Chinese. For a sale, it extracts the book and the number of copies from the sentence. |
| `web/public/index.html` | Defines the sign-in form, catalog table, and inventory forms. |
| `web/public/app.js` | Handles searches, the language switch, and the review and confirmation buttons. |
| `web/public/styles.css` | Sets the layout and appearance of the staff interface. |

### Browser setup

- `web/config.example.json` is the settings template. Copy it to `web/config.json` and enter the database connection details and trusted certificate path for your server.
- `Start-Bookstore.cmd` starts the web server on Windows and opens the staff interface in a browser.

## Tests and project files

| File | Purpose |
| --- | --- |
| `test/integration.test.mjs` | Checks permissions and sale retries on an isolated PostgreSQL database. One test tries to sell the last copy from eight connections at once. Another checks lookups after adding 10,000 books. |
| `test/client.test.mjs` | Checks command arguments, generated query parameters, and connection settings. |
| `test/intent.test.mjs` | Checks how the parser handles English and Chinese requests, including invalid quantities and sentences that ask for two actions. |
| `test/web.test.mjs` | Tests the web server against PostgreSQL, including staff sign-in, hidden purchasing costs, and repeated confirmations. |
| `package.json` | Declares the Node.js version, the database driver, and the commands for running the clients and tests. |
| `package-lock.json` | Records the exact package versions that npm installs with `npm ci`. |
| `.gitignore` | Keeps local connection settings, installed packages, keys, and database dumps out of Git. |
