# E2E DATA FLOW — Flujo de Datos Paso a Paso

> Traza exacta de qué tablas toca cada operación y cómo se refleja cross-platform.

---

## A. Crear Cliente en Móvil → Verificar en Web

### Flujo Móvil

```
1. Usuario abre Clientes tab → clientes.tsx
2. Toca "Nuevo Cliente" → abre ClienteNuevoModal.tsx
3. Llena: nombre="Juan Test", telefono="5551234567", email="j@test.com"
4. Toca "Guardar" → handleGuardar()
```

### Operación Supabase

```sql
INSERT INTO clientes_bot (nombre, telefono, email, negocio_id)
VALUES ('Juan Test', '5551234567', 'j@test.com', '{negocioId}')
RETURNING id, nombre, telefono, email;
```

**Tablas tocadas**: solo `clientes_bot` (1 INSERT)

### Cómo aparece en Web

1. Web Angular carga clientes con:
   ```sql
   SELECT * FROM clientes_bot WHERE negocio_id = '{negocioId}';
   ```
2. El nuevo cliente aparece en la lista si ambas apps comparten el mismo `negocio_id`.

### Validaciones aplicadas (móvil)
- `nombre` requerido (no vacío)
- `telefono` solo dígitos, mínimo 10, máximo 15
- `email` opcional

### Posibles fallos
- Si `negocio_id` del móvil difiere del web → el cliente no aparecerá en web. **Esto no debería pasar si ambas sesiones pertenecen al mismo negocio.**
- Si RLS se activa sin la policy correcta → INSERT fallará con `403`.

---

## B. Crear Servicio en Móvil → Verificar en Web

### Flujo Móvil

```
1. Usuario abre Servicios tab → servicios.tsx
2. Toca "Nuevo Servicio" → abre ServicioFormModal.tsx
3. Llena: nombre="Corte Premium", precio=350, duracion=45, descripcion="Corte con lavado"
4. Toca "Guardar" → handleSave()
```

### Operación Supabase

```sql
INSERT INTO servicios (negocio_id, sucursal_id, nombre, precio_base, duracion_aprox_minutos, descripcion, activo)
VALUES ('{negocioId}', '{sucursalId}', 'Corte Premium', 350, 45, 'Corte con lavado', true)
RETURNING *;
```

**Tablas tocadas**: solo `servicios` (1 INSERT)

### Cómo aparece en Web

1. Web carga servicios con:
   ```sql
   SELECT * FROM servicios WHERE negocio_id = '{negocioId}';
   ```
2. El servicio aparece con nombre, precio y duración correctos.

### Dato importante: `sucursal_id`
- Si usuario es rol `dueño`: `sucursal_id` puede ser `null` (servicio global)
- Si usuario es rol `sucursal`: `sucursal_id` se guarda con la sucursal del usuario
- Web usa `servicios_sucursales` (tabla junction) para asignar servicios a sucursales. **El móvil usa `sucursal_id` directo en `servicios`.**
- Esto puede causar que un servicio creado en móvil NO aparezca en la sección de sucursal de la web si la web filtra por `servicios_sucursales`. **Requiere verificación manual.**

---

## C. Crear Cita con 2 Servicios → Verificar en Web

### Flujo Móvil

```
1. Usuario abre Agenda → toca "Nueva"
2. Selecciona sucursal (si aplica)
3. Selecciona 2 servicios:
   - "Corte Cabello" (id=1, $100, 30min)
   - "Barba" (id=2, $80, 15min)
4. Selecciona empleado (filtrado: solo los que tienen ambos servicios)
5. Selecciona cliente
6. Selecciona fecha: 2026-02-21
7. Selecciona hora: 14:00
8. Toca "Guardar" → handleGuardar()
```

### Operaciones Supabase (en orden)

**Paso 1**: Check empalmes
```sql
SELECT id, fecha_hora_inicio, fecha_hora_fin
FROM citas
WHERE empleado_id = {empleadoId}
  AND estado != 'cancelada'
  AND (fecha_hora_inicio < '2026-02-21T14:45:00Z' AND fecha_hora_fin > '2026-02-21T14:00:00Z');
```
Si retorna rows → BLOQUEA con alerta.

**Paso 2**: Insert cita
```sql
INSERT INTO citas (negocio_id, sucursal_id, cliente_id, empleado_id, fecha_hora_inicio, fecha_hora_fin, estado, monto_total)
VALUES ('{negocioId}', {sucursalId}, {clienteId}, {empleadoId},
        '2026-02-21T14:00:00.000Z',
        '2026-02-21T14:45:00.000Z',  -- 14:00 + 30min + 15min
        'pendiente',
        180)  -- $100 + $80
RETURNING id;
```

**Paso 3**: Insert servicios de la cita
```sql
INSERT INTO citas_servicios (cita_id, servicio_id, precio_actual)
VALUES
  ({citaId}, 1, 100),
  ({citaId}, 2, 80);
```

**Tablas tocadas**: `citas` (1 SELECT + 1 INSERT) + `citas_servicios` (1 INSERT de 2 rows)

### Cómo aparece en Web

1. Web carga agenda con:
   ```sql
   SELECT c.*, cb.nombre as cliente_nombre, e.nombre as empleado_nombre,
          cs.servicio_id, cs.precio_actual, s.nombre as servicio_nombre
   FROM citas c
   LEFT JOIN clientes_bot cb ON cb.id = c.cliente_id
   LEFT JOIN empleados e ON e.id = c.empleado_id
   LEFT JOIN citas_servicios cs ON cs.cita_id = c.id
   LEFT JOIN servicios s ON s.id = cs.servicio_id
   WHERE c.negocio_id = '{negocioId}'
     AND c.fecha_hora_inicio >= '{fecha}T00:00:00'
     AND c.fecha_hora_inicio < '{fecha+1}T00:00:00'
     AND c.estado != 'cancelada';
   ```

2. **Verificaciones en web**:

| Campo | Valor esperado | Origen |
|-------|---------------|--------|
| Día | 2026-02-21 | `fecha_hora_inicio` |
| Hora inicio | 14:00 | `fecha_hora_inicio` |
| Hora fin | 14:45 | `fecha_hora_fin` |
| Servicios | "Corte Cabello", "Barba" | JOIN `citas_servicios` → `servicios` |
| Total | $180 | Web calcula: SUM(`cs.precio_actual`) = 100 + 80 |
| Estado | `pendiente` | `citas.estado` |
| Cliente | Nombre del cliente | JOIN `clientes_bot` |
| Empleado | Nombre del empleado | JOIN `empleados` |

### Posibles diferencias visuales
- Web muestra total como SUM dinámico de `citas_servicios.precio_actual`
- Móvil también guarda `monto_total=180` en la row de `citas` como cache
- Ambos muestran el mismo valor: **$180**

---

## D. Cambiar Estado de Cita → Verificar en Web

### Flujo Móvil

```
1. Usuario toca una cita en Agenda → abre CitaActionsModal
2. Toca "Completar" → handleStatusChange('completada')
```

### Operaciones Supabase (en orden)

**Paso 1**: Fetch servicios para calcular total
```sql
SELECT precio_actual
FROM citas_servicios
WHERE cita_id = {citaId};
-- Retorna: [{precio_actual: 100}, {precio_actual: 80}]
```

**Paso 2**: Update cita
```sql
UPDATE citas
SET estado = 'completada',
    total_pagado = 180,  -- SUM(100 + 80)
    fecha_completado = '2026-02-20T15:45:33.000Z'
WHERE id = {citaId};
```

**Tablas tocadas**: `citas_servicios` (1 SELECT) + `citas` (1 UPDATE)

### Cómo aparece en Web

1. Web carga la misma cita y muestra:
   - Estado: `completada` (badge verde)
   - Total cobrado: $180 (leído de `total_pagado`)
   - Fecha completado: visible si la web lo muestra

2. Si el usuario cancela en lugar de completar:
   ```sql
   UPDATE citas SET estado = 'cancelada' WHERE id = {citaId};
   ```
   - No se calcula `total_pagado` (solo se aplica en `completada`)
   - Web muestra el badge rojo de cancelada

### Comparación con Web

| Acción | Web | Móvil | Match |
|--------|-----|-------|:-----:|
| Completar → `estado` | `'completada'` | `'completada'` | ✅ |
| Completar → `total_pagado` | SUM(`precio_actual`) | SUM(`precio_actual`) | ✅ |
| Completar → `fecha_completado` | `new Date().toISOString()` | `new Date().toISOString()` | ✅ |
| Cancelar → `estado` | `'cancelada'` | `'cancelada'` | ✅ |
| Cancelar → refund Stripe | Sí (si pagada) | No implementado | N/A (feature SaaS) |

---

## Resumen de Tablas Tocadas por Flujo

| Flujo | Tablas | Operaciones |
|-------|--------|-------------|
| A. Crear Cliente | `clientes_bot` | 1 INSERT |
| B. Crear Servicio | `servicios` | 1 INSERT |
| C. Crear Cita 2 servicios | `citas` (SELECT+INSERT), `citas_servicios` (INSERT ×2) | 1 SELECT + 2 INSERT |
| D. Completar Cita | `citas_servicios` (SELECT), `citas` (UPDATE) | 1 SELECT + 1 UPDATE |
| D. Cancelar Cita | `citas` (UPDATE) | 1 UPDATE |
