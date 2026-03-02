# PARIDAD Web (Angular) vs Móvil (React Native)

> Fuente de verdad: `kyros-web-final/src/app/`
> Tabla de clientes: `clientes_bot` (en ambos)

## Resumen de Paridad

| Módulo | Web | Móvil | Gap | Acción |
|---|---|---|---|---|
| **Login** | ✅ `pages/auth/login` | ✅ `app/index.tsx` | Ninguno | — |
| **Register** | ✅ `pages/auth/register` | ✅ `app/register.tsx` | Ninguno | — |
| **AppContext / Auth Guard** | ✅ `AuthService` + `authGuard` | ✅ `AppContext` + `_layout.tsx` | Ninguno | — |

---

### CLIENTES (`clientes_bot`)

| Función | Web (`clients.ts` + `client-dialog.ts`) | Móvil (`clientes.tsx` + modals) | Gap | Acción |
|---|---|---|---|---|
| Lista + búsqueda | ✅ tabla con nombre, telefono, sucursal | ✅ lista con búsqueda local | Falta columna sucursal en móvil | Agregar |
| Crear | ✅ dialog: nombre (req), telefono (req), sucursal_id auto | ✅ `ClienteNuevoModal` (nombre, telefono, email) | Falta: sucursal_id auto para rol sucursal | Agregar lógica sucursal_id |
| Editar | ✅ mismo dialog en modo edit | ✅ `ClienteEditModal` | Verificar campos iguales | Revisar |
| Eliminar | ✅ DELETE real con confirm | ❌ No existe | **Falta completo** | Implementar delete con confirm |
| Filtro por sucursal (rol sucursal) | ✅ `query.eq('sucursal_id', ...)` | ❌ No filtra | **Falta** | Agregar filtro sucursal_id |

---

### SERVICIOS (`servicios`)

| Función | Web (`services.ts` + `service-dialog.ts`) | Móvil (`servicios.tsx` + `ServicioFormModal`) | Gap | Acción |
|---|---|---|---|---|
| Lista | ✅ cards con nombre, precio, duración, sucursal | ✅ lista con nombre, precio, duración | Falta columna sucursal | Agregar |
| Crear | ✅ nombre, descripcion, imagen_url, precio, duración, sucursales_ids (multi-select) | ✅ nombre, descripcion, precio, duración | Falta: imagen_url, sucursales_ids multi-select | Agregar campos |
| Editar | ✅ mismo dialog + carga sucursales asignadas | ✅ mismo modal | Falta: imagen, sucursales | Agregar |
| Eliminar | ✅ DELETE real con confirm | ✅ DELETE real con confirm | Verificar | — |
| Filtro sucursal (rol sucursal) | ✅ `or(sucursal_id.eq.X, sucursal_id.is.null)` | ❌ No filtra | **Falta** | Agregar filtro |
| Junction `servicios_sucursales` | ✅ upsert en junction table | ❌ No existe | **Falta** | Implementar |
| Upload imagen | ✅ Supabase storage `servicios` bucket | ❌ No existe | **Falta** (skip para MVP) | Posponer |

---

### EMPLEADOS (`empleados`)

| Función | Web (`employees.ts` + `employee-dialog.ts`) | Móvil (`empleados.tsx`) | Gap | Acción |
|---|---|---|---|---|
| Lista | ✅ tabla: nombre, especialidad, sucursal | ✅ lista: nombre, telefono | Falta campo `especialidad` y `sucursal` | Agregar |
| Crear | ✅ nombre, especialidad (req), sucursal_id (req, selector o auto), servicios_ids multi-select | ❌ Botón vacío `onPress={() => {}}` | **Falta completo** | Implementar EmpleadoFormModal |
| Editar | ✅ mismo dialog con carga servicios | ❌ No existe | **Falta completo** | Implementar |
| Eliminar | ✅ DELETE real + check citas pendientes + cascade (empleado_servicios) | ❌ No existe | **Falta completo** | Implementar |
| Filtro sucursal (rol sucursal) | ✅ `query.eq('sucursal_id', ...)` | ❌ No filtra | **Falta** | Agregar |
| Subscription limit check | ✅ Verifica `limite_empleados_por_sucursal` | ❌ No existe | **Falta** | Implementar |
| Junction `empleado_servicios` | ✅ upsert en junction table | ❌ No existe | **Falta** | Implementar |

---

### SUCURSALES (`sucursales`)

| Función | Web (`branches.ts` + `branch-dialog.ts`) | Móvil (`sucursales.tsx`) | Gap | Acción |
|---|---|---|---|---|
| Lista | ✅ tabla: nombre, telefono, direccion | ✅ lista: nombre, direccion | Ok | — |
| Crear | ✅ nombre, direccion, telefono, cuenta_email, cuenta_password + auth user creation | ❌ Botón vacío `onPress={() => {}}` | **Falta completo** | Implementar SucursalFormModal |
| Editar | ✅ mismo dialog | ❌ No existe | **Falta completo** | Implementar |
| Eliminar | ✅ DELETE real + cascade checks (citas, empleados, servicios, clientes, usuarios_perfiles) | ❌ No existe | **Falta completo** | Implementar |
| Subscription limit check | ✅ `checkBranchLimit()` | ❌ No existe | **Falta** | Implementar |
| Horarios (`branch-hours-dialog`) | ✅ CRUD en `horarios_sucursal` | ❌ No existe | **Falta completo** | Implementar |
| Ocultar para rol sucursal | ✅ Solo dueño ve branches | ❌ No distingue | **Falta** | Ocultar tab o deshabilitar |

---

### AGENDA / CALENDARIO (`citas`)

| Función | Web (`calendar.ts` + dialogs) | Móvil (`agenda.tsx`) | Gap | Acción |
|---|---|---|---|---|
| Calendar picker | ✅ Mat Datepicker (mes, día, navegación) | ✅ Calendar strip | Funcional | — |
| Lista de citas del día | ✅ cards: cliente, servicios, empleado, hora, precio, estado | ✅ cards similares | Funcional | — |
| Selector de sucursal (dueño) | ✅ BranchSelectorDialog | ✅ Dropdown en agenda | Funcional | — |
| Suscripción realtime | ✅ `postgres_changes` en citas | ❌ No existe | **Falta** | Agregar realtime subscription |
| Crear cita desde calendario | ✅ AppointmentDialog (completo) | ✅ Navega a `citas/nueva` | Diferente UX, misma función | — |
| Status transitions | ✅ Confirmar/Completar/Cancelar con dialog | ✅ `CitaActionsModal` | Funcional | Verificar lógica total_pagado |
| Appointment details dialog | ✅ `AppointmentDetailsDialog` | ❌ No existe | **Falta** | Implementar vista detalle |
| Payment refund flow | ✅ edge function refund | ❌ No aplica en móvil por ahora | Skip | Posponer |
| Editar cita | ✅ re-abre AppointmentDialog con datos | ❌ Placeholder en `citas/[id].tsx` | **Falta** | Implementar pantalla editar cita |
| Eliminar cita | ✅ (implícito via cancelar) | ✅ (via cancelar en CitaActionsModal) | Funcional | — |

---

### NUEVA CITA (`citas/nueva.tsx`)

| Función | Web (`appointment-dialog.ts` + `booking.service.ts`) | Móvil (`citas/nueva.tsx`) | Gap | Acción |
|---|---|---|---|---|
| Seleccionar cliente (autocomplete) | ✅ autocomplete + crear nuevo inline | ✅ lista + crear nuevo modal | Diferente UX, funcion similar | — |
| Seleccionar sucursal (dueño) | ✅ dropdown | ✅ Picker | Funcional | — |
| Multi-select servicios | ✅ multi-select chips | ✅ Chip multi-select | Funcional | — |
| Seleccionar empleado | ✅ dropdown, filtrado por sucursal & servicios (empleado_servicios) | ✅ dropdown, filtrado por sucursal | Falta: filtro por empleado_servicios | Agregar |
| Date/time picker | ✅ datepicker + time dropdown | ✅ DateTimePicker | Funcional | — |
| Validación conflicto horario | ✅ `checkAvailability()` client-side + server query | ✅ `isTimeOverlap()` local | Funcional (ambos validan) | — |
| Branch hours validation | ✅ `validateBranchHours()` | ❌ No valida horarios sucursal | **Falta** | Agregar |
| Insert cita + citas_servicios | ✅ | ✅ | Funcional | — |
| Calculate total & duration | ✅ | ✅ | Funcional | — |

---

### PERFIL

| Función | Web (`profile/`) | Móvil (`perfil.tsx`) | Gap | Acción |
|---|---|---|---|---|
| Ver datos perfil | ✅ | ✅ (básico) | Verificar campos | Revisar |
| Cerrar sesión | ✅ | ✅ | Funcional | — |
| Plan / Suscripción dentro de perfil | ✅ enlazado | ✅ tab separado `suscripcion.tsx` | Diferente ubicación | Mover a perfil si se desea |

---

### ESTADÍSTICAS

| Función | Web (`statistics/`) | Móvil (`estadisticas.tsx`) | Gap | Acción |
|---|---|---|---|---|
| Dashboard estadísticas | ✅ | ⚠️ Existe pero verificar contenido | Revisar | Verificar |

---

### MÓDULOS SOLO WEB (NO replicar en MVP móvil)

| Módulo | Motivo |
|---|---|
| Chatbot (`pages/chatbot`) | Flujo web-only para clientes |
| Reception (`pages/reception`) | Vista recepción web |
| Onboarding (`pages/onboarding`) | Flujo primer uso web |
| Stripe Payment flow | Pagos web-only |
| Image upload (servicios) | Complejidad alta, posponer |

---

## PRIORIDADES DE IMPLEMENTACIÓN

### 🔴 Crítico (Fase 2 — Catálogos CRUD)
1. **Empleados**: Crear/Editar/Eliminar (con EmpleadoFormModal)
2. **Sucursales**: Crear/Editar/Eliminar (con SucursalFormModal)
3. **Clientes**: Agregar DELETE
4. **Filtro sucursal_id** en todas las pantallas para rol `sucursal`

### 🟡 Importante (Fase 3 — Agenda)
5. **Editar Cita** (`citas/[id].tsx`)
6. **Detalles Cita** (modal con info completa)
7. **Realtime subscription** en agenda
8. **Filtro empleado por servicios** en nueva cita

### 🟢 Mejoras (Post-MVP)
9. Horarios sucursal (CRUD)
10. Branch hours validation en nueva cita
11. Subscription limit checks
12. Junction tables (servicios_sucursales, empleado_servicios)
13. Image upload para servicios
