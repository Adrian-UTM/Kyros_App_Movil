import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, Switch, HelperText, useTheme } from 'react-native-paper';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../lib/AppContext';
import { safeAction } from '../lib/safeAction';

interface Servicio {
    id: number;
    nombre: string;
    precio_base: number | null;
    duracion_aprox_minutos: number | null;
    activo?: boolean;
    descripcion?: string;
}

interface ServicioFormModalProps {
    visible: boolean;
    servicio: Servicio | null; // null = crear nuevo
    onDismiss: () => void;
    onServicioGuardado: (servicio: Servicio) => void;
}

export default function ServicioFormModal({ visible, servicio, onDismiss, onServicioGuardado }: ServicioFormModalProps) {
    const theme = useTheme();
    const { negocioId, sucursalId } = useApp();

    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');
    const [duracion, setDuracion] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (servicio) {
            setNombre(servicio.nombre);
            setPrecio(servicio.precio_base?.toString() || '');
            setDuracion(servicio.duracion_aprox_minutos?.toString() || '');
            setDescripcion(servicio.descripcion || '');
        } else {
            setNombre('');
            setPrecio('');
            setDuracion('30'); // Default
            setDescripcion('');
        }
    }, [servicio, visible]);

    const precioNum = parseFloat(precio);
    const duracionNum = parseInt(duracion);

    const isFormValid =
        nombre.trim().length > 0 &&
        !isNaN(precioNum) && precioNum >= 0 &&
        !isNaN(duracionNum) && duracionNum >= 1;

    const handleSave = async () => {
        if (!nombre.trim()) {
            Alert.alert('Error', 'El nombre es obligatorio');
            return;
        }
        if (isNaN(precioNum) || precioNum < 0) {
            Alert.alert('Error', 'El precio debe ser un número mayor o igual a 0');
            return;
        }
        if (isNaN(duracionNum) || duracionNum < 1) {
            Alert.alert('Error', 'La duración debe ser al menos 1 minuto');
            return;
        }

        setLoading(true);
        try {
            await safeAction('ServicioForm', async () => {
                let resultData;

                const payload = {
                    nombre: nombre.trim(),
                    precio_base: precioNum,
                    duracion_aprox_minutos: duracionNum,
                    descripcion: descripcion.trim()
                };
                console.log("[ServicioForm] payload", payload);

                if (servicio) {
                    // UPDATE
                    const { data, error } = await supabase
                        .from('servicios')
                        .update(payload)
                        .eq('id', servicio.id)
                        .eq('negocio_id', negocioId)
                        .select()
                        .single();

                    if (error) throw error;
                    resultData = data;
                } else {
                    // INSERT
                    const insertPayload = {
                        ...payload,
                        negocio_id: negocioId,
                        sucursal_id: sucursalId,
                        activo: true
                    };
                    const { data, error } = await supabase
                        .from('servicios')
                        .insert(insertPayload)
                        .select()
                        .single();

                    if (error) throw error;
                    resultData = data;
                }

                console.log('[ServicioFormModal] operation success:', resultData);
                Alert.alert('Éxito', servicio ? 'Servicio actualizado' : 'Servicio creado');
                onServicioGuardado(resultData);
                onDismiss();
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!servicio) return;

        Alert.alert(
            'Eliminar Servicio',
            '¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await safeAction('ServicioDelete', async () => {
                                const { error } = await supabase
                                    .from('servicios')
                                    .delete()
                                    .eq('id', servicio.id)
                                    .eq('negocio_id', negocioId);

                                if (error) throw error;

                                console.log('[ServicioFormModal] Deleted successfully');
                                Alert.alert('Servicio eliminado');
                                onServicioGuardado(servicio as Servicio);
                                onDismiss();
                            });
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
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
                    <Text variant="headlineSmall" style={styles.title}>
                        {servicio ? 'Editar Servicio' : 'Nuevo Servicio'}
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <TextInput
                            label="Nombre del Servicio *"
                            value={nombre}
                            onChangeText={setNombre}
                            mode="outlined"
                            style={styles.input}
                        />

                        <View style={styles.row}>
                            <TextInput
                                label="Precio ($)"
                                value={precio}
                                onChangeText={setPrecio}
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                            />
                            <TextInput
                                label="Duración (min)"
                                value={duracion}
                                onChangeText={setDuracion}
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                            />
                        </View>

                        <TextInput
                            label="Descripción (Opcional)"
                            value={descripcion}
                            onChangeText={setDescripcion}
                            mode="outlined"
                            multiline
                            numberOfLines={2}
                            style={styles.input}
                        />

                        <View style={styles.actions}>
                            <Button onPress={onDismiss} disabled={loading} style={styles.button}>
                                Cancelar
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleSave}
                                loading={loading}
                                disabled={loading || !isFormValid}
                                style={styles.button}
                            >
                                Guardar
                            </Button>
                        </View>

                        {servicio && (
                            <Button
                                mode="text"
                                textColor="red"
                                onPress={handleDelete}
                                disabled={loading}
                                style={{ marginTop: 20 }}
                            >
                                Eliminar Servicio
                            </Button>
                        )}
                    </ScrollView>
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
        elevation: 5,
        maxHeight: '90%'
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
    row: {
        flexDirection: 'row',
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
