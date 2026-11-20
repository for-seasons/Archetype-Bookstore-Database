// AI-generated code.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildCommand, connectionOptions } from '../client.mjs';

const UUID = 'a52cbe57-2214-4b00-965d-b973126de6aa';
const add = (cost = '8.50', price = '12.99') => [
  'add', '--sku', 'SKU-1', '--title', 'A book', '--cost', cost, '--price', price,
];
const sale = (extra = []) => [
  'sell', '--id', '9007199254740993', '--units', '2', '--reason', 'Receipt 1',
  '--request', UUID, ...extra,
];
const baseEnvironment = {
  PGHOST: 'inventory.example.test',
  PGDATABASE: 'bookstore',
  PGUSER: 'store_alice',
  PGPASSWORD: 'unit-test-only-secret',
};

test('help and UUID generation commands do not need a database', () => {
  for (const args of [[], ['help'], ['--help'], ['list', '--help']]) {
    assert.deepEqual(buildCommand(args), { help: true });
  }
  assert.deepEqual(buildCommand(['uuid']), { uuid: true });
  assert.throws(() => buildCommand(['uuid', 'extra']));
});

test('unrecognized commands, flags, duplicate options and positional arguments fail', () => {
  for (const args of [
    ['constructor'], ['__proto__'], ['select * from api.inventory'],
    ['list', '--query', 'DROP TABLE books'], ['list', '--cost', '--cost'],
    ['list', 'two', 'words'], ['audit', 'extra'],
  ]) assert.throws(() => buildCommand(args));
});

test('SQL injection stays in parameters and all view/function names are fixed', () => {
  const attack = "Book'; DROP TABLE bookstore.books; --";
  const query = buildCommand(['add', '--sku', attack, '--title', attack, '--cost', '1.00', '--price', '2.00']);
  assert.ok(!query.text.includes(attack));
  assert.equal(query.values[0], attack);
  assert.equal(query.values[1], attack);
  assert.match(query.text, /api\.create_book\(\$1::text/);
  const inventory = buildCommand(['list', attack, '--cost']);
  assert.ok(!inventory.text.includes(attack));
  assert.match(inventory.text, /FROM api\.inventory/);
  assert.match(buildCommand(['list']).text, /FROM api\.catalog/);
  assert.throws(() => buildCommand(['list', '--cost=api.audit_log']));
  assert.throws(() => buildCommand(['api.sell', '--id', '1']));
});

test('title prefix wildcard and escape characters are literal', () => {
  const query = buildCommand(['list', '100%_!\\']);
  assert.equal(query.values[1], '100!%!_!!\\%');
  assert.match(query.text, /ESCAPE '!'/);
  assert.equal(buildCommand(['list']).values[1], null);
});

test('money keeps exact decimal strings and rejects invalid precision or values', () => {
  assert.deepEqual(buildCommand(add('9999999999.99', '0.01')).values.slice(2), ['9999999999.99', '0.01']);
  assert.deepEqual(buildCommand(add('0', '12.9')).values.slice(2), ['0', '12.9']);
  for (const amount of ['-0.01', '1.001', 'NaN', 'Infinity', '1e2', '10000000000', '01.00', '1,000.00', ' 1.00']) {
    assert.throws(() => buildCommand(add(amount)));
    assert.throws(() => buildCommand(add('1', amount)));
  }
});

test('IDs preserve bigint precision and pagination has strict bounds', () => {
  assert.equal(buildCommand(sale()).values[1], '9007199254740993');
  assert.deepEqual(buildCommand(['list', '--after', '9223372036854775807', '--limit', '100']).values,
    ['9223372036854775807', null, 100]);
  for (const args of [
    ['list', '--after', '-1'], ['list', '--after', '9223372036854775808'],
    ['list', '--after', '1.5'], ['list', '--limit', '0'],
    ['list', '--limit', '101'], ['list', '--limit', '1e2'],
  ]) assert.throws(() => buildCommand(args));
});

test('stock operations require an explicit UUID and positive sale/receipt units', () => {
  const query = buildCommand(sale());
  assert.equal(query.values[0], UUID);
  assert.equal(query.values[2], '2');
  assert.match(query.text, /api\.sell\(\$1::uuid/);
  assert.throws(() => buildCommand(['sell', '--id', '1', '--units', '1', '--reason', 'Receipt']));
  for (const uuid of ['not-a-uuid', `${UUID}'; DROP TABLE books; --`, '123']) {
    const args = sale(); args[args.length - 1] = uuid;
    assert.throws(() => buildCommand(args));
  }
  for (const command of ['sell', 'receive']) {
    assert.equal(buildCommand([command, '--id', '1', '--units', '1000000000',
      '--request', UUID, '--reason', 'test']).values[2], '1000000000');
    for (const units of ['0', '-1', '1.5', '1000000001']) {
      assert.throws(() => buildCommand([command, '--id', '1', '--units', units,
        '--request', UUID, '--reason', 'test']));
    }
  }
});

test('negative stock adjustments work in both argument formats and reject zero', () => {
  const args = ['adjust', '--id', '1', '--reason', 'Damaged', '--request', UUID];
  assert.equal(buildCommand([...args, '--delta', '-1']).values[2], '-1');
  assert.equal(buildCommand([...args, '--delta=-1']).values[2], '-1');
  assert.throws(() => buildCommand([...args, '--delta', '0']));
  assert.equal(buildCommand([...args, '--delta=-1000000000']).values[2], '-1000000000');
  assert.equal(buildCommand([...args, '--delta=1000000000']).values[2], '1000000000');
  assert.throws(() => buildCommand([...args, '--delta=-1000000001']));
  assert.throws(() => buildCommand([...args, '--delta=1000000001']));
});

test('catalog edits require optimistic-lock version and explicit active flag', () => {
  const args = ['update', '--id', '1', '--version', '8', '--title', 'Revised',
    '--cost', '5.00', '--price', '8.00', '--active', 'false'];
  assert.deepEqual(buildCommand(args).values, ['1', '8', 'Revised', '5.00', '8.00', false]);
  assert.match(buildCommand(args).text, /api\.update_book/);
  const invalid = [...args]; invalid[invalid.length - 1] = 'yes';
  assert.throws(() => buildCommand(invalid));
  assert.throws(() => buildCommand(args.filter((value, index) => index !== 3 && index !== 4)));
});

test('required text has bounds and rejects NUL', () => {
  for (const title of ['', '   ', 'a'.repeat(501), 'broken\0title']) {
    const args = add(); args[4] = title;
    assert.throws(() => buildCommand(args));
  }
  assert.throws(() => buildCommand(['list', 'x'.repeat(501)]));
});

test('audit queries are bounded and cannot accept an arbitrary view', () => {
  const query = buildCommand(['audit', '--limit', '100']);
  assert.match(query.text, /FROM api\.audit_log/);
  assert.deepEqual(query.values, [100]);
  assert.throws(() => buildCommand(['audit', '--limit', '101']));
  assert.throws(() => buildCommand(['audit', '--view', 'books']));
});

test('network connections require credentials and a trusted CA', () => {
  assert.throws(() => connectionOptions(baseEnvironment), /BOOKSTORE_CA_FILE/);
  for (const name of ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']) {
    const environment = { ...baseEnvironment }; delete environment[name];
    assert.throws(() => connectionOptions(environment), new RegExp(name));
  }
  for (const host of ['postgres://server/db', 'server,other', '/tmp/socket', 'server name', '']) {
    assert.throws(() => connectionOptions({ ...baseEnvironment, PGHOST: host }), /PGHOST/);
  }
});

test('plaintext development connections are restricted to explicit loopback', () => {
  for (const host of ['127.0.0.1', '::1', 'localhost']) {
    const config = connectionOptions({ ...baseEnvironment, PGHOST: host, BOOKSTORE_LOCAL_DEV: '1' });
    assert.equal(config.ssl, false);
    assert.equal(config.port, 5432);
    assert.equal(config.connectionTimeoutMillis, 5000);
    assert.equal(config.statement_timeout, 10000);
  }
  assert.throws(() => connectionOptions({ ...baseEnvironment, BOOKSTORE_LOCAL_DEV: '1' }), /loopback/);
  assert.throws(() => connectionOptions({ ...baseEnvironment, PGHOST: 'localhost' }), /BOOKSTORE_CA_FILE/);
  for (const port of ['0', '65536', 'abc', '1.5']) {
    assert.throws(() => connectionOptions({ ...baseEnvironment, PGHOST: 'localhost', BOOKSTORE_LOCAL_DEV: '1', PGPORT: port }), /PGPORT/);
  }
});

test('production TLS verifies the server certificate and ignores downgrade environment settings', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'bookstore-client-test-'));
  const certificate = join(directory, 'test-ca.pem');
  writeFileSync(certificate, 'UNIT TEST CERTIFICATE PLACEHOLDER\n', 'utf8');
  t.after(() => { unlinkSync(certificate); rmdirSync(directory); });
  const config = connectionOptions({ ...baseEnvironment, BOOKSTORE_CA_FILE: certificate,
    PGSSLMODE: 'disable', PGPORT: '5433', DATABASE_URL: 'postgres://untrusted.example/db' });
  assert.equal(config.host, baseEnvironment.PGHOST);
  assert.equal(config.user, baseEnvironment.PGUSER);
  assert.equal(config.password, baseEnvironment.PGPASSWORD);
  assert.equal(config.port, 5433);
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.minVersion, 'TLSv1.2');
  assert.equal(config.ssl.ca, readFileSync(certificate, 'utf8'));
  assert.ok(!Object.hasOwn(config, 'connectionString'));
});
