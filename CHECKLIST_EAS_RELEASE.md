# Checklist EAS Release

- [ ] Tener sesión iniciada en Expo/EAS: `eas login`
- [ ] Confirmar assets finales de branding en `assets/images`
- [ ] Verificar `app.json` con `npx expo config --type public`
- [ ] Verificar lint limpio con `npx expo lint`
- [ ] Generar APK interna: `eas build -p android --profile preview`
- [ ] Instalar APK en Android físico y validar sin laptop
- [ ] Generar AAB release: `eas build -p android --profile production`
- [ ] Configurar/aceptar credenciales de firma cuando EAS lo pida
- [ ] Validar icono, splash, notificaciones y deep link en build real
- [ ] Subir la release final solo después de QA en teléfono y tableta
