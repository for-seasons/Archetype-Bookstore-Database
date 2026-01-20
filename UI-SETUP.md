# Bookstore Desk setup

Bookstore Desk is the optional browser interface for your shared inventory. An administrator configures it once on each staff computer. After setup, staff open the Windows launcher, sign in, and use the guided fields or type an English or Chinese request.

## Set up each computer

1. Set up PostgreSQL, individual staff accounts, and the store's TLS certificate using [README.md](README.md). The interface uses the existing database schema and roles.
2. Extract the ZIP and install a supported Node.js LTS release. Open a terminal in the extracted folder and run `npm ci` once.
3. Copy `web/config.example.json` to `web/config.json`. Set `host` to the store server hostname on its certificate, `port` to its PostgreSQL port, and `database` to the inventory database name. Set `caFile` to the store CA certificate on this computer. Use doubled backslashes in a Windows path as shown in the example. Leave `localDevelopment` set to `false` for store use. Enter staff passwords only at sign-in.
4. Double-click **Start-Bookstore.cmd**. The launcher opens your default browser at `http://127.0.0.1:4178/`. Keep the launcher window open. You can minimize it. On other operating systems, run `npm run ui` and open the address printed in the terminal.
5. Sign in with a staff account created for the bookstore. Test each access level and the browser checklist below against a disposable copy before using the live catalog.

The browser connects to a helper on the same computer at `127.0.0.1`. Keep this port local to that computer. The helper uses verified TLS to reach the central PostgreSQL server, and each staff login uses its own database permissions. Clerk accounts see retail prices and stock. Managers also see costs and can receive deliveries and change prices. Administrators can correct stock and review history.

If the browser does not open, use the address printed in the launcher window. If port 4178 is in use by another program, change `uiPort` in `web/config.json` and restart the helper. If sign-in fails, ask the administrator to check the account, server hostname, and certificate. Database owner credentials are refused by the staff interface.

## Staff quick start

- Click **中文 / English** to change languages. You can switch at sign-in and while using the inventory.
- Choose a task, enter the book title or stock code, and fill in the quantity, price, or reason as prompted. Choose the correct edition if several books match.
- Review the book and the proposed change, then click **Confirm change**. Record a receipt or delivery reference with stock movements. A stock preview can change if another till updates inventory first.
- Expand **Or type a request in your own words** and try “Find books about gardening” or “Sell 2 copies of Dune”. The interface recognizes common inventory phrases. Use the guided fields if it cannot interpret your wording.
- If a save is interrupted, retry the same confirmation while the review is available. If the outcome is uncertain, keep the reference and ask an administrator to check the history before submitting a new change. Sign out when you finish on a shared computer.

## 员工快速上手

- 管理员完成设置后，双击 **Start-Bookstore.cmd**，用自己的员工账号登录。使用期间请保持启动窗口开启，可以将它最小化。
- 点击 **中文 / English** 切换语言。在登录页和库存页都可以切换。
- 选择操作，输入书名或库存编号，再按提示填写数量、售价或备注。如果匹配到多个版本，请选对版本。
- 核对书名和变更内容，再点击确认。销售或入库时可填写小票号或送货单号。
- 也可以展开自然语言输入框，试试「查找 茶馆」「卖出2本《茶馆》」或「入库5本《茶馆》」。如果系统没有理解，请使用分栏表单。
- 保存中断后，可在同一审核页面重试。如果无法确定是否保存成功，请保留参考编号，让管理员查看操作记录后再提交。用完共享电脑请退出登录。

## Browser checklist for the administrator

Use a test account and a sample book with at least three copies.

1. Switch the sign-in page to Chinese and sign in. Confirm the task labels appear in Chinese. Switch to English and back while signed in. Reload and check that the chosen language is remembered.
2. Use **Find a book** with a known title. Select **Record a sale**, enter the title, `2`, and a test receipt number. Verify the review shows the correct book and change. Cancel once and check the count is unchanged. Repeat and confirm, then check that the count decreased by exactly two.
3. Enter `查找 茶馆` or `Find Dune` with a title present in the test catalog. Try a manager delivery and verify stock increases by the requested amount. Sign out when finished.

## Automated verification

`npm run test:unit` runs the CLI and language parser checks. `npm test` also runs database checks against the disposable `TEST_DATABASE_URL` described in the database guide. After that suite has installed the test schema, set `TEST_WEB_DATABASE_URL` to that same isolated `bookstore_test*` database and run `npm run test:web`. Keep the integration suites away from store data.
