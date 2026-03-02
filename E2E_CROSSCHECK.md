# E2E CROSSCHECK — Pruebas Cruzadas Móvil → Web

> 3 pruebas obligatorias para verificar que los datos creados en la app móvil aparecen correctamente en la app web y viceversa.

---

## Prerrequisitos

- Sesión activa en la app móvil (React Native) con un usuario del negocio
- Sesión activa en la app web (Angular) con el **mismo negocio**
- Ambas apps apuntan al mismo proyecto Supabase (`qyyhembukflbxjbctuav`)

---

## Test A: Crear Cliente en Móvil → Verificar en Web

### Pasos en Móvil
1. Abrir la app → Ir a **Clientes**
2. Tocar **"Nuevo Cliente"** (o el botón `+`)
3. Llenar:
   - Nombre: `TEST-E2E-Cliente`
   - Teléfono: `5551234567` (10 dígitos)
   - Email: `test@e2e.com` (opcional)
4. Tocar **Guardar**
5. Verificar que aparece en la lista de clientes de la app móvil

### Verificación en Web
1. Abrir la app web → Ir a **Clientes**
2. Buscar `TEST-E2E-Cliente`
3. **Resultado esperado**: El cliente aparece con:
   - Nombre: `TEST-E2E-Cliente`
   - Teléfono: `5551234567`
   - Email: `test@e2e.com`

### Verificación en Supabase (opcional)
```sql
SELECT id, nombre, telefono, email, negocio_id
FROM clientes_bot
WHERE nombre = 'TEST-E2E-Cliente';
```

### ✅ PASS si: el registro aparece en la web con los mismos datos

---

## Test B: Crear Servicio en Móvil → Verificar en Web

### Pasos en Móvil
1. Abrir la app → Ir a **Servicios**
2. Tocar **"Nuevo Servicio"**
3. Llenar:
   - Nombre: `TEST-E2E-Servicio`
   - Precio: `250`
   - Duración: `45` minutos
   - Descripción: `Servicio de prueba E2E`
4. Tocar **Guardar**
5. Verificar que aparece en la lista de servicios de la app móvil

### Verificación en Web
1. Abrir la app web → Ir a **Servicios**
2. Buscar `TEST-E2E-Servicio`
3. **Resultado esperado**: El servicio aparece con:
   - Nombre: `TEST-E2E-Servicio`
   - Precio: `$250`
   - Duración: `45 min`

### Verificación en Supabase (opcional)
```sql
SELECT id, nombre, precio_base, duracion_aprox_minutos, negocio_id
FROM servicios
WHERE nombre = 'TEST-E2E-Servicio';
```

### ✅ PASS si: el registro aparece en la web con precio y duración correctos

---

## Test C: Crear Cita con 2 Servicios en Móvil → Verificar en Web

### Precondición
- Existen al menos 2 servicios activos (pueden ser los de Test B + otro)
- Existe al menos 1 empleado asignado a esos servicios
- Existe al menos 1 cliente (puede ser el de Test A)

### Pasos en Móvil
1. Abrir la app → Ir a **Agenda** → Tocar **"Nueva"**
2. Seleccionar sucursal (si aplica)
3. Seleccionar **2 servicios**:
   - Servicio 1 (ej.: `TEST-E2E-Servicio`, $250, 45min)
   - Servicio 2 (ej.: `Corte de Cabello`, $100, 30min)
4. Seleccionar un **empleado** (solo aparecen los que tienen ambos servicios)
5. Seleccionar un **cliente** (ej.: `TEST-E2E-Cliente`)
6. Establecer **fecha**: (fecha de hoy o mañana)
7. Establecer **hora**: (una hora libre, ej.: `14:00`)
8. Tocar **Guardar**
9. Verificar que aparece la cita en la Agenda del día seleccionado

### Verificación en Web
1. Abrir la app web → Ir a **Agenda/Calendario**
2. Navegar al **mismo día** seleccionado en paso 6
3. **Resultado esperado**:

| Verificación | Esperado |
|--------------|----------|
| ¿Aparece la cita? | Sí, en el día correcto |
| Servicios mostrados | Los mismos 2 servicios seleccionados |
| Total | Suma de precios: $250 + $100 = **$350** |
| Estado | `pendiente` |
| Empleado | El mismo seleccionado |
| Cliente | `TEST-E2E-Cliente` |
| Hora inicio | `14:00` |
| Hora fin | `15:15` (14:00 + 45min + 30min) |

### Verificación en Supabase (opcional)
```sql
-- Verificar la cita
SELECT c.id, c.fecha_hora_inicio, c.fecha_hora_fin, c.estado, c.monto_total,
       cb.nombre as cliente, e.nombre as empleado
FROM citas c
LEFT JOIN clientes_bot cb ON cb.id = c.cliente_id
LEFT JOIN empleados e ON e.id = c.empleado_id
WHERE c.estado = 'pendiente'
ORDER BY c.created_at DESC
LIMIT 1;

-- Verificar los servicios de la cita
SELECT cs.cita_id, s.nombre, cs.precio_actual
FROM citas_servicios cs
JOIN servicios s ON s.id = cs.servicio_id
WHERE cs.cita_id = <ID_DE_LA_CITA>;
```

### ✅ PASS si:
- La cita aparece en la web en el día correcto
- Los 2 servicios se muestran
- El total coincide ($350)
- El estado es `pendiente`
- Empleado y cliente coinciden
- Los horarios (inicio y fin) coinciden

---

## Limpieza Post-Test

Después de verificar los tests, eliminar los datos de prueba:
- Eliminar la cita de Test C (desde la web o móvil)
- Eliminar el servicio `TEST-E2E-Servicio` (si no se necesita)
- Eliminar el cliente `TEST-E2E-Cliente` (si no se necesita)
