import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform, Modal as RNModal, FlatList } from 'react-native';
import { Text, TextInput, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getLocalToday } from '../../lib/date';
import KyrosScreen from '../../components/KyrosScreen';
import ClienteNuevoModal from '../../components/ClienteNuevoModal';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import { safeAction } from '../../lib/safeAction';
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
    const itemHeight = 44; // Approx height of each wheel item

    const handleScrollReset = (event: any, itemsLength: number) => {
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
            <TouchableOpacity style={timeStyles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={timeStyles.container}>
                    <Text style={timeStyles.title}>Seleccionar Hora</Text>

                    <View style={timeStyles.preview}>
                        <Text style={timeStyles.previewText}>
                            {selectedHour12.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
                            <Text style={{ fontSize: 24, color: '#94a3b8' }}> {isPM ? 'PM' : 'AM'}</Text>
                        </Text>
                    </View>

                    <View style={timeStyles.wheelsRow}>
                        {/* Hours Column */}
                        <View style={timeStyles.column}>
                            <Text style={timeStyles.columnLabel}>Hora</Text>
                            <ScrollView
                                style={timeStyles.scrollColumn}
                                showsVerticalScrollIndicator={false}
                                onScroll={(e) => handleScrollReset(e, hours12.length)}
                                scrollEventThrottle={16}
                            >
                                {hours12.map(h => (
                                    <TouchableOpacity
                                        key={h}
                                        onPress={() => setSelectedHour12(h)}
                                        style={[timeStyles.wheelItem, selectedHour12 === h && timeStyles.wheelItemSelected]}
                                    >
                                        <Text style={[timeStyles.wheelText, selectedHour12 === h && timeStyles.wheelTextSelected]}>
                                            {h.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {/* Padding extra para permitir que el último elemento sea seleccionable en medio de la vista */}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>

                        {/* Separator */}
                        <Text style={timeStyles.separator}>:</Text>

                        {/* Minutes Column */}
                        <View style={timeStyles.column}>
                            <Text style={timeStyles.columnLabel}>Min</Text>
                            <ScrollView
                                style={timeStyles.scrollColumn}
                                showsVerticalScrollIndicator={false}
                                onScroll={(e) => handleScrollReset(e, minutes.length)}
                                scrollEventThrottle={16}
                            >
                                {minutes.map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        onPress={() => setSelectedMinute(m)}
                                        style={[timeStyles.wheelItem, selectedMinute === m && timeStyles.wheelItemSelected]}
                                    >
                                        <Text style={[timeStyles.wheelText, selectedMinute === m && timeStyles.wheelTextSelected]}>
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
                                style={[timeStyles.ampmBtn, !isPM && timeStyles.ampmBtnSelected]}
                            >
                                <Text style={[timeStyles.ampmText, !isPM && timeStyles.ampmTextSelected]}>AM</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setIsPM(true)}
                                style={[timeStyles.ampmBtn, isPM && timeStyles.ampmBtnSelected]}
                            >
                                <Text style={[timeStyles.ampmText, isPM && timeStyles.ampmTextSelected]}>PM</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={timeStyles.actions}>
                        <TouchableOpacity onPress={onClose} style={timeStyles.cancelBtn}>
                            <Text style={{ color: '#94a3b8', fontSize: 16 }}>Cancelar</Text>
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
// ============================================================
// DATE PICKER MODAL (iPhone style wheels)
// ============================================================
function DatePickerModal({ visible, value, onSelect, onClose }: {
    visible: boolean;
    value: string; // YYYY-MM-DD
    onSelect: (date: string) => void;
    onClose: () => void;
}) {
    const today = new Date();
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
    }, [value, visible]);

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

    const handleScrollReset = (event: any, itemsLength: number) => {
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
            <TouchableOpacity style={timeStyles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={timeStyles.container}>
                    <Text style={timeStyles.title}>Seleccionar Fecha</Text>

                    <View style={timeStyles.preview}>
                        <Text style={[timeStyles.previewText, { fontSize: 28 }]}>
                            {selectedDay.toString().padStart(2, '0')} / {monthNames[selectedMonth - 1]} / {selectedYear}
                        </Text>
                    </View>

                    <View style={timeStyles.wheelsRow}>
                        {/* Day Column */}
                        <View style={[timeStyles.column, { width: 70 }]}>
                            <Text style={timeStyles.columnLabel}>Día</Text>
                            <ScrollView
                                style={timeStyles.scrollColumn}
                                showsVerticalScrollIndicator={false}
                                onScroll={(e) => handleScrollReset(e, days.length)}
                                scrollEventThrottle={16}
                            >
                                {days.map(d => (
                                    <TouchableOpacity
                                        key={d}
                                        onPress={() => setSelectedDay(d)}
                                        style={[timeStyles.wheelItem, selectedDay === d && timeStyles.wheelItemSelected, { paddingHorizontal: 10 }]}
                                    >
                                        <Text style={[timeStyles.wheelText, selectedDay === d && timeStyles.wheelTextSelected]}>
                                            {d.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>

                        <Text style={timeStyles.separator}>/</Text>

                        {/* Month Column */}
                        <View style={[timeStyles.column, { width: 90 }]}>
                            <Text style={timeStyles.columnLabel}>Mes</Text>
                            <ScrollView
                                style={timeStyles.scrollColumn}
                                showsVerticalScrollIndicator={false}
                                onScroll={(e) => handleScrollReset(e, months.length)}
                                scrollEventThrottle={16}
                            >
                                {months.map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        onPress={() => setSelectedMonth(m)}
                                        style={[timeStyles.wheelItem, selectedMonth === m && timeStyles.wheelItemSelected, { paddingHorizontal: 10 }]}
                                    >
                                        <Text style={[timeStyles.wheelText, selectedMonth === m && timeStyles.wheelTextSelected, { fontSize: 18 }]}>
                                            {monthNames[m - 1]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>

                        <Text style={timeStyles.separator}>/</Text>

                        {/* Year Column */}
                        <View style={[timeStyles.column, { width: 80 }]}>
                            <Text style={timeStyles.columnLabel}>Año</Text>
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
                        <TouchableOpacity onPress={onClose} style={timeStyles.cancelBtn}>
                            <Text style={{ color: '#94a3b8', fontSize: 16 }}>Cancelar</Text>
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
// WEB SELECT (dark themed dropdown for web)
// ============================================================
function WebSelect({ value, onChange, options, placeholder, disabled }: {
    value: any;
    onChange: (val: any) => void;
    options: { label: string; value: any }[];
    placeholder: string;
    disabled?: boolean;
}) {
    if (Platform.OS !== 'web') return null;
    return (
        <select
            value={value ?? ''}
            onChange={(e) => {
                const v = e.target.value;
                onChange(v === '' ? null : (isNaN(Number(v)) ? v : Number(v)));
            }}
            disabled={disabled}
            style={{
                width: '100%',
                padding: '14px 12px',
                backgroundColor: '#0f172a',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '12px',
                fontSize: '16px',
                fontFamily: 'sans-serif',
                appearance: 'none',
                WebkitAppearance: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 01.753 1.659l-4.796 5.48a1 1 0 01-1.506 0z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '36px',
            } as any}
        >
            <option value="" style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>{placeholder}</option>
            {options.map((opt, idx) => (
                <option key={idx} value={opt.value} style={{ backgroundColor: '#1e293b', color: '#e2e8f0' }}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function NuevaCitaScreen() {
    const theme = useTheme();
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
        if (!appLoading) {
            if (negocioId) {
                loadData();
            } else {
                console.warn('[NuevaCita] No negocioId found after app load');
                setLoading(false);
                setErrors({ general: 'No se encontró información del negocio.' });
            }
        }
    }, [appLoading, negocioId]);

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

    const loadData = async () => {
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
    };

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
    const selectedServiciosInfo = servicios.filter(s => selectedServiciosIds.includes(s.id));
    const totalPrecio = selectedServiciosInfo.reduce((acc, s) => acc + (s.precio_base || 0), 0);
    const totalDuracion = selectedServiciosInfo.reduce((acc, s) => acc + (s.duracion_aprox_minutos || 30), 0);

    if (loading) {
        return (
            <KyrosScreen title="Nueva Cita">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#38bdf8" />
                    <Text style={{ textAlign: 'center', marginTop: 16, color: '#94a3b8' }}>Cargando datos...</Text>
                </View>
            </KyrosScreen>
        );
    }

    if (errors.general) {
        return (
            <KyrosScreen title="Nueva Cita">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <MaterialIcons name="error-outline" size={48} color="#ef4444" />
                    <Text style={{ marginTop: 16, textAlign: 'center', color: '#fff', fontSize: 16 }}>
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
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* ═══════ Section 1: Cliente ═══════ */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="person" size={20} color="#38bdf8" />
                        <Text style={styles.sectionTitle}>Cliente</Text>
                    </View>

                    <TextInput
                        mode="outlined"
                        placeholder="Buscar cliente..."
                        placeholderTextColor="#64748b"
                        value={clienteNombre}
                        onChangeText={(text) => {
                            setClienteNombre(text);
                            if (clienteId) setClienteId(null);
                        }}
                        error={!!errors.cliente}
                        right={clienteId ? <TextInput.Icon icon="check-circle" color="#22c55e" /> : null}
                        style={styles.input}
                        textColor="#e2e8f0"
                        outlineColor="#334155"
                        activeOutlineColor="#38bdf8"
                        theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                    />
                    {errors.cliente && <Text style={styles.error}>{errors.cliente}</Text>}

                    {/* Suggestions */}
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
                                    <MaterialIcons name="person-outline" size={18} color="#38bdf8" style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#e2e8f0', flex: 1 }}>{c.nombre}</Text>
                                    <Text style={{ color: '#64748b', fontSize: 12 }}>{c.telefono}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.newClientBtn}
                        onPress={() => setModalClienteVisible(true)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="person-add" size={18} color="#38bdf8" />
                        <Text style={{ color: '#38bdf8', marginLeft: 8, fontWeight: '600' }}>¿Cliente nuevo? Registrar aquí</Text>
                    </TouchableOpacity>
                </View>

                {/* ═══════ Section 2: Sucursal (Only for dueño) ═══════ */}
                {(rol === 'dueño' || sucursales.length > 1) && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="store" size={20} color="#38bdf8" />
                            <Text style={styles.sectionTitle}>Sucursal</Text>
                        </View>
                        {Platform.OS === 'web' ? (
                            <WebSelect
                                value={selectedSucursalId}
                                onChange={setSelectedSucursalId}
                                options={sucursales.map(s => ({ label: s.nombre, value: s.id }))}
                                placeholder="Seleccionar Sucursal"
                            />
                        ) : (
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={selectedSucursalId}
                                    onValueChange={(val) => setSelectedSucursalId(val)}
                                    style={{ color: '#e2e8f0' }}
                                    dropdownIconColor="#94a3b8"
                                >
                                    <Picker.Item label="Seleccionar Sucursal" value={null} />
                                    {sucursales.map(s => (
                                        <Picker.Item key={s.id} label={s.nombre} value={s.id} />
                                    ))}
                                </Picker>
                            </View>
                        )}
                        {errors.sucursal && <Text style={styles.error}>{errors.sucursal}</Text>}
                    </View>
                )}

                {/* ═══════ Section 3: Servicios ═══════ */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="content-cut" size={20} color="#38bdf8" />
                        <Text style={styles.sectionTitle}>Servicios</Text>
                    </View>

                    <View style={styles.chipsContainer}>
                        {servicios.map(servicio => {
                            const selected = selectedServiciosIds.includes(servicio.id);
                            return (
                                <TouchableOpacity
                                    key={servicio.id}
                                    onPress={() => toggleServicio(servicio.id)}
                                    style={[
                                        styles.serviceChip,
                                        selected && styles.serviceChipSelected
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    {selected && <MaterialIcons name="check" size={16} color="#38bdf8" style={{ marginRight: 4 }} />}
                                    <Text style={[
                                        styles.serviceChipText,
                                        selected && styles.serviceChipTextSelected
                                    ]}>
                                        {servicio.nombre} (${servicio.precio_base})
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {errors.servicios && <Text style={styles.error}>{errors.servicios}</Text>}

                    {/* Summary of selected services */}
                    {selectedServiciosIds.length > 0 && (
                        <View style={styles.summaryBox}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Servicios seleccionados</Text>
                                <Text style={styles.summaryValue}>{selectedServiciosIds.length}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Duración estimada</Text>
                                <Text style={styles.summaryValue}>{totalDuracion} min</Text>
                            </View>
                            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                                <Text style={[styles.summaryLabel, { fontWeight: 'bold' }]}>Total</Text>
                                <Text style={[styles.summaryValue, { color: '#22c55e', fontSize: 18 }]}>${totalPrecio}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* ═══════ Section 4: Empleado ═══════ */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="badge" size={20} color="#38bdf8" />
                        <Text style={styles.sectionTitle}>Empleado</Text>
                    </View>
                    {Platform.OS === 'web' ? (
                        <WebSelect
                            value={empleadoId}
                            onChange={setEmpleadoId}
                            options={empleadosFiltrados.map(e => ({ label: e.nombre, value: e.id }))}
                            placeholder={selectedSucursalId ? "Seleccionar Empleado" : "Primero selecciona sucursal"}
                            disabled={!selectedSucursalId}
                        />
                    ) : (
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={empleadoId}
                                onValueChange={(val) => setEmpleadoId(val)}
                                enabled={!!selectedSucursalId}
                                style={{ color: '#e2e8f0' }}
                                dropdownIconColor="#94a3b8"
                            >
                                <Picker.Item label={selectedSucursalId ? "Seleccionar Empleado" : "Primero selecciona sucursal"} value={null} />
                                {empleadosFiltrados.map(e => (
                                    <Picker.Item key={e.id} label={e.nombre} value={e.id} />
                                ))}
                            </Picker>
                        </View>
                    )}
                    {errors.empleado && <Text style={styles.error}>{errors.empleado}</Text>}
                </View>

                {/* ═══════ Section 5: Fecha y Hora ═══════ */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="event" size={20} color="#38bdf8" />
                        <Text style={styles.sectionTitle}>Fecha y Hora</Text>
                    </View>

                    <View style={styles.dateRow}>
                        {/* Fecha */}
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.fieldLabel}>Fecha *</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                                <View style={styles.timeInputContainer}>
                                    <MaterialIcons name="event" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, !fechaSeleccionada && { color: '#64748b' }]}>
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
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.fieldLabel}>Hora Inicio *</Text>
                            <TouchableOpacity onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
                                <View style={styles.timeInputContainer}>
                                    <MaterialIcons name="access-time" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, !hora && { color: '#64748b' }]}>
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
                                <Text style={styles.endTimeHint}>
                                    Fin aprox: {(() => {
                                        try {
                                            const [h, m] = hora.split(':').map(Number);
                                            const fin = new Date();
                                            fin.setHours(h);
                                            fin.setMinutes(m + totalDuracion);
                                            return `${fin.getHours().toString().padStart(2, '0')}:${fin.getMinutes().toString().padStart(2, '0')}`;
                                        } catch (e) { return '--:--'; }
                                    })()}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* ═══════ Save Button ═══════ */}
                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
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
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    serviceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    serviceChipSelected: {
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
    },
    serviceChipText: {
        color: '#e2e8f0',
        fontSize: 13,
    },
    serviceChipTextSelected: {
        color: '#38bdf8',
        fontWeight: '600',
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
