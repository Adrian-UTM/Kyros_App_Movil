import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
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
    const theme = useTheme();
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

    // Validate on every change (after first touch)
    useEffect(() => {
        const newErrors: { nombre?: string; telefono?: string } = {};

        if (touched.nombre && !nombre.trim()) {
            newErrors.nombre = 'El nombre es obligatorio';
        }

        if (touched.telefono) {
            if (!telefono) {
                newErrors.telefono = 'El teléfono es obligatorio';
            } else if (telefono.length < PHONE_MIN_LENGTH) {
                newErrors.telefono = `Mínimo ${PHONE_MIN_LENGTH} dígitos`;
            } else if (telefono.length > PHONE_MAX_LENGTH) {
                newErrors.telefono = `Máximo ${PHONE_MAX_LENGTH} dígitos`;
            }
        }

        setErrors(newErrors);
    }, [nombre, telefono, touched]);

    const isFormValid =
        nombre.trim().length > 0 &&
        telefono.length >= PHONE_MIN_LENGTH &&
        telefono.length <= PHONE_MAX_LENGTH;

    // Sanitize phone: only digits
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
        console.log('[ClienteEditModal] handleSave called', { nombre, telefono, id: cliente?.id });
        // Mark all as touched for final validation display
        setTouched({ nombre: true, telefono: true });

        if (!isFormValid) {
            console.log('[ClienteEditModal] Form invalid, aborting save');
            Alert.alert('Error', 'Por favor, verifica los campos marcados en rojo antes de continuar.');
            return;
        }

        setLoading(true);
        try {
            await safeAction('ClienteEdit', async () => {
                const updatePayload = {
                    nombre: nombre.trim(),
                    telefono: telefono.trim(),
                };

                console.log("[ClienteEditModal] payload", updatePayload);

                let updateQuery = supabase
                    .from('clientes_bot')
                    .update(updatePayload)
                    .eq('id', cliente!.id);

                if (negocioId) {
                    updateQuery = updateQuery.eq('negocio_id', negocioId);
                }

                const { data, error } = await updateQuery
                    .select()
                    .single();

                if (error) throw error;

                console.log('[ClienteEditModal] Cliente actualizado:', data);
                Alert.alert('Éxito', 'Cliente actualizado correctamente');
                onClienteActualizado(data);
                onDismiss();
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onDismiss}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text variant="headlineSmall" style={styles.title}>Editar Cliente</Text>

                    <TextInput
                        label="Nombre Completo *"
                        value={nombre}
                        onChangeText={handleNombreChange}
                        mode="outlined"
                        error={!!errors.nombre}
                        style={styles.input}
                    />
                    {errors.nombre && <Text style={{ color: theme.colors.error, fontSize: 12, marginBottom: 8 }}>{errors.nombre}</Text>}

                    <TextInput
                        label="Teléfono *"
                        value={telefono}
                        onChangeText={handleTelefonoChange}
                        mode="outlined"
                        keyboardType="phone-pad"
                        error={!!errors.telefono}
                        style={styles.input}
                    />
                    {errors.telefono && <Text style={{ color: theme.colors.error, fontSize: 12, marginBottom: 8 }}>{errors.telefono}</Text>}

                    <View style={styles.actions}>
                        <Button onPress={onDismiss} disabled={loading} style={styles.button}>
                            Cancelar
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleSave}
                            loading={loading}
                            disabled={loading}
                            style={styles.button}
                        >
                            Guardar Cambios
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 20,
        elevation: 5
    },
    title: {
        marginBottom: 20,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    input: {
        marginBottom: 12,
        backgroundColor: 'white'
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20
    },
    button: {
        flex: 1,
        marginHorizontal: 5
    }
});
