import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import KyrosButton from '../../components/KyrosButton';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import { getLocalToday, formatDateTitle, getStartOfDayLocal, getEndOfDayLocal } from '../../lib/date';
import CitaActionsModal from '../../components/CitaActionsModal';

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

    // Estado local
    const [selectedDate, setSelectedDate] = useState(getLocalToday());
    const [citas, setCitas] = useState<Cita[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal Acciones
    const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
    const [accionesVisible, setAccionesVisible] = useState(false);

    // Estadísticas Locales & UI State
    const [calendarVisible, setCalendarVisible] = useState(true);

    // Filtro de Sucursal (Solo para Dueños/Admin)
    const [selectedSucursal, setSelectedSucursal] = useState<number | 'all'>('all');
    const [sucursalesDisponibles, setSucursalesDisponibles] = useState<{ id: number; nombre: string }[]>([]);

    // Calcular Resumen del Día
    const totalCitas = citas.length;
    const citasPendientes = citas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada').length;
    const ingresoEstimado = citas.reduce((acc, c) => acc + (c.monto_total || getTotalPrecio(c)), 0);

    // Inicializar filtro de sucursal según rol
    useEffect(() => {
        if (rol === 'sucursal' && sucursalId) {
            setSelectedSucursal(sucursalId);
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

    // Fetch citas del día seleccionado
    const fetchCitas = useCallback(async () => {
        if (!negocioId) {
            console.log('[Agenda] Fetch skipped: No negocioId');
            return;
        }

        // Si el rol es sucursal y aún no tenemos ID, esperar
        if (rol === 'sucursal' && !sucursalId) return;

        setLoading(true);
        setError(null);

        try {
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
            setError(err.message || 'Error al cargar las citas');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDate, negocioId, sucursalId, rol, selectedSucursal]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCitas();
    }, [fetchCitas]);

    // Cargar citas cuando cambia la fecha o el contexto está listo
    useEffect(() => {
        if (!appLoading) {
            if (negocioId) {
                fetchCitas();
            } else {
                // Si terminó de cargar la app y no hay negocioId, detener loading y mostrar error
                console.warn('[Agenda] No negocioId found after app load');
                setLoading(false);
                setError('No se encontró información del negocio asociadas a tu cuenta.');
            }
        }
    }, [appLoading, negocioId, selectedDate, fetchCitas]);

    // Refrescar citas al volver a la pantalla
    useFocusEffect(
        useCallback(() => {
            if (!appLoading && negocioId) {
                fetchCitas();
            }
        }, [appLoading, negocioId, fetchCitas])
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
    }, [negocioId, fetchCitas]);

    // Obtener nombre del cliente (SOLO si existe en BD, retorna null si no hay datos)
    const getClienteNombre = (cita: Cita): string | null => {
        if (cita.clientes_bot && cita.clientes_bot[0]?.nombre) return cita.clientes_bot[0].nombre;
        if (cita.nombre_cliente_manual) return cita.nombre_cliente_manual;
        return null;
    };

    // Obtener nombre del empleado (es array)
    const getEmpleadoNombre = (cita: Cita): string | null => {
        if (cita.empleados && cita.empleados[0]?.nombre) return cita.empleados[0].nombre;
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

    // Obtener total de precio de servicios
    const getTotalPrecio = (cita: Cita): number => {
        if (!cita.citas_servicios || cita.citas_servicios.length === 0) return 0;
        return cita.citas_servicios.reduce(
            (acc, cs) => acc + (cs.precio_actual || cs.servicios?.[0]?.precio_base || 0),
            0
        );
    };

    // Obtener colores por estado
    const getStatusColors = (status: string) => {
        return STATUS_COLORS[status] || STATUS_COLORS.confirmada;
    };

    return (
        <KyrosScreen title="Panel de Control">
            <View style={styles.headerContainer}>
                <Text variant="headlineSmall" style={styles.headerTitle}>
                    Agenda {formatDateTitle(selectedDate)}
                </Text>

                <TouchableOpacity onPress={() => setCalendarVisible(!calendarVisible)} style={styles.calendarToggleBtn}>
                    <MaterialIcons name={calendarVisible ? "event-busy" : "event"} size={26} color={theme.colors.primary} />
                </TouchableOpacity>

                <KyrosButton
                    onPress={() => router.push(`/citas/nueva?fecha=${selectedDate}`)}
                    style={styles.newButton}
                    icon="plus"
                    mode="contained"
                    compact
                >
                    Nueva
                </KyrosButton>
            </View>

            {/* Filtro de Sucursal (Visible solo para Dueño) */}
            {rol === 'dueño' && (
                <View style={styles.filterContainer}>
                    <MaterialIcons name="store" size={20} color="#555" style={{ marginRight: 8 }} />
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={selectedSucursal}
                            onValueChange={(itemValue) => setSelectedSucursal(itemValue)}
                            style={styles.picker}
                        >
                            <Picker.Item label="Todas las sucursales" value="all" />
                            {sucursalesDisponibles.map(s => (
                                <Picker.Item key={s.id} label={s.nombre} value={s.id} />
                            ))}
                        </Picker>
                    </View>
                </View>
            )}

            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.mainLayout}>

                    {/* Dashboard Stats Panel */}
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text variant="labelMedium" style={{ color: '#666' }}>Citas</Text>
                            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>{totalCitas}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text variant="labelMedium" style={{ color: '#666' }}>Por Atender</Text>
                            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#f57c00' }}>{citasPendientes}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text variant="labelMedium" style={{ color: '#666' }}>Estimado</Text>
                            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#388e3c' }}>${ingresoEstimado}</Text>
                        </View>
                    </View>

                    {/* Calendar Card (Collapsible) */}
                    {calendarVisible && (
                        <View style={styles.calendarCard}>
                            <Calendar
                                onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
                                markedDates={{
                                    [selectedDate]: { selected: true, disableTouchEvent: true }
                                }}
                                theme={{
                                    selectedDayBackgroundColor: theme.colors.primary,
                                    todayTextColor: theme.colors.primary,
                                    arrowColor: theme.colors.primary,
                                    textMonthFontWeight: 'bold',
                                    textDayHeaderFontWeight: 'bold',
                                }}
                            />
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
                        {!loading && error && error.toLowerCase().includes('negocio') ? (
                            <View style={styles.centerState}>
                                <MaterialIcons name="storefront" size={64} color="#888" />
                                <Text style={[styles.stateText, { color: '#555', fontSize: 16, marginBottom: 8 }]}>
                                    Aún no tienes sucursales creadas
                                </Text>
                                <Text style={[styles.stateText, { marginTop: 0, paddingHorizontal: 20 }]}>
                                    Agrega una sucursal en el panel de Sucursales para comenzar a agendar citas.
                                </Text>
                            </View>
                        ) : !loading && error && (
                            <View style={styles.centerState}>
                                <MaterialIcons name="error-outline" size={64} color="#d32f2f" />
                                <Text variant="bodyLarge" style={[styles.stateText, { color: '#d32f2f', paddingHorizontal: 20 }]}>
                                    {error}
                                </Text>
                                <KyrosButton onPress={fetchCitas} style={{ marginTop: 16 }}>
                                    Reintentar
                                </KyrosButton>
                            </View>
                        )}

                        {/* Empty State */}
                        {!loading && !error && citas.length === 0 && (
                            <View style={styles.emptyState}>
                                <MaterialIcons name="event-busy" size={64} color="#ccc" />
                                <Text variant="bodyLarge" style={styles.emptyText}>
                                    No hay citas programadas para este día.
                                </Text>
                            </View>
                        )}

                        {/* Appointments List (SOLO LECTURA) */}
                        {!loading && !error && citas.map((cita) => {
                            const statusColors = getStatusColors(cita.estado);
                            return (
                                <KyrosCard
                                    key={cita.id}
                                    style={{
                                        ...styles.card,
                                        borderLeftWidth: 5,
                                        borderLeftColor: statusColors.border
                                    }}
                                    onPress={() => {
                                        setSelectedCita(cita);
                                        setAccionesVisible(true);
                                    }}
                                >
                                    <View style={styles.cardContent}>
                                        {/* Time Column */}
                                        <View style={styles.timeColumn}>
                                            <Text variant="bodyMedium" style={styles.startTime}>
                                                {formatTime(cita.fecha_hora_inicio)}
                                            </Text>
                                            <Text variant="bodySmall" style={styles.endTime}>
                                                {formatTime(cita.fecha_hora_fin)}
                                            </Text>
                                        </View>

                                        {/* Info Column */}
                                        <View style={styles.infoColumn}>
                                            {/* Cliente - solo si existe */}
                                            {getClienteNombre(cita) ? (
                                                <Text variant="titleMedium" style={styles.clientName}>
                                                    {getClienteNombre(cita)}
                                                </Text>
                                            ) : (
                                                <Text variant="titleMedium" style={[styles.clientName, { color: '#999', fontStyle: 'italic' }]}>
                                                    (Sin cliente registrado)
                                                </Text>
                                            )}

                                            {/* Servicios - solo si existen */}
                                            {getServiciosNombres(cita) ? (
                                                <Text variant="bodyMedium" style={styles.serviceText}>
                                                    {getServiciosNombres(cita)}
                                                </Text>
                                            ) : null}

                                            {/* Precio total */}
                                            {(() => {
                                                const total = cita.monto_total || getTotalPrecio(cita);
                                                return total > 0 ? (
                                                    <Text variant="bodyMedium" style={[styles.priceText, { color: theme.colors.primary }]}>
                                                        Total: ${total}
                                                    </Text>
                                                ) : null;
                                            })()}

                                            {/* Empleado - solo si existe */}
                                            {getEmpleadoNombre(cita) && (
                                                <View style={styles.employeeContainer}>
                                                    <MaterialIcons name="person" size={16} color="#888" />
                                                    <Text variant="bodySmall" style={styles.employeeText}>
                                                        {getEmpleadoNombre(cita)}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Status Column */}
                                        <View style={styles.statusColumn}>
                                            {/* Status Badge */}
                                            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                                                <Text style={[styles.statusText, { color: statusColors.text }]}>
                                                    {cita.estado.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </KyrosCard>
                            );
                        })}
                        <View style={{ height: 80 }} />
                    </View>
                </View>
            </ScrollView>

            <CitaActionsModal
                visible={accionesVisible}
                cita={selectedCita}
                negocioId={negocioId}
                onDismiss={() => {
                    setAccionesVisible(false);
                    setSelectedCita(null);
                }}
                onCitaUpdated={() => {
                    fetchCitas(); // Refetch al actualizar
                }}
            />
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontWeight: 'bold',
        textTransform: 'capitalize',
        flex: 1,
        marginRight: 8,
    },
    calendarToggleBtn: {
        padding: 8,
        marginRight: 8,
    },
    newButton: {
        borderRadius: 20,
    },
    // Stats Panel
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 8,
        // fallback for gap if needed in older RN:
        // justifyContent: 'space-between', 
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
        elevation: 2,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    calendarCard: {
        margin: 16,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: 'white',
        elevation: 2,
    },
    mainLayout: {
        flex: 1,
    },
    // Filters
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 8,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    pickerWrapper: {
        flex: 1,
    },
    picker: {
        height: 50,
        width: '100%',
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 16,
        marginTop: 10,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        marginTop: 16,
        color: '#999',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    // Center States (Loading, Error)
    centerState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    stateText: {
        marginTop: 16,
        color: '#888',
        textAlign: 'center',
    },
    // Card Styles
    card: {
        marginBottom: 10,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    // Time Column
    timeColumn: {
        width: 70,
        marginRight: 12,
        paddingRight: 12,
        borderRightWidth: 1,
        borderRightColor: '#eee',
        justifyContent: 'center',
        minHeight: 50,
    },
    startTime: {
        fontWeight: 'bold',
        color: '#555',
    },
    endTime: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    // Info Column
    infoColumn: {
        flex: 1,
    },
    clientName: {
        fontWeight: 'bold',
        marginBottom: 2,
    },
    serviceText: {
        color: '#666',
        marginBottom: 4,
    },
    priceText: {
        fontWeight: 'bold',
    },
    employeeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    employeeText: {
        marginLeft: 4,
        color: '#888',
    },
    // Status Column
    statusColumn: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginLeft: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
});
