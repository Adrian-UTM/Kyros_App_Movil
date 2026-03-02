# PLAN DE PRUEBAS E2E (RLS)

> **Fecha**: 2026-02-20
> **Objetivo**: Certificar que la aplicación sigue funcionando nominalmente con RLS activado en nivel estricto, mitigando cross-tenant reading/writing. Todas las pruebas deben ejecutarse apuntando al entorno de **STAGING**.

## Escenarios Básicos y Aislamiento

| # | Prueba | Flujo | Resultado Esperado | Pasa |
|---|--------|-------|--------------------|:---:|
| 1 | **Login y Perfil** | Hacer Iniciar Sesión. Revisar que `AppContext.tsx` obtenga correctamente `negocioId` y `sucursalId`. | Contexto carga. Pantalla tabs es visible sin mostrar "Perfil Faltante". | [ ] |
| 2 | **Listar Catálogos** | Abrir pestañas: Sucursales, Empleados, Servicios, Clientes. | Solo se listan los datos inyectados para ESE negocio (`negocio_id` exacto). | [ ] |
| 3 | **Rol Sucursal vs Dueño** | Entrar con un usuario Rol = "sucursal". | En Clientes/Empleados/Citas solo debe ver información de su respectivo `sucursal_id`. | [ ] |

## Mutaciones (Escritura Restringida por RLS)

| # | Prueba | Flujo | Resultado Esperado | Pasa |
|---|--------|-------|--------------------|:---:|
| 4 | **Crear Cliente** | Registrar cliente nuevo ("Cliente A"). | El INSERT excede éxito en `clientes_bot` validando `WITH CHECK (negocio_id = ...)`. | [ ] |
| 5 | **Crear Servicio** | Crear servicio nuevo en tab "Servicios". | Se guarda y se asocia a la sucursal esperada (o vacío si es Dueño global). | [ ] |
| 6 | **Borrar/Editar Servicio** | Cambiar el nombre / borrar el servicio recién creado. | Ocurre con éxito sin fallar por Violation 403. | [ ] |

## Flujo Core: Citas (Relaciones Complejas)

| # | Prueba | Flujo | Resultado Esperado | Pasa |
|---|--------|-------|--------------------|:---:|
| 7 | **Crear Cita E2E** | Crear cita nueva, seleccionar cliente, empleado y **agregar 2 servicios**. | La cita y **ambos** registros de `citas_servicios` se insertan correctamente evaluando el Constraint indirecto. | [ ] |
| 8 | **Editar Cita** | Cambiar fecha o empleado de la cita vía `[id].tsx`. | Update es exitoso. Se rehacen los `citas_servicios` sin fallar. | [ ] |
| 9 | **Estado Cita** | En Agenda, abrir Acciones Rápidas y poner estado "Completada". | Update ocurre con éxito; se registra `fecha_completado` y total. | [ ] |
| 10 | **Cancelar Cita** | En Agenda, cancelar la misma cita. | Update es exitoso. | [ ] |

## Integración y Destrucción

| # | Prueba | Flujo | Resultado Esperado | Pasa |
|---|--------|-------|--------------------|:---:|
| 11 | **Realtime Suscripción** | Mantener celular en vista Agenda. Cambiar una cita usando la Web (Angular). | La cita cambia de color/estado en la app móvil casi instantáneamente de modo push. | [ ] |
| 12 | **Deletes y Cascadas** | *Crítico:* Desde Web o Móvil (rol dueño), **eliminar un empleado** usado en la cita de la prueba 7. | Todos los cascadas emiten *success*. No da *Violates Row Level Security Rule* en el trigger de `.delete()` intermedio. | [ ] |
