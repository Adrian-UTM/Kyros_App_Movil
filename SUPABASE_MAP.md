# SUPABASE MAP — Operaciones por Pantalla/Modal

> Mapa de todas las interacciones con Supabase desde la app React Native.

---

## Clientes (`app/(tabs)/clientes.tsx` + `ClienteNuevoModal.tsx`)

| Operación | Tabla | Columnas | Filtros | Joins |
|-----------|-------|----------|---------|-------|
| SELECT (list) | `clientes_bot` | `id, nombre, telefono, email` | `negocio_id=eq.{negocioId}` + si rol=sucursal: `sucursal_id=eq.{sucursalId}` | — |
| INSERT | `clientes_bot` | `nombre, telefono, email, negocio_id` | — | — |
| DELETE | `clientes_bot` | — | `id=eq.{id}` | — |

---

## Servicios (`app/(tabs)/servicios.tsx` + `ServicioFormModal.tsx`)

| Operación | Tabla | Columnas | Filtros | Joins |
|-----------|-------|----------|---------|-------|
| SELECT (list) | `servicios` | `id, nombre, precio_base, duracion_aprox_minutos, activo, descripcion` | `negocio_id=eq.{negocioId}` + si rol=sucursal: `or(sucursal_id.eq.{sucursalId},sucursal_id.is.null)` | — |
| INSERT | `servicios` | `negocio_id, sucursal_id, nombre, precio_base, duracion_aprox_minutos, descripcion, activo` | — | — |
| UPDATE | `servicios` | `nombre, precio_base, duracion_aprox_minutos, descripcion` | `id=eq.{id}` | — |
| DELETE | `servicios` | — | `id=eq.{id}` | — |

---

## Empleados (`app/(tabs)/empleados.tsx` + `EmpleadoFormModal.tsx`)

| Operación | Tabla | Columnas | Filtros | Joins |
|-----------|-------|----------|---------|-------|
| SELECT (list) | `empleados` | `id, nombre, especialidad, telefono, activo, sucursal_id` | `negocio_id=eq.{negocioId}` + si rol=sucursal: `sucursal_id=eq.{sucursalId}` | `sucursales(nombre)` |
| INSERT | `empleados` | `nombre, especialidad, sucursal_id, negocio_id` | — | — |
| UPDATE | `empleados` | `nombre, especialidad, sucursal_id, negocio_id` | `id=eq.{id}` | — |
| DELETE (check) | `citas` | `id` | `empleado_id=eq.{id}` + `or(estado.eq.pendiente,...)` + `gte(fecha_hora_inicio, today)` | — |
| DELETE (cascade) | `empleado_servicios` | — | `empleado_id=eq.{id}` | — |
| DELETE (cascade) | `citas` | — | `empleado_id=eq.{id}` | — |
| DELETE | `empleados` | — | `id=eq.{id}` | — |
| SELECT (form) | `sucursales` | `id, nombre` | `negocio_id=eq.{negocioId}` | — |
| SELECT (form) | `servicios` | `id, nombre` | `negocio_id=eq.{negocioId}` | — |
| SELECT (form-edit) | `empleado_servicios` | `servicio_id` | `empleado_id=eq.{id}` | — |
| DELETE+INSERT (save) | `empleado_servicios` | `empleado_id, servicio_id` | `empleado_id=eq.{id}` | — |

---

## Sucursales (`app/(tabs)/sucursales.tsx` + `SucursalFormModal.tsx`)

| Operación | Tabla | Columnas | Filtros | Joins |
|-----------|-------|----------|---------|-------|
| SELECT (list) | `sucursales` | `id, nombre, direccion, telefono` | `negocio_id=eq.{negocioId}` | — |
| INSERT | `sucursales` | `nombre, direccion, telefono, negocio_id` | — | — |
| UPDATE | `sucursales` | `nombre, direccion, telefono, negocio_id` | `id=eq.{id}` | — |
| DELETE (check-citas) | `citas` | `id` | `sucursal_id=eq.{id}` + `or(estado.eq.pendiente,...)` + `gte(fecha_hora_inicio, today)` | — |
| DELETE (check-emps) | `empleados` | `id` | `sucursal_id=eq.{id}` | — |
| DELETE (cascade) | `citas_servicios` | — | `cita_id in (...)` | — |
| DELETE (cascade) | `citas` | — | `sucursal_id=eq.{id}` | — |
| DELETE (cascade) | `servicios` | — | `sucursal_id=eq.{id}` | — |
| DELETE (cascade) | `clientes_bot` | — | `sucursal_id=eq.{id}` | — |
| DELETE (cascade) | `usuarios_perfiles` | — | `sucursal_id=eq.{id}` | — |
| DELETE | `sucursales` | — | `id=eq.{id}` | — |

---

## Agenda (`app/(tabs)/agenda.tsx`)

| Operación | Tabla | Columnas | Filtros | Joins |
|-----------|-------|----------|---------|-------|
| SELECT (list) | `citas` | `id, fecha_hora_inicio, fecha_hora_fin, estado, notas, precio_total, ...` | `negocio_id=eq.{negocioId}` + filtro fecha + si rol=sucursal: `sucursal_id=eq.{sucursalId}` | `clientes_bot(nombre,telefono)`, `empleados(nombre)`, `sucursales(nombre)`, `citas_servicios(servicios(nombre,precio_base))` |
| UPDATE (status) | `citas` | `estado` | `id=eq.{id}` | — |
| REALTIME | `citas` | `*` | `negocio_id=eq.{negocioId}` | channel: `agenda-realtime` |

---

## Nueva Cita (`app/citas/nueva.tsx`)

| Operación | Tabla | Columnas | Filtros | Joins |
|-----------|-------|----------|---------|-------|
| SELECT | `sucursales` | `id, nombre` | `negocio_id=eq.{negocioId}` | — |
| SELECT | `servicios` | `id, nombre, precio_base, duracion_aprox_minutos` | `negocio_id=eq.{negocioId}` + `activo=eq.true` | — |
| SELECT | `clientes_bot` | `id, nombre, telefono` | `negocio_id=eq.{negocioId}` | — |
| SELECT | `empleados` | `id, nombre, sucursal_id` | `negocio_id=eq.{negocioId}` | `empleado_servicios(servicio_id)` |
| SELECT (overlap) | `citas` | `id, fecha_hora_inicio, fecha_hora_fin` | `empleado_id=eq.{id}` + rango fecha | — |
| INSERT | `citas` | `negocio_id, sucursal_id, cliente_id, empleado_id, fecha_hora_inicio, fecha_hora_fin, estado, precio_total, notas` | — | — |
| INSERT | `citas_servicios` | `cita_id, servicio_id, precio_servicio` | — | — |

---

## Editar Cita (`app/citas/[id].tsx`)

| Operación | Tabla | Columnas | Filtros | Joins |
|-----------|-------|----------|---------|-------|
| SELECT | `citas` | `*` | `id=eq.{id}` | `citas_servicios(servicio_id)` |
| SELECT | `servicios` | `id, nombre, precio_base, duracion_aprox_minutos` | `negocio_id=eq.{negocioId}` | — |
| SELECT | `empleados` | `id, nombre` | `negocio_id=eq.{negocioId}` | `empleado_servicios(servicio_id)` |
| SELECT (overlap) | `citas` | `id, fecha_hora_inicio, fecha_hora_fin` | `empleado_id=eq.{id}` + `id.neq.{citaId}` + rango fecha | — |
| UPDATE | `citas` | `empleado_id, fecha_hora_inicio, fecha_hora_fin, precio_total` | `id=eq.{id}` | — |
| DELETE+INSERT | `citas_servicios` | `cita_id, servicio_id, precio_servicio` | `cita_id=eq.{id}` | — |

---

## Perfil (`app/(tabs)/perfil.tsx`)

| Operación | Tabla | Columnas | Filtros | Joins |
|-----------|-------|----------|---------|-------|
| signOut | `auth` | — | — | — |
