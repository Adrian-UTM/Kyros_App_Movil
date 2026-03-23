import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal as RNModal } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import KyrosSelector from '../../components/KyrosSelector';
import { useApp } from '../../lib/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { useKyrosPalette } from '../../lib/useKyrosPalette';

const DonutChart = ({ data, size = 150 }: { data: { name: string, count: number, color: string }[], size?: number }) => {
    const strokeWidth = size > 200 ? 36 : 24;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;

    const total = data ? data.reduce((sum, item) => sum + (item?.count || 0), 0) : 0;
    if (total === 0 || !data || data.length === 0) return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: '#334155' }} />;

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

function ServiceHighlightsCard({
    title,
    data,
    loading,
    total,
    onOpenFull,
    compact = false,
}: {
    title: string;
    data: { name: string; count: number; color: string }[];
    loading: boolean;
    total: number;
    onOpenFull?: () => void;
    compact?: boolean;
}) {
    const palette = useKyrosPalette();
    const topService = data[0];

    return (
        <KyrosCard style={{ flex: 1 }}>
            <View style={styles.servicesCardHeader}>
                <View>
                    <Text variant="titleMedium" style={[styles.cardTitle, { marginBottom: 4, color: palette.textStrong }]}>{title}</Text>
                    <Text style={[styles.servicesCardSubtitle, { color: palette.textMuted }]}>
                        {total > 0 ? `${total} servicio(s) registrados en el período` : 'Sin actividad en el período'}
                    </Text>
                </View>
                {onOpenFull ? (
                    <TouchableOpacity onPress={onOpenFull} style={[styles.servicesCardExpand, { backgroundColor: palette.surfaceRaised }]}>
                        <MaterialIcons name="fullscreen" size={22} color={palette.text} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginVertical: 30 }} />
            ) : data.length === 0 ? (
                <View style={styles.servicesEmptyState}>
                    <MaterialIcons name="insert-chart-outlined" size={34} color={palette.disabled} />
                    <Text style={[styles.emptyText, { marginVertical: 12, color: palette.textStrong }]}>Sin datos de servicios para este período</Text>
                </View>
            ) : (
                <>
                    <View style={[styles.servicesHero, compact && styles.servicesHeroCompact]}>
                        <View style={[styles.servicesHeroSummary, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
                            <Text style={[styles.servicesHeroLabel, { color: palette.textMuted }]}>Servicio líder</Text>
                            <Text style={[styles.servicesHeroTitle, { color: palette.text }]} numberOfLines={2}>{topService?.name}</Text>
                            <Text style={styles.servicesHeroMeta}>
                                {topService?.count} cita(s) • {Math.round(((topService?.count || 0) / total) * 100)}%
                            </Text>
                        </View>
                        <View style={styles.servicesDonutWrap}>
                            <DonutChart data={data.slice(0, 5)} size={compact ? 132 : 152} />
                            <View style={styles.servicesDonutCenter}>
                                <Text style={[styles.servicesDonutCenterValue, { color: palette.text }]}>{total}</Text>
                                <Text style={[styles.servicesDonutCenterLabel, { color: palette.textMuted }]}>Total</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.servicesRanking}>
                        {data.slice(0, 5).map((item, idx) => {
                            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                            return (
                                <View key={`${item.name}-${idx}`} style={styles.servicesRankingRow}>
                                    <View style={styles.servicesRankingTop}>
                                        <View style={styles.servicesRankingNameWrap}>
                                            <View style={[styles.legendColorBox, { backgroundColor: item.color, marginRight: 10 }]} />
                                            <Text style={[styles.servicesRankingName, { color: palette.text }]} numberOfLines={1}>{item.name}</Text>
                                        </View>
                                        <Text style={[styles.servicesRankingValue, { color: palette.textMuted }]}>{item.count} • {pct}%</Text>
                                    </View>
                                    <View style={[styles.servicesRankingTrack, { backgroundColor: palette.surfaceRaised }]}>
                                        <View style={[styles.servicesRankingFill, { width: `${Math.max(pct, 6)}%`, backgroundColor: item.color }]} />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </>
            )}
        </KyrosCard>
    );
}

export default function EstadisticasScreen() {
    const theme = useTheme();
    const palette = useKyrosPalette();
    const { rol, sucursalId, negocioId: appNegocioId } = useApp();
    const screenWidth = Dimensions.get('window').width;
    const isOwner = rol !== 'sucursal';

    const [loading, setLoading] = useState(true);
    const [servicesLoading, setServicesLoading] = useState(true);
    
    // Revenue States
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [revenueData, setRevenueData] = useState<{ name: string, value: number }[]>([]);
    const [revenueTotal, setRevenueTotal] = useState(0);
    const [revenueBranchId, setRevenueBranchId] = useState<number | null>(null);

    // Full screen
    const [fullScreenChart, setFullScreenChart] = useState<'revenue' | 'citas' | 'globalServices' | 'branchServices' | null>(null);

    // Citas States
    const [citasPorSucursalData, setCitasPorSucursalData] = useState<{ name: string, value: number }[]>([]);
    
    // Services States
    const [globalServicesData, setGlobalServicesData] = useState<{ name: string, count: number, color: string }[]>([]);
    const [branchServicesData, setBranchServicesData] = useState<{ name: string, count: number, color: string }[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

    const [sucursales, setSucursales] = useState<{id: number, nombre: string}[]>([]);

    useEffect(() => {
        if (isOwner && appNegocioId) {
            supabase.from('sucursales').select('id, nombre').eq('negocio_id', appNegocioId)
                .then(({ data }) => {
                    setSucursales(data || []);
                    if (data && data.length > 0) setSelectedBranchId(data[0].id);
                });
        }
    }, [isOwner, appNegocioId]);

    // ──────────────────────────────────────────────
    // Load revenue & citas data
    // ──────────────────────────────────────────────
    const loadRevenueData = useCallback(async () => {
        if (!appNegocioId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange(currentDate, viewMode);

            let query = supabase
                .from('citas')
                .select('id, total_pagado, monto_total, fecha_completado, sucursal_id')
                .eq('negocio_id', appNegocioId)
                .eq('estado', 'completada')
                .gte('fecha_completado', startDate)
                .lte('fecha_completado', endDate);

            if (!isOwner && sucursalId) {
                query = query.eq('sucursal_id', sucursalId);
            }
            if (isOwner && revenueBranchId) {
                query = query.eq('sucursal_id', revenueBranchId);
            }

            const { data, error } = await query;

            if (error) throw error;

            let groupedData: { name: string, value: number }[] = [];

            if (viewMode === 'day') groupedData = groupByHour(data || []);
            else if (viewMode === 'week') groupedData = groupByDayOfWeek(data || []);
            else groupedData = groupByDayOfMonth(data || [], endDate);

            // Filter revenue data for owner so it shows global revenue
            setRevenueData(groupedData);
            setRevenueTotal((data || []).reduce((sum, cita) => sum + (cita.total_pagado || cita.monto_total || 0), 0));

            if (isOwner) {
                const cpsCounts: Record<string, number> = {};
                sucursales.forEach(s => cpsCounts[s.nombre] = 0);
                (data || []).forEach(cita => {
                    const sucName = sucursales.find(s => s.id === cita.sucursal_id)?.nombre || 'General / Eliminada';
                    cpsCounts[sucName] = (cpsCounts[sucName] || 0) + 1;
                });
                setCitasPorSucursalData(Object.entries(cpsCounts).map(([name, value]) => ({ name, value })));
            }
        } catch (error) {
            console.error('Error loading revenue data:', error);
        } finally {
            setLoading(false);
        }
    }, [sucursalId, currentDate, viewMode, appNegocioId, sucursales, isOwner, revenueBranchId]);

    // ──────────────────────────────────────────────
    // Load services data
    // ──────────────────────────────────────────────
    const loadServicesData = useCallback(async () => {
        if (!appNegocioId) {
            setServicesLoading(false);
            return;
        }

        setServicesLoading(true);
        try {
            const { startDate, endDate } = getDateRange(currentDate, viewMode);
            let query = supabase
                .from('citas')
                .select('id, sucursal_id, fecha_hora_inicio')
                .eq('negocio_id', appNegocioId)
                .neq('estado', 'cancelada')
                .gte('fecha_hora_inicio', startDate)
                .lte('fecha_hora_inicio', endDate);

            if (!isOwner && sucursalId) {
                query = query.eq('sucursal_id', sucursalId);
            }

            const { data: allCitas, error: citasError } = await query;

            if (citasError) throw citasError;

            if (allCitas && allCitas.length > 0) {
                const citaIds = allCitas.map((c: any) => c.id);
                // Chunking might be needed if citaIds > 1000, but fine for MVP
                const { data: csData } = await supabase
                    .from('citas_servicios')
                    .select('cita_id, servicio_id, servicios(nombre)')
                    .in('cita_id', citaIds);

                if (csData) {
                    const citaMap = new Map();
                    allCitas.forEach(c => citaMap.set(c.id, c.sucursal_id));

                    const globalCounts: Record<string, number> = {};
                    const branchCounts: Record<string, number> = {};

                    csData.forEach((row: any) => {
                        const name = row.servicios?.nombre || 'Desconocido';
                        const sucId = citaMap.get(row.cita_id);

                        globalCounts[name] = (globalCounts[name] || 0) + 1;
                        if (sucId === selectedBranchId) {
                            branchCounts[name] = (branchCounts[name] || 0) + 1;
                        }
                    });

                    const colors = ['#3E82F7', '#04B76B', '#FF8F28', '#FF4E8B', '#8E5FF5', '#00CFE8', '#EAB308', '#A855F7'];
                    
                    const gPie = Object.entries(globalCounts)
                        .map(([name, count], index) => ({ name, count, color: colors[index % colors.length] }))
                        .sort((a, b) => b.count - a.count);
                    
                    const bPie = Object.entries(branchCounts)
                        .map(([name, count], index) => ({ name, count, color: colors[index % colors.length] }))
                        .sort((a, b) => b.count - a.count);

                    setGlobalServicesData(gPie);
                    setBranchServicesData(bPie);
                } else {
                    setGlobalServicesData([]);
                    setBranchServicesData([]);
                }
            } else {
                setGlobalServicesData([]);
                setBranchServicesData([]);
            }
        } catch (error) {
            console.error('Error loading services data:', error);
        } finally {
            setServicesLoading(false);
        }
    }, [appNegocioId, isOwner, sucursalId, selectedBranchId, currentDate, viewMode]);

    useEffect(() => { loadRevenueData(); }, [loadRevenueData]);
    useEffect(() => { loadServicesData(); }, [loadServicesData]);
    useFocusEffect(
        useCallback(() => {
            loadRevenueData();
            loadServicesData();
        }, [loadRevenueData, loadServicesData])
    );

    const getDateRange = (date: Date, mode: string) => {
        const d = new Date(date);
        if (mode === 'day') {
            d.setHours(0, 0, 0, 0); const start = d.toISOString();
            d.setHours(23, 59, 59, 999); return { startDate: start, endDate: d.toISOString() };
        } else if (mode === 'week') {
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            d.setDate(diff); d.setHours(0, 0, 0, 0); const start = d.toISOString();
            d.setDate(d.getDate() + 6); d.setHours(23, 59, 59, 999); return { startDate: start, endDate: d.toISOString() };
        } else {
            d.setDate(1); d.setHours(0, 0, 0, 0); const start = d.toISOString();
            d.setMonth(d.getMonth() + 1); d.setDate(0); d.setHours(23, 59, 59, 999); return { startDate: start, endDate: d.toISOString() };
        }
    };

    const groupByHour = (citas: any[]) => {
        const hours: { [key: string]: number } = {};
        for (let i = 8; i <= 20; i++) hours[`${i}:00`] = 0;
        citas.forEach(cita => {
            if (cita.fecha_completado) {
                const hour = new Date(cita.fecha_completado).getHours();
                const key = `${hour}:00`;
                if (hours[key] !== undefined) hours[key] += (cita.total_pagado || cita.monto_total || 0);
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
                dayData[days[dayIndex]] += (cita.total_pagado || cita.monto_total || 0);
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
                if (dayData[day] !== undefined) dayData[day] += (cita.total_pagado || cita.monto_total || 0);
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

    const maxValueCitas = Math.max(...(citasPorSucursalData.length ? citasPorSucursalData.map(d => d.value) : [10]), 10); // Base Y Axis for citas
    const maxValueRevenue = Math.max(...(revenueData.length ? revenueData.map(d => d.value) : [100]), 100);
    const totalGlobalServices = globalServicesData.reduce((sum, s) => sum + s.count, 0);

    const isTabletOrWeb = screenWidth > 768;

    return (
        <KyrosScreen title="Estadísticas">
            <ScrollView style={[styles.container, { backgroundColor: palette.background }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 12 }}>

                {/* Date Controls (Applies to Revenue & Citas) */}
                <View style={{ marginTop: 20, marginBottom: 10, alignSelf: 'center', width: '100%', maxWidth: 600 }}>
                    <View style={[styles.pillContainer, { backgroundColor: palette.surfaceRaised }]}>
                        {(['day', 'week', 'month'] as const).map((mode) => (
                            <TouchableOpacity key={mode} onPress={() => { setViewMode(mode); setCurrentDate(new Date()); }}
                                style={[styles.pillBtn, { backgroundColor: viewMode === mode ? theme.colors.primary : palette.surfaceRaised }]}>
                                {viewMode === mode && <MaterialIcons name="check" size={14} color="#A6C8FF" style={{ marginRight: 4 }} />}
                                <Text style={{ color: viewMode === mode ? '#ffffff' : palette.textMuted, fontWeight: viewMode === mode ? 'bold' : 'normal' }}>
                                    {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.navContainer}>
                        <TouchableOpacity onPress={() => navigatePeriod('prev')} style={styles.iconBtn}>
                            <MaterialIcons name="chevron-left" size={28} color={palette.text} />
                        </TouchableOpacity>
                        <Text style={[styles.dateLabel, { color: palette.text }]}>{formatPeriodLabel()}</Text>
                        <TouchableOpacity onPress={() => navigatePeriod('next')} style={styles.iconBtn}>
                            <MaterialIcons name="chevron-right" size={28} color={palette.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {isOwner ? (
                    <View style={isTabletOrWeb ? styles.rowFlow : styles.colFlow}>
                        {/* ═══════════ Ingresos Estimados (Owner Only) ═══════════ */}
                        <KyrosCard style={styles.fullWidth}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text variant="titleMedium" style={[styles.cardTitle, { marginBottom: 0, color: palette.textStrong }]}>Ingresos Estimados</Text>
                                <TouchableOpacity onPress={() => setFullScreenChart('revenue')} style={{ padding: 4, backgroundColor: palette.surfaceRaised, borderRadius: 8 }}>
                                    <MaterialIcons name="fullscreen" size={24} color={palette.text} />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={{ marginBottom: 16 }}>
                                <KyrosSelector
                                    options={[
                                        { label: 'Global (Todas las sucursales)', value: null },
                                        ...sucursales.map(s => ({ label: s.nombre, value: s.id }))
                                    ]}
                                    selectedValue={revenueBranchId}
                                    onValueChange={(val) => setRevenueBranchId(val)}
                                    icon="store"
                                    style={{ backgroundColor: palette.surfaceRaised, borderColor: palette.border }}
                                />
                            </View>
                            {loading ? (
                                <ActivityIndicator style={{ marginVertical: 30 }} color="#1E66FF" />
                            ) : (
                                <View style={styles.chartWrapper}>
                                    <View style={styles.yAxis}>
                                        <Text style={[styles.yAxisLabel, { transform: [{ rotate: '-90deg' }], left: -40, top: 80, position: 'absolute' }]}>Ingreso ($)</Text>
                                        {[maxValueRevenue, maxValueRevenue * 0.5, 0].map((val, i) => (
                                            <Text key={i} style={styles.yAxisText}>${Math.round(val)}</Text>
                                        ))}
                                    </View>
                                    <View style={styles.chartContainer}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                                            {revenueData.map((data, index) => {
                                                const heightPercentage = Math.max((data.value / maxValueRevenue) * 100, 2);
                                                return (
                                                    <View key={index} style={styles.barWrapper}>
                                                        <View style={styles.barSpace}>
                                                            <Text style={{ color: palette.text, fontSize: 10, marginBottom: 4 }}>${data.value}</Text>
                                                            <View style={[styles.bar, { height: `${heightPercentage}%`, backgroundColor: '#10b981' }]} />
                                                        </View>
                                                        <Text style={styles.barLabel}>{data.name}</Text>
                                                    </View>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}
                            <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 10 }}>
                                <Text style={{ color: palette.successText, fontSize: 24, fontWeight: 'bold' }}>Total Generado: ${revenueTotal}</Text>
                            </View>
                        </KyrosCard>

                        {/* ═══════════ Citas por Sucursal (Owner Only) ═══════════ */}
                        <KyrosCard style={isTabletOrWeb ? styles.halfWidth : styles.fullWidth}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text variant="titleMedium" style={[styles.cardTitle, { marginBottom: 0, color: palette.textStrong }]}>Citas por Sucursal</Text>
                                <TouchableOpacity onPress={() => setFullScreenChart('citas')} style={{ padding: 4, backgroundColor: palette.surfaceRaised, borderRadius: 8 }}>
                                    <MaterialIcons name="fullscreen" size={24} color={palette.text} />
                                </TouchableOpacity>
                            </View>
                            {loading ? (
                                <ActivityIndicator style={{ marginVertical: 30 }} />
                            ) : (
                                <View style={styles.chartWrapper}>
                                    <View style={styles.yAxis}>
                                        <Text style={[styles.yAxisLabel, { transform: [{ rotate: '-90deg' }], left: -30, top: 80, position: 'absolute' }]}>Citas</Text>
                                        {[maxValueCitas, maxValueCitas * 0.5, 0].map((val, i) => (
                                            <Text key={i} style={styles.yAxisText}>{Math.round(val)}</Text>
                                        ))}
                                    </View>
                                    <View style={styles.chartContainer}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                                            {citasPorSucursalData.map((data, index) => {
                                                const heightPercentage = Math.max((data.value / maxValueCitas) * 100, 2);
                                                return (
                                                    <View key={index} style={styles.barWrapper}>
                                                        <View style={styles.barSpace}>
                                                            <Text style={{ color: palette.text, fontSize: 10, marginBottom: 4 }}>{data.value}</Text>
                                                            <View style={[styles.bar, { height: `${heightPercentage}%`, backgroundColor: '#3b82f6' }]} />
                                                        </View>
                                                        <Text style={styles.barLabel}>{data.name}</Text>
                                                    </View>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}
                        </KyrosCard>

                        {/* ═══════════ Servicios Más Elegidos (General) (Owner Only) ═══════════ */}
                        <View style={isTabletOrWeb ? styles.halfWidth : styles.fullWidth}>
                            <ServiceHighlightsCard
                                title="Servicios Más Elegidos (General)"
                                data={globalServicesData}
                                loading={servicesLoading}
                                total={totalGlobalServices}
                                onOpenFull={() => setFullScreenChart('globalServices')}
                                compact
                            />
                        </View>

                        {/* ═══════════ Servicios por Sucursal (Owner Only) ═══════════ */}
                        <KyrosCard style={styles.fullWidth}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <Text variant="titleMedium" style={[styles.cardTitle, { marginBottom: 0, color: palette.textStrong }]}>Servicios por Sucursal</Text>
                                <TouchableOpacity onPress={() => setFullScreenChart('branchServices')} style={{ padding: 4, backgroundColor: palette.surfaceRaised, borderRadius: 8 }}>
                                    <MaterialIcons name="fullscreen" size={24} color={palette.text} />
                                </TouchableOpacity>
                            </View>
                            <View style={{ marginBottom: 16 }}>
                                <KyrosSelector
                                    options={[
                                        { label: 'Seleccionar Sucursal...', value: null },
                                        ...sucursales.map(s => ({ label: s.nombre, value: s.id }))
                                    ]}
                                    selectedValue={selectedBranchId}
                                    onValueChange={(val) => setSelectedBranchId(val)}
                                    icon="store"
                                    style={{ backgroundColor: palette.surfaceRaised, borderColor: palette.border }}
                                />
                            </View>

                            {servicesLoading ? (
                                <ActivityIndicator style={{ marginVertical: 30 }} />
                            ) : !selectedBranchId ? (
                                <Text style={[styles.emptyText, { color: palette.textStrong }]}>Selecciona una sucursal para ver sus analíticas.</Text>
                            ) : (
                                <View style={{ flexDirection: 'column', gap: 12, marginTop: 10 }}>
                                    {branchServicesData.map((item, idx) => {
                                        const maxBCount = Math.max(...(branchServicesData.length ? branchServicesData.map(d => d.count) : [1]), 1);
                                        const wPct = (item.count / maxBCount) * 100;
                                        return (
                                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ width: 100, color: palette.textMuted, fontSize: 11, marginRight: 8 }} numberOfLines={1}>{item.name}</Text>
                                                <View style={{ flex: 1, height: 16, backgroundColor: palette.surfaceRaised, borderRadius: 4, overflow: 'hidden' }}>
                                                    <View style={{ width: `${Math.max(wPct, 2)}%`, height: '100%', backgroundColor: item.color, borderRadius: 4 }} />
                                                </View>
                                                <Text style={{ width: 20, color: palette.text, fontSize: 11, marginLeft: 8, textAlign: 'right' }}>{item.count}</Text>
                                            </View>
                                        );
                                    })}
                                    {branchServicesData.length === 0 && <Text style={[styles.emptyText, { color: palette.textStrong }]}>Sin registros</Text>}
                                </View>
                            )}
                        </KyrosCard>
                    </View>
                ) : (
                    <View style={styles.colFlow}>
                        {/* ═══════════ Servicios Más Elegidos (Branch Only) ═══════════ */}
                        <View style={styles.fullWidth}>
                            <ServiceHighlightsCard
                                title="Servicios Más Elegidos"
                                data={globalServicesData}
                                loading={servicesLoading}
                                total={totalGlobalServices}
                            />
                        </View>
                    </View>
                )}
            </ScrollView>

            <RNModal visible={fullScreenChart !== null} animationType="slide" onRequestClose={() => setFullScreenChart(null)}>
                <View style={{ flex: 1, backgroundColor: palette.background, padding: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 }}>
                        <TouchableOpacity onPress={() => setFullScreenChart(null)} style={{ padding: 8, backgroundColor: palette.surfaceRaised, borderRadius: 8 }}>
                            <MaterialIcons name="close" size={24} color={palette.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        {fullScreenChart === 'revenue' && (
                            <KyrosCard style={{ flex: 1 }}>
                                <Text variant="titleLarge" style={[styles.cardTitle, { textAlign: 'center', color: palette.textStrong }]}>Ingresos Estimados</Text>
                                {revenueData.length === 0 && !loading ? (
                                    <Text style={[styles.emptyText, { color: palette.textStrong }]}>Sin ingresos para este período</Text>
                                ) : (
                                    <View style={[styles.chartWrapper, { height: '80%' }]}>
                                        <View style={styles.yAxis}>
                                            <Text style={[styles.yAxisLabel, { transform: [{ rotate: '-90deg' }], left: -40, top: 150, position: 'absolute', color: palette.textMuted }]}>Ingreso ($)</Text>
                                            {[maxValueRevenue, maxValueRevenue * 0.5, 0].map((val, i) => (
                                                <Text key={i} style={[styles.yAxisText, { color: palette.textMuted }]}>${Math.round(val)}</Text>
                                            ))}
                                        </View>
                                        <View style={styles.chartContainer}>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                                                {revenueData.map((data, index) => {
                                                    const heightPercentage = Math.max((data.value / maxValueRevenue) * 100, 2);
                                                    return (
                                                        <View key={index} style={styles.barWrapper}>
                                                            <View style={styles.barSpace}>
                                                                <Text style={{ color: palette.textStrong, fontSize: 12, marginBottom: 4 }}>${data.value}</Text>
                                                                <View style={[styles.bar, { height: `${heightPercentage}%`, backgroundColor: '#10b981' }]} />
                                                            </View>
                                                            <Text style={[styles.barLabel, { color: palette.textMuted }]}>{data.name}</Text>
                                                        </View>
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>
                                    </View>
                                )}
                            </KyrosCard>
                        )}
                        {fullScreenChart === 'citas' && (
                            <KyrosCard style={{ flex: 1 }}>
                                <Text variant="titleLarge" style={[styles.cardTitle, { textAlign: 'center', color: palette.textStrong }]}>Citas por Sucursal</Text>
                                {citasPorSucursalData.length === 0 && !loading ? (
                                    <Text style={[styles.emptyText, { color: palette.textStrong }]}>Sin datos para este período</Text>
                                ) : (
                                    <View style={[styles.chartWrapper, { height: '80%' }]}>
                                        <View style={styles.yAxis}>
                                            <Text style={[styles.yAxisLabel, { transform: [{ rotate: '-90deg' }], left: -30, top: 150, position: 'absolute', color: palette.textMuted }]}>Citas</Text>
                                            {[maxValueCitas, maxValueCitas * 0.5, 0].map((val, i) => (
                                                <Text key={i} style={[styles.yAxisText, { color: palette.textMuted }]}>{Math.round(val)}</Text>
                                            ))}
                                        </View>
                                        <View style={styles.chartContainer}>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                                                {citasPorSucursalData.map((data, index) => {
                                                    const heightPercentage = Math.max((data.value / maxValueCitas) * 100, 2);
                                                    return (
                                                        <View key={index} style={styles.barWrapper}>
                                                            <View style={styles.barSpace}>
                                                                <Text style={{ color: palette.textStrong, fontSize: 12, marginBottom: 4 }}>{data.value}</Text>
                                                                <View style={[styles.bar, { height: `${heightPercentage}%`, backgroundColor: '#3b82f6' }]} />
                                                            </View>
                                                            <Text style={[styles.barLabel, { color: palette.textMuted }]}>{data.name}</Text>
                                                        </View>
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>
                                    </View>
                                )}
                            </KyrosCard>
                        )}
                        {/* Servicios Más Elegidos (Global) */}
                        {fullScreenChart === 'globalServices' && (
                            <KyrosCard style={{ flex: 1 }}>
                                <ServiceHighlightsCard
                                    title="Servicios Más Elegidos (General)"
                                    data={globalServicesData}
                                    loading={servicesLoading}
                                    total={totalGlobalServices}
                                />
                            </KyrosCard>
                        )}
                        {/* Servicios por Sucursal */}
                        {fullScreenChart === 'branchServices' && (
                            <KyrosCard style={{ flex: 1 }}>
                                <Text variant="titleLarge" style={[styles.cardTitle, { textAlign: 'center', marginBottom: 30, color: palette.textStrong }]}>
                                    Servicios por Sucursal
                                </Text>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
                                    <View style={{ flexDirection: 'column', gap: 20 }}>
                                        {branchServicesData.map((item, idx) => {
                                            const maxBCount = Math.max(...(branchServicesData.length ? branchServicesData.map(d => d.count) : [1]), 1);
                                            const wPct = (item.count / maxBCount) * 100;
                                            return (
                                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={{ width: 140, color: palette.textStrong, fontSize: 14, marginRight: 12 }} numberOfLines={2}>{item.name}</Text>
                                                    <View style={{ flex: 1, height: 24, backgroundColor: '#1E293B', borderRadius: 6, overflow: 'hidden' }}>
                                                        <View style={{ width: `${Math.max(wPct, 2)}%`, height: '100%', backgroundColor: item.color, borderRadius: 6 }} />
                                                    </View>
                                                    <Text style={{ width: 40, color: palette.textStrong, fontSize: 14, marginLeft: 12, textAlign: 'right', fontWeight: 'bold' }}>{item.count}</Text>
                                                </View>
                                            );
                                        })}
                                        {branchServicesData.length === 0 && <Text style={[styles.emptyText, { marginTop: 40, color: palette.textStrong }]}>No hay datos</Text>}
                                    </View>
                                </ScrollView>
                            </KyrosCard>
                        )}
                    </View>
                </View>
            </RNModal>
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    rowFlow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
    colFlow: { flexDirection: 'column', gap: 16 },
    fullWidth: { flexBasis: '100%', marginBottom: 16 },
    halfWidth: { flexBasis: '48%', marginBottom: 16 },
    cardTitle: { fontWeight: 'bold', color: '#fff', marginBottom: 16 },
    
    // Revenue specific (now adapted for citas)
    chartWrapper: { flexDirection: 'row', height: 220, marginTop: 10 },
    yAxis: { width: 50, justifyContent: 'space-between', paddingBottom: 30, alignItems: 'flex-end', paddingRight: 8 },
    yAxisText: { fontSize: 10, color: '#94a3b8' },
    yAxisLabel: { fontSize: 12, color: '#94a3b8', width: 60, textAlign: 'center' },
    chartContainer: { flex: 1, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: '#334155' },
    chartScroll: { alignItems: 'flex-end', paddingRight: 20, minWidth: '100%', paddingLeft: 10 },
    barWrapper: { width: 80, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    barSpace: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    bar: { width: 40, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#3b82f6' },
    barLabel: { fontSize: 11, marginTop: 10, color: '#94a3b8', textAlign: 'center' },
    
    emptyText: { textAlign: 'center', color: '#888', marginVertical: 40 },
    
    // Donut Layout
    donutRowLayout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    donutContainer: { flex: 1, alignItems: 'center' },
    legendContainerFlex: { flex: 1, paddingLeft: 16 },
    legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    legendColorBox: { width: 14, height: 14, borderRadius: 4, marginRight: 8 },
    legendText: { color: '#e2e8f0', fontSize: 13, flex: 1 },

    // Picker
    pickerWrapper: {
        backgroundColor: '#1E293B',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 20,
        overflow: 'hidden'
    },
    picker: {
        color: '#e2e8f0',
        height: 50,
        width: '100%',
    },

    // Controls
    pillContainer: { flexDirection: 'row', justifyContent: 'center', alignSelf: 'center', borderRadius: 24, padding: 4, backgroundColor: '#1A233A' },
    pillBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
    navContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    iconBtn: { padding: 8 },
    dateLabel: { fontSize: 15, fontWeight: 'bold', width: 200, textAlign: 'center', textTransform: 'capitalize' },
    servicesCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    servicesCardSubtitle: {
        color: '#94a3b8',
        fontSize: 12,
    },
    servicesCardExpand: {
        padding: 6,
        backgroundColor: '#334155',
        borderRadius: 10,
    },
    servicesHero: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20,
    },
    servicesHeroCompact: {
        alignItems: 'flex-start',
    },
    servicesHeroSummary: {
        flex: 1,
        backgroundColor: '#1E293B',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#334155',
        padding: 16,
    },
    servicesHeroLabel: {
        color: '#94a3b8',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 6,
    },
    servicesHeroTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
    },
    servicesHeroMeta: {
        color: '#38bdf8',
        fontSize: 13,
        fontWeight: '600',
    },
    servicesDonutWrap: {
        width: 170,
        height: 170,
        alignItems: 'center',
        justifyContent: 'center',
    },
    servicesDonutCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    servicesDonutCenterValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
    },
    servicesDonutCenterLabel: {
        color: '#94a3b8',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    servicesRanking: {
        gap: 12,
    },
    servicesRankingRow: {
        gap: 6,
    },
    servicesRankingTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    servicesRankingNameWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    servicesRankingName: {
        color: '#e2e8f0',
        fontSize: 13,
        flex: 1,
    },
    servicesRankingValue: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
    },
    servicesRankingTrack: {
        height: 10,
        backgroundColor: '#1E293B',
        borderRadius: 999,
        overflow: 'hidden',
    },
    servicesRankingFill: {
        height: '100%',
        borderRadius: 999,
    },
    servicesEmptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
});
