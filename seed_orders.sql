-- =====================================================
-- SEED DE ORDENES DE PRUEBA
-- =====================================================

-- Limpiar datos existentes (opcional)
-- DELETE FROM order_items;
-- DELETE FROM orders;

-- =====================================================
-- ORDENES PARA: Juan Pérez (291c6a9e-58ca-4676-aa6d-da6bd11f85d4)
-- =====================================================

-- Orden 1: Entregada - Pago en efectivo
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, notes, created_at, confirmed_at, ready_at, delivered_at)
VALUES
('a1000001-0001-0001-0001-000000000001', '291c6a9e-58ca-4676-aa6d-da6bd11f85d4', 'ORD-20251121-0001', 18.50, 'delivered', 'cash', 'paid', false, 'Sin azúcar en el café', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes', NOW() - INTERVAL '2 days' + INTERVAL '15 minutes', NOW() - INTERVAL '2 days' + INTERVAL '20 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000001', '13d0de63-7b31-4b9d-b7a9-895464f437d6', 'Café Americano', 2, 3.50, 7.00, 'Sin azúcar'),
('a1000001-0001-0001-0001-000000000001', '077e332e-b194-47a5-a86b-fb2fc98ccb5e', 'Sandwich Mixto', 1, 7.00, 7.00, NULL),
('a1000001-0001-0001-0001-000000000001', '7b9b4822-1fe4-4a95-a78b-5d5437dfd929', 'Chips Naturales', 1, 4.50, 4.50, NULL);

-- Orden 2: Lista para entrega
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, estimated_ready_time, created_at, confirmed_at, ready_at)
VALUES
('a1000001-0001-0001-0001-000000000002', '291c6a9e-58ca-4676-aa6d-da6bd11f85d4', 'ORD-20251121-0002', 24.00, 'ready', 'card', 'paid', false, NOW() + INTERVAL '5 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '5 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000002', 'b4f64620-4860-458e-afd3-e89be09f9a6e', 'Lomo Saltado', 1, 14.00, 14.00, 'Arroz aparte'),
('a1000001-0001-0001-0001-000000000002', '562beddc-c6e7-4ccc-a1f6-cd5cdb4e6602', 'Café Latte', 2, 5.00, 10.00, NULL);

-- =====================================================
-- ORDENES PARA: María García (72a69b0b-1361-4f52-b4b0-4f791bebffce)
-- =====================================================

-- Orden 3: En preparación
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, estimated_ready_time, created_at, confirmed_at)
VALUES
('a1000001-0001-0001-0001-000000000003', '72a69b0b-1361-4f52-b4b0-4f791bebffce', 'ORD-20251121-0003', 31.00, 'preparing', 'cash', 'paid', false, NOW() + INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '10 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000003', '526bddff-03c6-4f53-982a-5fae14fa933e', 'Menú Ejecutivo', 2, 12.00, 24.00, 'Sin ensalada'),
('a1000001-0001-0001-0001-000000000003', 'c05a4d5e-66f2-4c9f-9116-807114ef18ad', 'Smoothie de Fresa', 1, 7.00, 7.00, NULL);

-- Orden 4: Confirmada - A crédito
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, estimated_ready_time, created_at, confirmed_at)
VALUES
('a1000001-0001-0001-0001-000000000004', '72a69b0b-1361-4f52-b4b0-4f791bebffce', 'ORD-20251121-0004', 22.50, 'confirmed', 'credit', 'pending', true, NOW() + INTERVAL '25 minutes', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '2 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000004', 'e790cafe-77c9-49c4-935d-62fa7caad7d1', 'Club Sandwich', 2, 9.00, 18.00, 'Extra mayonesa'),
('a1000001-0001-0001-0001-000000000004', '15b822f0-9863-4678-bd0c-56e184dd96c0', 'Jugo de Naranja', 1, 4.00, 4.00, NULL),
('a1000001-0001-0001-0001-000000000004', '0f831262-1918-487e-8b7c-1c990bc90b14', 'Brownie', 1, 5.50, 5.50, 'Sin helado');

-- Orden 5: Entregada hace 3 días
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, created_at, confirmed_at, ready_at, delivered_at)
VALUES
('a1000001-0001-0001-0001-000000000005', '72a69b0b-1361-4f52-b4b0-4f791bebffce', 'ORD-20251118-0001', 15.50, 'delivered', 'card', 'paid', false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes', NOW() - INTERVAL '3 days' + INTERVAL '12 minutes', NOW() - INTERVAL '3 days' + INTERVAL '15 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000005', '9ba6a22c-5752-4ad4-9c90-056adb87ca47', 'Cappuccino', 1, 5.50, 5.50, NULL),
('a1000001-0001-0001-0001-000000000005', 'e1e407f1-90b1-4770-81a2-bfaf77e26b0d', 'Arroz con Pollo', 1, 10.00, 10.00, NULL);

-- =====================================================
-- ORDENES PARA: Carlos López (3ced7521-e977-4587-9b3e-2dbe367d5868)
-- =====================================================

-- Orden 6: Pendiente - A crédito
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, notes, created_at)
VALUES
('a1000001-0001-0001-0001-000000000006', '3ced7521-e977-4587-9b3e-2dbe367d5868', 'ORD-20251121-0005', 27.00, 'pending', 'credit', 'pending', true, 'Entregar en oficina 302', NOW() - INTERVAL '2 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000006', 'b4f64620-4860-458e-afd3-e89be09f9a6e', 'Lomo Saltado', 1, 14.00, 14.00, NULL),
('a1000001-0001-0001-0001-000000000006', 'bc926af7-48a6-4ee7-ba9d-8efdfa4a1b14', 'Cheesecake', 1, 6.00, 6.00, NULL),
('a1000001-0001-0001-0001-000000000006', 'cfa16188-38ae-4770-bb93-a68d4453928d', 'Iced Coffee', 1, 6.00, 6.00, 'Extra hielo'),
('a1000001-0001-0001-0001-000000000006', '1bd53e17-68a4-48dc-9b59-4e0f7d2362f4', 'Té Verde', 1, 3.00, 3.00, NULL);

-- Orden 7: Cancelada
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, cancellation_reason, created_at)
VALUES
('a1000001-0001-0001-0001-000000000007', '3ced7521-e977-4587-9b3e-2dbe367d5868', 'ORD-20251120-0001', 19.00, 'cancelled', 'cash', 'pending', false, 'Cliente canceló - cambio de planes', NOW() - INTERVAL '1 day');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000007', '09ea6663-e5dd-4fd9-8903-3cc61199c274', 'Wrap Vegetariano', 2, 8.00, 16.00, NULL),
('a1000001-0001-0001-0001-000000000007', 'de36121b-687f-4e0a-a063-af0a73ec9a5a', 'Galletas Chips', 1, 3.00, 3.00, NULL);

-- Orden 8: Entregada - A crédito pagado
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, credit_paid_amount, created_at, confirmed_at, ready_at, delivered_at)
VALUES
('a1000001-0001-0001-0001-000000000008', '3ced7521-e977-4587-9b3e-2dbe367d5868', 'ORD-20251115-0001', 35.00, 'delivered', 'credit', 'paid', true, 35.00, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '5 minutes', NOW() - INTERVAL '6 days' + INTERVAL '20 minutes', NOW() - INTERVAL '6 days' + INTERVAL '25 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000008', '526bddff-03c6-4f53-982a-5fae14fa933e', 'Menú Ejecutivo', 2, 12.00, 24.00, NULL),
('a1000001-0001-0001-0001-000000000008', '8fc9b17b-21dd-4045-9cea-70127a1d152e', 'Torta de Chocolate', 2, 5.00, 10.00, NULL),
('a1000001-0001-0001-0001-000000000008', '13d0de63-7b31-4b9d-b7a9-895464f437d6', 'Café Americano', 1, 3.50, 3.50, NULL);

-- =====================================================
-- ORDENES PARA: Ana Martínez (dd0d7e77-010c-4ab5-856c-62b63c4b44e3)
-- =====================================================

-- Orden 9: En preparación
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, estimated_ready_time, created_at, confirmed_at)
VALUES
('a1000001-0001-0001-0001-000000000009', 'dd0d7e77-010c-4ab5-856c-62b63c4b44e3', 'ORD-20251121-0006', 16.50, 'preparing', 'card', 'paid', false, NOW() + INTERVAL '10 minutes', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '15 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000009', 'd669fff9-995e-4e90-b317-db022201559e', 'Mix de Frutos Secos', 1, 5.50, 5.50, NULL),
('a1000001-0001-0001-0001-000000000009', '562beddc-c6e7-4ccc-a1f6-cd5cdb4e6602', 'Café Latte', 1, 5.00, 5.00, 'Leche de almendras'),
('a1000001-0001-0001-0001-000000000009', 'bc926af7-48a6-4ee7-ba9d-8efdfa4a1b14', 'Cheesecake', 1, 6.00, 6.00, NULL);

-- Orden 10: Entregada ayer
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, created_at, confirmed_at, ready_at, delivered_at)
VALUES
('a1000001-0001-0001-0001-000000000010', 'dd0d7e77-010c-4ab5-856c-62b63c4b44e3', 'ORD-20251120-0002', 21.00, 'delivered', 'cash', 'paid', false, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '4 minutes', NOW() - INTERVAL '1 day' + INTERVAL '18 minutes', NOW() - INTERVAL '1 day' + INTERVAL '22 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000010', 'e1e407f1-90b1-4770-81a2-bfaf77e26b0d', 'Arroz con Pollo', 1, 10.00, 10.00, NULL),
('a1000001-0001-0001-0001-000000000010', 'fb0e5a6d-db30-478a-8253-fce81f0ca70c', 'Limonada', 2, 3.50, 7.00, NULL),
('a1000001-0001-0001-0001-000000000010', '15b822f0-9863-4678-bd0c-56e184dd96c0', 'Jugo de Naranja', 1, 4.00, 4.00, NULL);

-- =====================================================
-- ORDENES PARA: Luis Rodríguez (4d221817-86a8-428c-afe4-06376c3f179b)
-- =====================================================

-- Orden 11: Lista para entrega
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, estimated_ready_time, created_at, confirmed_at, ready_at)
VALUES
('a1000001-0001-0001-0001-000000000011', '4d221817-86a8-428c-afe4-06376c3f179b', 'ORD-20251121-0007', 29.50, 'ready', 'cash', 'paid', false, NOW(), NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '8 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000011', 'b4f64620-4860-458e-afd3-e89be09f9a6e', 'Lomo Saltado', 1, 14.00, 14.00, 'Sin cebolla'),
('a1000001-0001-0001-0001-000000000011', '9ba6a22c-5752-4ad4-9c90-056adb87ca47', 'Cappuccino', 1, 5.50, 5.50, NULL),
('a1000001-0001-0001-0001-000000000011', '8fc9b17b-21dd-4045-9cea-70127a1d152e', 'Torta de Chocolate', 2, 5.00, 10.00, NULL);

-- Orden 12: Pendiente
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, notes, created_at)
VALUES
('a1000001-0001-0001-0001-000000000012', '4d221817-86a8-428c-afe4-06376c3f179b', 'ORD-20251121-0008', 12.00, 'pending', 'card', 'paid', false, 'Para llevar', NOW() - INTERVAL '1 minute');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000012', '526bddff-03c6-4f53-982a-5fae14fa933e', 'Menú Ejecutivo', 1, 12.00, 12.00, 'Sin sopa');

-- =====================================================
-- ORDENES PARA: Usuario de Prueba (88e8026d-7686-4196-bab9-d5f3ceb1d924)
-- =====================================================

-- Orden 13: Confirmada
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, estimated_ready_time, created_at, confirmed_at)
VALUES
('a1000001-0001-0001-0001-000000000013', '88e8026d-7686-4196-bab9-d5f3ceb1d924', 'ORD-20251121-0009', 19.00, 'confirmed', 'cash', 'paid', false, NOW() + INTERVAL '20 minutes', NOW() - INTERVAL '8 minutes', NOW() - INTERVAL '5 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000013', '077e332e-b194-47a5-a86b-fb2fc98ccb5e', 'Sandwich Mixto', 1, 7.00, 7.00, NULL),
('a1000001-0001-0001-0001-000000000013', 'c05a4d5e-66f2-4c9f-9116-807114ef18ad', 'Smoothie de Fresa', 1, 7.00, 7.00, NULL),
('a1000001-0001-0001-0001-000000000013', '7b9b4822-1fe4-4a95-a78b-5d5437dfd929', 'Chips Naturales', 1, 4.50, 4.50, NULL),
('a1000001-0001-0001-0001-000000000013', '13d0de63-7b31-4b9d-b7a9-895464f437d6', 'Café Americano', 1, 3.50, 3.50, NULL);

-- Orden 14: Entregada hace 5 días
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, created_at, confirmed_at, ready_at, delivered_at)
VALUES
('a1000001-0001-0001-0001-000000000014', '88e8026d-7686-4196-bab9-d5f3ceb1d924', 'ORD-20251116-0001', 28.00, 'delivered', 'card', 'paid', false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '3 minutes', NOW() - INTERVAL '5 days' + INTERVAL '15 minutes', NOW() - INTERVAL '5 days' + INTERVAL '18 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000014', 'e790cafe-77c9-49c4-935d-62fa7caad7d1', 'Club Sandwich', 2, 9.00, 18.00, NULL),
('a1000001-0001-0001-0001-000000000014', 'cfa16188-38ae-4770-bb93-a68d4453928d', 'Iced Coffee', 1, 6.00, 6.00, NULL),
('a1000001-0001-0001-0001-000000000014', '15b822f0-9863-4678-bd0c-56e184dd96c0', 'Jugo de Naranja', 1, 4.00, 4.00, NULL);

-- Orden 15: Entregada hace 1 semana
INSERT INTO orders (order_id, user_id, order_number, total_amount, status, payment_method, payment_status, is_credit_order, created_at, confirmed_at, ready_at, delivered_at)
VALUES
('a1000001-0001-0001-0001-000000000015', '88e8026d-7686-4196-bab9-d5f3ceb1d924', 'ORD-20251114-0001', 42.00, 'delivered', 'cash', 'paid', false, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '5 minutes', NOW() - INTERVAL '7 days' + INTERVAL '25 minutes', NOW() - INTERVAL '7 days' + INTERVAL '30 minutes');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, customizations)
VALUES
('a1000001-0001-0001-0001-000000000015', '526bddff-03c6-4f53-982a-5fae14fa933e', 'Menú Ejecutivo', 3, 12.00, 36.00, 'Para 3 personas'),
('a1000001-0001-0001-0001-000000000015', '0f831262-1918-487e-8b7c-1c990bc90b14', 'Brownie', 1, 5.50, 5.50, NULL);

-- =====================================================
-- RESUMEN DE ORDENES CREADAS:
-- =====================================================
-- Total: 15 órdenes
--
-- Por estado:
--   - pending: 2 (orden 6, 12)
--   - confirmed: 2 (orden 4, 13)
--   - preparing: 2 (orden 3, 9)
--   - ready: 2 (orden 2, 11)
--   - delivered: 6 (orden 1, 5, 8, 10, 14, 15)
--   - cancelled: 1 (orden 7)
--
-- Por método de pago:
--   - cash: 7
--   - card: 5
--   - credit: 3
--
-- Órdenes a crédito: 3 (orden 4, 6, 8)
-- =====================================================

SELECT 'Seed de órdenes completado exitosamente!' as mensaje;
SELECT
  status,
  COUNT(*) as cantidad,
  SUM(total_amount) as total
FROM orders
GROUP BY status
ORDER BY
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'confirmed' THEN 2
    WHEN 'preparing' THEN 3
    WHEN 'ready' THEN 4
    WHEN 'delivered' THEN 5
    WHEN 'cancelled' THEN 6
  END;
