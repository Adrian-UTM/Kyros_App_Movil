import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform, Modal as RNModal, Image } from 'react-native';
import { Text, TextInput, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getLocalToday } from '../../lib/date';
import KyrosScreen from '../../components/KyrosScreen';
import ClienteNuevoModal from '../../components/ClienteNuevoModal';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import { safeAction } from '../../lib/safeAction';
import { useKyrosPalette } from '../../lib/useKyrosPalette';
import { useResponsiveLayout } from '../../lib/useResponsiveLayout';

// ============================================================
// TIPOS
// ============================================================
interface Servicio {
    id: number;
    nombre: string;
    precio_base: number;
    duracion_aprox_minutos: number;
    imagen_url?: string | null;
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

interface SucursalSchedule {
    hora_apertura: string | null;
    hora_cierre: string | null;
    descanso_inicio: string | null;
    descanso_fin: string | null;
    dias_abiertos: number[] | null;
}

interface Empleado {
    id: number;
    nombre: string;
    sucursal_id: number | null;
    servicios_ids?: number[];
}

// ============================================================
// TIME PICKER MODAL (iPhone alarm style)
// ============================================================
function TimePickerModal({ visible, value, onSelect, onClose }: {
    visible: boolean;
    value: string;
    onSelect: (time: string) => void;
    onClose: () => void;
}) {
    const theme = useTheme();
    const palette = useKyrosPalette();
    const [selectedHour12, setSelectedHour12] = useState(9);
    const [selectedMinute, setSelectedMinute] = useState(0);
    const [isPM, setIsPM] = useState(false);

    useEffect(() => {
        if (value && /^\d{1,2}:\d{2}$/.test(value)) {
            const [h, m] = value.split(':').map(Number);
            setSelectedMinute(m);
            if (h >= 12) {
                setIsPM(true);
                setSelectedHour12(h === 12 ? 12 : h - 12);
            } else {
                setIsPM(false);
                setSelectedHour12(h === 0 ? 12 : h);
            }
        }
    }, [value, visible]);

    const hours12 = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const handleScrollReset = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const contentHeight = event.nativeEvent.contentSize.height;
        const layoutHeight = event.nativeEvent.layoutMeasurement.height;

        // Si hacemos scroll más allá del final, volvemos arriba (con un ligero delay para la fluidez)
        if (offsetY + layoutHeight >= contentHeight + 20) {
            event.target.scrollTo({ y: 0, animated: false });
        }
        // Si hacemos scroll hacia arriba desde el inicio
        else if (offsetY <= -20) {
            event.target.scrollTo({ y: contentHeight - layoutHeight, animated: false });
        }
    };

    return (
        <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={[timeStyles.overlay, { backgroundColor: palette.overlay }]} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={[timeStyles.container, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <Text style={[timeStyles.title, { color: palette.textStrong }]}>Seleccionar Hora</Text>

                    <View style={[timeStyles.preview, { backgroundColor: palette.surfaceAlt }]}>
                        <Text style={[timeStyles.previewText, { color: theme.colors.primary }]}>
                            {selectedHour12.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
                            <Text style={{ fontSize: 24, color: palette.textMuted }}> {isPM ? 'PM' : 'AM'}</Text>
                        </Text>
                    </View>

                    <View style={timeStyles.wheelsRow}>
                        {/* Hours Column */}
                        <View style={timeStyles.column}>
                            <Text style={[timeStyles.columnLabel, { color: palette.textSoft }]}>Hora</Text>
                            <ScrollView
                                style={timeStyles.scrollColumn}
                                showsVerticalScrollIndicator={false}
                                onScroll={handleScrollReset}
                                scrollEventThrottle={16}
                            >
                                {hours12.map(h => (
                                    <TouchableOpacity
                                        key={h}
                                        onPress={() => setSelectedHour12(h)}
                                        style={[timeStyles.wheelItem, selectedHour12 === h && [timeStyles.wheelItemSelected, { backgroundColor: palette.selectedBgStrong }]]}
                                    >
                                        <Text style={[timeStyles.wheelText, { color: palette.textMuted }, selectedHour12 === h && [timeStyles.wheelTextSelected, { color: theme.colors.primary }]]}>
                                            {h.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {/* Padding extra para permitir que el último elemento sea seleccionable en medio de la vista */}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>

                        {/* Separator */}
                        <Text style={[timeStyles.separator, { color: theme.colors.primary }]}>:</Text>

                        {/* Minutes Column */}
                        <View style={timeStyles.column}>
                            <Text style={[timeStyles.columnLabel, { color: palette.textSoft }]}>Min</Text>
                            <ScrollView
                                style={timeStyles.scrollColumn}
                                showsVerticalScrollIndicator={false}
                                onScroll={handleScrollReset}
                                scrollEventThrottle={16}
                            >
                                {minutes.map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        onPress={() => setSelectedMinute(m)}
                                        style={[timeStyles.wheelItem, selectedMinute === m && [timeStyles.wheelItemSelected, { backgroundColor: palette.selectedBgStrong }]]}
                                    >
                                        <Text style={[timeStyles.wheelText, { color: palette.textMuted }, selectedMinute === m && [timeStyles.wheelTextSelected, { color: theme.colors.primary }]]}>
                                            {m.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>

                        {/* AM/PM toggle */}
                        <View style={[timeStyles.column, { width: 80, marginLeft: 10, justifyContent: 'center' }]}>
                            <TouchableOpacity
                                onPress={() => setIsPM(false)}
                                style={[timeStyles.ampmBtn, { borderColor: palette.border }, !isPM && [timeStyles.ampmBtnSelected, { backgroundColor: palette.selectedBgStrong, borderColor: theme.colors.primary }]]}
                            >
                                <Text style={[timeStyles.ampmText, { color: palette.textMuted }, !isPM && [timeStyles.ampmTextSelected, { color: theme.colors.primary }]]}>AM</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setIsPM(true)}
                                style={[timeStyles.ampmBtn, { borderColor: palette.border }, isPM && [timeStyles.ampmBtnSelected, { backgroundColor: palette.selectedBgStrong, borderColor: theme.colors.primary }]]}
                            >
                                <Text style={[timeStyles.ampmText, { color: palette.textMuted }, isPM && [timeStyles.ampmTextSelected, { color: theme.colors.primary }]]}>PM</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={timeStyles.actions}>
                        <TouchableOpacity onPress={onClose} style={[timeStyles.cancelBtn, { borderColor: palette.border }]}>
                            <Text style={{ color: palette.textMuted, fontSize: 16 }}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                // Convert back to 24-hour format for database storage
                                let finalHour24 = selectedHour12;
                                if (isPM && finalHour24 !== 12) finalHour24 += 12;
                                if (!isPM && finalHour24 === 12) finalHour24 = 0;

                                onSelect(`${finalHour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`);
                                onClose();
                            }}
                            style={[timeStyles.confirmBtn, { backgroundColor: theme.colors.primary }]}
                        >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </RNModal>
    );
}
// ============================================================
// DATE PICKER MODAL (iPhone style wheels)
// ============================================================
function DatePickerModal({ visible, value, onSelect, onClose }: {
    visible: boolean;
    value: string; // YYYY-MM-DD
    onSelect: (date: string) => void;
    onClose: () => void;
}) {
    const theme = useTheme();
    const palette = useKyrosPalette();
    const today = useMemo(() => new Date(), []);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedDay, setSelectedDay] = useState(today.getDate());

    useEffect(() => {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [y, m, d] = value.split('-').map(Number);
            setSelectedYear(Math.max(y, today.getFullYear()));
            setSelectedMonth(m);
            setSelectedDay(d);
        } else {
            setSelectedYear(today.getFullYear());
            setSelectedMonth(today.getMonth() + 1);
            setSelectedDay(today.getDate());
        }
    }, [value, visible, today]);

    const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() + i);
    const isCurrentYear = selectedYear === today.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i + 1).filter(m => !isCurrentYear || m >= today.getMonth() + 1);

    // Auto-adjust month if it became invalid
    useEffect(() => {
        if (isCurrentYear && selectedMonth < today.getMonth() + 1) {
            setSelectedMonth(today.getMonth() + 1);
        }
    }, [isCurrentYear, selectedMonth, today]);

    const isCurrentMonth = isCurrentYear && selectedMonth === today.getMonth() + 1;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(d => !isCurrentMonth || d >= today.getDate());

    // Ensure day doesn't exceed days in newly selected month or go before today
    useEffect(() => {
        if (isCurrentMonth && selectedDay < today.getDate()) {
            setSelectedDay(today.getDate());
        } else if (selectedDay > daysInMonth) {
            setSelectedDay(daysInMonth);
        }
    }, [isCurrentMonth, selectedMonth, selectedYear, daysInMonth, selectedDay, today]);

    const handleScrollReset = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const contentHeight = event.nativeEvent.contentSize.height;
        const layoutHeight = event.nativeEvent.layoutMeasurement.height;

        if (offsetY + layoutHeight >= contentHeight + 20) {
            event.target.scrollTo({ y: 0, animated: false });
        } else if (offsetY <= -20) {
            event.target.scrollTo({ y: contentHeight - layoutHeight, animated: false });
        }
    };

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    return (
        <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={[timeStyles.overlay, { backgroundColor: palette.overlay }]} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={[timeStyles.container, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <Text style={[timeStyles.title, { color: palette.textStrong }]}>Seleccionar Fecha</Text>

                    <View style={[timeStyles.preview, { backgroundColor: palette.surfaceAlt }]}>
                        <Text style={[timeStyles.previewText, { fontSize: 28, color: theme.colors.primary }]}>
                            {selectedDay.toString().padStart(2, '0')} / {monthNames[selectedMonth - 1]} / {selectedYear}
                        </Text>
                    </View>

                    <View style={timeStyles.wheelsRow}>
                        {/* Day Column */}
                        <View style={[timeStyles.column, { width: 70 }]}>
                            <Text style={[timeStyles.columnLabel, { color: palette.textSoft }]}>Día</Text>
                            <ScrollView
                                style={timeStyles.scrollColumn}
                                showsVerticalScrollIndicator={false}
                                onScroll={handleScrollReset}
                                scrollEventThrottle={16}
                            >
                                {days.map(d => (
                                    <TouchableOpacity
                                        key={d}
                                        onPress={() => setSelectedDay(d)}
                                        style={[timeStyles.wheelItem, selectedDay === d && [timeStyles.wheelItemSelected, { backgroundColor: palette.selectedBgStrong }], { paddingHorizontal: 10 }]}
                                    >
                                        <Text style={[timeStyles.wheelText, { color: palette.textMuted }, selectedDay === d && [timeStyles.wheelTextSelected, { color: theme.colors.primary }]]}>
                                            {d.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>

                        <Text style={[timeStyles.separator, { color: theme.colors.primary }]}>/</Text>

                        {/* Month Column */}
                        <View style={[timeStyles.column, { width: 90 }]}>
                            <Text style={[timeStyles.columnLabel, { color: palette.textSoft }]}>Mes</Text>
                            <ScrollView
                                style={timeStyles.scrollColumn}
                                showsVerticalScrollIndicator={false}
                                onScroll={handleScrollReset}
                                scrollEventThrottle={16}
                            >
                                {months.map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        onPress={() => setSelectedMonth(m)}
                                        style={[timeStyles.wheelItem, selectedMonth === m && [timeStyles.wheelItemSelected, { backgroundColor: palette.selectedBgStrong }], { paddingHorizontal: 10 }]}
                                    >
                                        <Text style={[timeStyles.wheelText, { color: palette.textMuted }, selectedMonth === m && [timeStyles.wheelTextSelected, { color: theme.colors.primary }], { fontSize: 18 }]}>
                                            {monthNames[m - 1]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>

                        <Text style={[timeStyles.separator, { color: theme.colors.primary }]}>/</Text>

                        {/* Year Column */}
                        <View style={[timeStyles.column, { width: 80 }]}>
                            <Text style={[timeStyles.columnLabel, { color: palette.textSoft }]}>Año</Text>
                            <ScrollView
                                style={timeStyles.scrollColumn}
                                showsVerticalScrollIndicator={false}
                            >
                                {years.map(y => (
                                    <TouchableOpacity
                                        key={y}
                                        onPress={() => setSelectedYear(y)}
                                        style={[timeStyles.wheelItem, selectedYear === y && timeStyles.wheelItemSelected, { paddingHorizontal: 10 }]}
                                    >
                                        <Text style={[timeStyles.wheelText, selectedYear === y && timeStyles.wheelTextSelected, { fontSize: 18 }]}>
                                            {y}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>
                    </View>

                    <View style={timeStyles.actions}>
                        <TouchableOpacity onPress={onClose} style={[timeStyles.cancelBtn, { borderColor: palette.border }]}>
                            <Text style={{ color: palette.textMuted, fontSize: 16 }}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                onSelect(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`);
                                onClose();
                            }}
                            style={timeStyles.confirmBtn}
                        >
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </RNModal>
    );
}

const timeStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    container: { backgroundColor: '#1e293b', borderRadius: 20, padding: 24, width: 320, borderWidth: 1, borderColor: '#334155' },
    title: { color: '#e2e8f0', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
    preview: { backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
    previewText: { color: '#38bdf8', fontSize: 42, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
    wheelsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    column: { alignItems: 'center', width: 100 },
    columnLabel: { color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
    scrollColumn: { maxHeight: 200 },
    wheelItem: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, marginVertical: 2 },
    wheelItemSelected: { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
    wheelText: { color: '#94a3b8', fontSize: 20, textAlign: 'center', fontVariant: ['tabular-nums'] },
    wheelTextSelected: { color: '#38bdf8', fontWeight: 'bold' },
    ampmBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginVertical: 4, borderWidth: 1, borderColor: '#334155' },
    ampmBtnSelected: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
    ampmText: { color: '#94a3b8', fontSize: 16, textAlign: 'center', fontWeight: '600' },
    ampmTextSelected: { color: '#38bdf8', fontWeight: 'bold' },
    separator: { color: '#38bdf8', fontSize: 32, fontWeight: 'bold', marginHorizontal: 8, marginTop: 20 },
    actions: { flexDirection: 'row', marginTop: 20, gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    confirmBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#2563eb' },
});

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function NuevaCitaScreen() {
    const theme = useTheme();
    const palette = useKyrosPalette();
    const responsive = useResponsiveLayout();
    const router = useRouter();
    const params = useLocalSearchParams<{ fecha?: string; hora?: string }>();

    const { negocioId, sucursalId: contextSucursalId, rol, isLoading: appLoading } = useApp();

    // Form state
    const [clienteId, setClienteId] = useState<number | null>(null);
    const [clienteNombre, setClienteNombre] = useState('');
    const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);
    const [selectedServiciosIds, setSelectedServiciosIds] = useState<number[]>([]);
    const [empleadoId, setEmpleadoId] = useState<number | null>(null);
    const [fechaSeleccionada, setFechaSeleccionada] = useState((params.fecha as string) || getLocalToday());
    const [hora, setHora] = useState((params.hora as string) || '');

    // Pickers State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showServiciosPicker, setShowServiciosPicker] = useState(false);
    const [showSucursalPicker, setShowSucursalPicker] = useState(false);
    const [showEmpleadoPicker, setShowEmpleadoPicker] = useState(false);

    // Modal Nuevo Cliente
    const [modalClienteVisible, setModalClienteVisible] = useState(false);

    // Data
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Sucursal schedule
    const [schedule, setSchedule] = useState<SucursalSchedule | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (contextSucursalId) {
            setSelectedSucursalId(contextSucursalId);
        } else if (sucursales.length > 0 && rol === 'dueño') {
            setSelectedSucursalId(sucursales[0].id);
        }
    }, [contextSucursalId, sucursales, rol]);

    // Fetch sucursal schedule when selected
    useEffect(() => {
        const fetchSchedule = async () => {
            if (!selectedSucursalId) { setSchedule(null); return; }
            const { data } = await supabase
                .from('sucursales')
                .select('hora_apertura, hora_cierre, descanso_inicio, descanso_fin, dias_abiertos')
                .eq('id', selectedSucursalId)
                .single();
            if (data) setSchedule(data as SucursalSchedule);
        };
        fetchSchedule();
    }, [selectedSucursalId]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            let sucursalesData: Sucursal[] = [];
            if (rol === 'dueño' || !contextSucursalId) {
                const { data } = await supabase.from('sucursales').select('id, nombre').eq('negocio_id', negocioId!).order('nombre');
                sucursalesData = data || [];
                setSucursales(sucursalesData);
            }

            const { data: servData } = await supabase.from('servicios')
                .select('*')
                .eq('negocio_id', negocioId!)
                .order('nombre');
            setServicios(servData || []);

            const { data: empData, error: empError } = await supabase
                .from('empleados')
                .select(`id, nombre, sucursal_id, empleado_servicios ( servicio_id )`)
                .eq('negocio_id', negocioId!)
                .order('nombre');

            if (empError) throw empError;

            const empleadosMapeados: Empleado[] = (empData || []).map((e: any) => ({
                id: e.id,
                nombre: e.nombre,
                sucursal_id: e.sucursal_id,
                servicios_ids: e.empleado_servicios?.map((es: any) => es.servicio_id) || []
            }));
            setEmpleados(empleadosMapeados);

            const { data: cliData } = await supabase.from('clientes_bot').select('id, nombre, telefono').eq('negocio_id', negocioId!).order('nombre').limit(100);
            setClientes(cliData || []);

        } catch (err) {
            console.error('Error cargando datos:', err);
            Alert.alert('Error', 'No se pudieron cargar los datos del formulario');
        } finally {
            setLoading(false);
        }
    }, [rol, contextSucursalId, negocioId]);

    useEffect(() => {
        if (!appLoading) {
            if (negocioId) {
                loadData();
            } else {
                console.warn('[NuevaCita] No negocioId found after app load');
                setLoading(false);
                setErrors({ general: 'No se encontró información del negocio.' });
            }
        }
    }, [appLoading, negocioId, loadData]);

    const clientesSugeridos = clienteNombre.length > 0
        ? clientes.filter(c => (c.nombre || '').toLowerCase().includes(clienteNombre.toLowerCase())).slice(0, 5)
        : [];

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

    const selectedSucursal = sucursales.find(s => s.id === selectedSucursalId);
    const selectedEmpleado = empleadosFiltrados.find(e => e.id === empleadoId);
    const selectedServiciosInfo = servicios.filter(s => selectedServiciosIds.includes(s.id));

    const serviceImageUri = (servicio: Servicio) => {
        if (!servicio.imagen_url) return null;
        const separator = servicio.imagen_url.includes('?') ? '&' : '?';
        return `${servicio.imagen_url}${separator}src=${encodeURIComponent(servicio.imagen_url)}`;
    };

    // Helper: day name in Spanish
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const validate = () => {
        const newErrors: any = {};
        if (!clienteId) newErrors.cliente = 'Selecciona un cliente';
        if (!selectedSucursalId) newErrors.sucursal = 'Selecciona una sucursal';
        if (selectedServiciosIds.length === 0) newErrors.servicios = 'Selecciona al menos un servicio';
        if (!empleadoId) newErrors.empleado = 'Selecciona un empleado';
        if (!hora.trim()) newErrors.hora = 'Ingresa la hora';
        if (hora && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) {
            newErrors.hora = 'Formato inválido (HH:MM)';
        }

        // Prevent past date/time
        if (fechaSeleccionada && hora) {
            const dateObj = new Date(`${fechaSeleccionada}T${hora}:00`);
            const now = new Date();
            if (dateObj < now) {
                newErrors.fecha = 'No puedes agendar en el pasado';
                newErrors.hora = 'Hora inválida (ya pasó)';
            }
        }

        // Business hours validation
        if (schedule && fechaSeleccionada) {
            const dateObj = new Date(fechaSeleccionada + 'T12:00:00');
            const jsDay = dateObj.getDay(); // 0=Sun, 1=Mon ... 6=Sat
            const isoDay = jsDay === 0 ? 7 : jsDay; // Convert to 1=Mon...7=Sun

            if (schedule.dias_abiertos && !schedule.dias_abiertos.includes(isoDay)) {
                const openDayNames = (schedule.dias_abiertos || []).map(d => {
                    const idx = d === 7 ? 0 : d;
                    return dayNames[idx];
                }).join(', ');
                newErrors.fecha = `La sucursal está cerrada este día. Días disponibles: ${openDayNames}`;
            }

            if (hora && schedule.hora_apertura && schedule.hora_cierre) {
                const [horaH, horaM] = hora.split(':').map(Number);
                const horaMin = horaH * 60 + horaM;
                const [apH, apM] = schedule.hora_apertura.split(':').map(Number);
                const aperturaMin = apH * 60 + apM;
                const [ciH, ciM] = schedule.hora_cierre.split(':').map(Number);
                const cierreMin = ciH * 60 + ciM;

                if (horaMin < aperturaMin || horaMin >= cierreMin) {
                    const fmtAp = `${apH > 12 ? apH - 12 : apH || 12}:${String(apM).padStart(2, '0')} ${apH >= 12 ? 'PM' : 'AM'}`;
                    const fmtCi = `${ciH > 12 ? ciH - 12 : ciH || 12}:${String(ciM).padStart(2, '0')} ${ciH >= 12 ? 'PM' : 'AM'}`;
                    newErrors.hora = `Fuera de horario. La sucursal atiende de ${fmtAp} a ${fmtCi}`;
                }

                // Check break time
                if (schedule.descanso_inicio && schedule.descanso_fin) {
                    const [dI_H, dI_M] = schedule.descanso_inicio.split(':').map(Number);
                    const [dF_H, dF_M] = schedule.descanso_fin.split(':').map(Number);
                    const breakStart = dI_H * 60 + dI_M;
                    const breakEnd = dF_H * 60 + dF_M;
                    if (horaMin >= breakStart && horaMin < breakEnd) {
                        const fmtDI = `${dI_H > 12 ? dI_H - 12 : dI_H || 12}:${String(dI_M).padStart(2, '0')} ${dI_H >= 12 ? 'PM' : 'AM'}`;
                        const fmtDF = `${dF_H > 12 ? dF_H - 12 : dF_H || 12}:${String(dF_M).padStart(2, '0')} ${dF_H >= 12 ? 'PM' : 'AM'}`;
                        newErrors.hora = `Horario de descanso (${fmtDI} - ${fmtDF}). Intenta después de las ${fmtDF}`;
                    }
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            await safeAction('NuevaCita', async () => {
                const serviciosSeleccionados = servicios.filter(s => selectedServiciosIds.includes(s.id));
                const totalMinutos = serviciosSeleccionados.reduce((acc, s) => acc + (s.duracion_aprox_minutos || 30), 0);
                const costoTotalBase = serviciosSeleccionados.reduce((acc, s) => acc + (s.precio_base || 0), 0);

                const fechaHoraInicio = new Date(`${fechaSeleccionada}T${hora}:00`);
                const fechaHoraFin = new Date(fechaHoraInicio.getTime() + totalMinutos * 60000);

                const { data: citasEmpalme } = await supabase
                    .from('citas')
                    .select('id, fecha_hora_inicio, fecha_hora_fin')
                    .eq('empleado_id', empleadoId)
                    .neq('estado', 'cancelada')
                    .or(`and(fecha_hora_inicio.lt.${fechaHoraFin.toISOString()},fecha_hora_fin.gt.${fechaHoraInicio.toISOString()})`);

                if (citasEmpalme && citasEmpalme.length > 0) {
                    Alert.alert('Empalme Detectado', 'El empleado seleccionado ya tiene una cita en ese horario.');
                    return;
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

                const { data: cita, error: citaError } = await supabase
                    .from('citas')
                    .insert(citaPayload)
                    .select('id')
                    .single();

                if (citaError) throw citaError;

                const serviciosInserts = serviciosSeleccionados.map(s => ({
                    cita_id: cita.id,
                    servicio_id: s.id,
                    precio_actual: s.precio_base
                }));

                const { error: servError } = await supabase.from('citas_servicios').insert(serviciosInserts);
                if (servError) throw servError;

                if (Platform.OS === 'web') {
                    window.alert('Cita agendada correctamente');
                    router.replace('/(tabs)/agenda');
                } else {
                    Alert.alert('Éxito', 'Cita agendada correctamente', [
                        { text: 'OK', onPress: () => router.replace('/(tabs)/agenda') }
                    ]);
                }
            });
        } finally {
            setSaving(false);
        }
    };

    // Computed values
    const totalPrecio = selectedServiciosInfo.reduce((acc, s) => acc + (s.precio_base || 0), 0);
    const totalDuracion = selectedServiciosInfo.reduce((acc, s) => acc + (s.duracion_aprox_minutos || 30), 0);

    if (loading) {
        return (
            <KyrosScreen title="Nueva Cita">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ textAlign: 'center', marginTop: 16, color: palette.textMuted }}>Cargando datos...</Text>
                </View>
            </KyrosScreen>
        );
    }

    if (errors.general) {
        return (
            <KyrosScreen title="Nueva Cita">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <MaterialIcons name="error-outline" size={48} color="#ef4444" />
                    <Text style={{ marginTop: 16, textAlign: 'center', color: palette.text, fontSize: 16 }}>
                        {errors.general}
                    </Text>
                    <TouchableOpacity style={[styles.saveBtn, { marginTop: 20, width: 160 }]} onPress={() => router.back()}>
                        <Text style={styles.saveBtnText}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </KyrosScreen>
        );
    }

    return (
        <KyrosScreen title="Agendar Nueva Cita">
            <ScrollView
                style={[styles.container, { backgroundColor: palette.background, maxWidth: responsive.formMaxWidth, alignSelf: 'center' }]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >

                {/* ═══════ Section 1: Cliente ═══════ */}
                <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="person" size={20} color={theme.colors.primary} />
                        <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Cliente</Text>
                    </View>

                    <TextInput
                        mode="outlined"
                        placeholder="Buscar cliente..."
                        placeholderTextColor={palette.textSoft}
                        value={clienteNombre}
                        onChangeText={(text) => {
                            setClienteNombre(text);
                            if (clienteId) setClienteId(null);
                        }}
                        error={!!errors.cliente}
                        right={clienteId ? <TextInput.Icon icon="check-circle" color="#22c55e" /> : null}
                        style={[styles.input, { backgroundColor: palette.inputBg }]}
                        textColor={palette.text}
                        outlineColor={palette.border}
                        activeOutlineColor={theme.colors.primary}
                        theme={{ colors: { onSurfaceVariant: palette.textMuted } }}
                    />
                    {errors.cliente && <Text style={styles.error}>{errors.cliente}</Text>}

                    {/* Suggestions */}
                    {!clienteId && clientesSugeridos.length > 0 && (
                        <View style={[styles.suggestions, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
                            {clientesSugeridos.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={styles.suggestionItem}
                                    onPress={() => {
                                        setClienteId(c.id);
                                        setClienteNombre(c.nombre);
                                    }}
                                >
                                    <MaterialIcons name="person-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={{ color: palette.text, flex: 1 }}>{c.nombre}</Text>
                                    <Text style={{ color: palette.textSoft, fontSize: 12 }}>{c.telefono}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.newClientBtn, { borderColor: palette.border, backgroundColor: palette.selectedBg }]}
                        onPress={() => setModalClienteVisible(true)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="person-add" size={18} color={theme.colors.primary} />
                        <Text style={{ color: theme.colors.primary, marginLeft: 8, fontWeight: '600' }}>¿Cliente nuevo? Registrar aquí</Text>
                    </TouchableOpacity>
                </View>

                {/* ═══════ Section 2: Sucursal (Only for dueño) ═══════ */}
                {(rol === 'dueño' || sucursales.length > 1) && (
                    <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="store" size={20} color={theme.colors.primary} />
                            <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Sucursal</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                setShowSucursalPicker(prev => !prev);
                                setShowEmpleadoPicker(false);
                                setShowServiciosPicker(false);
                            }}
                            activeOpacity={0.7}
                            style={[styles.dropdownTrigger, { backgroundColor: palette.inputBg, borderColor: palette.border }]}
                        >
                            <Text style={[
                                styles.dropdownTriggerText,
                                { color: palette.text },
                                !selectedSucursalId && styles.dropdownTriggerPlaceholder
                            ]}>
                                {selectedSucursal?.nombre || 'Seleccionar sucursal'}
                            </Text>
                            <MaterialIcons
                                name={showSucursalPicker ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                size={22}
                                color={palette.textMuted}
                            />
                        </TouchableOpacity>
                        {showSucursalPicker && (
                            <View style={styles.dropdownList}>
                                {sucursales.map(s => {
                                    const selected = selectedSucursalId === s.id;
                                    return (
                                        <TouchableOpacity
                                            key={s.id}
                                            onPress={() => {
                                                setSelectedSucursalId(s.id);
                                                setShowSucursalPicker(false);
                                                setErrors(prev => ({ ...prev, sucursal: '' }));
                                            }}
                                            style={[styles.dropdownItem, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }, selected && [styles.dropdownItemSelected, { borderColor: theme.colors.primary, backgroundColor: palette.selectedBg }]]}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.dropdownItemContent}>
                                                <View style={[styles.dropdownItemIcon, { backgroundColor: palette.surface, borderColor: palette.border }, selected && [styles.dropdownItemIconSelected, { borderColor: theme.colors.primary, backgroundColor: palette.selectedBgStrong }]]}>
                                                    <MaterialIcons
                                                        name={selected ? "check" : "store"}
                                                        size={18}
                                                        color={selected ? theme.colors.primary : palette.textMuted}
                                                    />
                                                </View>
                                                <Text style={[styles.dropdownItemTitle, { color: palette.text }, selected && [styles.dropdownItemTitleSelected, { color: theme.colors.primary }]]}>
                                                    {s.nombre}
                                                </Text>
                                            </View>
                                            <MaterialIcons
                                                name={selected ? "radio-button-checked" : "radio-button-unchecked"}
                                                size={20}
                                                color={selected ? theme.colors.primary : palette.textSoft}
                                            />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                        {errors.sucursal && <Text style={styles.error}>{errors.sucursal}</Text>}
                    </View>
                )}

                {/* ═══════ Section 3: Servicios ═══════ */}
                <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="content-cut" size={20} color={theme.colors.primary} />
                        <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Servicios</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => {
                            setShowServiciosPicker(prev => !prev);
                            setShowSucursalPicker(false);
                            setShowEmpleadoPicker(false);
                        }}
                        activeOpacity={0.7}
                        style={[styles.servicesTrigger, { backgroundColor: palette.inputBg, borderColor: palette.border }]}
                    >
                        <Text style={[
                            styles.servicesTriggerText,
                            { color: palette.text },
                            selectedServiciosIds.length === 0 && styles.servicesTriggerPlaceholder
                        ]}>
                            {selectedServiciosIds.length > 0
                                ? `${selectedServiciosIds.length} servicio(s) seleccionado(s)`
                                : 'Seleccionar servicios'}
                        </Text>
                        <MaterialIcons
                            name={showServiciosPicker ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                            size={22}
                            color={palette.textMuted}
                        />
                    </TouchableOpacity>

                    {showServiciosPicker && (
                        <View style={styles.servicesDropdown}>
                            {servicios.map(servicio => {
                                const selected = selectedServiciosIds.includes(servicio.id);
                                return (
                                    <TouchableOpacity
                                        key={servicio.id}
                                        onPress={() => toggleServicio(servicio.id)}
                                        style={[
                                            styles.serviceListItem,
                                            { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
                                            selected && [styles.serviceListItemSelected, { borderColor: theme.colors.primary, backgroundColor: palette.selectedBg }]
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.serviceListItemContent}>
                                            {servicio.imagen_url ? (
                                                <Image
                                                    source={{ uri: serviceImageUri(servicio) || undefined }}
                                                    style={styles.serviceListImage}
                                                />
                                            ) : (
                                                <View style={[styles.serviceListIcon, { backgroundColor: palette.surface, borderColor: palette.border }, selected && [styles.serviceListIconSelected, { borderColor: theme.colors.primary, backgroundColor: palette.selectedBgStrong }]]}>
                                                    <MaterialIcons
                                                        name={selected ? "check" : "content-cut"}
                                                        size={18}
                                                        color={selected ? theme.colors.primary : palette.textMuted}
                                                    />
                                                </View>
                                            )}
                                            <View style={styles.serviceListTextBlock}>
                                                <Text style={[
                                                    styles.serviceListTitle,
                                                    { color: palette.text },
                                                    selected && [styles.serviceListTitleSelected, { color: theme.colors.primary }]
                                                ]}>
                                                    {servicio.nombre}
                                                </Text>
                                                <Text style={[styles.serviceListMeta, { color: palette.textSoft }]}>
                                                    ${servicio.precio_base} • {servicio.duracion_aprox_minutos ?? 0} min
                                                </Text>
                                            </View>
                                        </View>
                                        <MaterialIcons
                                            name={selected ? "check-circle" : "radio-button-unchecked"}
                                            size={20}
                                            color={selected ? theme.colors.primary : palette.textSoft}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                    {errors.servicios && <Text style={styles.error}>{errors.servicios}</Text>}

                    {/* Summary of selected services */}
                    {selectedServiciosIds.length > 0 && (
                        <View style={[styles.summaryBox, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>Servicios seleccionados</Text>
                                <Text style={[styles.summaryValue, { color: palette.text }]}>{selectedServiciosIds.length}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>Duración estimada</Text>
                                <Text style={[styles.summaryValue, { color: palette.text }]}>{totalDuracion} min</Text>
                            </View>
                            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                                <Text style={[styles.summaryLabel, { color: palette.textMuted, fontWeight: 'bold' }]}>Total</Text>
                                <Text style={[styles.summaryValue, { color: '#22c55e', fontSize: 18 }]}>${totalPrecio}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* ═══════ Section 4: Empleado ═══════ */}
                <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="badge" size={20} color={theme.colors.primary} />
                        <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Empleado</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            if (!selectedSucursalId) return;
                            setShowEmpleadoPicker(prev => !prev);
                            setShowSucursalPicker(false);
                            setShowServiciosPicker(false);
                        }}
                        activeOpacity={0.7}
                        style={[
                            styles.dropdownTrigger,
                            { backgroundColor: palette.inputBg, borderColor: palette.border },
                            !selectedSucursalId && styles.dropdownTriggerDisabled
                        ]}
                    >
                        <Text style={[
                            styles.dropdownTriggerText,
                            { color: palette.text },
                            !empleadoId && styles.dropdownTriggerPlaceholder,
                            !selectedSucursalId && styles.dropdownTriggerPlaceholder
                        ]}>
                            {selectedEmpleado?.nombre || (selectedSucursalId ? 'Seleccionar empleado' : 'Primero selecciona sucursal')}
                        </Text>
                        <MaterialIcons
                            name={showEmpleadoPicker ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                            size={22}
                            color={!selectedSucursalId ? palette.disabled : palette.textMuted}
                        />
                    </TouchableOpacity>
                    {showEmpleadoPicker && selectedSucursalId && (
                        <View style={styles.dropdownList}>
                            {empleadosFiltrados.map(e => {
                                const selected = empleadoId === e.id;
                                return (
                                    <TouchableOpacity
                                        key={e.id}
                                        onPress={() => {
                                            setEmpleadoId(e.id);
                                            setShowEmpleadoPicker(false);
                                            setErrors(prev => ({ ...prev, empleado: '' }));
                                        }}
                                        style={[styles.dropdownItem, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }, selected && [styles.dropdownItemSelected, { borderColor: theme.colors.primary, backgroundColor: palette.selectedBg }]]}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.dropdownItemContent}>
                                            <View style={[styles.dropdownItemIcon, { backgroundColor: palette.surface, borderColor: palette.border }, selected && [styles.dropdownItemIconSelected, { borderColor: theme.colors.primary, backgroundColor: palette.selectedBgStrong }]]}>
                                                <MaterialIcons
                                                    name={selected ? "check" : "badge"}
                                                    size={18}
                                                    color={selected ? theme.colors.primary : palette.textMuted}
                                                />
                                            </View>
                                            <Text style={[styles.dropdownItemTitle, { color: palette.text }, selected && [styles.dropdownItemTitleSelected, { color: theme.colors.primary }]]}>
                                                {e.nombre}
                                            </Text>
                                        </View>
                                        <MaterialIcons
                                            name={selected ? "radio-button-checked" : "radio-button-unchecked"}
                                            size={20}
                                            color={selected ? theme.colors.primary : palette.textSoft}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                            {empleadosFiltrados.length === 0 && (
                                <View style={[styles.dropdownEmpty, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
                                    <Text style={[styles.dropdownEmptyText, { color: palette.textSoft }]}>No hay empleados disponibles</Text>
                                </View>
                            )}
                        </View>
                    )}
                    {errors.empleado && <Text style={styles.error}>{errors.empleado}</Text>}
                </View>

                {/* ═══════ Section 5: Fecha y Hora ═══════ */}
                <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="event" size={20} color={theme.colors.primary} />
                        <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Fecha y Hora</Text>
                    </View>

                    <View style={[styles.dateRow, responsive.isCompactPhone && styles.dateRowStacked]}>
                        {/* Fecha */}
                        <View style={{ flex: 1, marginRight: responsive.isCompactPhone ? 0 : 8, marginBottom: responsive.isCompactPhone ? 12 : 0 }}>
                            <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Fecha *</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                                <View style={[styles.timeInputContainer, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
                                    <MaterialIcons name="event" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, { color: palette.text }, !fechaSeleccionada && { color: palette.textSoft }]}>
                                        {fechaSeleccionada ? (() => {
                                            const [y, m, d] = fechaSeleccionada.split('-');
                                            const mNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                                            return `${d} / ${mNames[parseInt(m, 10) - 1]} / ${y}`;
                                        })() : 'Seleccionar fecha'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            {errors.fecha && <Text style={styles.error}>{errors.fecha}</Text>}
                        </View>

                        {/* Hora */}
                        <View style={{ flex: 1, marginLeft: responsive.isCompactPhone ? 0 : 8 }}>
                            <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Hora Inicio *</Text>
                            <TouchableOpacity onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
                                <View style={[styles.timeInputContainer, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
                                    <MaterialIcons name="access-time" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, { color: palette.text }, !hora && { color: palette.textSoft }]}>
                                        {hora ? (() => {
                                            const [h, m] = hora.split(':').map(Number);
                                            const ampm = h >= 12 ? 'PM' : 'AM';
                                            const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                                            return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
                                        })() : 'Seleccionar hora'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            {errors.hora && <Text style={styles.error}>{errors.hora}</Text>}

                            {/* Approximate end time */}
                            {hora && /^\d{1,2}:\d{2}$/.test(hora) && selectedServiciosIds.length > 0 && (
                                <Text style={[styles.endTimeHint, { color: theme.colors.primary }]}>
                                    Fin aprox: {(() => {
                                        try {
                                            const [h, m] = hora.split(':').map(Number);
                                            const fin = new Date();
                                            fin.setHours(h);
                                            fin.setMinutes(m + totalDuracion);
                                            return `${fin.getHours().toString().padStart(2, '0')}:${fin.getMinutes().toString().padStart(2, '0')}`;
                                        } catch { return '--:--'; }
                                    })()}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* ═══════ Save Button ═══════ */}
                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: theme.colors.primary }, saving && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <MaterialIcons name="check-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.saveBtnText}>Guardar Cita</Text>
                        </>
                    )}
                </TouchableOpacity>

            </ScrollView>

            {/* Time Picker Modal */}
            <TimePickerModal
                visible={showTimePicker}
                value={hora}
                onSelect={setHora}
                onClose={() => setShowTimePicker(false)}
            />

            {/* Date Picker Modal */}
            <DatePickerModal
                visible={showDatePicker}
                value={fechaSeleccionada}
                onSelect={(date) => setFechaSeleccionada(date)}
                onClose={() => setShowDatePicker(false)}
            />

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
        maxWidth: 700,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 16,
    },
    section: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#e2e8f0',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    input: {
        backgroundColor: '#0f172a',
        height: 48,
    },
    fieldLabel: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        backgroundColor: '#0f172a',
        overflow: 'hidden',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    dropdownTriggerDisabled: {
        opacity: 0.6,
    },
    dropdownTriggerText: {
        color: '#e2e8f0',
        fontSize: 16,
    },
    dropdownTriggerPlaceholder: {
        color: '#64748b',
    },
    dropdownList: {
        marginTop: 10,
        gap: 10,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    dropdownItemSelected: {
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
    },
    dropdownItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    dropdownItemIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#111827',
        borderWidth: 1,
        borderColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    dropdownItemIconSelected: {
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
    },
    dropdownItemTitle: {
        color: '#e2e8f0',
        fontSize: 14,
        fontWeight: '600',
    },
    dropdownItemTitleSelected: {
        color: '#38bdf8',
    },
    dropdownEmpty: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 14,
    },
    dropdownEmptyText: {
        color: '#64748b',
        textAlign: 'center',
        fontSize: 13,
    },
    servicesTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    servicesTriggerText: {
        color: '#e2e8f0',
        fontSize: 16,
    },
    servicesTriggerPlaceholder: {
        color: '#64748b',
    },
    servicesDropdown: {
        marginTop: 10,
        gap: 10,
    },
    serviceListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    serviceListItemSelected: {
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
    },
    serviceListItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    serviceListIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#111827',
        borderWidth: 1,
        borderColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    serviceListIconSelected: {
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
    },
    serviceListImage: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#111827',
        borderWidth: 1,
        borderColor: '#334155',
        marginRight: 12,
    },
    serviceListTextBlock: {
        flex: 1,
    },
    serviceListTitle: {
        color: '#e2e8f0',
        fontSize: 14,
        fontWeight: '600',
    },
    serviceListTitleSelected: {
        color: '#38bdf8',
        fontWeight: '600',
    },
    serviceListMeta: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 2,
    },
    summaryBox: {
        marginTop: 16,
        backgroundColor: '#0f172a',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    summaryLabel: {
        color: '#94a3b8',
        fontSize: 14,
    },
    summaryValue: {
        color: '#e2e8f0',
        fontSize: 15,
        fontWeight: '600',
    },
    suggestions: {
        marginTop: 8,
        borderRadius: 12,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    newClientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: 'rgba(56, 189, 248, 0.05)',
    },
    dateRow: {
        flexDirection: 'row',
    },
    dateRowStacked: {
        flexDirection: 'column',
    },
    timeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
    },
    timeInputText: {
        color: '#e2e8f0',
        fontSize: 16,
    },
    endTimeHint: {
        fontSize: 12,
        color: '#38bdf8',
        marginTop: 6,
    },
    error: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        marginTop: 24,
        paddingVertical: 16,
        borderRadius: 14,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
    },
});
