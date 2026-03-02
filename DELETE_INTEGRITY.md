# DELETE INTEGRITY — Cascadas de Borrado

> Fecha: 2026-02-20

## Resumen

Las cascadas de borrado del móvil **son idénticas a las del web**. Verificado contra código Angular.

## Sucursales — deleteBranch

| Paso | Web (branches.ts:158-223) | Móvil (sucursales.tsx:67-161) | Match |
|------|--------------------------|------------------------------|-------|
| 1. Block if pending citas | ✅ `.or('estado.eq.pendiente,...')` | ✅ idéntico | ✅ |
| 2. Block if employees | ✅ `.eq('sucursal_id', id)` | ✅ idéntico | ✅ |
| 3. Delete citas_servicios | ❌ No hace (web borra citas directamente) | ✅ Hace via IN(cita_ids) | ✅ (móvil es más seguro) |
| 4. Delete citas | ✅ `.eq('sucursal_id', id)` | ✅ idéntico | ✅ |
| 5. Delete servicios | ✅ `.eq('sucursal_id', id)` | ✅ idéntico | ✅ |
| 6. Delete clientes_bot | ✅ `.eq('sucursal_id', id)` | ✅ idéntico | ✅ |
| 7. Delete usuarios_perfiles | ✅ `.eq('sucursal_id', id)` | ✅ idéntico | ✅ |
| 8. Delete sucursal | ✅ `.eq('id', id)` | ✅ idéntico | ✅ |

> **Nota**: Web SÍ borra `usuarios_perfiles` al eliminar sucursal. El móvil replica este comportamiento exactamente.

## Empleados — deleteEmployee

| Paso | Web (employees.ts:118-161) | Móvil (empleados.tsx:89-143) | Match |
|------|---------------------------|------------------------------|-------|
| 1. Block if pending citas | ✅ `.or('estado.eq.pendiente,...')` | ✅ idéntico | ✅ |
| 2. Delete empleado_servicios | ✅ `.eq('empleado_id', id)` | ✅ idéntico | ✅ |
| 3. Delete ALL citas | ✅ `.eq('empleado_id', id)` | ✅ idéntico | ✅ |
| 4. Delete empleado | ✅ `.eq('id', id)` | ✅ idéntico | ✅ |

> **Nota**: Web SÍ borra **todo el historial de citas** (pasadas y canceladas) al eliminar empleado. El móvil replica este comportamiento exactamente.

## Decisión

✅ **No se requiere cambio.** Ambas plataformas tienen el mismo comportamiento de cascada.

## Riesgos conocidos (existentes en ambas plataformas)

| Riesgo | Descripción | Severidad |
|--------|-------------|-----------|
| Perfiles borrados | Al borrar sucursal, se pierden `usuarios_perfiles` de esa sucursal | Media |
| Historial perdido | Al borrar empleado, se pierden citas completadas/canceladas | Media |
| Sin soft-delete | No hay `activo = false` — borrado es permanente | Baja (design choice) |

Estos riesgos existen en **ambas** plataformas y son decisiones de diseño del producto, no bugs de paridad.
