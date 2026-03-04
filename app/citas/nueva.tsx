import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, ViewStyle } from 'react-native';
import { Text, TextInput, useTheme, ActivityIndicator, Divider, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker'; // Requisito instalado previamente
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import KyrosButton from '../../components/KyrosButton';
import ClienteNuevoModal from '../../components/ClienteNuevoModal';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import { safeAction } from '../../lib/safeAction';

// ============================================================
// TIPOS
// ============================================================
import { isTimeOverlap } from '../../lib/date';

// ============================================================
// TIPOS
// ============================================================
interface Servicio {
    id: number;
    nombre: string;
    precio_base: number;
    duracion_aprox_minutos: number;
}

interface Cliente {
    id: number;
    nombre: string;
    telefono: string;
    email?: string | null;
}

interface Sucursal {
    id: number;
    nombre: string;
}

interface Empleado {
    id: number;
    nombre: string;
    sucursal_id: number | null;
    servicios_ids?: number[]; // IDs de servicios que realiza
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function NuevaCitaScreen() {
    const theme = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ fecha?: string; hora?: string }>();

    // Obtener contexto
    const { negocioId, sucursalId: contextSucursalId, rol, isLoading: appLoading } = useApp();

    // Estados de Formulario
    const [clienteId, setClienteId] = useState<number | null>(null);
    const [clienteNombre, setClienteNombre] = useState('');
    const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);
    const [selectedServiciosIds, setSelectedServiciosIds] = useState<number[]>([]);
    const [empleadoId, setEmpleadoId] = useState<number | null>(null);
    const [hora, setHora] = useState(params.hora || '');

    // Modal Nuevo Cliente
    const [modalClienteVisible, setModalClienteVisible] = useState(false);

    // Datos
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Fecha
    const fechaSeleccionada = params.fecha || new Date().toISOString().split('T')[0];

    // Cargar Datos Iniciales
    useEffect(() => {
        if (!appLoading) {
            if (negocioId) {
                loadData();
            } else {
                // Si terminó de cargar la app y no hay negocioId
                console.warn('[NuevaCita] No negocioId found after app load');
                setLoading(false);
                setErrors({ general: 'No se encontró información del negocio.' });
            }
        }
    }, [appLoading, negocioId]);

    // Establecer sucursal inicial
    useEffect(() => {
        if (contextSucursalId) {
            setSelectedSucursalId(contextSucursalId);
        } else if (sucursales.length > 0 && rol === 'dueño') {
            setSelectedSucursalId(sucursales[0].id);
        }
    }, [contextSucursalId, sucursales, rol]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Sucursales (solo si dueño, sino ya tenemos contextSucursalId)
            let sucursalesData: Sucursal[] = [];
            if (rol === 'dueño' || !contextSucursalId) {
                const { data } = await supabase.from('sucursales').select('id, nombre').eq('negocio_id', negocioId!).order('nombre');
                sucursalesData = data || [];
                setSucursales(sucursalesData);
            }

            // 2. Servicios (Solo activos)
            const { data: servData } = await supabase.from('servicios')
                .select('*')
                .eq('negocio_id', negocioId!)
                .eq('activo', true)
                .order('nombre');
            setServicios(servData || []);

            // 3. Empleados
            // 3. Empleados + sus servicios
            const { data: empData, error: empError } = await supabase
                .from('empleados')
                .select(`
                    id, 
                    nombre, 
                    sucursal_id,
                    empleado_servicios ( servicio_id )
                `)
                .eq('negocio_id', negocioId!)
                .order('nombre');

            if (empError) throw empError;

            // Mapear para facilitar filtrado
            const empleadosMapeados: Empleado[] = (empData || []).map((e: any) => ({
                id: e.id,
                nombre: e.nombre,
                sucursal_id: e.sucursal_id,
                servicios_ids: e.empleado_servicios?.map((es: any) => es.servicio_id) || []
            }));
            setEmpleados(empleadosMapeados);

            // 4. Clientes (carga inicial ligera, busqueda filtra localmente por ahora)
            const { data: cliData } = await supabase.from('clientes_bot').select('id, nombre, telefono').eq('negocio_id', negocioId!).order('nombre').limit(100);
            setClientes(cliData || []);

        } catch (err) {
            console.error('Error cargando datos:', err);
            Alert.alert('Error', 'No se pudieron cargar los datos del formulario');
        } finally {
            setLoading(false);
        }
    };

    // Función para buscar clientes dinámicamente si la lista local no basta
    // (Simplificado: filtra de la lista cargada)
    const clientesSugeridos = clienteNombre.length > 0
        ? clientes.filter(c => c.nombre.toLowerCase().includes(clienteNombre.toLowerCase())).slice(0, 5)
        : [];

    // Filtrar empleados por sucursal seleccionada
    // Filtrar empleados por sucursal Y que sepan hacer al menos UNO de los servicios seleccionados
    // (Si no hay servicios seleccionados, mostrar todos los de la sucursal)
    const empleadosFiltrados = empleados.filter(e => {
        // Filtro Sucursal
        const matchSucursal = !e.sucursal_id || e.sucursal_id === selectedSucursalId;
        if (!matchSucursal) return false;

        // Filtro Servicios (Si el empleado sabe hacer TODOS los servicios seleccionados es el ideal, 
        // pero por ahora validaremos que al menos sepa hacer los que seleccionamos. 
        // Lógica estricta: El empleado debe tener asignados TODOS los servicios seleccionados)
        if (selectedServiciosIds.length > 0 && e.servicios_ids) {
            const sabeHacerTodos = selectedServiciosIds.every(sId => e.servicios_ids!.includes(sId));
            return sabeHacerTodos;
        }
        return true;
    });

    // Toggle Servicio
    const toggleServicio = (id: number) => {
        setSelectedServiciosIds(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
        setErrors(prev => ({ ...prev, servicios: '' }));
    };

    // Validar
    const validate = () => {
        const newErrors: any = {};
        if (!clienteId) newErrors.cliente = 'Selecciona un cliente';
        if (!selectedSucursalId) newErrors.sucursal = 'Selecciona una sucursal';
        if (selectedServiciosIds.length === 0) newErrors.servicios = 'Selecciona al menos un servicio';
        if (!empleadoId) newErrors.empleado = 'Selecciona un empleado';
        if (!hora.trim()) newErrors.hora = 'Ingresa la hora';

        // Validar formato hora HH:MM
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
            await safeAction('NuevaCita', async () => {
                // Calcular fecha inicio y fin (sumando duraciones)
                const serviciosSeleccionados = servicios.filter(s => selectedServiciosIds.includes(s.id));
                const totalMinutos = serviciosSeleccionados.reduce((acc, s) => acc + (s.duracion_aprox_minutos || 30), 0);
                const costoTotalBase = serviciosSeleccionados.reduce((acc, s) => acc + (s.precio_base || 0), 0);

                const fechaHoraInicio = new Date(`${fechaSeleccionada}T${hora}:00`);
                const fechaHoraFin = new Date(fechaHoraInicio.getTime() + totalMinutos * 60000);

                // 0. Validar Empalmes (Anti-Overlap)
                const { data: citasEmpalme, error: empalmeError } = await supabase
                    .from('citas')
                    .select('id, fecha_hora_inicio, fecha_hora_fin')
                    .eq('empleado_id', empleadoId)
                    .neq('estado', 'cancelada')
                    .or(`and(fecha_hora_inicio.lt.${fechaHoraFin.toISOString()},fecha_hora_fin.gt.${fechaHoraInicio.toISOString()})`);

                if (empalmeError) {
                    console.warn('Error validando empalmes:', empalmeError);
                }

                if (citasEmpalme && citasEmpalme.length > 0) {
                    Alert.alert('Empalme Detectado', 'El empleado seleccionado ya tiene una cita en ese horario. Por favor selecciona otra hora.');
                    return; // Retorna del action, NO lanza el error para que safeAction no dispare su Alert genérico
                }

                const citaPayload = {
                    negocio_id: negocioId,
                    sucursal_id: selectedSucursalId,
                    cliente_id: clienteId,
                    empleado_id: empleadoId,
                    fecha_hora_inicio: fechaHoraInicio.toISOString(),
                    fecha_hora_fin: fechaHoraFin.toISOString(),
                    estado: 'pendiente',
                    total_pagado: costoTotalBase
                };
                console.log("[NuevaCita] citaPayload", citaPayload);

                // 1. Insert Cita
                const { data: cita, error: citaError } = await supabase
                    .from('citas')
                    .insert(citaPayload)
                    .select('id')
                    .single();

                if (citaError) throw citaError;

                // 2. Insert Citas Servicios
                const serviciosInserts = serviciosSeleccionados.map(s => ({
                    cita_id: cita.id,
                    servicio_id: s.id,
                    precio_actual: s.precio_base
                }));

                console.log("[NuevaCita] serviciosInserts", serviciosInserts);
                const { error: servError } = await supabase.from('citas_servicios').insert(serviciosInserts);
                if (servError) throw servError;

                Alert.alert('Éxito', 'Cita agendada correctamente', [
                    { text: 'OK', onPress: () => router.replace('/(tabs)/agenda') }
                ]);
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <KyrosScreen title="Nueva Cita">
                <ActivityIndicator style={{ marginTop: 50 }} size="large" />
                <Text style={{ textAlign: 'center', marginTop: 20 }}>Cargando datos...</Text>
            </KyrosScreen>
        );
    }

    if (errors.general) {
        return (
            <KyrosScreen title="Nueva Cita">
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                    <MaterialIcons name="error-outline" size={48} color="red" />
                    <Text variant="titleMedium" style={{ marginTop: 16, textAlign: 'center' }}>
                        {errors.general}
                    </Text>
                    <KyrosButton style={{ marginTop: 20 }} onPress={() => router.back()}>
                        Volver
                    </KyrosButton>
                </View>
            </KyrosScreen>
        );
    }

    return (
        <KyrosScreen title="Agendar Nueva Cita">
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

                {/* 1. Cliente */}
                <KyrosCard style={styles.card}>
                    <Text style={styles.label}>Cliente</Text>
                    <TextInput
                        mode="outlined"
                        placeholder="Buscar cliente..."
                        value={clienteNombre}
                        onChangeText={(text) => {
                            setClienteNombre(text);
                            if (clienteId) setClienteId(null); // Reset selection on type
                        }}
                        error={!!errors.cliente}
                        right={clienteId ? <TextInput.Icon icon="check-circle" color="green" /> : null}
                        style={styles.input}
                    />
                    {errors.cliente && <Text style={styles.error}>{errors.cliente}</Text>}

                    {/* Sugerencias */}
                    {!clienteId && clientesSugeridos.length > 0 && (
                        <View style={styles.suggestions}>
                            {clientesSugeridos.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={styles.suggestionItem}
                                    onPress={() => {
                                        setClienteId(c.id);
                                        setClienteNombre(c.nombre);
                                    }}
                                >
                                    <Text>{c.nombre} - {c.telefono}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Botón Nuevo Cliente */}
                    <KyrosButton
                        mode="outlined"
                        onPress={() => setModalClienteVisible(true)}
                        style={styles.newClientBtn}
                        icon="account-plus"
                    >
                        ¿Cliente nuevo? Registrar aquí
                    </KyrosButton>
                </KyrosCard>

                {/* 2. Sucursal (Solo si es dueño o tiene opciones) */}
                {(rol === 'dueño' || sucursales.length > 1) && (
                    <KyrosCard style={styles.card}>
                        <Text style={styles.label}>Sucursal *</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedSucursalId}
                                onValueChange={(val) => setSelectedSucursalId(val)}
                            >
                                <Picker.Item label="Seleccionar Sucursal" value={null} />
                                {sucursales.map(s => (
                                    <Picker.Item key={s.id} label={s.nombre} value={s.id} />
                                ))}
                            </Picker>
                        </View>
                        {errors.sucursal && <Text style={styles.error}>{errors.sucursal}</Text>}
                    </KyrosCard>
                )}

                {/* 3. Servicios (Multi-select) */}
                <KyrosCard style={styles.card}>
                    <Text style={styles.label}>Seleccionar Servicios *</Text>
                    <View style={styles.chipsContainer}>
                        {servicios.map(servicio => {
                            const selected = selectedServiciosIds.includes(servicio.id);
                            return (
                                <Chip
                                    key={servicio.id}
                                    selected={selected}
                                    showSelectedOverlay
                                    onPress={() => toggleServicio(servicio.id)}
                                    style={styles.chip}
                                >
                                    {servicio.nombre} (${servicio.precio_base})
                                </Chip>
                            );
                        })}
                    </View>
                    {errors.servicios && <Text style={styles.error}>{errors.servicios}</Text>}
                </KyrosCard>

                {/* 4. Empleado */}
                <KyrosCard style={styles.card}>
                    <Text style={styles.label}>Empleado</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={empleadoId}
                            onValueChange={(val) => setEmpleadoId(val)}
                            enabled={!!selectedSucursalId}
                        >
                            <Picker.Item label={selectedSucursalId ? "Seleccionar Empleado" : "Primero selecciona sucursal"} value={null} />
                            {empleadosFiltrados.map(e => (
                                <Picker.Item key={e.id} label={e.nombre} value={e.id} />
                            ))}
                        </Picker>
                    </View>
                    {errors.empleado && <Text style={styles.error}>{errors.empleado}</Text>}
                </KyrosCard>

                {/* 5. Fecha y Hora */}
                <View style={styles.row}>
                    <KyrosCard style={[styles.card, { flex: 1, marginRight: 8 }] as unknown as ViewStyle}>
                        <Text style={styles.label}>Fecha</Text>
                        <TextInput
                            mode="outlined"
                            value={fechaSeleccionada}
                            editable={false}
                            right={<TextInput.Icon icon="calendar" />}
                            style={styles.input}
                        />
                    </KyrosCard>

                    <KyrosCard style={[styles.card, { flex: 1, marginLeft: 8 }] as unknown as ViewStyle}>
                        <Text style={styles.label}>Hora Inicio *</Text>
                        <TextInput
                            mode="outlined"
                            placeholder="Ej: 14:30"
                            value={hora}
                            onChangeText={setHora}
                            keyboardType="numbers-and-punctuation"
                            error={!!errors.hora}
                            right={<TextInput.Icon icon="clock-outline" />}
                            style={styles.input}
                        />
                        {errors.hora && <Text style={styles.error}>{errors.hora}</Text>}
                        {/* Calculo de fin aproximado */}
                        {hora && /^\d{1,2}:\d{2}$/.test(hora) && selectedServiciosIds.length > 0 && (
                            <Text style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                                Fin aprox: {(() => {
                                    try {
                                        const totalMin = servicios.filter(s => selectedServiciosIds.includes(s.id))
                                            .reduce((acc, s) => acc + (s.duracion_aprox_minutos || 30), 0);
                                        const [h, m] = hora.split(':').map(Number);
                                        const fin = new Date();
                                        fin.setHours(h);
                                        fin.setMinutes(m + totalMin);
                                        return fin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    } catch (e) { return '--:--'; }
                                })()}
                            </Text>
                        )}
                    </KyrosCard>
                </View>

                {/* Botón Guardar */}
                <KyrosButton
                    mode="contained"
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving}
                    style={styles.saveBtn}
                >
                    Guardar Cita
                </KyrosButton>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modal Cliente Nuevo */}
            <ClienteNuevoModal
                visible={modalClienteVisible}
                onDismiss={() => setModalClienteVisible(false)}
                onClienteCreado={(nuevoCliente) => {
                    setClientes(prev => [...prev, nuevoCliente]);
                    setClienteId(nuevoCliente.id);
                    setClienteNombre(nuevoCliente.nombre);
                    setModalClienteVisible(false);
                }}
            />
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    card: {
        marginBottom: 16,
        padding: 12,
    },
    label: {
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        backgroundColor: 'white',
        height: 48,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#79747E',
        borderRadius: 4,
        backgroundColor: '#f0f0f0',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        marginBottom: 4,
    },
    suggestions: {
        marginTop: 8,
        backgroundColor: '#f9f9f9',
        borderRadius: 4,
        padding: 8,
    },
    suggestionItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    newClientBtn: {
        marginTop: 12,
        borderRadius: 20,
    },
    row: {
        flexDirection: 'row',
    },
    error: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
    },
    saveBtn: {
        marginTop: 16,
        paddingVertical: 6,
    }
});
