import { Tabs, useRouter, useRootNavigationState } from "expo-router";
import { useEffect, useState } from "react";
import { Session } from "../../lib/session";
import { useApp } from "../../lib/AppContext";
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, Text, Button } from 'react-native-paper';
import { View, ActivityIndicator, Image } from 'react-native';

// Menu items matching Angular dashboard (ordering follows Angular)
// Angular: Calendario, Servicios, Empleados, Sucursales, Clientes, Estadísticas, Mi Perfil
// Note: No "Plan" tab - subscription info is inside Perfil

export default function TabLayout() {
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();
    const theme = useTheme();
    const { rol, isLoading: appLoading, profileMissing, refreshProfile, isAuthenticated } = useApp();

    useEffect(() => {
        // Wait for the navigation state to be ready
        if (!rootNavigationState?.key) return;

        // Redirect to login if AppContext says we are not authenticated. 
        // We rely entirely on the centralized AppContext for auth state to avoid Supabase storage deadlocks.
        if (!appLoading && !isAuthenticated) {
            router.replace('/');
        }
    }, [rootNavigationState?.key, isAuthenticated, appLoading]);

    // Show loading while app context is initializing or authenticating
    if (appLoading) {
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
    // No showSucursales needed - tab will be hidden

    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#3b82f6', // Kyros blue
            tabBarInactiveTintColor: '#64748b',
            tabBarStyle: {
                backgroundColor: '#111827', // Dark surface
                borderTopColor: '#1e293b'
            },
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
            <Tabs.Screen
                name="sucursales"
                options={{
                    href: rol === 'dueño' ? undefined : null,
                    title: 'Sucursales',
                    tabBarIcon: ({ color }) => <MaterialIcons name="storefront" size={24} color={color} />,
                }}
            />
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
                    title: 'Estadísticas',
                    tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="perfil"
                options={{
                    title: rol === 'dueño' ? 'Mi Perfil' : 'Sucursal',
                    tabBarIcon: ({ color }) => <MaterialIcons name={rol === 'dueño' ? "person" : "store"} size={24} color={color} />,
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
