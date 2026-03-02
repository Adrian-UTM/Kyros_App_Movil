-- ============================================================
-- RLS MIGRATION — Kyros App
-- Fecha: 2026-02-20
-- ADVERTENCIA: NO EJECUTAR SIN PRUEBAS EN ENTORNO DE DESARROLLO
-- ============================================================

-- ============================================================
-- PASO 1: Helper Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_negocio_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT negocio_id FROM usuarios_perfiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_sucursal_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sucursal_id FROM usuarios_perfiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_rol()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM usuarios_perfiles WHERE id = auth.uid()
$$;

-- ============================================================
-- PASO 2: DROP policy insegura existente
-- ============================================================

DROP POLICY IF EXISTS "Allow realtime select for citas" ON citas;

-- ============================================================
-- PASO 3: ENABLE RLS
-- ============================================================

ALTER TABLE usuarios_perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_bot ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_servicios ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PASO 4: Policies por tabla
-- ============================================================

-- ---- usuarios_perfiles ----
CREATE POLICY "usuarios_perfiles_select_own"
  ON usuarios_perfiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "usuarios_perfiles_update_own"
  ON usuarios_perfiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---- sucursales ----
CREATE POLICY "sucursales_select_negocio"
  ON sucursales FOR SELECT
  USING (negocio_id = get_my_negocio_id());

CREATE POLICY "sucursales_insert_negocio"
  ON sucursales FOR INSERT
  WITH CHECK (negocio_id = get_my_negocio_id());

CREATE POLICY "sucursales_update_negocio"
  ON sucursales FOR UPDATE
  USING (negocio_id = get_my_negocio_id())
  WITH CHECK (negocio_id = get_my_negocio_id());

CREATE POLICY "sucursales_delete_negocio"
  ON sucursales FOR DELETE
  USING (negocio_id = get_my_negocio_id());

-- ---- empleados ----
CREATE POLICY "empleados_select_negocio"
  ON empleados FOR SELECT
  USING (negocio_id = get_my_negocio_id());

CREATE POLICY "empleados_insert_negocio"
  ON empleados FOR INSERT
  WITH CHECK (negocio_id = get_my_negocio_id());

CREATE POLICY "empleados_update_negocio"
  ON empleados FOR UPDATE
  USING (negocio_id = get_my_negocio_id())
  WITH CHECK (negocio_id = get_my_negocio_id());

CREATE POLICY "empleados_delete_negocio"
  ON empleados FOR DELETE
  USING (negocio_id = get_my_negocio_id());

-- ---- servicios ----
CREATE POLICY "servicios_select_negocio"
  ON servicios FOR SELECT
  USING (negocio_id = get_my_negocio_id());

CREATE POLICY "servicios_insert_negocio"
  ON servicios FOR INSERT
  WITH CHECK (negocio_id = get_my_negocio_id());

CREATE POLICY "servicios_update_negocio"
  ON servicios FOR UPDATE
  USING (negocio_id = get_my_negocio_id())
  WITH CHECK (negocio_id = get_my_negocio_id());

CREATE POLICY "servicios_delete_negocio"
  ON servicios FOR DELETE
  USING (negocio_id = get_my_negocio_id());

-- ---- clientes_bot ----
CREATE POLICY "clientes_bot_select_negocio"
  ON clientes_bot FOR SELECT
  USING (negocio_id = get_my_negocio_id());

CREATE POLICY "clientes_bot_insert_negocio"
  ON clientes_bot FOR INSERT
  WITH CHECK (negocio_id = get_my_negocio_id());

CREATE POLICY "clientes_bot_update_negocio"
  ON clientes_bot FOR UPDATE
  USING (negocio_id = get_my_negocio_id())
  WITH CHECK (negocio_id = get_my_negocio_id());

CREATE POLICY "clientes_bot_delete_negocio"
  ON clientes_bot FOR DELETE
  USING (negocio_id = get_my_negocio_id());

-- ---- citas ----
CREATE POLICY "citas_select_negocio"
  ON citas FOR SELECT
  USING (negocio_id = get_my_negocio_id());

CREATE POLICY "citas_insert_negocio"
  ON citas FOR INSERT
  WITH CHECK (negocio_id = get_my_negocio_id());

CREATE POLICY "citas_update_negocio"
  ON citas FOR UPDATE
  USING (negocio_id = get_my_negocio_id())
  WITH CHECK (negocio_id = get_my_negocio_id());

CREATE POLICY "citas_delete_negocio"
  ON citas FOR DELETE
  USING (negocio_id = get_my_negocio_id());

-- ---- citas_servicios ----
-- Indirect via cita ownership
CREATE POLICY "citas_servicios_select"
  ON citas_servicios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM citas
      WHERE citas.id = citas_servicios.cita_id
      AND citas.negocio_id = get_my_negocio_id()
    )
  );

CREATE POLICY "citas_servicios_insert"
  ON citas_servicios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM citas
      WHERE citas.id = citas_servicios.cita_id
      AND citas.negocio_id = get_my_negocio_id()
    )
  );

CREATE POLICY "citas_servicios_delete"
  ON citas_servicios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM citas
      WHERE citas.id = citas_servicios.cita_id
      AND citas.negocio_id = get_my_negocio_id()
    )
  );

-- ---- empleado_servicios ----
-- Indirect via empleado ownership
CREATE POLICY "empleado_servicios_select"
  ON empleado_servicios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM empleados
      WHERE empleados.id = empleado_servicios.empleado_id
      AND empleados.negocio_id = get_my_negocio_id()
    )
  );

CREATE POLICY "empleado_servicios_insert"
  ON empleado_servicios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados
      WHERE empleados.id = empleado_servicios.empleado_id
      AND empleados.negocio_id = get_my_negocio_id()
    )
  );

CREATE POLICY "empleado_servicios_delete"
  ON empleado_servicios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM empleados
      WHERE empleados.id = empleado_servicios.empleado_id
      AND empleados.negocio_id = get_my_negocio_id()
    )
  );

-- ============================================================
-- NOTAS DE TESTING
-- ============================================================
-- 1. Ejecutar en entorno de desarrollo/branch primero
-- 2. Verificar que cada tabla permite SELECT para usuario autenticado de su negocio
-- 3. Verificar que INSERT rechaza si negocio_id no coincide
-- 4. Verificar que UPDATE/DELETE solo afecta registros del negocio del usuario
-- 5. Verificar que citas_servicios y empleado_servicios se acceden correctamente via JOIN
-- 6. Probar con dos usuarios de diferentes negocios: usuario A no debe ver datos de usuario B
-- 7. Verificar que realtime sigue funcionando (las subscripciones filtran por RLS automáticamente)
