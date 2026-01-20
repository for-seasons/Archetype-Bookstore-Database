WITH book_balances AS (
    SELECT
        books.book_id,
        books.sku,
        books.quantity,
        coalesce(sum(movements.delta::bigint), 0) AS ledger_quantity
    FROM bookstore_private.books AS books
    LEFT JOIN bookstore_private.stock_movements AS movements USING (book_id)
    GROUP BY books.book_id
)
SELECT book_id, sku, quantity, ledger_quantity
FROM book_balances
WHERE quantity <> ledger_quantity;

SELECT count(*) AS book_titles, sum(quantity::bigint) AS total_copies
FROM bookstore_private.books;

SELECT
    relname,
    pg_size_pretty(pg_total_relation_size(relid)) AS table_and_indexes
FROM pg_stat_user_tables
WHERE schemaname = 'bookstore_private'
ORDER BY pg_total_relation_size(relid) DESC;
