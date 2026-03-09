-- ============================================================================
-- AUDITORÍA DE SEGURIDAD Y BUENAS PRÁCTICAS - BASE DE DATOS
-- ============================================================================
-- Fecha: 2026-03-09
-- Proyecto: EDS324v.2
-- Propósito: Verificar seguridad, integridad y buenas prácticas antes de producción
-- ============================================================================

\echo '═══════════════════════════════════════════════════════════════════════'
\echo '1. VERIFICACIÓN DE ROW LEVEL SECURITY (RLS)'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Listar tablas SIN RLS habilitado (RIESGO DE SEGURIDAD)
SELECT
  '⚠️  RIESGO: Tabla sin RLS' as issue,
  schemaname || '.' || tablename as tabla
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('schema_migrations')
  AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relname = pg_tables.tablename
      AND c.relrowsecurity = true
  )
ORDER BY tablename;

-- Verificar políticas RLS activas
SELECT
  '✓ RLS Habilitado' as status,
  schemaname || '.' || tablename as tabla,
  COUNT(*) FILTER (WHERE policyname IS NOT NULL) as num_policies
FROM pg_tables
LEFT JOIN pg_policies ON tablename = pg_policies.tablename
WHERE schemaname = 'public'
  AND tablename NOT IN ('schema_migrations')
GROUP BY schemaname, pg_tables.tablename
ORDER BY tablename;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '2. VERIFICACIÓN DE ÍNDICES'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Tablas sin índice en campos de búsqueda comunes
SELECT
  '⚠️  Falta índice' as issue,
  t.tablename,
  c.column_name,
  'Considerar agregar índice para mejorar performance' as recomendacion
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND c.column_name IN ('fecha', 'email', 'responsable', 'personal_id', 'tipo', 'estado')
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes i
    WHERE i.tablename = t.table_name
      AND (i.indexdef LIKE '%' || c.column_name || '%')
  )
ORDER BY t.tablename, c.column_name;

-- Listar todos los índices existentes
SELECT
  '✓ Índice existente' as status,
  schemaname || '.' || tablename as tabla,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '3. VERIFICACIÓN DE CONSTRAINTS'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Verificar constraints UNIQUE
SELECT
  '✓ Constraint UNIQUE' as status,
  conrelid::regclass as tabla,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE contype = 'u'
  AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text;

-- Verificar constraints CHECK
SELECT
  '✓ Constraint CHECK' as status,
  conrelid::regclass as tabla,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE contype = 'c'
  AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text;

-- Verificar Foreign Keys
SELECT
  '✓ Foreign Key' as status,
  conrelid::regclass as tabla,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '4. VERIFICACIÓN DE CAMPOS NULLABLE (Campos opcionales)'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Campos críticos que deberían ser NOT NULL
SELECT
  CASE
    WHEN is_nullable = 'YES' THEN '⚠️  Campo crítico nullable'
    ELSE '✓ NOT NULL correcto'
  END as status,
  table_name as tabla,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('turnos', 'personal', 'pagos_personal', 'ausencias')
  AND column_name IN ('fecha', 'responsable', 'email', 'nombre', 'turno', 'tipo')
ORDER BY table_name, column_name;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '5. VERIFICACIÓN DE TRIGGERS (Auditoría automática)'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Verificar triggers de auditoría
SELECT
  '✓ Trigger de auditoría activo' as status,
  event_object_table as tabla,
  trigger_name,
  event_manipulation as evento,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'audit_%'
ORDER BY event_object_table;

-- Tablas críticas sin trigger de auditoría
SELECT
  '⚠️  Falta trigger de auditoría' as issue,
  tablename as tabla,
  'Considerar agregar auditoría para trazabilidad' as recomendacion
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('turnos', 'personal', 'pagos_personal', 'ausencias')
  AND NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = (schemaname || '.' || tablename)::regclass
      AND tgname LIKE 'audit_%'
  );

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '6. VERIFICACIÓN DE DATOS SENSIBLES'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Buscar columnas con datos potencialmente sensibles
SELECT
  '⚠️  Datos sensibles' as issue,
  table_name as tabla,
  column_name,
  data_type,
  CASE
    WHEN column_name LIKE '%password%' THEN 'Debería estar encriptado'
    WHEN column_name LIKE '%rut%' THEN 'Dato personal - verificar protección'
    WHEN column_name LIKE '%email%' THEN 'Dato personal - verificar protección'
    WHEN column_name LIKE '%telefono%' OR column_name LIKE '%phone%' THEN 'Dato personal - verificar protección'
    ELSE 'Revisar nivel de protección'
  END as recomendacion
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name LIKE '%password%'
    OR column_name LIKE '%rut%'
    OR column_name LIKE '%email%'
    OR column_name LIKE '%telefono%'
    OR column_name LIKE '%phone%'
    OR column_name LIKE '%dni%'
  )
ORDER BY table_name;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '7. VERIFICACIÓN DE DUPLICADOS (Integridad de datos)'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Verificar duplicados en turnos (fecha, turno, responsable)
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '⚠️  Duplicados encontrados en turnos'
    ELSE '✓ Sin duplicados en turnos'
  END as status,
  COUNT(*) as cantidad_duplicados
FROM (
  SELECT fecha, turno, responsable, COUNT(*) as cnt
  FROM turnos
  GROUP BY fecha, turno, responsable
  HAVING COUNT(*) > 1
) duplicados;

-- Mostrar duplicados si existen
SELECT
  '⚠️  Registro duplicado' as issue,
  fecha, turno, responsable, COUNT(*) as veces_duplicado
FROM turnos
GROUP BY fecha, turno, responsable
HAVING COUNT(*) > 1
ORDER BY fecha DESC, turno;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '8. VERIFICACIÓN DE VALORES POR DEFECTO'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Verificar campos con valores por defecto
SELECT
  '✓ Valor por defecto configurado' as status,
  table_name as tabla,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_default IS NOT NULL
  AND table_name IN ('turnos', 'personal', 'pagos_personal', 'ausencias', 'historial_auditoria')
ORDER BY table_name, column_name;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '9. VERIFICACIÓN DE FUNCIONES DE SEGURIDAD'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Verificar función get_user_rol
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✓ Función get_user_rol existe'
    ELSE '⚠️  Función get_user_rol NO existe'
  END as status,
  COUNT(*) as cantidad
FROM pg_proc
WHERE proname = 'get_user_rol';

-- Verificar función de auditoría
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✓ Función audit_trigger_func existe'
    ELSE '⚠️  Función audit_trigger_func NO existe'
  END as status,
  COUNT(*) as cantidad
FROM pg_proc
WHERE proname = 'audit_trigger_func';

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '10. RESUMEN DE SEGURIDAD Y RECOMENDACIONES'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Resumen general
SELECT
  'RESUMEN DE AUDITORÍA' as seccion,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%') as total_tablas,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND EXISTS (
    SELECT 1 FROM pg_class c WHERE c.relname = tablename AND c.relrowsecurity = true
  )) as tablas_con_rls,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indices,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'audit_%') as triggers_auditoria,
  (SELECT COUNT(*) FROM pg_constraint WHERE contype = 'u') as constraints_unique,
  (SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f') as foreign_keys;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo 'AUDITORÍA COMPLETADA'
\echo '═══════════════════════════════════════════════════════════════════════'
\echo ''
\echo 'Revisa los resultados anteriores para:'
\echo '  - ⚠️  Issues marcados con este símbolo requieren atención'
\echo '  - ✓ Items marcados así están correctamente configurados'
\echo ''
\echo 'RECOMENDACIONES GENERALES:'
\echo '  1. Todas las tablas deben tener RLS habilitado'
\echo '  2. Tablas críticas deben tener triggers de auditoría'
\echo '  3. Eliminar duplicados antes de crear constraints UNIQUE'
\echo '  4. Campos críticos deben ser NOT NULL'
\echo '  5. Datos sensibles deben estar protegidos con RLS estricto'
\echo '═══════════════════════════════════════════════════════════════════════'
