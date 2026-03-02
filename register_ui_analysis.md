# Análisis UI/UX: Register (Angular vs React Native)

Este documento resume el análisis de la pantalla de Registro del proyecto Angular (`Kyr0s-main`) para su replicación en React Native.

## 1. Estilos Generales
*   **Fondo de pantalla**: `#f5f5f5` (Gris muy claro)
*   **Contenedor**: Centrado vertical y horizontalmente (`flex-center`).
*   **Card**:
    *   Fondo blanco.
    *   Padding: `24px`.
    *   Ancho máximo: `400px` (En móvil ocupará ancho disponible con margen).
*   **Colores**:
    *   Primario (Botones, Links): `#1976d2` (Azul Material Design)
    *   Texto Secundario (Subtítulos, hints): `#666666`
    *   Placeholder Avatar: `#e0e0e0` (Círculo), Icono: `#757575`.

## 2. Estructura de la Pantalla

### A. Cabecera (Header)
*   **Logo**: Imagen `assets/images/logo-text.png`
    *   Dimensiones: `max-width: 200px`, `height: auto`.
    *   Margen inferior: `15px`.
*   **Título**: "Crear Cuenta"
    *   Estilo: `font-size: 24px`, `font-weight: 500`.
*   **Subtítulo**: "Únete a la comunidad de Kyros"
    *   Estilo: `margin-top: 5px`, `color: #666`.

### B. Formulario
El formulario está contenido dentro de un `mat-card-content`.

1.  **Avatar Upload**:
    *   Componente visual: Círculo de `100x100px`.
    *   Estado vacío: Fondo `#e0e0e0`, Icono cámara (`camera_alt`) centrado.
    *   Estado con imagen: Muestra la imagen (`object-fit: cover`).
    *   Texto debajo: "Seleccionar foto de perfil" (Solo si no hay imagen).
    *   Interacción: Click abre selector de archivos.

2.  **Campos de Texto (Inputs)**:
    *   Estilo `appearance="outline"` (Bordes visibles).
    *   Clase `full-width`.
    *   **Campo 1: Nombre Completo**
        *   Label: "Nombre Completo"
        *   Placeholder: "Tu nombre"
    *   **Campo 2: Email**
        *   Label: "Email"
        *   Placeholder: "ejemplo@correo.com"
        *   Validación visual: Muestra error "Email inválido".
    *   **Campo 3: Contraseña**
        *   Label: "Contraseña"
        *   Input type: Password con toggle de visibilidad (Icono `visibility` / `visibility_off`).
        *   Hint (texto ayuda): "Mínimo 6 caracteres".

3.  **Botones**:
    *   **Registrarme**:
        *   `mat-raised-button`, `color="primary"` (Fondo azul, texto blanco).
        *   Texto dinámico: "Registrarme" o "Registrando..." (durante carga).
        *   Estado: Deshabilitado (`disabled`) si el formulario es inválido o está cargando.

### C. Pie (Footer)
*   **Texto**: "¿Ya tienes cuenta? "
*   **Link**: "Inicia Sesión" -> Navega a `/login`.
    *   Color: `#1976d2`.
    *   Weight: `bold`.

## 3. Lógica y Validaciones (Angular Reference)
Extraído de `register.ts`:

*   **FormGroup**:
    *   `nombre`: `[Validators.required]`
    *   `email`: `[Validators.required, Validators.email]`
    *   `password`: `[Validators.required, Validators.minLength(6)]`
*   **Submit**:
    *   Verifica `registerForm.invalid`.
    *   Activa estado `loading`.
    *   Muestra `SnackBar` (Toast) en caso de éxito ("Registro exitoso...") o error.
    *   Navegación a raíz `/` tras éxito.

## 4. Notas para Implementación en RN
*   Usar `KyrosScreen`, `KyrosCard`, `KyrosButton` ya existentes si aplican, o adaptar `KyrosCard` para comportarse como el card de registro.
*   **Avatar**: Necesitará `expo-image-picker` para funcionalidad real, o un mock que simule selección si no se agregan deps. *Nota: El usuario pidió no agregar dependencias nuevas sin permiso.* Se usará un mock o botón simple por ahora si `expo-image-picker` no está instalado (verificar `package.json`).
*   **Iconos**: Usar `react-native-paper` Check/Icon para la cámara y visibilidad.
*   **Inputs**: `TextInput` de `react-native-paper` con `mode="outlined"`.
