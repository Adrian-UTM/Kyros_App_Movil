import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Modal, Portal, Text, TextInput, HelperText } from 'react-native-paper';
import KyrosButton from './KyrosButton';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../lib/AppContext';
import { safeAction } from '../lib/safeAction';

interface SucursalData {
    id?: number;
    nombre?: string;
    direccion?: string | null;
    telefono?: string | null;
}

interface Props {
    visible: boolean;
    sucursal?: SucursalData | null;
    onDismiss: () => void;
    onSaved: () => void;
}

export default function SucursalFormModal({ visible, sucursal, onDismiss, onSaved }: Props) {
    const { negocioId } = useApp();
    const isEdit = !!sucursal?.id;

    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [telefono, setTelefono] = useState('');
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState({ nombre: false, direccion: false, telefono: false });

    useEffect(() => {
        if (visible) {
            setNombre(sucursal?.nombre || '');
            setDireccion(sucursal?.direccion || '');
            setTelefono(sucursal?.telefono || '');
            setTouched({ nombre: false, direccion: false, telefono: false });
        }
    }, [visible]);

    // Only digits for phone
    const handlePhoneChange = (text: string) => {
        setTelefono(text.replace(/\D/g, ''));
    };

    const isFormValid =
        nombre.trim().length > 0 &&
        direccion.trim().length > 0 &&
        telefono.length >= 10 && telefono.length <= 15;

    const handleSave = async () => {
        console.log("[Sucursal] onPress Guardar");

        setTouched({ nombre: true, direccion: true, telefono: true });
        if (!isFormValid) {
            Alert.alert('Error', 'Por favor, completa los campos correctamente antes de guardar.');
            return;
        }

        if (!negocioId) {
            Alert.alert('Error', 'No hay negocio_id en AppContext.');
            return;
        }

        setSaving(true);

        try {
            await safeAction('SucursalForm', async () => {
                const branchData = {
                    nombre: nombre.trim(),
                    direccion: direccion.trim(),
                    telefono: telefono,
                    negocio_id: negocioId,
                };

                console.log("[Sucursal] payload", {
                    nombre: branchData.nombre,
                    direccion: branchData.direccion,
                    telefono: branchData.telefono,
                    negocioId: branchData.negocio_id,
                    sucursalIdEdit: sucursal?.id
                });

                if (isEdit && sucursal?.id) {
                    const result = await supabase
                        .from('sucursales')
                        .update(branchData)
                        .eq('id', sucursal.id)
                        .eq('negocio_id', negocioId)
                        .select()
                        .single();

                    console.log("[Sucursal] result", result);
                    if (result.error) throw result.error;
                } else {
                    const result = await supabase
                        .from('sucursales')
                        .insert(branchData)
                        .select()
                        .single();

                    console.log("[Sucursal] result", result);
                    if (result.error) throw result.error;
                }

                Alert.alert('Éxito', 'Sucursal guardada');
                onSaved();
                onDismiss();
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={styles.modal}
            >
                <Text variant="titleLarge" style={styles.title}>
                    {isEdit ? 'Editar Sucursal' : 'Nueva Sucursal'}
                </Text>

                {/* Nombre */}
                <TextInput
                    label="Nombre *"
                    mode="outlined"
                    value={nombre}
                    onChangeText={setNombre}
                    onBlur={() => setTouched(t => ({ ...t, nombre: true }))}
                    style={styles.input}
                />
                {touched.nombre && nombre.trim().length === 0 && (
                    <HelperText type="error" visible>El nombre es requerido</HelperText>
                )}

                {/* Dirección */}
                <TextInput
                    label="Dirección *"
                    mode="outlined"
                    value={direccion}
                    onChangeText={setDireccion}
                    onBlur={() => setTouched(t => ({ ...t, direccion: true }))}
                    style={styles.input}
                />
                {touched.direccion && direccion.trim().length === 0 && (
                    <HelperText type="error" visible>La dirección es requerida</HelperText>
                )}

                {/* Teléfono */}
                <TextInput
                    label="Teléfono *"
                    mode="outlined"
                    value={telefono}
                    onChangeText={handlePhoneChange}
                    onBlur={() => setTouched(t => ({ ...t, telefono: true }))}
                    keyboardType="phone-pad"
                    maxLength={15}
                    style={styles.input}
                />
                {touched.telefono && (telefono.length < 10 || telefono.length > 15) && (
                    <HelperText type="error" visible>
                        {telefono.length === 0 ? 'El teléfono es requerido' : `Mínimo 10 dígitos (${telefono.length}/10)`}
                    </HelperText>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                    <KyrosButton mode="outlined" onPress={onDismiss} style={styles.actionBtn}>
                        Cancelar
                    </KyrosButton>
                    <KyrosButton
                        mode="contained"
                        onPress={handleSave}
                        disabled={!isFormValid || saving}
                        loading={saving}
                        style={styles.actionBtn}
                    >
                        {isEdit ? 'Actualizar' : 'Guardar'}
                    </KyrosButton>
                </View>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    modal: {
        backgroundColor: 'white',
        margin: 20,
        padding: 20,
        borderRadius: 12,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        marginBottom: 4,
        backgroundColor: 'white',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
    },
});
