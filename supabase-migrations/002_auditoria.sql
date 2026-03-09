-- ============================================================================
-- MIGRACIÓN 002: Sistema de Auditoría Automática
-- ============================================================================
-- Descripción: Implementa auditoría automática mediante triggers PostgreSQL
--              que registran todos los cambios (INSERT/UPDATE/DELETE) en
--              tablas críticas del sistema.
-- Fecha: 2026-03-09
-- Dependencias: Requiere migración 001 (get_user_rol function)
-- ============================================================================

-- 1. TABLA DE HISTORIAL DE AUDITORÍA
-- ============================================================================
-- Almacena todos los eventos de auditoría con información completa del cambio.

CREATE TABLE IF NOT EXISTS historial_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  registro_id UUID,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_email TEXT,
  usuario_rol TEXT,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE historial_auditoria IS
'Registro automático de todos los cambios críticos en el sistema';

COMMENT ON COLUMN historial_auditoria.tabla IS 'Nombre de la tabla afectada';
COMMENT ON COLUMN historial_auditoria.accion IS 'Tipo de operación: INSERT, UPDATE o DELETE';
COMMENT ON COLUMN historial_auditoria.registro_id IS 'ID del registro afectado';
COMMENT ON COLUMN historial_auditoria.usuario_id IS 'ID del usuario que realizó el cambio';
COMMENT ON COLUMN historial_auditoria.usuario_email IS 'Email del usuario (cache para queries rápidas)';
COMMENT ON COLUMN historial_auditoria.usuario_rol IS 'Rol del usuario en el momento del cambio';
COMMENT ON COLUMN historial_auditoria.datos_anteriores IS 'Estado del registro ANTES del cambio (NULL para INSERT)';
COMMENT ON COLUMN historial_auditoria.datos_nuevos IS 'Estado del registro DESPUÉS del cambio (NULL para DELETE)';


-- 2. ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ============================================================================

CREATE INDEX idx_auditoria_tabla ON historial_auditoria(tabla);
CREATE INDEX idx_auditoria_timestamp ON historial_auditoria(timestamp DESC);
CREATE INDEX idx_auditoria_usuario ON historial_auditoria(usuario_id);
CREATE INDEX idx_auditoria_accion ON historial_auditoria(accion);
CREATE INDEX idx_auditoria_tabla_timestamp ON historial_auditoria(tabla, timestamp DESC);

COMMENT ON INDEX idx_auditoria_tabla IS 'Filtrar por tabla';
COMMENT ON INDEX idx_auditoria_timestamp IS 'Ordenar por fecha descendente';
COMMENT ON INDEX idx_auditoria_usuario IS 'Filtrar por usuario';
COMMENT ON INDEX idx_auditoria_accion IS 'Filtrar por tipo de acción';
COMMENT ON INDEX idx_auditoria_tabla_timestamp IS 'Índice compuesto para queries frecuentes';


-- 3. FUNCIÓN DE TRIGGER PARA AUDITORÍA AUTOMÁTICA
-- ============================================================================
-- Esta función se ejecuta automáticamente en cada INSERT/UPDATE/DELETE
-- de las tablas configuradas con trigger.

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
  v_usuario_email TEXT;
  v_usuario_rol TEXT;
BEGIN
  -- Obtener datos del usuario autenticado desde el JWT de Supabase
  v_usuario_id := auth.uid();
  v_usuario_email := auth.jwt() ->> 'email';
  v_usuario_rol := COALESCE(auth.jwt() -> 'user_metadata' ->> 'rol', 'supervisor');

  -- Registrar según el tipo de operación
  IF (TG_OP = 'DELETE') THEN
    -- Para DELETE: guardar datos anteriores, nuevos = NULL
    INSERT INTO historial_auditoria (
      tabla, accion, registro_id, usuario_id, usuario_email, usuario_rol,
      datos_anteriores, datos_nuevos
    ) VALUES (
      TG_TABLE_NAME, TG_OP, OLD.id, v_usuario_id, v_usuario_email, v_usuario_rol,
      row_to_json(OLD), NULL
    );
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Para UPDATE: guardar datos antes y después
    INSERT INTO historial_auditoria (
      tabla, accion, registro_id, usuario_id, usuario_email, usuario_rol,
      datos_anteriores, datos_nuevos
    ) VALUES (
      TG_TABLE_NAME, TG_OP, NEW.id, v_usuario_id, v_usuario_email, v_usuario_rol,
      row_to_json(OLD), row_to_json(NEW)
    );
    RETURN NEW;

  ELSIF (TG_OP = 'INSERT') THEN
    -- Para INSERT: anteriores = NULL, guardar datos nuevos
    INSERT INTO historial_auditoria (
      tabla, accion, registro_id, usuario_id, usuario_email, usuario_rol,
      datos_anteriores, datos_nuevos
    ) VALUES (
      TG_TABLE_NAME, TG_OP, NEW.id, v_usuario_id, v_usuario_email, v_usuario_rol,
      NULL, row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_trigger_func() IS
'Trigger function que registra automáticamente INSERT/UPDATE/DELETE en historial_auditoria';


-- 4. APLICAR TRIGGERS A TABLAS CRÍTICAS
-- ============================================================================

-- 4.1 Trigger para tabla TURNOS (cuadraturas)
DROP TRIGGER IF EXISTS audit_turnos ON turnos;
CREATE TRIGGER audit_turnos
  AFTER INSERT OR UPDATE OR DELETE ON turnos
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

COMMENT ON TRIGGER audit_turnos ON turnos IS
'Audita automáticamente todos los cambios en turnos/cuadraturas';


-- 4.2 Trigger para tabla PERSONAL (empleados)
DROP TRIGGER IF EXISTS audit_personal ON personal;
CREATE TRIGGER audit_personal
  AFTER INSERT OR UPDATE OR DELETE ON personal
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

COMMENT ON TRIGGER audit_personal ON personal IS
'Audita automáticamente todos los cambios en datos de personal';


-- 4.3 Trigger para tabla PAGOS_PERSONAL (anticipos/aguinaldos)
DROP TRIGGER IF EXISTS audit_pagos ON pagos_personal;
CREATE TRIGGER audit_pagos
  AFTER INSERT OR UPDATE OR DELETE ON pagos_personal
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

COMMENT ON TRIGGER audit_pagos ON pagos_personal IS
'Audita automáticamente todos los pagos, anticipos y aguinaldos';


-- 4.4 Trigger para tabla AUSENCIAS (licencias médicas, faltas)
DROP TRIGGER IF EXISTS audit_ausencias ON ausencias;
CREATE TRIGGER audit_ausencias
  AFTER INSERT OR UPDATE OR DELETE ON ausencias
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

COMMENT ON TRIGGER audit_ausencias ON ausencias IS
'Audita automáticamente todos los registros de ausencias y licencias';


-- 5. ROW LEVEL SECURITY PARA TABLA DE AUDITORÍA
-- ============================================================================
-- Solo administradores pueden ver el historial de auditoría.

ALTER TABLE historial_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin ve auditoría"
ON historial_auditoria FOR SELECT
TO authenticated
USING (get_user_rol() = 'administrador');

COMMENT ON POLICY "Solo admin ve auditoría" ON historial_auditoria IS
'Solo administradores pueden consultar el historial de auditoría';


-- 6. FUNCIÓN DE LIMPIEZA DE REGISTROS ANTIGUOS (OPCIONAL)
-- ============================================================================
-- Permite eliminar registros de auditoría mayores a X tiempo.
-- Útil para cumplimiento de retención de datos.

CREATE OR REPLACE FUNCTION limpiar_auditoria_antigua(meses_retencion INT DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  registros_eliminados INTEGER;
BEGIN
  DELETE FROM historial_auditoria
  WHERE timestamp < now() - (meses_retencion || ' months')::INTERVAL;

  GET DIAGNOSTICS registros_eliminados = ROW_COUNT;

  RETURN registros_eliminados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION limpiar_auditoria_antigua(INT) IS
'Elimina registros de auditoría más antiguos que N meses (default: 24 meses)';


-- ============================================================================
-- NOTAS DE USO
-- ============================================================================
--
-- VERIFICACIÓN POST-MIGRACIÓN:
-- 1. Crear un turno → Debe aparecer evento INSERT en auditoría
-- 2. Editar un turno → Debe aparecer evento UPDATE con datos antes/después
-- 3. Eliminar un turno → Debe aparecer evento DELETE con datos anteriores
--
-- CONSULTAS ÚTILES:
--
-- Ver últimos 50 eventos:
-- SELECT * FROM historial_auditoria ORDER BY timestamp DESC LIMIT 50;
--
-- Ver cambios en tabla específica:
-- SELECT * FROM historial_auditoria WHERE tabla = 'turnos' ORDER BY timestamp DESC;
--
-- Ver cambios de usuario específico:
-- SELECT * FROM historial_auditoria WHERE usuario_email = 'admin@eds324.cl';
--
-- Ver solo eliminaciones:
-- SELECT * FROM historial_auditoria WHERE accion = 'DELETE';
--
-- Limpiar registros mayores a 2 años:
-- SELECT limpiar_auditoria_antigua(24);
--
-- ============================================================================
