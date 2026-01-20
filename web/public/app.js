'use strict';

const dictionary = {
  en: {
    skip: 'Skip to main content',
    brand: 'Bookstore Desk',
    storyEyebrow: 'YOUR EVERYDAY BOOKSTORE COMPANION',
    storyTitle: 'A place for every book.',
    storyDescription:
      'Find a title, receive a delivery, or record a sale. A few simple fields are all you need.',
    artSpine: 'THE DAILY CHAPTER',
    artCover: 'Stories on the shelves.',
    storyFooter: 'Made for the everyday work of a bookstore.',
    welcome: 'WELCOME BACK',
    loginTitle: 'Open your desk',
    loginDescription: 'Sign in with your own staff account.',
    username: 'Staff username',
    password: 'Password',
    signIn: 'Sign in →',
    signingIn: 'Signing in…',
    loginNote:
      'Your account determines which actions and information you can access. Ask your store administrator if you need an account.',
    navigation: 'Main navigation',
    workspace: 'YOUR WORKSPACE',
    inventory: 'Inventory',
    activity: 'Activity',
    sidebarTitle: 'Keep your day moving.',
    sidebarNote: 'Choose a task and fill in the boxes. Review the details before saving.',
    signOut: 'Sign out',
    atAGlance: 'YOUR STORE, AT A GLANCE',
    inventoryTitle: 'The inventory desk',
    inventorySubtitle: 'Your books and stock, all in one place.',
    addBook: '+ Add a book',
    summary: 'Inventory summary',
    titles: 'Book titles',
    allTitles: 'All catalog titles',
    copies: 'Copies in stock',
    acrossStore: 'Across the store',
    runningLow: 'Running low',
    lowHint: 'Active titles with fewer than 5 copies ↗',
    requestTitle: 'What would you like to do?',
    requestHint: 'Fill in the boxes. You’ll review changes before saving.',
    noCode: 'NO CODING NEEDED',
    task: '1. Choose a task',
    taskSearch: 'Find a book',
    taskSell: 'Record a sale',
    taskReceive: 'Receive a delivery',
    taskPrice: 'Change selling price',
    taskAdjust: 'Correct stock',
    bookField: '2. Which book?',
    bookPlaceholder: 'Book title, stock code, or #123',
    quantityField: '3. How many copies?',
    priceField: '3. New selling price',
    adjustmentField: '3. Copies to add / remove',
    reasonField: 'Receipt, delivery, or reason',
    reasonPlaceholder: 'For example, Receipt 1042',
    findBooks: 'Find books →',
    reviewRequest: 'Review change →',
    searchHint:
      'Search by title or stock code. Use # followed by the book number for an exact match.',
    stockHint: 'Enter a positive whole number. The next step lets you check the book and quantity.',
    adjustHint:
      'Use a positive number to add copies or a negative number to remove them. Include a reason.',
    priceHint: 'Use the store currency and at most two decimal places.',
    freeTextTitle: 'Or type a request in your own words',
    freeTextHint:
      'Common English and Chinese requests are supported. You always review changes first.',
    requestInput: 'Your inventory request',
    requestPlaceholder: 'Try “Sell 2 copies of Dune”',
    ask: 'Review request ↗',
    examples: 'Example requests',
    tryThis: 'TRY THIS',
    showLow: 'Show low stock',
    findBook: 'Find a book',
    help: 'What can I ask?',
    reviewChange: 'REVIEW CHANGE',
    confirm: 'Confirm change',
    cancel: 'Cancel',
    yourBooks: 'Your books',
    catalogHint: 'Browse the catalog or search for a title.',
    searchLabel: 'Search title or stock code',
    searchPlaceholder: 'Search title or stock code…',
    search: 'Search',
    bookTitle: 'Book title',
    sku: 'Stock code',
    price: 'Price',
    cost: 'Cost',
    inStock: 'In stock',
    actions: 'Actions',
    more: 'Show more books ↓',
    activityTitle: 'A record of every change',
    activityHint: 'Recent stock movements and book updates, with the staff member who made them.',
    refreshActivity: 'Refresh activity',
    sharedInventory: 'Shared store inventory',
    growShelves: 'GROW YOUR SHELVES',
    newBook: 'Add a new book',
    close: 'Close',
    newBookHint: 'Enter the book details. You’ll review them before saving.',
    skuPlaceholder: 'Your unique code for this edition',
    purchaseCost: 'Purchasing cost',
    sellingPrice: 'Selling price',
    currencyHint:
      'Use your store’s usual currency. New books start with zero stock; record a delivery to add copies.',
    reviewBook: 'Review book details →',
    clerk: 'Clerk',
    manager: 'Manager',
    admin: 'Administrator',
    bookNumber: 'Book {id}',
    inactive: 'Inactive',
    sell: 'Sell',
    receive: 'Receive',
    sellBook: 'Sell copies of {title}',
    receiveBook: 'Receive copies of {title}',
    noMatches: 'No matching books',
    noBooks: 'No books here yet',
    trySearch: 'Try a different title or stock code, or view the full catalog.',
    addFirst: 'A manager can add your first book to get started.',
    lowBooks: 'Books running low',
    searchResults: 'Search results',
    lowCaption: 'Active titles with fewer than {n} copies.',
    queryCaption: 'Matches for “{query}”.',
    shown: '{n} books shown',
    pending: 'Confirm or cancel your current review before starting another task.',
    working: 'Working…',
    results: 'Here are the matching books.',
    chooseBook: 'More than one book matches. Choose the correct edition below.',
    choose: 'Choose →',
    choiceDetail: '{sku} · Book {id} · {n} in stock',
    book: 'Book',
    bookId: 'Book number',
    copyCount: 'Copies',
    stockChange: 'Copies in stock (preview)',
    reference: 'Reference',
    reviewNote:
      'Nothing changes until you confirm. Stock can change at another till before you save.',
    expires: 'Review expires in {n} min',
    expired: 'This review has expired. Cancel it and start again to check the latest stock.',
    saving: 'Saving…',
    retry: 'Retry this confirmation',
    saved: 'Your change has been saved.',
    cancelled: 'Review cancelled. No new change was made.',
    journalTitle: 'The store journal',
    journalSubtitle: 'See what changed, when, and who recorded it.',
    noActivity: 'No activity has been recorded yet.',
    saleRecorded: 'Sale recorded',
    deliveryReceived: 'Delivery received',
    stockAdjusted: 'Stock adjusted',
    bookAdded: 'Book added',
    bookUpdated: 'Book details updated',
    stockActivity: '{delta} copies · {remaining} remaining',
    reactivated: 'Book reactivated',
    deactivated: 'Book deactivated',
    catalogUpdated: 'Catalog details updated.',
    authentication:
      'Sign-in failed. Check your staff username and password. Administrator database accounts cannot use this desk.',
    sessionExpired: 'Your session has ended. Please sign in again.',
    forbidden: 'Your account does not have permission for that action.',
    csrf: 'Your session could not be verified. Refresh the page and sign in again.',
    badOrigin: 'This request could not be verified. Open the desk from its local shortcut.',
    invalidInput:
      'Please check the fields. Use a valid book, whole-number quantities, and prices with at most two decimal places.',
    unsupported:
      'I could not understand that request. Use the task boxes, or try one of the examples.',
    notFound: 'No matching book was found. Check the title, stock code, or book number.',
    ambiguous: 'Please choose the exact book before continuing.',
    stale:
      'This book changed while you were reviewing it. Cancel the review and start again with the latest details.',
    insufficientStock:
      'There is not enough stock, the book is inactive, or the quantity exceeds the allowed limit. Refresh the inventory and check the request.',
    duplicateSku: 'That stock code already exists. Use a different code for the new book.',
    rateLimited: 'Too many attempts. Please wait a moment and try again.',
    busy: 'Another request is still running. Please wait before trying again.',
    unavailable:
      'The desk could not reach the database. Check the connection or contact your store administrator.',
    uncertain:
      'The result has not been confirmed. Retry this same confirmation; do not start a new transaction for it.',
    alreadyConfirmed:
      'This request was already confirmed. Refresh the inventory to see its latest state.',
    unreadable: 'The server returned an unreadable response. Contact your store administrator.',
    keepReference:
      'Keep reference {reference}. If the outcome is uncertain, ask an administrator to check it before starting a new request.',
    helpText:
      'You can use the task boxes for each operation, or type requests like these:\n• Find Dune\n• Show low stock\n• Sell 2 copies of book 123\n• Receive 10 copies of book 123\n• Set the price of book 123 to 12.99\nYour account permissions apply to every request.',
    unknownError: 'The request could not be completed. Please try again.',
    recovery:
      'Resolve the pending confirmation first. Retry it or ask an administrator to check its reference before leaving.',
    confirmAdd: 'Add this book',
  },
  zh: {
    skip: '跳至主要内容',
    brand: '书店工作台',
    storyEyebrow: '书店日常工作的小帮手',
    storyTitle: '每一本书，都井然有序。',
    storyDescription: '查找图书、登记到货、记录销售。填几个简单的输入框，就能完成日常工作。',
    artSpine: '书店的日常',
    artCover: '书架上的故事。',
    storyFooter: '为书店的日常工作而设计。',
    welcome: '欢迎回来',
    loginTitle: '打开你的工作台',
    loginDescription: '请使用你自己的员工账号登录。',
    username: '员工账号',
    password: '密码',
    signIn: '登录 →',
    signingIn: '正在登录…',
    loginNote: '你的账号决定可以查看的信息和执行的操作。需要账号时，请联系书店管理员。',
    navigation: '主导航',
    workspace: '你的工作台',
    inventory: '图书库存',
    activity: '操作记录',
    sidebarTitle: '让每天的工作更顺手。',
    sidebarNote: '选择任务并填写输入框，核对信息后再保存。',
    signOut: '退出登录',
    atAGlance: '书店库存，一目了然',
    inventoryTitle: '图书库存工作台',
    inventorySubtitle: '在这里查看图书、库存和日常变动。',
    addBook: '+ 添加图书',
    summary: '库存概况',
    titles: '图书种数',
    allTitles: '书目中的全部图书',
    copies: '库存册数',
    acrossStore: '全店库存合计',
    runningLow: '库存偏低',
    lowHint: '在售且库存不足 5 册的图书 ↗',
    requestTitle: '你想做什么？',
    requestHint: '填写输入框，核对无误后再保存。',
    noCode: '无需编程',
    task: '1. 选择任务',
    taskSearch: '查找图书',
    taskSell: '记录销售',
    taskReceive: '登记到货',
    taskPrice: '修改售价',
    taskAdjust: '修正库存',
    bookField: '2. 哪一本书？',
    bookPlaceholder: '输入书名、库存编码，或 #123',
    quantityField: '3. 多少册？',
    priceField: '3. 新售价',
    adjustmentField: '3. 增加或减少的册数',
    reasonField: '小票、到货单号或原因',
    reasonPlaceholder: '例如：小票 1042',
    findBooks: '查找图书 →',
    reviewRequest: '核对变更 →',
    searchHint: '可按书名或库存编码查找。输入 # 加图书编号可精确定位。',
    stockHint: '请输入正整数。下一步可核对图书和数量。',
    adjustHint: '增加库存填正数，减少库存填负数，并注明原因。',
    priceHint: '使用书店的统一货币，最多保留两位小数。',
    freeTextTitle: '也可以用一句话描述需求',
    freeTextHint: '支持常见的中文和英文请求。所有变更都要先核对再确认。',
    requestInput: '你的库存操作请求',
    requestPlaceholder: '试试“卖出2本《沙丘》”',
    ask: '解析请求 ↗',
    examples: '请求示例',
    tryThis: '试一试',
    showLow: '查看低库存',
    findBook: '查找图书',
    help: '我可以做什么？',
    reviewChange: '核对变更',
    confirm: '确认保存',
    cancel: '取消',
    yourBooks: '你的图书',
    catalogHint: '浏览书目，或搜索需要的图书。',
    searchLabel: '搜索书名或库存编码',
    searchPlaceholder: '搜索书名或库存编码…',
    search: '搜索',
    bookTitle: '书名',
    sku: '库存编码',
    price: '售价',
    cost: '进货成本',
    inStock: '库存',
    actions: '操作',
    more: '显示更多图书 ↓',
    activityTitle: '每次变更，都有记录',
    activityHint: '查看最近的库存和书目信息变更，以及操作员工。',
    refreshActivity: '刷新记录',
    sharedInventory: '全店共享库存',
    growShelves: '充实你的书架',
    newBook: '添加新书',
    close: '关闭',
    newBookHint: '填写图书信息，核对后再保存。',
    skuPlaceholder: '这个版本的唯一库存编码',
    purchaseCost: '进货成本',
    sellingPrice: '销售价格',
    currencyHint: '使用书店的统一货币。新书初始库存为零，可通过登记到货增加库存。',
    reviewBook: '核对图书信息 →',
    clerk: '店员',
    manager: '经理',
    admin: '管理员',
    bookNumber: '图书编号 {id}',
    inactive: '已停售',
    sell: '销售',
    receive: '到货',
    sellBook: '记录《{title}》的销售',
    receiveBook: '登记《{title}》的到货',
    noMatches: '没有找到匹配的图书',
    noBooks: '还没有图书',
    trySearch: '试试其他书名或库存编码，或返回全部书目。',
    addFirst: '经理可以添加第一本书。',
    lowBooks: '库存偏低的图书',
    searchResults: '搜索结果',
    lowCaption: '在售且库存少于 {n} 册的图书。',
    queryCaption: '“{query}”的匹配结果。',
    shown: '已显示 {n} 种图书',
    pending: '请先确认或取消当前变更，再开始其他任务。',
    working: '正在处理…',
    results: '以下是匹配的图书。',
    chooseBook: '有多本图书匹配，请选择正确的版本。',
    choose: '选择 →',
    choiceDetail: '{sku} · 编号 {id} · 库存 {n} 册',
    book: '图书',
    bookId: '图书编号',
    copyCount: '册数',
    stockChange: '库存册数（预览）',
    reference: '操作参考号',
    reviewNote: '确认之前不会修改数据。保存前，其他收银台的操作可能改变库存。',
    expires: '本次核对将在 {n} 分钟后失效',
    expired: '本次核对已失效。请取消并重新发起，以查看最新库存。',
    saving: '正在保存…',
    retry: '重试本次确认',
    saved: '变更已保存。',
    cancelled: '已取消本次核对，没有新增变更。',
    journalTitle: '书店操作记录',
    journalSubtitle: '查看修改内容、操作时间和操作员工。',
    noActivity: '还没有操作记录。',
    saleRecorded: '已记录销售',
    deliveryReceived: '已登记到货',
    stockAdjusted: '已修正库存',
    bookAdded: '已添加图书',
    bookUpdated: '已更新图书信息',
    stockActivity: '变动 {delta} 册 · 剩余 {remaining} 册',
    reactivated: '已恢复销售',
    deactivated: '已停止销售',
    catalogUpdated: '已更新书目信息。',
    authentication: '登录失败，请检查员工账号和密码。数据库超级管理员账号不能登录此工作台。',
    sessionExpired: '登录已过期，请重新登录。',
    forbidden: '你的账号没有执行此操作的权限。',
    csrf: '无法验证登录状态，请刷新页面并重新登录。',
    badOrigin: '无法验证请求来源，请通过本机快捷方式打开工作台。',
    invalidInput: '请检查输入内容：选择有效的图书，数量使用整数，价格最多保留两位小数。',
    unsupported: '暂时无法理解这条请求。请使用任务输入框，或参考示例重新描述。',
    notFound: '未找到匹配的图书，请检查书名、库存编码或图书编号。',
    ambiguous: '请先选择具体的图书，再继续操作。',
    stale: '核对期间，这本书的信息发生了变化。请取消本次核对，再根据最新信息重新操作。',
    insufficientStock: '库存不足、图书已停售，或数量超出允许范围。请刷新库存并检查请求。',
    duplicateSku: '这个库存编码已存在，请为新书使用其他编码。',
    rateLimited: '尝试次数过多，请稍后重试。',
    busy: '另一项请求还在处理，请稍等再试。',
    unavailable: '无法连接数据库，请检查连接或联系书店管理员。',
    uncertain: '尚未确认本次操作的结果。请重试同一次确认，不要为它重新发起操作。',
    alreadyConfirmed: '这项请求已经确认过，请刷新库存查看最新状态。',
    unreadable: '无法读取服务器返回的信息，请联系书店管理员。',
    keepReference:
      '请保留参考号 {reference}。如果结果不确定，请先让管理员核实，再决定是否发起新操作。',
    helpText:
      '可以使用任务输入框，也可以输入类似的请求：\n• 查找《沙丘》\n• 查看低库存\n• 卖出2本图书123\n• 入库10本图书123\n• 将图书123的售价改为12.99\n每项操作都受账号权限限制。',
    unknownError: '无法完成请求，请重试。',
    recovery: '请先处理尚未确认结果的操作。重试本次确认，或让管理员按参考号核实后再离开。',
    confirmAdd: '添加这本书',
  },
};
const $ = (id) => document.getElementById(id);
let storedLanguage;
try {
  storedLanguage = localStorage.getItem('bookstore-language');
} catch {}
const state = {
  lang: storedLanguage === 'zh' ? 'zh' : 'en',
  user: null,
  csrf: null,
  books: [],
  nextAfter: null,
  query: '',
  low: null,
  proposal: null,
  pendingRequest: null,
  choices: [],
  view: 'inventory',
  busy: false,
  saving: false,
  uncertain: false,
  searchSerial: 0,
  notices: {},
  activity: [],
  summary: null,
  resultMode: false,
};
const t = (key, args = {}) =>
  (dictionary[state.lang][key] || dictionary[state.lang].unknownError).replace(
    /\{(\w+)\}/g,
    (_, name) => String(args[name] ?? '')
  );
const rank = { clerk: 1, manager: 2, admin: 3 };
const hasRole = (role) => (rank[state.user?.role] || 0) >= rank[role];
const count = (value) =>
  new Intl.NumberFormat(state.lang === 'zh' ? 'zh-CN' : 'en-US').format(Number(value || 0));
function money(value) {
  if (value == null) return '—';
  const [whole, decimal = ''] = String(value).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimal.padEnd(2, '0')}`;
}
const dateText = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(state.lang === 'zh' ? 'zh-CN' : 'en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
};
function node(tag, text, className) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (className) e.className = className;
  return e;
}
function notice(id, key, args = {}, error = false, reference = null) {
  state.notices[id] = { key, args, error, reference };
  renderNotice(id);
}
function renderNotice(id) {
  const item = state.notices[id];
  if (!item) return;
  const e = $(id);
  e.textContent = item.key ? t(item.key, item.args) : '';
  if (item.reference)
    e.textContent +=
      '\n' +
      (item.error
        ? t('keepReference', { reference: item.reference })
        : t('reference') + ': ' + item.reference);
  e.classList.toggle('error', item.error);
  if (['request-response', 'global-status'].includes(id)) e.hidden = !item.key;
}
function errorNotice(id, error) {
  notice(id, error.messageKey || 'unknownError', {}, true, error.reference);
}
function localizedError(key, status, reference) {
  const e = new Error(key);
  e.messageKey = key;
  e.status = status;
  e.reference = reference;
  return e;
}
async function api(path, options = {}) {
  let result;
  try {
    result = await fetch(path, {
      method: options.method || 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'X-Bookstore-Language': state.lang,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(state.csrf ? { 'X-CSRF-Token': state.csrf } : {}),
      },
      ...(options.body ? { body: JSON.stringify({ ...options.body, lang: state.lang }) } : {}),
    });
  } catch {
    throw localizedError('unavailable', 0);
  }
  let data;
  try {
    data = await result.json();
  } catch {
    throw localizedError('unreadable', result.status);
  }
  if (!result.ok) {
    const key = data.error?.messageKey || data.messageKey || 'unknownError';
    const e = localizedError(key, result.status, data.reference || data.error?.reference);
    if (result.status === 401 && state.user) {
      const reference =
        e.reference || (state.saving || state.uncertain ? state.proposal?.reference : null);
      e.reference = reference;
      showLogin();
      notice('login-error', 'sessionExpired', {}, true, reference);
    }
    throw e;
  }
  return data;
}
function applyLanguage() {
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  document.title = t('brand');
  document.querySelectorAll('[data-i18n]').forEach((e) => {
    e.textContent = t(e.dataset.i18n);
  });
  for (const [translationAttribute, targetAttribute] of [
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-aria', 'aria-label'],
    ['data-i18n-title', 'title'],
  ]) {
    for (const element of document.querySelectorAll(`[${translationAttribute}]`)) {
      const key = element.getAttribute(translationAttribute);
      element.setAttribute(targetAttribute, t(key));
    }
  }
  $('language-button').textContent = state.lang === 'en' ? '中文 ⇄ English' : 'English ⇄ 中文';
  $('language-button').setAttribute(
    'aria-label',
    state.lang === 'en' ? '切换为中文' : 'Switch to English'
  );
  if (state.user) {
    $('account-role').textContent = t(state.user.role);
    setView(state.view);
    renderBooks();
    renderSummary();
    renderActivity();
  }
  commandBusy(state.busy);
  renderChoices();
  if (state.proposal) renderProposal();
  for (const id of Object.keys(state.notices)) renderNotice(id);
}
function showLogin() {
  state.user = null;
  state.csrf = null;
  state.books = [];
  state.summary = null;
  state.activity = [];
  state.choices = [];
  state.proposal = null;
  state.saving = false;
  state.uncertain = false;
  state.searchSerial++;
  $('login-screen').hidden = false;
  $('workspace').hidden = true;
  $('password').value = '';
  $('books-body').replaceChildren();
  $('activity-list').replaceChildren();
  $('choice-list').replaceChildren();
  $('proposal-card').hidden = true;
  if ($('add-dialog').open) $('add-dialog').close();
}
async function openDesk(data) {
  state.user = data.user;
  state.csrf = data.csrf;
  state.query = '';
  state.low = null;
  state.resultMode = false;
  state.pendingRequest = null;
  clearProposal();
  state.notices = {};
  $('login-screen').hidden = true;
  $('workspace').hidden = false;
  $('password').value = '';
  $('account-name').textContent = data.user.name;
  $('account-avatar').textContent = (data.user.name || 'S')
    .replace(/^staff_/, '')
    .slice(0, 1)
    .toUpperCase();
  $('nav-activity').hidden = !hasRole('admin');
  document.querySelectorAll('.cost-column').forEach((e) => (e.hidden = !hasRole('manager')));
  document.querySelectorAll('[data-role]').forEach((e) => {
    e.hidden = !hasRole(e.dataset.role);
    e.disabled = e.hidden;
  });
  $('task-kind').value = 'search';
  $('task-book').value = '';
  $('task-reason').value = '';
  $('search-input').value = '';
  $('request-input').value = '';
  notice('request-response', '');
  notice('global-status', '');
  setView('inventory');
  applyLanguage();
  await refreshInventory();
}
function renderSummary() {
  if (!state.summary) return;
  $('stat-titles').textContent = count(state.summary.titles);
  $('stat-copies').textContent = count(state.summary.copies);
  $('stat-low-value').textContent = count(state.summary.lowStock);
}
async function refreshInventory() {
  const results = await Promise.allSettled([
    api('/api/summary').then((data) => {
      if (state.user) {
        state.summary = data;
        renderSummary();
      }
    }),
    loadBooks(),
  ]);
  const failed = results.find((r) => r.status === 'rejected');
  if (failed) errorNotice('global-status', failed.reason);
}
async function loadBooks(append = false) {
  const serial = ++state.searchSerial;
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.low != null) params.set('low', String(state.low));
  if (append && state.nextAfter) params.set('after', state.nextAfter);
  $('more-button').disabled = true;
  try {
    const data = await api('/api/books?' + params);
    if (serial !== state.searchSerial || !state.user) return;
    state.books = append ? state.books.concat(data.books || []) : data.books || [];
    state.nextAfter = data.nextAfter || null;
    state.resultMode = false;
    renderBooks();
  } finally {
    if (serial === state.searchSerial) $('more-button').disabled = false;
  }
}
function renderBooks() {
  const body = $('books-body');
  body.replaceChildren();
  for (const book of state.books) {
    const row = node('tr');
    const title = node('td');
    title.append(
      node('span', book.title, 'book-title'),
      node(
        'span',
        t('bookNumber', { id: book.book_id }) + (book.active ? '' : ' · ' + t('inactive')),
        'book-id'
      )
    );
    row.append(title, node('td', book.sku, 'sku-text'), node('td', money(book.price), 'numeric'));
    if (hasRole('manager')) row.append(node('td', money(book.purchase_cost), 'numeric'));
    const qty = node('td', null, 'numeric');
    qty.append(
      node(
        'span',
        count(book.quantity),
        'stock-badge ' +
          (!book.active
            ? 'inactive'
            : Number(book.quantity) === 0
              ? 'empty'
              : Number(book.quantity) < 5
                ? 'low'
                : '')
      )
    );
    row.append(qty);
    const cell = node('td');
    const actions = node('div', null, 'row-actions');
    for (const kind of hasRole('manager') ? ['sell', 'receive'] : ['sell']) {
      const button = node('button', t(kind), 'row-action');
      button.type = 'button';
      button.disabled = !book.active || (kind === 'sell' && Number(book.quantity) === 0);
      button.setAttribute(
        'aria-label',
        t(kind === 'sell' ? 'sellBook' : 'receiveBook', { title: book.title })
      );
      button.addEventListener('click', () => fillGuided(kind, book));
      actions.append(button);
    }
    cell.append(actions);
    row.append(cell);
    body.append(row);
  }
  $('empty-state').hidden = state.books.length > 0;
  const filtered = state.query || state.low != null || state.resultMode;
  $('empty-title').textContent = t(filtered ? 'noMatches' : 'noBooks');
  $('empty-message').textContent = t(filtered ? 'trySearch' : 'addFirst');
  $('catalog-title').textContent = t(
    state.low != null ? 'lowBooks' : filtered ? 'searchResults' : 'yourBooks'
  );
  $('catalog-caption').textContent =
    state.low != null
      ? t('lowCaption', { n: state.low })
      : state.query
        ? t('queryCaption', { query: state.query })
        : t(state.resultMode ? 'results' : 'catalogHint');
  $('books-count').textContent = t('shown', { n: count(state.books.length) });
  $('more-button').hidden = !state.nextAfter;
}
function isStockChange(kind) {
  return ['sell', 'receive', 'adjust'].includes(kind);
}

function readGuidedRequest() {
  const kind = $('task-kind').value;
  const body = { kind, bookQuery: $('task-book').value.trim() };
  if (kind === 'set_price') body.price = $('task-amount').value.trim();
  if (isStockChange(kind)) {
    body.quantity = $('task-amount').value.trim();
    body.reason = $('task-reason').value.trim();
  }
  return body;
}

function updateGuided() {
  const kind = $('task-kind').value;
  const stock = isStockChange(kind);
  $('task-amount-wrap').hidden = kind === 'search';
  $('task-amount').required = kind !== 'search';
  $('task-amount').inputMode = kind === 'set_price' ? 'decimal' : 'numeric';
  let amountLabel = 'quantityField';
  let hint = 'stockHint';
  if (kind === 'set_price') {
    amountLabel = 'priceField';
    hint = 'priceHint';
  } else if (kind === 'adjust') {
    amountLabel = 'adjustmentField';
    hint = 'adjustHint';
  } else if (kind === 'search') {
    hint = 'searchHint';
  }
  $('task-amount-label').textContent = t(amountLabel);
  $('task-reason-wrap').hidden = !stock;
  $('task-reason').required = stock;
  $('guided-button').textContent = t(
    state.busy ? 'working' : kind === 'search' ? 'findBooks' : 'reviewRequest'
  );
  $('guided-note').textContent = t(hint);
}
function fillGuided(kind, book) {
  setView('inventory');
  if (state.proposal) {
    notice('request-response', 'pending', {}, true);
    $('proposal-title').focus();
    return;
  }
  $('task-kind').value = kind;
  $('task-book').value = '#' + book.book_id;
  $('task-amount').value = '1';
  $('task-reason').value = '';
  updateGuided();
  $('task-amount').focus();
  $('request-card').scrollIntoView({ block: 'nearest' });
}
function commandBusy(value) {
  state.busy = value;
  $('request-button').disabled = value;
  $('request-input').disabled = value;
  $('guided-button').disabled = value;
  $('request-button').textContent = t(value ? 'working' : 'ask');
  updateGuided();
}
function showSearchResults(data) {
  state.searchSerial++;
  state.books = data.books || [];
  state.nextAfter = null;
  state.query = '';
  state.low = null;
  state.resultMode = true;
  renderBooks();
  notice('request-response', 'results');
}

async function requestAction(path, body) {
  if (state.busy) return;
  if (state.proposal) {
    notice('request-response', 'pending', {}, true);
    return;
  }
  state.pendingRequest = { path, body };
  commandBusy(true);
  notice('request-response', '');
  state.choices = [];
  renderChoices();
  try {
    const data = await api(path, { method: 'POST', body });
    if (data.type === 'proposal') showProposal(data.proposal);
    else if (data.type === 'choose') {
      state.choices = data.books || [];
      notice('request-response', 'chooseBook');
      renderChoices();
    } else if (data.type === 'results') {
      showSearchResults(data);
    } else if (data.type === 'form' && data.form === 'add') openAdd();
    else if (data.type === 'activity') await loadActivity();
    else if (data.type === 'help') notice('request-response', 'helpText');
    else
      notice(
        'request-response',
        data.messageKey && dictionary.en[data.messageKey] ? data.messageKey : 'unsupported'
      );
  } catch (e) {
    errorNotice('request-response', e);
  } finally {
    commandBusy(false);
  }
}
function renderChoices() {
  const list = $('choice-list');
  list.replaceChildren();
  list.hidden = state.choices.length === 0;
  for (const book of state.choices) {
    const button = node('button', null, 'choice-item');
    button.type = 'button';
    const description = node('span');
    description.append(
      node('strong', book.title),
      node('small', t('choiceDetail', { sku: book.sku, id: book.book_id, n: count(book.quantity) }))
    );
    button.append(description, node('span', t('choose')));
    button.addEventListener('click', () => {
      const pending = state.pendingRequest;
      if (pending) requestAction(pending.path, { ...pending.body, bookId: book.book_id });
    });
    list.append(button);
  }
}
function detail(label, value) {
  if (value == null) return;
  const group = node('div');
  group.append(node('dt', t(label)), node('dd', value));
  $('proposal-details').append(group);
}
function showProposal(proposal) {
  state.proposal = proposal;
  state.saving = false;
  state.uncertain = false;
  state.choices = [];
  renderChoices();
  notice('proposal-error', '');
  $('change-reason').value = proposal.reason || '';
  renderProposal();
  notice('request-response', 'reviewNote');
  $('proposal-title').focus();
}
function renderProposal() {
  const p = state.proposal;
  if (!p) return;
  $('proposal-card').hidden = false;
  $('proposal-details').replaceChildren();
  const key =
    {
      sell: 'taskSell',
      receive: 'taskReceive',
      adjust: 'taskAdjust',
      set_price: 'taskPrice',
      add: 'confirmAdd',
      create_book: 'confirmAdd',
    }[p.kind] || 'reviewChange';
  $('proposal-title').textContent = t(key);
  $('proposal-summary').textContent = t('reviewNote');
  detail('book', p.title);
  detail('sku', p.sku);
  detail('bookId', p.bookId);
  if (p.beforeQuantity != null && p.afterQuantity != null)
    detail('stockChange', count(p.beforeQuantity) + ' → ' + count(p.afterQuantity));
  else if (p.quantity != null) detail('copyCount', count(p.quantity));
  if (p.beforePrice != null) detail('sellingPrice', money(p.beforePrice) + ' → ' + money(p.price));
  else if (p.price != null) detail('sellingPrice', money(p.price));
  if (hasRole('manager') && p.purchaseCost != null) detail('purchaseCost', money(p.purchaseCost));
  detail('reference', p.reference);
  $('reason-wrapper').hidden = !p.reasonRequired;
  $('change-reason').required = !!p.reasonRequired;
  $('change-reason').disabled = state.saving || state.uncertain;
  $('confirm-button').textContent = t(
    state.saving ? 'saving' : state.uncertain ? 'retry' : 'confirm'
  );
  $('confirm-button').disabled = state.saving;
  $('cancel-button').disabled = state.saving || state.uncertain;
  tickExpiry();
}
function clearProposal() {
  state.proposal = null;
  state.saving = false;
  state.uncertain = false;
  $('proposal-card').hidden = true;
  notice('proposal-error', '');
  $('confirm-button').disabled = false;
  $('cancel-button').disabled = false;
}
function tickExpiry() {
  if (!state.proposal) return;
  const expires = new Date(state.proposal.expiresAt).getTime();
  if (!Number.isFinite(expires)) {
    $('proposal-expiry').textContent = '';
    return;
  }
  const seconds = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
  $('proposal-expiry').textContent = seconds
    ? t('expires', { n: Math.ceil(seconds / 60) })
    : t('expired');
  if (!seconds && !state.uncertain && !state.saving) $('confirm-button').disabled = true;
}
async function confirmChange(event) {
  event.preventDefault();
  const proposal = state.proposal;
  if (!proposal || state.saving || $('confirm-button').disabled) return;
  state.saving = true;
  renderProposal();
  notice('proposal-error', '');
  try {
    const data = await api('/api/confirm', {
      method: 'POST',
      body: {
        proposalId: proposal.id,
        ...(proposal.reasonRequired ? { reason: $('change-reason').value.trim() } : {}),
      },
    });
    clearProposal();
    $('request-input').value = '';
    $('task-reason').value = '';
    notice('request-response', 'saved');
    notice('global-status', 'saved', {}, false, data.reference || proposal.reference);
    await refreshInventory();
  } catch (e) {
    if (state.proposal) {
      state.uncertain =
        state.uncertain ||
        !e.status ||
        e.messageKey === 'uncertain' ||
        e.messageKey === 'unreadable';
      state.saving = false;
      if (state.uncertain) e.reference = e.reference || proposal.reference;
      errorNotice('proposal-error', e);
      renderProposal();
    } else errorNotice('login-error', e);
  } finally {
    state.saving = false;
  }
}
async function cancelProposal() {
  if (!state.proposal || state.saving || state.uncertain) return;
  $('cancel-button').disabled = true;
  try {
    await api('/api/cancel', { method: 'POST', body: { proposalId: state.proposal.id } });
    clearProposal();
    notice('request-response', 'cancelled');
  } catch (e) {
    errorNotice('proposal-error', e);
    $('cancel-button').disabled = false;
  }
}
function openAdd() {
  if (!hasRole('manager')) {
    notice('request-response', 'forbidden', {}, true);
    return;
  }
  if (state.proposal) {
    notice('request-response', 'pending', {}, true);
    return;
  }
  $('add-form').reset();
  notice('add-error', '');
  $('add-dialog').showModal();
}
async function prepareBook(event) {
  event.preventDefault();
  $('prepare-book-button').disabled = true;
  notice('add-error', '');
  try {
    const data = await api('/api/prepare-book', {
      method: 'POST',
      body: {
        sku: $('book-sku').value.trim(),
        title: $('book-title').value.trim(),
        purchaseCost: $('book-cost').value.trim(),
        price: $('book-price').value.trim(),
      },
    });
    $('add-dialog').close();
    setView('inventory');
    showProposal(data.proposal);
  } catch (e) {
    errorNotice('add-error', e);
  } finally {
    $('prepare-book-button').disabled = false;
  }
}
function setView(view) {
  if (view === 'activity' && !hasRole('admin')) return;
  state.view = view;
  $('inventory-view').hidden = view !== 'inventory';
  $('activity-view').hidden = view !== 'activity';
  for (const name of ['inventory', 'activity']) {
    const e = $('nav-' + name);
    e.classList.toggle('selected', name === view);
    if (name === view) e.setAttribute('aria-current', 'page');
    else e.removeAttribute('aria-current');
  }
  $('page-title').textContent = t(view === 'inventory' ? 'inventoryTitle' : 'journalTitle');
  $('page-subtitle').textContent = t(
    view === 'inventory' ? 'inventorySubtitle' : 'journalSubtitle'
  );
  $('add-book-button').hidden = view !== 'inventory' || !hasRole('manager');
}
function renderActivity() {
  const list = $('activity-list');
  list.replaceChildren();
  if (!state.activity.length) {
    list.append(node('p', t('noActivity'), 'muted'));
    return;
  }
  for (const record of state.activity) {
    const card = node('article', null, 'activity-item');
    const action =
      record.category === 'stock'
        ? { sale: 'saleRecorded', receipt: 'deliveryReceived', adjustment: 'stockAdjusted' }[
            record.kind
          ] || 'stockAdjusted'
        : record.action === 'INSERT'
          ? 'bookAdded'
          : 'bookUpdated';
    card.append(
      node(
        'h3',
        t(action) + ' · ' + (record.after_data?.title || t('bookNumber', { id: record.book_id }))
      )
    );
    if (record.category === 'stock') {
      card.append(
        node(
          'p',
          t('stockActivity', {
            delta: (Number(record.delta) > 0 ? '+' : '') + count(record.delta),
            remaining: count(record.quantity_after),
          })
        )
      );
      if (record.reason) card.append(node('p', record.reason, 'activity-note'));
    } else if (record.before_data && record.after_data) {
      const changes = [];
      for (const [field, label, format] of [
        ['title', 'bookTitle', String],
        ['price', 'price', money],
        ['purchase_cost', 'cost', money],
      ]) {
        const before = record.before_data[field];
        const after = record.after_data[field];
        if (before !== after) changes.push(`${t(label)}: ${format(before)} → ${format(after)}`);
      }
      if (record.before_data.active !== record.after_data.active)
        changes.push(t(record.after_data.active ? 'reactivated' : 'deactivated'));
      card.append(node('p', changes.join(' · ') || t('catalogUpdated')));
    }
    const meta = node('div', null, 'activity-meta');
    meta.append(node('span', record.actor), node('time', dateText(record.occurred_at)));
    card.append(meta);
    if (record.request_id)
      card.append(node('p', t('reference') + ': ' + record.request_id, 'small'));
    list.append(card);
  }
}
async function loadActivity() {
  setView('activity');
  $('refresh-activity').disabled = true;
  try {
    const data = await api('/api/activity');
    state.activity = [
      ...(data.movements || []).map((r) => ({ ...r, category: 'stock' })),
      ...(data.catalog || []).map((r) => ({ ...r, category: 'catalog' })),
    ].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
    renderActivity();
  } catch (e) {
    errorNotice('global-status', e);
  } finally {
    $('refresh-activity').disabled = false;
  }
}
async function showLowStock() {
  setView('inventory');
  state.low = 5;
  state.query = '';
  $('search-input').value = '';
  try {
    await loadBooks();
  } catch (e) {
    errorNotice('global-status', e);
  }
}

$('language-button').addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'zh' : 'en';
  try {
    localStorage.setItem('bookstore-language', state.lang);
  } catch {}
  applyLanguage();
});
$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('login-button').disabled = true;
  $('login-button').textContent = t('signingIn');
  notice('login-error', '');
  try {
    await openDesk(
      await api('/api/login', {
        method: 'POST',
        body: { username: $('username').value.trim(), password: $('password').value },
      })
    );
  } catch (e) {
    errorNotice('login-error', e);
  } finally {
    $('login-button').disabled = false;
    $('login-button').textContent = t('signIn');
    $('password').value = '';
  }
});
$('logout-button').addEventListener('click', async () => {
  if (state.saving || state.uncertain) {
    notice('global-status', 'recovery', {}, true, state.proposal?.reference);
    return;
  }
  $('logout-button').disabled = true;
  try {
    await api('/api/logout', { method: 'POST', body: {} });
    showLogin();
    notice('login-error', '');
    $('username').focus();
  } catch (e) {
    errorNotice('global-status', e);
  } finally {
    $('logout-button').disabled = false;
  }
});
$('task-kind').addEventListener('change', updateGuided);
$('guided-form').addEventListener('submit', (event) => {
  event.preventDefault();
  requestAction('/api/prepare', readGuidedRequest());
});
$('request-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('request-input').value.trim();
  if (text) requestAction('/api/interpret', { text });
});
$('request-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    $('request-form').requestSubmit();
  }
});
const exampleRequests = {
  en: { low: 'Show low stock', find: 'Find Dune', help: 'Help' },
  zh: { low: '查看低库存', find: '查找《沙丘》', help: '帮助' },
};
document.querySelectorAll('[data-example]').forEach((button) =>
  button.addEventListener('click', () => {
    const text = exampleRequests[state.lang][button.dataset.example];
    $('request-input').value = text;
    requestAction('/api/interpret', { text });
  })
);
$('search-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  state.query = $('search-input').value.trim();
  state.low = null;
  try {
    await loadBooks();
  } catch (e) {
    errorNotice('global-status', e);
  }
});
$('more-button').addEventListener('click', async () => {
  try {
    await loadBooks(true);
  } catch (e) {
    errorNotice('global-status', e);
  }
});
$('stat-low').addEventListener('click', showLowStock);
$('confirmation-form').addEventListener('submit', confirmChange);
$('cancel-button').addEventListener('click', cancelProposal);
$('add-book-button').addEventListener('click', openAdd);
$('close-add').addEventListener('click', () => $('add-dialog').close());
$('add-form').addEventListener('submit', prepareBook);
$('nav-inventory').addEventListener('click', async () => {
  setView('inventory');
  state.query = '';
  state.low = null;
  $('search-input').value = '';
  await refreshInventory();
});
$('nav-activity').addEventListener('click', loadActivity);
$('refresh-activity').addEventListener('click', loadActivity);
window.addEventListener('beforeunload', (event) => {
  if (state.saving || state.uncertain) {
    event.preventDefault();
    event.returnValue = '';
  }
});
applyLanguage();
setInterval(tickExpiry, 1000);
api('/api/session')
  .then(openDesk)
  .catch((e) => {
    if (e.status !== 401) errorNotice('login-error', e);
  });
