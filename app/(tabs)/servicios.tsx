import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Image, Alert } from 'react-native';
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
import { confirmAction } from '../../lib/confirm';

interface Servicio {
    id: number;
    nombre: string;
    precio_base: number | null;
    duracion_aprox_minutos: number | null;
    descripcion?: string;
    imagen_url?: string | null;
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

    const fetchServicios = useCallback(async (showIndicator = true) => {
        // Wait for context to be ready
        if (negocioId === null) {
            if (showIndicator) setLoading(false);
            setError('Sin negocio asignado');
            return;
        }

        if (showIndicator) setLoading(true);
        setError(null);

        try {
            // Use negocioId from context (no extra query needed)
            let query = supabase
                .from('servicios')
                .select('id, nombre, precio_base, duracion_aprox_minutos, imagen_url')
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
    }, [negocioId, sucursalId, rol]);

    // Refetch when screen gains focus or negocioId changes
    useFocusEffect(
        useCallback(() => {
            if (!appLoading) {
                fetchServicios(false);
            }
        }, [fetchServicios, appLoading])
    );

    const activos = servicios;

    const handleDeleteServicio = (servicio: Servicio) => {
        confirmAction(
            'Eliminar Servicio',
            `¿Estás seguro de eliminar "${servicio.nombre}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    const { error } = await supabase
                        .from('servicios')
                        .delete()
                        .eq('id', servicio.id)
                        .eq('negocio_id', negocioId);
                    if (error) throw error;
                    fetchServicios(true);
                } catch (err: any) {
                    Alert.alert('Error', err.message || 'No se pudo eliminar el servicio');
                }
            }
        );
    };

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
                        <ActivityIndicator size="large" color="#38bdf8" />
                        <Text style={styles.stateText}>Cargando servicios...</Text>
                    </View>
                )}

                {!loading && error && error.toLowerCase().includes('negocio') ? (
                    <View style={styles.centerState}>
                        <MaterialIcons name="storefront" size={64} color="#64748b" />
                        <Text style={[styles.stateText, { fontSize: 16, marginBottom: 8 }]}>Aún no tienes sucursales</Text>
                        <Text style={[styles.stateText, { marginTop: 0, paddingHorizontal: 20 }]}>Agrega una sucursal para poder agregar servicios.</Text>
                    </View>
                ) : !loading && error && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="error-outline" size={64} color="#ef4444" />
                        <Text style={[styles.stateText, { color: '#ef4444' }]}>{error}</Text>
                        <KyrosButton onPress={() => fetchServicios(true)} style={{ marginTop: 16 }}>Reintentar</KyrosButton>
                    </View>
                )}

                {!loading && !error && servicios.length === 0 && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="content-cut" size={64} color="#64748b" />
                        <Text style={styles.stateText}>No hay servicios registrados</Text>
                        <KyrosButton onPress={() => setModalVisible(true)} style={{ marginTop: 16 }}>Agregar Servicio</KyrosButton>
                    </View>
                )}

                {!loading && !error && servicios.length > 0 && (
                    <>
                        {/* Add Button */}
                        <View style={styles.topSection}>
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
                        </View>

                        {/* Service List */}
                        <View style={styles.listSection}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="content-cut" size={18} color="#38bdf8" />
                                <Text style={styles.sectionTitle}>Servicios ({servicios.length})</Text>
                            </View>

                            {servicios.map(servicio => (
                                <View key={servicio.id} style={styles.serviceCard}>
                                    {/* Icon / Image */}
                                    {servicio.imagen_url ? (
                                        <Image
                                            source={{ uri: servicio.imagen_url }}
                                            style={styles.serviceImage}
                                        />
                                    ) : (
                                        <View style={styles.serviceIconCircle}>
                                            <MaterialIcons name="content-cut" size={20} color="#38bdf8" />
                                        </View>
                                    )}

                                    <View style={styles.serviceInfo}>
                                        <Text style={styles.serviceName}>{servicio.nombre}</Text>
                                        <Text style={styles.serviceMeta}>
                                            ${servicio.precio_base ?? 0} • {servicio.duracion_aprox_minutos ?? '—'} min
                                        </Text>
                                    </View>

                                    <View style={styles.serviceActions}>
                                        <TouchableOpacity
                                            onPress={() => { setSelectedServicio(servicio); setModalVisible(true); }}
                                            style={styles.actionBtn}
                                        >
                                            <MaterialIcons name="edit" size={18} color="#94a3b8" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteServicio(servicio)}
                                            style={[styles.actionBtn, styles.actionDelete]}
                                        >
                                            <MaterialIcons name="delete" size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
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
                    fetchServicios(true);
                }}
            />
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topSection: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        margin: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    listSection: {
        paddingHorizontal: 16,
        marginTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    sectionTitle: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    serviceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    serviceImage: {
        width: 44,
        height: 44,
        borderRadius: 10,
        marginRight: 14,
        backgroundColor: '#0f172a',
    },
    serviceIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        color: '#f1f5f9',
        fontWeight: '600',
        fontSize: 15,
    },
    serviceMeta: {
        color: '#64748b',
        fontSize: 13,
        marginTop: 2,
    },
    serviceActions: {
        flexDirection: 'row',
        gap: 6,
    },
    actionBtn: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
    },
    actionDelete: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: '#ef4444',
    },
    centerState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    stateText: {
        marginTop: 16,
        color: '#64748b',
        textAlign: 'center',
    },
});
