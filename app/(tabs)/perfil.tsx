import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, List, useTheme, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Session } from '../../lib/session';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import KyrosButton from '../../components/KyrosButton';
import { useApp } from '../../lib/AppContext';

export default function PerfilScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { rol, negocioId, sucursalId } = useApp();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const userData = await Session.getUser();
            if (userData) {
                setUser({
                    name: userData.name || 'Usuario',
                    email: userData.email,
                });
            }
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        setLoading(true);
        await Session.logout();
        setLoading(false);
        router.replace('/');
    };

    // Get initials from name for avatar
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <KyrosScreen title="Perfil">
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.headerContainer}>
                    <Avatar.Text
                        size={80}
                        label={user ? getInitials(user.name) : 'US'}
                        style={{ backgroundColor: theme.colors.primary }}
                        color={theme.colors.onPrimary}
                    />
                </View>

                <KyrosCard title="Mi cuenta">
                    <List.Item
                        title={user?.name || 'Cargando...'}
                        description={rol === 'dueño' ? 'Propietario' : (rol === 'sucursal' ? 'Administrador Sucursal' : 'Usuario')}
                        left={props => <List.Icon {...props} icon="account" />}
                    />
                    <Divider />
                    <List.Item
                        title={user?.email || 'Cargando...'}
                        description="Correo electrónico"
                        left={props => <List.Icon {...props} icon="email" />}
                    />
                </KyrosCard>

                <KyrosCard title="Información Técnica (Debug)">
                    <List.Item
                        title={rol || 'N/A'}
                        description="Rol de sistema"
                        left={props => <List.Icon {...props} icon="shield-account" />}
                    />
                    <Divider />
                    <List.Item
                        title={negocioId || 'N/A'}
                        description="Negocio ID"
                        left={props => <List.Icon {...props} icon="domain" />}
                        titleStyle={{ fontSize: 12 }}
                    />
                    <Divider />
                    <List.Item
                        title={sucursalId?.toString() || 'ID Global'}
                        description="Sucursal ID"
                        left={props => <List.Icon {...props} icon="store" />}
                    />
                </KyrosCard>

                <KyrosCard title="Configuración">
                    <List.Item
                        title="Notificaciones"
                        left={props => <List.Icon {...props} icon="bell" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                    <Divider />
                    <List.Item
                        title="Tema"
                        left={props => <List.Icon {...props} icon="theme-light-dark" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                    <Divider />
                    <List.Item
                        title="Ayuda"
                        left={props => <List.Icon {...props} icon="help-circle" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                </KyrosCard>

                <View style={styles.buttonContainer}>
                    <KyrosButton
                        mode="outlined"
                        onPress={handleLogout}
                        loading={loading}
                        disabled={loading}
                    >
                        {loading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                    </KyrosButton>
                </View>
            </ScrollView>
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    buttonContainer: {
        marginTop: 20,
        marginBottom: 30,
    },
});
