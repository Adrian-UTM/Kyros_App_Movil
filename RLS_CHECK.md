# RLS CHECK — Row Level Security Audit

> Fecha: 2026-02-20
> Proyecto: KyrosBarber (`qyyhembukflbxjbctuav`)

---

## Estado Actual

> [!CAUTION]
> **TODAS las tablas tienen RLS DESACTIVADO.** Cualquier usuario autenticado con el `anon key` puede leer/escribir cualquier registro sin restricción.

| Tabla | RLS Enabled | Policies Existentes |
|-------|:-----------:|---------------------|
| `usuarios_perfiles` | ❌ NO | Ninguna |
| `sucursales` | ❌ NO | Ninguna |
| `empleados` | ❌ NO | Ninguna |
| `servicios` | ❌ NO | Ninguna |
| `clientes_bot` | ❌ NO | Ninguna |
| `citas` | ❌ NO | 1 (SELECT permissive, `true` — pero RLS OFF, no se aplica) |
| `citas_servicios` | ❌ NO | Ninguna |
| `empleado_servicios` | ❌ NO | Ninguna |

---

## Policies Propuestas

### Función helper: obtener `negocio_id` del usuario actual

```sql
-- Retorna el negocio_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_negocio_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT negocio_id
  FROM public.usuarios_perfiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Retorna el sucursal_id del usuario autenticado (null para dueños)
CREATE OR REPLACE FUNCTION public.get_my_sucursal_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT sucursal_id
  FROM public.usuarios_perfiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Retorna el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT rol
  FROM public.usuarios_perfiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;
```

---

### `usuarios_perfiles`

```sql
ALTER TABLE public.usuarios_perfiles ENABLE ROW LEVEL SECURITY;

-- SELECT: usuario ve solo su propio perfil
CREATE POLICY "users_select_own" ON public.usuarios_perfiles
  FOR SELECT USING (user_id = auth.uid());

-- UPDATE: usuario actualiza solo su propio perfil
CREATE POLICY "users_update_own" ON public.usuarios_perfiles
  FOR UPDATE USING (user_id = auth.uid());

-- INSERT: solo en registro (manejado por trigger/función, no directo)
-- DELETE: no permitido desde client
```

---

### `sucursales`

```sql
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;

-- SELECT: solo sucursales de mi negocio
CREATE POLICY "sucursales_select" ON public.sucursales
  FOR SELECT USING (negocio_id = public.get_my_negocio_id());

-- INSERT: solo dueños
CREATE POLICY "sucursales_insert" ON public.sucursales
  FOR INSERT WITH CHECK (
    negocio_id = public.get_my_negocio_id()
    AND public.get_my_rol() = 'dueño'
  );

-- UPDATE: solo dueños, mismo negocio
CREATE POLICY "sucursales_update" ON public.sucursales
  FOR UPDATE USING (
    negocio_id = public.get_my_negocio_id()
    AND public.get_my_rol() = 'dueño'
  );

-- DELETE: solo dueños, mismo negocio
CREATE POLICY "sucursales_delete" ON public.sucursales
  FOR DELETE USING (
    negocio_id = public.get_my_negocio_id()
    AND public.get_my_rol() = 'dueño'
  );
```

---

### `empleados`

```sql
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;

-- SELECT: mismo negocio (sucursal: solo su branch)
CREATE POLICY "empleados_select" ON public.empleados
  FOR SELECT USING (
    negocio_id = public.get_my_negocio_id()
    AND (
      public.get_my_rol() = 'dueño'
      OR sucursal_id = public.get_my_sucursal_id()
    )
  );

-- INSERT: mismo negocio
CREATE POLICY "empleados_insert" ON public.empleados
  FOR INSERT WITH CHECK (negocio_id = public.get_my_negocio_id());

-- UPDATE: mismo negocio
CREATE POLICY "empleados_update" ON public.empleados
  FOR UPDATE USING (negocio_id = public.get_my_negocio_id());

-- DELETE: mismo negocio
CREATE POLICY "empleados_delete" ON public.empleados
  FOR DELETE USING (negocio_id = public.get_my_negocio_id());
```

---

### `servicios`

```sql
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

-- SELECT: mismo negocio
CREATE POLICY "servicios_select" ON public.servicios
  FOR SELECT USING (negocio_id = public.get_my_negocio_id());

-- INSERT: mismo negocio
CREATE POLICY "servicios_insert" ON public.servicios
  FOR INSERT WITH CHECK (negocio_id = public.get_my_negocio_id());

-- UPDATE: mismo negocio
CREATE POLICY "servicios_update" ON public.servicios
  FOR UPDATE USING (negocio_id = public.get_my_negocio_id());

-- DELETE: mismo negocio
CREATE POLICY "servicios_delete" ON public.servicios
  FOR DELETE USING (negocio_id = public.get_my_negocio_id());
```

---

### `clientes_bot`

```sql
ALTER TABLE public.clientes_bot ENABLE ROW LEVEL SECURITY;

-- SELECT: mismo negocio (sucursal: solo su branch)
CREATE POLICY "clientes_select" ON public.clientes_bot
  FOR SELECT USING (
    negocio_id = public.get_my_negocio_id()
    AND (
      public.get_my_rol() = 'dueño'
      OR sucursal_id = public.get_my_sucursal_id()
      OR sucursal_id IS NULL
    )
  );

-- INSERT: mismo negocio
CREATE POLICY "clientes_insert" ON public.clientes_bot
  FOR INSERT WITH CHECK (negocio_id = public.get_my_negocio_id());

-- UPDATE: mismo negocio
CREATE POLICY "clientes_update" ON public.clientes_bot
  FOR UPDATE USING (negocio_id = public.get_my_negocio_id());

-- DELETE: mismo negocio
CREATE POLICY "clientes_delete" ON public.clientes_bot
  FOR DELETE USING (negocio_id = public.get_my_negocio_id());
```

---

### `citas`

```sql
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- SELECT: mismo negocio (sucursal: solo su branch)
CREATE POLICY "citas_select" ON public.citas
  FOR SELECT USING (
    negocio_id = public.get_my_negocio_id()
    AND (
      public.get_my_rol() = 'dueño'
      OR sucursal_id = public.get_my_sucursal_id()
    )
  );

-- INSERT: mismo negocio
CREATE POLICY "citas_insert" ON public.citas
  FOR INSERT WITH CHECK (negocio_id = public.get_my_negocio_id());

-- UPDATE: mismo negocio
CREATE POLICY "citas_update" ON public.citas
  FOR UPDATE USING (negocio_id = public.get_my_negocio_id());

-- DELETE: mismo negocio
CREATE POLICY "citas_delete" ON public.citas
  FOR DELETE USING (negocio_id = public.get_my_negocio_id());
```

---

### `citas_servicios`

```sql
ALTER TABLE public.citas_servicios ENABLE ROW LEVEL SECURITY;

-- Acceso basado en la cita padre
CREATE POLICY "citas_servicios_select" ON public.citas_servicios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.citas
      WHERE citas.id = citas_servicios.cita_id
        AND citas.negocio_id = public.get_my_negocio_id()
    )
  );

CREATE POLICY "citas_servicios_insert" ON public.citas_servicios
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.citas
      WHERE citas.id = citas_servicios.cita_id
        AND citas.negocio_id = public.get_my_negocio_id()
    )
  );

CREATE POLICY "citas_servicios_delete" ON public.citas_servicios
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.citas
      WHERE citas.id = citas_servicios.cita_id
        AND citas.negocio_id = public.get_my_negocio_id()
    )
  );
```

---

### `empleado_servicios`

```sql
ALTER TABLE public.empleado_servicios ENABLE ROW LEVEL SECURITY;

-- Acceso basado en el empleado padre
CREATE POLICY "emp_servicios_select" ON public.empleado_servicios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.empleados
      WHERE empleados.id = empleado_servicios.empleado_id
        AND empleados.negocio_id = public.get_my_negocio_id()
    )
  );

CREATE POLICY "emp_servicios_insert" ON public.empleado_servicios
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empleados
      WHERE empleados.id = empleado_servicios.empleado_id
        AND empleados.negocio_id = public.get_my_negocio_id()
    )
  );

CREATE POLICY "emp_servicios_delete" ON public.empleado_servicios
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.empleados
      WHERE empleados.id = empleado_servicios.empleado_id
        AND empleados.negocio_id = public.get_my_negocio_id()
    )
  );
```

---

## Notas de Implementación

> [!WARNING]
> Las policies propuestas NO han sido aplicadas. Requieren revisión y pruebas antes de activar en producción.

1. Las funciones helper (`get_my_negocio_id`, `get_my_sucursal_id`, `get_my_rol`) son `SECURITY DEFINER` para acceder a `usuarios_perfiles` incluso con RLS activo.
2. Para `citas_servicios` y `empleado_servicios`, las policies usan `EXISTS` para validar a través de la tabla padre.
3. Activar RLS una tabla a la vez, verificando que la app sigue funcionando.
4. El realtime subscription de `citas` requerirá que la policy SELECT permita acceso para que las notificaciones funcionen.
