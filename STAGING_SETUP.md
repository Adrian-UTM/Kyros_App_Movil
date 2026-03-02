# SETUP STAGING — Guía de Configuración

> **Fecha**: 2026-02-20
> **Objetivo**: Habilitar un entorno sandbox idéntico a producción para testear la activación de RLS sin comprometer clientes reales.

## 1. Configuración de Base de Datos (Supabase Staging)

Asumiendo un proyecto nuevo de Supabase (`kyros-staging`):

1. **Vincular CLI al proyecto de Producción e inicializar**:
   ```bash
   supabase link --project-ref <prod-project-ref>
   ```

2. **Extraer Esquema y Datos de Referencia** (Si aplica):
   ```bash
   supabase db dump --schema public --file schema_prod.sql
   ```
   *Nota*: No copiar datos reales de clientes (citas, clientes bot), solo esquema para mantener limpieza PII, o usar volcado filtrado si es necesario.

3. **Vincular CLI al proyecto Staging y Volcar Esquema**:
   ```bash
   supabase link --project-ref <staging-project-ref>
   supabase db exec --file schema_prod.sql
   ```

4. **Aplicar Reglas de Seguridad (RLS)**:
   Tomar el archivo generado previamente `RLS_MIGRATION.sql` y ejecutarlo directamente en el SQL Editor del proyecto de **Staging**.
   - Esto creará los helpers de funciones.
   - Activará RLS en todas las tablas core.
   - Aplicará las políticas.

## 2. Checklist de Conexión (Variables de Entorno)

Dependiendo de dónde se testeará (local apuntando a staging o build staging dedicado), actualizar los siguientes archivos con la **Supabase URL** y **Anon Key** correspondientes al proyecto de Staging.

### Aplicación Web (Angular)
Actualizar el archivo de entorno en desarrollo o staging.
- **Ruta**: `src/environments/environment.ts`
  ```typescript
  export const environment = {
    production: false,
    supabaseUrl: 'https://[STAGING_REF].supabase.co',
    supabaseKey: 'eyJ...[STAGING_ANON_KEY]...'
  };
  ```

### Aplicación Móvil (React Native / Expo)
El proyecto utiliza un cliente en `lib/supabaseClient.ts`. Lo mejor para escalar es moverlo a un archivo `.env` en la raíz.

- **Ruta**: `.env` (Crear si no existe)
  ```env
  EXPO_PUBLIC_SUPABASE_URL=https://[STAGING_REF].supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...[STAGING_ANON_KEY]...
  ```
- **Ruta**: `lib/supabaseClient.ts` (Modificar si están hardcodeadas)
  ```typescript
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'URL_HARDCODEADA_PREVIA';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'KEY_HARDCODEADA_PREVIA';
  ```
- Reiniciar el bundle de expo con caché limpia: `npx expo start --clear`
