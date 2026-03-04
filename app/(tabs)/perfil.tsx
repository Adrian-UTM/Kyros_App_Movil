import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Avatar, List, useTheme, Divider, Switch, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Session } from '../../lib/session';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import KyrosButton from '../../components/KyrosButton';
import { useApp } from '../../lib/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { safeAction } from '../../lib/safeAction';
import { MaterialIcons } from '@expo/vector-icons';

export default function PerfilScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { rol, negocioId, sucursalId } = useApp();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);

    // Branch specific state
    const [sucursalData, setSucursalData] = useState<{ nombre: string; telefono: string | null } | null>(null);
    const [weekdaysActive, setWeekdaysActive] = useState<number[]>([]);
    const [weekendActive, setWeekendActive] = useState<number[]>([]);
    const [schedule, setSchedule] = useState({
        weekday_open: '09:00',
        weekday_close: '20:00',
        weekday_break_start: '14:00',
        weekday_break_duration: '60',
        weekend_open: '10:00',
        weekend_close: '18:00',
        weekend_break_start: '',
        weekend_break_duration: '0'
    });
    const [savingSchedule, setSavingSchedule] = useState(false);

    const weekdays = [1, 2, 3, 4, 5];
    const weekendDays = [6, 0];
    const dayLabels = [
        { val: 1, lab: 'L' }, { val: 2, lab: 'M' }, { val: 3, lab: 'M' },
        { val: 4, lab: 'J' }, { val: 5, lab: 'V' }
    ];
    const wkndLabels = [{ val: 6, lab: 'S' }, { val: 0, lab: 'D' }];

    useEffect(() => {
        const fetchUser = async () => {
            const userData = await Session.getUser();
            if (userData) {
                setUser({
                    name: userData.name || 'Usuario',
                    email: userData.email,
                });
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (rol === 'sucursal' && sucursalId) {
            loadBranchData();
        }
    }, [rol, sucursalId]);

    const loadBranchData = async () => {
        try {
            // Load Sucursal Data
            const { data: suc } = await supabase
                .from('sucursales')
                .select('nombre, telefono')
                .eq('id', sucursalId)
                .single();

            if (suc) {
                setSucursalData(suc);
            }

            // Load Schedule
            const { data: horarios } = await supabase
                .from('horarios_sucursal')
                .select('*')
                .eq('sucursal_id', sucursalId);

            if (horarios && horarios.length > 0) {
                const wDays: number[] = [];
                const wEnd: number[] = [];
                let weekdayRef = horarios.find(h => weekdays.includes(h.dia_semana));
                let weekendRef = horarios.find(h => weekendDays.includes(h.dia_semana));

                horarios.forEach(h => {
                    if (weekdays.includes(h.dia_semana)) wDays.push(h.dia_semana);
                    else wEnd.push(h.dia_semana);
                });

                setWeekdaysActive(wDays);
                setWeekendActive(wEnd);

                setSchedule({
                    weekday_open: weekdayRef?.hora_inicio?.substring(0, 5) || '09:00',
                    weekday_close: weekdayRef?.hora_fin?.substring(0, 5) || '20:00',
                    weekday_break_start: weekdayRef?.hora_descanso_inicio?.substring(0, 5) || '',
                    weekday_break_duration: weekdayRef?.duracion_descanso_minutos?.toString() || '0',
                    weekend_open: weekendRef?.hora_inicio?.substring(0, 5) || '10:00',
                    weekend_close: weekendRef?.hora_fin?.substring(0, 5) || '18:00',
                    weekend_break_start: weekendRef?.hora_descanso_inicio?.substring(0, 5) || '',
                    weekend_break_duration: weekendRef?.duracion_descanso_minutos?.toString() || '0',
                });
            }
        } catch (err) {
            console.error('Error loading branch data:', err);
        }
    };

    const toggleDay = (day: number, isWeekend: boolean) => {
        if (isWeekend) {
            setWeekendActive(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
        } else {
            setWeekdaysActive(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
        }
    };

    const handleSaveSchedule = async () => {
        if (!sucursalId) return;

        setSavingSchedule(true);
        try {
            await safeAction('SaveSchedule', async () => {
                // Delete existing schedule
                await supabase
                    .from('horarios_sucursal')
                    .delete()
                    .eq('sucursal_id', sucursalId);

                const schedules: any[] = [];

                // Validations for time format
                const timeRegex = /^([01]\d|2[0-3]):?([0-5]\d)$/;
                const validateTime = (val: string) => val ? timeRegex.test(val) : true;

                if (!validateTime(schedule.weekday_open) || !validateTime(schedule.weekday_close) ||
                    (!validateTime(schedule.weekday_break_start) && schedule.weekday_break_start.trim() !== '')) {
                    throw new Error("Formato de hora inválido. Usa HH:MM");
                }

                // Add weekdays
                weekdaysActive.forEach(day => {
                    schedules.push({
                        sucursal_id: sucursalId,
                        dia_semana: day,
                        hora_inicio: schedule.weekday_open + ':00',
                        hora_fin: schedule.weekday_close + ':00',
                        hora_descanso_inicio: schedule.weekday_break_start ? schedule.weekday_break_start + ':00' : null,
                        duracion_descanso_minutos: parseInt(schedule.weekday_break_duration) || 0
                    });
                });

                // Add weekends
                weekendActive.forEach(day => {
                    schedules.push({
                        sucursal_id: sucursalId,
                        dia_semana: day,
                        hora_inicio: schedule.weekend_open + ':00',
                        hora_fin: schedule.weekend_close + ':00',
                        hora_descanso_inicio: schedule.weekend_break_start ? schedule.weekend_break_start + ':00' : null,
                        duracion_descanso_minutos: parseInt(schedule.weekend_break_duration) || 0
                    });
                });

                if (schedules.length > 0) {
                    const { error } = await supabase.from('horarios_sucursal').insert(schedules);
                    if (error) throw error;
                }

                Alert.alert('Éxito', 'Horarios guardados correctamente');
            });
        } finally {
            setSavingSchedule(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        await Session.logout();
        setLoading(false);
        router.replace('/');
    };

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <KyrosScreen title="Perfil">
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.headerContainer}>
                    <Avatar.Text
                        size={80}
                        label={user ? getInitials(user.name) : 'US'}
                        style={{ backgroundColor: theme.colors.primary }}
                        color={theme.colors.onPrimary}
                    />
                </View>

                <KyrosCard title="Mi cuenta">
                    <List.Item
                        title={sucursalData?.nombre || user?.name || 'Cargando...'}
                        description={rol === 'dueño' ? 'Propietario' : (rol === 'sucursal' ? 'Administrador Sucursal' : 'Usuario')}
                        left={props => <List.Icon {...props} icon="account" />}
                    />
                    <Divider />
                    <List.Item
                        title={user?.email || 'Cargando...'}
                        description="Correo electrónico"
                        left={props => <List.Icon {...props} icon="email" />}
                    />
                    {sucursalData?.telefono && (
                        <>
                            <Divider />
                            <List.Item
                                title={sucursalData.telefono}
                                description="Teléfono Sucursal"
                                left={props => <List.Icon {...props} icon="phone" />}
                            />
                        </>
                    )}
                </KyrosCard>

                {/* SUCRUSAL ONLY: SCHEDULE CONFIGURATION */}
                {rol === 'sucursal' && (
                    <KyrosCard title="Horarios de la Sucursal">
                        <Text style={styles.sectionTitle}>Días Laborables (Lunes - Viernes)</Text>
                        <View style={styles.daysRow}>
                            {dayLabels.map(d => (
                                <TouchableOpacity
                                    key={d.val}
                                    style={[styles.dayChip, weekdaysActive.includes(d.val) && { backgroundColor: theme.colors.primary }]}
                                    onPress={() => toggleDay(d.val, false)}
                                >
                                    <Text style={{ color: weekdaysActive.includes(d.val) ? '#fff' : '#000' }}>{d.lab}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.row}>
                            <TextInput
                                label="Apertura"
                                value={schedule.weekday_open}
                                onChangeText={t => setSchedule(p => ({ ...p, weekday_open: t }))}
                                style={styles.halfInput}
                                mode="outlined"
                                keyboardType="numeric"
                            />
                            <TextInput
                                label="Cierre"
                                value={schedule.weekday_close}
                                onChangeText={t => setSchedule(p => ({ ...p, weekday_close: t }))}
                                style={styles.halfInput}
                                mode="outlined"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.row}>
                            <TextInput
                                label="Inicio Descanso"
                                value={schedule.weekday_break_start}
                                onChangeText={t => setSchedule(p => ({ ...p, weekday_break_start: t }))}
                                style={styles.halfInput}
                                mode="outlined"
                                keyboardType="numeric"
                                placeholder="Ej: 14:00"
                            />
                            <TextInput
                                label="Duración"
                                value={schedule.weekday_break_duration}
                                onChangeText={t => setSchedule(p => ({ ...p, weekday_break_duration: t }))}
                                style={styles.halfInput}
                                mode="outlined"
                                keyboardType="numeric"
                            />
                        </View>

                        <Divider style={{ marginVertical: 16 }} />

                        <Text style={styles.sectionTitle}>Fin de Semana</Text>
                        <View style={styles.daysRow}>
                            {wkndLabels.map(d => (
                                <TouchableOpacity
                                    key={d.val}
                                    style={[styles.dayChip, weekendActive.includes(d.val) && { backgroundColor: theme.colors.primary }]}
                                    onPress={() => toggleDay(d.val, true)}
                                >
                                    <Text style={{ color: weekendActive.includes(d.val) ? '#fff' : '#000' }}>{d.lab}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.row}>
                            <TextInput
                                label="Apertura"
                                value={schedule.weekend_open}
                                onChangeText={t => setSchedule(p => ({ ...p, weekend_open: t }))}
                                style={styles.halfInput}
                                mode="outlined"
                                keyboardType="numeric"
                            />
                            <TextInput
                                label="Cierre"
                                value={schedule.weekend_close}
                                onChangeText={t => setSchedule(p => ({ ...p, weekend_close: t }))}
                                style={styles.halfInput}
                                mode="outlined"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.row}>
                            <TextInput
                                label="Inicio Descanso"
                                value={schedule.weekend_break_start}
                                onChangeText={t => setSchedule(p => ({ ...p, weekend_break_start: t }))}
                                style={styles.halfInput}
                                mode="outlined"
                                keyboardType="numeric"
                                placeholder="Ej: 14:00"
                            />
                            <TextInput
                                label="Duración"
                                value={schedule.weekend_break_duration}
                                onChangeText={t => setSchedule(p => ({ ...p, weekend_break_duration: t }))}
                                style={styles.halfInput}
                                mode="outlined"
                                keyboardType="numeric"
                            />
                        </View>

                        <KyrosButton
                            mode="contained"
                            style={{ marginTop: 16 }}
                            onPress={handleSaveSchedule}
                            loading={savingSchedule}
                            disabled={savingSchedule}
                        >
                            Guardar Horarios
                        </KyrosButton>
                    </KyrosCard>
                )}

                <KyrosCard title="Configuración">
                    <List.Item
                        title="Notificaciones"
                        left={props => <List.Icon {...props} icon="bell" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                    <Divider />
                    <List.Item
                        title="Tema"
                        left={props => <List.Icon {...props} icon="theme-light-dark" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                    <Divider />
                    <List.Item
                        title="Ayuda"
                        left={props => <List.Icon {...props} icon="help-circle" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                </KyrosCard>

                <View style={styles.buttonContainer}>
                    <KyrosButton
                        mode="outlined"
                        onPress={handleLogout}
                        loading={loading}
                        disabled={loading}
                    >
                        {loading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                    </KyrosButton>
                </View>
            </ScrollView>
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    contentContainer: { paddingBottom: 20 },
    headerContainer: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
    buttonContainer: { marginTop: 20, marginBottom: 30 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    halfInput: { width: '48%', backgroundColor: '#fff' },
    daysRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
    dayChip: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center', alignItems: 'center'
    }
});
