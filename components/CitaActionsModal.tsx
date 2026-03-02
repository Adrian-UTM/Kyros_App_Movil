import React, { useState } from 'react';
import { StyleSheet, View, Modal, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'expo-router';
import { safeAction } from '../lib/safeAction';

interface CitaActionsModalProps {
    visible: boolean;
    cita: any;
    negocioId: string | null;
    onDismiss: () => void;
    onCitaUpdated: () => void;
}

export default function CitaActionsModal({ visible, cita, negocioId, onDismiss, onCitaUpdated }: CitaActionsModalProps) {
    const theme = useTheme();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    if (!cita) return null;

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true);
        try {
            await safeAction('CitaStatusChange', async () => {
                let updateData: any = { estado: newStatus };

                // Match web: on completion, calculate total and stamp date
                if (newStatus === 'completada') {
                    // Fetch services for this cita to calculate total
                    const { data: citaServicios } = await supabase
                        .from('citas_servicios')
                        .select('precio_actual')
                        .eq('cita_id', cita.id);

                    const total = (citaServicios || []).reduce(
                        (sum: number, cs: any) => sum + (cs.precio_actual || 0), 0
                    );

                    updateData.total_pagado = total;
                    updateData.fecha_completado = new Date().toISOString();
                }

                console.log("[CitaStatusChange] payload", updateData);

                let updateQuery = supabase
                    .from('citas')
                    .update(updateData)
                    .eq('id', cita.id);

                if (negocioId) {
                    updateQuery = updateQuery.eq('negocio_id', negocioId);
                }

                const { data, error } = await updateQuery.select().single();

                if (error) throw error;
                console.log("[CitaStatusChange] success", data);

                Alert.alert('Éxito', `Estado actualizado a: ${newStatus}`);
                onCitaUpdated();
                onDismiss();
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        onDismiss();
        // Navigate to edit screen (to be implemented or reused)
        router.push(`/citas/${cita.id}`);
    };

    const getClienteNombre = () => {
        if (cita.clientes_bot && cita.clientes_bot.nombre) return cita.clientes_bot.nombre;
        if (cita.clientes_bot && cita.clientes_bot[0]?.nombre) return cita.clientes_bot[0].nombre;
        return cita.nombre_cliente_manual || 'Cliente sin nombre';
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onDismiss}
            >
                <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                    <View style={styles.header}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                            {getClienteNombre()}
                        </Text>
                        <Text variant="bodySmall" style={{ color: '#666' }}>
                            {/* Format date/time locally if needed, or pass formatted string */}
                            Acciones Rápidas
                        </Text>
                    </View>
                    <Divider style={{ marginVertical: 10 }} />

                    {loading ? (
                        <View style={{ padding: 20 }}>
                            <ActivityIndicator />
                        </View>
                    ) : (
                        <View style={styles.actionsContainer}>
                            {/* Estados Flow */}
                            <Text variant="labelSmall" style={styles.sectionTitle}>CAMBIAR ESTADO</Text>

                            <View style={styles.statusButtons}>
                                <Button
                                    mode={cita.estado === 'pendiente' || cita.estado === 'pendiente_pago' ? "contained" : "outlined"}
                                    compact
                                    onPress={() => handleStatusChange('confirmada')}
                                    style={styles.actionBtn}
                                >
                                    Confirmar
                                </Button>
                                <Button
                                    mode={cita.estado === 'en_proceso' ? "contained" : "outlined"}
                                    compact
                                    onPress={() => handleStatusChange('en_proceso')}
                                    style={styles.actionBtn}
                                >
                                    En Proceso
                                </Button>
                                <Button
                                    mode={cita.estado === 'completada' ? "contained" : "outlined"}
                                    compact
                                    onPress={() => handleStatusChange('completada')}
                                    style={styles.actionBtn}
                                    textColor={theme.colors.primary}
                                >
                                    Completar
                                </Button>
                            </View>

                            <Divider style={{ marginVertical: 12 }} />

                            {/* Acciones Crud */}
                            <Button
                                icon="pencil"
                                mode="text"
                                onPress={handleEdit}
                                contentStyle={{ justifyContent: 'flex-start' }}
                            >
                                Editar Detalles
                            </Button>

                            <Button
                                icon="cancel"
                                mode="text"
                                textColor="#d32f2f"
                                onPress={() => Alert.alert(
                                    'Cancelar Cita',
                                    '¿Estás seguro de cancelar esta cita?',
                                    [
                                        { text: 'No', style: 'cancel' },
                                        { text: 'Sí, Cancelar', style: 'destructive', onPress: () => handleStatusChange('cancelada') }
                                    ]
                                )}
                                contentStyle={{ justifyContent: 'flex-start' }}
                            >
                                Cancelar Cita
                            </Button>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        elevation: 5,
    },
    header: {
        alignItems: 'center',
    },
    actionsContainer: {
        gap: 8,
    },
    sectionTitle: {
        color: '#888',
        marginBottom: 8,
        textAlign: 'center'
    },
    statusButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8
    },
    actionBtn: {
        flexGrow: 1,
    }
});
