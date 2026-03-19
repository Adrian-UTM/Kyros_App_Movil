import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, HelperText, ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { safeAction } from '../lib/safeAction';
import { useKyrosPalette } from '../lib/useKyrosPalette';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';

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
    const theme = useTheme();
    const palette = useKyrosPalette();
    const responsive = useResponsiveLayout();
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
            <View style={[styles.overlay, { backgroundColor: palette.overlay }]}>
                <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.borderStrong, width: '100%', maxWidth: responsive.modalMaxWidth, alignSelf: 'center' }]}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={[styles.headerIcon, { backgroundColor: palette.selectedBg }]}>
                                <MaterialIcons name="edit" size={28} color={theme.colors.primary} />
                            </View>
                            <Text style={[styles.title, { color: palette.textStrong }]}>Editar Cliente</Text>
                            <Text style={[styles.subtitle, { color: palette.textSoft }]}>Modifica los datos del cliente</Text>
                        </View>

                        {/* Form */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="person" size={18} color={theme.colors.primary} />
                                <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>Información</Text>
                            </View>

                            <TextInput
                                label="Nombre Completo *"
                                value={nombre}
                                onChangeText={handleNombreChange}
                                mode="outlined"
                                error={!!errors.nombre}
                                style={[styles.input, { backgroundColor: palette.inputBg }]}
                                textColor={palette.text}
                                outlineColor={palette.border}
                                activeOutlineColor={theme.colors.primary}
                                theme={{ colors: { onSurfaceVariant: palette.textMuted } }}
                            />
                            {errors.nombre && <HelperText type="error" visible>{errors.nombre}</HelperText>}

                            <TextInput
                                label="Teléfono *"
                                value={telefono}
                                onChangeText={handleTelefonoChange}
                                mode="outlined"
                                keyboardType="phone-pad"
                                error={!!errors.telefono}
                                style={[styles.input, { backgroundColor: palette.inputBg }]}
                                textColor={palette.text}
                                outlineColor={palette.border}
                                activeOutlineColor={theme.colors.primary}
                                theme={{ colors: { onSurfaceVariant: palette.textMuted } }}
                            />
                            {errors.telefono && <HelperText type="error" visible>{errors.telefono}</HelperText>}
                        </View>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={onDismiss} disabled={loading} style={[styles.cancelBtn, { borderColor: palette.border }]}>
                                <Text style={{ color: palette.textMuted, fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={loading}
                                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }, loading && { opacity: 0.5 }]}
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
