#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const HELP = `Bookstore inventory

  node client.mjs uuid
  node client.mjs list [title-prefix] [--after BOOK_ID] [--limit 25] [--cost]
  node client.mjs add --sku SKU --title TITLE --cost 8.50 --price 12.99
  node client.mjs update --id ID --version VERSION --title TITLE --cost 8.50 --price 12.99 --active true
  node client.mjs sell --id ID --units 1 --reason "Receipt 123" --request UUID
  node client.mjs receive --id ID --units 10 --reason "Delivery 456" --request UUID
  node client.mjs adjust --id ID --delta -1 --reason "Damaged copy" --request UUID
  node client.mjs audit [--limit 25]

Set PGHOST, PGPORT (default 5432), PGDATABASE, PGUSER, and PGPASSWORD.
Set BOOKSTORE_CA_FILE to the trusted server CA certificate. Verified TLS is
required. BOOKSTORE_LOCAL_DEV=1 permits plaintext only on a loopback host.

Each staff member must use their own database login. Clerks can list and sell;
managers can also see cost, add/update books, and receive deliveries;
administrators can also adjust stock and read the audit log.

Use 'uuid' once per stock operation and save that ID with the receipt/delivery.
If a connection fails, retry with exactly the same request ID and arguments.
For a new operation, generate a new ID. A retry returns the original result.
List uses book-ID pagination; pass the last returned book_id as --after.
Use --cost to see version and purchase_cost before updating a book.
All money uses the single store currency configured in your operating policy.
`;

const maxBookIdOrVersion = 9223372036854775807n;
const maxStockChange = 1000000000n;
const stringOption = { type: 'string' };
const unitOptions = { id: stringOption, units: stringOption, reason: stringOption, request: stringOption };
const commandOptions = {
  list: { after: stringOption, limit: stringOption, cost: { type: 'boolean' } },
  add: { sku: stringOption, title: stringOption, cost: stringOption, price: stringOption },
  update: { id: stringOption, version: stringOption, title: stringOption,
    cost: stringOption, price: stringOption, active: stringOption },
  sell: unitOptions,
  receive: unitOptions,
  adjust: { id: stringOption, delta: stringOption, reason: stringOption, request: stringOption },
  audit: { limit: stringOption },
};

function required(values, name) {
  const value = values[name];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing --${name}.`);
  return value;
}

function textValue(values, name, maximum) {
  const value = required(values, name).trim();
  if ([...value].length > maximum || value.includes('\0')) {
    throw new Error(`--${name} must contain 1–${maximum} characters and no NUL characters.`);
  }
  return value;
}

function integerValue(value, name, minimum, maximum) {
  if (!/^-?\d+$/.test(value)) throw new Error(`${name} must be an integer.`);
  const number = BigInt(value);
  if (number < minimum || number > maximum) throw new Error(`${name} is outside the allowed range.`);
  return number.toString();
}

function bookId(values) {
  return integerValue(required(values, 'id'), '--id', 1n, maxBookIdOrVersion);
}

function money(values, name) {
  const value = required(values, name);
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(`--${name} must be 0–9999999999.99 with at most two decimal places.`);
  }
  return value;
}

function requestId(values) {
  const value = required(values, 'request');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('--request must be a UUID. Generate one with: node client.mjs uuid');
  }
  return value.toLowerCase();
}

function stockQuantity(command, values) {
  if (command !== 'adjust') {
    return integerValue(required(values, 'units'), '--units', 1n, maxStockChange);
  }
  const delta = integerValue(required(values, 'delta'), '--delta', -maxStockChange, maxStockChange);
  if (delta === '0') throw new Error('--delta must be nonzero.');
  return delta;
}

function normalizeDeltaArgs(args) {
  const normalized = [];
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--delta' && /^-\d+$/.test(args[index + 1] ?? '')) {
      index++;
      normalized.push(`--delta=${args[index]}`);
    } else {
      normalized.push(argument);
    }
  }
  return normalized;
}

function titlePrefixPattern(prefix) {
  if ([...prefix].length > 500 || prefix.includes('\0')) {
    throw new Error('Title prefix is too long or contains a NUL character.');
  }
  if (!prefix) return null;
  const literalPrefix = prefix.replace(/[!%_]/g, character => `!${character}`);
  return literalPrefix + '%';
}

function pageLimit(values) {
  return Number(integerValue(values.limit ?? '25', '--limit', 1n, 100n));
}

export function buildCommand(args) {
  const [command, ...rest] = args;
  if (!command || ['help', '--help', '-h'].includes(command)) return { help: true };
  if (command === 'uuid') {
    if (rest.length) throw new Error('uuid does not take arguments.');
    return { uuid: true };
  }
  if (!Object.hasOwn(commandOptions, command)) throw new Error(`Unknown command: ${command}`);
  const { values, positionals, tokens } = parseArgs({
    args: normalizeDeltaArgs(rest),
    options: { ...commandOptions[command], help: { type: 'boolean', short: 'h' } },
    allowPositionals: true,
    strict: true,
    tokens: true,
  });
  if (values.help) return { help: true };
  const seen = new Set();
  for (const token of tokens) {
    if (token.kind !== 'option') continue;
    if (seen.has(token.name)) throw new Error(`--${token.name} may be supplied only once.`);
    seen.add(token.name);
  }
  if (positionals.length > (command === 'list' ? 1 : 0)) {
    if (command === 'list') throw new Error('Quote a multi-word title prefix.');
    throw new Error(`${command} does not take positional arguments.`);
  }
  if (command === 'list') {
    const after = integerValue(values.after ?? '0', '--after', 0n, maxBookIdOrVersion);
    const limit = pageLimit(values);
    const pattern = titlePrefixPattern(positionals[0] ?? '');
    const view = values.cost ? 'api.inventory' : 'api.catalog';
    const costColumn = values.cost ? ', purchase_cost' : '';
    return {
      text: `SELECT book_id, sku, title, price, quantity, active, version${costColumn}
             FROM ${view}
             WHERE book_id > $1::bigint
               AND ($2::text IS NULL OR lower(title) LIKE lower($2::text) ESCAPE '!')
             ORDER BY book_id LIMIT $3::integer`,
      values: [after, pattern, limit],
    };
  }
  if (command === 'add') {
    return {
      text: 'SELECT api.create_book($1::text, $2::text, $3::numeric, $4::numeric) AS book_id',
      values: [
        textValue(values, 'sku', 64),
        textValue(values, 'title', 500),
        money(values, 'cost'),
        money(values, 'price'),
      ],
    };
  }
  if (command === 'update') {
    const active = required(values, 'active');
    if (!['true', 'false'].includes(active)) throw new Error('--active must be true or false.');
    return {
      text: 'SELECT api.update_book($1::bigint, $2::bigint, $3::text, $4::numeric, $5::numeric, $6::boolean) AS version',
      values: [
        bookId(values),
        integerValue(required(values, 'version'), '--version', 1n, maxBookIdOrVersion),
        textValue(values, 'title', 500),
        money(values, 'cost'),
        money(values, 'price'),
        active === 'true',
      ],
    };
  }
  if (['sell', 'receive', 'adjust'].includes(command)) {
    const units = stockQuantity(command, values);
    return {
      text: `SELECT $1::uuid AS request_id, $2::bigint AS book_id,
                    api.${command}($1::uuid, $2::bigint, $3::integer, $4::text) AS quantity_after`,
      values: [requestId(values), bookId(values), units, textValue(values, 'reason', 500)],
    };
  }
  return {
    text: `SELECT audit_id, occurred_at, actor, action, book_id, before_data, after_data
           FROM api.audit_log ORDER BY audit_id DESC LIMIT $1::integer`,
    values: [pageLimit(values)],
  };
}

export function connectionOptions(environment = process.env) {
  const host = environment.PGHOST;
  const hostnamePattern = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i;
  if (!host || !(isIP(host) || hostnamePattern.test(host))) {
    throw new Error('Set PGHOST to one server hostname or IP address.');
  }
  for (const name of ['PGDATABASE', 'PGUSER', 'PGPASSWORD']) {
    if (!environment[name]) throw new Error(`Set ${name} before connecting.`);
  }
  const localDevelopment = environment.BOOKSTORE_LOCAL_DEV === '1';
  const isLoopback = ['127.0.0.1', '::1', 'localhost'].includes(host.toLowerCase());
  if (localDevelopment && !isLoopback) throw new Error('BOOKSTORE_LOCAL_DEV=1 is allowed only for a loopback host.');
  if (!localDevelopment && !environment.BOOKSTORE_CA_FILE) {
    throw new Error('Set BOOKSTORE_CA_FILE to the trusted server CA certificate to enable verified TLS.');
  }
  return {
    host,
    port: Number(integerValue(environment.PGPORT ?? '5432', 'PGPORT', 1n, 65535n)),
    database: environment.PGDATABASE,
    user: environment.PGUSER,
    password: environment.PGPASSWORD,
    ssl: localDevelopment ? false : {
      ca: readFileSync(environment.BOOKSTORE_CA_FILE, 'utf8'),
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
    lock_timeout: 5000,
    idle_in_transaction_session_timeout: 15000,
    application_name: 'bookstore-cli',
  };
}

async function main() {
  let client;
  try {
    const query = buildCommand(process.argv.slice(2));
    if (query.help) return process.stdout.write(HELP);
    if (query.uuid) return process.stdout.write(`${randomUUID()}\n`);
    const config = connectionOptions();
    const { default: pg } = await import('pg');
    client = new pg.Client(config);
    client.on('error', () => { process.exitCode = 1; });
    await client.connect();
    const result = await client.query(query);
    process.stdout.write(`${JSON.stringify(result.rows, null, 2)}\n`);
  } catch (error) {
    const code = typeof error.code === 'string' ? ` (${error.code})` : '';
    let message = error.message || 'The operation failed.';
    if (process.env.PGPASSWORD) message = message.split(process.env.PGPASSWORD).join('[redacted]');
    process.stderr.write(`Bookstore error${code}: ${message}\n`);
    process.exitCode = 1;
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
