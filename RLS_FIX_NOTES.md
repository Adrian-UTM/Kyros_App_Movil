# DEBUG DE POLICIES Y NOTAS PARA PRODUCCIÓN

> **Fecha**: 2026-02-20
> **Objetivo**: Proveer un manual de contingencia ante errores RLS en Staging y recomendaciones urgentes de base de datos antes de ir a Producción real.

## 1. Troubleshooting de Errores 403 (Violates Row Level Security)

Si durante el `RLS_TEST_PLAN.md` una pantalla o componente falla al crear/editar o borrar algo, significa que la política `USING` (lectura/eliminación) o `WITH CHECK` (inserciones/actualizaciones) falló o no fue provista.

### A. Fallo en Inserción de Componentes Secundarios (ej. `citas_servicios`)
- **Síntoma**: Al guardar la cita funciona, pero falla el link con los servicios elegidos.
- **Causa**: La política es indirecta (`EXISTS (SELECT 1 FROM citas WHERE...)`). A veces Supabase no resuelve el `EXISTS` instantáneamente en el bloque transaccional del frontend.
- **Fix Propuesto**: Reducir la fricción permitiendo temporeramente inserciones basadas en token y chequeo server, o agregar un campo redundante de `negocio_id` directo en `citas_servicios` y `empleado_servicios`.

### B. Fallo en Cascadas Destructivas (Borrar Sucursal / Borrar Empleado)
- **Síntoma**: Se intenta borrar una sucursal, pero recibimos error 403 o la sucursal desaparece pero la base de datos aborta la transacción internamente.
- **Causa Confirmada en Auditoría**: El cliente intenta ejecutar un `.delete()` físico ordenando a Supabase: *"borra de `usuarios_perfiles` al id de la sucursal X"*. PERO la regla original instalada sobre `usuarios_perfiles` es: `USING (id = auth.uid())` (Privacidad absoluta personal). Un dueño NO PUEDE borrar el registro de otra persona en esa tabla con esa política y RLS lo frenará.
- **Fix Operativo Inmediato (Sobreescribir policy)**:
  ```sql
  -- Permitir a los perfiles de ese negocio borrarse o que un Dueño borre roles menores
  DROP POLICY IF EXISTS "usuarios_perfiles_delete_own" ON usuarios_perfiles;
  CREATE POLICY "usuarios_perfiles_delete_negocio"
    ON usuarios_perfiles FOR DELETE
    USING (negocio_id = get_my_negocio_id());
  ```

---

## 2. Recomendación Crítica (MILESTONE 2: SaaS PRODUCCIÓN)

### El Peligro Legal y Operativo de los Deletes en Cascada
Actualmente la aplicación Angular y React Native está diseñada para borrar el historial completo de ventas, pagos, y asistencias si un empleado es despedido (y se borra del sistema en la App) debido al bloque destructivo de código:

```typescript
    await this.supabase.client.from('citas').delete().eq('empleado_id', empleado.id);
```

En un **SaaS Operativo Productivo**, borrar registros transaccionales es una violación de integridad y corrompe las estadísticas pasadas de los clientes. 

### Acción Requerida (Soft Delete)
**NO IMPLEMENTAR EN ESTA FASE PARA NO ROMPER PARIDAD ACTUAL**. Pero debe ingresar en el Kanban/Backlog obligatoriamente antes de tener la base de clientes estable.

1. **Alterar Tablas**: 
   ```sql
   ALTER TABLE empleados ADD COLUMN activo BOOLEAN DEFAULT TRUE;
   ALTER TABLE sucursales ADD COLUMN activo BOOLEAN DEFAULT TRUE;
   ```
2. **Cambiar Lógica Angular y Móvil (Mutación)**: 
   En vez de ejecutar `delete()`, usar `update({ activo: false })`. 
3. **Cambiar Vistas**:
   Filtrar catálogos para excluir donde `activo = false` (`.eq('activo', true)`).
4. **Respetar Referencias**:
   Esto permite que las "Citas Pasadas" mantengan amarrado su `empleado_id` al empleado que ya no figura en nómina o al servicio que ya no se ofrece, manteniendo intactas las finanzas de Estadísticas del Dashboard.
