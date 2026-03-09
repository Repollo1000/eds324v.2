-- ============================================================================
-- MIGRACIÓN 005: Constraint Único para Liquidaciones
-- ============================================================================
-- Propósito: Prevenir duplicación de liquidaciones para el mismo empleado/periodo
-- Fecha: 2026-03-09
-- ============================================================================

-- ⚠️  IMPORTANTE: Verificar duplicados antes de aplicar
-- ============================================================================
-- Esta migración creará un constraint único que fallará si ya existen
-- registros duplicados. DEBES ejecutar esta query primero:

-- PASO 1: Identificar duplicados existentes
-- ============================================================================
-- Ejecuta esta query para ver si hay duplicados:

SELECT personal_id, mes, anio, COUNT(*) as cantidad
FROM liquidaciones
GROUP BY personal_id, mes, anio
HAVING COUNT(*) > 1
ORDER BY anio DESC, mes DESC;

-- Si la query retorna filas, hay duplicados que deben limpiarse.
--
-- PASO 2: Limpiar duplicados (SI EXISTEN)
-- ============================================================================
-- Conservar solo el más reciente por created_at:
--
-- DELETE FROM liquidaciones l1
-- USING liquidaciones l2
-- WHERE l1.id < l2.id
--   AND l1.personal_id = l2.personal_id
--   AND l1.mes = l2.mes
--   AND l1.anio = l2.anio;
--
-- ============================================================================

-- PASO 3: Crear índice único (SOLO DESPUÉS DE LIMPIAR DUPLICADOS)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_liquidacion_unica
ON liquidaciones (personal_id, mes, anio);

COMMENT ON INDEX idx_liquidacion_unica IS
'Previene duplicación de liquidaciones. Una liquidación es única por (empleado, mes, año)';

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================
--
-- Verifica que el índice se creó correctamente:
SELECT * FROM pg_indexes WHERE indexname = 'idx_liquidacion_unica';
--
-- Intenta insertar un duplicado (debe fallar con error 23505):
-- INSERT INTO liquidaciones (personal_id, mes, anio, archivo_path, estado)
-- VALUES ('uuid-existente', 3, 2026, 'test.pdf', 'enviado');
-- -- Ejecutar 2 veces debe dar error la segunda vez
--
-- ============================================================================

-- ============================================================================
-- NOTAS ADICIONALES
-- ============================================================================
--
-- 1. BENEFICIOS DEL CONSTRAINT:
--    - Previene enviar la misma liquidación dos veces por accidente
--    - Garantiza integridad referencial a nivel de BD
--    - Permite usar UPSERT en la aplicación
--
-- 2. COMPORTAMIENTO CON UPSERT:
--    - upsert() reemplazará el registro existente si se reenvía
--    - Útil si necesitas corregir una liquidación ya enviada
--
-- 3. CÓDIGO DE ERROR:
--    - Error code: 23505 (unique_violation)
--    - Error message: "duplicate key value violates unique constraint idx_liquidacion_unica"
--
-- ============================================================================
