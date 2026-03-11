import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal as RNModal } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { G, Path, Circle } from 'react-native-svg';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import { useApp } from '../../lib/AppContext';
import { supabase } from '../../lib/supabaseClient';

const DonutChart = ({ data, size = 150 }: { data: { name: string, count: number, color: string }[], size?: number }) => {
    const strokeWidth = size > 200 ? 36 : 24;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;

    const total = data.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: '#334155' }} />;

    let currentAngle = 0;

    return (
        <Svg width={size} height={size}>
            <G rotation="-90" origin={`${center}, ${center}`}>
                {data.map((item, index) => {
                    const sliceAngle = (item.count / total) * 360;
                    if (sliceAngle === 360) {
                        return <Circle key={index} cx={center} cy={center} r={radius} stroke={item.color} strokeWidth={strokeWidth} fill="transparent" />;
                    }

                    const startAngle = currentAngle;
                    const endAngle = currentAngle + sliceAngle;
                    currentAngle += sliceAngle;

                    const startX = center + radius * Math.cos((Math.PI * startAngle) / 180);
                    const startY = center + radius * Math.sin((Math.PI * startAngle) / 180);
                    const endX = center + radius * Math.cos((Math.PI * endAngle) / 180);
                    const endY = center + radius * Math.sin((Math.PI * endAngle) / 180);

                    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

                    const pathData = [
                        `M ${startX} ${startY}`,
                        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
                    ].join(' ');

                    return <Path key={index} d={pathData} stroke={item.color} strokeWidth={strokeWidth} fill="transparent" />;
                })}
            </G>
        </Svg>
    );
};

export default function EstadisticasScreen() {
    const theme = useTheme();
    const { rol, sucursalId } = useApp();
    const screenWidth = Dimensions.get('window').width;

    const [loading, setLoading] = useState(true);
    const [servicesLoading, setServicesLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [revenueData, setRevenueData] = useState<{ name: string, value: number }[]>([]);
    const [servicesData, setServicesData] = useState<{ name: string, count: number, color: string }[]>([]);
    const [revenueTotal, setRevenueTotal] = useState(0);

    const [donutModalVisible, setDonutModalVisible] = useState(false);
    const [revenueModalVisible, setRevenueModalVisible] = useState(false);

    // ──────────────────────────────────────────────
    // Load revenue data (filtered by date/period)
    // ──────────────────────────────────────────────
    const loadRevenueData = useCallback(async () => {
        if (rol !== 'sucursal' || !sucursalId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange(currentDate, viewMode);

            const { data, error } = await supabase
                .from('citas')
                .select('id, total_pagado, fecha_completado')
                .eq('sucursal_id', sucursalId)
                .eq('estado', 'completada')
                .gte('fecha_completado', startDate)
                .lte('fecha_completado', endDate);

            if (error) throw error;

            let groupedData: { name: string, value: number }[] = [];

            if (viewMode === 'day') groupedData = groupByHour(data || []);
            else if (viewMode === 'week') groupedData = groupByDayOfWeek(data || []);
            else groupedData = groupByDayOfMonth(data || [], endDate);

            setRevenueData(groupedData);
            setRevenueTotal((data || []).reduce((sum, cita) => sum + (cita.total_pagado || 0), 0));
        } catch (error) {
            console.error('Error loading revenue data:', error);
        } finally {
            setLoading(false);
        }
    }, [sucursalId, rol, currentDate, viewMode]);

    // ──────────────────────────────────────────────
    // Load services data ALL-TIME for the branch (NOT filtered by date)
    // ──────────────────────────────────────────────
    const loadServicesData = useCallback(async () => {
        if (rol !== 'sucursal' || !sucursalId) {
            setServicesLoading(false);
            return;
        }

        setServicesLoading(true);
        try {
            // Get ALL completed citas for this branch
            const { data: allCitas, error: citasError } = await supabase
                .from('citas')
                .select('id')
                .eq('sucursal_id', sucursalId)
                .eq('estado', 'completada');

            if (citasError) throw citasError;

            if (allCitas && allCitas.length > 0) {
                const citaIds = allCitas.map((c: any) => c.id);
                const { data: csData } = await supabase
                    .from('citas_servicios')
                    .select('servicio_id, servicios(nombre)')
                    .in('cita_id', citaIds);

                if (csData) {
                    const counts: Record<string, number> = {};
                    csData.forEach((row: any) => {
                        const name = row.servicios?.nombre || 'Desconocido';
                        counts[name] = (counts[name] || 0) + 1;
                    });

                    const colors = ['#3E82F7', '#04B76B', '#FF8F28', '#FF4E8B', '#8E5FF5', '#00CFE8'];
                    const servicesPie = Object.entries(counts)
                        .map(([name, count], index) => ({
                            name,
                            count,
                            color: colors[index % colors.length]
                        }))
                        .sort((a, b) => b.count - a.count);

                    setServicesData(servicesPie);
                } else {
                    setServicesData([]);
                }
            } else {
                setServicesData([]);
            }
        } catch (error) {
            console.error('Error loading services data:', error);
        } finally {
            setServicesLoading(false);
        }
    }, [sucursalId, rol]);

    useEffect(() => {
        loadRevenueData();
    }, [loadRevenueData]);

    // Services load once on mount (all-time)
    useEffect(() => {
        loadServicesData();
    }, [loadServicesData]);

    const getDateRange = (date: Date, mode: string) => {
        const d = new Date(date);
        if (mode === 'day') {
            d.setHours(0, 0, 0, 0);
            const start = d.toISOString();
            d.setHours(23, 59, 59, 999);
            return { startDate: start, endDate: d.toISOString() };
        } else if (mode === 'week') {
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            d.setDate(diff);
            d.setHours(0, 0, 0, 0);
            const start = d.toISOString();
            d.setDate(d.getDate() + 6);
            d.setHours(23, 59, 59, 999);
            return { startDate: start, endDate: d.toISOString() };
        } else {
            d.setDate(1);
            d.setHours(0, 0, 0, 0);
            const start = d.toISOString();
            d.setMonth(d.getMonth() + 1);
            d.setDate(0);
            d.setHours(23, 59, 59, 999);
            return { startDate: start, endDate: d.toISOString() };
        }
    };

    const groupByHour = (citas: any[]) => {
        const hours: { [key: string]: number } = {};
        for (let i = 8; i <= 20; i++) hours[`${i}:00`] = 0;
        citas.forEach(cita => {
            if (cita.fecha_completado) {
                const hour = new Date(cita.fecha_completado).getHours();
                const key = `${hour}:00`;
                if (hours[key] !== undefined) hours[key] += cita.total_pagado || 0;
            }
        });
        return Object.entries(hours).map(([name, value]) => ({ name, value }));
    };

    const groupByDayOfWeek = (citas: any[]) => {
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const dayData: { [key: string]: number } = {};
        days.forEach(d => dayData[d] = 0);
        citas.forEach(cita => {
            if (cita.fecha_completado) {
                const dayIndex = (new Date(cita.fecha_completado).getDay() + 6) % 7;
                dayData[days[dayIndex]] += cita.total_pagado || 0;
            }
        });
        return days.map(name => ({ name, value: dayData[name] }));
    };

    const groupByDayOfMonth = (citas: any[], endDateISO: string) => {
        const daysInMonth = new Date(endDateISO).getDate();
        const dayData: { [key: string]: number } = {};
        for (let i = 1; i <= daysInMonth; i++) dayData[i.toString()] = 0;
        citas.forEach(cita => {
            if (cita.fecha_completado) {
                const day = new Date(cita.fecha_completado).getDate().toString();
                if (dayData[day] !== undefined) dayData[day] += cita.total_pagado || 0;
            }
        });
        return Object.entries(dayData).map(([name, value]) => ({ name, value }));
    };

    const navigatePeriod = (direction: 'prev' | 'next') => {
        const date = new Date(currentDate);
        if (viewMode === 'day') date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
        else if (viewMode === 'week') date.setDate(date.getDate() + (direction === 'next' ? 7 : -7));
        else date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
        setCurrentDate(date);
    };

    const formatPeriodLabel = () => {
        if (viewMode === 'day') return currentDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (viewMode === 'week') {
            const { startDate, endDate } = getDateRange(currentDate, 'week');
            return `${new Date(startDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${new Date(endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }
        return currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    };

    const maxValue = Math.max(...revenueData.map(d => d.value), 100);
    const totalServices = servicesData.reduce((sum, s) => sum + s.count, 0);

    if (rol !== 'sucursal') {
        return (
            <KyrosScreen title="Estadísticas">
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialIcons name="lock-clock" size={64} color={theme.colors.primary} />
                    <Text variant="titleMedium" style={{ marginTop: 16 }}>Solo visible para Sucursales (MVP)</Text>
                </View>
            </KyrosScreen>
        );
    }

    // ──────────────────────────────────────────────
    // Compact Revenue Chart (for inline card)
    // ──────────────────────────────────────────────
    const renderRevenueChart = (fullscreen = false) => {
        const chartHeight = fullscreen ? 300 : 220;
        const barWidth = fullscreen ? 50 : 40;

        return (
            <>
                {/* Pill Mode Selector */}
                <View style={styles.pillContainer}>
                    {(['day', 'week', 'month'] as const).map((mode) => (
                        <TouchableOpacity
                            key={mode}
                            onPress={() => { setViewMode(mode); setCurrentDate(new Date()); }}
                            style={[styles.pillBtn, viewMode === mode ? { backgroundColor: '#2A4384' } : { backgroundColor: '#212A40' }]}
                        >
                            {viewMode === mode && <MaterialIcons name="check" size={14} color="#A6C8FF" style={{ marginRight: 4 }} />}
                            <Text style={{ color: viewMode === mode ? '#A6C8FF' : '#9AA6B8', fontWeight: viewMode === mode ? 'bold' : 'normal' }}>
                                {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Date Navigation */}
                <View style={styles.navContainer}>
                    <TouchableOpacity onPress={() => navigatePeriod('prev')} style={styles.iconBtn}>
                        <MaterialIcons name="chevron-left" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={[styles.dateLabel, { color: '#fff' }]}>{formatPeriodLabel()}</Text>
                    <TouchableOpacity onPress={() => navigatePeriod('next')} style={styles.iconBtn}>
                        <MaterialIcons name="chevron-right" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Total Badge */}
                <View style={styles.totalBadge}>
                    <Text style={styles.totalBadgeText}>Total: <Text style={{ fontWeight: 'bold' }}>${revenueTotal.toFixed(2)}</Text></Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 40 }} />
                ) : revenueTotal === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="trending-up" size={48} color="#aaa" />
                        <Text style={[styles.emptyTitle, { color: '#fff' }]}>No hay ingresos registrados para este período</Text>
                        <Text style={styles.emptySubtitle}>Los ingresos se registran al marcar citas como completadas</Text>
                    </View>
                ) : (
                    <View style={[styles.chartWrapper, { height: chartHeight }]}>
                        {/* Y-Axis */}
                        <View style={styles.yAxis}>
                            <Text style={[styles.yAxisLabel, { transform: [{ rotate: '-90deg' }], left: -26, top: chartHeight / 2 - 20, position: 'absolute' }]}>Ingresos ($)</Text>
                            {[maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0].map((val, i) => (
                                <Text key={i} style={styles.yAxisText}>{Math.round(val)}</Text>
                            ))}
                        </View>

                        <View style={styles.chartContainer}>
                            {/* Grid Lines */}
                            <View style={styles.gridLines}>
                                {[1, 2, 3, 4].map(line => (
                                    <View key={line} style={styles.gridLine} />
                                ))}
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                                {revenueData.map((data, index) => {
                                    const heightPercentage = Math.max((data.value / maxValue) * 100, 2);
                                    return (
                                        <View key={index} style={[styles.barWrapper, { width: fullscreen ? 70 : 60 }]}>
                                            <View style={styles.barSpace}>
                                                <View style={[styles.bar, { height: `${heightPercentage}%`, width: barWidth }]} />
                                            </View>
                                            <Text style={styles.barLabel}>{data.name}</Text>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                )}
            </>
        );
    };

    return (
        <KyrosScreen title="Estadísticas">
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* ═══════════ Ingresos Card ═══════════ */}
                <TouchableOpacity activeOpacity={0.8} onPress={() => setRevenueModalVisible(true)}>
                    <KyrosCard style={styles.cardWrapper}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <MaterialIcons name="attach-money" size={22} color="#0F9D58" />
                            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginLeft: 4 }}>Ingresos</Text>
                            <View style={{ flex: 1 }} />
                            <MaterialIcons name="fullscreen" size={22} color={theme.colors.onSurfaceVariant} />
                        </View>
                        {renderRevenueChart(false)}
                    </KyrosCard>
                </TouchableOpacity>

                {/* ═══════════ Servicios Más Elegidos Card ═══════════ */}
                <TouchableOpacity activeOpacity={0.8} onPress={() => setDonutModalVisible(true)}>
                    <KyrosCard style={styles.cardWrapper}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Servicios Más Elegidos</Text>
                            <View style={{ flex: 1 }} />
                            <MaterialIcons name="fullscreen" size={22} color={theme.colors.onSurfaceVariant} />
                        </View>

                        {servicesLoading ? (
                            <ActivityIndicator style={{ marginVertical: 30 }} />
                        ) : servicesData.length === 0 ? (
                            <Text style={{ textAlign: 'center', color: '#888', marginVertical: 30 }}>Sin datos de servicios</Text>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                {/* Donut with center text */}
                                <View style={{ position: 'relative', width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginVertical: 16 }}>
                                    <DonutChart data={servicesData} size={180} />
                                    <View style={{ position: 'absolute', alignItems: 'center' }}>
                                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>Total</Text>
                                        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{totalServices}</Text>
                                    </View>
                                </View>

                                {/* Legend below donut */}
                                <View style={{ width: '100%', marginTop: 12 }}>
                                    {servicesData.map((item, idx) => (
                                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: idx < servicesData.length - 1 ? 1 : 0, borderBottomColor: '#1e293b' }}>
                                            <View style={[styles.legendColorBox, { backgroundColor: item.color }]} />
                                            <Text numberOfLines={1} style={{ color: '#e2e8f0', fontSize: 14, flex: 1 }}>
                                                {item.name}
                                            </Text>
                                            <Text style={{ color: '#94a3b8', fontSize: 13, marginLeft: 8 }}>
                                                {item.count} ({totalServices > 0 ? Math.round((item.count / totalServices) * 100) : 0}%)
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </KyrosCard>
                </TouchableOpacity>

            </ScrollView>

            {/* ═══════════════════════════════════════════
                FULLSCREEN MODAL: Servicios Más Elegidos
                ═══════════════════════════════════════════ */}
            <RNModal
                visible={donutModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setDonutModalVisible(false)}
            >
                <View style={styles.fullscreenModal}>
                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setDonutModalVisible(false)}>
                        <MaterialIcons name="close" size={28} color="#fff" />
                    </TouchableOpacity>

                    <Text style={styles.fullscreenTitle}>Servicios Más Elegidos</Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 16 }}>
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                                <DonutChart data={servicesData} size={Math.min(screenWidth * 0.55, 280)} />
                                <View style={{ position: 'absolute', alignItems: 'center' }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 14 }}>Total</Text>
                                    <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>{totalServices}</Text>
                                </View>
                            </View>
                        </View>

                        <ScrollView style={{ width: 160, maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                            <Text style={{ fontWeight: 'bold', marginBottom: 16, color: '#fff', fontSize: 16 }}>Servicios</Text>
                            {servicesData.map((item, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: item.color, marginRight: 10 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#fff', fontSize: 14 }}>{item.name}</Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>{item.count} ({totalServices > 0 ? Math.round((item.count / totalServices) * 100) : 0}%)</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </RNModal>

            {/* ═══════════════════════════════════════════
                FULLSCREEN MODAL: Ingresos
                ═══════════════════════════════════════════ */}
            <RNModal
                visible={revenueModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setRevenueModalVisible(false)}
            >
                <View style={styles.fullscreenModal}>
                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setRevenueModalVisible(false)}>
                        <MaterialIcons name="close" size={28} color="#fff" />
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 20 }}>
                        <MaterialIcons name="attach-money" size={24} color="#0F9D58" />
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginLeft: 6 }}>Ingresos</Text>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        {renderRevenueChart(true)}
                    </ScrollView>
                </View>
            </RNModal>

        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    cardWrapper: { marginHorizontal: 12, marginTop: 16 },
    pillContainer: { flexDirection: 'row', justifyContent: 'center', alignSelf: 'center', borderRadius: 24, padding: 4, marginBottom: 20, backgroundColor: '#1A233A' },
    pillBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
    navContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    iconBtn: { padding: 8 },
    dateLabel: { fontSize: 15, fontWeight: 'bold', width: 240, textAlign: 'center', textTransform: 'capitalize' },
    totalBadge: {
        backgroundColor: '#0F9D58', alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 24,
        borderRadius: 12, marginBottom: 30
    },
    totalBadgeText: { color: '#fff', fontSize: 20 },
    chartWrapper: { flexDirection: 'row', marginTop: 10 },
    yAxis: { width: 40, justifyContent: 'space-between', paddingBottom: 30, alignItems: 'flex-end', paddingRight: 8 },
    yAxisText: { fontSize: 10, color: '#94a3b8' },
    yAxisLabel: { fontSize: 12, width: 80, textAlign: 'center', color: '#94a3b8' },
    chartContainer: { flex: 1, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: '#334155' },
    gridLines: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 30, justifyContent: 'space-between' },
    gridLine: { borderTopWidth: 1, width: '100%', opacity: 0.15, borderColor: '#475569' },
    chartScroll: { alignItems: 'flex-end', paddingRight: 20, minWidth: '100%' },
    barWrapper: { width: 60, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    barSpace: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    bar: { width: 40, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#ec4899' },
    barLabel: { fontSize: 11, marginTop: 10, color: '#94a3b8', textAlign: 'center' },
    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center' },
    donutLayout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
    donutContainer: { flex: 1, alignItems: 'center', marginVertical: 20 },
    legendContainer: { width: 130, paddingLeft: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    legendColorBox: { width: 14, height: 14, borderRadius: 4, marginRight: 8 },

    // Fullscreen modal
    fullscreenModal: {
        flex: 1,
        backgroundColor: '#0F172A',
        paddingTop: 50,
    },
    closeBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    fullscreenTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 20,
    },
});
