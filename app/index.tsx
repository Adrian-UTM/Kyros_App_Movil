import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { TextInput, Button, Text, HelperText, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabaseClient';
import { Session } from '../lib/session';
import KyrosCard from '../components/KyrosCard';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const [email, setEmail] = useState((params.email as string) || '');
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor ingresa tu correo electrónico para restablecer tu contraseña');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'kyrosapp://reset-password', // Dummy redirect, mostly for email template context
      });
      if (error) throw error;
      alert('Se han enviado instrucciones a tu correo para restablecer la contraseña.');
      setFailedAttempts(0); // Hide button after send
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
      router.replace('/(tabs)/agenda');
    } else {
      setFailedAttempts(prev => prev + 1);
      setError(result.error || 'Error al iniciar sesión');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#f5f5f5' }]}>
      <KyrosCard style={styles.card}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo-text.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <TextInput
          label="Email"
          value={email}
          onChangeText={(text) => { setEmail(text); setError(''); }}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!error}
          theme={{ colors: { background: 'white' } }}
        />

        <TextInput
          label="Contraseña"
          value={password}
          onChangeText={(text) => { setPassword(text); setError(''); }}
          mode="outlined"
          secureTextEntry={hidePassword}
          right={<TextInput.Icon icon={hidePassword ? "eye" : "eye-off"} onPress={() => setHidePassword(!hidePassword)} />}
          style={styles.input}
          error={!!error}
          theme={{ colors: { background: 'white' } }}
        />

        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>

        {failedAttempts > 0 && (
          <Button
            mode="text"
            onPress={handleResetPassword}
            textColor={theme.colors.primary}
            style={{ marginBottom: 10 }}
          >
            ¿Has olvidado la contraseña?
          </Button>
        )}

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            buttonColor={theme.colors.primary}
          >
            {loading ? 'Cargando...' : 'Ingresar'}
          </Button>
        </View>

        <View style={styles.footer}>
          <Text>¿No tienes cuenta? <Text style={[styles.link, { color: theme.colors.primary }]} onPress={() => router.push('/register')}>Regístrate aquí</Text></Text>
        </View>
      </KyrosCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    padding: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 200,
    height: 80,
  },
  input: {
    marginBottom: 10,
  },
  actions: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  button: {
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  link: {
    fontWeight: 'bold',
  },
});
