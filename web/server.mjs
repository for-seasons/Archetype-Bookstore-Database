import http from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import pg from 'pg';
import { connectionOptions, buildCommand } from '../client.mjs';
import { parseRequest } from './intent.mjs';

const rank = { clerk: 1, manager: 2, admin: 3 };
const roleForChange = new Map([
  ['sell', 'clerk'],
  ['receive', 'manager'],
  ['set_price', 'manager'],
  ['adjust', 'admin'],
]);
const maxSessionAgeMs = 8 * 60 * 60 * 1000;
const loginWindowMs = 5 * 60 * 1000;
const messages = {
  authentication: 'Sign-in failed. Check your staff account and password.',
  sessionExpired: 'Your session has ended. Please sign in again.',
  forbidden: 'Your account does not have permission for this action.',
  csrf: 'Refresh the page and sign in again before making changes.',
  badOrigin: 'This request did not come from the local bookstore interface.',
  invalidInput: 'Check the entered details and try again.',
  unsupported: 'Use one supported bookstore request, or the guided input boxes.',
  notFound: 'No matching book was found. Check the title, stock code, or book number.',
  ambiguous: 'Be more specific: use the stock code or book number.',
  expired: 'This review is unavailable or expired. If you already pressed Confirm, check the inventory and history before making a new request.',
  stale: 'This book changed. Cancel the review and read the latest details.',
  insufficientStock: 'There is not enough stock, the book is inactive, or the quantity is outside the allowed range.',
  duplicateSku: 'This stock code already exists. Check the catalog before adding again.',
  rateLimited: 'Too many sign-in attempts. Wait five minutes and try again.',
  busy: 'The desk is busy. Finish the current operation and try again.',
  unavailable: 'The database is unavailable. Please contact the store administrator.',
  uncertain: 'The result could not be verified. Keep the reference and ask an administrator to check the history before creating a new request.',
  alreadyConfirmed: 'This change was already submitted. Check the inventory and history.',
};
const databaseErrors = {
  '42501': 'forbidden',
  '40001': 'stale',
  '23505': 'duplicateSku',
  '23514': 'insufficientStock',
  '22023': 'invalidInput',
  '22003': 'invalidInput',
  'P0002': 'notFound',
  '55P03': 'busy',
  '57014': 'busy',
};

class AppError extends Error {
  constructor(code, status = 400, reference) {
    super(messages[code] || messages.invalidInput);
    this.code = code;
    this.status = status;
    this.reference = reference;
  }
}
function fail(code, status = 400) { throw new AppError(code, status); }
function boundedText(value, max = 500, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/.test(value) || (!allowEmpty && !value.trim())) fail('invalidInput');
  return value.trim();
}
function integer(value, min = 1n, max = 1000000000n) {
  if (!/^-?\d+$/.test(String(value))) fail('invalidInput');
  const n = BigInt(value);
  if (n < min || n > max) fail('invalidInput');
  return n.toString();
}
function idValue(value) { return integer(value, 1n, 9223372036854775807n); }
function priceValue(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value)) fail('invalidInput');
  return value;
}
function equalSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function like(value) { return value.replace(/[!%_]/g, c => `!${c}`); }
function safeDatabaseError(error, reference) {
  if (error instanceof AppError) return error;
  const code = databaseErrors[error.code];
  if (code) {
    const status = code === 'forbidden' ? 403 : 409;
    return new AppError(code, status, reference);
  }
  return new AppError(reference ? 'uncertain' : 'unavailable', 503, reference);
}

export function createApp({ databaseConfig, localOrigin, sessionTtlMs = 900000, proposalTtlMs = 300000, maxSessions = 12 } = {}) {
  if (!databaseConfig?.host || !databaseConfig?.database) throw new Error('Database host and database name are required.');
  const sessions = new Map();
  const attempts = new Map();
  let pendingLogins = 0;
  const files = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
    ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
    ['/i18n.js', ['i18n.js', 'text/javascript; charset=utf-8']],
  ]);
  const origin = () => localOrigin || `http://127.0.0.1:${server.address()?.port}`;
  function json(res, status, value, headers = {}) {
    res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', ...headers });
    res.end(JSON.stringify(value));
  }
  async function discard(token) {
    const session = sessions.get(token);
    if (!session) return;
    sessions.delete(token);
    await session.client.end().catch(() => {});
    session.proposals.clear();
  }
  function tokenOf(req) {
    const prefix = 'bookstore_session=';
    const cookies = (req.headers.cookie || '').split(';').map(cookie => cookie.trim());
    const sessionCookie = cookies.find(cookie => cookie.startsWith(prefix));
    return sessionCookie?.slice(prefix.length);
  }
  function sessionExpired(session) {
    return Date.now() - session.lastSeen > sessionTtlMs || Date.now() - session.created > maxSessionAgeMs;
  }

  function authenticate(req) {
    const token = tokenOf(req);
    const session = sessions.get(token);
    if (!session || sessionExpired(session)) {
      if (session) void discard(token);
      fail('sessionExpired', 401);
    }
    if (session.broken) fail('unavailable', 503);
    session.lastSeen = Date.now();
    return session;
  }
  function authorize(session, role) { if (rank[session.user.role] < rank[role]) fail('forbidden', 403); }
  async function readBody(req) {
    if (!/^application\/json(?:\s*;.*)?$/i.test(req.headers['content-type'] || '')) fail('invalidInput', 415);
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 16384) fail('invalidInput', 413);
      chunks.push(chunk);
    }
    try {
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!data || typeof data !== 'object' || Array.isArray(data)) fail('invalidInput');
      return data;
    } catch { fail('invalidInput'); }
  }
  function catalogView(session) {
    return rank[session.user.role] >= rank.manager ? 'api.inventory' : 'api.catalog';
  }

  async function books(session, { q = '', low, after = '0', limit = '40' } = {}) {
    q = boundedText(q, 500, true);
    const idMatch = /^#(\d+)$/.exec(q);
    const exactId = idMatch ? idValue(idMatch[1]) : null;
    const view = catalogView(session);
    const take = Number(integer(limit, 1n, 100n));
    const afterId = integer(after, 0n, 9223372036854775807n);
    const searchPattern = q && !exactId ? `%${like(q)}%` : null;
    const lowStockThreshold = low == null ? null : integer(low, 0n);
    const values = [afterId, searchPattern, lowStockThreshold, exactId, take + 1];
    const result = await session.client.query(`SELECT * FROM ${view} WHERE book_id > $1::bigint
      AND ($2::text IS NULL OR title ILIKE $2 ESCAPE '!' OR sku ILIKE $2 ESCAPE '!')
      AND ($3::integer IS NULL OR (active AND quantity < $3::integer))
      AND ($4::bigint IS NULL OR book_id = $4::bigint) ORDER BY book_id LIMIT $5`, values);
    return { books: result.rows.slice(0, take), nextAfter: result.rows.length > take ? result.rows[take - 1].book_id : null };
  }
  async function resolveBook(session, selector, chosenId) {
    const view = catalogView(session);
    let predicate, value;
    if (selector.type === 'id') { predicate = 'book_id=$1::bigint'; value = idValue(selector.value); }
    else if (selector.type === 'sku') { predicate = 'sku=$1'; value = boundedText(selector.value,64); }
    else { predicate = "(title ILIKE $1 ESCAPE '!' OR sku ILIKE $1 ESCAPE '!')"; value = `%${like(boundedText(selector.value))}%`; }
    const result = await session.client.query(`SELECT * FROM ${view} WHERE ${predicate} ORDER BY book_id LIMIT 21`, [value]);
    if (!result.rows.length) fail('notFound', 404);
    if (result.rows.length > 20) fail('ambiguous');
    if (chosenId != null) {
      const chosen = result.rows.find(row => row.book_id === idValue(chosenId));
      if (!chosen) fail('invalidInput');
      return chosen;
    }
    return result.rows.length === 1 ? result.rows[0] : result.rows;
  }
  function saveProposal(session, details, query) {
    for (const [id, proposal] of session.proposals) {
      if (Date.now() > proposal.deadline && !proposal.started) session.proposals.delete(id);
    }
    if (session.proposals.size >= 5000) fail('busy', 429);
    const id = randomUUID(), deadline = Date.now() + proposalTtlMs;
    const proposal = { id, ...details, expiresAt: new Date(deadline).toISOString() };
    session.proposals.set(id, { public:proposal, query, deadline, started:false, frozenReason:null, result:null, running:null });
    return { type:'proposal', proposal };
  }
  async function prepare(session, intent, chosenId) {
    if (intent.intent === 'unknown') return { type:'message', messageKey:'unsupported' };
    if (intent.intent === 'help') return { type:'help', messageKey:'help' };
    if (intent.intent === 'search' || intent.intent === 'low_stock') {
      const result = await books(session, intent.intent === 'search' ? { q:intent.query } : { low:intent.threshold });
      return { type:'results', messageKey:'results', ...result };
    }
    if (intent.intent === 'history') { authorize(session,'admin'); return { type:'activity' }; }
    if (intent.intent === 'add') { authorize(session,'manager'); return { type:'form', form:'add' }; }
    const requiredRole = roleForChange.get(intent.intent);
    if (!requiredRole) fail('unsupported');
    authorize(session, requiredRole);
    const book = await resolveBook(session, intent.selector, chosenId);
    if (Array.isArray(book)) return { type:'choose', messageKey:'chooseBook', books:book };
    if (!book.active && intent.intent !== 'set_price') fail('insufficientStock',409);
    const details = { kind:intent.intent, title:book.title, sku:book.sku, bookId:book.book_id };
    if (intent.intent === 'set_price') {
      const price = priceValue(intent.price);
      return saveProposal(session, { ...details, beforePrice:book.price, price, reasonRequired:false }, {
        text:'SELECT api.update_book($1,$2,$3,$4,$5,$6) AS version',
        values:[book.book_id,book.version,book.title,book.purchase_cost,price,book.active],
      });
    }
    const quantity = Number(integer(intent.quantity, intent.intent === 'adjust' ? -1000000000n : 1n));
    if (quantity === 0) fail('invalidInput');
    const stockChange = intent.intent === 'sell' ? -quantity : quantity;
    const after = book.quantity + stockChange;
    if (after < 0 || after > 1000000000) fail('insufficientStock',409);
    const reference = randomUUID();
    return saveProposal(session, { ...details, reference, quantity, beforeQuantity:book.quantity, afterQuantity:after,
      reason:intent.reason ? boundedText(intent.reason) : '', reasonRequired:true }, {
      text:`SELECT api.${intent.intent}($1::uuid,$2::bigint,$3::integer,$4::text) AS quantity_after`,
      values:[reference,book.book_id,quantity,null],
    });
  }
  function guided(body) {
    if (!['search','sell','receive','adjust','set_price','low_stock'].includes(body.kind)) fail('invalidInput');
    if (body.kind === 'search') return { intent:'search', query:boundedText(body.bookQuery ?? '',500,true) };
    if (body.kind === 'low_stock') return { intent:'low_stock',threshold:5 };
    const query = boundedText(body.bookQuery);
    let selector = { type:'title',value:query };
    const id = /^(?:#|book(?: id)?\s*|图书编号\s*|编号\s*)(\d+)$/i.exec(query);
    const sku = /^(?:sku\s+|库存编号\s*)(.+)$/i.exec(query);
    if (id) selector = { type:'id',value:idValue(id[1]) };
    else if (sku) selector = { type:'sku',value:boundedText(sku[1],64) };
    return { intent:body.kind, selector, quantity:body.quantity, price:body.price,
      reason:body.reason ? boundedText(body.reason) : null };
  }
  function findProposal(session, id) {
    const proposal = session.proposals.get(id);
    if (!proposal) fail('expired', 410);
    return proposal;
  }

  async function confirm(session, body) {
    const proposal = findProposal(session, body.proposalId);
    const reason = proposal.public.reasonRequired ? boundedText(body.reason || proposal.public.reason) : '';
    if (proposal.started && reason !== proposal.frozenReason) fail('invalidInput',409);
    if (proposal.result) return proposal.result;
    if (proposal.running) return proposal.running;
    if (!proposal.started && Date.now() > proposal.deadline) fail('expired',410);
    proposal.started = true;
    proposal.frozenReason = reason;
    if (proposal.public.reasonRequired) proposal.query.values[3] = reason;
    proposal.running = (async () => {
      try {
        const result = await session.client.query(proposal.query);
        proposal.result = { messageKey:'saved', reference:proposal.public.reference, result:result.rows[0] };
        return proposal.result;
      } catch (error) {
        const mapped = safeDatabaseError(error, proposal.public.reference || proposal.public.sku);
        proposal.uncertain = mapped.code === 'uncertain';
        throw mapped;
      } finally { proposal.running = null; }
    })();
    return proposal.running;
  }
  async function login(req, res) {
    const body = await readBody(req);
    const username = boundedText(body.username,63);
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(username) || typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 1024) fail('authentication',401);
    const now = Date.now();
    const key = req.socket.remoteAddress || 'loopback';
    const entry = attempts.get(key);
    const history = entry && now - entry.started < loginWindowMs ? entry : { started:now,count:0 };
    if (++history.count > 10) fail('rateLimited',429);
    attempts.set(key,history);
    if (sessions.size + pendingLogins >= maxSessions) fail('busy',429);
    pendingLogins++;
    const client = new pg.Client({
      ...databaseConfig,
      user: username,
      password: body.password,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
      lock_timeout: 5000,
      idle_in_transaction_session_timeout: 15000,
      application_name: 'bookstore-desk',
    });
    let session;
    client.on('error', () => { if (session) session.broken = true; });
    try {
      await client.connect();
      const result = await client.query(`SELECT session_user AS name,
        CASE WHEN pg_has_role(session_user,'bookstore_admin','USAGE') THEN 'admin'
          WHEN pg_has_role(session_user,'bookstore_manager','USAGE') THEN 'manager'
          WHEN pg_has_role(session_user,'bookstore_clerk','USAGE') THEN 'clerk' END AS role,
        r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls
          OR pg_has_role(session_user,'bookstore_owner','MEMBER') AS privileged
        FROM pg_roles r WHERE r.rolname=session_user`);
      const user = result.rows[0];
      if (!user?.role || user.privileged) fail('authentication',401);
      const oldToken = tokenOf(req);
      if (oldToken) await discard(oldToken);
      const token = randomBytes(32).toString('hex');
      session = {
        client,
        user: { name: user.name, role: user.role },
        csrf: randomBytes(32).toString('hex'),
        created: now,
        lastSeen: now,
        proposals: new Map(),
        broken: false,
      };
      sessions.set(token, session);
      attempts.delete(key);
      json(res,200,{user:session.user,csrf:session.csrf},{'Set-Cookie':`bookstore_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`});
    } catch {
      await client.end().catch(() => {});
      fail('authentication', 401);
    } finally { pendingLogins--; }
  }

  async function handleRead(session, url, res) {
    switch (url.pathname) {
      case '/api/session':
        return json(res, 200, { user: session.user, csrf: session.csrf });
      case '/api/books': {
        const filters = Object.fromEntries(url.searchParams);
        return json(res, 200, await books(session, filters));
      }
      case '/api/summary': {
        const summary = await session.client.query(`
          SELECT count(*)::text AS titles,
                 coalesce(sum(quantity::bigint), 0)::text AS copies,
                 count(*) FILTER (WHERE active AND quantity < 5)::text AS "lowStock"
          FROM api.catalog`);
        return json(res, 200, summary.rows[0]);
      }
      case '/api/activity': {
        authorize(session, 'admin');
        const movements = await session.client.query('SELECT * FROM api.movements ORDER BY movement_id DESC LIMIT 100');
        const catalog = await session.client.query('SELECT * FROM api.audit_log ORDER BY audit_id DESC LIMIT 100');
        return json(res, 200, { movements: movements.rows, catalog: catalog.rows });
      }
      default:
        fail('notFound', 404);
    }
  }

  async function handleWrite(session, url, req, res) {
    const body = await readBody(req);
    switch (url.pathname) {
      case '/api/logout':
        await discard(tokenOf(req));
        return json(res, 200, { ok: true }, {
          'Set-Cookie': 'bookstore_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
        });
      case '/api/interpret':
        return json(res, 200, await prepare(session, parseRequest(body.text), body.bookId));
      case '/api/prepare':
        return json(res, 200, await prepare(session, guided(body), body.bookId));
      case '/api/prepare-book': {
        authorize(session, 'manager');
        const sku = boundedText(body.sku, 64);
        const title = boundedText(body.title);
        const purchaseCost = priceValue(body.purchaseCost);
        const price = priceValue(body.price);
        const query = buildCommand(['add', '--sku', sku, '--title', title, '--cost', purchaseCost, '--price', price]);
        const details = { kind: 'add', title, sku, purchaseCost, price, reasonRequired: false };
        return json(res, 200, saveProposal(session, details, query));
      }
      case '/api/confirm':
        return json(res, 200, await confirm(session, body));
      case '/api/cancel': {
        const proposal = findProposal(session, body.proposalId);
        if (proposal.running || proposal.uncertain || proposal.result) fail('alreadyConfirmed', 409);
        session.proposals.delete(body.proposalId);
        return json(res, 200, { messageKey: 'cancelled' });
      }
      default:
        fail('notFound', 404);
    }
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Cache-Control','no-store');
    try {
      if (req.headers.host !== new URL(origin()).host || req.headers['sec-fetch-site'] === 'cross-site') fail('badOrigin',403);
      if (!['GET','POST'].includes(req.method)) fail('invalidInput',405);
      const url = new URL(req.url,origin());
      if (req.method === 'GET' && files.has(url.pathname)) {
        const [name,type] = files.get(url.pathname);
        let body; try { body = readFileSync(new URL(`./public/${name}`,import.meta.url)); } catch { fail('notFound',404); }
        res.writeHead(200,{'Content-Type':type}); res.end(body); return;
      }
      if (!url.pathname.startsWith('/api/')) fail('notFound',404);
      if (req.method === 'POST' && req.headers.origin !== origin()) fail('badOrigin',403);
      if (url.pathname === '/api/login' && req.method === 'POST') {
        await login(req, res);
        return;
      }
      const session = authenticate(req);
      if (req.method === 'POST' && !equalSecret(req.headers['x-csrf-token'],session.csrf)) fail('csrf',403);
      if (req.method === 'GET') {
        await handleRead(session, url, res);
        return;
      }
      await handleWrite(session, url, req, res);
    } catch (error) {
      const mapped = safeDatabaseError(error);
      if (!res.headersSent) json(res,mapped.status,{error:{code:mapped.code,messageKey:mapped.code,message:mapped.message},...(mapped.reference ? {reference:mapped.reference} : {})});
      else res.end();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  const timer = setInterval(() => {
    for (const [token, session] of sessions) {
      if (sessionExpired(session)) void discard(token);
    }
    for (const [key,history] of attempts) if (Date.now() - history.started > loginWindowMs) attempts.delete(key);
  }, 30000);
  timer.unref();
  return { server, async close() {
    clearInterval(timer);
    await Promise.allSettled([...sessions.keys()].map(discard));
    await new Promise(resolveClose => { server.close(resolveClose); server.closeIdleConnections(); });
  } };
}

async function main() {
  try {
    let configuration = {};
    try { configuration = JSON.parse(readFileSync(new URL('./config.json',import.meta.url),'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('Invalid web/config.json.'); }
    const env = { ...process.env,PGHOST:configuration.host || process.env.PGHOST,
      PGPORT:String(configuration.port || process.env.PGPORT || '5432'),PGDATABASE:configuration.database || process.env.PGDATABASE,
      BOOKSTORE_CA_FILE:configuration.caFile || process.env.BOOKSTORE_CA_FILE,
      BOOKSTORE_LOCAL_DEV:configuration.localDevelopment === undefined ? process.env.BOOKSTORE_LOCAL_DEV : String(Number(configuration.localDevelopment === true)),
      PGUSER:'ui_configuration_check',PGPASSWORD:'not-a-login' };
    const databaseConfig = connectionOptions(env);
    delete databaseConfig.user;
    delete databaseConfig.password;
    const port = Number(integer(String(configuration.uiPort || process.env.BOOKSTORE_UI_PORT || '4178'),1024n,65535n));
    const app = createApp({databaseConfig});
    app.server.on('error',error=>{console.error(error.code === 'EADDRINUSE' ? 'Bookstore Desk is already running, or its port is in use.' : 'Could not start Bookstore Desk.');process.exitCode=1;});
    app.server.listen(port,'127.0.0.1',()=>{
      console.log(`Bookstore Desk: http://127.0.0.1:${port}`);
      console.log('Open this address on this computer. Sign in with your staff account.');
      if (process.argv.includes('--open') && process.platform === 'win32') {
        import('node:child_process').then(({spawn})=>{
          const browser = spawn('rundll32.exe',['url.dll,FileProtocolHandler',`http://127.0.0.1:${port}`],{windowsHide:true,stdio:'ignore'});
          browser.on('error',()=>console.error('Could not open the browser. Open the printed address manually.'));
        });
      }
    });
    for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>app.close().then(()=>{process.exitCode=0;}));
  } catch(error) { console.error(`Bookstore Desk setup: ${error.message}`); process.exitCode=1; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
