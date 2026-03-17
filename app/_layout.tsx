import { Stack } from "expo-router";
import Head from "expo-router/head";
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { AppProvider, useApp } from '../lib/AppContext';
import { useFonts } from 'expo-font';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useRealtimeNotifications } from '../lib/useRealtimeNotifications';

// Prevent splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync();

// Tema basado en el proyecto Angular (Kyr0s-main)
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1E66FF', // Azul Corporativo (Kyros)
    secondary: '#1565c0',
    background: '#ffffff', // White background
    surface: '#ffffff', // White surface
    onBackground: '#111111', // Dark text on background
    onSurface: '#111111', // Dark text on surface
    outline: '#e0e0e0', // Light outline
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#1E66FF', // Azul Corporativo (Kyros)
    secondary: '#1565c0',
    background: '#0f172a', // slate-900
    surface: '#1e293b', // slate-800
    onBackground: '#f8fafc',
    onSurface: '#f8fafc',
    outline: '#334155', // slate-700
  },
};

function ThemeWrapper() {
  const { themeMode } = useApp();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  // Habilitar notificaciones en tiempo real para todas las pantallas de la app
  useRealtimeNotifications();

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="citas" />
      </Stack>
    </PaperProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null; // Or a simple View while fonts load
  }

  return (
    <>
      <Head>
        <title>KyrosApp</title>
      </Head>
      <AppProvider>
        <ThemeWrapper />
      </AppProvider>
    </>
  );
}
