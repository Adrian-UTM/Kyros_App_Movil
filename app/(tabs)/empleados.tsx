import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator, Snackbar, Portal } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosButton from '../../components/KyrosButton';
import KyrosSelector from '../../components/KyrosSelector';
import EmpleadoFormModal from '../../components/EmpleadoFormModal';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import { confirmAction } from '../../lib/confirm';
import { useKyrosPalette } from '../../lib/useKyrosPalette';

interface Empleado {
    id: number;
    nombre: string;
    especialidad: string | null;
    sucursal_id: number | null;
    sucursal_nombre?: string;
    disponible: boolean;
}

export default function EmpleadosScreen() {
    const theme = useTheme();
    const palette = useKyrosPalette();
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);

    // Filters
    const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | 'general'>('general');

    // Snackbar for custom alerts
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    const showMessage = (msg: string) => {
        setSnackbarMessage(msg);
        setSnackbarVisible(true);
    };

    const { negocioId, sucursalId, rol, isLoading: appLoading } = useApp();

    const fetchEmpleados = useCallback(async (showIndicator = true) => {
        if (!negocioId) return;
        if (showIndicator) setLoading(true);
        setError(null);

        try {
            if (rol !== 'sucursal') {
                const { data: sucursalesData } = await supabase
                    .from('sucursales')
                    .select('id, nombre')
                    .eq('negocio_id', negocioId);
                setSucursales(sucursalesData || []);
            }

            let query = supabase
                .from('empleados')
                .select('id, nombre, especialidad, sucursal_id, disponible, sucursales(nombre)')
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
                disponible: e.disponible ?? true,
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
                    fetchEmpleados(false);
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
        confirmAction(
            'Eliminar Empleado',
            `¿Estás seguro de eliminar a "${empleado.nombre}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    const today = new Date().toISOString();
                    const { data: pending } = await supabase
                        .from('citas')
                        .select('id')
                        .eq('empleado_id', empleado.id)
                        .or('estado.eq.pendiente,estado.eq.confirmada,estado.eq.en_proceso')
                        .gte('fecha_hora_inicio', today);

                    if (pending && pending.length > 0) {
                        Alert.alert('No se puede eliminar', `${empleado.nombre} tiene ${pending.length} cita(s) pendiente(s). Reasignalas primero.`);
                        return;
                    }

                    await supabase.from('empleado_servicios').delete().eq('empleado_id', empleado.id);
                    await supabase.from('citas').delete().eq('empleado_id', empleado.id);

                    const { error: delError } = await supabase
                        .from('empleados')
                        .delete()
                        .eq('id', empleado.id)
                        .eq('negocio_id', negocioId);
                    if (delError) throw delError;

                    fetchEmpleados(true);
                } catch (err: any) {
                    Alert.alert('Error', err.message || 'No se pudo eliminar el empleado');
                }
            }
        );
    };

    const handleToggleDisponible = async (emp: Empleado) => {
        const newDisponible = !emp.disponible;
        try {
            const { error } = await supabase
                .from('empleados')
                .update({ disponible: newDisponible })
                .eq('id', emp.id);
            if (error) throw error;
            // Optimistic update
            setEmpleados(prev => prev.map(e => e.id === emp.id ? { ...e, disponible: newDisponible } : e));
            showMessage(`El empleado ${emp.nombre} ahora está ${newDisponible ? 'disponible' : 'inactivo'}.`);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'No se pudo actualizar la disponibilidad');
        }
    };

    const openEdit = (emp: Empleado) => {
        setSelectedEmpleado(emp);
        setModalVisible(true);
    };

    const openCreate = () => {
        setSelectedEmpleado(null);
        setModalVisible(true);
    };

    return (
        <KyrosScreen title="Empleados">
            <ScrollView style={styles.container}>
                {/* Add Button & Filter */}
                <View style={[styles.topSection, { flexDirection: 'column', gap: 16, backgroundColor: palette.surface, padding: 16, margin: 16, borderRadius: 16, borderWidth: 1, borderColor: palette.border }]}>
                    <KyrosButton mode="contained" icon="account-plus" onPress={openCreate}>
                        Agregar Empleado
                    </KyrosButton>
                    
                    {rol !== 'sucursal' && sucursales.length > 0 && (
                        <KyrosSelector
                            options={[
                                { label: 'Todas las Sucursales', value: 'general' },
                                ...sucursales.map(s => ({ label: s.nombre, value: s.id }))
                            ]}
                            selectedValue={selectedBranchId}
                            onValueChange={setSelectedBranchId}
                            placeholder="Filtrar por sucursal"
                            icon="store"
                        />
                    )}
                </View>

                {/* Loading */}
                {loading && (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color="#38bdf8" />
                        <Text style={styles.stateText}>Cargando empleados...</Text>
                    </View>
                )}

                {/* Error */}
                {!loading && error && error.toLowerCase().includes('negocio') ? (
                    <View style={styles.centerState}>
                        <MaterialIcons name="storefront" size={64} color={palette.textSoft} />
                        <Text style={[styles.stateText, { fontSize: 16, marginBottom: 8 }]}>Aún no tienes sucursales</Text>
                        <Text style={[styles.stateText, { marginTop: 0, paddingHorizontal: 20 }]}>Agrega una sucursal para poder agregar empleados.</Text>
                    </View>
                ) : !loading && error && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="error-outline" size={64} color="#ef4444" />
                        <Text style={[styles.stateText, { color: '#ef4444' }]}>{error}</Text>
                        <KyrosButton onPress={() => fetchEmpleados(true)} style={{ marginTop: 16 }}>Reintentar</KyrosButton>
                    </View>
                )}

                {/* Empty */}
                {!loading && !error && empleados.length === 0 && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="person-add" size={64} color={palette.textSoft} />
                        <Text style={styles.stateText}>No hay empleados registrados</Text>
                        <KyrosButton onPress={openCreate} style={{ marginTop: 16 }}>Agregar Empleado</KyrosButton>
                    </View>
                )}

                {/* Employee List */}
                {!loading && !error && empleados.length > 0 && (
                    <View style={styles.listSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="groups" size={18} color={theme.colors.primary} />
                            <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>Equipo ({empleados.length})</Text>
                        </View>

                        {empleados.map(emp => (
                            <View key={emp.id} style={[styles.empCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                                <View style={[styles.avatarCircle, { backgroundColor: palette.surfaceRaised }]}>
                                    <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{getInitials(emp.nombre)}</Text>
                                </View>
                                <View style={styles.empInfo}>
                                    <Text style={[styles.empName, { color: palette.text }]}>{emp.nombre}</Text>
                                    <Text style={[styles.empMeta, { color: palette.textMuted }]}>{emp.especialidad || 'Sin especialidad'} • {emp.sucursal_nombre}</Text>
                                </View>
                                <View style={styles.empActions}>
                                    <TouchableOpacity
                                            onPress={() => handleToggleDisponible(emp)}
                                            style={[styles.actionBtn, {
                                            backgroundColor: emp.disponible ? palette.activeBg : palette.inactiveBg,
                                            borderColor: emp.disponible ? palette.successText : palette.borderStrong,
                                        }]}
                                    >
                                        <MaterialIcons
                                            name={emp.disponible ? 'check-circle' : 'pause-circle-filled'}
                                            size={18}
                                            color={emp.disponible ? palette.successText : palette.textSoft}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => openEdit(emp)} style={[styles.actionBtn, { backgroundColor: palette.infoBg, borderColor: palette.infoText }]}>
                                        <MaterialIcons name="edit" size={18} color={palette.infoText} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(emp)} style={[styles.actionBtn, styles.actionDelete, { backgroundColor: palette.dangerBg, borderColor: palette.dangerText }]}>
                                        <MaterialIcons name="delete" size={18} color={palette.dangerText} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
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
                    fetchEmpleados(true);
                }}
            />

            <Portal>
                <Snackbar
                    visible={snackbarVisible}
                    onDismiss={() => setSnackbarVisible(false)}
                    duration={3000}
                    style={{ backgroundColor: '#1E293B', bottom: 20 }}
                    action={{ label: 'Cerrar', onPress: () => setSnackbarVisible(false), textColor: '#38bdf8' }}
                >
                    <Text style={{ color: '#fff' }}>{snackbarMessage}</Text>
                </Snackbar>
            </Portal>
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
    empCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: {
        color: '#38bdf8',
        fontWeight: '700',
        fontSize: 16,
    },
    empInfo: {
        flex: 1,
    },
    empName: {
        color: '#f1f5f9',
        fontWeight: '600',
        fontSize: 15,
    },
    empMeta: {
        color: '#64748b',
        fontSize: 13,
        marginTop: 2,
    },
    empActions: {
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
