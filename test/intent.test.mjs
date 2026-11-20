// AI-generated code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRequest } from '../web/intent.mjs';

test('finds titles in friendly bookstore requests', () => {
  assert.deepEqual(parseRequest('Find books about gardening'), { intent: 'search', query: 'gardening' });
  assert.deepEqual(parseRequest('Could you please find "War and Peace"?'), { intent: 'search', query: 'War and Peace' });
  assert.deepEqual(parseRequest('Show me all books'), { intent: 'search', query: '' });
  assert.deepEqual(parseRequest('search for Dune'), { intent: 'search', query: 'Dune' });
});

test('recognizes low-stock, history, help, and new-book requests', () => {
  assert.deepEqual(parseRequest('Show low stock'), { intent: 'low_stock', threshold: 5 });
  assert.deepEqual(parseRequest('books running low below 3'), { intent: 'low_stock', threshold: 3 });
  assert.deepEqual(parseRequest('Show books with stock below 10'), { intent: 'low_stock', threshold: 10 });
  assert.deepEqual(parseRequest('Add a new book'), { intent: 'add' });
  assert.deepEqual(parseRequest('show recent activity'), { intent: 'history' });
  assert.deepEqual(parseRequest('What can I do?'), { intent: 'help' });
});

test('sales support words, IDs, SKU, and exact titles', () => {
  assert.deepEqual(parseRequest('Sell two copies of Dune'), { intent: 'sell', quantity: 2, selector: { type: 'title', value: 'Dune' }, reason: null });
  assert.deepEqual(parseRequest('Sold 2 copies of book 123 because receipt R-1'), { intent: 'sell', quantity: 2, selector: { type: 'id', value: '123' }, reason: 'receipt R-1' });
  assert.deepEqual(parseRequest('Sell an SKU BK-123'), { intent: 'sell', quantity: 1, selector: { type: 'sku', value: 'BK-123' }, reason: null });
  assert.deepEqual(parseRequest('Sell 1 copy of "Book 123"'), { intent: 'sell', quantity: 1, selector: { type: 'title', value: 'Book 123' }, reason: null });
});

test('receipts and corrections remain distinct intentions', () => {
  assert.deepEqual(parseRequest('Receive ten copies of #123'), { intent: 'receive', quantity: 10, selector: { type: 'id', value: '123' }, reason: null });
  assert.deepEqual(parseRequest('Add 10 copies of Dune reason Delivery PO-4'), { intent: 'receive', quantity: 10, selector: { type: 'title', value: 'Dune' }, reason: 'Delivery PO-4' });
  assert.deepEqual(parseRequest('Remove 2 damaged copies of Dune'), { intent: 'adjust', quantity: -2, selector: { type: 'title', value: 'Dune' }, reason: 'Damaged copies' });
  assert.deepEqual(parseRequest('Adjust stock of book 123 by -2 because damaged'), { intent: 'adjust', quantity: -2, selector: { type: 'id', value: '123' }, reason: 'damaged' });
});

test('price text is exact and rejects invalid amounts', () => {
  assert.deepEqual(parseRequest('Set the price of Dune to 12.99'), { intent: 'set_price', price: '12.99', selector: { type: 'title', value: 'Dune' } });
  assert.equal(parseRequest('Set price of Dune to 9999999999.99').intent, 'set_price');
  for (const price of ['-1', 'NaN', 'Infinity', '10000000000.00', '1.001', '01.00']) assert.equal(parseRequest(`Set price of Dune to ${price}`).intent, 'unknown');
});

test('quantities and IDs reject invalid bounds without rounding', () => {
  for (const phrase of ['Sell 0 Dune', 'Sell -1 Dune', 'Sell 1.5 Dune', 'Sell 1000000001 Dune', 'Sell one book 0', 'Sell one book -3', 'Sell one #9223372036854775808', 'Adjust stock of Dune by 0']) {
    assert.equal(parseRequest(phrase).intent, 'unknown', phrase);
  }
  assert.equal(parseRequest('Sell 1000000000 Dune').quantity, 1000000000);
  assert.equal(parseRequest('Sell one #9223372036854775807').selector.value, '9223372036854775807');
});

test('quoted titles protect reason words and allow apostrophes', () => {
  assert.deepEqual(parseRequest('Sell one copy of "The Reason Why" because receipt 5'), { intent: 'sell', quantity: 1, selector: { type: 'title', value: 'The Reason Why' }, reason: 'receipt 5' });
  assert.equal(parseRequest("Find O'Reilly").query, "O'Reilly");
  assert.equal(parseRequest('Sell one copy of “Dune”').selector.value, 'Dune');
  assert.equal(parseRequest('Sell one copy of "Dune').intent, 'unknown');
});

test('combined requests, code, and multiline operations fail closed', () => {
  for (const input of ['Sell 2 Dune and receive 3 Dune', 'Sell 2 Dune then add 3 Dune', 'Sell 2 Dune; DROP TABLE books', 'SELECT * FROM books', 'Run SQL to update stock', 'Sell 2 Dune\nReceive 2 Dune', 'Sell 2 Dune `command`']) assert.equal(parseRequest(input).intent, 'unknown', input);
});

test('missing, excessive, and unsupported input asks for clarification', () => {
  for (const input of ['', '   ', null, {}, 'x'.repeat(1001), 'Sell Sell two copies of Dune', 'delete all books', 'transfer inventory', 'Sell one book', 'Sell one SKU']) assert.equal(parseRequest(input).intent, 'unknown', String(input));
});

test('Chinese searches and basic actions match the English intent contract', () => {
  assert.deepEqual(parseRequest('请帮我搜索《沙丘》！'), { intent: 'search', query: '沙丘' });
  assert.deepEqual(parseRequest('查找 三体'), { intent: 'search', query: '三体' });
  assert.deepEqual(parseRequest('显示全部图书'), { intent: 'search', query: '' });
  assert.deepEqual(parseRequest('显示库存不足'), { intent: 'low_stock', threshold: 5 });
  assert.deepEqual(parseRequest('显示库存不足 3'), { intent: 'low_stock', threshold: 3 });
  assert.deepEqual(parseRequest('查看库存少于十本的图书'), { intent: 'low_stock', threshold: 10 });
  assert.deepEqual(parseRequest('显示库存不足零本'), { intent: 'low_stock', threshold: 0 });
  assert.deepEqual(parseRequest('添加新书'), { intent: 'add' });
  assert.deepEqual(parseRequest('帮助'), { intent: 'help' });
  assert.deepEqual(parseRequest('查看记录'), { intent: 'history' });
});

test('Chinese sale and delivery requests support both documented quantity positions', () => {
  const dune = { type: 'title', value: '沙丘' };
  assert.deepEqual(parseRequest('卖出 沙丘 2 本'), { intent: 'sell', quantity: 2, selector: dune, reason: null });
  assert.deepEqual(parseRequest('售出两本沙丘 备注：小票1042'), { intent: 'sell', quantity: 2, selector: dune, reason: '小票1042' });
  assert.deepEqual(parseRequest('入库5本沙丘原因：到货 PO-17'), { intent: 'receive', quantity: 5, selector: dune, reason: '到货 PO-17' });
  assert.deepEqual(parseRequest('收货 沙丘 十五 本'), { intent: 'receive', quantity: 15, selector: dune, reason: null });
  assert.deepEqual(parseRequest('卖出《沙丘》两本'), { intent: 'sell', quantity: 2, selector: dune, reason: null });
  assert.deepEqual(parseRequest('入库九十九本《沙丘》'), { intent: 'receive', quantity: 99, selector: dune, reason: null });
});

test('Chinese selectors keep ID and SKU separate from quoted titles', () => {
  assert.deepEqual(parseRequest('卖出1本图书编号123').selector, { type: 'id', value: '123' });
  assert.deepEqual(parseRequest('卖出 编号 123 1 本').selector, { type: 'id', value: '123' });
  assert.deepEqual(parseRequest('收货1本库存编号 BK-123').selector, { type: 'sku', value: 'BK-123' });
  assert.deepEqual(parseRequest('收货1本SKU BK-123').selector, { type: 'sku', value: 'BK-123' });
  assert.deepEqual(parseRequest('卖出1本《编号123》').selector, { type: 'title', value: '编号123' });
  assert.deepEqual(parseRequest('卖出1本「1984」').selector, { type: 'title', value: '1984' });
});

test('Chinese corrections use deltas and prices remain exact decimal text', () => {
  assert.deepEqual(parseRequest('调整 沙丘 库存 -1 原因破损'), { intent: 'adjust', quantity: -1, selector: { type: 'title', value: '沙丘' }, reason: '破损' });
  assert.deepEqual(parseRequest('调整《沙丘》的库存2备注：盘点'), { intent: 'adjust', quantity: 2, selector: { type: 'title', value: '沙丘' }, reason: '盘点' });
  assert.deepEqual(parseRequest('将 沙丘 的售价改为 12.99'), { intent: 'set_price', price: '12.99', selector: { type: 'title', value: '沙丘' } });
  assert.deepEqual(parseRequest('把《三体》的售价设为18.50元'), { intent: 'set_price', price: '18.50', selector: { type: 'title', value: '三体' } });
  assert.equal(parseRequest('将沙丘售价改为9999999999.99').price, '9999999999.99');
});

test('Chinese monetary, numeric and selector errors fail without rounding or guessing', () => {
  for (const input of ['卖出0本沙丘', '卖出零本沙丘', '卖出-1本沙丘', '卖出1.5本沙丘', '卖出一二本沙丘', '卖出一百本沙丘', '卖出1000000001本沙丘', '卖出1本编号0', '卖出1本编号-1', '卖出1本编号9223372036854775808', '调整沙丘库存0', '调整沙丘库存-1000000001', '卖出沙丘2本', '将沙丘售价改为01.00', '将沙丘售价改为1.001', '将沙丘售价改为-1', '将沙丘售价改为Infinity', '将沙丘售价改为10000000000.00']) {
    assert.equal(parseRequest(input).intent, 'unknown', input);
  }
  assert.equal(parseRequest('卖出1000000000本沙丘').quantity, 1000000000);
});

test('quoted titles protect both languages from delimiter and punctuation confusion', () => {
  assert.deepEqual(parseRequest('卖出1本《原因与结果》备注：小票1'), { intent: 'sell', quantity: 1, selector: { type: 'title', value: '原因与结果' }, reason: '小票1' });
  assert.equal(parseRequest('Find "And Then There Were None"').query, 'And Then There Were None');
  assert.equal(parseRequest('卖出1本《然后卖出》').selector.value, '然后卖出');
  assert.equal(parseRequest('Sell 1 copy of "A; B"').selector.value, 'A; B');
  assert.equal(parseRequest('查找《A，B》').query, 'A，B');
  for (const input of ['卖出1本《沙丘', '查找《沙丘”', '卖出1本沙丘备注：', 'Sell 1 copy of Dune because ""', '卖出1本沙丘原因：""']) {
    assert.equal(parseRequest(input).intent, 'unknown', input);
  }
});

test('Chinese combined requests and code-like input are rejected with a translatable key', () => {
  for (const input of ['卖出2本沙丘然后入库3本三体', '卖出2本沙丘，入库3本三体', '卖出2本沙丘和入库3本三体', '卖出2本沙丘；入库3本三体', '卖出2本沙丘\n入库3本三体', '卖出2本沙丘再卖出1本三体', '删除所有图书', '执行SQL', '查找x SELECT * FROM books']) {
    const result = parseRequest(input);
    assert.equal(result.intent, 'unknown', input);
    assert.equal(result.messageKey, 'unsupported', input);
  }
});
