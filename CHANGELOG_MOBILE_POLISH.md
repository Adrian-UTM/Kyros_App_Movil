# Mobile Polish Sprint

## Bugs corregidos

### 1. Agenda: filtros no reaccionaban al tocar
- Bug: `Todas / Próximas / Completadas` no actualizaban la lista hasta mover la fecha.
- Causa: el filtro solo afectaba marcas del calendario y además `fetchMonthMarks()` se disparaba con el valor anterior de `calendarFilter`.
- Fix aplicado:
  - se separó el render de lista con `filteredCitas`
  - el filtro ahora actualiza la lista inmediatamente sin cambiar fecha
  - las marcas del calendario se recalculan por efecto al cambiar mes/filtro

### 2. Agenda: colores del calendario inconsistentes entre claro/oscuro
- Bug: números del calendario, labels y días marcados se perdían o tenían mal contraste.
- Causa: mezcla de colores hardcodeados y selección/today sin composición consistente.
- Fix aplicado:
  - se centralizaron colores desde `useKyrosPalette`
  - se corrigieron `dayTextColor`, `textSectionTitleColor`, `textDisabledColor`, `today`, `selected`
  - se ajustaron marcas para `próximas` y `completadas` con contraste estable

### 3. DatePicker/TimePicker con error de `theme` inexistente
- Bug: en móvil aparecía error tipo `Property 'theme' doesn't exist`.
- Causa: modales internos de fecha/hora usaban `theme.colors` sin declarar `useTheme()`.
- Fix aplicado:
  - se agregó `useTheme()` y paleta consistente en modales de:
    - `app/citas/nueva.tsx`
    - `app/citas/[id].tsx`
    - `app/(tabs)/perfil.tsx`

### 4. Login/registro dependían del tema interno de la app
- Bug: el login cambiaba con el toggle interno y no con el tema real del teléfono.
- Causa: login y registro usaban la paleta interna persistida.
- Fix aplicado:
  - se creó `useSystemKyrosPalette()`
  - login y registro ahora respetan solo `light/dark` del sistema
  - Expo quedó en `userInterfaceStyle: "automatic"`

### 5. Acciones visuales inconsistentes
- Bug: editar/eliminar/activo/inactivo tenían colores distintos entre pantallas.
- Causa: múltiples colores hardcodeados por pantalla.
- Fix aplicado:
  - se extendió `useKyrosPalette` con tokens `info/success/warning/danger`
  - se unificaron acciones en:
    - agenda
    - clientes
    - empleados
    - servicios

### 6. Tab bar móvil amontonada
- Bug: tabs cortadas y poco legibles en móvil real.
- Causa: demasiadas tabs visibles y espaciado sin safe area.
- Fix aplicado:
  - se ajustó altura, padding inferior y labels de tabs
  - en móvil se abreviaron labels
  - `Sucursales` se ocultó de la barra inferior móvil para evitar saturación
  - se dejó acceso a `Sucursales` desde `Perfil` para dueño

### 7. Campana sin interacción
- Bug: el ícono de notificaciones no hacía nada.
- Causa: solo era decorativo.
- Fix aplicado:
  - se conectó a un modal funcional con feedback real
  - muestra el estado del permiso del sistema
  - explica el estado actual y orienta al usuario sobre permisos/bandeja
  - si el permiso está desactivado permite abrir ajustes del sistema
  - en `Perfil > Notificaciones` también se abrió acceso real a ajustes

### 8. Perfil/estadísticas del dueño no refrescaban confiablemente
- Bug: el dueño podía ver tarjetas/estadísticas viejas o sin datos claros al volver a la pantalla.
- Causa: faltaba refresco confiable al reenfocar y no había resumen real en perfil.
- Fix aplicado:
  - se agregó refresco con `useFocusEffect`
  - se agregó `Resumen del Negocio` en perfil con datos reales:
    - sucursales
    - equipo
    - servicios
    - citas de hoy
    - ingresos del mes
  - se mejoró contraste visual de controles y tarjetas visibles

### 9. Branding y build no listos para app instalada real
- Bug: el proyecto seguía pareciendo flujo de desarrollo y no release móvil.
- Causa:
  - sin `eas.json`
  - splash/config no diferenciaban claro/oscuro correctamente
  - tema de Expo forzado a claro
- Fix aplicado:
  - se agregó `eas.json`
  - se corrigió `app.json` para standalone móvil
  - splash claro/oscuro y notificaciones Android configuradas
  - se añadió `BrandedLogo` para mejor visibilidad del branding en claro/oscuro
  - el `adaptiveIcon` Android ahora usa el asset foreground correcto
  - se corrigió el deep link de recuperación de contraseña a `kyrosreactnative://`

### 10. Notificaciones podían duplicarse
- Bug: una misma actualización podía disparar avisos repetidos.
- Causa: la deduplicación usaba `Date.now()`, así que cada evento se consideraba distinto.
- Fix aplicado:
  - se cambió la llave de deduplicación a `eventType + cita + estado + commit_timestamp`
  - se agregó guard para no ejecutar el flujo en web

### 11. Warnings finales de lint
- Bug: el proyecto todavía arrastraba warnings de hooks/imports/variables sin usar.
- Causa: imports duplicados, dependencias de hooks incompletas y helpers que ya no se usaban.
- Fix aplicado:
  - se limpiaron imports y variables muertas
  - se estabilizaron loaders con `useCallback`
  - se reordenaron efectos para que dependan de callbacks válidos
  - `npx expo lint` quedó sin warnings ni errores

### 12. Ajuste responsive para teléfono y tableta
- Bug: la UI estaba más pensada para web angosta y podía verse rígida en tabletas o teléfonos compactos.
- Causa: anchos/paddings fijos y modales sin límite responsivo compartido.
- Fix aplicado:
  - se creó `useResponsiveLayout()`
  - `KyrosScreen`, `KyrosSelector` y modales principales ahora limitan ancho y se centran mejor en tabletas
  - la tab bar adapta tamaño/padding para teléfonos compactos y pantallas grandes
  - formularios críticos de citas se ajustan mejor en pantallas pequeñas

### 13. Branding oficial claro integrado
- Bug: el ícono instalado seguía usando una variante oscura distinta a la referencia oficial clara.
- Causa: `icon.png` y `favicon.png` apuntaban a la versión oscura heredada.
- Fix aplicado:
  - se generó el set claro oficial:
    - `icon-light.png`
    - `logo-mark-light.png`
    - `android-icon-foreground-light.png`
  - Expo ahora usa ese branding claro para icono principal, favicon y adaptive icon

## Build real

### APK instalable
- Comando: `eas build -p android --profile preview`
- Resultado esperado: APK interna instalable sin depender de laptop ni dev server

### Release real
- Comando: `eas build -p android --profile production`
- Resultado esperado: AAB de release para distribución/publicación

### Lo único que aún necesitas fuera del código
- sesión iniciada en Expo/EAS
- credenciales Android de firma cuando EAS las solicite

## Checklist manual corto

- [ ] Agenda: tocar `Todas`, `Próximas`, `Completadas` y verificar cambio inmediato sin mover fecha
- [ ] Agenda: validar calendario en tema claro y oscuro
- [ ] Agenda: verificar día seleccionado, hoy, días de otro mes y labels de semana
- [ ] Tabs: revisar que no se corten labels en Android real
- [ ] Login: cambiar tema del teléfono y confirmar que login/registro responden al sistema
- [ ] Perfil dueño: entrar/salir y confirmar refresco visual y acceso a `Sucursales`
- [ ] Estadísticas: entrar/salir y validar refresh de datos
- [ ] Campana: tocar y verificar modal funcional
- [ ] Branding: revisar icono instalado, splash y logo en login/header
- [ ] Build: generar `preview` o `production` con EAS y probar instalación sin laptop
