# REPORTE TÉCNICO CONSOLIDADO — Auditoría y Fixes Kyros
> **Fecha**: 2026-02-20
> **Objetivo**: Garantizar paridad técnica, seguridad y consistencia entre Web (Angular) y Móvil (React Native).

---

## 1. SEGURIDAD — Hardening y RLS
Se detectó que RLS estaba **OFF** en todas las tablas, permitiendo acceso cross-tenant si se conocía el ID.

### Mitigación Client-Side (Aplicada)
Se modificaron **13 operaciones** en la lógica del cliente para validar la pertenencia al negocio.
- **Archivos**: `clientes.tsx`, `sucursales.tsx`, `empleados.tsx`, `agenda.tsx`, `citas/[id].tsx`, `ClienteEditModal.tsx`, `ServicioFormModal.tsx`, `SucursalFormModal.tsx`, `EmpleadoFormModal.tsx`, `CitaActionsModal.tsx`.
- **Cambio**: Inserción de `.eq('negocio_id', negocioId)` en todas las mutaciones (UPDATE/DELETE) y lecturas sensibles.

### Mitigación Server-Side (Preparada)
- **Documento**: `RLS_MIGRATION.sql`
- **Contenido**: 3 helper functions (`get_my_negocio_id`, etc.), habilitación de RLS para 8 tablas core y ~30 políticas SQL de acceso basado en `negocio_id` y `rol`.

---

## 2. PARIDAD FUNCIONAL — Citas y Clientes
Se resolvieron discrepancias críticas en el flujo de datos.

### Agenda / Citas
- **Estado Inicial**: Se cambió de `'pendiente_pago'` a `'pendiente'` para coincidir con el comportamiento de la Web al crear citas.
- **Cálculo de Totales**: Al completar una cita desde el móvil (`CitaActionsModal`), ahora se calcula el `total_pagado` sumando los servicios reales y se estampa la `fecha_completado`, evitando discrepancias en reportes financieros de la Web.
- **Realtime**: Se refinó la suscripción en `agenda.tsx` para filtrar por `sucursal_id` en usuarios con rol sucursal (performance y privacidad).

### Clientes
- **Bug de Sucursal**: Se corrigió `ClienteNuevoModal.tsx` para enviar el `sucursal_id` cuando el usuario es de una sucursal. Anteriormente, el cliente se creaba "invisible" para la sucursal porque el móvil filtraba por ese campo pero lo insertaba como `NULL`.

---

## 3. ARQUITECTURA — Paridad de Esquema y Cascadas
Se auditaron las discrepancias de modelado de datos detectadas originalmente.

### Servicios y Junction
- **Hallazgo**: La tabla `servicios_sucursales` (junction) referenciada en el código web **no existe físicamente en la BD**. Ambas plataformas dependen de `servicios.sucursal_id`.
- **Acción**: Se documentó esta paridad en `SERVICIOS_SCOPE.md`; no se requiere código adicional para mantener sincronización.

### Cascadas de Borrado (Integridad)
- **Verificación**: Se confirmó que el móvil replica exactamente las agresivas cascadas de la Web (Angular).
    - **Sucursal**: Borra citas, servicios, clientes y perfiles (usuarios).
    - **Empleado**: Borra todo el historial de citas (incluyendo pasadas y canceladas).
- **Acción**: Documentado en `DELETE_INTEGRITY.md` como comportamiento esperado (parity-compliant).

---

## 4. ROBUSTEZ — Contexto de Aplicación
- **AppContext**: Se agregó el estado `profileMissing` y detección de error.
- **Fallback UI**: Si un usuario se autentica pero no existe su registro en `usuarios_perfiles`, la aplicación ahora muestra una pantalla de error clara con botón **Reintentar**, en lugar de fallar silenciosamente con `negocioId = null`.

---

## DOCUMENTACIÓN TÉCNICA GENERADA (9 Documentos)
1. `SUPABASE_MAP_FULL.md` — Mapa completo de operaciones Supabase/Módulos.
2. `CITA_PARITY_ANALYSIS.md` — Auditoría detallada de estados y lógica de citas.
3. `RLS_SECURITY_CHECK.md` — Auditoría inicial de seguridad (RLS OFF).
4. `E2E_DATA_FLOW.md` — Trazado de flujo de datos Móvil → SQL → Web.
5. `SECURITY_PATCH.md` — Detalle del hardening client-side aplicado.
6. `RLS_MIGRATION.sql` — Script SQL para protección real de la DB.
7. `SERVICIOS_SCOPE.md` — Resolución de duda sobre tablas junction.
8. `CLIENTE_SCOPE.md` — Resumen del fix funcional para clientes de sucursal.
9. `DELETE_INTEGRITY.md` — Comparativa de cascadas Angular vs React Native.
