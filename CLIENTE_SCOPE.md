# CLIENTE SCOPE — Clientes y sucursal_id

> Fecha: 2026-02-20

## Bug Identificado

| Plataforma | INSERT `clientes_bot` | Efecto |
|-----------|----------------------|--------|
| Web | `sucursal_id = parseInt(localStorage.getItem('sucursalId'))` si branch user | Cliente asociado a sucursal ✅ |
| Móvil (antes) | Solo `negocio_id` | Cliente queda "global" (sin sucursal) ❌ |
| Móvil (después) | `sucursal_id = sucursalId` si `rol === 'sucursal'` | Cliente asociado a sucursal ✅ |

## Impacto del Bug

Usuario rol `sucursal` crea cliente → lista filtrada por `sucursal_id` no lo mostraba → usuario no veía el cliente recién creado.

## Fix Aplicado

### `components/ClienteNuevoModal.tsx`

```diff
- const { negocioId } = useApp();
+ const { negocioId, sucursalId, rol } = useApp();

  const insertData: any = {
      nombre, telefono, email,
      negocio_id: negocioId
  };
+ if (rol === 'sucursal' && sucursalId) {
+     insertData.sucursal_id = sucursalId;
+ }
```

## Decisión para dueños

Dueños (`rol !== 'sucursal'`) no asignan `sucursal_id` al crear clientes, igual que en web. Los clientes creados por dueños son visibles para todas las sucursales.
