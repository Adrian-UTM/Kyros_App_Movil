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
    cuenta_email?: string | null;
    cuenta_password?: string | null;
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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState({ nombre: false, direccion: false, telefono: false, email: false, password: false });

    useEffect(() => {
        if (visible) {
            setNombre(sucursal?.nombre || '');
            setDireccion(sucursal?.direccion || '');
            setTelefono(sucursal?.telefono || '');
            setEmail(sucursal?.cuenta_email || '');
            setPassword(sucursal?.cuenta_password || '');
            setTouched({ nombre: false, direccion: false, telefono: false, email: false, password: false });
            setShowPassword(false);
        }
    }, [visible]);

    // Only digits for phone
    const handlePhoneChange = (text: string) => {
        setTelefono(text.replace(/\D/g, ''));
    };

    const isEmailValid = email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPasswordValid = isEdit ? true : password.length >= 6;

    const isFormValid =
        nombre.trim().length > 0 &&
        direccion.trim().length > 0 &&
        telefono.length >= 10 && telefono.length <= 15 &&
        isEmailValid &&
        isPasswordValid;

    const handleSave = async () => {
        console.log("[Sucursal] onPress Guardar");

        setTouched({ nombre: true, direccion: true, telefono: true, email: true, password: true });
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
                const branchData: any = {
                    nombre: nombre.trim(),
                    direccion: direccion.trim(),
                    telefono: telefono,
                    cuenta_email: email.trim(),
                    negocio_id: negocioId,
                };

                if (password.trim().length > 0) {
                    branchData.cuenta_password = password;
                }

                console.log("[Sucursal] payload", {
                    ...branchData,
                    sucursalIdEdit: sucursal?.id
                });

                let result;

                if (isEdit && sucursal?.id) {
                    result = await supabase
                        .from('sucursales')
                        .update(branchData)
                        .eq('id', sucursal.id)
                        .eq('negocio_id', negocioId)
                        .select()
                        .single();

                    if (result.error) throw result.error;
                } else {
                    result = await supabase
                        .from('sucursales')
                        .insert(branchData)
                        .select()
                        .single();

                    if (result.error) throw result.error;
                }

                const savedBranch = result.data;

                // Call edge function IF password is provided
                if (password.trim().length > 0) {
                    const { data: fnData, error: fnError } = await supabase.functions.invoke('create-branch-user', {
                        body: {
                            email: email.trim(),
                            password: password,
                            sucursalId: savedBranch.id,
                            negocioId: negocioId
                        }
                    });

                    if (fnError) {
                        console.error('Error creating auth user:', fnError);
                        Alert.alert('Aviso', 'Sucursal guardada, pero hubo un error con la cuenta de usuario (Auth).');
                    }
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

                {/* Correo */}
                <TextInput
                    label="Correo de la Sucursal *"
                    mode="outlined"
                    value={email}
                    onChangeText={setEmail}
                    onBlur={() => setTouched(t => ({ ...t, email: true }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                />
                {touched.email && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && (
                    <HelperText type="error" visible>Ingresa un correo válido</HelperText>
                )}

                {/* Contraseña */}
                <TextInput
                    label="Contraseña *"
                    mode="outlined"
                    value={password}
                    onChangeText={setPassword}
                    onBlur={() => setTouched(t => ({ ...t, password: true }))}
                    secureTextEntry={!showPassword}
                    right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
                    style={styles.input}
                />
                {touched.password && !isEdit && password.length < 6 && (
                    <HelperText type="error" visible>La contraseña debe tener al menos 6 caracteres</HelperText>
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
