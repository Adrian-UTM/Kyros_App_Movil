import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Alert } from 'react-native';
import { Text, TextInput, HelperText, useTheme } from 'react-native-paper';
import KyrosButton from './KyrosButton';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../lib/AppContext';
import { safeAction } from '../lib/safeAction';

const PHONE_MIN_LENGTH = 10;
const PHONE_MAX_LENGTH = 15;

interface ClienteNuevoModalProps {
    visible: boolean;
    onDismiss: () => void;
    onClienteCreado: (cliente: { id: number; nombre: string; telefono: string }) => void;
}

export default function ClienteNuevoModal({ visible, onDismiss, onClienteCreado }: ClienteNuevoModalProps) {
    const theme = useTheme();
    const { negocioId, sucursalId, rol } = useApp();

    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ nombre?: string; telefono?: string }>({});
    const [touched, setTouched] = useState<{ nombre?: boolean; telefono?: boolean }>({});

    // Reset fields when modal opens/closes
    useEffect(() => {
        if (visible) {
            setNombre('');
            setTelefono('');

            setErrors({});
            setTouched({});
        }
    }, [visible]);

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

    const handleGuardar = async () => {
        console.log('[ClienteNuevoModal] handleGuardar called', {
            nombre: nombre.trim(),
            telefono,
            telefonoLength: telefono.length,
            isFormValid,
            negocioId,
        });

        // Mark all as touched for final validation display
        setTouched({ nombre: true, telefono: true });

        if (!isFormValid) {
            console.log('[ClienteNuevoModal] Form invalid, aborting save');
            Alert.alert('Error', 'Por favor, completa los campos correctamente antes de guardar.');
            return;
        }

        if (!negocioId) {
            Alert.alert('Error', 'No se ha identificado el negocio');
            return;
        }

        setLoading(true);
        try {
            await safeAction('ClienteNuevo', async () => {
                const insertData: any = {
                    nombre: nombre.trim(),
                    telefono: telefono.trim(),
                    negocio_id: negocioId
                };

                // Branch users: associate client with their branch (matches web behavior)
                if (rol === 'sucursal' && sucursalId) {
                    insertData.sucursal_id = sucursalId;
                }

                console.log("[ClienteNuevoModal] payload", insertData);

                const { data, error } = await supabase
                    .from('clientes_bot')
                    .insert(insertData)
                    .select('id, nombre, telefono')
                    .single();

                if (error) throw error;

                // Evidence: log the inserted record
                console.log('[ClienteNuevoModal] Cliente insertado:', {
                    id: data.id,
                    nombre: data.nombre,
                    telefono: data.telefono
                });

                Alert.alert('Éxito', 'Cliente guardado correctamente.');

                if (data) {
                    onClienteCreado(data);
                }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onDismiss}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text variant="headlineSmall" style={styles.title}>Nuevo Cliente</Text>

                    {/* Nombre */}
                    <TextInput
                        label="Nombre Completo *"
                        mode="outlined"
                        value={nombre}
                        onChangeText={handleNombreChange}
                        error={!!errors.nombre}
                        style={styles.input}
                    />
                    {errors.nombre && (
                        <HelperText type="error" visible={true}>{errors.nombre}</HelperText>
                    )}

                    {/* Teléfono */}
                    <TextInput
                        label="Teléfono *"
                        mode="outlined"
                        value={telefono}
                        onChangeText={handleTelefonoChange}
                        keyboardType="number-pad"
                        maxLength={PHONE_MAX_LENGTH}
                        error={!!errors.telefono}
                        style={styles.input}
                        right={
                            telefono.length > 0
                                ? <TextInput.Affix text={`${telefono.length}/${PHONE_MIN_LENGTH}`} />
                                : undefined
                        }
                    />
                    {errors.telefono && (
                        <HelperText type="error" visible={true}>{errors.telefono}</HelperText>
                    )}

                    <View style={styles.actions}>
                        <KyrosButton
                            mode="outlined"
                            onPress={onDismiss}
                            style={styles.button}
                            disabled={loading}
                        >
                            Cancelar
                        </KyrosButton>
                        <KyrosButton
                            mode="contained"
                            onPress={handleGuardar}
                            style={styles.button}
                            loading={loading}
                            disabled={loading || !isFormValid}
                        >
                            Guardar
                        </KyrosButton>
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
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 20,
        elevation: 5,
    },
    title: {
        marginBottom: 16,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    input: {
        marginBottom: 4,
        backgroundColor: 'white',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        gap: 10,
    },
    button: {
        flex: 1,
    }
});
