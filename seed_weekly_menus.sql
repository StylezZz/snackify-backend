-- =====================================================
-- SEED DATA PARA MENUS SEMANALES - PRUEBAS
-- Ejecutar después de weekly_menu_tables.sql
-- =====================================================

-- Insertar menús para la semana actual y siguiente
-- Ajusta las fechas según necesites

-- SEMANA ACTUAL (Lunes a Viernes)
INSERT INTO weekly_menus (
    menu_date, entry_description, main_course_description,
    drink_description, dessert_description, description,
    price, reservation_deadline, max_reservations
) VALUES
-- Lunes
(
    CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER,
    'Ensalada César con crutones caseros',
    'Lomo saltado con arroz blanco y papas fritas',
    'Chicha morada',
    'Mazamorra morada',
    'Menú del Lunes - Clásico peruano',
    8.50,
    (CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER - INTERVAL '2 days')::TIMESTAMP + TIME '23:59:59',
    30
),
-- Martes
(
    CURRENT_DATE + (2 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER,
    'Sopa de verduras con fideos',
    'Pollo a la plancha con puré de papa y ensalada',
    'Limonada natural',
    'Fruta de estación (Manzana)',
    'Menú del Martes - Saludable',
    8.00,
    (CURRENT_DATE + (2 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER - INTERVAL '2 days')::TIMESTAMP + TIME '23:59:59',
    35
),
-- Miércoles
(
    CURRENT_DATE + (3 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER,
    'Ceviche de champiñones',
    'Pescado frito con arroz y ensalada criolla',
    'Refresco de maracuyá',
    'Gelatina de fresa',
    'Menú del Miércoles - Marino',
    9.00,
    (CURRENT_DATE + (3 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER - INTERVAL '2 days')::TIMESTAMP + TIME '23:59:59',
    25
),
-- Jueves
(
    CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER,
    'Crema de zapallo',
    'Tallarines verdes con bistec apanado',
    'Agua mineral',
    'Arroz con leche',
    'Menú del Jueves - Criollo',
    8.50,
    (CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER - INTERVAL '2 days')::TIMESTAMP + TIME '23:59:59',
    30
),
-- Viernes
(
    CURRENT_DATE + (5 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER,
    'Ensalada caprese con albahaca fresca',
    'Arroz chaufa de pollo con wantan frito',
    'Jugo de naranja natural',
    'Plátano de la isla',
    'Menú del Viernes - Fusión',
    9.50,
    (CURRENT_DATE + (5 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER - INTERVAL '2 days')::TIMESTAMP + TIME '23:59:59',
    40
)
ON CONFLICT (menu_date) DO NOTHING;

-- SEMANA SIGUIENTE
INSERT INTO weekly_menus (
    menu_date, entry_description, main_course_description,
    drink_description, dessert_description, description,
    price, reservation_deadline, max_reservations
) VALUES
-- Lunes próximo
(
    CURRENT_DATE + (8 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER,
    'Palta rellena con atún',
    'Seco de res con frejoles y arroz',
    'Chicha morada',
    'Flan de vainilla',
    'Menú del Lunes - Tradición',
    9.00,
    (CURRENT_DATE + (8 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER - INTERVAL '2 days')::TIMESTAMP + TIME '23:59:59',
    30
),
-- Martes próximo
(
    CURRENT_DATE + (9 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER,
    'Causa limeña de pollo',
    'Ají de gallina con arroz blanco',
    'Emoliente',
    'Suspiro limeño',
    'Menú del Martes - Limeño',
    10.00,
    (CURRENT_DATE + (9 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER - INTERVAL '2 days')::TIMESTAMP + TIME '23:59:59',
    35
),
-- Miércoles próximo
(
    CURRENT_DATE + (10 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER,
    'Chupe de camarones (entrada)',
    'Arroz con mariscos',
    'Refresco de camu camu',
    'Helado de lúcuma',
    'Menú del Miércoles - Del Mar',
    12.00,
    (CURRENT_DATE + (10 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER - INTERVAL '2 days')::TIMESTAMP + TIME '23:59:59',
    20
),
-- Jueves próximo
(
    CURRENT_DATE + (11 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER,
    'Papa a la huancaína',
    'Estofado de pollo con arroz',
    'Limonada frozen',
    'Picarones con miel',
    'Menú del Jueves - Hogareño',
    8.50,
    (CURRENT_DATE + (11 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER - INTERVAL '2 days')::TIMESTAMP + TIME '23:59:59',
    30
),
-- Viernes próximo
(
    CURRENT_DATE + (12 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER,
    'Tiradito de pescado',
    'Tacu tacu con lomo saltado',
    'Jugo de piña',
    'Torta de chocolate',
    'Menú del Viernes - Especial',
    11.00,
    (CURRENT_DATE + (12 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER - INTERVAL '2 days')::TIMESTAMP + TIME '23:59:59',
    25
)
ON CONFLICT (menu_date) DO NOTHING;

-- =====================================================
-- RESERVACIONES DE PRUEBA (requiere usuarios existentes)
-- =====================================================
-- Descomenta y ajusta los user_id según tus usuarios

/*
-- Obtener IDs de menús y usuarios para insertar reservaciones
DO $$
DECLARE
    v_menu_id UUID;
    v_user_id UUID;
BEGIN
    -- Obtener primer menú disponible
    SELECT menu_id INTO v_menu_id FROM weekly_menus WHERE is_active = true LIMIT 1;

    -- Obtener primer usuario customer
    SELECT user_id INTO v_user_id FROM users WHERE role = 'customer' LIMIT 1;

    IF v_menu_id IS NOT NULL AND v_user_id IS NOT NULL THEN
        INSERT INTO menu_reservations (menu_id, user_id, quantity, total_amount, status)
        VALUES (v_menu_id, v_user_id, 1, 8.50, 'confirmed')
        ON CONFLICT (user_id, menu_id) DO NOTHING;
    END IF;
END $$;
*/

-- =====================================================
-- VERIFICAR DATOS INSERTADOS
-- =====================================================
SELECT
    menu_date,
    entry_description,
    main_course_description,
    price,
    max_reservations,
    current_reservations,
    reservation_deadline,
    CASE
        WHEN reservation_deadline > NOW() THEN 'Abierto'
        ELSE 'Cerrado'
    END as estado_reservas
FROM weekly_menus
ORDER BY menu_date;
