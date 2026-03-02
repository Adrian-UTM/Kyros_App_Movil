import { Stack } from "expo-router";
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { AppProvider } from '../lib/AppContext';

// Tema basado en el proyecto Angular (Kyr0s-main)
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1E66FF', // Azul Corporativo (Kyros)
    secondary: '#1565c0',
    background: '#ffffff', // White background
    surface: '#ffffff', // White surface
    onBackground: '#111111', // Dark text on background
    onSurface: '#111111', // Dark text on surface
    outline: '#000000', // Black borders
  },
};

export default function RootLayout() {
  return (
    <AppProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="citas" />
        </Stack>
      </PaperProvider>
    </AppProvider>
  );
}
