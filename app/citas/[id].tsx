import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, useTheme, ActivityIndicator, Divider, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import KyrosButton from '../../components/KyrosButton';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import { safeAction } from '../../lib/safeAction';

// ============================================================
// TIPOS
// ============================================================
interface Servicio {
    id: number;
    nombre: string;
    precio_base: number;
    duracion_aprox_minutos: number;
}

interface Empleado {
    id: number;
    nombre: string;
    sucursal_id: number | null;
    servicios_ids?: number[];
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function EditarCitaScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const citaId = Number(id);

    const { negocioId, sucursalId: contextSucursalId, rol, isLoading: appLoading } = useApp();

    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);

    // Form fields
    const [clienteNombre, setClienteNombre] = useState('');
    const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);
    const [selectedServiciosIds, setSelectedServiciosIds] = useState<number[]>([]);
    const [empleadoId, setEmpleadoId] = useState<number | null>(null);
    const [fechaSeleccionada, setFechaSeleccionada] = useState('');
    const [hora, setHora] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Data
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);

    // Load cita + related data
    useEffect(() => {
        if (!appLoading && negocioId && citaId) {
            loadCita();
        }
    }, [appLoading, negocioId, citaId]);

    const loadCita = async () => {
        setLoading(true);
        try {
            // Fetch the cita
            const { data: cita, error: citaErr } = await supabase
                .from('citas')
                .select(`
                    id, fecha_hora_inicio, fecha_hora_fin, estado,
                    empleado_id, sucursal_id, cliente_id, monto_total,
                    nombre_cliente_manual,
                    clientes_bot!cliente_id(nombre),
                    citas_servicios(servicio_id)
                `)
                .eq('id', citaId)
                .eq('negocio_id', negocioId)
                .single();

            if (citaErr || !cita) {
                setNotFound(true);
                return;
            }

            // Set form values from cita
            const startDate = new Date(cita.fecha_hora_inicio);
            const y = startDate.getFullYear();
            const m = String(startDate.getMonth() + 1).padStart(2, '0');
            const d = String(startDate.getDate()).padStart(2, '0');
            setFechaSeleccionada(`${y}-${m}-${d}`);

            const hh = String(startDate.getHours()).padStart(2, '0');
            const mm = String(startDate.getMinutes()).padStart(2, '0');
            setHora(`${hh}:${mm}`);

            setSelectedSucursalId(cita.sucursal_id);
            setEmpleadoId(cita.empleado_id);

            // Client name
            const clientArr = cita.clientes_bot as any;
            if (clientArr && clientArr[0]?.nombre) {
                setClienteNombre(clientArr[0].nombre);
            } else if (cita.nombre_cliente_manual) {
                setClienteNombre(cita.nombre_cliente_manual);
            }

            // Selected services
            const svcIds = ((cita.citas_servicios || []) as any[]).map((cs: any) => cs.servicio_id);
            setSelectedServiciosIds(svcIds);

            // Load related data
            await loadFormData();

        } catch (err) {
            console.error('Error loading cita:', err);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    const loadFormData = async () => {
        if (!negocioId) return;
        try {
            // Servicios
            const { data: servData } = await supabase
                .from('servicios')
                .select('id, nombre, precio_base, duracion_aprox_minutos')
                .eq('negocio_id', negocioId)
                .eq('activo', true)
                .order('nombre');
            setServicios(servData || []);

            // Empleados + servicios
            const { data: empData } = await supabase
                .from('empleados')
                .select(`id, nombre, sucursal_id, empleado_servicios(servicio_id)`)
                .eq('negocio_id', negocioId)
                .order('nombre');

            const empleadosMapeados: Empleado[] = (empData || []).map((e: any) => ({
                id: e.id,
                nombre: e.nombre,
                sucursal_id: e.sucursal_id,
                servicios_ids: e.empleado_servicios?.map((es: any) => es.servicio_id) || [],
            }));
            setEmpleados(empleadosMapeados);
        } catch (err) {
            console.error('Error loading form data:', err);
        }
    };

    // Filter employees by sucursal and selected services
    const empleadosFiltrados = empleados.filter(e => {
        const matchSucursal = !e.sucursal_id || e.sucursal_id === selectedSucursalId;
        if (!matchSucursal) return false;

        if (selectedServiciosIds.length > 0 && e.servicios_ids) {
            return selectedServiciosIds.every(sId => e.servicios_ids!.includes(sId));
        }
        return true;
    });

    const toggleServicio = (id: number) => {
        setSelectedServiciosIds(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
        setErrors(prev => ({ ...prev, servicios: '' }));
    };

    const validate = () => {
        const newErrors: any = {};
        if (selectedServiciosIds.length === 0) newErrors.servicios = 'Selecciona al menos un servicio';
        if (!empleadoId) newErrors.empleado = 'Selecciona un empleado';
        if (!hora.trim()) newErrors.hora = 'Ingresa la hora';
        if (hora && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) {
            newErrors.hora = 'Formato inválido (HH:MM)';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            await safeAction('EditarCita', async () => {
                const serviciosSeleccionados = servicios.filter(s => selectedServiciosIds.includes(s.id));
                const totalMinutos = serviciosSeleccionados.reduce((acc, s) => acc + (s.duracion_aprox_minutos || 30), 0);
                const costoTotalBase = serviciosSeleccionados.reduce((acc, s) => acc + (s.precio_base || 0), 0);

                const fechaHoraInicio = new Date(`${fechaSeleccionada}T${hora}:00`);
                const fechaHoraFin = new Date(fechaHoraInicio.getTime() + totalMinutos * 60000);

                // Overlap check (exclude this cita)
                const { data: citasEmpalme } = await supabase
                    .from('citas')
                    .select('id, fecha_hora_inicio, fecha_hora_fin')
                    .eq('empleado_id', empleadoId)
                    .neq('estado', 'cancelada')
                    .neq('id', citaId)
                    .or(`and(fecha_hora_inicio.lt.${fechaHoraFin.toISOString()},fecha_hora_fin.gt.${fechaHoraInicio.toISOString()})`);

                if (citasEmpalme && citasEmpalme.length > 0) {
                    Alert.alert('Empalme Detectado', 'El empleado ya tiene una cita en ese horario.');
                    return;
                }

                // Update cita
                const { error: updError } = await supabase
                    .from('citas')
                    .update({
                        empleado_id: empleadoId,
                        sucursal_id: selectedSucursalId,
                        fecha_hora_inicio: fechaHoraInicio.toISOString(),
                        fecha_hora_fin: fechaHoraFin.toISOString(),
                        monto_total: costoTotalBase,
                    })
                    .eq('id', citaId)
                    .eq('negocio_id', negocioId);

                if (updError) throw updError;

                // Replace citas_servicios
                await supabase.from('citas_servicios').delete().eq('cita_id', citaId);

                const serviciosInserts = serviciosSeleccionados.map(s => ({
                    cita_id: citaId,
                    servicio_id: s.id,
                    precio_actual: s.precio_base,
                }));
                const { error: svcErr } = await supabase.from('citas_servicios').insert(serviciosInserts);
                if (svcErr) throw svcErr;

                Alert.alert('Éxito', 'Cita actualizada correctamente', [
                    { text: 'OK', onPress: () => router.replace('/(tabs)/agenda') }
                ]);
            });
        } finally {
            setSaving(false);
        }
    };

    // Loading
    if (loading) {
        return (
            <KyrosScreen title="Editar Cita">
                <ActivityIndicator style={{ marginTop: 50 }} size="large" />
                <Text style={{ textAlign: 'center', marginTop: 20 }}>Cargando cita...</Text>
            </KyrosScreen>
        );
    }

    // Not found
    if (notFound) {
        return (
            <KyrosScreen title="Editar Cita">
                <View style={styles.centerState}>
                    <MaterialIcons name="error-outline" size={64} color="#d32f2f" />
                    <Text style={{ textAlign: 'center', marginTop: 16, color: '#d32f2f' }}>
                        Cita no encontrada
                    </Text>
                    <KyrosButton onPress={() => router.back()} style={{ marginTop: 16 }}>
                        Volver
                    </KyrosButton>
                </View>
            </KyrosScreen>
        );
    }

    // Calculated values
    const serviciosSeleccionados = servicios.filter(s => selectedServiciosIds.includes(s.id));
    const totalMinutos = serviciosSeleccionados.reduce((acc, s) => acc + (s.duracion_aprox_minutos || 30), 0);
    const costoTotal = serviciosSeleccionados.reduce((acc, s) => acc + (s.precio_base || 0), 0);

    return (
        <KyrosScreen title="Editar Cita">
            <ScrollView style={styles.container}>
                {/* Cliente (read-only) */}
                <KyrosCard style={styles.section}>
                    <Text variant="labelLarge" style={styles.label}>Cliente</Text>
                    <Text variant="bodyLarge" style={{ color: '#333' }}>{clienteNombre || 'Sin cliente'}</Text>
                </KyrosCard>

                {/* Servicios */}
                <KyrosCard style={styles.section}>
                    <Text variant="labelLarge" style={styles.label}>Servicios *</Text>
                    <View style={styles.chipContainer}>
                        {servicios.map(s => (
                            <Chip
                                key={s.id}
                                selected={selectedServiciosIds.includes(s.id)}
                                onPress={() => toggleServicio(s.id)}
                                style={styles.chip}
                            >
                                {s.nombre} (${s.precio_base})
                            </Chip>
                        ))}
                    </View>
                    {errors.servicios ? <Text style={styles.error}>{errors.servicios}</Text> : null}
                </KyrosCard>

                {/* Empleado */}
                <KyrosCard style={styles.section}>
                    <Text variant="labelLarge" style={styles.label}>Empleado *</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={empleadoId}
                            onValueChange={(val) => {
                                setEmpleadoId(val);
                                setErrors(prev => ({ ...prev, empleado: '' }));
                            }}
                        >
                            <Picker.Item label="Seleccionar empleado" value={null} />
                            {empleadosFiltrados.map(e => (
                                <Picker.Item key={e.id} label={e.nombre} value={e.id} />
                            ))}
                        </Picker>
                    </View>
                    {errors.empleado ? <Text style={styles.error}>{errors.empleado}</Text> : null}
                </KyrosCard>

                {/* Fecha y Hora */}
                <KyrosCard style={styles.section}>
                    <Text variant="labelLarge" style={styles.label}>Fecha</Text>
                    <TextInput
                        mode="outlined"
                        value={fechaSeleccionada}
                        onChangeText={setFechaSeleccionada}
                        placeholder="YYYY-MM-DD"
                        style={styles.input}
                    />

                    <Text variant="labelLarge" style={[styles.label, { marginTop: 12 }]}>Hora *</Text>
                    <TextInput
                        mode="outlined"
                        value={hora}
                        onChangeText={(text) => {
                            setHora(text);
                            setErrors(prev => ({ ...prev, hora: '' }));
                        }}
                        placeholder="HH:MM (ej: 10:30)"
                        keyboardType="numbers-and-punctuation"
                        style={styles.input}
                    />
                    {errors.hora ? <Text style={styles.error}>{errors.hora}</Text> : null}
                </KyrosCard>

                {/* Resumen */}
                {selectedServiciosIds.length > 0 && (
                    <KyrosCard style={styles.section}>
                        <Text variant="labelLarge" style={styles.label}>Resumen</Text>
                        <Divider style={{ marginBottom: 8 }} />
                        {serviciosSeleccionados.map(s => (
                            <View key={s.id} style={styles.row}>
                                <Text>{s.nombre}</Text>
                                <Text style={{ fontWeight: 'bold' }}>${s.precio_base}</Text>
                            </View>
                        ))}
                        <Divider style={{ marginVertical: 8 }} />
                        <View style={styles.row}>
                            <Text style={{ fontWeight: 'bold' }}>Total</Text>
                            <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>${costoTotal}</Text>
                        </View>
                        <Text style={{ color: '#888', marginTop: 4 }}>Duración estimada: {totalMinutos} min</Text>
                    </KyrosCard>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                    <KyrosButton
                        mode="outlined"
                        onPress={() => router.back()}
                        style={styles.actionBtn}
                    >
                        Cancelar
                    </KyrosButton>
                    <KyrosButton
                        mode="contained"
                        onPress={handleSave}
                        loading={saving}
                        disabled={saving}
                        style={styles.actionBtn}
                    >
                        Actualizar Cita
                    </KyrosButton>
                </View>

                <View style={{ height: 60 }} />
            </ScrollView>
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 12,
    },
    section: {
        marginBottom: 12,
        padding: 12,
    },
    label: {
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        backgroundColor: 'white',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        marginBottom: 4,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    error: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    actionBtn: {
        flex: 1,
    },
    centerState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
});
