import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Modal, TouchableOpacity } from 'react-native';
import { Text, TextInput, HelperText, ActivityIndicator, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../lib/AppContext';
import { safeAction } from '../lib/safeAction';

interface Sucursal { id: number; nombre: string; }
interface Servicio { id: number; nombre: string; }

interface EmpleadoData {
    id?: number;
    nombre?: string;
    especialidad?: string | null;
    sucursal_id?: number | null;
}

interface Props {
    visible: boolean;
    empleado?: EmpleadoData | null;
    onDismiss: () => void;
    onSaved: () => void;
}

export default function EmpleadoFormModal({ visible, empleado, onDismiss, onSaved }: Props) {
    const { negocioId, sucursalId, rol } = useApp();
    const isEdit = !!empleado?.id;

    const [nombre, setNombre] = useState('');
    const [especialidad, setEspecialidad] = useState('');
    const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);
    const [selectedServiciosIds, setSelectedServiciosIds] = useState<number[]>([]);

    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);

    const [saving, setSaving] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [touched, setTouched] = useState({ nombre: false, especialidad: false, sucursal: false });

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
            if (rol !== 'sucursal') {
                const { data: suc } = await supabase.from('sucursales').select('id, nombre').eq('negocio_id', negocioId);
                setSucursales(suc || []);
            }

            let svcQuery = supabase.from('servicios').select('id, nombre').eq('negocio_id', negocioId);
            if (rol === 'sucursal' && sucursalId) svcQuery = svcQuery.or(`sucursal_id.eq.${sucursalId},sucursal_id.is.null`);
            const { data: svc } = await svcQuery;
            setServicios(svc || []);

            if (isEdit && empleado?.id) {
                const { data: empSvc } = await supabase.from('empleado_servicios').select('servicio_id').eq('empleado_id', empleado.id);
                if (empSvc) setSelectedServiciosIds(empSvc.map(es => es.servicio_id));
            }
        } catch (err) {
            console.error('Error loading form data:', err);
        } finally {
            setLoadingData(false);
        }
    };

    const toggleServicio = (id: number) => {
        setSelectedServiciosIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const isFormValid = nombre.trim().length > 0 && especialidad.trim().length > 0 && (rol === 'sucursal' ? !!sucursalId : !!selectedSucursalId);

    const handleSave = async () => {
        setTouched({ nombre: true, especialidad: true, sucursal: true });
        if (!isFormValid) { Alert.alert('Error', 'Completa los campos correctamente.'); return; }
        if (!negocioId) { Alert.alert('Error', 'No hay negocio_id.'); return; }

        setSaving(true);
        try {
            await safeAction('EmpleadoForm', async () => {
                const finalSucursalId = rol === 'sucursal' ? sucursalId : selectedSucursalId;
                const employeeData = { nombre: nombre.trim(), especialidad: especialidad.trim(), sucursal_id: finalSucursalId, negocio_id: negocioId };

                let employeeId: number;

                if (isEdit && empleado?.id) {
                    const { error } = await supabase.from('empleados').update(employeeData).eq('id', empleado.id).eq('negocio_id', negocioId);
                    if (error) throw error;
                    employeeId = empleado.id;
                } else {
                    const { data, error } = await supabase.from('empleados').insert(employeeData).select('id').single();
                    if (error) throw error;
                    employeeId = data.id;
                }

                await supabase.from('empleado_servicios').delete().eq('empleado_id', employeeId);
                if (selectedServiciosIds.length > 0) {
                    const rows = selectedServiciosIds.map(sid => ({ empleado_id: employeeId, servicio_id: sid }));
                    await supabase.from('empleado_servicios').insert(rows);
                }

                Alert.alert('Éxito', 'Empleado guardado correctamente');
                onSaved();
            });
        } finally {
            setSaving(false);
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
                                <MaterialIcons name={isEdit ? "edit" : "person-add"} size={28} color="#38bdf8" />
                            </View>
                            <Text style={styles.title}>{isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}</Text>
                            <Text style={styles.subtitle}>{isEdit ? 'Actualiza los datos' : 'Agrega un nuevo miembro'}</Text>
                        </View>

                        {loadingData && <ActivityIndicator style={{ marginVertical: 20 }} color="#38bdf8" />}

                        {!loadingData && (
                            <>
                                {/* Basic Info */}
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <MaterialIcons name="badge" size={18} color="#38bdf8" />
                                        <Text style={styles.sectionTitle}>Datos Básicos</Text>
                                    </View>

                                    <TextInput
                                        mode="outlined"
                                        label="Nombre Completo *"
                                        value={nombre}
                                        onChangeText={setNombre}
                                        error={touched.nombre && !nombre.trim()}
                                        onBlur={() => setTouched(t => ({ ...t, nombre: true }))}
                                        style={styles.input}
                                        textColor="#e2e8f0"
                                        outlineColor="#334155"
                                        activeOutlineColor="#38bdf8"
                                        theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                                    />
                                    {touched.nombre && !nombre.trim() && <HelperText type="error" visible>El nombre es requerido</HelperText>}

                                    <TextInput
                                        mode="outlined"
                                        label="Especialidad (ej. Barbero) *"
                                        value={especialidad}
                                        onChangeText={setEspecialidad}
                                        onBlur={() => setTouched(t => ({ ...t, especialidad: true }))}
                                        style={styles.input}
                                        textColor="#e2e8f0"
                                        outlineColor="#334155"
                                        activeOutlineColor="#38bdf8"
                                        theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                                    />
                                    {touched.especialidad && !especialidad.trim() && <HelperText type="error" visible>La especialidad es requerida</HelperText>}
                                </View>

                                {/* Sucursal */}
                                {rol !== 'sucursal' && (
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <MaterialIcons name="store" size={18} color="#38bdf8" />
                                            <Text style={styles.sectionTitle}>Sucursal *</Text>
                                        </View>
                                        <View style={styles.chipContainer}>
                                            {sucursales.map(s => {
                                                const selected = selectedSucursalId === s.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={s.id}
                                                        onPress={() => setSelectedSucursalId(s.id)}
                                                        style={[styles.chip, selected && styles.chipSelected]}
                                                    >
                                                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{s.nombre}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                        {touched.sucursal && !selectedSucursalId && <HelperText type="error" visible>Selecciona una sucursal</HelperText>}
                                    </View>
                                )}

                                {/* Servicios */}
                                {servicios.length > 0 && (
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <MaterialIcons name="content-cut" size={18} color="#38bdf8" />
                                            <Text style={styles.sectionTitle}>Servicios ({selectedServiciosIds.length})</Text>
                                        </View>
                                        <View style={styles.chipContainer}>
                                            {servicios.map(s => {
                                                const selected = selectedServiciosIds.includes(s.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={s.id}
                                                        onPress={() => toggleServicio(s.id)}
                                                        style={[styles.chip, selected && styles.chipSelected]}
                                                    >
                                                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{s.nombre}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {/* Actions */}
                                <View style={styles.actions}>
                                    <TouchableOpacity onPress={onDismiss} style={styles.cancelBtn}>
                                        <Text style={{ color: '#94a3b8', fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleSave}
                                        disabled={!isFormValid || saving}
                                        style={[styles.saveBtn, (!isFormValid || saving) && { opacity: 0.5 }]}
                                    >
                                        {saving ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{isEdit ? 'Actualizar' : 'Guardar'}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
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
        maxHeight: '90%',
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
        marginBottom: 16,
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
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
    },
    chipSelected: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderColor: '#38bdf8',
    },
    chipText: {
        color: '#94a3b8',
        fontSize: 14,
    },
    chipTextSelected: {
        color: '#38bdf8',
        fontWeight: '600',
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
