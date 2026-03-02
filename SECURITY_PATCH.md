# SECURITY PATCH — Hardening de Mutaciones

> Fecha: 2026-02-20 | RLS STATUS: OFF (mitigación client-side)

## Resumen

Todas las operaciones DELETE/UPDATE que solo filtraban por `id` ahora incluyen `.eq('negocio_id', negocioId)` para prevenir acceso cross-tenant.

## Archivos Modificados

| # | Archivo | Operación | Filtro agregado |
|---|---------|-----------|-----------------|
| 1 | `app/(tabs)/clientes.tsx` | DELETE `clientes_bot` | `.eq('negocio_id', negocioId)` |
| 2 | `components/ClienteEditModal.tsx` | UPDATE `clientes_bot` | `.eq('negocio_id', negocioId)` + nuevo prop `negocioId` |
| 3 | `components/ServicioFormModal.tsx` | UPDATE `servicios` | `.eq('negocio_id', negocioId)` |
| 4 | `components/ServicioFormModal.tsx` | DELETE `servicios` | `.eq('negocio_id', negocioId)` |
| 5 | `components/SucursalFormModal.tsx` | UPDATE `sucursales` | `.eq('negocio_id', negocioId)` |
| 6 | `components/EmpleadoFormModal.tsx` | UPDATE `empleados` | `.eq('negocio_id', negocioId)` |
| 7 | `app/(tabs)/sucursales.tsx` | DELETE cascade (citas, servicios, clientes, sucursal) | `.eq('negocio_id', negocioId)` × 4 pasos |
| 8 | `app/(tabs)/empleados.tsx` | DELETE `empleados` | `.eq('negocio_id', negocioId)` |
| 9 | `components/CitaActionsModal.tsx` | UPDATE `citas` estado | `.eq('negocio_id', negocioId)` + nuevo prop `negocioId` |
| 10 | `app/citas/[id].tsx` | SELECT + UPDATE `citas` | `.eq('negocio_id', negocioId)` |
| 11 | `app/(tabs)/clientes.tsx` | Pasa `negocioId` a `ClienteEditModal` | N/A (prop passing) |
| 12 | `app/(tabs)/agenda.tsx` | Pasa `negocioId` a `CitaActionsModal` | N/A (prop passing) |

## Tablas sin posibilidad de filtro `negocio_id`

| Tabla | Razón |
|-------|-------|
| `citas_servicios` | FK a `cita_id` — protegida indirectamente si cita está protegida |
| `empleado_servicios` | FK a `empleado_id` — protegida indirectamente |
| `usuarios_perfiles` | PK es `auth.uid()` — ya validado por autenticación |

## ⚠️ Limitación

Esto es mitigación **client-side**. Un atacante con el JWT puede saltarse estas protecciones usando la API REST directamente. La protección real requiere RLS a nivel de base de datos (ver `RLS_MIGRATION.sql`).
