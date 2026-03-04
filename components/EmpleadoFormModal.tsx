import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Modal, Portal, Text, TextInput, HelperText, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import KyrosButton from './KyrosButton';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../lib/AppContext';
import { safeAction } from '../lib/safeAction';

interface Sucursal {
    id: number;
    nombre: string;
}

interface Servicio {
    id: number;
    nombre: string;
}

interface EmpleadoData {
    id?: number;
    nombre?: string;
    especialidad?: string | null;
    sucursal_id?: number | null;
}

interface Props {
    visible: boolean;
    empleado?: EmpleadoData | null; // null = crear, object = editar
    onDismiss: () => void;
    onSaved: () => void;
}

export default function EmpleadoFormModal({ visible, empleado, onDismiss, onSaved }: Props) {
    const { negocioId, sucursalId, rol } = useApp();
    const isEdit = !!empleado?.id;

    // Form fields
    const [nombre, setNombre] = useState('');
    const [especialidad, setEspecialidad] = useState('');
    const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);
    const [selectedServiciosIds, setSelectedServiciosIds] = useState<number[]>([]);

    // Data
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);

    // State
    const [saving, setSaving] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [touched, setTouched] = useState({ nombre: false, especialidad: false, sucursal: false });

    // Reset form when modal opens
    useEffect(() => {
        if (visible) {
            setNombre(empleado?.nombre || '');
            setEspecialidad(empleado?.especialidad || '');
            setSelectedSucursalId(empleado?.sucursal_id || (rol === 'sucursal' ? sucursalId : null));
            setSelectedServiciosIds([]);
            setTouched({ nombre: false, especialidad: false, sucursal: false });
            loadFormData();
        }
    }, [visible]);

    const loadFormData = async () => {
        if (!negocioId) return;
        setLoadingData(true);
        try {
            // Load sucursales (only for owners)
            if (rol !== 'sucursal') {
                const { data: suc } = await supabase
                    .from('sucursales')
                    .select('id, nombre')
                    .eq('negocio_id', negocioId);
                setSucursales(suc || []);
            }

            // Load servicios
            let svcQuery = supabase
                .from('servicios')
                .select('id, nombre')
                .eq('negocio_id', negocioId);

            if (rol === 'sucursal' && sucursalId) {
                svcQuery = svcQuery.or(`sucursal_id.eq.${sucursalId},sucursal_id.is.null`);
            }

            const { data: svc } = await svcQuery;
            setServicios(svc || []);

            // If editing, load assigned services
            if (isEdit && empleado?.id) {
                const { data: empSvc } = await supabase
                    .from('empleado_servicios')
                    .select('servicio_id')
                    .eq('empleado_id', empleado.id);
                if (empSvc) {
                    setSelectedServiciosIds(empSvc.map(es => es.servicio_id));
                }
            }
        } catch (err) {
            console.error('Error loading form data:', err);
        } finally {
            setLoadingData(false);
        }
    };

    const toggleServicio = (id: number) => {
        setSelectedServiciosIds(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const isFormValid =
        nombre.trim().length > 0 &&
        especialidad.trim().length > 0 &&
        (rol === 'sucursal' ? !!sucursalId : !!selectedSucursalId);

    const handleSave = async () => {
        console.log('[EmpleadoFormModal] handleSave called');
        setTouched({ nombre: true, especialidad: true, sucursal: true });

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
            await safeAction('EmpleadoForm', async () => {
                const finalSucursalId = rol === 'sucursal' ? sucursalId : selectedSucursalId;

                const employeeData = {
                    nombre: nombre.trim(),
                    especialidad: especialidad.trim(),
                    sucursal_id: finalSucursalId,
                    negocio_id: negocioId,
                };
                console.log("[EmpleadoForm] payload", employeeData);

                let employeeId: number;

                if (isEdit && empleado?.id) {
                    const { error } = await supabase
                        .from('empleados')
                        .update(employeeData)
                        .eq('id', empleado.id)
                        .eq('negocio_id', negocioId);
                    if (error) throw error;
                    employeeId = empleado.id;
                } else {
                    const { data, error } = await supabase
                        .from('empleados')
                        .insert(employeeData)
                        .select('id')
                        .single();
                    if (error) throw error;
                    employeeId = data.id;
                }

                console.log(`[EmpleadoFormModal] Saved employeeId ${employeeId}, processing services...`);

                // Upsert empleado_servicios
                await supabase
                    .from('empleado_servicios')
                    .delete()
                    .eq('empleado_id', employeeId);

                if (selectedServiciosIds.length > 0) {
                    const rows = selectedServiciosIds.map(sid => ({
                        empleado_id: employeeId,
                        servicio_id: sid,
                    }));
                    const { error: svcError } = await supabase
                        .from('empleado_servicios')
                        .insert(rows);
                    if (svcError) console.warn('Error saving empleado_servicios:', svcError);
                }

                Alert.alert('Éxito', 'Empleado guardado correctamente');
                onSaved();
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
                <ScrollView>
                    <Text variant="titleLarge" style={styles.title}>
                        {isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}
                    </Text>

                    {loadingData && <ActivityIndicator style={{ marginVertical: 16 }} />}

                    {!loadingData && (
                        <>
                            {/* Nombre Completo */}
                            <TextInput
                                label="Nombre Completo *"
                                mode="outlined"
                                value={nombre}
                                onChangeText={setNombre}
                                onBlur={() => setTouched(t => ({ ...t, nombre: true }))}
                                style={styles.input}
                            />
                            {touched.nombre && nombre.trim().length === 0 && (
                                <HelperText type="error" visible>El nombre completo es requerido</HelperText>
                            )}

                            {/* Especialidad */}
                            <TextInput
                                label="Especialidad *"
                                mode="outlined"
                                value={especialidad}
                                onChangeText={setEspecialidad}
                                onBlur={() => setTouched(t => ({ ...t, especialidad: true }))}
                                style={styles.input}
                            />
                            {touched.especialidad && especialidad.trim().length === 0 && (
                                <HelperText type="error" visible>La especialidad es requerida</HelperText>
                            )}

                            {/* Sucursal selector (only for owners) */}
                            {rol !== 'sucursal' && (
                                <>
                                    <Text variant="labelLarge" style={styles.sectionLabel}>Sucursal *</Text>
                                    <View style={styles.chipContainer}>
                                        {sucursales.map(s => (
                                            <Chip
                                                key={s.id}
                                                selected={selectedSucursalId === s.id}
                                                onPress={() => setSelectedSucursalId(s.id)}
                                                style={styles.chip}
                                            >
                                                {s.nombre}
                                            </Chip>
                                        ))}
                                    </View>
                                    {touched.sucursal && !selectedSucursalId && (
                                        <HelperText type="error" visible>Selecciona una sucursal</HelperText>
                                    )}
                                </>
                            )}

                            {/* Servicios multi-select */}
                            {servicios.length > 0 && (
                                <>
                                    <Divider style={{ marginVertical: 12 }} />
                                    <Text variant="labelLarge" style={styles.sectionLabel}>
                                        Servicios que realiza ({selectedServiciosIds.length})
                                    </Text>
                                    <View style={styles.chipContainer}>
                                        {servicios.map(s => (
                                            <Chip
                                                key={s.id}
                                                selected={selectedServiciosIds.includes(s.id)}
                                                onPress={() => toggleServicio(s.id)}
                                                style={styles.chip}
                                            >
                                                {s.nombre}
                                            </Chip>
                                        ))}
                                    </View>
                                </>
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
                        </>
                    )}
                </ScrollView>
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
        maxHeight: '85%',
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
    sectionLabel: {
        marginTop: 8,
        marginBottom: 8,
        fontWeight: '600',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        marginBottom: 4,
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
