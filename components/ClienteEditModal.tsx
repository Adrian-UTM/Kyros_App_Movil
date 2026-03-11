import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, HelperText, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { safeAction } from '../lib/safeAction';

interface Cliente {
    id: number;
    nombre: string;
    telefono: string | null;
}

interface ClienteEditModalProps {
    visible: boolean;
    cliente: Cliente | null;
    negocioId: string | null;
    onDismiss: () => void;
    onClienteActualizado: (cliente: Cliente) => void;
}

export default function ClienteEditModal({ visible, cliente, negocioId, onDismiss, onClienteActualizado }: ClienteEditModalProps) {
    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ nombre?: string; telefono?: string }>({});
    const [touched, setTouched] = useState<{ nombre?: boolean; telefono?: boolean }>({});

    const PHONE_MIN_LENGTH = 10;
    const PHONE_MAX_LENGTH = 15;

    useEffect(() => {
        if (visible && cliente) {
            setNombre(cliente.nombre);
            setTelefono(cliente.telefono || '');
            setErrors({});
            setTouched({});
        }
    }, [visible, cliente]);

    useEffect(() => {
        const newErrors: { nombre?: string; telefono?: string } = {};
        if (touched.nombre && !nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
        if (touched.telefono) {
            if (!telefono) newErrors.telefono = 'El teléfono es obligatorio';
            else if (telefono.length < PHONE_MIN_LENGTH) newErrors.telefono = `Mínimo ${PHONE_MIN_LENGTH} dígitos`;
            else if (telefono.length > PHONE_MAX_LENGTH) newErrors.telefono = `Máximo ${PHONE_MAX_LENGTH} dígitos`;
        }
        setErrors(newErrors);
    }, [nombre, telefono, touched]);

    const isFormValid = nombre.trim().length > 0 && telefono.length >= PHONE_MIN_LENGTH && telefono.length <= PHONE_MAX_LENGTH;

    const handleTelefonoChange = (text: string) => {
        const sanitized = text.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH);
        setTelefono(sanitized);
        if (!touched.telefono) setTouched(prev => ({ ...prev, telefono: true }));
    };

    const handleNombreChange = (text: string) => {
        setNombre(text);
        if (!touched.nombre) setTouched(prev => ({ ...prev, nombre: true }));
    };

    const handleSave = async () => {
        setTouched({ nombre: true, telefono: true });
        if (!isFormValid) { Alert.alert('Error', 'Verifica los campos marcados en rojo.'); return; }

        setLoading(true);
        try {
            await safeAction('ClienteEdit', async () => {
                const updatePayload = { nombre: nombre.trim(), telefono: telefono.trim() };
                let updateQuery = supabase.from('clientes_bot').update(updatePayload).eq('id', cliente!.id);
                if (negocioId) updateQuery = updateQuery.eq('negocio_id', negocioId);

                const { data, error } = await updateQuery.select().single();
                if (error) throw error;

                Alert.alert('Éxito', 'Cliente actualizado correctamente');
                onClienteActualizado(data);
                onDismiss();
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerIcon}>
                                <MaterialIcons name="edit" size={28} color="#38bdf8" />
                            </View>
                            <Text style={styles.title}>Editar Cliente</Text>
                            <Text style={styles.subtitle}>Modifica los datos del cliente</Text>
                        </View>

                        {/* Form */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="person" size={18} color="#38bdf8" />
                                <Text style={styles.sectionTitle}>Información</Text>
                            </View>

                            <TextInput
                                label="Nombre Completo *"
                                value={nombre}
                                onChangeText={handleNombreChange}
                                mode="outlined"
                                error={!!errors.nombre}
                                style={styles.input}
                                textColor="#e2e8f0"
                                outlineColor="#334155"
                                activeOutlineColor="#38bdf8"
                                theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                            />
                            {errors.nombre && <HelperText type="error" visible>{errors.nombre}</HelperText>}

                            <TextInput
                                label="Teléfono *"
                                value={telefono}
                                onChangeText={handleTelefonoChange}
                                mode="outlined"
                                keyboardType="phone-pad"
                                error={!!errors.telefono}
                                style={styles.input}
                                textColor="#e2e8f0"
                                outlineColor="#334155"
                                activeOutlineColor="#38bdf8"
                                theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                            />
                            {errors.telefono && <HelperText type="error" visible>{errors.telefono}</HelperText>}
                        </View>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={onDismiss} disabled={loading} style={styles.cancelBtn}>
                                <Text style={{ color: '#94a3b8', fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={loading}
                                style={[styles.saveBtn, loading && { opacity: 0.5 }]}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Guardar Cambios</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: '#334155',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f1f5f9',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    section: {
        marginBottom: 12,
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
    input: {
        marginBottom: 6,
        backgroundColor: '#0f172a',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    saveBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#2563eb',
    },
});
