-- Migration: Add Payment Methods (Yape and Plin)
-- Description: Agregar métodos de pago Yape y Plin a órdenes y pagos de crédito

-- 1. Eliminar constraints existentes
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE credit_payments DROP CONSTRAINT IF EXISTS credit_payments_payment_method_check;

-- 2. Agregar nuevos constraints con Yape y Plin incluidos
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('cash', 'card', 'credit', 'yape', 'plin'));

ALTER TABLE credit_payments ADD CONSTRAINT credit_payments_payment_method_check
    CHECK (payment_method IN ('cash', 'card', 'transfer', 'yape', 'plin'));

-- Comentario: Ahora los usuarios pueden pagar con Yape y Plin tanto en órdenes nuevas como en pagos de deudas
