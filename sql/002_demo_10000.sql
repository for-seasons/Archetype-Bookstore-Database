-- OPTIONAL SYNTHETIC DEMO ONLY. Run as the DBA after 001_schema.sql.
-- This script refuses any nonempty inventory. It never deletes real records.
BEGIN;
SET LOCAL ROLE bookstore_owner;
DO $seed$
BEGIN
    IF EXISTS (SELECT 1 FROM bookstore_private.books) THEN
        RAISE EXCEPTION 'Demo requires an empty inventory; existing books were not changed';
    END IF;
END
$seed$;

INSERT INTO bookstore_private.books(sku, title, purchase_cost, price)
SELECT 'DEMO-' || lpad(n::text, 5, '0'),
       'Sample Book ' || lpad(n::text, 5, '0'),
       (500 + n % 2500)::numeric / 100,
       (1000 + n % 4000)::numeric / 100
FROM generate_series(1, 10000) AS n;

-- Each starting quantity has a matching receipt entry in the stock history.
DO $opening_stock$
DECLARE
    book record;
BEGIN
    FOR book IN SELECT book_id, sku FROM bookstore_private.books ORDER BY book_id LOOP
        PERFORM api.receive(md5('bookstore-demo-opening-' || book.sku)::uuid,
            book.book_id, (book.book_id % 40 + 1)::integer, 'Synthetic demo opening stock');
    END LOOP;
END
$opening_stock$;
COMMIT;
ANALYZE bookstore_private.books;
ANALYZE bookstore_private.stock_movements;
ANALYZE bookstore_private.catalog_audit;

SELECT count(*) AS demo_books, sum(quantity) AS demo_copies
FROM api.catalog;
