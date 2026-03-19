import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform, Modal as RNModal } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import KyrosScreen from '../../components/KyrosScreen';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import { safeAction } from '../../lib/safeAction';
import { useKyrosPalette } from '../../lib/useKyrosPalette';
import { useResponsiveLayout } from '../../lib/useResponsiveLayout';

// ============================================================
// DATE PICKER MODAL (iPhone-style)
// ============================================================
function DatePickerModal({ visible, value, onSelect, onClose }: {
    visible: boolean;
    value: string;
    onSelect: (date: string) => void;
    onClose: () => void;
}) {
    const palette = useKyrosPalette();
    const theme = useTheme();
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

    // Auto-adjust day if it became invalid
    useEffect(() => {
        if (isCurrentMonth && selectedDay < today.getDate()) {
            setSelectedDay(today.getDate());
        } else if (selectedDay > daysInMonth) {
            setSelectedDay(daysInMonth);
        }
    }, [isCurrentMonth, selectedMonth, selectedYear, daysInMonth, selectedDay, today]);

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    return (
        <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={[dpStyles.overlay, { backgroundColor: palette.overlay }]} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={[dpStyles.container, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <Text style={[dpStyles.title, { color: palette.textStrong }]}>Seleccionar Fecha</Text>
                    <View style={[dpStyles.preview, { backgroundColor: palette.surfaceAlt }]}>
                        <Text style={[dpStyles.previewText, { color: theme.colors.primary }]}>
                            {selectedDay.toString().padStart(2, '0')} / {monthNames[selectedMonth - 1]} / {selectedYear}
                        </Text>
                    </View>
                    <View style={dpStyles.wheelsRow}>
                        <View style={[dpStyles.column, { width: 70 }]}>
                            <Text style={dpStyles.columnLabel}>Día</Text>
                            <ScrollView style={dpStyles.scrollColumn} showsVerticalScrollIndicator={false}>
                                {days.map(d => (
                                    <TouchableOpacity key={d} onPress={() => setSelectedDay(d)}
                                        style={[dpStyles.wheelItem, selectedDay === d && dpStyles.wheelItemSelected, { paddingHorizontal: 10 }]}>
                                        <Text style={[dpStyles.wheelText, selectedDay === d && dpStyles.wheelTextSelected]}>{d.toString().padStart(2, '0')}</Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>
                        <Text style={dpStyles.separator}>/</Text>
                        <View style={[dpStyles.column, { width: 90 }]}>
                            <Text style={dpStyles.columnLabel}>Mes</Text>
                            <ScrollView style={dpStyles.scrollColumn} showsVerticalScrollIndicator={false}>
                                {months.map(m => (
                                    <TouchableOpacity key={m} onPress={() => setSelectedMonth(m)}
                                        style={[dpStyles.wheelItem, selectedMonth === m && dpStyles.wheelItemSelected, { paddingHorizontal: 10 }]}>
                                        <Text style={[dpStyles.wheelText, selectedMonth === m && dpStyles.wheelTextSelected, { fontSize: 18 }]}>{monthNames[m - 1]}</Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>
                        <Text style={dpStyles.separator}>/</Text>
                        <View style={[dpStyles.column, { width: 80 }]}>
                            <Text style={dpStyles.columnLabel}>Año</Text>
                            <ScrollView style={dpStyles.scrollColumn} showsVerticalScrollIndicator={false}>
                                {years.map(y => (
                                    <TouchableOpacity key={y} onPress={() => setSelectedYear(y)}
                                        style={[dpStyles.wheelItem, selectedYear === y && dpStyles.wheelItemSelected, { paddingHorizontal: 10 }]}>
                                        <Text style={[dpStyles.wheelText, selectedYear === y && dpStyles.wheelTextSelected, { fontSize: 18 }]}>{y}</Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>
                    </View>
                    <View style={dpStyles.actions}>
                        <TouchableOpacity onPress={onClose} style={dpStyles.cancelBtn}>
                            <Text style={{ color: '#94a3b8', fontSize: 16 }}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { onSelect(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`); onClose(); }}
                            style={dpStyles.confirmBtn}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </RNModal>
    );
}

// ============================================================
// TIME PICKER MODAL
// ============================================================
function TimePickerModal({ visible, value, onSelect, onClose }: {
    visible: boolean;
    value: string;
    onSelect: (time: string) => void;
    onClose: () => void;
}) {
    const palette = useKyrosPalette();
    const theme = useTheme();
    const [selectedHour12, setSelectedHour12] = useState(9);
    const [selectedMinute, setSelectedMinute] = useState(0);
    const [isPM, setIsPM] = useState(false);

    useEffect(() => {
        if (value && /^\d{1,2}:\d{2}$/.test(value)) {
            const [h, m] = value.split(':').map(Number);
            setSelectedMinute(m);
            if (h >= 12) { setIsPM(true); setSelectedHour12(h === 12 ? 12 : h - 12); }
            else { setIsPM(false); setSelectedHour12(h === 0 ? 12 : h); }
        }
    }, [value, visible]);

    const hours12 = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const displayHour = selectedHour12.toString().padStart(2, '0');
    const displayMinute = selectedMinute.toString().padStart(2, '0');
    const displayPeriod = isPM ? 'PM' : 'AM';

    return (
        <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={[dpStyles.overlay, { backgroundColor: palette.overlay }]} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={[dpStyles.container, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <Text style={[dpStyles.title, { color: palette.textStrong }]}>Seleccionar Hora</Text>
                    <View style={[dpStyles.preview, { backgroundColor: palette.surfaceAlt }]}>
                        <Text style={[dpStyles.previewText, { color: theme.colors.primary }]}>{displayHour}:{displayMinute} {displayPeriod}</Text>
                    </View>
                    <View style={dpStyles.wheelsRow}>
                        <View style={[dpStyles.column, { width: 90 }]}>
                            <Text style={dpStyles.columnLabel}>Hora</Text>
                            <ScrollView style={dpStyles.scrollColumn} showsVerticalScrollIndicator={false}>
                                {hours12.map(h => (
                                    <TouchableOpacity key={h} onPress={() => setSelectedHour12(h)}
                                        style={[dpStyles.wheelItem, selectedHour12 === h && dpStyles.wheelItemSelected]}>
                                        <Text style={[dpStyles.wheelText, selectedHour12 === h && dpStyles.wheelTextSelected]}>{h.toString().padStart(2, '0')}</Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>
                        <Text style={dpStyles.separator}>:</Text>
                        <View style={[dpStyles.column, { width: 90 }]}>
                            <Text style={dpStyles.columnLabel}>Min</Text>
                            <ScrollView style={dpStyles.scrollColumn} showsVerticalScrollIndicator={false}>
                                {minutes.map(m => (
                                    <TouchableOpacity key={m} onPress={() => setSelectedMinute(m)}
                                        style={[dpStyles.wheelItem, selectedMinute === m && dpStyles.wheelItemSelected]}>
                                        <Text style={[dpStyles.wheelText, selectedMinute === m && dpStyles.wheelTextSelected]}>{m.toString().padStart(2, '0')}</Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>
                        <View style={[dpStyles.column, { width: 80, marginLeft: 10, justifyContent: 'center' }]}>
                            <TouchableOpacity onPress={() => setIsPM(false)} style={[dpStyles.ampmBtn, !isPM && dpStyles.ampmBtnSelected]}>
                                <Text style={[dpStyles.ampmText, !isPM && dpStyles.ampmTextSelected]}>AM</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsPM(true)} style={[dpStyles.ampmBtn, isPM && dpStyles.ampmBtnSelected]}>
                                <Text style={[dpStyles.ampmText, isPM && dpStyles.ampmTextSelected]}>PM</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={dpStyles.actions}>
                        <TouchableOpacity onPress={onClose} style={[dpStyles.cancelBtn, { borderColor: palette.border }]}>
                            <Text style={{ color: palette.textMuted, fontSize: 16 }}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                let finalHour24 = selectedHour12;
                                if (isPM && finalHour24 !== 12) finalHour24 += 12;
                                if (!isPM && finalHour24 === 12) finalHour24 = 0;
                                onSelect(`${finalHour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`);
                                onClose();
                            }}
                            style={[dpStyles.confirmBtn, { backgroundColor: theme.colors.primary }]}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </RNModal>
    );
}

const dpStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    container: { backgroundColor: '#1e293b', borderRadius: 20, padding: 24, width: 320, borderWidth: 1, borderColor: '#334155' },
    title: { color: '#e2e8f0', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
    preview: { backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
    previewText: { color: '#38bdf8', fontSize: 32, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
    wheelsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    column: { alignItems: 'center', width: 100 },
    columnLabel: { color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
    scrollColumn: { maxHeight: 200 },
    wheelItem: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, marginVertical: 2 },
    wheelItemSelected: { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
    wheelText: { color: '#94a3b8', fontSize: 20, textAlign: 'center', fontVariant: ['tabular-nums'] },
    wheelTextSelected: { color: '#38bdf8', fontWeight: 'bold' },
    separator: { color: '#38bdf8', fontSize: 32, fontWeight: 'bold', marginHorizontal: 8, marginTop: 20 },
    ampmBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginVertical: 4, borderWidth: 1, borderColor: '#334155' },
    ampmBtnSelected: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
    ampmText: { color: '#94a3b8', fontSize: 16, textAlign: 'center', fontWeight: '600' },
    ampmTextSelected: { color: '#38bdf8', fontWeight: 'bold' },
    actions: { flexDirection: 'row', marginTop: 20, gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    confirmBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#2563eb' },
});

// ============================================================
// TIPOS
// ============================================================
interface Servicio { id: number; nombre: string; precio_base: number; duracion_aprox_minutos: number; }
interface Empleado { id: number; nombre: string; sucursal_id: number | null; servicios_ids?: number[]; disponible?: boolean; ocupadoHasta?: string; }

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function EditarCitaScreen() {
    const theme = useTheme();
    const palette = useKyrosPalette();
    const responsive = useResponsiveLayout();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const citaId = Number(id);
    const { negocioId, isLoading: appLoading } = useApp();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [clienteNombre, setClienteNombre] = useState('');
    const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);
    const [selectedServiciosIds, setSelectedServiciosIds] = useState<number[]>([]);
    const [empleadoId, setEmpleadoId] = useState<number | null>(null);
    const [fechaSeleccionada, setFechaSeleccionada] = useState('');
    const [hora, setHora] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [ocupacion, setOcupacion] = useState<Record<number, string | null>>({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [schedule, setSchedule] = useState<any>(null);

    const serviciosSeleccionados = servicios.filter(s => selectedServiciosIds.includes(s.id));

    // Fetch sucursal schedule when selected
    useEffect(() => {
        const fetchSchedule = async () => {
            if (!selectedSucursalId) { setSchedule(null); return; }
            const { data } = await supabase
                .from('sucursales')
                .select('hora_apertura, hora_cierre, descanso_inicio, descanso_fin, dias_abiertos')
                .eq('id', selectedSucursalId)
                .single();
            if (data) setSchedule(data);
        };
        fetchSchedule();
    }, [selectedSucursalId]);

    const checkAvailability = useCallback(async () => {
        if (!fechaSeleccionada || !hora) return;
        const totalMinutos = serviciosSeleccionados.reduce((acc, s) => acc + (s.duracion_aprox_minutos || 30), 0);
        const fechaHoraInicio = new Date(`${fechaSeleccionada}T${hora}:00`);
        const fechaHoraFin = new Date(fechaHoraInicio.getTime() + totalMinutos * 60000);

        const { data: citasActivas } = await supabase
            .from('citas')
            .select('empleado_id, fecha_hora_inicio, fecha_hora_fin')
            .neq('estado', 'cancelada')
            .neq('id', citaId)
            .or(`and(fecha_hora_inicio.lt.${fechaHoraFin.toISOString()},fecha_hora_fin.gt.${fechaHoraInicio.toISOString()})`);

        const newOcupacion: Record<number, string | null> = {};
        empleadosFiltrados.forEach(e => {
            const cita = citasActivas?.find(c => c.empleado_id === e.id);
            if (cita) {
                const finDate = new Date(cita.fecha_hora_fin);
                const h = finDate.getHours(); const m = finDate.getMinutes();
                const period = h >= 12 ? 'PM' : 'AM';
                const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
                newOcupacion[e.id] = `Libre a las ${h12}:${m.toString().padStart(2, '0')} ${period}`;
            } else {
                newOcupacion[e.id] = null;
            }
        });
        setOcupacion(newOcupacion);
    }, [fechaSeleccionada, hora, serviciosSeleccionados, citaId, empleadosFiltrados]);

    const empleadosFiltrados = empleados.filter(e => {
        const matchSucursal = !e.sucursal_id || e.sucursal_id === selectedSucursalId;
        if (!matchSucursal) return false;
        if (selectedServiciosIds.length > 0 && e.servicios_ids) {
            return selectedServiciosIds.every(sId => e.servicios_ids!.includes(sId));
        }
        return true;
    });

    const loadFormData = useCallback(async () => {
        if (!negocioId) return;
        const { data: servData } = await supabase.from('servicios').select('id, nombre, precio_base, duracion_aprox_minutos').eq('negocio_id', negocioId).eq('activo', true).order('nombre');
        setServicios(servData || []);
        const { data: empData } = await supabase.from('empleados').select(`id, nombre, sucursal_id, disponible, empleado_servicios(servicio_id)`).eq('negocio_id', negocioId).order('nombre');
        setEmpleados((empData || []).map((e: any) => ({
            id: e.id, nombre: e.nombre, sucursal_id: e.sucursal_id, disponible: e.disponible,
            servicios_ids: e.empleado_servicios?.map((es: any) => es.servicio_id) || [],
        })));
    }, [negocioId]);

    const loadCita = useCallback(async () => {
        setLoading(true);
        try {
            const { data: cita, error: citaErr } = await supabase
                .from('citas')
                .select(`id, fecha_hora_inicio, fecha_hora_fin, estado,
    empleado_id, sucursal_id, cliente_id, monto_total,
    nombre_cliente_manual,
    clientes_bot!cliente_id(nombre),
    citas_servicios(servicio_id)`)
                .eq('id', citaId).eq('negocio_id', negocioId).single();

            if (citaErr || !cita) { setNotFound(true); return; }

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

            const clientObj = cita.clientes_bot as any;
            if (clientObj?.nombre) setClienteNombre(clientObj.nombre);
            else if (cita.nombre_cliente_manual) setClienteNombre(cita.nombre_cliente_manual);

            const svcIds = ((cita.citas_servicios || []) as any[]).map((cs: any) => cs.servicio_id);
            setSelectedServiciosIds(svcIds);
            await loadFormData();
        } catch (err) {
            console.error('Error loading cita:', err);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    }, [citaId, negocioId, loadFormData]);

    useEffect(() => {
        if (!appLoading && negocioId && citaId) loadCita();
    }, [appLoading, negocioId, citaId, loadCita]);

    // When date/hora/services change, re-check availability
    useEffect(() => {
        if (fechaSeleccionada && hora && selectedServiciosIds.length > 0) {
            checkAvailability();
        }
    }, [fechaSeleccionada, hora, selectedServiciosIds, checkAvailability]);

    const displayTimeFrom24 = (h24: string) => {
        if (!h24) return '';
        const [h, m] = h24.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
    };

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const validate = () => {
        const newErrors: any = {};
        if (selectedServiciosIds.length === 0) newErrors.servicios = 'Selecciona al menos un servicio';
        if (!empleadoId) newErrors.empleado = 'Selecciona un empleado';
        if (!hora.trim()) newErrors.hora = 'Selecciona la hora';
        
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
                const openDayNames = (schedule.dias_abiertos || []).map((d: number) => {
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
            await safeAction('EditarCita', async () => {
                const totalMinutos = serviciosSeleccionados.reduce((acc, s) => acc + (s.duracion_aprox_minutos || 30), 0);
                const costoTotalBase = serviciosSeleccionados.reduce((acc, s) => acc + (s.precio_base || 0), 0);
                const fechaHoraInicio = new Date(`${fechaSeleccionada}T${hora}:00`);
                const fechaHoraFin = new Date(fechaHoraInicio.getTime() + totalMinutos * 60000);

                const { data: citasEmpalme } = await supabase.from('citas')
                    .select('id').eq('empleado_id', empleadoId).neq('estado', 'cancelada').neq('id', citaId)
                    .or(`and(fecha_hora_inicio.lt.${fechaHoraFin.toISOString()},fecha_hora_fin.gt.${fechaHoraInicio.toISOString()})`);

                if (citasEmpalme && citasEmpalme.length > 0) {
                    Alert.alert('⚠️ Empalme de Horario', 'El empleado ya tiene una cita en ese horario. Por favor elige otro horario o empleado.');
                    return;
                }

                const { error: updError } = await supabase.from('citas').update({
                    empleado_id: empleadoId, sucursal_id: selectedSucursalId,
                    fecha_hora_inicio: fechaHoraInicio.toISOString(),
                    fecha_hora_fin: fechaHoraFin.toISOString(),
                    monto_total: costoTotalBase,
                }).eq('id', citaId).eq('negocio_id', negocioId);

                if (updError) throw updError;

                await supabase.from('citas_servicios').delete().eq('cita_id', citaId);
                const serviciosInserts = serviciosSeleccionados.map(s => ({ cita_id: citaId, servicio_id: s.id, precio_actual: s.precio_base }));
                const { error: svcErr } = await supabase.from('citas_servicios').insert(serviciosInserts);
                if (svcErr) throw svcErr;

                Alert.alert('✅ Cita Actualizada', 'Los cambios se guardaron correctamente.', [
                    { text: 'OK', onPress: () => router.replace('/(tabs)/agenda') }
                ]);
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <KyrosScreen title="Editar Cita">
                <View style={styles.centerState}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ color: palette.textMuted, marginTop: 16 }}>Cargando cita...</Text>
                </View>
            </KyrosScreen>
        );
    }

    if (notFound) {
        return (
            <KyrosScreen title="Editar Cita">
                <View style={styles.centerState}>
                    <MaterialIcons name="error-outline" size={64} color="#ef4444" />
                    <Text style={{ color: '#ef4444', marginTop: 16, textAlign: 'center' }}>Cita no encontrada</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </KyrosScreen>
        );
    }

    const totalMinutos = serviciosSeleccionados.reduce((acc, s) => acc + (s.duracion_aprox_minutos || 30), 0);
    const costoTotal = serviciosSeleccionados.reduce((acc, s) => acc + (s.precio_base || 0), 0);

    return (
        <KyrosScreen title="Editar Cita">
            <ScrollView style={[styles.scroll, { backgroundColor: palette.background, maxWidth: responsive.formMaxWidth, alignSelf: 'center' }]} showsVerticalScrollIndicator={false}>

                {/* ═══════ Section 1: Cliente ═══════ */}
                <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="person" size={20} color={theme.colors.primary} />
                        <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Cliente</Text>
                    </View>
                    <View style={[styles.readonlyField, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
                        <MaterialIcons name="account-circle" size={22} color={palette.textSoft} style={{ marginRight: 10 }} />
                        <Text style={{ color: palette.text, fontSize: 16 }}>{clienteNombre || 'Sin cliente registrado'}</Text>
                    </View>
                </View>

                {/* ═══════ Section 2: Servicios (Solo lectura) ═══════ */}
                <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="content-cut" size={20} color={theme.colors.primary} />
                        <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Servicios</Text>
                    </View>
                    <View style={styles.chipsContainer}>
                        {serviciosSeleccionados.map(s => (
                            <View key={s.id} style={[styles.chip, { backgroundColor: palette.selectedBg, borderColor: theme.colors.primary }]}>
                                <Text style={[styles.chipText, { color: theme.colors.primary, fontWeight: '600' }]}>
                                    {s.nombre} (${s.precio_base})
                                </Text>
                            </View>
                        ))}
                    </View>
                    {errors.servicios && <Text style={styles.error}>{errors.servicios}</Text>}

                    {serviciosSeleccionados.length > 0 && (
                        <View style={[styles.summaryBox, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>Servicios</Text>
                                <Text style={[styles.summaryValue, { color: palette.text }]}>{serviciosSeleccionados.length}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>Duración estimada</Text>
                                <Text style={[styles.summaryValue, { color: palette.text }]}>{totalMinutos} min</Text>
                            </View>
                            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                                <Text style={[styles.summaryLabel, { color: palette.textMuted, fontWeight: 'bold' }]}>Total</Text>
                                <Text style={[styles.summaryValue, { color: '#22c55e', fontSize: 18 }]}>${costoTotal}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* ═══════ Section 3: Empleado ═══════ */}
                <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="badge" size={20} color={theme.colors.primary} />
                        <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Empleado *</Text>
                    </View>
                    {Platform.OS === 'web' ? (
                        <select
                            value={empleadoId ?? ''}
                            onChange={(e) => {
                                const v = e.target.value;
                                setEmpleadoId(v === '' ? null : Number(v));
                                setErrors(prev => ({ ...prev, empleado: '' }));
                            }}
                            style={{ width: '100%', padding: '14px 12px', backgroundColor: palette.inputBg, color: palette.text, border: `1px solid ${palette.border}`, borderRadius: '12px', fontSize: '16px' } as any}
                        >
                            <option value="">Seleccionar Empleado</option>
                            {empleadosFiltrados.map(e => (
                                <option key={e.id} value={e.id} disabled={!!ocupacion[e.id]}>
                                    {e.nombre}{ocupacion[e.id] ? ` — OCUPADO (${ocupacion[e.id]})` : ''}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <View style={[styles.pickerContainer, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
                            <Picker
                                selectedValue={empleadoId}
                                onValueChange={(val) => { setEmpleadoId(val); setErrors(prev => ({ ...prev, empleado: '' })); }}
                                style={{ color: palette.text }}
                                dropdownIconColor={palette.textMuted}
                            >
                                <Picker.Item label="Seleccionar Empleado" value={null} />
                                {empleadosFiltrados.map(e => (
                                    <Picker.Item
                                        key={e.id}
                                        label={e.nombre + (ocupacion[e.id] ? ` — OCUPADO` : '')}
                                        value={e.id}
                                        enabled={!ocupacion[e.id]}
                                    />
                                ))}
                            </Picker>
                        </View>
                    )}
                    {errors.empleado && <Text style={styles.error}>{errors.empleado}</Text>}
                </View>

                {/* ═══════ Section 4: Fecha y Hora ═══════ */}
                <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="event" size={20} color={theme.colors.primary} />
                        <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Fecha y Hora</Text>
                    </View>
                    <View style={{ gap: 14 }}>
                        <View>
                            <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Fecha *</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.timeInputContainer, { backgroundColor: palette.inputBg, borderColor: palette.border }]} activeOpacity={0.7}>
                                <MaterialIcons name="event" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                                <Text style={[styles.timeInputText, { color: palette.text }, !fechaSeleccionada && { color: palette.textSoft }]}>
                                    {fechaSeleccionada || 'Seleccionar fecha'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View>
                            <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Hora *</Text>
                            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.timeInputContainer, { backgroundColor: palette.inputBg, borderColor: palette.border }]} activeOpacity={0.7}>
                                <MaterialIcons name="access-time" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                                <Text style={[styles.timeInputText, { color: palette.text }, !hora && { color: palette.textSoft }]}>
                                    {hora ? displayTimeFrom24(hora) : 'Seleccionar hora'}
                                </Text>
                            </TouchableOpacity>
                            {errors.hora && <Text style={styles.error}>{errors.hora}</Text>}
                            {errors.fecha && <Text style={styles.error}>{errors.fecha}</Text>}
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.cancelBtn, { borderColor: palette.borderStrong }]}>
                        <Text style={{ color: palette.textMuted, fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}>
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Actualizar Cita</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 80 }} />
            </ScrollView>

            {/* Modals */}
            <DatePickerModal
                visible={showDatePicker}
                value={fechaSeleccionada}
                onSelect={(date) => setFechaSeleccionada(date)}
                onClose={() => setShowDatePicker(false)}
            />
            <TimePickerModal
                visible={showTimePicker}
                value={hora}
                onSelect={(t) => { setHora(t); setErrors(prev => ({ ...prev, hora: '' })); }}
                onClose={() => setShowTimePicker(false)}
            />
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    section: {
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: '#475569',
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
    sectionTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    readonlyField: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0f172a', borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: '#334155',
    },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
        backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#475569',
    },
    chipSelected: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
    chipText: { color: '#94a3b8', fontSize: 14 },
    chipTextSelected: { color: '#38bdf8', fontWeight: '600' },
    summaryBox: { marginTop: 14, backgroundColor: '#0f172a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    summaryLabel: { color: '#94a3b8', fontSize: 14 },
    summaryValue: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
    pickerContainer: { backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
    dateRow: { flexDirection: 'row' },
    fieldLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
    timeInputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0f172a', borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: '#334155',
    },
    timeInputText: { color: '#e2e8f0', fontSize: 16, fontWeight: '500', flex: 1 },
    actionsContainer: {
        flexDirection: 'row', gap: 12,
        marginHorizontal: 16, marginTop: 8,
    },
    cancelBtn: {
        flex: 1, paddingVertical: 16, alignItems: 'center',
        borderRadius: 14, borderWidth: 1, borderColor: '#475569',
    },
    saveBtn: {
        flex: 1, paddingVertical: 16, alignItems: 'center',
        borderRadius: 14, backgroundColor: '#2563eb',
    },
    error: { color: '#ef4444', fontSize: 12, marginTop: 6 },
    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    backBtn: { marginTop: 20, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});
