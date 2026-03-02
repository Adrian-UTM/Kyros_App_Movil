# CITA PARITY — Paridad 1:1 Citas Web ↔ Móvil

> Comparación exhaustiva de la tabla `citas` y `citas_servicios` entre Angular web y React Native móvil.

---

## 1. Estados Exactos

### Estados usados en Web

| Estado | Dónde se asigna | Contexto |
|--------|-----------------|----------|
| `pendiente` | `appointment-dialog.ts:onSubmit` | Estado inicial al crear cita |
| `confirmada` | `calendar.html` (UI badge color) | Mostrado en vista calendario (default en DB: `'confirmada'`) |
| `en_proceso` | `calendar.html` (CSS class) | Mostrado con estilo visual distinto |
| `completada` | `calendar.ts:updateStatus` | Acción manual del usuario + sets `total_pagado` + `fecha_completado` |
| `cancelada` | `calendar.ts:updateStatus` | Acción manual, con refund si `estado_pago='pagado'` |

### Estados usados en Móvil

| Estado | Dónde se asigna | Archivo |
|--------|-----------------|---------|
| `pendiente` | Insert nueva cita | `nueva.tsx:254` ✅ **(CORREGIDO — antes era `pendiente_pago`)** |
| `confirmada` | Botón "Confirmar" | `CitaActionsModal.tsx:90` |
| `en_proceso` | Botón "En Proceso" | `CitaActionsModal.tsx:98` |
| `completada` | Botón "Completar" | `CitaActionsModal.tsx:106` ✅ **(CORREGIDO — ahora sets `total_pagado` + `fecha_completado`)** |
| `cancelada` | Botón "Cancelar Cita" | `CitaActionsModal.tsx:135` |

### Veredicto: ✅ MATCH (después de correcciones)

---

## 2. Columnas de `citas` (DB)

| Columna | Tipo | Web escribe | Móvil escribe | Match |
|---------|------|:-----------:|:-------------:|:-----:|
| `id` | bigint | auto | auto | ✅ |
| `negocio_id` | uuid | ✅ insert | ✅ insert | ✅ |
| `sucursal_id` | bigint | ✅ insert+update | ✅ insert+update | ✅ |
| `empleado_id` | bigint | ✅ insert+update | ✅ insert+update | ✅ |
| `cliente_id` | bigint | ✅ insert+update | ✅ insert | ✅ |
| `nombre_cliente_manual` | text | `null` (explícito) | no enviado (null por default) | ✅ |
| `fecha_hora_inicio` | timestamptz | ✅ | ✅ | ✅ |
| `fecha_hora_fin` | timestamptz | ✅ (calculado) | ✅ (calculado) | ✅ |
| `estado` | text | `'pendiente'` | `'pendiente'` | ✅ |
| `tipo` | text | no enviado | no enviado | ✅ (default: `'cita'`) |
| `auto_cancelada` | boolean | no enviado | no enviado | ✅ (default: `false`) |
| `created_at` | timestamptz | no enviado | no enviado | ✅ (default: `now()`) |
| `telefono` | text | no enviado | no enviado | ✅ |
| `servicio` | text | no enviado | no enviado | ✅ (legacy) |
| `aviso_20min` | boolean | no enviado | no enviado | ✅ |
| `aviso_hora` | boolean | no enviado | no enviado | ✅ |
| `total_pagado` | numeric | ✅ on `completada` | ✅ on `completada` **(CORREGIDO)** | ✅ |
| `fecha_completado` | timestamptz | ✅ on `completada` | ✅ on `completada` **(CORREGIDO)** | ✅ |
| `descripcion` | text | no enviado | no enviado | ✅ |
| `fotos_referencia` | array | no enviado | no enviado | ✅ |
| `estado_pago` | text | no enviado | no enviado | ✅ (default: `'pendiente'`) |
| `stripe_*` | text | no enviado | no enviado | ✅ |
| `monto_total` | numeric | no enviado | ✅ insert+update | ⚠️ |
| `cliente_email` | text | no enviado | no enviado | ✅ |

> [!NOTE]
> **`monto_total`**: El móvil guarda el costo total calculado al crear/editar. El web NO envía `monto_total` al insertar — lo calcula dinámicamente desde `citas_servicios`. Esto no es un error ya que `monto_total` es informativo y ambos flujos producen el mismo resultado visible. No se elimina del móvil porque es útil como cache del total.

---

## 3. Columnas de `citas_servicios` (DB)

| Columna | Tipo | Web | Móvil | Match |
|---------|------|:---:|:-----:|:-----:|
| `id` | bigint | auto | auto | ✅ |
| `cita_id` | bigint | ✅ | ✅ | ✅ |
| `servicio_id` | bigint | ✅ | ✅ | ✅ |
| `precio_actual` | numeric | ✅ (`s.precio_base`) | ✅ (`s.precio_base`) | ✅ |

### Veredicto: ✅ MATCH completo

---

## 4. Comportamiento de Update (status change)

| Acción | Web | Móvil | Match |
|--------|:---:|:-----:|:-----:|
| Completar → `estado` | `completada` | `completada` | ✅ |
| Completar → `total_pagado` | Calcula desde `citas_servicios` | Calcula desde `citas_servicios` **(CORREGIDO)** | ✅ |
| Completar → `fecha_completado` | `new Date().toISOString()` | `new Date().toISOString()` **(CORREGIDO)** | ✅ |
| Cancelar → `estado` | `cancelada` | `cancelada` | ✅ |
| Cancelar → refund (Stripe) | Sí, si `estado_pago='pagado'` | No (feature SaaS, fuera de scope) | N/A |

---

## 5. Correcciones Aplicadas

| Archivo | Antes | Después |
|---------|-------|---------|
| `nueva.tsx:254` | `estado: 'pendiente_pago'` | `estado: 'pendiente'` |
| `CitaActionsModal.tsx:22-55` | Solo `{ estado: newStatus }` | + `total_pagado` + `fecha_completado` on `completada` |
