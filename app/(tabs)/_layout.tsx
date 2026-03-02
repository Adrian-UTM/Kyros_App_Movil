import { Tabs, useRouter, useRootNavigationState } from "expo-router";
import { useEffect, useState } from "react";
import { Session } from "../../lib/session";
import { useApp } from "../../lib/AppContext";
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, Text, Button } from 'react-native-paper';
import { View, ActivityIndicator } from 'react-native';

// Menu items matching Angular dashboard (ordering follows Angular)
// Angular: Calendario, Servicios, Empleados, Sucursales, Clientes, Estadísticas, Mi Perfil
// Note: No "Plan" tab - subscription info is inside Perfil

export default function TabLayout() {
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();
    const theme = useTheme();
    const { rol, isLoading: appLoading, profileMissing, refreshProfile } = useApp();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Wait for the navigation state to be ready
        if (!rootNavigationState?.key) return;

        const checkAuth = async () => {
            setIsChecking(true);
            const hasSession = await Session.check();
            setIsAuthenticated(hasSession);
            setIsChecking(false);

            if (!hasSession) {
                router.replace('/');
            }
        };
        checkAuth();
    }, [rootNavigationState?.key]);

    // Show loading while checking auth or app context
    if (isChecking || appLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    // Don't render tabs if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    // Show error if profile not found
    if (profileMissing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background, padding: 32 }}>
                <MaterialIcons name="error-outline" size={64} color={theme.colors.error} />
                <Text variant="headlineSmall" style={{ marginTop: 16, textAlign: 'center', fontWeight: 'bold' }}>
                    Perfil no encontrado
                </Text>
                <Text variant="bodyMedium" style={{ marginTop: 8, textAlign: 'center', color: '#666' }}>
                    No se encontró un perfil asociado a tu cuenta. Contacta al administrador de tu negocio para que te asigne un rol.
                </Text>
                <Button mode="contained" onPress={refreshProfile} style={{ marginTop: 24 }}>
                    Reintentar
                </Button>
            </View>
        );
    }

    // Filter tabs based on role (like Angular does)
    const showSucursales = rol !== 'sucursal';

    return (
        <Tabs screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTintColor: '#fff',
            tabBarActiveTintColor: theme.colors.primary,
            tabBarLabelStyle: { fontSize: 10 },
        }}>
            {/* Angular order: Calendario, Servicios, Empleados, Sucursales, Clientes, Estadísticas, Mi Perfil */}
            <Tabs.Screen
                name="agenda"
                options={{
                    title: 'Calendario',
                    tabBarIcon: ({ color }) => <MaterialIcons name="calendar-today" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="servicios"
                options={{
                    title: 'Servicios',
                    tabBarIcon: ({ color }) => <MaterialIcons name="content-cut" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="empleados"
                options={{
                    title: 'Empleados',
                    tabBarIcon: ({ color }) => <MaterialIcons name="badge" size={24} color={color} />,
                }}
            />
            {showSucursales && (
                <Tabs.Screen
                    name="sucursales"
                    options={{
                        title: 'Sucursales',
                        tabBarIcon: ({ color }) => <MaterialIcons name="store" size={24} color={color} />,
                    }}
                />
            )}
            <Tabs.Screen
                name="clientes"
                options={{
                    title: 'Clientes',
                    tabBarIcon: ({ color }) => <MaterialIcons name="people" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="estadisticas"
                options={{
                    title: 'Stats',
                    tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="perfil"
                options={{
                    title: 'Mi Perfil',
                    tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
                }}
            />
            {/* Hidden screens that exist but shouldn't show in tab bar */}
            <Tabs.Screen
                name="suscripcion"
                options={{
                    href: null, // Hide from tab bar - accessible from Perfil
                }}
            />
        </Tabs>
    );
}
