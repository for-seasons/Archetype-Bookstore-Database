// AI-generated code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Client } = pg;

// This suite creates a schema and login roles. It intentionally refuses an
// ordinary database name, an existing application schema, or missing settings.
test('bookstore database integration, security, and concurrency', { timeout: 120_000 }, async (t) => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to an empty disposable bookstore_test* database on an isolated PostgreSQL cluster.');
  const baseUrl = new URL(process.env.TEST_DATABASE_URL);
  assert.match(decodeURIComponent(baseUrl.pathname.slice(1)), /^bookstore_test[a-zA-Z0-9_]*$/, 'Tests only run against bookstore_test* databases.');
  const owner = new Client({ connectionString: baseUrl.href, connectionTimeoutMillis: 10_000, statement_timeout: 30_000 });
  const connections = [];
  const roleNames = [];
  await owner.connect();
  t.after(async () => {
    await Promise.allSettled(connections.map(client => client.end()));
    // Keep schema/data for inspection. Only the randomly generated test logins
    // are removed; there is no DROP DATABASE, CASCADE, or broad cleanup.
    for (const role of roleNames) await owner.query(`DROP ROLE "${role}"`);
    await owner.end();
  });
  assert.equal((await owner.query("SELECT 1 FROM pg_namespace WHERE nspname IN ('api', 'bookstore_private')")).rowCount, 0,
    'This database already has application schemas. Use a new disposable database; no existing data was changed.');
  assert.equal((await owner.query("SELECT 1 FROM pg_roles WHERE rolname IN ('bookstore_owner','bookstore_clerk','bookstore_manager','bookstore_admin')")).rowCount, 0,
    'The application roles already exist. Use a separate disposable PostgreSQL cluster to avoid modifying existing roles.');
  await owner.query(await readFile(new URL('../sql/001_schema.sql', import.meta.url), 'utf8'));

  async function login(group) {
    const username = `test_${group.replace('bookstore_', '')}_${randomBytes(6).toString('hex')}`;
    const password = randomBytes(32).toString('hex');
    // Both interpolated strings are generated from fixed words / hexadecimal.
    await owner.query(`CREATE ROLE "${username}" LOGIN INHERIT PASSWORD '${password}' IN ROLE "${group}"`);
    roleNames.push(username);
    const url = new URL(baseUrl);
    url.username = username;
    url.password = password;
    const config = { connectionString: url.href, connectionTimeoutMillis: 10_000, statement_timeout: 15_000 };
    const connect = async () => {
      const client = new Client(config);
      await client.connect();
      connections.push(client);
      return client;
    };
    return { username, client: await connect(), connect };
  }
  const clerk = await login('bookstore_clerk');
  const manager = await login('bookstore_manager');
  const admin = await login('bookstore_admin');
  async function makeBook(label, initial = 0) {
    const result = await manager.client.query('SELECT api.create_book($1,$2,$3,$4) AS id', [randomUUID(), label, '4.25', '9.99']);
    const id = result.rows[0].id;
    if (initial) await manager.client.query('SELECT api.receive($1,$2,$3,$4)', [randomUUID(), id, initial, 'Opening test stock']);
    return id;
  }
  async function quantity(id) {
    return (await clerk.client.query('SELECT quantity FROM api.catalog WHERE book_id=$1', [id])).rows[0].quantity;
  }
  const permissionDenied = err => err.code === '42501';

  await t.test('three roles enforce cost visibility and mutation boundaries', async () => {
    const id = await makeBook('Permission test', 10);
    const columns = (await clerk.client.query('SELECT * FROM api.catalog WHERE book_id=$1', [id])).fields.map(x => x.name);
    assert.ok(columns.includes('title') && columns.includes('price') && columns.includes('quantity'));
    assert.ok(!columns.includes('purchase_cost'));
    await assert.rejects(clerk.client.query('SELECT * FROM api.inventory LIMIT 1'), permissionDenied);
    await assert.rejects(clerk.client.query('SELECT * FROM api.audit_log LIMIT 1'), permissionDenied);
    await assert.rejects(manager.client.query('SELECT * FROM api.audit_log LIMIT 1'), permissionDenied);
    await assert.rejects(clerk.client.query('SELECT * FROM bookstore_private.books LIMIT 1'), permissionDenied);
    await assert.rejects(admin.client.query('UPDATE bookstore_private.books SET quantity=0 WHERE book_id=$1', [id]), permissionDenied);
    await assert.rejects(admin.client.query('DELETE FROM api.movements'), permissionDenied);
    await assert.rejects(clerk.client.query("SELECT api.create_book('unauthorized','No',1,2)"), permissionDenied);
    await assert.rejects(clerk.client.query('SELECT api.receive($1,$2,1,$3)', [randomUUID(), id, 'No']), permissionDenied);
    await assert.rejects(manager.client.query('SELECT api.adjust($1,$2,1,$3)', [randomUUID(), id, 'No']), permissionDenied);
    await assert.rejects(admin.client.query('SET ROLE bookstore_owner'), permissionDenied);
    await assert.rejects(clerk.client.query('CREATE SCHEMA unauthorized_test'), permissionDenied);
    await assert.rejects(clerk.client.query('CREATE TEMP TABLE unauthorized_test (id integer)'), permissionDenied);
    assert.equal((await manager.client.query('SELECT purchase_cost FROM api.inventory WHERE book_id=$1', [id])).rows[0].purchase_cost, '4.25');
    assert.equal((await admin.client.query('SELECT api.adjust($1,$2,-1,$3) AS qty', [randomUUID(), id, 'Damaged copy'])).rows[0].qty, 9);
  });

  await t.test('invalid monetary, title, stock, and duplicate SKU inputs are rejected', async () => {
    for (const bad of ['-0.01', 'NaN', 'Infinity', '0.001', '10000000000.00']) {
      await assert.rejects(manager.client.query('SELECT api.create_book($1,$2,$3,$4)', [randomUUID(), 'Invalid cost', bad, '9.99']));
      await assert.rejects(manager.client.query('SELECT api.create_book($1,$2,$3,$4)', [randomUUID(), 'Invalid price', '1.00', bad]));
    }
    for (const title of ['', '   ', null, 'x'.repeat(501)]) {
      await assert.rejects(manager.client.query('SELECT api.create_book($1,$2,1,2)', [randomUUID(), title]));
    }
    const sku = randomUUID();
    await manager.client.query('SELECT api.create_book($1,$2,1,2)', [sku, 'Same name is allowed']);
    await assert.rejects(manager.client.query('SELECT api.create_book($1,$2,1,2)', [sku, 'Duplicate SKU']), { code: '23505' });
    await manager.client.query('SELECT api.create_book($1,$2,1,2)', [randomUUID(), 'Same name is allowed']);
    const id = await makeBook('Quantity validation', 2);
    for (const n of [0, -1, null]) {
      await assert.rejects(clerk.client.query('SELECT api.sell($1,$2,$3,$4)', [randomUUID(), id, n, 'Invalid units']));
      await assert.rejects(manager.client.query('SELECT api.receive($1,$2,$3,$4)', [randomUUID(), id, n, 'Invalid units']));
    }
    await assert.rejects(clerk.client.query('SELECT api.sell($1,$2,3,$3)', [randomUUID(), id, 'Oversell']));
    await assert.rejects(manager.client.query('SELECT api.receive($1,$2,1000000000,$3)', [randomUUID(), id, 'Overflow']));
    assert.equal(await quantity(id), 2);
  });

  await t.test('input containing SQL syntax is stored literally', async () => {
    const title = "O'Reilly; DROP TABLE bookstore_private.books; --";
    const id = await makeBook(title);
    assert.equal((await clerk.client.query('SELECT title FROM api.catalog WHERE book_id=$1', [id])).rows[0].title, title);
  });

  await t.test('sale retry is idempotent and mismatched or cross-user replay is rejected', async () => {
    const id = await makeBook('Retry', 10);
    const request = randomUUID();
    const args = [request, id, 2, 'Receipt 123'];
    assert.equal((await clerk.client.query('SELECT api.sell($1,$2,$3,$4) AS qty', args)).rows[0].qty, 8);
    assert.equal((await clerk.client.query('SELECT api.sell($1,$2,$3,$4) AS qty', args)).rows[0].qty, 8);
    await assert.rejects(clerk.client.query('SELECT api.sell($1,$2,$3,$4)', [request, id, 3, 'Receipt 123']));
    await assert.rejects(clerk.client.query('SELECT api.sell($1,$2,$3,$4)', [request, id, 2, 'Different receipt']));
    await assert.rejects(manager.client.query('SELECT api.sell($1,$2,$3,$4)', args));
    assert.equal(await quantity(id), 8);
    const row = (await admin.client.query('SELECT * FROM api.movements WHERE request_id=$1', [request])).rows;
    assert.equal(row.length, 1);
    assert.equal(row[0].actor, clerk.username);
    // The original result must survive later legitimate stock changes.
    await manager.client.query('SELECT api.receive($1,$2,1,$3)', [randomUUID(), id, 'Later receipt']);
    assert.equal((await clerk.client.query('SELECT api.sell($1,$2,$3,$4) AS qty', args)).rows[0].qty, 8);
    assert.equal(await quantity(id), 9);
  });

  await t.test('concurrent copies of one request change stock exactly once', async () => {
    const id = await makeBook('Concurrent retry', 5);
    const request = randomUUID();
    const clients = await Promise.all(Array.from({ length: 8 }, () => clerk.connect()));
    const results = await Promise.all(clients.map(client => client.query('SELECT api.sell($1,$2,1,$3) AS qty', [request, id, 'Same receipt'])));
    assert.ok(results.every(result => result.rows[0].qty === 4));
    assert.equal(await quantity(id), 4);
    assert.equal((await admin.client.query('SELECT COUNT(*)::integer AS n FROM api.movements WHERE request_id=$1', [request])).rows[0].n, 1);
  });

  await t.test('simultaneous tills cannot sell the same last copy', async () => {
    const id = await makeBook('Last copy', 1);
    const clients = await Promise.all(Array.from({ length: 8 }, () => clerk.connect()));
    const results = await Promise.allSettled(clients.map(client => client.query('SELECT api.sell($1,$2,1,$3)', [randomUUID(), id, 'Concurrent sale'])));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected').length, 7);
    assert.equal(await quantity(id), 0);
    assert.equal((await admin.client.query("SELECT COUNT(*)::integer AS n FROM api.movements WHERE book_id=$1 AND kind='sale'", [id])).rows[0].n, 1);
  });

  await t.test('stock and movement history roll back together', async () => {
    const id = await makeBook('Rollback', 3);
    const request = randomUUID();
    await clerk.client.query('BEGIN');
    try {
      await clerk.client.query('SELECT api.sell($1,$2,1,$3)', [request, id, 'Cancelled transaction']);
    } finally {
      await clerk.client.query('ROLLBACK');
    }
    assert.equal(await quantity(id), 3);
    assert.equal((await admin.client.query('SELECT 1 FROM api.movements WHERE request_id=$1', [request])).rowCount, 0);
    assert.equal((await clerk.client.query('SELECT api.sell($1,$2,1,$3) AS qty', [request, id, 'Cancelled transaction'])).rows[0].qty, 2);
  });

  await t.test('optimistic catalog editing prevents lost updates and inactive books reject stock changes', async () => {
    const id = await makeBook('Before edit', 2);
    const oldVersion = (await manager.client.query('SELECT version FROM api.inventory WHERE book_id=$1', [id])).rows[0].version;
    const args = [id, oldVersion, 'After edit', '4.50', '10.00', true];
    const result = await manager.client.query('SELECT api.update_book($1,$2,$3,$4,$5,$6) AS version', args);
    await assert.rejects(manager.client.query('SELECT api.update_book($1,$2,$3,$4,$5,$6)', args), { code: '40001' });
    const version = result.rows[0].version;
    await manager.client.query('SELECT api.update_book($1,$2,$3,$4,$5,$6)', [id, version, 'After edit', '4.50', '10.00', false]);
    await assert.rejects(clerk.client.query('SELECT api.sell($1,$2,1,$3)', [randomUUID(), id, 'Inactive sale']));
    await assert.rejects(manager.client.query('SELECT api.receive($1,$2,1,$3)', [randomUUID(), id, 'Inactive receipt']));
    assert.equal(await quantity(id), 2);
    const audit = (await admin.client.query('SELECT * FROM api.audit_log WHERE book_id=$1', [id])).rows;
    assert.ok(audit.length >= 3);
    assert.ok(audit.every(row => row.actor === manager.username));
    assert.ok(audit.some(row => row.after_data.title === 'After edit'));
  });

  await t.test('10,000 additional books fit and remain searchable with measured storage', async () => {
    await owner.query('BEGIN');
    try {
      await owner.query('SET LOCAL ROLE bookstore_owner');
      await owner.query(`INSERT INTO bookstore_private.books (sku,title,purchase_cost,price)
        SELECT 'BENCH-' || lpad(n::text,5,'0'), 'Benchmark Book ' || lpad(n::text,5,'0'),
               (100 + n % 5000)::numeric / 100, (200 + n % 9000)::numeric / 100
        FROM generate_series(1,10000) n`);
      await owner.query('COMMIT');
    } catch (err) {
      await owner.query('ROLLBACK');
      throw err;
    }
    await owner.query('ANALYZE bookstore_private.books');
    assert.equal((await clerk.client.query("SELECT COUNT(*)::integer AS n FROM api.catalog WHERE sku LIKE 'BENCH-%'")).rows[0].n, 10_000);
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      const sku = `BENCH-${String(i * 97 + 1).padStart(5, '0')}`;
      assert.equal((await clerk.client.query('SELECT * FROM api.catalog WHERE sku=$1', [sku])).rowCount, 1);
    }
    const meanMs = (performance.now() - start) / 100;
    assert.equal((await clerk.client.query("SELECT * FROM api.catalog WHERE lower(title) LIKE 'benchmark book 099%' ORDER BY book_id LIMIT 100")).rowCount, 100);
    const storage = await owner.query(`SELECT pg_total_relation_size('bookstore_private.books')::text AS books_bytes,
      pg_total_relation_size('bookstore_private.stock_movements')::text AS movements_bytes,
      pg_total_relation_size('bookstore_private.catalog_audit')::text AS audit_bytes,
      current_setting('server_version') AS postgres_version`);
    t.diagnostic(JSON.stringify({ benchmark: '10000 synthetic books plus behavioral test records', meanIndexedSkuLookupMs: Number(meanMs.toFixed(3)), ...storage.rows[0] }));
  });
});
