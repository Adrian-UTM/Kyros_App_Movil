import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import KyrosButton from '../../components/KyrosButton';
import SucursalFormModal from '../../components/SucursalFormModal';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import { useKyrosPalette } from '../../lib/useKyrosPalette';

interface Sucursal {
    id: number;
    nombre: string;
    direccion: string | null;
    telefono: string | null;
    cuenta_email: string | null;
    cuenta_password: string | null;
    hora_apertura?: string | null;
    hora_cierre?: string | null;
    descanso_inicio?: string | null;
    descanso_fin?: string | null;
    dias_abiertos?: number[] | null;
}

export default function SucursalesScreen() {
    const theme = useTheme();
    const palette = useKyrosPalette();
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(null);

    const { negocioId, sucursalId, rol, isLoading: appLoading } = useApp();

    const fetchSucursales = useCallback(async () => {
        if (!negocioId) return;
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('sucursales')
                .select('id, nombre, direccion, telefono, cuenta_email, cuenta_password, hora_apertura, hora_cierre, descanso_inicio, descanso_fin, dias_abiertos')
                .eq('negocio_id', negocioId);

            if (rol === 'sucursal' && sucursalId) {
                query = query.eq('id', sucursalId);
            }

            const { data, error: fetchError } = await query.order('nombre');

            if (fetchError) throw fetchError;
            setSucursales(data || []);
        } catch (err: any) {
            console.error('Error fetching sucursales:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [negocioId, rol, sucursalId]);

    useFocusEffect(
        useCallback(() => {
            if (!appLoading) {
                if (negocioId) {
                    fetchSucursales();
                } else {
                    setLoading(false);
                }
            }
        }, [fetchSucursales, appLoading, negocioId])
    );

    const handleDelete = (sucursal: Sucursal) => {
        Alert.alert(
            'Eliminar Sucursal',
            `¿Estás seguro de eliminar "${sucursal.nombre}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const today = new Date().toISOString();

                            // 1. Block if pending/active appointments
                            const { data: pending } = await supabase
                                .from('citas')
                                .select('id')
                                .eq('sucursal_id', sucursal.id)
                                .or('estado.eq.pendiente,estado.eq.confirmada,estado.eq.en_proceso')
                                .gte('fecha_hora_inicio', today);

                            if (pending && pending.length > 0) {
                                Alert.alert(
                                    'No se puede eliminar',
                                    `La sucursal tiene ${pending.length} cita(s) pendiente(s). Cancélalas o reasígnalas primero.`
                                );
                                return;
                            }

                            // 2. Block if employees assigned (matches web behavior)
                            const { data: employees } = await supabase
                                .from('empleados')
                                .select('id')
                                .eq('sucursal_id', sucursal.id);

                            if (employees && employees.length > 0) {
                                Alert.alert(
                                    'No se puede eliminar',
                                    `La sucursal tiene ${employees.length} empleado(s) asignado(s). Elimínalos o reasígnalos primero.`
                                );
                                return;
                            }

                            // 3. Cascade: delete old/canceled citas + related
                            const { data: citasInBranch } = await supabase
                                .from('citas')
                                .select('id')
                                .eq('sucursal_id', sucursal.id);

                            if (citasInBranch && citasInBranch.length > 0) {
                                const citaIds = citasInBranch.map(c => c.id);
                                await supabase
                                    .from('citas_servicios')
                                    .delete()
                                    .in('cita_id', citaIds);
                            }

                            await supabase
                                .from('citas')
                                .delete()
                                .eq('sucursal_id', sucursal.id)
                                .eq('negocio_id', negocioId);

                            // 4. servicios
                            await supabase
                                .from('servicios')
                                .delete()
                                .eq('sucursal_id', sucursal.id)
                                .eq('negocio_id', negocioId);

                            // 5. clientes_bot
                            await supabase
                                .from('clientes_bot')
                                .delete()
                                .eq('sucursal_id', sucursal.id)
                                .eq('negocio_id', negocioId);

                            // 6. usuarios_perfiles
                            await supabase
                                .from('usuarios_perfiles')
                                .delete()
                                .eq('sucursal_id', sucursal.id);

                            // 7. Delete branch itself
                            const { error: delError } = await supabase
                                .from('sucursales')
                                .delete()
                                .eq('id', sucursal.id)
                                .eq('negocio_id', negocioId);
                            if (delError) throw delError;

                            fetchSucursales();
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'No se pudo eliminar la sucursal');
                        }
                    },
                },
            ]
        );
    };

    const openEdit = (suc: Sucursal) => {
        setSelectedSucursal(suc);
        setModalVisible(true);
    };

    const openCreate = () => {
        setSelectedSucursal(null);
        setModalVisible(true);
    };

    // Branch users should not manage branches
    const canManage = rol !== 'sucursal';

    return (
        <KyrosScreen title="Sucursales">
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Add button (only owners) */}
                {canManage && (
                    <KyrosCard>
                        <KyrosButton
                            mode="contained"
                            icon="store-plus"
                            onPress={openCreate}
                        >
                            Agregar Sucursal
                        </KyrosButton>
                    </KyrosCard>
                )}

                {/* Loading */}
                {loading && (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.stateText}>Cargando sucursales...</Text>
                    </View>
                )}

                {/* Error */}
                {!loading && error && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="error-outline" size={64} color="#d32f2f" />
                        <Text style={[styles.stateText, { color: '#d32f2f' }]}>{error}</Text>
                        <KyrosButton onPress={fetchSucursales} style={{ marginTop: 16 }}>
                            Reintentar
                        </KyrosButton>
                    </View>
                )}

                {/* Empty */}
                {!loading && !error && sucursales.length === 0 && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="store" size={64} color="#888" />
                        <Text style={styles.stateText}>No hay sucursales registradas</Text>
                        {canManage && (
                            <KyrosButton onPress={openCreate} style={{ marginTop: 16 }}>
                                Agregar Sucursal
                            </KyrosButton>
                        )}
                    </View>
                )}

                {/* List */}
                {!loading && !error && sucursales.length > 0 && (
                    <View style={{ paddingHorizontal: 16 }}>
                        <Text style={{ color: palette.textMuted, fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Sucursales ({sucursales.length})</Text>
                        {sucursales.map(suc => (
                            <KyrosCard key={suc.id} style={{ marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>{suc.nombre}</Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 2 }}><MaterialIcons name="phone" size={12}/> {suc.telefono || 'Sin teléfono'}</Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 13 }} numberOfLines={2}><MaterialIcons name="location-pin" size={12}/> {suc.direccion || 'Sin dirección'}</Text>
                                    </View>
                                    {canManage && (
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            <TouchableOpacity onPress={() => openEdit(suc)} style={{ padding: 10, backgroundColor: 'rgba(56,189,248,0.1)', borderRadius: 12 }}>
                                                <MaterialIcons name="edit" size={20} color="#38bdf8" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDelete(suc)} style={{ padding: 10, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12 }}>
                                                <MaterialIcons name="delete" size={20} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </KyrosCard>
                        ))}
                    </View>
                )}

                <View style={{ height: 80 }} />
            </ScrollView>

            <SucursalFormModal
                visible={modalVisible}
                sucursal={selectedSucursal}
                onDismiss={() => {
                    setModalVisible(false);
                    setSelectedSucursal(null);
                }}
                onSaved={() => {
                    setModalVisible(false);
                    setSelectedSucursal(null);
                    fetchSucursales();
                }}
            />
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
