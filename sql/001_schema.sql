BEGIN;

CREATE ROLE bookstore_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE bookstore_clerk NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE bookstore_manager NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE bookstore_admin NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT bookstore_clerk TO bookstore_manager WITH INHERIT TRUE, SET FALSE;
GRANT bookstore_manager TO bookstore_admin WITH INHERIT TRUE, SET FALSE;

DO $bootstrap$
DECLARE
    v_database CONSTANT name := pg_catalog.current_database();
BEGIN
    EXECUTE pg_catalog.format('REVOKE ALL ON DATABASE %I FROM PUBLIC', v_database);
    EXECUTE pg_catalog.format('GRANT CONNECT ON DATABASE %I TO bookstore_clerk', v_database);
END
$bootstrap$;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA bookstore_private AUTHORIZATION bookstore_owner;
CREATE SCHEMA api AUTHORIZATION bookstore_owner;
REVOKE ALL ON SCHEMA bookstore_private, api FROM PUBLIC;

SET ROLE bookstore_owner;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON SEQUENCES FROM PUBLIC;

CREATE TABLE bookstore_private.books (
    book_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku text NOT NULL UNIQUE
        CHECK (length(sku) BETWEEN 1 AND 64 AND sku = btrim(sku)),
    title text NOT NULL
        CHECK (length(title) BETWEEN 1 AND 500 AND length(btrim(title)) > 0),
    purchase_cost numeric(12,2) NOT NULL
        CHECK (purchase_cost >= 0 AND purchase_cost <= 9999999999.99),
    price numeric(12,2) NOT NULL
        CHECK (price >= 0 AND price <= 9999999999.99),
    quantity integer NOT NULL DEFAULT 0 CHECK (quantity BETWEEN 0 AND 1000000000),
    active boolean NOT NULL DEFAULT true,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX books_title_prefix_idx
    ON bookstore_private.books (lower(title) text_pattern_ops);

CREATE TABLE bookstore_private.stock_movements (
    movement_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id uuid NOT NULL UNIQUE,
    actor name NOT NULL,
    book_id bigint NOT NULL REFERENCES bookstore_private.books(book_id),
    delta integer NOT NULL CHECK (delta BETWEEN -1000000000 AND 1000000000 AND delta <> 0),
    kind text NOT NULL CHECK (kind IN ('sale', 'receipt', 'adjustment')),
    reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500 AND length(btrim(reason)) > 0),
    quantity_after integer NOT NULL CHECK (quantity_after BETWEEN 0 AND 1000000000),
    unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0 AND unit_price <= 9999999999.99),
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK ((kind = 'sale' AND delta < 0)
        OR (kind = 'receipt' AND delta > 0)
        OR kind = 'adjustment')
);
CREATE INDEX stock_movements_book_time_idx
    ON bookstore_private.stock_movements(book_id, occurred_at DESC);

CREATE TABLE bookstore_private.catalog_audit (
    audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    book_id bigint NOT NULL REFERENCES bookstore_private.books(book_id),
    actor name NOT NULL,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE')),
    before_data jsonb,
    after_data jsonb NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX catalog_audit_book_time_idx
    ON bookstore_private.catalog_audit(book_id, occurred_at DESC);

CREATE FUNCTION bookstore_private.audit_catalog_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, bookstore_private, pg_temp
AS $function$
DECLARE
    v_catalog_before jsonb;
    v_catalog_after jsonb;
BEGIN
    v_catalog_after := jsonb_build_object(
        'sku', NEW.sku,
        'title', NEW.title,
        'purchase_cost', NEW.purchase_cost,
        'price', NEW.price,
        'active', NEW.active
    );

    IF TG_OP = 'UPDATE' THEN
        v_catalog_before := jsonb_build_object(
            'sku', OLD.sku,
            'title', OLD.title,
            'purchase_cost', OLD.purchase_cost,
            'price', OLD.price,
            'active', OLD.active
        );
        IF v_catalog_before = v_catalog_after THEN
            RETURN NEW;
        END IF;
    END IF;

    INSERT INTO bookstore_private.catalog_audit(book_id, actor, action, before_data, after_data)
    VALUES (NEW.book_id, session_user, TG_OP, v_catalog_before, v_catalog_after);
    RETURN NEW;
END
$function$;

CREATE TRIGGER books_catalog_audit
AFTER INSERT OR UPDATE ON bookstore_private.books
FOR EACH ROW EXECUTE FUNCTION bookstore_private.audit_catalog_change();

CREATE VIEW api.catalog AS
SELECT book_id, sku, title, price, quantity, active, version, created_at, updated_at
FROM bookstore_private.books;

CREATE VIEW api.inventory AS
SELECT book_id, sku, title, purchase_cost, price, quantity, active, version, created_at, updated_at
FROM bookstore_private.books;

CREATE VIEW api.audit_log AS
SELECT audit_id, book_id, actor, action, before_data, after_data, occurred_at
FROM bookstore_private.catalog_audit;

CREATE VIEW api.movements AS
SELECT movement_id, request_id, actor, book_id, delta, kind, reason,
       quantity_after, unit_price, occurred_at
FROM bookstore_private.stock_movements;

CREATE FUNCTION bookstore_private.validate_catalog(p_title text, p_cost numeric, p_price numeric)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, bookstore_private, pg_temp
AS $function$
DECLARE
    v_max_amount CONSTANT numeric := 9999999999.99;
BEGIN
    IF p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 500 THEN
        RAISE EXCEPTION 'Title must contain 1 to 500 nonblank characters' USING ERRCODE = '22023';
    END IF;
    IF p_cost IS NULL OR p_cost NOT BETWEEN 0 AND v_max_amount
        OR p_cost <> trunc(p_cost, 2) THEN
        RAISE EXCEPTION 'Purchasing cost must be between 0 and 9999999999.99 with at most two decimal places'
            USING ERRCODE = '22023';
    END IF;
    IF p_price IS NULL OR p_price NOT BETWEEN 0 AND v_max_amount
        OR p_price <> trunc(p_price, 2) THEN
        RAISE EXCEPTION 'Price must be between 0 and 9999999999.99 with at most two decimal places'
            USING ERRCODE = '22023';
    END IF;
END
$function$;

CREATE FUNCTION api.create_book(p_sku text, p_title text, p_cost numeric, p_price numeric)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, bookstore_private, pg_temp
AS $function$
DECLARE
    v_created_book_id bigint;
BEGIN
    PERFORM bookstore_private.validate_catalog(p_title, p_cost, p_price);
    IF p_sku IS NULL OR length(btrim(p_sku)) NOT BETWEEN 1 AND 64 THEN
        RAISE EXCEPTION 'SKU must contain 1 to 64 nonblank characters' USING ERRCODE = '22023';
    END IF;
    INSERT INTO bookstore_private.books(sku, title, purchase_cost, price)
    VALUES (btrim(p_sku), btrim(p_title), p_cost, p_price)
    RETURNING book_id INTO v_created_book_id;
    RETURN v_created_book_id;
END
$function$;

CREATE FUNCTION api.update_book(p_book_id bigint, p_expected_version bigint,
    p_title text, p_cost numeric, p_price numeric, p_active boolean)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, bookstore_private, pg_temp
AS $function$
DECLARE
    v_updated_version bigint;
BEGIN
    PERFORM bookstore_private.validate_catalog(p_title, p_cost, p_price);
    IF p_book_id IS NULL
        OR p_expected_version IS NULL
        OR p_expected_version < 1
        OR p_active IS NULL THEN
        RAISE EXCEPTION 'Book ID, positive expected version, and active status are required'
            USING ERRCODE = '22023';
    END IF;
    UPDATE bookstore_private.books
    SET title = btrim(p_title),
        purchase_cost = p_cost,
        price = p_price,
        active = p_active,
        version = version + 1,
        updated_at = clock_timestamp()
    WHERE book_id = p_book_id
      AND version = p_expected_version
    RETURNING version INTO v_updated_version;

    IF FOUND THEN
        RETURN v_updated_version;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM bookstore_private.books WHERE book_id = p_book_id) THEN
        RAISE EXCEPTION 'Book not found' USING ERRCODE = 'P0002';
    END IF;
    RAISE EXCEPTION 'Book changed since it was read; reload it before editing'
        USING ERRCODE = '40001';
END
$function$;

CREATE FUNCTION bookstore_private.change_stock(p_request_id uuid, p_book_id bigint,
    p_delta integer, p_kind text, p_reason text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, bookstore_private, pg_temp
AS $function$
DECLARE
    v_locked_book bookstore_private.books%ROWTYPE;
    v_previous_movement bookstore_private.stock_movements%ROWTYPE;
    v_quantity_after bigint;
    v_valid_direction boolean := CASE p_kind
        WHEN 'sale' THEN p_delta < 0
        WHEN 'receipt' THEN p_delta > 0
        WHEN 'adjustment' THEN true
        ELSE false
    END;
BEGIN
    IF p_request_id IS NULL
        OR p_book_id IS NULL
        OR p_delta IS NULL
        OR p_delta = 0
        OR p_delta::bigint NOT BETWEEN -1000000000 AND 1000000000
        OR NOT v_valid_direction
        OR p_reason IS NULL
        OR length(p_reason) NOT BETWEEN 1 AND 500
        OR length(btrim(p_reason)) = 0 THEN
        RAISE EXCEPTION 'A request UUID, book ID, valid nonzero quantity, and reason (1 to 500 characters) are required'
            USING ERRCODE = '22023';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 739245));
    SELECT * INTO v_previous_movement
    FROM bookstore_private.stock_movements
    WHERE request_id = p_request_id;
    IF FOUND THEN
        IF v_previous_movement.actor <> session_user
            OR v_previous_movement.book_id <> p_book_id
            OR v_previous_movement.delta <> p_delta
            OR v_previous_movement.kind <> p_kind
            OR v_previous_movement.reason <> p_reason THEN
            RAISE EXCEPTION 'Request UUID has already been used for a different operation or staff member'
                USING ERRCODE = '22023';
        END IF;
        RETURN v_previous_movement.quantity_after;
    END IF;

    SELECT * INTO v_locked_book
    FROM bookstore_private.books
    WHERE book_id = p_book_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book not found' USING ERRCODE = 'P0002';
    END IF;
    IF NOT v_locked_book.active THEN
        RAISE EXCEPTION 'Book is inactive; a manager must reactivate it before stock can change'
            USING ERRCODE = '23514';
    END IF;

    v_quantity_after := v_locked_book.quantity::bigint + p_delta::bigint;
    IF v_quantity_after NOT BETWEEN 0 AND 1000000000 THEN
        RAISE EXCEPTION 'Insufficient stock or resulting quantity exceeds 1000000000'
            USING ERRCODE = '23514';
    END IF;

    UPDATE bookstore_private.books
    SET quantity = v_quantity_after::integer,
        version = version + 1,
        updated_at = clock_timestamp()
    WHERE book_id = p_book_id;
    INSERT INTO bookstore_private.stock_movements
        (request_id, actor, book_id, delta, kind, reason, quantity_after, unit_price)
    VALUES (p_request_id, session_user, p_book_id, p_delta, p_kind, p_reason,
        v_quantity_after::integer, v_locked_book.price);

    RETURN v_quantity_after::integer;
END
$function$;

CREATE FUNCTION api.sell(p_request_id uuid, p_book_id bigint, p_units integer, p_reason text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, bookstore_private, pg_temp
AS $function$
BEGIN
    IF p_units IS NULL OR p_units NOT BETWEEN 1 AND 1000000000 THEN
        RAISE EXCEPTION 'Sale units must be between 1 and 1000000000' USING ERRCODE = '22023';
    END IF;
    RETURN bookstore_private.change_stock(p_request_id, p_book_id, -p_units, 'sale', p_reason);
END
$function$;

CREATE FUNCTION api.receive(p_request_id uuid, p_book_id bigint, p_units integer, p_reason text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, bookstore_private, pg_temp
AS $function$
BEGIN
    IF p_units IS NULL OR p_units NOT BETWEEN 1 AND 1000000000 THEN
        RAISE EXCEPTION 'Receipt units must be between 1 and 1000000000' USING ERRCODE = '22023';
    END IF;
    RETURN bookstore_private.change_stock(p_request_id, p_book_id, p_units, 'receipt', p_reason);
END
$function$;

CREATE FUNCTION api.adjust(p_request_id uuid, p_book_id bigint, p_delta integer, p_reason text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, bookstore_private, pg_temp
AS $function$
BEGIN
    RETURN bookstore_private.change_stock(p_request_id, p_book_id, p_delta, 'adjustment', p_reason);
END
$function$;

REVOKE ALL ON ALL TABLES IN SCHEMA bookstore_private, api FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA bookstore_private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA bookstore_private, api FROM PUBLIC;
GRANT USAGE ON SCHEMA api TO bookstore_clerk;
GRANT SELECT ON api.catalog TO bookstore_clerk;
GRANT SELECT ON api.inventory TO bookstore_manager;
GRANT SELECT ON api.audit_log, api.movements TO bookstore_admin;
GRANT EXECUTE ON FUNCTION api.sell(uuid, bigint, integer, text) TO bookstore_clerk;
GRANT EXECUTE ON FUNCTION api.create_book(text, text, numeric, numeric),
    api.update_book(bigint, bigint, text, numeric, numeric, boolean),
    api.receive(uuid, bigint, integer, text) TO bookstore_manager;
GRANT EXECUTE ON FUNCTION api.adjust(uuid, bigint, integer, text) TO bookstore_admin;
RESET ROLE;
COMMIT;
