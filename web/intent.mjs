// A deliberately bounded English/Chinese interpreter. It returns structured
// intentions only; permissions, book selection, and writes belong to the server.
const numberWords = new Map([
  ['a', 1], ['an', 1], ['one', 1], ['two', 2], ['three', 3], ['four', 4],
  ['five', 5], ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10],
  ['eleven', 11], ['twelve', 12], ['thirteen', 13], ['fourteen', 14],
  ['fifteen', 15], ['sixteen', 16], ['seventeen', 17], ['eighteen', 18],
  ['nineteen', 19], ['twenty', 20],
]);
const quantityToken = '(\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)';
const stockSentence = new RegExp(`^(sell|sold|receive|received|restock|add) ${quantityToken} (?:cop(?:y|ies) of |books? of |units? of )?(.+)$`, 'i');
const removeSentence = new RegExp(`^remove ${quantityToken} (?:(damaged) )?(?:cop(?:y|ies) of |books? of |units? of )?(.+)$`, 'i');
const chineseQuantityToken = '(\\d+|[零一二两三四五六七八九十]+)';
const quotePairs = new Map([['"', '"'], ['“', '”'], ['《', '》'], ['「', '」']]);
const unsupported = message => ({ intent: 'unknown', messageKey: 'unsupported', message });
const oneRequest = 'Please ask for one task at a time, such as “Sell two copies of Dune”.';
const stockHelp = 'Include a book and a whole-number quantity, for example “Sell two copies of Dune”.';

function count(value, { signed = false, allowZero = false } = {}) {
  if (numberWords.has(value.toLowerCase())) return numberWords.get(value.toLowerCase());
  if (/^[零一二两三四五六七八九十]+$/.test(value)) {
    const digits = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    if (value in digits) value = String(digits[value]);
    else if (/^[一二三四五六七八九]?十[一二三四五六七八九]?$/.test(value)) {
      const [tens, units] = value.split('十');
      value = String((tens ? digits[tens] : 1) * 10 + (units ? digits[units] : 0));
    } else return null;
  }
  if (!(signed ? /^-?\d+$/ : /^\d+$/).test(value)) return null;
  const n = BigInt(value);
  if (n > 1000000000n || n < (signed ? -1000000000n : 0n) || (!allowZero && n === 0n)) return null;
  return Number(n);
}

function cleanText(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500 || /[\u0000-\u001f\u007f]/.test(trimmed)) return null;
  if (quotePairs.has(trimmed[0])) {
    const closing = quotePairs.get(trimmed[0]);
    if (!trimmed.endsWith(closing) || trimmed.length < 3) return null;
    const inside = trimmed.slice(1, -1).trim();
    if (!inside || inside.includes(closing)) return null;
    return inside;
  }
  if (/["“”《》「」]/.test(trimmed)) return null;
  return trimmed;
}

function selector(value) {
  // Quoting makes numeric-looking titles unambiguously titles.
  const quoted = quotePairs.has(value.trim()[0]);
  const text = cleanText(value);
  if (!text) return null;
  if (!quoted) {
    const id = /^(?:book(?: id)?\s+|(?:图书)?编号\s*|#)(\d+)$/i.exec(text);
    if (id) {
      const n = BigInt(id[1]);
      return n > 0n && n <= 9223372036854775807n ? { type: 'id', value: n.toString() } : null;
    }
    if (/^(?:book(?: id)?\s+[-+]?\d|(?:图书)?编号\s*|#)/i.test(text)) return null;
    const sku = /^(?:sku\s+|库存编号\s*[:：]?\s*)(.+)$/i.exec(text);
    if (sku) return sku[1].length <= 64 ? { type: 'sku', value: sku[1] } : null;
    if (/^(?:book(?: id)?|sku|库存编号)$/i.test(text)) return null;
  }
  return { type: 'title', value: text };
}

function withReason(text) {
  // Reason delimiters inside double-quoted titles are treated as title text.
  let quoted = false;
  let quoteEnd = '';
  for (let index = 0; index < text.length; index++) {
    const c = text[index];
    if (!quoted && quotePairs.has(c)) { quoted = true; quoteEnd = quotePairs.get(c); continue; }
    if (quoted && c === quoteEnd) { quoted = false; continue; }
    if (!quoted) {
      const delimiter = /^(?:\s+(?:because|reason:?)[ ]+|\s*(?:原因|备注)\s*[:：]?\s*)/i.exec(text.slice(index));
      if (delimiter) {
        const reason = cleanText(text.slice(index + delimiter[0].length));
        return { book: text.slice(0, index).trim(), reason, invalidReason: !reason };
      }
    }
  }
  return { book: text, reason: null };
}

function stockResult(intent, quantity, text, fallbackReason = null) {
  const parts = withReason(text);
  const book = selector(parts.book);
  if (!book || quantity === null || parts.invalidReason) return unsupported(stockHelp);
  return { intent, quantity, selector: book, reason: parts.reason || fallbackReason };
}

function parseChinese(text) {
  if (/^(?:帮助|使用帮助|我能做什么|可以做什么|显示示例)$/.test(text)) return { intent: 'help' };
  if (/^(?:添加新书|新增图书|新增书籍|添加一本新书)$/.test(text)) return { intent: 'add' };
  if (/^(?:查看|显示)?(?:最近)?(?:记录|操作记录|活动记录|历史记录)$/.test(text)) return { intent: 'history' };
  if (/^(?:显示|查看|列出|浏览)(?:所有|全部)?(?:图书|书籍|库存|目录)$/.test(text)) return { intent: 'search', query: '' };

  let match = new RegExp(`^(?:显示|查看|查找|列出)?库存不足(?:\\s*(?:低于|少于|不足)?\\s*${chineseQuantityToken}\\s*(?:本)?)?(?:的?(?:书籍|图书))?$`).exec(text);
  if (!match) match = new RegExp(`^(?:显示|查看|查找|列出)?库存(?:低于|少于)\\s*${chineseQuantityToken}\\s*(?:本)?(?:的?(?:书籍|图书))?$`).exec(text);
  if (match) {
    const threshold = match[1] ? count(match[1], { allowZero: true }) : 5;
    return threshold === null ? unsupported('Use a stock threshold between 0 and 1,000,000,000.') : { intent: 'low_stock', threshold };
  }

  match = /^(?:将|把)?\s*(.+?)\s*的?(?:售价|价格)\s*(?:改为|设为|设置为|调整为)\s*(\d+(?:\.\d+)?)\s*(?:元)?$/.exec(text);
  if (match) {
    const book = selector(match[1]);
    const price = match[2];
    if (!book || !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(price)) return unsupported('Use a valid book and a price with at most two decimal places.');
    return { intent: 'set_price', price, selector: book };
  }

  if (/^调整/.test(text)) {
    const parts = withReason(text);
    match = /^调整\s*(.+?)\s*的?库存\s*(?:变化|变动)?\s*(-?\d+)\s*(?:本)?$/.exec(parts.book);
    if (!match || parts.invalidReason) return unsupported('Use “调整 沙丘 库存 -1 原因：破损”.');
    const book = selector(match[1]);
    const quantity = count(match[2], { signed: true });
    return book && quantity !== null ? { intent: 'adjust', quantity, selector: book, reason: parts.reason } : unsupported(stockHelp);
  }

  match = /^(卖出|售出|销售|入库|收货|补货)\s*(.+)$/.exec(text);
  if (match) {
    const intent = /^(?:卖出|售出|销售)$/.test(match[1]) ? 'sell' : 'receive';
    const parts = withReason(match[2]);
    if (parts.invalidReason) return unsupported(stockHelp);
    let quantityText, bookText;
    let words = new RegExp(`^${chineseQuantityToken}\\s*本\\s*(.+)$`).exec(parts.book);
    if (words) [, quantityText, bookText] = words;
    else {
      words = new RegExp(`^(.+?)\\s+${chineseQuantityToken}\\s*本$`).exec(parts.book);
      if (!words) words = new RegExp(`^(["“《「].+["”》」])\\s*${chineseQuantityToken}\\s*本$`).exec(parts.book);
      if (words) [, bookText, quantityText] = words;
    }
    const quantity = quantityText ? count(quantityText) : null;
    const book = bookText ? selector(bookText) : null;
    return quantity !== null && book ? { intent, quantity, selector: book, reason: parts.reason } : unsupported(stockHelp);
  }

  match = /^(?:查找|搜索|找一下|找)\s*(?:书名为|名为)?\s*(.+)$/.exec(text);
  if (match) {
    const query = cleanText(match[1]);
    return query ? { intent: 'search', query } : unsupported('Enter a book title or stock code.');
  }
  return null;
}

export function parseRequest(input) {
  if (typeof input !== 'string' || !input.trim()) return unsupported('Type a request, such as “Find books about gardening”.');
  if (input.length > 1000) return unsupported('Please keep your request under 1,000 characters.');
  if (/[\u0000-\u001f\u007f]/.test(input)) return unsupported(oneRequest);
  // Ignore instructions/punctuation inside explicit title quotes. They are data,
  // and are passed as parameters by the server, never as executable SQL.
  let outsideQuotes = '', quoteEnd = '';
  for (const character of input) {
    if (quoteEnd) { if (character === quoteEnd) quoteEnd = ''; outsideQuotes += ' '; }
    else if (quotePairs.has(character)) { quoteEnd = quotePairs.get(character); outsideQuotes += ' '; }
    else outsideQuotes += character;
  }
  if (quoteEnd || /[;；`]/.test(outsideQuotes)) return unsupported(oneRequest);
  // Reject code-like requests and explicitly joined tasks instead of guessing.
  if (/\b(?:drop\s+(?:table|database)|delete\s+from|insert\s+into|update\s+\S+\s+set|select\s+.+\s+from|execute\s+sql|run\s+(?:sql|code))\b/i.test(outsideQuotes)) {
    return unsupported('Use a bookstore request such as “Find Dune” or “Sell two copies of Dune”.');
  }
  if (/\b(?:and then|then|also)\b|\band\s+(?:sell|receive|add|remove|adjust|set|delete|update|drop|show|find|search|change|create|run|execute)\b|(?:然后|接着|并且|同时|并|和|再|[,，。!?！？])(?:请)?\s*(?:卖出|售出|销售|入库|收货|补货|查找|搜索|调整|显示|删除|将|把|添加)/i.test(outsideQuotes)) {
    return unsupported(oneRequest);
  }
  let text = input.trim().replace(/\s+/g, ' ');
  text = text.replace(/[.!?。！？]$/, '').trim();
  for (let i = 0; i < 3; i++) text = text.replace(/^(?:please[, ]+|(?:can|could|would) you(?: please)? |请帮我\s*|请\s*|帮我\s*|麻烦\s*)/i, '').trim();
  if (!text) return unsupported('Type what you would like to do.');

  const chinese = parseChinese(text);
  if (chinese) return chinese;

  if (/^(?:help|what can (?:you|i) do|show (?:me )?(?:help|examples))$/i.test(text)) return { intent: 'help' };
  if (/^(?:add|create|register) (?:a )?new book$/i.test(text)) return { intent: 'add' };
  if (/^(?:show (?:me )?|view )?(?:recent )?(?:activity|history|audit history)$/i.test(text)) return { intent: 'history' };

  let match = /^(?:(?:show|list|find) (?:me )?)?(?:low stock(?: books)?|books (?:running )?low(?: on stock)?)(?: (?:below|under) (\d+))?$/i.exec(text);
  if (!match) match = /^(?:show|list|find) (?:me )?books (?:with (?:stock|quantity) )?(?:below|under) (\d+)(?: copies)?$/i.exec(text);
  if (match) {
    const threshold = match[1] ? count(match[1], { allowZero: true }) : 5;
    return threshold !== null ? { intent: 'low_stock', threshold } : unsupported('Use a stock threshold between 0 and 1,000,000,000.');
  }

  match = /^(?:set|change|update) (?:the )?(?:selling )?price of (.+) to (\d+(?:\.\d+)?)$/i.exec(text);
  if (match) {
    const book = selector(match[1]);
    const price = match[2];
    if (!book || !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(price)) return unsupported('Use a valid book and a price with at most two decimal places, such as “Set the price of Dune to 12.99”.');
    return { intent: 'set_price', price, selector: book };
  }

  match = /^adjust (?:the )?stock of (.+) by (-?\d+)(?: (?:because|reason:?) (.+))?$/i.exec(text);
  if (match) {
    const book = selector(match[1]);
    const quantity = count(match[2], { signed: true });
    const reason = match[3] ? cleanText(match[3]) : null;
    if (!book || quantity === null || (match[3] && !reason)) return unsupported('Use “Adjust stock of book 123 by -2 because damaged”.');
    return { intent: 'adjust', quantity, selector: book, reason };
  }

  match = stockSentence.exec(text);
  if (match) {
    const intent = /^(sell|sold)$/i.test(match[1]) ? 'sell' : 'receive';
    return stockResult(intent, count(match[2]), match[3]);
  }
  match = removeSentence.exec(text);
  if (match) {
    const amount = count(match[1]);
    return stockResult('adjust', amount === null ? null : -amount, match[3], match[2] ? 'Damaged copies' : null);
  }

  if (/^(?:show|list|browse) (?:me )?(?:(?:all|the) )?(?:books|catalog|inventory)$/i.test(text)) return { intent: 'search', query: '' };
  match = /^(?:find|search(?: for)?|look for|show(?: me)?|list) (?:books? (?:about|called|named|matching|containing) |books? titled )?(.+)$/i.exec(text);
  if (match) {
    const query = cleanText(match[1]);
    if (query) return { intent: 'search', query };
  }
  return unsupported('I can find books, show low stock, record sales or deliveries, change a price, and open the new-book form. Try “Sell two copies of Dune”.');
}
