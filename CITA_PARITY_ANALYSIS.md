# CITA PARITY ANALYSIS — Comparación Técnica Web ↔ Móvil

> Fuentes: `kyros-web-final/src/app/pages/dashboard/calendar/` (Angular) vs `kyros-react-native/app/citas/` + `components/CitaActionsModal.tsx` (React Native)

---

## 1. Estados Exactos (strings)

| Estado | Web usa | Dónde (web) | Móvil usa | Dónde (móvil) | Match |
|--------|:-------:|-------------|:---------:|---------------|:-----:|
| `pendiente` | ✅ | `appointment-dialog.ts:590` — insert | ✅ | `nueva.tsx:254` — insert | ✅ |
| `confirmada` | ✅ | `calendar.html:43` — display, DB default | ✅ | `CitaActionsModal.tsx:90` — botón | ✅ |
| `en_proceso` | ✅ | `calendar.html:42` — CSS class | ✅ | `CitaActionsModal.tsx:98` — botón | ✅ |
| `completada` | ✅ | `calendar.ts:353` — updateStatus | ✅ | `CitaActionsModal.tsx:106` — botón | ✅ |
| `cancelada` | ✅ | `calendar.ts:288` — updateStatus | ✅ | `CitaActionsModal.tsx:135` — botón | ✅ |
| `pendiente_pago` | ❌ no existe | — | ❌ eliminado | fue corregido de `nueva.tsx` | ✅ |

**DB Default**: la columna `estado` tiene `DEFAULT 'confirmada'`. Tanto web como móvil sobreescriben con `'pendiente'` al insertar.

---

## 2. Columnas de `citas` — Web vs Móvil

### 2a. INSERT (crear cita)

| Columna | Web (`appointment-dialog.ts:onSubmit`) | Móvil (`nueva.tsx:247-256`) | Match |
|---------|:--------------------------------------:|:---------------------------:|:-----:|
| `negocio_id` | ✅ `this.negocioId` | ✅ `negocioId` | ✅ |
| `sucursal_id` | ✅ `formVal.sucursal_id` | ✅ `selectedSucursalId` | ✅ |
| `fecha_hora_inicio` | ✅ `fechaInicioISO` | ✅ `fechaHoraInicio.toISOString()` | ✅ |
| `fecha_hora_fin` | ✅ `fechaFin` (calculado) | ✅ `fechaHoraFin` (calculado) | ✅ |
| `cliente_id` | ✅ `formVal.cliente_id` | ✅ `clienteId` | ✅ |
| `nombre_cliente_manual` | ✅ `null` (explícito) | ❌ no enviado | ⚠️ Menor: DB acepta null por default |
| `empleado_id` | ✅ `formVal.empleado_id \|\| null` | ✅ `empleadoId` | ✅ |
| `estado` | ✅ `'pendiente'` | ✅ `'pendiente'` | ✅ |
| `monto_total` | ❌ no envía | ✅ `costoTotalBase` | ⚠️ Menor: móvil guarda total como cache |

### 2b. UPDATE (editar cita)

| Columna | Web (`appointment-dialog.ts:onSubmit` edit) | Móvil (`[id].tsx:215-221`) | Match |
|---------|:-------------------------------------------:|:--------------------------:|:-----:|
| `negocio_id` | ✅ envía | ❌ no envía | ⚠️ Menor: no cambia |
| `sucursal_id` | ✅ envía | ✅ envía | ✅ |
| `fecha_hora_inicio` | ✅ envía | ✅ envía | ✅ |
| `fecha_hora_fin` | ✅ envía | ✅ envía | ✅ |
| `cliente_id` | ✅ envía | ❌ no envía | ⚠️ Menor: móvil no permite cambiar cliente en edit |
| `nombre_cliente_manual` | ✅ `null` | ❌ no envía | ⚠️ Menor |
| `empleado_id` | ✅ envía | ✅ envía | ✅ |
| `estado` | ✅ `'pendiente'` (re-set) | ❌ no envía (conserva actual) | ⚠️ Web resetea estado al editar |
| `monto_total` | ❌ no envía | ✅ envía | ⚠️ Menor |

### 2c. UPDATE (cambiar estado)

| Columna | Web (`calendar.ts:351-360`) | Móvil (`CitaActionsModal.tsx:22-55`) | Match |
|---------|:---------------------------:|:------------------------------------:|:-----:|
| `estado` | ✅ `status` | ✅ `newStatus` | ✅ |
| `total_pagado` | ✅ solo si `completada` — calcula desde `citas_servicios` | ✅ solo si `completada` — calcula desde `citas_servicios` | ✅ |
| `fecha_completado` | ✅ `new Date().toISOString()` | ✅ `new Date().toISOString()` | ✅ |

---

## 3. Columnas de `citas_servicios`

| Columna | Web (`appointment-dialog.ts`) | Móvil (`nueva.tsx` / `[id].tsx`) | Match |
|---------|:-----------------------------:|:--------------------------------:|:-----:|
| `cita_id` | ✅ `citaId` | ✅ `cita.id` / `citaId` | ✅ |
| `servicio_id` | ✅ `s.id` | ✅ `s.id` | ✅ |
| `precio_actual` | ✅ `s.precio_base` | ✅ `s.precio_base` | ✅ |

**Flujo**: ambas plataformas hacen DELETE + INSERT al editar (replace strategy).

---

## 4. Cálculo de `fecha_hora_fin`

| Plataforma | Fórmula | Fuente |
|------------|---------|--------|
| Web | `new Date(fecha.getTime() + totalDuration * 60000).toISOString()` | `appointment-dialog.ts:556` |
| Móvil | `new Date(fechaHoraInicio.getTime() + totalMinutos * 60000)` | `nueva.tsx:222`, `[id].tsx:195` |

**`totalDuration`/`totalMinutos`**: ambos calculan como `selectedServices.reduce((acc, s) => acc + s.duracion_aprox_minutos, 0)` con fallback a 30.

**Match**: ✅ Idéntico

---

## 5. Validación de Empalmes

| Aspecto | Web | Móvil | Match |
|---------|:---:|:-----:|:-----:|
| Query tabla | `citas` | `citas` | ✅ |
| Filtro empleado | `empleado_id=eq.{id}` | `empleado_id=eq.{id}` | ✅ |
| Excluir canceladas | `.neq('estado','cancelada')` | `.neq('estado','cancelada')` | ✅ |
| Excluir cita actual (edit) | `excludeCitaId` parameter | `.neq('id', citaId)` | ✅ |
| Rango overlap | `fecha_hora_inicio < endISO AND fecha_hora_fin > startISO` | `and(fecha_hora_inicio.lt.{fin},fecha_hora_fin.gt.{inicio})` | ✅ |
| Bloquea si overlap | Sí, snackbar | Sí, Alert | ✅ |

---

## 6. Diferencias Encontradas

### CRÍTICAS (corregidas en esta sesión)

| # | Diferencia | Impacto | Estado |
|---|-----------|---------|--------|
| 1 | Móvil insertaba `estado='pendiente_pago'`, web usa `'pendiente'` | Cita creada en móvil no aparecía como "pendiente" en web | **CORREGIDO** |
| 2 | Móvil no seteaba `total_pagado`/`fecha_completado` al completar | Web no veía el total ni la fecha de completado | **CORREGIDO** |

### MENORES (no requieren fix)

| # | Diferencia | Impacto | Decisión |
|---|-----------|---------|----------|
| 3 | Móvil envía `monto_total` en insert/update, web no | Sin impacto — es un campo informativo. Web calcula dinámicamente | No fix |
| 4 | Web envía `nombre_cliente_manual: null` explícito, móvil no | Sin impacto — DB default es null | No fix |
| 5 | Web resetea `estado='pendiente'` al editar, móvil conserva el estado actual | Diferencia menor de UX. Editar no debe resetear estado si ya fue confirmada | No fix (móvil es más correcto) |
| 6 | Móvil no permite cambiar `cliente_id` en edit, web sí | Feature gap, no inconsistencia de datos | Fuera de scope |

---

## 7. Cálculo del Total

| Aspecto | Web | Móvil |
|---------|-----|-------|
| ¿Guarda total al crear? | NO (`monto_total` no enviado) | SÍ (`monto_total = costoTotalBase`) |
| ¿Guarda total al completar? | SÍ (`total_pagado` = SUM de `precio_actual`) | SÍ (`total_pagado` = SUM de `precio_actual`) |
| ¿Cómo muestra total en lista? | Calcula dinámico desde `citas_servicios` | Lee `monto_total` guardado |

**Conclusión**: El dato final (`total_pagado`) se calcula igual en ambas plataformas al completar. La diferencia en `monto_total` al crear es de cache y no afecta paridad funcional.
