-- ============================================================================
-- MIGRACIÓN 003: Constraint de Unicidad para Turnos
-- ============================================================================
-- Descripción: Agrega un índice único en la tabla turnos para prevenir
--              la duplicación de turnos con la misma (fecha, turno, responsable).
-- Fecha: 2026-03-09
-- ============================================================================

-- ⚠️  IMPORTANTE: ANTES DE EJECUTAR ESTA MIGRACIÓN
-- ============================================================================
-- Esta migración creará un constraint único que fallará si ya existen
-- duplicados en la base de datos. DEBES seguir estos pasos:
--
-- PASO 1: Identificar duplicados existentes
-- ============================================================================

-- Ejecuta esta query para ver si hay duplicados:
SELECT fecha, turno, responsable, COUNT(*) as cantidad
FROM turnos
GROUP BY fecha, turno, responsable
HAVING COUNT(*) > 1
ORDER BY fecha DESC, turno, responsable;

-- Si la query anterior retorna filas, hay duplicados que deben limpiarse.
--
-- PASO 2: Limpiar duplicados (SI EXISTEN)
-- ============================================================================
--
-- Opción A: Eliminar duplicados conservando el más reciente por created_at
-- (Ajusta según la columna de timestamp que tengas, puede ser 'created_at' o similar)
--
-- DELETE FROM turnos t1
-- USING turnos t2
-- WHERE t1.id < t2.id
--   AND t1.fecha = t2.fecha
--   AND t1.turno = t2.turno
--   AND t1.responsable = t2.responsable;
--
-- Opción B: Revisar manualmente cada duplicado y decidir cuál conservar
-- (Recomendado si hay pocos duplicados)
--
-- ============================================================================


-- PASO 3: Crear índice único (SOLO DESPUÉS DE LIMPIAR DUPLICADOS)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_turno_unico
ON turnos (fecha, turno, responsable);

COMMENT ON INDEX idx_turno_unico IS
'Previene la duplicación de turnos. Un turno es único por (fecha, turno, responsable)';


-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================
--
-- Verifica que el índice se creó correctamente:
-- SELECT * FROM pg_indexes WHERE indexname = 'idx_turno_unico';
--
-- Intenta insertar un duplicado (debe fallar):
-- INSERT INTO turnos (fecha, turno, responsable, ...)
-- VALUES ('2026-03-09', 'mañana', 'Juan Pérez', ...);
-- -- Luego ejecuta la misma query de nuevo, debe retornar error de violación de unique constraint
--
-- ============================================================================


-- ============================================================================
-- NOTAS ADICIONALES
-- ============================================================================
--
-- 1. BENEFICIOS DEL CONSTRAINT:
--    - Previene duplicados accidentales desde la aplicación
--    - Previene duplicados desde SQL directo o scripts
--    - Previene duplicados incluso si hay bugs en el código de validación
--
-- 2. COMPORTAMIENTO AL IMPORTAR:
--    - Si intentas importar un turno duplicado, la query fallará
--    - La aplicación ya tiene validación en el frontend (parsearCuadraturas)
--    - Este constraint es una capa de seguridad adicional
--
-- 3. MANEJO DE ERRORES:
--    - Error code: 23505 (unique_violation)
--    - Error message: "duplicate key value violates unique constraint idx_turno_unico"
--
-- 4. SI NECESITAS MODIFICAR UN TURNO EXISTENTE:
--    - No hay problema, el constraint solo previene duplicados exactos
--    - Puedes UPDATE cualquier campo sin restricción
--    - Solo fallaría si intentas cambiar (fecha, turno, responsable) a una combinación que ya existe
--
-- ============================================================================
