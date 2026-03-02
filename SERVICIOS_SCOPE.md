# SERVICIOS SCOPE — Paridad Servicios por Sucursal

> Fecha: 2026-02-20

## Hallazgo

| Aspecto | Web (Angular) | Móvil (React Native) | BD |
|---------|--------------|---------------------|-----|
| Tabla principal | `servicios.sucursal_id` | `servicios.sucursal_id` | ✅ Columna existe |
| Junction table | `servicios_sucursales` (try/catch, fail silently) | No usa | ❌ **Tabla NO existe en BD** |

## Evidencia

### SQL directo a pg_tables
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE '%servicio%';
-- Resultado: servicios, citas_servicios, empleado_servicios
-- NO existe servicios_sucursales
```

### Código Angular (service-dialog.ts:248-270)
```typescript
// Handle Junction Table (Non-blocking)
try {
  await this.supabase.client
    .from('servicios_sucursales')  // ← tabla que no existe
    .delete()
    .eq('servicio_id', serviceId);
  // ...
} catch (junctionError) {
  console.warn('Error updating branch assignments (Table might be missing):', junctionError);
  // We do NOT throw here, so the dialog still closes.
}
```

El web intenta usar la junction pero **falla silenciosamente**. El servicio se guarda con `sucursal_id` directo.

## Decisión

**✅ No se requiere cambio.** Ambas plataformas usan `servicios.sucursal_id` como el mecanismo funcional real. El código junction en web es dead code.

## Flujo real en ambas plataformas

1. INSERT/UPDATE `servicios` con `sucursal_id = X`
2. Filtro en listados: `.eq('sucursal_id', sucursalId)` para rol sucursal
3. Dueños ven todos los servicios del negocio: `.eq('negocio_id', negocioId)`
