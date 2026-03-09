-- ============================================================================
-- MIGRACIÓN 001: Sistema de Roles y Row Level Security (RLS)
-- ============================================================================
-- Descripción: Implementa sistema de roles (administrador/supervisor) usando
--              Supabase Auth user_metadata y RLS policies para seguridad.
-- Fecha: 2026-03-09
-- ============================================================================

-- 1. FUNCIÓN HELPER PARA OBTENER ROL DEL USUARIO
-- ============================================================================
-- Esta función extrae el rol del usuario desde el JWT de Supabase Auth.
-- Si no tiene rol definido, por defecto retorna 'supervisor'.

CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'rol')::TEXT,
    'supervisor'
  );
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_user_rol() IS 'Extrae el rol del usuario desde user_metadata del JWT';


-- 2. ROW LEVEL SECURITY PARA TABLA TURNOS
-- ============================================================================
-- Permite acceso completo a administradores y supervisores.
-- Nota: Atendedores verían solo sus propios turnos (no implementado aún).

ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Supervisor acceso completo a turnos"
ON turnos FOR ALL
TO authenticated
USING (get_user_rol() IN ('administrador', 'supervisor'))
WITH CHECK (get_user_rol() IN ('administrador', 'supervisor'));

COMMENT ON POLICY "Admin/Supervisor acceso completo a turnos" ON turnos IS
'Administradores y supervisores tienen acceso total a todos los turnos';


-- 3. ROW LEVEL SECURITY PARA TABLA PAGOS_PERSONAL
-- ============================================================================
-- Solo administradores y supervisores pueden ver/modificar pagos.

ALTER TABLE pagos_personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Supervisor acceso completo a pagos"
ON pagos_personal FOR ALL
TO authenticated
USING (get_user_rol() IN ('administrador', 'supervisor'))
WITH CHECK (get_user_rol() IN ('administrador', 'supervisor'));

COMMENT ON POLICY "Admin/Supervisor acceso completo a pagos" ON pagos_personal IS
'Solo admin y supervisor pueden gestionar pagos de personal';


-- 4. ROW LEVEL SECURITY PARA TABLA PERSONAL
-- ============================================================================
-- Lectura: Todos ven personal activo, solo admin ve inactivos/despedidos.
-- Escritura: Solo administradores pueden modificar.

ALTER TABLE personal ENABLE ROW LEVEL SECURITY;

-- Policy de lectura
CREATE POLICY "Lectura personal activo"
ON personal FOR SELECT
TO authenticated
USING (activo = true OR get_user_rol() = 'administrador');

COMMENT ON POLICY "Lectura personal activo" ON personal IS
'Todos ven personal activo. Solo admin ve personal inactivo/despedido';

-- Policy de escritura (INSERT/UPDATE/DELETE)
CREATE POLICY "Solo admin modifica personal"
ON personal FOR INSERT
TO authenticated
WITH CHECK (get_user_rol() = 'administrador');

CREATE POLICY "Solo admin actualiza personal"
ON personal FOR UPDATE
TO authenticated
USING (get_user_rol() = 'administrador')
WITH CHECK (get_user_rol() = 'administrador');

CREATE POLICY "Solo admin elimina personal"
ON personal FOR DELETE
TO authenticated
USING (get_user_rol() = 'administrador');

COMMENT ON POLICY "Solo admin modifica personal" ON personal IS
'Solo administradores pueden insertar nuevos empleados';
COMMENT ON POLICY "Solo admin actualiza personal" ON personal IS
'Solo administradores pueden actualizar datos de empleados';
COMMENT ON POLICY "Solo admin elimina personal" ON personal IS
'Solo administradores pueden eliminar empleados';


-- 5. ROW LEVEL SECURITY PARA TABLA AUSENCIAS
-- ============================================================================
-- Administradores y supervisores pueden gestionar ausencias.

ALTER TABLE ausencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Supervisor acceso completo a ausencias"
ON ausencias FOR ALL
TO authenticated
USING (get_user_rol() IN ('administrador', 'supervisor'))
WITH CHECK (get_user_rol() IN ('administrador', 'supervisor'));

COMMENT ON POLICY "Admin/Supervisor acceso completo a ausencias" ON ausencias IS
'Admin y supervisor gestionan ausencias y licencias';


-- ============================================================================
-- INSTRUCCIONES POST-MIGRACIÓN
-- ============================================================================
--
-- IMPORTANTE: Después de ejecutar esta migración, debes crear usuarios
-- manualmente en Supabase Dashboard:
--
-- 1. Ir a: Authentication > Users > Add User
--
-- 2. Usuario Administrador:
--    - Email: admin@eds324.cl
--    - Password: [Contraseña segura]
--    - User Metadata (JSON):
--      {
--        "rol": "administrador",
--        "nombre": "Administrador Sistema"
--      }
--
-- 3. Usuario Supervisor:
--    - Email: supervisor@eds324.cl
--    - Password: [Contraseña segura]
--    - User Metadata (JSON):
--      {
--        "rol": "supervisor",
--        "nombre": "Supervisor"
--      }
--
-- VERIFICACIÓN:
-- - Probar login con ambos usuarios
-- - Verificar que admin puede acceder a /dashboard/importar
-- - Verificar que supervisor NO puede acceder a /dashboard/importar
--
-- ============================================================================
