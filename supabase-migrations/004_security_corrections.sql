-- ============================================================================
-- MIGRACIÓN 004: Correcciones de Seguridad (Post-Auditoría)
-- ============================================================================
-- Fecha: 2026-03-09
-- Propósito: Aplicar correcciones críticas encontradas en auditoría de seguridad
-- ============================================================================

\echo '═══════════════════════════════════════════════════════════════════════'
\echo 'APLICANDO CORRECCIONES DE SEGURIDAD'
\echo '═══════════════════════════════════════════════════════════════════════'

-- ============================================================================
-- 1. HABILITAR RLS EN TABLAS SIN PROTECCIÓN
-- ============================================================================

\echo ''
\echo '1. Habilitando RLS en historial_liquidaciones...'

ALTER TABLE historial_liquidaciones ENABLE ROW LEVEL SECURITY;

-- Política de lectura: admin y supervisor pueden ver
CREATE POLICY "Admin y Supervisor pueden ver liquidaciones"
ON historial_liquidaciones FOR SELECT
TO authenticated
USING (get_user_rol() IN ('administrador', 'supervisor'));

-- Política de modificación: solo admin (usando FOR ALL en lugar de FOR INSERT OR UPDATE OR DELETE)
CREATE POLICY "Solo admin modifica liquidaciones"
ON historial_liquidaciones FOR ALL
TO authenticated
USING (get_user_rol() = 'administrador')
WITH CHECK (get_user_rol() = 'administrador');

\echo '✓ RLS habilitado en historial_liquidaciones'

-- ============================================================================
-- 2. AGREGAR TRIGGERS DE AUDITORÍA EN TABLAS SENSIBLES
-- ============================================================================

\echo ''
\echo '2. Agregando triggers de auditoría en tablas sensibles...'

-- Trigger en historial_liquidaciones (datos de nómina)
DROP TRIGGER IF EXISTS audit_liquidaciones ON historial_liquidaciones;
CREATE TRIGGER audit_liquidaciones
  AFTER INSERT OR UPDATE OR DELETE ON historial_liquidaciones
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

\echo '✓ Trigger de auditoría agregado en historial_liquidaciones'

-- Verificar si existe la tabla depositos y agregar trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'depositos' AND schemaname = 'public') THEN
    DROP TRIGGER IF EXISTS audit_depositos ON depositos;
    EXECUTE 'CREATE TRIGGER audit_depositos
      AFTER INSERT OR UPDATE OR DELETE ON depositos
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_func()';
    RAISE NOTICE '✓ Trigger de auditoría agregado en depositos';
  ELSE
    RAISE NOTICE '⚠ Tabla depositos no existe, saltando...';
  END IF;
END$$;

-- ============================================================================
-- 3. AGREGAR ÍNDICES PARA MEJORAR PERFORMANCE
-- ============================================================================

\echo ''
\echo '3. Agregando índices en campos de búsqueda comunes...'

-- Índices en turnos (si no existen)
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_responsable ON turnos(responsable);
CREATE INDEX IF NOT EXISTS idx_turnos_tipo ON turnos(turno);

-- Índices en personal
CREATE INDEX IF NOT EXISTS idx_personal_email ON personal(email);
CREATE INDEX IF NOT EXISTS idx_personal_activo ON personal(activo);

-- Índices en pagos_personal
CREATE INDEX IF NOT EXISTS idx_pagos_personal_id ON pagos_personal(personal_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos_personal(fecha);

-- Índices en ausencias
CREATE INDEX IF NOT EXISTS idx_ausencias_personal_id ON ausencias(personal_id);
CREATE INDEX IF NOT EXISTS idx_ausencias_fecha_inicio ON ausencias(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_ausencias_tipo ON ausencias(tipo);

-- Índices en historial_liquidaciones
CREATE INDEX IF NOT EXISTS idx_liquidaciones_personal_id ON historial_liquidaciones(personal_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_mes ON historial_liquidaciones(mes);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_anio ON historial_liquidaciones(anio);

\echo '✓ Índices agregados para mejorar performance'

-- ============================================================================
-- 4. VERIFICAR CAMPOS NOT NULL EN TABLAS CRÍTICAS
-- ============================================================================

\echo ''
\echo '4. Verificando constraints NOT NULL...'

-- Verificar que campos críticos en turnos sean NOT NULL
-- (Solo alertar, no modificar datos existentes)
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM turnos WHERE fecha IS NULL OR responsable IS NULL OR turno IS NULL;
  IF null_count > 0 THEN
    RAISE WARNING '⚠ Se encontraron % registros en turnos con campos críticos NULL', null_count;
  ELSE
    RAISE NOTICE '✓ Todos los registros en turnos tienen campos críticos completos';
  END IF;
END$$;

-- ============================================================================
-- 5. COMENTARIOS EN TABLAS Y POLÍTICAS
-- ============================================================================

\echo ''
\echo '5. Agregando comentarios de documentación...'

COMMENT ON TABLE historial_liquidaciones IS 'Almacena liquidaciones de sueldo mensuales. Protegido por RLS - solo admin puede modificar';
COMMENT ON POLICY "Admin y Supervisor pueden ver liquidaciones" ON historial_liquidaciones IS 'Permite lectura a usuarios autenticados con rol admin o supervisor';
COMMENT ON POLICY "Solo admin modifica liquidaciones" ON historial_liquidaciones IS 'Solo administradores pueden crear, modificar o eliminar liquidaciones';

\echo '✓ Comentarios agregados'

-- ============================================================================
-- 6. RESUMEN DE CORRECCIONES APLICADAS
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo 'RESUMEN DE CORRECCIONES APLICADAS'
\echo '═══════════════════════════════════════════════════════════════════════'

SELECT
  'CORRECCIONES APLICADAS' as seccion,
  (SELECT COUNT(*) FROM pg_class WHERE relname = 'historial_liquidaciones' AND relrowsecurity = true) as rls_liquidaciones_habilitado,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'audit_liquidaciones') as trigger_audit_liquidaciones,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename IN ('turnos', 'personal', 'pagos_personal', 'ausencias', 'historial_liquidaciones')) as indices_agregados;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo 'VERIFICACIÓN FINAL - TABLAS CON RLS'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Listar todas las tablas con RLS habilitado
SELECT
  '✓ RLS Habilitado' as status,
  schemaname || '.' || tablename as tabla,
  COUNT(*) FILTER (WHERE policyname IS NOT NULL) as num_policies
FROM pg_tables
LEFT JOIN pg_policies ON pg_tables.tablename = pg_policies.tablename
WHERE schemaname = 'public'
  AND tablename NOT IN ('schema_migrations')
  AND EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relname = pg_tables.tablename
      AND c.relrowsecurity = true
  )
GROUP BY schemaname, pg_tables.tablename
ORDER BY pg_tables.tablename;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo 'CORRECCIONES DE SEGURIDAD COMPLETADAS'
\echo '═══════════════════════════════════════════════════════════════════════'
\echo ''
\echo 'Cambios aplicados:'
\echo '  ✓ RLS habilitado en historial_liquidaciones'
\echo '  ✓ Políticas de acceso configuradas (admin/supervisor)'
\echo '  ✓ Triggers de auditoría agregados'
\echo '  ✓ Índices de performance agregados'
\echo ''
\echo 'IMPORTANTE:'
\echo '  - Todos los cambios en liquidaciones ahora se registran en auditoría'
\echo '  - Solo administradores pueden modificar datos de liquidaciones'
\echo '  - Supervisores pueden ver pero no editar liquidaciones'
\echo '═══════════════════════════════════════════════════════════════════════'
