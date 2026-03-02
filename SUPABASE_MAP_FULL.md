# SUPABASE MAP FULL — Operaciones Supabase por Módulo

> Proyecto: `qyyhembukflbxjbctuav` | Fecha: 2026-02-20
> Fuente: lectura directa del código React Native (`kyros-react-native`)

---

## Clientes

### `app/(tabs)/clientes.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Lista clientes | `clientes_bot` | SELECT | `id, nombre, telefono, email` | `negocio_id=eq.{negocioId}` | — | Todos | — |
| Lista clientes (sucursal) | `clientes_bot` | SELECT | `id, nombre, telefono, email` | `negocio_id=eq.{negocioId}` + `sucursal_id=eq.{sucursalId}` | — | `sucursal` | — |
| Eliminar cliente | `clientes_bot` | DELETE | — | `id=eq.{id}` | — | Todos | Sin check de citas asociadas (match web) |

### `components/ClienteNuevoModal.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Crear cliente | `clientes_bot` | INSERT | `nombre, telefono, email, negocio_id` | — | — | Todos | No envía `sucursal_id` — cliente queda global |

---

## Servicios

### `app/(tabs)/servicios.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Lista servicios | `servicios` | SELECT | `id, nombre, precio_base, duracion_aprox_minutos, activo, descripcion` | `negocio_id=eq.{negocioId}` | — | `dueño` | — |
| Lista servicios (sucursal) | `servicios` | SELECT | ídem | `negocio_id=eq.{negocioId}` + `or(sucursal_id.eq.{sucursalId},sucursal_id.is.null)` | — | `sucursal` | — |

### `components/ServicioFormModal.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Crear servicio | `servicios` | INSERT | `negocio_id, sucursal_id, nombre, precio_base, duracion_aprox_minutos, descripcion, activo` | — | — | Todos | — |
| Editar servicio | `servicios` | UPDATE | `nombre, precio_base, duracion_aprox_minutos, descripcion` | `id=eq.{id}` | — | Todos | — |
| Eliminar servicio | `servicios` | DELETE | — | `id=eq.{id}` | — | Todos | DELETE físico (match web) |

---

## Empleados

### `app/(tabs)/empleados.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Lista empleados | `empleados` | SELECT | `id, nombre, especialidad, telefono, activo, sucursal_id` | `negocio_id=eq.{negocioId}` | `sucursales(nombre)` | `dueño` | — |
| Lista empleados (sucursal) | `empleados` | SELECT | ídem | + `sucursal_id=eq.{sucursalId}` | `sucursales(nombre)` | `sucursal` | — |
| Eliminar (check) | `citas` | SELECT | `id` | `empleado_id=eq.{id}` + `or(estado.eq.pendiente,estado.eq.confirmada,estado.eq.en_proceso)` + `gte(fecha_hora_inicio, today)` | — | Todos | Bloquea si citas pendientes (match web) |
| Eliminar (cascade) | `empleado_servicios` | DELETE | — | `empleado_id=eq.{id}` | — | Todos | — |
| Eliminar (cascade) | `citas` | DELETE | — | `empleado_id=eq.{id}` | — | Todos | Elimina citas pasadas/canceladas |
| Eliminar | `empleados` | DELETE | — | `id=eq.{id}` | — | Todos | — |

### `components/EmpleadoFormModal.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Form: cargar sucursales | `sucursales` | SELECT | `id, nombre` | `negocio_id=eq.{negocioId}` | — | `dueño` | — |
| Form: cargar servicios | `servicios` | SELECT | `id, nombre` | `negocio_id=eq.{negocioId}` (+ filtro sucursal si rol=sucursal) | — | Todos | — |
| Form: cargar asignados | `empleado_servicios` | SELECT | `servicio_id` | `empleado_id=eq.{id}` | — | Todos | Solo en edición |
| Crear empleado | `empleados` | INSERT | `nombre, especialidad, sucursal_id, negocio_id` | — | — | Todos | — |
| Editar empleado | `empleados` | UPDATE | `nombre, especialidad, sucursal_id, negocio_id` | `id=eq.{id}` | — | Todos | — |
| Upsert servicios (delete) | `empleado_servicios` | DELETE | — | `empleado_id=eq.{id}` | — | Todos | — |
| Upsert servicios (insert) | `empleado_servicios` | INSERT | `empleado_id, servicio_id` | — | — | Todos | — |

---

## Sucursales

### `app/(tabs)/sucursales.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Lista sucursales | `sucursales` | SELECT | `id, nombre, direccion, telefono` | `negocio_id=eq.{negocioId}` | — | Todos | — |
| Eliminar (check citas) | `citas` | SELECT | `id` | `sucursal_id=eq.{id}` + `or(estado.eq.pendiente,...)` + `gte(fecha_hora_inicio, today)` | — | `dueño` | Bloquea si citas pendientes |
| Eliminar (check emps) | `empleados` | SELECT | `id` | `sucursal_id=eq.{id}` | — | `dueño` | **Bloquea si empleados asignados (match web)** |
| Eliminar (cascade) | `citas_servicios` | DELETE | — | `cita_id in (SELECT id FROM citas WHERE sucursal_id=...)` | — | `dueño` | — |
| Eliminar (cascade) | `citas` | DELETE | — | `sucursal_id=eq.{id}` | — | `dueño` | — |
| Eliminar (cascade) | `servicios` | DELETE | — | `sucursal_id=eq.{id}` | — | `dueño` | — |
| Eliminar (cascade) | `clientes_bot` | DELETE | — | `sucursal_id=eq.{id}` | — | `dueño` | — |
| Eliminar (cascade) | `usuarios_perfiles` | DELETE | — | `sucursal_id=eq.{id}` | — | `dueño` | — |
| Eliminar | `sucursales` | DELETE | — | `id=eq.{id}` | — | `dueño` | — |

### `components/SucursalFormModal.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Crear sucursal | `sucursales` | INSERT | `nombre, direccion, telefono, negocio_id` | — | — | `dueño` | — |
| Editar sucursal | `sucursales` | UPDATE | `nombre, direccion, telefono, negocio_id` | `id=eq.{id}` | — | `dueño` | — |

---

## Agenda

### `app/(tabs)/agenda.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Cargar citas | `citas` | SELECT | `id, fecha_hora_inicio, fecha_hora_fin, estado, notas, monto_total, nombre_cliente_manual, empleado_id, sucursal_id, cliente_id` | `negocio_id=eq.{negocioId}` + filtro fecha + `.neq('estado','cancelada')` | `clientes_bot!cliente_id(nombre,telefono)`, `empleados(nombre)`, `sucursales(nombre)`, `citas_servicios(servicio_id, precio_actual, servicios(nombre,precio_base))` | Todos | — |
| Cargar citas (sucursal) | `citas` | SELECT | ídem | + `sucursal_id=eq.{sucursalId}` | ídem | `sucursal` | — |
| Cargar sucursales (filtro) | `sucursales` | SELECT | `id, nombre` | `negocio_id=eq.{negocioId}` | — | `dueño` | — |
| Realtime | `citas` | SUBSCRIBE | `*` | `negocio_id=eq.{negocioId}` | — | Todos | Channel: `agenda-realtime`, cleanup: `removeChannel` |

---

## Nueva Cita

### `app/citas/nueva.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Cargar sucursales | `sucursales` | SELECT | `id, nombre` | `negocio_id=eq.{negocioId}` | — | Todos | — |
| Cargar servicios | `servicios` | SELECT | `id, nombre, precio_base, duracion_aprox_minutos` | `negocio_id=eq.{negocioId}` + `activo=eq.true` | — | Todos | — |
| Cargar clientes | `clientes_bot` | SELECT | `id, nombre, telefono` | `negocio_id=eq.{negocioId}` | — | Todos | — |
| Cargar empleados | `empleados` | SELECT | `id, nombre, sucursal_id` | `negocio_id=eq.{negocioId}` | `empleado_servicios(servicio_id)` | Todos | — |
| Check empalmes | `citas` | SELECT | `id, fecha_hora_inicio, fecha_hora_fin` | `empleado_id=eq.{id}` + `.neq('estado','cancelada')` + rango `or()` | — | Todos | — |
| Crear cita | `citas` | INSERT | `negocio_id, sucursal_id, cliente_id, empleado_id, fecha_hora_inicio, fecha_hora_fin, estado, monto_total` | — | — | Todos | `estado='pendiente'` |
| Crear servicios cita | `citas_servicios` | INSERT | `cita_id, servicio_id, precio_actual` | — | — | Todos | — |

---

## Editar Cita

### `app/citas/[id].tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Cargar cita | `citas` | SELECT | `id, fecha_hora_inicio, fecha_hora_fin, estado, empleado_id, sucursal_id, cliente_id, monto_total, nombre_cliente_manual` | `id=eq.{citaId}` | `clientes_bot!cliente_id(nombre)`, `citas_servicios(servicio_id)` | Todos | — |
| Cargar servicios | `servicios` | SELECT | `id, nombre, precio_base, duracion_aprox_minutos` | `negocio_id=eq.{negocioId}` + `activo=eq.true` | — | Todos | — |
| Cargar empleados | `empleados` | SELECT | `id, nombre, sucursal_id` | `negocio_id=eq.{negocioId}` | `empleado_servicios(servicio_id)` | Todos | — |
| Check empalmes | `citas` | SELECT | `id, fecha_hora_inicio, fecha_hora_fin` | `empleado_id=eq.{id}` + `.neq('estado','cancelada')` + `.neq('id', citaId)` + rango `or()` | — | Todos | Excluye cita actual |
| Actualizar cita | `citas` | UPDATE | `empleado_id, sucursal_id, fecha_hora_inicio, fecha_hora_fin, monto_total` | `id=eq.{citaId}` | — | Todos | — |
| Reemplazar servicios | `citas_servicios` | DELETE | — | `cita_id=eq.{citaId}` | — | Todos | — |
| Reemplazar servicios | `citas_servicios` | INSERT | `cita_id, servicio_id, precio_actual` | — | — | Todos | — |

---

## Acciones de Cita

### `components/CitaActionsModal.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Cambiar estado | `citas` | UPDATE | `estado` | `id=eq.{id}` | — | Todos | Estados: `confirmada`, `en_proceso`, `cancelada` |
| Completar (fetch total) | `citas_servicios` | SELECT | `precio_actual` | `cita_id=eq.{id}` | — | Todos | — |
| Completar (update) | `citas` | UPDATE | `estado, total_pagado, fecha_completado` | `id=eq.{id}` | — | Todos | `total_pagado` = SUM(`precio_actual`) |

---

## Perfil

### `app/(tabs)/perfil.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Cerrar sesión | `auth` | signOut | — | — | — | Todos | — |

---

## `usuarios_perfiles` (AppContext)

### `lib/AppContext.tsx`

| Pantalla | Tabla | Operación | Columnas enviadas | Filtros | Joins | Rol afectado | Riesgo |
|----------|-------|-----------|-------------------|---------|-------|-------------|--------|
| Inicialización | `usuarios_perfiles` | SELECT | `negocio_id, sucursal_id, rol` | `user_id=eq.{auth.uid()}` | — | Todos | Si no existe perfil, app queda sin negocio_id |
