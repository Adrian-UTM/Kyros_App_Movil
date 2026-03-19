import { Tabs, useRouter, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { useApp } from "../../lib/AppContext";
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, Text, Button } from 'react-native-paper';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useKyrosPalette } from "../../lib/useKyrosPalette";
import { useResponsiveLayout } from "../../lib/useResponsiveLayout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Menu items matching Angular dashboard (ordering follows Angular)
// Angular: Calendario, Servicios, Empleados, Sucursales, Clientes, Estadísticas, Mi Perfil
// Note: No "Plan" tab - subscription info is inside Perfil

export default function TabLayout() {
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();
    const theme = useTheme();
    const palette = useKyrosPalette();
    const responsive = useResponsiveLayout();
    const insets = useSafeAreaInsets();
    const { rol, isLoading: appLoading, profileMissing, refreshProfile, isAuthenticated } = useApp();
    const isNativeMobile = Platform.OS !== 'web';
    const hideBranchesTab = isNativeMobile;
    const getTabLabel = (label: string) => {
        if (!isNativeMobile) return label;
        const mobileLabels: Record<string, string> = {
            Calendario: 'Agenda',
            Servicios: 'Servicios',
            Empleados: 'Equipo',
            Sucursales: 'Sucursales',
            Clientes: 'Clientes',
            Estadísticas: 'Stats',
            'Mi Perfil': 'Perfil',
            Sucursal: 'Sucursal',
        };
        return mobileLabels[label] || label;
    };

    useEffect(() => {
        // Wait for the navigation state to be ready
        if (!rootNavigationState?.key) return;

        // Redirect to login if AppContext says we are not authenticated. 
        // We rely entirely on the centralized AppContext for auth state to avoid Supabase storage deadlocks.
        if (!appLoading && !isAuthenticated) {
            router.replace('/');
        }
    }, [rootNavigationState?.key, isAuthenticated, appLoading, router]);

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
            tabBarHideOnKeyboard: true,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: palette.textSoft,
            tabBarStyle: {
                backgroundColor: palette.surface,
                borderTopColor: palette.border,
                height: (responsive.isTablet ? 76 : 66) + insets.bottom,
                paddingTop: responsive.isTablet ? 10 : 8,
                paddingBottom: Math.max(insets.bottom, 10),
                paddingHorizontal: responsive.isTablet ? 10 : 2,
                borderTopWidth: 1,
            },
            tabBarItemStyle: {
                paddingHorizontal: isNativeMobile ? (responsive.isCompactPhone ? 0 : 2) : 6,
            },
            tabBarLabelStyle: {
                fontSize: isNativeMobile ? (responsive.isCompactPhone ? 10 : responsive.isTablet ? 12 : 11) : 10,
                fontWeight: '600',
                marginBottom: isNativeMobile ? 2 : 0,
            },
        }}>
            {/* Angular order: Calendario, Servicios, Empleados, Sucursales, Clientes, Estadísticas, Mi Perfil */}
            <Tabs.Screen
                name="agenda"
                options={{
                    title: getTabLabel('Calendario'),
                    tabBarIcon: ({ color }) => <MaterialIcons name="calendar-today" size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="servicios"
                options={{
                    title: getTabLabel('Servicios'),
                    tabBarIcon: ({ color }) => <MaterialIcons name="content-cut" size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="empleados"
                options={{
                    title: getTabLabel('Empleados'),
                    tabBarIcon: ({ color }) => <MaterialIcons name="badge" size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="sucursales"
                options={{
                    href: rol === 'dueño' && !hideBranchesTab ? undefined : null,
                    title: getTabLabel('Sucursales'),
                    tabBarIcon: ({ color }) => <MaterialIcons name="storefront" size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="clientes"
                options={{
                    title: getTabLabel('Clientes'),
                    tabBarIcon: ({ color }) => <MaterialIcons name="people" size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="estadisticas"
                options={{
                    title: getTabLabel('Estadísticas'),
                    tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="perfil"
                options={{
                    title: getTabLabel(rol === 'dueño' ? 'Mi Perfil' : 'Sucursal'),
                    tabBarIcon: ({ color }) => <MaterialIcons name={rol === 'dueño' ? "person" : "store"} size={22} color={color} />,
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
