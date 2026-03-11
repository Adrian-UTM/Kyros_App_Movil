import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Image, Animated } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabaseClient';
import { Session } from '../lib/session';
import { useApp } from '../lib/AppContext';



export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState((params.email as string) || '');
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  const { isAuthenticated, isLoading: appLoading } = useApp();

  // Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.spring(logoAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.spring(formAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.spring(buttonAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  React.useEffect(() => {
    if (!appLoading && isAuthenticated) {
      router.replace('/(tabs)/agenda');
    }
  }, [isAuthenticated, appLoading]);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor ingresa tu correo electrónico para restablecer tu contraseña');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'kyrosapp://reset-password',
      });
      if (error) throw error;
      alert('Se han enviado instrucciones a tu correo para restablecer la contraseña.');
      setFailedAttempts(0);
    } catch (err: any) {
      setError(err.message || 'Error al intentar restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Completa email y contraseña');
      return;
    }

    setError('');
    setLoading(true);

    const result = await Session.login(email, password);

    setLoading(false);

    if (result.success) {
      setTimeout(() => {
        router.replace('/(tabs)/agenda');
      }, 500);
    } else {
      setFailedAttempts(prev => prev + 1);
      setError(result.error || 'Error al iniciar sesión');
    }
  };

  const inputTheme = {
    colors: {
      onSurfaceVariant: '#94a3b8',
      outline: 'transparent',
      primary: '#3b82f6',
    },
    roundness: 14,
  };

  return (
    <View style={styles.container}>
      {/* Subtle background glow */}
      <View style={styles.glowCircle} />

      <View style={styles.content}>
        <View style={styles.card}>
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, {
            opacity: logoAnim,
            transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
          }]}>
            <Image
              source={require('../assets/images/logo-text.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Gestión inteligente para tu negocio</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View style={[styles.formContainer, {
            opacity: formAnim,
            transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
          }]}>
            <TextInput
              label="Correo electrónico"
              value={email}
              onChangeText={(text) => { setEmail(text); setError(''); }}
              mode="flat"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              textColor="#e2e8f0"
              underlineColor="transparent"
              activeUnderlineColor="#3b82f6"
              left={<TextInput.Icon icon="email-outline" color="#94a3b8" />}
              theme={inputTheme}
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={(text) => { setPassword(text); setError(''); }}
              mode="flat"
              secureTextEntry={hidePassword}
              right={<TextInput.Icon icon={hidePassword ? "eye-outline" : "eye-off-outline"} color="#94a3b8" onPress={() => setHidePassword(!hidePassword)} />}
              left={<TextInput.Icon icon="lock-outline" color="#94a3b8" />}
              style={styles.input}
              textColor="#e2e8f0"
              underlineColor="transparent"
              activeUnderlineColor="#3b82f6"
              theme={inputTheme}
            />

            {!!error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {failedAttempts > 0 && (
              <Button
                mode="text"
                onPress={handleResetPassword}
                textColor="#60a5fa"
                style={{ marginTop: 4 }}
                labelStyle={{ fontSize: 13 }}
              >
                ¿Has olvidado la contraseña?
              </Button>
            )}
          </Animated.View>

          {/* Button */}
          <Animated.View style={[styles.buttonContainer, {
            opacity: buttonAnim,
            transform: [{ scale: buttonAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
          }]}>
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
              labelStyle={styles.loginButtonLabel}
              contentStyle={styles.loginButtonContent}
              buttonColor="#1e3a5f"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, { opacity: buttonAnim }]}>
            <Text style={styles.footerText}>
              ¿No tienes cuenta?{' '}
              <Text style={styles.link} onPress={() => router.push('/register')}>
                Regístrate aquí
              </Text>
            </Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircle: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 28,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 280,
    height: 90,
    marginBottom: 12,
  },
  tagline: {
    color: '#94a3b8',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  formContainer: {
    marginBottom: 28,
    gap: 14,
  },
  input: {
    backgroundColor: '#1a2234',
    borderRadius: 14,
    fontSize: 15,
    overflow: 'hidden',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  loginButton: {
    borderRadius: 14,
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  loginButtonContent: {
    paddingVertical: 6,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  link: {
    color: '#60a5fa',
    fontWeight: '700',
  },
});
