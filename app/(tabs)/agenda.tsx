import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosButton from '../../components/KyrosButton';
import KyrosSelector from '../../components/KyrosSelector';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import { getLocalToday, formatDateTitle, getStartOfDayLocal, getEndOfDayLocal } from '../../lib/date';
import NetInfo from '@react-native-community/netinfo';
import { useKyrosPalette } from '../../lib/useKyrosPalette';

// Configurar calendario en español
LocaleConfig.locales['es'] = {
    monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    monthNamesShort: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
    dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

// ============================================================
// CONFIGURACIÓN DE TABLAS - Cambiar nombres aquí si es necesario
// ============================================================
const TABLES = {
    citas: 'citas',
    empleados: 'empleados',
    clientes: 'clientes_bot'
};

// Status colors matching web design
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    confirmada: { bg: '#e3f2fd', text: '#1976d2', border: '#1976d2' },
    pendiente: { bg: '#e3f2fd', text: '#1976d2', border: '#1976d2' },
    en_proceso: { bg: '#fff3e0', text: '#f57c00', border: '#f57c00' },
    completada: { bg: '#e8f5e9', text: '#388e3c', border: '#388e3c' },
    cancelada: { bg: '#ffebee', text: '#d32f2f', border: '#d32f2f' },
};

// Tipo para servicios en citas (Supabase returns nested relations as arrays)
interface CitaServicio {
    precio_actual: number | null;
    servicios: {
        nombre: string;
        precio_base: number;
    }[] | null;
}

// Tipo para las citas (Supabase returns embedded relations as arrays)
interface Cita {
    id: number;
    fecha_hora_inicio: string;
    fecha_hora_fin: string;
    estado: string;
    monto_total: number | null;
    nombre_cliente_manual: string | null;
    empleados: { nombre: string }[] | null;
    clientes_bot: { nombre: string }[] | null;
    citas_servicios: CitaServicio[];
}

// Format time from ISO string
const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

export default function AgendaScreen() {
    const { negocioId, sucursalId, rol, isLoading: appLoading } = useApp();
    const theme = useTheme();
    const palette = useKyrosPalette();

    // Estado local
    const [selectedDate, setSelectedDate] = useState(getLocalToday());
    const [currentMonth, setCurrentMonth] = useState(getLocalToday().substring(0, 7));
    const [monthMarks, setMonthMarks] = useState<{ [key: string]: any }>({});
    const [citas, setCitas] = useState<Cita[]>([]);
    const [loading, setLoading] = useState(false); // Default to false to prevent infinite loop on empty context
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);

    const [sucursalNombre, setSucursalNombre] = useState('Mi Sucursal');

    // Estadísticas Locales & UI State
    const [calendarVisible, setCalendarVisible] = useState(true);
    const [calendarFilter, setCalendarFilter] = useState<'todas' | 'completadas' | 'proximas'>('todas');

    // Filtro de Sucursal (Solo para Dueños/Admin)
    const [selectedSucursal, setSelectedSucursal] = useState<number | 'all'>('all');
    const [sucursalesDisponibles, setSucursalesDisponibles] = useState<{ id: number; nombre: string }[]>([]);

    // Obtener total de precio de servicios
    const getTotalPrecio = (cita: Cita): number => {
        if (!cita.citas_servicios || cita.citas_servicios.length === 0) return 0;
        return cita.citas_servicios.reduce(
            (acc, cs) => acc + (cs.precio_actual || cs.servicios?.[0]?.precio_base || 0),
            0
        );
    };

    const isNetworkError = useCallback((err: unknown) => {
        const message = typeof err === 'string'
            ? err
            : err && typeof err === 'object' && 'message' in err
                ? String((err as { message?: unknown }).message ?? '')
                : '';
        const normalized = message.toLowerCase();
        return (
            normalized.includes('network') ||
            normalized.includes('internet') ||
            normalized.includes('fetch') ||
            normalized.includes('connection') ||
            normalized.includes('offline') ||
            normalized.includes('timeout')
        );
    }, []);

    const hasInternetConnection = useCallback(async () => {
        const networkState = await NetInfo.fetch();
        return !!networkState.isConnected && networkState.isInternetReachable !== false;
    }, []);

    // Calcular Resumen del Día
    const filteredCitas = useMemo(() => {
        if (calendarFilter === 'todas') return citas;
        if (calendarFilter === 'completadas') {
            return citas.filter(c => c.estado === 'completada');
        }
        return citas.filter(c => c.estado !== 'completada' && c.estado !== 'cancelada');
    }, [citas, calendarFilter]);

    const totalCitas = filteredCitas.length;
    const citasPendientes = filteredCitas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada').length;
    const ingresoEstimado = filteredCitas.reduce((acc, c) => acc + (c.monto_total || getTotalPrecio(c)), 0);

    // Inicializar filtro de sucursal según rol
    useEffect(() => {
        if (rol === 'sucursal' && sucursalId) {
            setSelectedSucursal(sucursalId);
            // Fetch branch name
            supabase.from('sucursales').select('nombre').eq('id', sucursalId).single().then(({ data }) => {
                if (data) setSucursalNombre(data.nombre);
            });
        }
    }, [rol, sucursalId]);

    // Cargar opciones de sucursales si es dueño
    useEffect(() => {
        const loadSucursales = async () => {
            if (rol === 'dueño' && negocioId) {
                const { data } = await supabase
                    .from('sucursales')
                    .select('id, nombre')
                    .eq('negocio_id', negocioId)
                    .order('nombre');
                if (data) setSucursalesDisponibles(data);
            }
        };
        loadSucursales();
    }, [rol, negocioId]);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const offline = !state.isConnected || state.isInternetReachable === false;
            setIsOffline(offline);
            if (!offline) {
                setError((prev) => (prev && isNetworkError(prev) ? null : prev));
            }
        });

        return unsubscribe;
    }, [isNetworkError]);

    // Fetch citas del día seleccionado
    const fetchCitas = useCallback(async () => {
        if (!negocioId) {
            console.log('[Agenda] Fetch skipped: No negocioId');
            setLoading(false);
            return;
        }

        if (rol === 'sucursal' && !sucursalId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const hasConnection = await hasInternetConnection();
            if (!hasConnection) {
                setIsOffline(true);
                setLoading(false);
                setRefreshing(false);
                return;
            } else {
                setIsOffline(false);
            }
            const startOfDay = getStartOfDayLocal(selectedDate);
            const endOfDay = getEndOfDayLocal(selectedDate);

            let query = supabase
                .from(TABLES.citas)
                .select(`
                    id,
                    fecha_hora_inicio,
                    fecha_hora_fin,
                    estado,
                    monto_total,
                    nombre_cliente_manual,
                    empleados!empleado_id(nombre),
                    clientes_bot!cliente_id(nombre),
                    citas_servicios(precio_actual, servicios(nombre, precio_base))
                `)
                .eq('negocio_id', negocioId)
                .gte('fecha_hora_inicio', startOfDay)
                .lte('fecha_hora_inicio', endOfDay)
                .neq('estado', 'cancelada')
                .order('fecha_hora_inicio', { ascending: true });

            // Aplicar filtro de sucursal
            if (rol === 'sucursal') {
                query = query.eq('sucursal_id', sucursalId);
            } else if (rol === 'dueño' && selectedSucursal !== 'all') {
                query = query.eq('sucursal_id', selectedSucursal);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;
            setCitas((data as Cita[]) || []);

        } catch (err: any) {
            console.error('Error fetching citas:', err);
            if (isNetworkError(err)) {
                setIsOffline(true);
                setError(null);
            } else {
                setError(err.message || 'Error al cargar las citas');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDate, negocioId, sucursalId, rol, selectedSucursal, hasInternetConnection, isNetworkError]);
    const fetchMonthMarks = useCallback(async (yearMonth: string) => {
        if (!negocioId) return;

        const [year, month] = yearMonth.split('-');
        const startDate = `${yearMonth}-01T00:00:00.000`;
        const nextMonth = parseInt(month, 10) === 12 ? '01' : String(parseInt(month, 10) + 1).padStart(2, '0');
        const nextYear = parseInt(month, 10) === 12 ? String(parseInt(year, 10) + 1) : year;
        const endDate = `${nextYear}-${nextMonth}-01T00:00:00.000`;

        try {
            const hasConnection = await hasInternetConnection();
            if (!hasConnection) {
                setIsOffline(true);
                return;
            }
            setIsOffline(false);

            let query = supabase
                .from(TABLES.citas)
                .select('fecha_hora_inicio, estado')
                .eq('negocio_id', negocioId)
                .gte('fecha_hora_inicio', startDate)
                .lt('fecha_hora_inicio', endDate)
                .neq('estado', 'cancelada');

            if (rol === 'sucursal' && sucursalId) {
                query = query.eq('sucursal_id', sucursalId);
            } else if (rol === 'dueño' && selectedSucursal !== 'all') {
                query = query.eq('sucursal_id', selectedSucursal);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (data) {
                const completedDays = new Set<string>();
                const upcomingDays = new Set<string>();
                data.forEach(cita => {
                    if (cita.fecha_hora_inicio) {
                        const dateObj = new Date(cita.fecha_hora_inicio);
                        const localIso = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString();
                        const dateStr = localIso.split('T')[0];

                        if (cita.estado === 'completada') {
                            completedDays.add(dateStr);
                        } else {
                            upcomingDays.add(dateStr);
                        }
                    }
                });

                const marks: any = {};
                if (calendarFilter === 'todas' || calendarFilter === 'proximas') {
                    upcomingDays.forEach(d => {
                        marks[d] = {
                            customStyles: {
                                container: {},
                                text: { color: palette.infoText, fontWeight: '700' }
                            }
                        };
                    });
                }
                if (calendarFilter === 'todas' || calendarFilter === 'completadas') {
                    completedDays.forEach(d => {
                        if (!marks[d]) {
                            marks[d] = {
                                customStyles: {
                                    container: {},
                                    text: { color: palette.successText, fontWeight: '700' }
                                }
                            };
                        }
                    });
                }
                setMonthMarks(marks);
            }
        } catch (err: any) {
            console.error('[Agenda] Error fetching month marks:', err);
            if (isNetworkError(err)) {
                setIsOffline(true);
                setError(null);
            }
        }
    }, [negocioId, sucursalId, rol, selectedSucursal, calendarFilter, palette.infoText, palette.successText, hasInternetConnection, isNetworkError]);

    // Initial load when current context is established
    useEffect(() => {
        if (!appLoading) {
            if (negocioId) {
                fetchCitas();
                fetchMonthMarks(currentMonth);
            } else {
                // Si terminó de cargar la app y no hay negocioId, detener loading y mostrar error
                console.warn('[Agenda] No negocioId found after app load');
                setLoading(false);
                setError('No se encontró información del negocio asociadas a tu cuenta.');
            }
        }
    }, [appLoading, negocioId, sucursalId, selectedSucursal, fetchCitas, fetchMonthMarks, currentMonth]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchMonthMarks(currentMonth);
        await fetchCitas();
        setRefreshing(false);
    }, [fetchCitas, fetchMonthMarks, currentMonth]);

    // Cargar citas cuando cambia la fecha o el contexto está listo
    useEffect(() => {
        if (!appLoading && negocioId) {
            fetchMonthMarks(currentMonth);
        }
    }, [appLoading, negocioId, currentMonth, calendarFilter, fetchMonthMarks]);

    // Refrescar citas al volver a la pantalla
    useFocusEffect(
        useCallback(() => {
            if (!appLoading && negocioId) {
                fetchCitas();
                fetchMonthMarks(currentMonth);
            }
        }, [appLoading, negocioId, fetchCitas, fetchMonthMarks, currentMonth])
    );

    // Realtime subscription
    useEffect(() => {
        if (!negocioId) return;

        const channel = supabase
            .channel('agenda-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'citas',
                    filter: rol === 'sucursal' && sucursalId
                        ? `sucursal_id=eq.${sucursalId}`
                        : `negocio_id=eq.${negocioId}`,
                },
                () => {
                    fetchCitas();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [negocioId, rol, sucursalId, fetchCitas]);

    // Obtener nombre del cliente (SOLO si existe en BD, retorna null si no hay datos)
    const getClienteNombre = (cita: Cita): string | null => {
        if (cita.clientes_bot) {
            const cliente = Array.isArray(cita.clientes_bot) ? cita.clientes_bot[0] : cita.clientes_bot;
            if (cliente?.nombre) return cliente.nombre;
        }
        if (cita.nombre_cliente_manual) return cita.nombre_cliente_manual;
        return null;
    };

    // Obtener nombre del empleado
    const getEmpleadoNombre = (cita: Cita): string | null => {
        if (cita.empleados) {
            const empleado = Array.isArray(cita.empleados) ? cita.empleados[0] : cita.empleados;
            if (empleado?.nombre) return empleado.nombre;
        }
        return null;
    };

    // Obtener nombres de servicios de la cita (solo si existen)
    const getServiciosNombres = (cita: Cita): string | null => {
        if (!cita.citas_servicios || cita.citas_servicios.length === 0) return null;
        const nombres = cita.citas_servicios
            .map(cs => cs.servicios?.[0]?.nombre)
            .filter(Boolean);
        return nombres.length > 0 ? nombres.join(', ') : null;
    };



    // Obtener colores por estado
    const getStatusColors = (status: string) => {
        const professionalStatusColors: Record<string, { bg: string; text: string; border: string }> = {
            confirmada: { bg: palette.infoBg, text: palette.infoText, border: palette.infoText },
            pendiente: { bg: palette.infoBg, text: palette.infoText, border: palette.infoText },
            en_proceso: { bg: palette.warningBg, text: palette.warningText, border: palette.warningText },
            completada: { bg: palette.successBg, text: palette.successText, border: palette.successText },
            cancelada: { bg: palette.dangerBg, text: palette.dangerText, border: palette.dangerText },
            pendiente_pago: { bg: palette.warningBg, text: palette.warningText, border: palette.warningText },
        };
        return professionalStatusColors[status] || STATUS_COLORS.confirmada;
    };

    const handleStatusChange = async (cita: Cita, newState: string) => {
        try {
            setLoading(true);
            const updateData: any = { estado: newState };
            if (newState === 'completada') {
                updateData.fecha_completado = new Date().toISOString();
                updateData.total_pagado = cita.monto_total || getTotalPrecio(cita) || 0;
            }

            const { error } = await supabase
                .from(TABLES.citas)
                .update(updateData)
                .eq('id', cita.id);

            if (error) throw error;
            fetchCitas();
        } catch (err: any) {
            console.error('Error changing status:', err);
        } finally {
            setLoading(false);
        }
    };

    const getBranchDisplayName = () => {
        if (rol === 'dueño') {
            if (selectedSucursal === 'all') return 'Todas las sucursales';
            return sucursalesDisponibles.find(s => s.id === selectedSucursal)?.nombre || 'Mi Sucursal';
        }
        return sucursalNombre;
    };

    const markedDates = useMemo(() => {
        const today = getLocalToday();
        const selectedMark = {
            customStyles: {
                container: {
                    backgroundColor: theme.colors.primary,
                    borderRadius: 18,
                    width: 40,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'center',
                },
                text: {
                    color: '#ffffff',
                    fontWeight: '800',
                    textAlign: 'center',
                    lineHeight: 20,
                    includeFontPadding: false,
                }
            }
        };

        const todayMark = {
            customStyles: {
                container: {
                    borderWidth: 1,
                    borderColor: theme.colors.primary,
                    borderRadius: 18,
                    backgroundColor: palette.selectedBg,
                    width: 40,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'center',
                },
                text: {
                    color: palette.text,
                    fontWeight: '700',
                    textAlign: 'center',
                    lineHeight: 20,
                    includeFontPadding: false,
                }
            }
        };

        return {
            ...monthMarks,
            ...(today !== selectedDate ? { [today]: todayMark } : {}),
            [selectedDate]: selectedMark,
        };
    }, [monthMarks, selectedDate, theme.colors.primary, palette.selectedBg, palette.text]);

    const renderCalendarDay = useCallback(({ date, state, marking }: any) => {
        const containerStyle = marking?.customStyles?.container || {};
        const textStyle = marking?.customStyles?.text || {};
        const baseTextColor = state === 'disabled'
            ? palette.disabled
            : palette.isDark
                ? palette.textMuted
                : palette.textStrong;

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => date?.dateString && setSelectedDate(date.dateString)}
                style={[
                    {
                        width: 40,
                        height: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                        alignSelf: 'center',
                    },
                    containerStyle,
                ]}
            >
                <Text
                    style={[
                        {
                            color: baseTextColor,
                            fontSize: 15,
                            fontWeight: '600',
                            textAlign: 'center',
                            lineHeight: 20,
                            includeFontPadding: false,
                        },
                        textStyle,
                    ]}
                >
                    {date?.day}
                </Text>
            </TouchableOpacity>
        );
    }, [palette.disabled, palette.isDark, palette.textMuted, palette.textStrong]);

    return (
        <KyrosScreen title="Panel de Control">

            <ScrollView
                style={[styles.scrollContainer, { backgroundColor: palette.background }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.mainLayout}>

                    {/* Encabezado y Filtros Movidos dentro del Scroll para maximizar espacio */}
                    <View style={{ gap: 12, marginBottom: 8 }}>
                        <View style={[styles.headerContainer, { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: 16 }]}>
                            <Text variant="headlineSmall" style={[styles.headerTitle, { color: palette.textStrong }]} numberOfLines={1}>
                                Agenda {formatDateTitle(selectedDate)}
                            </Text>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                    <TouchableOpacity onPress={() => setCalendarVisible(!calendarVisible)} style={[styles.calendarToggleBtn, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                                        <MaterialIcons name={calendarVisible ? "event-busy" : "event"} size={22} color={theme.colors.primary} />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => router.push(`/citas/nueva?fecha=${selectedDate}`)}
                                        style={{
                                            backgroundColor: theme.colors.primary,
                                            paddingHorizontal: 16,
                                            paddingVertical: 10,
                                            borderRadius: 24,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <MaterialIcons name="add" size={18} color="#ffffff" />
                                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Nueva</Text>
                                    </TouchableOpacity>
                                </View>
                        </View>

                        {/* Filtro de Sucursal (Visible solo para Dueño) */}
                        {rol === 'dueño' && (
                            <View style={{ marginBottom: 4 }}>
                                <KyrosSelector
                                    options={[
                                        { label: 'Todas las sucursales', value: 'all' },
                                        ...sucursalesDisponibles.map(s => ({ label: s.nombre, value: s.id }))
                                    ]}
                                    selectedValue={selectedSucursal}
                                    onValueChange={(val) => setSelectedSucursal(val)}
                                    icon="store"
                                    style={{ backgroundColor: palette.surface, borderWidth: 0 }}
                                />
                            </View>
                        )}
                    </View>

                    {/* Dashboard Stats Panel */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                            <Text variant="labelMedium" style={{ color: palette.textMuted }}>Citas</Text>
                            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#1E66FF' }}>{totalCitas}</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                            <Text variant="labelMedium" style={{ color: palette.textMuted }}>Por Atender</Text>
                            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#f57c00' }}>{citasPendientes}</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                            <Text variant="labelMedium" style={{ color: palette.textMuted }}>Estimado</Text>
                            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#10b981' }}>${ingresoEstimado}</Text>
                        </View>
                    </View>

                    {/* Calendar Card (Collapsible) */}
                    {calendarVisible && (
                        <View style={[styles.calendarWrapper, { backgroundColor: palette.surface, borderColor: palette.borderStrong }]}>
                            <Text style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 12, color: palette.text }}>
                                {getBranchDisplayName()}
                            </Text>
                            <Calendar
                                markingType={'custom'}
                                onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
                                onMonthChange={(month: { year: number, month: number }) => {
                                    setCurrentMonth(`${month.year}-${String(month.month).padStart(2, '0')}`);
                                }}
                                markedDates={markedDates}
                                dayComponent={renderCalendarDay}
                                enableSwipeMonths
                                theme={{
                                    calendarBackground: 'transparent',
                                    backgroundColor: 'transparent',
                                    selectedDayBackgroundColor: theme.colors.primary,
                                    selectedDayTextColor: '#ffffff',
                                    todayTextColor: theme.colors.primary,
                                    dayTextColor: palette.text,
                                    textSectionTitleColor: palette.textMuted,
                                    textDisabledColor: palette.disabled,
                                    dotColor: palette.successText,
                                    selectedDotColor: '#ffffff',
                                    arrowColor: palette.icon,
                                    monthTextColor: palette.text,
                                    indicatorColor: theme.colors.primary,
                                    textDayFontFamily: 'System',
                                    textMonthFontFamily: 'System',
                                    textDayHeaderFontFamily: 'System',
                                    textDayFontWeight: '500',
                                    textMonthFontWeight: 'bold',
                                    textDayHeaderFontWeight: '600',
                                    textDayFontSize: 15,
                                    textMonthFontSize: 16,
                                    textDayHeaderFontSize: 13,
                                    'stylesheet.calendar.header': {
                                        monthText: {
                                            color: palette.textStrong,
                                            fontSize: 16,
                                            fontWeight: '800',
                                        },
                                        dayHeader: {
                                            color: palette.textMuted,
                                            fontSize: 13,
                                            fontWeight: '600',
                                        },
                                    },
                                    'stylesheet.day.basic': {
                                        base: {
                                            width: 40,
                                            height: 40,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            alignSelf: 'center',
                                        },
                                        text: {
                                            color: palette.text,
                                            fontSize: 15,
                                            fontWeight: '500',
                                            textAlign: 'center',
                                            lineHeight: 20,
                                            includeFontPadding: false,
                                        },
                                        today: {
                                            color: theme.colors.primary,
                                        },
                                    }
                                }}
                            />

                            {/* Filter Toggle */}
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                {(['todas', 'proximas', 'completadas'] as const).map(f => (
                                    <TouchableOpacity
                                        key={f}
                                        onPress={() => setCalendarFilter(f)}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 8,
                                            borderRadius: 10,
                                            backgroundColor: calendarFilter === f ? palette.selectedBgStrong : palette.surfaceAlt,
                                            borderWidth: 1,
                                            borderColor: calendarFilter === f ? theme.colors.primary : palette.border,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{
                                            color: calendarFilter === f ? theme.colors.primary : palette.textMuted,
                                            fontSize: 12,
                                            fontWeight: calendarFilter === f ? '700' : '500',
                                        }}>
                                            {f === 'todas' ? 'Todas' : f === 'proximas' ? 'Próximas' : 'Completadas'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}


                    {/* Content Area */}
                    <View style={styles.listContainer}>
                        {/* Loading State */}
                        {loading && (
                            <View style={styles.centerState}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                                <Text variant="bodyLarge" style={styles.stateText}>
                                    Cargando citas...
                                </Text>
                            </View>
                        )}

                        {/* Error State */}
                        {!loading && isOffline ? (
                            <View style={styles.centerState}>
                                <MaterialIcons name="wifi-off" size={64} color="#888" />
                                <Text variant="bodyLarge" style={[styles.stateText, { color: palette.textSoft, paddingHorizontal: 20 }]}>
                                    Sin conexión a Internet
                                </Text>
                                <Text style={[styles.stateText, { marginTop: 0, paddingHorizontal: 20, fontSize: 13 }]}>
                                    Verifica tu conexión y vuelve a intentarlo.
                                </Text>
                                <KyrosButton onPress={onRefresh} style={{ marginTop: 16 }}>
                                    Reintentar
                                </KyrosButton>
                            </View>
                        ) : !loading && error && error.toLowerCase().includes('negocio') ? (
                            <View style={styles.centerState}>
                                <MaterialIcons name="storefront" size={64} color="#888" />
                                <Text style={[styles.stateText, { color: palette.textSoft, fontSize: 16, marginBottom: 8 }]}>
                                    Aún no tienes sucursales creadas
                                </Text>
                                <Text style={[styles.stateText, { marginTop: 0, paddingHorizontal: 20 }]}>
                                    Agrega una sucursal en el panel de Sucursales para comenzar a agendar citas.
                                </Text>
                            </View>
                        ) : !loading && error && !isOffline ? (
                            <View style={styles.centerState}>
                                <MaterialIcons name="error-outline" size={64} color="#d32f2f" />
                                <Text variant="bodyLarge" style={[styles.stateText, { color: '#d32f2f', paddingHorizontal: 20 }]}>
                                    {error}
                                </Text>
                                <KyrosButton onPress={fetchCitas} style={{ marginTop: 16 }}>
                                    Reintentar
                                </KyrosButton>
                            </View>
                        ) : null}

                        {/* Empty State */}
                        {!loading && !error && !isOffline && filteredCitas.length === 0 && (
                            <View style={styles.emptyState}>
                                <MaterialIcons name="event-busy" size={64} color={palette.textSoft} />
                                <Text variant="bodyLarge" style={[styles.emptyText, { color: palette.textStrong }]}>
                                    {calendarFilter === 'todas'
                                        ? 'No hay citas programadas para este día.'
                                        : calendarFilter === 'completadas'
                                            ? 'No hay citas completadas para este día.'
                                            : 'No hay citas próximas para este día.'}
                                </Text>
                            </View>
                        )}

                        {/* Appointments List */}
                        {!loading && !error && !isOffline && filteredCitas.map((cita) => {
                            const statusColors = getStatusColors(cita.estado);
                            return (
                                <TouchableOpacity
                                    key={cita.id}
                                    activeOpacity={0.92}
                                    onPress={() => router.push(`/citas/${cita.id}`)}
                                    style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
                                >
                                    {/* Status accent bar */}
                                    <View style={[styles.cardAccent, { backgroundColor: statusColors.border }]} />

                                    <View style={styles.cardBody}>
                                        {/* Top row: Time + Client + Status */}
                                        <View style={styles.cardTopRow}>
                                                <View style={styles.timeChip}>
                                                <MaterialIcons name="schedule" size={14} color={palette.infoText} />
                                                <Text style={[styles.timeChipText, { color: palette.infoText }]}>
                                                    {formatTime(cita.fecha_hora_inicio)} — {formatTime(cita.fecha_hora_fin)}
                                                </Text>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                                                <Text style={[styles.statusText, { color: statusColors.text }]}>
                                                    {cita.estado.toUpperCase().replace('_', ' ')}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Client name */}
                                        <Text style={[styles.clientName, { color: palette.textStrong }]}>
                                            {getClienteNombre(cita) || '(Sin cliente registrado)'}
                                        </Text>

                                        {/* Services */}
                                        {getServiciosNombres(cita) ? (
                                            <Text style={[styles.serviceText, { color: palette.textSoft }]}>{getServiciosNombres(cita)}</Text>
                                        ) : null}

                                        {/* Bottom row: Employee + Price + Actions */}
                                        <View style={styles.cardBottomRow}>
                                            <View style={styles.cardMeta}>
                                                {getEmpleadoNombre(cita) && (
                                                        <View style={styles.metaItem}>
                                                        <MaterialIcons name="person" size={15} color={palette.textSoft} />
                                                        <Text style={[styles.metaText, { color: palette.textMuted }]}>{getEmpleadoNombre(cita)}</Text>
                                                    </View>
                                                )}
                                                {(() => {
                                                    const total = cita.monto_total || getTotalPrecio(cita);
                                                    return total > 0 ? (
                                                        <View style={styles.metaItem}>
                                                            <MaterialIcons name="attach-money" size={15} color="#22c55e" />
                                                            <Text style={[styles.metaText, { color: '#22c55e', fontWeight: '700' }]}>${total}</Text>
                                                        </View>
                                                    ) : null;
                                                })()}
                                            </View>

                                            {/* Actions */}
                                            <View style={styles.cardActions}>
                                                <TouchableOpacity onPress={() => router.push(`/citas/${cita.id}`)} style={[styles.actionBtn, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
                                                    <MaterialIcons name="visibility" size={18} color={palette.infoText} />
                                                </TouchableOpacity>

                                                {cita.estado !== 'completada' && cita.estado !== 'cancelada' && (
                                                    <TouchableOpacity onPress={() => router.push(`/citas/${cita.id}`)} style={[styles.actionBtn, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
                                                        <MaterialIcons name="edit" size={18} color={palette.infoText} />
                                                    </TouchableOpacity>
                                                )}

                                                {cita.estado === 'pendiente_pago' && (
                                                    <TouchableOpacity onPress={() => handleStatusChange(cita, 'completada')} style={[styles.actionBtn, styles.actionPay, { backgroundColor: palette.successBg, borderColor: palette.successText }]}>
                                                        <MaterialIcons name="payments" size={18} color={palette.successText} />
                                                    </TouchableOpacity>
                                                )}

                                                {cita.estado !== 'completada' && cita.estado !== 'pendiente_pago' && cita.estado !== 'cancelada' && (
                                                    <TouchableOpacity onPress={() => handleStatusChange(cita, 'completada')} style={[styles.actionBtn, styles.actionComplete, { backgroundColor: palette.infoBg, borderColor: palette.infoText }]}>
                                                        <MaterialIcons name="check" size={18} color={palette.infoText} />
                                                    </TouchableOpacity>
                                                )}

                                                {cita.estado !== 'cancelada' && cita.estado !== 'completada' && (
                                                    <TouchableOpacity onPress={() => handleStatusChange(cita, 'cancelada')} style={[styles.actionBtn, styles.actionCancel, { backgroundColor: palette.dangerBg, borderColor: palette.dangerText }]}>
                                                        <MaterialIcons name="close" size={18} color={palette.dangerText} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        <View style={{ height: 80 }} />
                    </View>
                </View>
            </ScrollView>
        </KyrosScreen >
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#0a0f1e',
        borderBottomWidth: 2,
        borderBottomColor: '#475569'
    },
    headerTitle: {
        fontWeight: 'bold',
        fontSize: 18,
        color: '#f8fafc',
        flex: 1,
        marginRight: 8
    },
    calendarToggleBtn: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: '#111827',
        borderWidth: 1,
        borderColor: '#475569'
    },
    newButton: {
        borderRadius: 20,
        height: 36,
    },
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#0a0f1e',
        borderBottomWidth: 2,
        borderBottomColor: '#475569'
    },
    pickerWrapper: {
        flex: 1,
        backgroundColor: '#111827',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#475569',
        height: 40,
        justifyContent: 'center',
        overflow: 'hidden'
    },
    picker: {
        color: '#f8fafc',
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: '#0a0f1e'
    },
    mainLayout: {
        padding: 16,
        gap: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111827',
        borderWidth: 2,
        borderColor: '#475569'
    },
    calendarWrapper: {
        backgroundColor: '#111827',
        borderRadius: 24,
        padding: 16,
        marginHorizontal: 4,
        borderWidth: 2,
        borderColor: '#475569'
    },
    listContainer: {
        gap: 12,
        marginTop: 8
    },
    card: {
        borderRadius: 16,
        marginBottom: 10,
        overflow: 'hidden',
        backgroundColor: '#111827',
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    cardAccent: {
        height: 4,
        width: '100%',
    },
    cardBody: {
        padding: 16,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    timeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
    },
    timeChipText: {
        color: '#38bdf8',
        fontSize: 13,
        fontWeight: '600',
    },
    clientName: {
        color: '#f1f5f9',
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 4,
    },
    serviceText: {
        color: '#64748b',
        fontSize: 13,
        marginBottom: 8,
    },
    cardBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        color: '#94a3b8',
        fontSize: 13,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionBtn: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
    },
    actionPay: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: '#22c55e',
    },
    actionComplete: {
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderColor: '#38bdf8',
    },
    actionCancel: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: '#ef4444',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    // Center States (Loading, Error)
    centerState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    stateText: {
        marginTop: 16,
        color: '#94a3b8',
        textAlign: 'center',
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        marginTop: 16,
        color: '#64748b',
        textAlign: 'center',
        fontStyle: 'italic',
    }
});
