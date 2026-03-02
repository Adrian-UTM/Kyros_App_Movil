# CHECKLIST QA — Pruebas Manuales de Paridad Web ↔ Móvil

> Cada test se ejecuta en la app móvil y luego se verifica en la app web (o Supabase Table Editor).

---

## A. Clientes

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| A1 | Crear cliente | Ir a Clientes → Crear → Llenar nombre + teléfono (10+ dígitos) + email opcional → Guardar | Aparece en lista móvil **y** en tabla `clientes_bot` de Supabase / web |
| A2 | Validar teléfono corto | Crear cliente con 5 dígitos de teléfono | Botón Guardar desactivado, error "Mínimo 10 dígitos" |
| A3 | Editar cliente | Seleccionar cliente → Cambiar nombre → Guardar | Nombre actualizado en lista y en Supabase |
| A4 | Eliminar cliente | Tocar icono 🗑️ → Confirmar | Cliente ya no aparece. Row eliminado de `clientes_bot` (DELETE físico) |

---

## B. Servicios

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| B1 | Crear servicio | Ir a Servicios → Nuevo → nombre + precio ≥ 0 + duración ≥ 1 → Guardar | Aparece en lista y en `servicios` de Supabase |
| B2 | Validar precio negativo | Ingresar precio = -50 | Botón Guardar desactivado |
| B3 | Validar duración cero | Ingresar duración = 0 | Botón Guardar desactivado |
| B4 | Eliminar servicio | Editar servicio → Eliminar Servicio → Confirmar | Row eliminado de `servicios` (DELETE físico, no soft-delete) |

---

## C. Empleados

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| C1 | Crear empleado | Nuevo → nombre + especialidad + sucursal + servicios → Guardar | Row en `empleados` + rows en `empleado_servicios` |
| C2 | Editar empleado | Cambiar especialidad y servicios → Guardar | `empleados` actualizado, `empleado_servicios` reconstruida |
| C3 | Eliminar empleado (sin citas pendientes) | Eliminar → Confirmar | Eliminado de `empleados`, `empleado_servicios`, y `citas` pasadas/canceladas |
| C4 | Eliminar empleado (con citas pendientes) | Intentar eliminar empleado con citas estado=pendiente | Bloqueado: "tiene N cita(s) pendiente(s). Reasígnalas primero." |

---

## D. Sucursales

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| D1 | Crear sucursal | Nuevo → nombre + dirección + teléfono (10-15 dígitos) → Guardar | Row en `sucursales` |
| D2 | Validar teléfono | Ingresar 5 dígitos | Botón desactivado, error visible |
| D3 | Eliminar sucursal (sin empleados ni citas) | Eliminar → Confirmar | Branch y datos cascada eliminados |
| D4 | Eliminar sucursal (con empleados) | Intentar eliminar sucursal que tiene empleados asignados | **Bloqueado**: "tiene N empleado(s) asignado(s). Elimínalos o reasígnalos primero." |
| D5 | Eliminar sucursal (con citas pendientes) | Intentar eliminar sucursal con citas activas | **Bloqueado**: "tiene N cita(s) pendiente(s)." |
| D6 | Rol sucursal no ve botones | Iniciar sesión como rol=sucursal → Ir a Sucursales | No aparece botón Agregar, ni íconos edit/delete |

---

## E. Citas / Agenda

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| E1 | Crear cita multi-servicio | Nueva Cita → seleccionar ≥2 servicios + cliente + empleado + fecha/hora → Guardar | Row en `citas` + rows en `citas_servicios`. Precio total = suma precios_base |
| E2 | Filtro empleado por servicios | Seleccionar 2 servicios → ver dropdown empleados | Solo empleados que tengan **todos** esos servicios asignados |
| E3 | Conflicto de horario | Crear cita que empalme con otra existente (mismo empleado, mismo rango) | Alerta de conflicto, no se guarda |
| E4 | Cambiar estado a completada | Ir a Agenda → tocar cita → "Completar" | Estado actualizado a `completada` en Supabase |
| E5 | Cancelar cita | Ir a Agenda → tocar cita → "Cancelar" | Estado = `cancelada` |
| E6 | Editar cita | Ir a cita → Editar → cambiar servicios/hora → Guardar | `citas` y `citas_servicios` actualizados |
| E7 | Realtime | Crear/editar cita desde web → observar móvil | La lista en Agenda se actualiza automáticamente sin refrescar |

---

## F. Cross-Plataforma

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| F1 | Crear en móvil → ver en web | Crear un cliente en app móvil → ir a web | El cliente aparece en la web |
| F2 | Crear en web → ver en móvil | Crear servicio en web → abrir app móvil | El servicio aparece (con recarga/realtime) |
| F3 | Eliminar en web → ver en móvil | Eliminar empleado en web → ver app móvil | El empleado ya no aparece |
