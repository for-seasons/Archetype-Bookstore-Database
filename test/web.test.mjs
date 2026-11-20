// AI-generated code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import pg from 'pg';
import { createApp } from '../web/server.mjs';

// Run after the database integration suite, against its test-only database.
// This file neither installs a schema nor drops existing application objects.
test('staff browser interface: real database, permissions, reviews, and request security', { timeout: 120_000 }, async t => {
  assert.ok(process.env.TEST_WEB_DATABASE_URL,
    'Set TEST_WEB_DATABASE_URL to an isolated bookstore_test* database with the application schema installed.');
  const url = new URL(process.env.TEST_WEB_DATABASE_URL);
  assert.match(decodeURIComponent(url.pathname.slice(1)), /^bookstore_test[a-zA-Z0-9_]*$/,
    'Web integration tests require an isolated bookstore_test* database.');
  const owner = new pg.Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
  await owner.connect();
  const accounts = [], apps = [], direct = [];
  t.after(async () => {
    await Promise.allSettled(apps.map(app => app.close()));
    await Promise.allSettled(direct.map(client => client.end()));
    for (const account of accounts) {
      await owner.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename=$1 AND pid<>pg_backend_pid()', [account.username]);
      // Generated names contain only fixed ASCII text and hexadecimal digits.
      await owner.query(`DROP ROLE "${account.username}"`);
    }
    await owner.end();
  });
  assert.equal((await owner.query("SELECT to_regclass('bookstore_private.books') IS NOT NULL AS installed")).rows[0].installed, true,
    'Install the application schema in the isolated test database before this suite.');

  const databaseConfig = {
    host: url.hostname, port: Number(url.port || 5432), database: decodeURIComponent(url.pathname.slice(1)),
    ssl: false, connectionTimeoutMillis: 5000, statement_timeout: 10_000,
  };
  // The harness intentionally runs only against a local isolated test server.
  assert.ok(['127.0.0.1', 'localhost', '[::1]', '::1'].includes(url.hostname));

  async function start(options = {}) {
    const app = createApp({ databaseConfig, ...options });
    apps.push(app);
    await new Promise((resolve, reject) => {
      app.server.once('error', reject);
      app.server.listen(0, '127.0.0.1', resolve);
    });
    return { ...app, origin: `http://127.0.0.1:${app.server.address().port}` };
  }
  const app = await start();
  async function request(path, { auth, method = 'GET', body, headers = {}, origin = app.origin, app: target = app, rawBody } = {}) {
    const response = await fetch(`${target.origin}${path}`, {
      method, headers: {
        Origin: origin,
        ...(body !== undefined || rawBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth ? { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(rawBody !== undefined ? { body: rawBody } : {}),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    return { status: response.status, headers: response.headers, data, text };
  }
  async function account(group) {
    const username = `staff_web_${group}_${randomBytes(6).toString('hex')}`;
    const password = randomBytes(24).toString('hex');
    await owner.query(`CREATE ROLE "${username}" LOGIN INHERIT PASSWORD '${password}' IN ROLE "bookstore_${group}"`);
    const entry = { username, password, group };
    accounts.push(entry);
    return entry;
  }
  async function signIn(account, target = app) {
    const result = await request('/api/login', { method: 'POST', body: { username: account.username, password: account.password }, app: target, origin: target.origin });
    assert.equal(result.status, 200, result.text);
    const cookie = result.headers.get('set-cookie');
    assert.match(cookie, /bookstore_session=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.match(cookie, /Path=\//i);
    assert.ok(result.data.csrf);
    assert.equal(result.data.user.name, account.username);
    assert.equal(result.data.user.role, account.group);
    return { cookie: cookie.split(';')[0], csrf: result.data.csrf, account };
  }
  const clerkAccount = await account('clerk'), managerAccount = await account('manager'), adminAccount = await account('admin');
  const managerDb = new pg.Client({ ...databaseConfig, user: managerAccount.username, password: managerAccount.password });
  await managerDb.connect(); direct.push(managerDb);
  async function makeBook(title, initial = 10) {
    const sku = `WEB-${randomUUID()}`;
    const id = (await managerDb.query('SELECT api.create_book($1,$2,$3,$4) AS id', [sku, title, '5.25', '12.99'])).rows[0].id;
    if (initial) await managerDb.query('SELECT api.receive($1,$2,$3,$4)', [randomUUID(), id, initial, 'Web test opening stock']);
    return { id, sku, title };
  }
  async function quantity(book) {
    return (await owner.query('SELECT quantity FROM api.catalog WHERE book_id=$1', [book.id])).rows[0].quantity;
  }
  const uniqueTitle = `Web test ${randomBytes(5).toString('hex')}`;
  const book = await makeBook(uniqueTitle);
  let clerk, manager, admin;

  await t.test('static interface has browser security headers and anonymous API access is refused', async () => {
    const page = await request('/');
    assert.equal(page.status, 200);
    assert.match(page.text, /<html/i);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.doesNotMatch(page.headers.get('content-security-policy'), /unsafe-eval/);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await request('/api/books')).status, 401);
    assert.equal((await request('/api/session')).status, 401);
  });

  await t.test('staff logins use individual database credentials and secure session cookies', async () => {
    const failed = await request('/api/login', { method: 'POST', body: { username: clerkAccount.username, password: 'incorrect-password' } });
    assert.equal(failed.status, 401);
    assert.equal(failed.data.error.messageKey, 'authentication');
    assert.doesNotMatch(failed.text, /pg_hba|password authentication failed|postgresql:\/\//i);
    const privileged = await request('/api/login', { method: 'POST', body: { username: decodeURIComponent(url.username), password: decodeURIComponent(url.password) } });
    assert.ok([401, 403].includes(privileged.status), 'DBA credentials must not become a staff UI session');
    clerk = await signIn(clerkAccount);
    manager = await signIn(managerAccount);
    admin = await signIn(adminAccount);
    const session = await request('/api/session', { auth: clerk });
    assert.equal(session.status, 200);
    assert.equal(session.data.user.name, clerkAccount.username);
    assert.equal(session.data.csrf, clerk.csrf);
    assert.match(session.headers.get('cache-control'), /no-store/);
  });

  await t.test('catalog responses hide cost from clerks and all write permissions are checked by the server', async () => {
    const clerkBooks = await request(`/api/books?q=${encodeURIComponent(uniqueTitle)}`, { auth: clerk });
    assert.equal(clerkBooks.status, 200);
    assert.equal(clerkBooks.data.books.length, 1);
    assert.equal(Object.hasOwn(clerkBooks.data.books[0], 'purchase_cost'), false);
    const managerBooks = await request(`/api/books?q=${encodeURIComponent(uniqueTitle)}`, { auth: manager });
    assert.equal(managerBooks.data.books[0].purchase_cost, '5.25');
    assert.equal((await request('/api/activity', { auth: clerk })).status, 403);
    assert.equal((await request('/api/activity', { auth: manager })).status, 403);
    assert.equal((await request('/api/activity', { auth: admin })).status, 200);
    assert.equal((await request('/api/prepare', { auth: clerk, method: 'POST', body: { kind: 'receive', bookQuery: `book ${book.id}`, quantity: 1, reason: 'Unauthorized' } })).status, 403);
    assert.equal((await request('/api/prepare', { auth: manager, method: 'POST', body: { kind: 'adjust', bookQuery: `book ${book.id}`, quantity: -1, reason: 'Unauthorized' } })).status, 403);
    assert.equal((await request('/api/prepare-book', { auth: clerk, method: 'POST', body: { sku: 'NO', title: 'No', purchaseCost: '1', price: '2' } })).status, 403);
    assert.equal(await quantity(book), 10);
  });

  await t.test('cross-site requests, missing CSRF tokens, and non-JSON mutation bodies are refused', async () => {
    const body = { kind: 'sell', bookQuery: `book ${book.id}`, quantity: 1, reason: 'Blocked' };
    const foreign = await request('/api/prepare', { auth: clerk, method: 'POST', body, origin: 'https://untrusted.example' });
    assert.equal(foreign.status, 403);
    assert.equal(foreign.data.error.messageKey, 'badOrigin');
    const noToken = await request('/api/prepare', { auth: clerk, method: 'POST', body, headers: { 'X-CSRF-Token': '' } });
    assert.equal(noToken.status, 403);
    assert.equal(noToken.data.error.messageKey, 'csrf');
    const wrongToken = await request('/api/prepare', { auth: clerk, method: 'POST', body, headers: { 'X-CSRF-Token': manager.csrf } });
    assert.equal(wrongToken.status, 403);
    const textBody = await request('/api/prepare', { auth: clerk, method: 'POST', rawBody: JSON.stringify(body), headers: { 'Content-Type': 'text/plain' } });
    assert.ok([400, 415].includes(textBody.status));
    const malformed = await request('/api/prepare', { auth: clerk, method: 'POST', rawBody: '{invalid' });
    assert.equal(malformed.status, 400);
    // Fetch normalizes the Host header on some Node versions. Send an actual
    // overridden Host through node:http to exercise the DNS-rebinding defense.
    const rebound = await new Promise((resolveResponse, reject) => {
      const outgoing = httpRequest(new URL('/api/session', app.origin), {
        headers: { Host: 'untrusted.example', Origin: app.origin, Cookie: clerk.cookie },
      }, incoming => {
        let text = '';
        incoming.setEncoding('utf8');
        incoming.on('data', chunk => { text += chunk; });
        incoming.on('error', reject);
        incoming.on('end', () => {
          try { resolveResponse({ status: incoming.statusCode, data: JSON.parse(text) }); }
          catch (error) { reject(error); }
        });
      });
      outgoing.setTimeout(5000, () => outgoing.destroy(new Error('Host-header test timed out')));
      outgoing.on('error', reject);
      outgoing.end();
    });
    assert.equal(rebound.status, 403);
    assert.equal(rebound.data.error.messageKey, 'badOrigin');
    assert.equal(await quantity(book), 10);
  });

  await t.test('guided stock changes are previews until confirmation and repeated confirmation writes once', async () => {
    const prepared = await request('/api/prepare', { auth: clerk, method: 'POST', body: { kind: 'sell', bookQuery: `book ${book.id}`, quantity: 2, reason: 'Web receipt 001' } });
    assert.equal(prepared.status, 200, prepared.text);
    assert.equal(prepared.data.type, 'proposal');
    assert.equal(prepared.data.proposal.kind, 'sell');
    assert.equal(prepared.data.proposal.beforeQuantity, 10);
    assert.equal(prepared.data.proposal.afterQuantity, 8);
    assert.equal(await quantity(book), 10);
    const body = { proposalId: prepared.data.proposal.id, reason: 'Web receipt 001' };
    const alien = await request('/api/confirm', { auth: manager, method: 'POST', body });
    assert.ok([403, 404, 410].includes(alien.status));
    const confirmations = await Promise.all(Array.from({ length: 4 }, () => request('/api/confirm', { auth: clerk, method: 'POST', body })));
    for (const confirmed of confirmations) assert.equal(confirmed.status, 200, confirmed.text);
    assert.ok(confirmations[0].data.reference);
    assert.ok(confirmations.every(result => result.data.reference === confirmations[0].data.reference));
    const alteredRetry = await request('/api/confirm', { auth: clerk, method: 'POST', body: { ...body, reason: 'Changed receipt' } });
    assert.equal(alteredRetry.status, 409);
    assert.equal(alteredRetry.data.error.messageKey, 'invalidInput');
    assert.equal(await quantity(book), 8);
    const movements = await owner.query('SELECT actor FROM api.movements WHERE request_id=$1', [confirmations[0].data.reference]);
    assert.equal(movements.rowCount, 1);
    assert.equal(movements.rows[0].actor, clerkAccount.username);
  });

  await t.test('cancelling an unconfirmed review preserves stock and cannot later confirm it', async () => {
    const prepared = await request('/api/prepare', { auth: clerk, method: 'POST', body: { kind: 'sell', bookQuery: `book ${book.id}`, quantity: 1 } });
    assert.equal(prepared.status, 200, prepared.text);
    const body = { proposalId: prepared.data.proposal.id };
    assert.equal((await request('/api/cancel', { auth: clerk, method: 'POST', body })).status, 200);
    const confirmed = await request('/api/confirm', { auth: clerk, method: 'POST', body: { ...body, reason: 'Cancelled review' } });
    assert.ok([404, 409, 410].includes(confirmed.status));
    assert.equal(await quantity(book), 8);
  });

  await t.test('ambiguous titles require explicit selection and cannot be redirected to another book', async () => {
    const title = `Same title ${randomBytes(5).toString('hex')}`;
    const first = await makeBook(title), second = await makeBook(title);
    const body = { kind: 'sell', bookQuery: title, quantity: 1, reason: 'Choose edition' };
    const choices = await request('/api/prepare', { auth: clerk, method: 'POST', body });
    assert.equal(choices.status, 200, choices.text);
    assert.equal(choices.data.type, 'choose');
    assert.equal(choices.data.books.length, 2);
    const redirected = await request('/api/prepare', { auth: clerk, method: 'POST', body: { ...body, bookId: book.id } });
    assert.ok([400, 404].includes(redirected.status));
    const selected = await request('/api/prepare', { auth: clerk, method: 'POST', body: { ...body, bookId: second.id } });
    assert.equal(selected.status, 200, selected.text);
    assert.equal(String(selected.data.proposal.bookId), second.id);
    await request('/api/cancel', { auth: clerk, method: 'POST', body: { proposalId: selected.data.proposal.id } });
    assert.equal(await quantity(first), 10);
    assert.equal(await quantity(second), 10);
  });

  await t.test('English and Chinese requests use the same review flow without accepting arbitrary SQL', async () => {
    const chineseBook = await makeBook(`沙丘测试${randomBytes(3).toString('hex')}`);
    const found = await request('/api/interpret', { auth: clerk, method: 'POST', body: { text: `查找 ${chineseBook.title}`, lang: 'zh' } });
    assert.equal(found.status, 200, found.text);
    assert.equal(found.data.type, 'results');
    assert.ok(found.data.books.some(row => String(row.book_id) === chineseBook.id));
    const prepared = await request('/api/interpret', { auth: clerk, method: 'POST', body: { text: `Sell two copies of book ${chineseBook.id}` } });
    assert.equal(prepared.status, 200, prepared.text);
    assert.equal(prepared.data.type, 'proposal');
    assert.equal(prepared.data.proposal.quantity, 2);
    await request('/api/cancel', { auth: clerk, method: 'POST', body: { proposalId: prepared.data.proposal.id } });
    const sql = await request('/api/interpret', { auth: clerk, method: 'POST', body: { text: 'DROP TABLE bookstore_private.books;' } });
    assert.notEqual(sql.data?.type, 'proposal');
    assert.ok([200, 400].includes(sql.status));
    assert.equal(await quantity(chineseBook), 10);
  });

  await t.test('price reviews fail safely if another staff member has changed the book', async () => {
    const item = await makeBook(`Price test ${randomBytes(4).toString('hex')}`);
    const prepared = await request('/api/prepare', { auth: manager, method: 'POST', body: { kind: 'set_price', bookQuery: `book ${item.id}`, price: '15.00' } });
    assert.equal(prepared.status, 200, prepared.text);
    const before = (await managerDb.query('SELECT * FROM api.inventory WHERE book_id=$1', [item.id])).rows[0];
    await managerDb.query('SELECT api.update_book($1,$2,$3,$4,$5,$6)', [item.id, before.version, item.title, before.purchase_cost, '14.00', true]);
    const confirmed = await request('/api/confirm', { auth: manager, method: 'POST', body: { proposalId: prepared.data.proposal.id } });
    assert.equal(confirmed.status, 409, confirmed.text);
    assert.equal(confirmed.data.error.messageKey, 'stale');
    assert.equal((await managerDb.query('SELECT price FROM api.inventory WHERE book_id=$1', [item.id])).rows[0].price, '14.00');
    await request('/api/cancel', { auth: manager, method: 'POST', body: { proposalId: prepared.data.proposal.id } });
  });

  await t.test('new-book input remains literal and is only saved after review', async () => {
    const sku = `WEB-${randomUUID()}`;
    const title = "Reader's <script>alert('test')</script> book";
    const prepared = await request('/api/prepare-book', { auth: manager, method: 'POST', body: { sku, title, purchaseCost: '8.50', price: '12.99' } });
    assert.equal(prepared.status, 200, prepared.text);
    assert.equal((await owner.query('SELECT 1 FROM api.catalog WHERE sku=$1', [sku])).rowCount, 0);
    const confirmed = await request('/api/confirm', { auth: manager, method: 'POST', body: { proposalId: prepared.data.proposal.id } });
    assert.equal(confirmed.status, 200, confirmed.text);
    const saved = (await owner.query('SELECT title,quantity FROM api.catalog WHERE sku=$1', [sku])).rows[0];
    assert.equal(saved.title, title);
    assert.equal(saved.quantity, 0);
    const results = await request(`/api/books?q=${encodeURIComponent(sku)}`, { auth: clerk });
    assert.equal(results.data.books[0].title, title);
  });

  await t.test('catalog pages have bounded results and stable next-page identifiers', async () => {
    const first = await request('/api/books?limit=2', { auth: clerk });
    assert.equal(first.status, 200);
    assert.equal(first.data.books.length, 2);
    assert.ok(first.data.nextAfter);
    const next = await request(`/api/books?limit=2&after=${first.data.nextAfter}`, { auth: clerk });
    assert.equal(next.status, 200);
    assert.ok(next.data.books.every(row => BigInt(row.book_id) > BigInt(first.data.nextAfter)));
    const oversized = await request('/api/books?limit=1000000', { auth: clerk });
    assert.ok(oversized.status === 400 || (oversized.status === 200 && oversized.data.books.length <= 100));
    const exact = await request('/api/prepare', { auth: clerk, method: 'POST', body: { kind: 'search', bookQuery: `#${book.id}` } });
    assert.equal(exact.status, 200);
    assert.deepEqual(exact.data.books.map(row => row.book_id), [book.id]);
  });

  await t.test('expired reviews cannot change inventory', async () => {
    const shortReviewApp = await start({ proposalTtlMs: 20 });
    const auth = await signIn(clerkAccount, shortReviewApp);
    const prepared = await request('/api/prepare', {
      app: shortReviewApp, origin: shortReviewApp.origin, auth, method: 'POST',
      body: { kind: 'sell', bookQuery: `book ${book.id}`, quantity: 1, reason: 'Expired review' },
    });
    assert.equal(prepared.status, 200, prepared.text);
    await new Promise(resolve => setTimeout(resolve, 60));
    const result = await request('/api/confirm', {
      app: shortReviewApp, origin: shortReviewApp.origin, auth, method: 'POST',
      body: { proposalId: prepared.data.proposal.id, reason: 'Expired review' },
    });
    assert.equal(result.status, 410);
    assert.equal(result.data.error.messageKey, 'expired');
    assert.equal(await quantity(book), 8);
  });

  await t.test('idle sessions expire without relying on browser cookie deletion', async () => {
    const shortSessionApp = await start({ sessionTtlMs: 150 });
    const auth = await signIn(clerkAccount, shortSessionApp);
    await new Promise(resolve => setTimeout(resolve, 220));
    const result = await request('/api/session', { app: shortSessionApp, origin: shortSessionApp.origin, auth });
    assert.equal(result.status, 401);
    assert.equal(result.data.error.messageKey, 'sessionExpired');
  });

  await t.test('logout invalidates the server session as well as clearing the cookie', async () => {
    const result = await request('/api/logout', { auth: clerk, method: 'POST', body: {} });
    assert.equal(result.status, 200);
    assert.match(result.headers.get('set-cookie'), /Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    assert.equal((await request('/api/session', { auth: clerk })).status, 401);
    assert.equal((await request('/api/books', { auth: clerk })).status, 401);
  });
});
