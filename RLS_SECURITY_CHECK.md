# RLS SECURITY CHECK — Auditoría de Seguridad

> Proyecto: `qyyhembukflbxjbctuav` | Fecha: 2026-02-20
> Método: SQL query directa a `pg_tables` + `pg_policies`

---

## 1. Estado RLS por Tabla

| Tabla | RLS ON | Policies activas | Operaciones expuestas sin protección |
|-------|:------:|:----------------:|--------------------------------------|
| `usuarios_perfiles` | ❌ OFF | 0 | SELECT/INSERT/UPDATE/DELETE — cualquier usuario autenticado puede leer/modificar perfiles de otros |
| `sucursales` | ❌ OFF | 0 | SELECT/INSERT/UPDATE/DELETE — cualquier usuario puede ver/crear/eliminar sucursales de otros negocios |
| `empleados` | ❌ OFF | 0 | SELECT/INSERT/UPDATE/DELETE — acceso cruzado entre negocios |
| `servicios` | ❌ OFF | 0 | SELECT/INSERT/UPDATE/DELETE — acceso cruzado entre negocios |
| `clientes_bot` | ❌ OFF | 0 | SELECT/INSERT/UPDATE/DELETE — datos de clientes de otros negocios visibles |
| `citas` | ❌ OFF | 1 (no aplicada) | SELECT/INSERT/UPDATE/DELETE — citas de otros negocios accesibles |
| `citas_servicios` | ❌ OFF | 0 | SELECT/INSERT/UPDATE/DELETE — sin restricción |
| `empleado_servicios` | ❌ OFF | 0 | SELECT/INSERT/UPDATE/DELETE — sin restricción |

### Policy existente en `citas` (no aplicada)

```
Nombre: "Allow realtime select for citas"
Comando: SELECT
Permissive: Yes
Roles: public
Qual: true (permite todo)
```

**Nota**: Esta policy existe pero RLS está OFF, por lo que **no se aplica**. Cuando se active RLS, esta policy permitiría SELECT a cualquier usuario sin filtro — debe ser reemplazada.

---

## 2. Riesgos en Producción

### CRÍTICO: Acceso cruzado entre negocios

Sin RLS, un usuario autenticado del Negocio A puede:

| Acción | Tabla afectada | Impacto |
|--------|---------------|---------|
| Leer clientes de Negocio B | `clientes_bot` | Fuga de datos personales (nombre, teléfono, email) |
| Leer citas de Negocio B | `citas` | Fuga de agenda y precios |
| Eliminar empleados de Negocio B | `empleados` | Destrucción de datos |
| Crear citas en Negocio B | `citas` | Contaminación de datos |
| Leer `negocio_id` de otros usuarios | `usuarios_perfiles` | Enumeración de negocios |

### ¿Por qué funciona actualmente?

La app móvil filtra por `negocio_id` en el código de la aplicación (client-side). Esto funciona como **filtro de conveniencia**, no como control de seguridad.

Un atacante con:
1. El `SUPABASE_URL` (público, está en el bundle)
2. El `SUPABASE_ANON_KEY` (público, está en el bundle)
3. Un token de sesión (obtenido al registrarse)

...podría hacer queries directas a la API REST de Supabase sin filtro de `negocio_id`.

---

## 3. Pantallas que Dependen de Bypass Accidental

| Pantalla | Filtro client-side | ¿Funciona sin RLS? | Riesgo |
|----------|-------------------|:-------------------:|--------|
| `clientes.tsx` | `.eq('negocio_id', negocioId)` | Sí | Solo muestra datos propios por filtro JS |
| `servicios.tsx` | `.eq('negocio_id', negocioId)` | Sí | Ídem |
| `empleados.tsx` | `.eq('negocio_id', negocioId)` | Sí | Ídem |
| `sucursales.tsx` | `.eq('negocio_id', negocioId)` | Sí | Ídem |
| `agenda.tsx` | `.eq('negocio_id', negocioId)` | Sí | Ídem |
| `nueva.tsx` | `.eq('negocio_id', negocioId)` | Sí | Ídem |
| `[id].tsx` | `.eq('id', citaId)` | Sí | **No filtra por negocio** — podría editar cita de otro negocio si se conoce el ID |
| `CitaActionsModal` | `.eq('id', cita.id)` | Sí | **No filtra por negocio** — podría cambiar estado de cita ajena |

### Acciones Específicas Sin Filtro de Negocio

| Operación | Archivo | Filtro usado | ¿Valida negocio_id? |
|-----------|---------|-------------|:-------------------:|
| DELETE cliente | `clientes.tsx` | `.eq('id', id)` | ❌ |
| DELETE servicio | `ServicioFormModal.tsx` | `.eq('id', id)` | ❌ |
| DELETE empleado | `empleados.tsx` | `.eq('id', id)` | ❌ |
| DELETE sucursal | `sucursales.tsx` | `.eq('id', id)` | ❌ |
| UPDATE cita estado | `CitaActionsModal.tsx` | `.eq('id', id)` | ❌ |
| UPDATE cita (edit) | `[id].tsx` | `.eq('id', citaId)` | ❌ |

**Todas las operaciones de mutación (UPDATE/DELETE) filtran solo por `id`, sin verificar `negocio_id`.** Con RLS desactivado, esto permite que cualquier usuario autenticado modifique datos de otros negocios si conoce el ID numérico del registro.

---

## 4. Policies SQL Propuestas

### Funciones Helper (prerequisito)

```sql
CREATE OR REPLACE FUNCTION public.get_my_negocio_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT negocio_id FROM public.usuarios_perfiles
  WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_sucursal_id()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT sucursal_id FROM public.usuarios_perfiles
  WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_rol()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol FROM public.usuarios_perfiles
  WHERE user_id = auth.uid() LIMIT 1;
$$;
```

### Policies por tabla

```sql
-- ========== usuarios_perfiles ==========
ALTER TABLE public.usuarios_perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own" ON public.usuarios_perfiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "update_own" ON public.usuarios_perfiles FOR UPDATE USING (user_id = auth.uid());

-- ========== sucursales ==========
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_negocio" ON public.sucursales FOR SELECT USING (negocio_id = public.get_my_negocio_id());
CREATE POLICY "insert_dueño" ON public.sucursales FOR INSERT WITH CHECK (negocio_id = public.get_my_negocio_id() AND public.get_my_rol() = 'dueño');
CREATE POLICY "update_dueño" ON public.sucursales FOR UPDATE USING (negocio_id = public.get_my_negocio_id() AND public.get_my_rol() = 'dueño');
CREATE POLICY "delete_dueño" ON public.sucursales FOR DELETE USING (negocio_id = public.get_my_negocio_id() AND public.get_my_rol() = 'dueño');

-- ========== empleados ==========
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_negocio" ON public.empleados FOR SELECT USING (negocio_id = public.get_my_negocio_id());
CREATE POLICY "insert_negocio" ON public.empleados FOR INSERT WITH CHECK (negocio_id = public.get_my_negocio_id());
CREATE POLICY "update_negocio" ON public.empleados FOR UPDATE USING (negocio_id = public.get_my_negocio_id());
CREATE POLICY "delete_negocio" ON public.empleados FOR DELETE USING (negocio_id = public.get_my_negocio_id());

-- ========== servicios ==========
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_negocio" ON public.servicios FOR SELECT USING (negocio_id = public.get_my_negocio_id());
CREATE POLICY "insert_negocio" ON public.servicios FOR INSERT WITH CHECK (negocio_id = public.get_my_negocio_id());
CREATE POLICY "update_negocio" ON public.servicios FOR UPDATE USING (negocio_id = public.get_my_negocio_id());
CREATE POLICY "delete_negocio" ON public.servicios FOR DELETE USING (negocio_id = public.get_my_negocio_id());

-- ========== clientes_bot ==========
ALTER TABLE public.clientes_bot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_negocio" ON public.clientes_bot FOR SELECT USING (negocio_id = public.get_my_negocio_id());
CREATE POLICY "insert_negocio" ON public.clientes_bot FOR INSERT WITH CHECK (negocio_id = public.get_my_negocio_id());
CREATE POLICY "update_negocio" ON public.clientes_bot FOR UPDATE USING (negocio_id = public.get_my_negocio_id());
CREATE POLICY "delete_negocio" ON public.clientes_bot FOR DELETE USING (negocio_id = public.get_my_negocio_id());

-- ========== citas ==========
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;
-- Eliminar policy existente que permite TODO
DROP POLICY IF EXISTS "Allow realtime select for citas" ON public.citas;
CREATE POLICY "select_negocio" ON public.citas FOR SELECT USING (negocio_id = public.get_my_negocio_id());
CREATE POLICY "insert_negocio" ON public.citas FOR INSERT WITH CHECK (negocio_id = public.get_my_negocio_id());
CREATE POLICY "update_negocio" ON public.citas FOR UPDATE USING (negocio_id = public.get_my_negocio_id());
CREATE POLICY "delete_negocio" ON public.citas FOR DELETE USING (negocio_id = public.get_my_negocio_id());

-- ========== citas_servicios ==========
ALTER TABLE public.citas_servicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_via_cita" ON public.citas_servicios FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.citas WHERE citas.id = citas_servicios.cita_id AND citas.negocio_id = public.get_my_negocio_id())
);
CREATE POLICY "insert_via_cita" ON public.citas_servicios FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.citas WHERE citas.id = citas_servicios.cita_id AND citas.negocio_id = public.get_my_negocio_id())
);
CREATE POLICY "delete_via_cita" ON public.citas_servicios FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.citas WHERE citas.id = citas_servicios.cita_id AND citas.negocio_id = public.get_my_negocio_id())
);

-- ========== empleado_servicios ==========
ALTER TABLE public.empleado_servicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_via_empleado" ON public.empleado_servicios FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.empleados WHERE empleados.id = empleado_servicios.empleado_id AND empleados.negocio_id = public.get_my_negocio_id())
);
CREATE POLICY "insert_via_empleado" ON public.empleado_servicios FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.empleados WHERE empleados.id = empleado_servicios.empleado_id AND empleados.negocio_id = public.get_my_negocio_id())
);
CREATE POLICY "delete_via_empleado" ON public.empleado_servicios FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.empleados WHERE empleados.id = empleado_servicios.empleado_id AND empleados.negocio_id = public.get_my_negocio_id())
);
```

> **NO APLICADAS.** Requieren revisión, testing en branch/staging, y verificación de que realtime sigue funcionando.

---

## 5. Impacto en Realtime

Al activar RLS en `citas`, el subscription `postgres_changes` de `agenda.tsx` necesitará que la policy SELECT permita acceso. La policy propuesta (`negocio_id = get_my_negocio_id()`) es compatible con realtime porque Supabase evalúa la policy en el contexto del token JWT del subscriber.

**Prerequisito**: El token JWT del usuario debe incluir claims que permitan resolver `auth.uid()`. Esto ya sucede con `supabase-js` cuando hay una sesión activa.
