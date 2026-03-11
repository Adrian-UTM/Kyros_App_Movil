import { Stack } from "expo-router";
import Head from "expo-router/head";
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { AppProvider, useApp } from '../lib/AppContext';

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
