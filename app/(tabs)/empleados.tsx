import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Avatar, List, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import KyrosButton from '../../components/KyrosButton';
import EmpleadoFormModal from '../../components/EmpleadoFormModal';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';

interface Empleado {
    id: number;
    nombre: string;
    especialidad: string | null;
    telefono: string | null;
    activo: boolean;
    sucursal_id: number | null;
    sucursal_nombre?: string;
}

export default function EmpleadosScreen() {
    const theme = useTheme();
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);

    const { negocioId, sucursalId, rol, isLoading: appLoading } = useApp();

    const fetchEmpleados = useCallback(async () => {
        if (!negocioId) return;
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('empleados')
                .select('id, nombre, especialidad, telefono, activo, sucursal_id, sucursales(nombre)')
                .eq('negocio_id', negocioId);

            // Branch users only see their branch employees
            if (rol === 'sucursal' && sucursalId) {
                query = query.eq('sucursal_id', sucursalId);
            }

            const { data, error: fetchError } = await query.order('nombre');

            if (fetchError) throw fetchError;
            setEmpleados((data || []).map((e: any) => ({
                ...e,
                sucursal_nombre: e.sucursales?.nombre || 'Sin sucursal',
            })));

        } catch (err: any) {
            console.error('Error fetching empleados:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [negocioId, sucursalId, rol]);

    useFocusEffect(
        useCallback(() => {
            if (!appLoading) {
                if (negocioId) {
                    fetchEmpleados();
                } else {
                    setLoading(false);
                }
            }
        }, [fetchEmpleados, appLoading, negocioId])
    );

    const getInitials = (name: string): string => {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const handleDelete = (empleado: Empleado) => {
        Alert.alert(
            'Eliminar Empleado',
            `¿Estás seguro de eliminar a "${empleado.nombre}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Check for pending/future appointments
                            const today = new Date().toISOString();
                            const { data: pending } = await supabase
                                .from('citas')
                                .select('id')
                                .eq('empleado_id', empleado.id)
                                .or('estado.eq.pendiente,estado.eq.confirmada,estado.eq.en_proceso')
                                .gte('fecha_hora_inicio', today);

                            if (pending && pending.length > 0) {
                                Alert.alert(
                                    'No se puede eliminar',
                                    `${empleado.nombre} tiene ${pending.length} cita(s) pendiente(s). Reasígnalas primero.`
                                );
                                return;
                            }

                            // Delete related records first
                            await supabase
                                .from('empleado_servicios')
                                .delete()
                                .eq('empleado_id', empleado.id);

                            // Delete past/cancelled appointments
                            await supabase
                                .from('citas')
                                .delete()
                                .eq('empleado_id', empleado.id);

                            // Delete employee
                            const { error: delError } = await supabase
                                .from('empleados')
                                .delete()
                                .eq('id', empleado.id)
                                .eq('negocio_id', negocioId);
                            if (delError) throw delError;

                            fetchEmpleados();
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'No se pudo eliminar el empleado');
                        }
                    },
                },
            ]
        );
    };

    const openEdit = (emp: Empleado) => {
        setSelectedEmpleado(emp);
        setModalVisible(true);
    };

    const openCreate = () => {
        setSelectedEmpleado(null);
        setModalVisible(true);
    };

    const activos = empleados.filter(e => e.activo !== false);

    return (
        <KyrosScreen title="Empleados">
            <ScrollView style={styles.container}>
                {/* Botón nuevo */}
                <KyrosCard>
                    <KyrosButton
                        mode="contained"
                        icon="account-plus"
                        onPress={openCreate}
                    >
                        Agregar Empleado
                    </KyrosButton>
                </KyrosCard>

                {/* Estado de carga */}
                {loading && (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.stateText}>Cargando empleados...</Text>
                    </View>
                )}

                {/* Error */}
                {!loading && error && error.toLowerCase().includes('negocio') ? (
                    <View style={styles.centerState}>
                        <MaterialIcons name="storefront" size={64} color="#888" />
                        <Text style={[styles.stateText, { color: '#555', fontSize: 16, marginBottom: 8 }]}>
                            Aún no tienes sucursales creadas
                        </Text>
                        <Text style={[styles.stateText, { marginTop: 0, paddingHorizontal: 20 }]}>
                            Agrega una sucursal en el panel de Sucursales para poder agregar empleados.
                        </Text>
                    </View>
                ) : !loading && error && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="error-outline" size={64} color="#d32f2f" />
                        <Text style={[styles.stateText, { color: '#d32f2f' }]}>{error}</Text>
                        <KyrosButton onPress={fetchEmpleados} style={{ marginTop: 16 }}>
                            Reintentar
                        </KyrosButton>
                    </View>
                )}

                {/* Empty state */}
                {!loading && !error && empleados.length === 0 && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="person-add" size={64} color="#888" />
                        <Text style={styles.stateText}>No hay empleados registrados</Text>
                        <KyrosButton onPress={openCreate} style={{ marginTop: 16 }}>
                            Agregar Empleado
                        </KyrosButton>
                    </View>
                )}

                {/* Resumen */}
                {!loading && !error && empleados.length > 0 && (
                    <>
                        <KyrosCard title="Resumen">
                            <View style={styles.statsContainer}>
                                <View style={styles.statItem}>
                                    <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                        {empleados.length}
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

                        <KyrosCard title="Lista de empleados">
                            {empleados.map((emp, index) => (
                                <React.Fragment key={emp.id}>
                                    <List.Item
                                        title={emp.nombre}
                                        description={`${emp.especialidad || 'Sin especialidad'} • ${emp.sucursal_nombre}`}
                                        left={props => (
                                            <Avatar.Text
                                                {...props}
                                                size={40}
                                                label={getInitials(emp.nombre)}
                                                style={{ backgroundColor: emp.activo !== false ? theme.colors.secondaryContainer : '#ddd' }}
                                                color={theme.colors.onSecondaryContainer}
                                            />
                                        )}
                                        right={props => (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                {emp.activo === false && (
                                                    <Text style={{ color: '#999', fontSize: 12, marginRight: 8 }}>Inactivo</Text>
                                                )}
                                                <TouchableOpacity onPress={() => openEdit(emp)}>
                                                    <List.Icon {...props} icon="pencil" color={theme.colors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleDelete(emp)}>
                                                    <List.Icon {...props} icon="delete" color="#d32f2f" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    />
                                    {index < empleados.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </KyrosCard>
                    </>
                )}

                <View style={{ height: 80 }} />
            </ScrollView>

            <EmpleadoFormModal
                visible={modalVisible}
                empleado={selectedEmpleado}
                onDismiss={() => {
                    setModalVisible(false);
                    setSelectedEmpleado(null);
                }}
                onSaved={() => {
                    setModalVisible(false);
                    setSelectedEmpleado(null);
                    fetchEmpleados();
                }}
            />
        </KyrosScreen>
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
