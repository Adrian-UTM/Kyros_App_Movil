import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, List, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import KyrosButton from '../../components/KyrosButton';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import ServicioFormModal from '../../components/ServicioFormModal';
import { TouchableOpacity } from 'react-native';

interface Servicio {
    id: number;
    nombre: string;
    precio_base: number | null;
    duracion_aprox_minutos: number | null;
    descripcion?: string;
}

export default function ServiciosScreen() {
    const theme = useTheme();
    const { negocioId, sucursalId, rol, isLoading: appLoading } = useApp();
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);

    const fetchServicios = useCallback(async () => {
        // Wait for context to be ready
        if (negocioId === null) {
            setLoading(false);
            setError('Sin negocio asignado');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use negocioId from context (no extra query needed)
            let query = supabase
                .from('servicios')
                .select('id, nombre, precio_base, duracion_aprox_minutos')
                .eq('negocio_id', negocioId);

            // Branch users see their branch services + global ones
            if (rol === 'sucursal' && sucursalId) {
                query = query.or(`sucursal_id.eq.${sucursalId},sucursal_id.is.null`);
            }

            const { data, error: fetchError } = await query.order('nombre');

            if (fetchError) throw fetchError;
            setServicios(data || []);

        } catch (err: any) {
            console.error('Error fetching servicios:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    // Refetch when screen gains focus or negocioId changes
    useFocusEffect(
        useCallback(() => {
            if (!appLoading) {
                fetchServicios();
            }
        }, [fetchServicios, appLoading])
    );

    const activos = servicios;

    // Show loading while app context is loading
    if (appLoading) {
        return (
            <KyrosScreen title="Servicios">
                <View style={styles.centerState}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.stateText}>Cargando...</Text>
                </View>
            </KyrosScreen>
        );
    }

    return (
        <KyrosScreen title="Servicios">
            <ScrollView style={styles.container}>
                {loading && (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.stateText}>Cargando servicios...</Text>
                    </View>
                )}

                {!loading && error && error.toLowerCase().includes('negocio') ? (
                    <View style={styles.centerState}>
                        <MaterialIcons name="storefront" size={64} color="#888" />
                        <Text style={[styles.stateText, { color: '#555', fontSize: 16, marginBottom: 8 }]}>
                            Aún no tienes sucursales creadas
                        </Text>
                        <Text style={[styles.stateText, { marginTop: 0, paddingHorizontal: 20 }]}>
                            Agrega una sucursal en el panel de Sucursales para poder agregar servicios.
                        </Text>
                    </View>
                ) : !loading && error && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="error-outline" size={64} color="#d32f2f" />
                        <Text style={[styles.stateText, { color: '#d32f2f' }]}>{error}</Text>
                        <KyrosButton onPress={fetchServicios} style={{ marginTop: 16 }}>
                            Reintentar
                        </KyrosButton>
                    </View>
                )}

                {!loading && !error && servicios.length === 0 && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="content-cut" size={64} color="#888" />
                        <Text style={styles.stateText}>No hay servicios registrados</Text>
                        <KyrosButton onPress={() => setModalVisible(true)} style={{ marginTop: 16 }}>
                            Agregar Servicio
                        </KyrosButton>
                    </View>
                )}

                {!loading && !error && servicios.length > 0 && (
                    <>
                        <KyrosCard>
                            <KyrosButton
                                mode="contained"
                                icon="plus"
                                onPress={() => {
                                    setSelectedServicio(null);
                                    setModalVisible(true);
                                }}
                            >
                                Nuevo Servicio
                            </KyrosButton>
                        </KyrosCard>
                        <KyrosCard title="Resumen">
                            <View style={styles.statsContainer}>
                                <View style={styles.statItem}>
                                    <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                        {servicios.length}
                                    </Text>
                                    <Text variant="bodyMedium">Total</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                        {activos.length}
                                    </Text>
                                    <Text variant="bodyMedium">Activos</Text>
                                </View>
                            </View>
                        </KyrosCard>

                        <KyrosCard title="Lista de servicios">
                            {servicios.map((servicio, index) => (
                                <React.Fragment key={servicio.id}>
                                    <List.Item
                                        title={servicio.nombre}
                                        description={`$${servicio.precio_base ?? 0} • ${servicio.duracion_aprox_minutos ?? '—'} min`}
                                        left={props => (
                                            <MaterialIcons
                                                name="content-cut"
                                                size={24}
                                                color={theme.colors.primary}
                                                style={{ marginLeft: 8, marginRight: 8, alignSelf: 'center' }}
                                            />
                                        )}
                                        right={props => (
                                            <TouchableOpacity onPress={() => {
                                                setSelectedServicio(servicio);
                                                setModalVisible(true);
                                            }} style={{ justifyContent: 'center', paddingLeft: 10 }}>
                                                <List.Icon {...props} icon="pencil" color={theme.colors.primary} />
                                            </TouchableOpacity>
                                        )}
                                    />
                                    {index < servicios.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </KyrosCard>
                    </>
                )}

                <View style={{ height: 80 }} />
            </ScrollView>
            <ServicioFormModal
                visible={modalVisible}
                servicio={selectedServicio}
                onDismiss={() => {
                    setModalVisible(false);
                    setSelectedServicio(null);
                }}
                onServicioGuardado={() => {
                    setModalVisible(false);
                    setSelectedServicio(null);
                    fetchServicios();
                }}
            />
        </KyrosScreen >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 8,
    },
    statItem: {
        alignItems: 'center',
    },
    centerState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    stateText: {
        marginTop: 16,
        color: '#888',
        textAlign: 'center',
    },
});
