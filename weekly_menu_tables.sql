-- Tabla de Menus Semanales
CREATE TABLE weekly_menus (
    menu_id UUID DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    menu_date DATE NOT NULL,
    entry_description VARCHAR(500) NOT NULL,
    main_course_description VARCHAR(500) NOT NULL,
    drink_description VARCHAR(500) NOT NULL,
    dessert_description VARCHAR(500) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL
        CONSTRAINT positive_menu_price CHECK (price >= 0),
    reservation_deadline TIMESTAMP NOT NULL,
    max_reservations INTEGER DEFAULT NULL,
    current_reservations INTEGER DEFAULT 0
        CONSTRAINT positive_reservations CHECK (current_reservations >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_menu_date UNIQUE (menu_date),
    CONSTRAINT valid_deadline CHECK (reservation_deadline < menu_date + INTERVAL '1 day')
);

COMMENT ON TABLE weekly_menus IS 'Menus semanales de la cafeteria con fecha limite de reserva';

CREATE INDEX idx_weekly_menus_date ON weekly_menus (menu_date);
CREATE INDEX idx_weekly_menus_active ON weekly_menus (is_active);
CREATE INDEX idx_weekly_menus_deadline ON weekly_menus (reservation_deadline);

CREATE TRIGGER update_weekly_menus_updated_at
    BEFORE UPDATE ON weekly_menus
    FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Tabla de Reservas de Menu
CREATE TABLE menu_reservations (
    reservation_id UUID DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    menu_id UUID NOT NULL REFERENCES weekly_menus(menu_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL
        CONSTRAINT reservation_status_check CHECK (
            status IN ('pending', 'confirmed', 'cancelled', 'delivered')
        ),
    quantity INTEGER DEFAULT 1 NOT NULL
        CONSTRAINT positive_quantity CHECK (quantity > 0),
    total_amount NUMERIC(10, 2) NOT NULL
        CONSTRAINT positive_total CHECK (total_amount >= 0),
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancellation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_menu UNIQUE (user_id, menu_id)
);

COMMENT ON TABLE menu_reservations IS 'Reservas de menus semanales por usuarios';

CREATE INDEX idx_menu_reservations_menu ON menu_reservations (menu_id);
CREATE INDEX idx_menu_reservations_user ON menu_reservations (user_id);
CREATE INDEX idx_menu_reservations_status ON menu_reservations (status);
CREATE INDEX idx_menu_reservations_date ON menu_reservations (reserved_at);

CREATE TRIGGER update_menu_reservations_updated_at
    BEFORE UPDATE ON menu_reservations
    FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Funcion para actualizar contador de reservas
CREATE OR REPLACE FUNCTION update_menu_reservation_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE weekly_menus
        SET current_reservations = current_reservations + NEW.quantity
        WHERE menu_id = NEW.menu_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        UPDATE weekly_menus
        SET current_reservations = current_reservations - OLD.quantity
        WHERE menu_id = NEW.menu_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status != 'cancelled' THEN
        UPDATE weekly_menus
        SET current_reservations = current_reservations - OLD.quantity
        WHERE menu_id = OLD.menu_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reservation_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON menu_reservations
    FOR EACH ROW
EXECUTE PROCEDURE update_menu_reservation_count();

-- Tabla de Lista de Espera (Waitlist) para medir demanda
CREATE TABLE menu_waitlist (
    waitlist_id UUID DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    menu_id UUID NOT NULL REFERENCES weekly_menus(menu_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1 NOT NULL
        CONSTRAINT positive_waitlist_quantity CHECK (quantity > 0),
    status VARCHAR(20) DEFAULT 'waiting' NOT NULL
        CONSTRAINT waitlist_status_check CHECK (
            status IN ('waiting', 'notified', 'converted', 'cancelled', 'expired')
        ),
    notes TEXT,
    notified_at TIMESTAMP,
    converted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_menu_waitlist UNIQUE (user_id, menu_id)
);

COMMENT ON TABLE menu_waitlist IS 'Lista de espera para menus llenos - permite medir demanda real';

CREATE INDEX idx_menu_waitlist_menu ON menu_waitlist (menu_id);
CREATE INDEX idx_menu_waitlist_user ON menu_waitlist (user_id);
CREATE INDEX idx_menu_waitlist_status ON menu_waitlist (status);

CREATE TRIGGER update_menu_waitlist_updated_at
    BEFORE UPDATE ON menu_waitlist
    FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
