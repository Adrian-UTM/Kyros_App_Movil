import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import { useApp } from '../../lib/AppContext';
import { supabase } from '../../lib/supabaseClient';

export default function EstadisticasScreen() {
    const theme = useTheme();
    const { rol, sucursalId } = useApp();

    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [revenueData, setRevenueData] = useState<{ name: string, value: number }[]>([]);
    const [revenueTotal, setRevenueTotal] = useState(0);

    const loadData = useCallback(async () => {
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

    useEffect(() => {
        loadData();
    }, [loadData]);


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

    // Chart scale calculation
    const maxValue = Math.max(...revenueData.map(d => d.value), 100);

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

    return (
        <KyrosScreen title="Estadísticas">
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
                <KyrosCard title="Ingresos">
                    <View style={styles.tabContainer}>
                        {(['day', 'week', 'month'] as const).map((mode) => (
                            <TouchableOpacity
                                key={mode}
                                onPress={() => { setViewMode(mode); setCurrentDate(new Date()); }}
                                style={[styles.tabBtn, viewMode === mode && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
                            >
                                <Text style={{ color: viewMode === mode ? theme.colors.primary : '#666', fontWeight: viewMode === mode ? 'bold' : 'normal', textTransform: 'capitalize' }}>
                                    {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.navContainer}>
                        <TouchableOpacity onPress={() => navigatePeriod('prev')} style={styles.iconBtn}>
                            <MaterialIcons name="chevron-left" size={28} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.dateLabel}>{formatPeriodLabel()}</Text>
                        <TouchableOpacity onPress={() => navigatePeriod('next')} style={styles.iconBtn}>
                            <MaterialIcons name="chevron-right" size={28} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.totalBadge}>
                        <Text style={styles.totalBadgeText}>Total: ${revenueTotal.toFixed(2)}</Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 40 }} />
                    ) : (
                        <View style={styles.chartContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                                {revenueData.map((data, index) => {
                                    const heightPercentage = (data.value / maxValue) * 100;
                                    return (
                                        <View key={index} style={styles.barWrapper}>
                                            <View style={styles.barSpace}>
                                                <View style={[styles.bar, { height: `${heightPercentage}%`, backgroundColor: theme.colors.primary }]} />
                                            </View>
                                            <Text style={styles.barLabel}>{data.name}</Text>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}
                </KyrosCard>
            </ScrollView>
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    tabContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
    tabBtn: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 4 },
    navContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    iconBtn: { padding: 8 },
    dateLabel: { fontSize: 16, fontWeight: '500', width: 220, textAlign: 'center', textTransform: 'capitalize' },
    totalBadge: {
        backgroundColor: '#10b981', alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 24,
        borderRadius: 20, marginBottom: 24
    },
    totalBadgeText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    chartContainer: { height: 250, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: '#eee', marginTop: 10, paddingLeft: 8 },
    chartScroll: { alignItems: 'flex-end', paddingBottom: 8, paddingRight: 20 },
    barWrapper: { width: 40, alignItems: 'center', marginRight: 10, height: '100%', justifyContent: 'flex-end' },
    barSpace: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    bar: { width: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
    barLabel: { fontSize: 10, color: '#666', marginTop: 8, width: 40, textAlign: 'center' }
});
