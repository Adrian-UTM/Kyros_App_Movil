import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Dimensions, Modal as RNModal, TouchableWithoutFeedback } from 'react-native';
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
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';

export default function PerfilScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { rol, negocioId, sucursalId, themeMode, toggleTheme } = useApp();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<{ name: string; email: string; avatar_url?: string } | null>(null);

    // Branch specific state
    const [nombreSucursal, setNombreSucursal] = useState('');
    const [telefonoSucursal, setTelefonoSucursal] = useState('');
    const [negocioNombre, setNegocioNombre] = useState('');
    const [savingBranch, setSavingBranch] = useState(false);

    const [weekdaysActive, setWeekdaysActive] = useState<number[]>([]);
    const [weekendActive, setWeekendActive] = useState<number[]>([]);
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [schedule, setSchedule] = useState({
        weekday_open: '09:00',
        weekday_close: '20:00',
        weekday_break_start: '',
        weekday_break_end: '',
        weekend_open: '10:00',
        weekend_close: '18:00',
        weekend_break_start: '',
        weekend_break_end: ''
    });
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [timePickerVisible, setTimePickerVisible] = useState(false);
    const [timePickerField, setTimePickerField] = useState<keyof typeof schedule | null>(null);

    const weekdays = [1, 2, 3, 4, 5];
    const weekendDays = [6, 0];
    const dayLabels = [
        { val: 1, lab: 'Lunes' }, { val: 2, lab: 'Martes' }, { val: 3, lab: 'Miércoles' },
        { val: 4, lab: 'Jueves' }, { val: 5, lab: 'Viernes' }
    ];
    const wkndLabels = [{ val: 6, lab: 'Sábado' }, { val: 0, lab: 'Domingo' }];

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user: supaUser } } = await supabase.auth.getUser();
            if (supaUser) {
                setUser({
                    name: supaUser.user_metadata?.name || 'Usuario',
                    email: supaUser.email || '',
                    avatar_url: supaUser.user_metadata?.avatar_url,
                });
            } else {
                // Fallback to local session
                const userData = await Session.getUser();
                if (userData) {
                    setUser({
                        name: userData.name || 'Usuario',
                        email: userData.email,
                    });
                }
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (rol === 'sucursal' && sucursalId) {
            loadBranchData();
        }
    }, [rol, sucursalId]);

    const calculateEndTime = (start: string, duration: number) => {
        if (!start) return '';
        const [h, m] = start.split(':').map(Number);
        const totalMins = h * 60 + m + duration;
        const endH = Math.floor(totalMins / 60) % 24;
        const endM = totalMins % 60;
        return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    };

    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return 0;
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 24 * 60;
        return diff;
    };

    const loadBranchData = async () => {
        try {
            // Load Sucursal Data
            const { data: suc } = await supabase
                .from('sucursales')
                .select('nombre, telefono, negocios(nombre)')
                .eq('id', sucursalId)
                .single();

            if (suc) {
                setNombreSucursal(suc.nombre || '');
                setTelefonoSucursal(suc.telefono || '');
                setNegocioNombre((suc.negocios as any)?.nombre || '');
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
                    weekday_break_end: weekdayRef?.hora_descanso_inicio ? calculateEndTime(weekdayRef.hora_descanso_inicio.substring(0, 5), weekdayRef.duracion_descanso_minutos || 0) : '',
                    weekend_open: weekendRef?.hora_inicio?.substring(0, 5) || '10:00',
                    weekend_close: weekendRef?.hora_fin?.substring(0, 5) || '18:00',
                    weekend_break_start: weekendRef?.hora_descanso_inicio?.substring(0, 5) || '',
                    weekend_break_end: weekendRef?.hora_descanso_inicio ? calculateEndTime(weekendRef.hora_descanso_inicio.substring(0, 5), weekendRef.duracion_descanso_minutos || 0) : '',
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

    const handleSaveBranch = async () => {
        if (!sucursalId) return;
        setSavingBranch(true);
        try {
            await safeAction('SaveBranch', async () => {
                const { error } = await supabase
                    .from('sucursales')
                    .update({ nombre: nombreSucursal, telefono: telefonoSucursal })
                    .eq('id', sucursalId);

                if (error) throw error;
                Alert.alert('Éxito', 'Datos de la sucursal actualizados');
            });
        } finally {
            setSavingBranch(false);
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

                const wdBreakDur = calculateDuration(schedule.weekday_break_start, schedule.weekday_break_end);
                const weBreakDur = calculateDuration(schedule.weekend_break_start, schedule.weekend_break_end);

                // Add weekdays
                weekdaysActive.forEach(day => {
                    schedules.push({
                        sucursal_id: sucursalId,
                        dia_semana: day,
                        hora_inicio: schedule.weekday_open + ':00',
                        hora_fin: schedule.weekday_close + ':00',
                        hora_descanso_inicio: schedule.weekday_break_start ? schedule.weekday_break_start + ':00' : null,
                        duracion_descanso_minutos: wdBreakDur
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
                        duracion_descanso_minutos: weBreakDur
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

    const pickImage = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                uploadAvatar(result.assets[0]);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'No se pudo abrir la galería');
        }
    };

    const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
        try {
            setLoading(true);
            const { data: { user: supaUser } } = await supabase.auth.getUser();
            const userId = supaUser?.id;
            if (!userId) throw new Error("Usuario no autenticado");

            const ext = asset.uri.split('.').pop() || 'jpg';
            const fileName = `${userId}-${Date.now()}.${ext}`;

            const response = await fetch(asset.uri);
            const blob = await response.blob();

            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, blob, {
                    contentType: `image/${ext}`,
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });
            if (updateError) throw updateError;

            setUser(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
            Alert.alert("Éxito", "Foto de perfil actualizada");

        } catch (error: any) {
            console.log('Error uploading avatar:', error);
            Alert.alert("Error", error.message || "Error al subir foto (verifica que el bucket 'avatars' exista y sea público)");
        } finally {
            setLoading(false);
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

    const displayTimeFrom24 = (h24: string) => {
        if (!h24) return '--:--';
        const [h, m] = h24.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
    };

    const openTimePicker = (field: keyof typeof schedule) => {
        setTimePickerField(field);
        setTimePickerVisible(true);
    };

    return (
        <>
            <KyrosScreen title={rol === 'sucursal' ? 'Mi Sucursal' : 'Perfil'}>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

                {/* SUCRUSAL ONLY: HEADER WITH QR */}
                {rol === 'sucursal' ? (
                    <View style={styles.branchHeaderContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 32, marginBottom: 8 }}>
                            <View style={styles.avatarSection}>
                                <TouchableOpacity onPress={pickImage} disabled={loading} style={styles.avatarWrapper}>
                                    {user?.avatar_url ? (
                                        <Avatar.Image size={90} source={{ uri: user.avatar_url }} style={{ backgroundColor: theme.colors.surfaceVariant }} />
                                    ) : (
                                        <Avatar.Text size={90} label={user ? getInitials(user.name) : 'US'} style={{ backgroundColor: theme.colors.primary }} color={theme.colors.onPrimary} />
                                    )}
                                    <View style={styles.editBadge}>
                                        <MaterialIcons name="edit" size={14} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.qrSection}>
                                <TouchableOpacity onPress={() => setQrModalVisible(true)} style={[styles.qrBox, { borderColor: theme.colors.outline }]}>
                                    <QRCode value={`https://kyrosapp.com/agendar/${sucursalId}`} size={70} />
                                </TouchableOpacity>
                                <Text style={{ fontSize: 10, color: '#888', marginTop: 6 }}>Escanea para agendar</Text>
                            </View>
                        </View>

                        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginVertical: 20, textAlign: 'center' }}>
                            Mi Sucursal
                        </Text>

                        <KyrosCard>
                            <TextInput
                                label="Nombre de la Sucursal*"
                                value={nombreSucursal}
                                onChangeText={setNombreSucursal}
                                mode="outlined"
                                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                                outlineColor={theme.colors.outline}
                                activeOutlineColor={theme.colors.primary}
                                textColor={theme.colors.onSurface}
                            />
                            <TextInput
                                label="Negocio"
                                value={negocioNombre}
                                editable={false}
                                mode="outlined"
                                style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                                outlineColor={theme.colors.outline}
                                textColor={theme.colors.onSurfaceVariant}
                            />
                            <TextInput
                                label="Teléfono de la Sucursal"
                                value={telefonoSucursal}
                                onChangeText={setTelefonoSucursal}
                                mode="outlined"
                                keyboardType="phone-pad"
                                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                                outlineColor={theme.colors.outline}
                                activeOutlineColor={theme.colors.primary}
                                textColor={theme.colors.onSurface}
                                right={<TextInput.Icon icon="phone" color={theme.colors.onSurfaceVariant} />}
                            />
                            <KyrosButton mode="outlined" onPress={handleSaveBranch} loading={savingBranch} disabled={savingBranch} style={{ marginTop: 12, alignSelf: 'flex-end', borderColor: theme.colors.outline }}>
                                Guardar Cambios
                            </KyrosButton>
                        </KyrosCard>
                    </View>
                ) : (
                    // Regular User Header
                    <>
                        <View style={styles.headerContainer}>
                            <TouchableOpacity onPress={pickImage} disabled={loading}>
                                {user?.avatar_url ? (
                                    <Avatar.Image
                                        size={80}
                                        source={{ uri: user.avatar_url }}
                                        style={{ backgroundColor: theme.colors.surfaceVariant }}
                                    />
                                ) : (
                                    <Avatar.Text
                                        size={80}
                                        label={user ? getInitials(user.name) : 'US'}
                                        style={{ backgroundColor: theme.colors.primary }}
                                        color={theme.colors.onPrimary}
                                    />
                                )}
                            </TouchableOpacity>
                            <View style={styles.headerTextContainer}>
                                <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                                    {user?.name || 'Cargando...'}
                                </Text>
                                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {user?.email || ''}
                                </Text>
                                <TouchableOpacity onPress={pickImage} disabled={loading} style={{ marginTop: 4 }}>
                                    <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: 'bold' }}>
                                        {loading ? 'Subiendo...' : 'Cambiar foto'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <KyrosCard title="Mi cuenta">
                            <List.Item
                                title={user?.name || 'Cargando...'}
                                description={rol === 'dueño' ? 'Propietario' : 'Usuario'}
                                left={props => <List.Icon {...props} icon="account" />}
                            />
                            <Divider />
                            <List.Item
                                title={user?.email || 'Cargando...'}
                                description="Correo electrónico"
                                left={props => <List.Icon {...props} icon="email" />}
                            />
                        </KyrosCard>
                    </>
                )}

                {/* SUCRUSAL ONLY: SCHEDULE CONFIGURATION */}
                {rol === 'sucursal' && (
                    <KyrosCard title="Horarios de la Sucursal">
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Días Laborables (Lunes - Viernes)</Text>
                        <View style={styles.webDaysRow}>
                            {dayLabels.map(d => (
                                <TouchableOpacity
                                    key={d.val}
                                    style={styles.webCheckbox}
                                    onPress={() => toggleDay(d.val, false)}
                                >
                                    <MaterialIcons
                                        name={weekdaysActive.includes(d.val) ? "check-box" : "check-box-outline-blank"}
                                        size={22}
                                        color={weekdaysActive.includes(d.val) ? theme.colors.primary : theme.colors.onSurfaceVariant}
                                    />
                                    <Text style={{ color: theme.colors.onSurface, marginLeft: 6, fontSize: 14 }}>{d.lab}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Text style={styles.fieldLabel}>Apertura</Text>
                                <TouchableOpacity onPress={() => openTimePicker('weekday_open')} style={[styles.timeInputContainer, { backgroundColor: theme.colors.surface }]} activeOpacity={0.7}>
                                    <MaterialIcons name="access-time" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, !schedule.weekday_open && { color: '#64748b' }]}>
                                        {schedule.weekday_open ? displayTimeFrom24(schedule.weekday_open) : '09:00 AM'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.halfInput}>
                                <Text style={styles.fieldLabel}>Cierre</Text>
                                <TouchableOpacity onPress={() => openTimePicker('weekday_close')} style={[styles.timeInputContainer, { backgroundColor: theme.colors.surface }]} activeOpacity={0.7}>
                                    <MaterialIcons name="access-time" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, !schedule.weekday_close && { color: '#64748b' }]}>
                                        {schedule.weekday_close ? displayTimeFrom24(schedule.weekday_close) : '08:00 PM'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Text style={styles.fieldLabel}>Inicio Descanso</Text>
                                <TouchableOpacity onPress={() => openTimePicker('weekday_break_start')} style={[styles.timeInputContainer, { backgroundColor: theme.colors.surface }]} activeOpacity={0.7}>
                                    <MaterialIcons name="access-time" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, !schedule.weekday_break_start && { color: '#64748b' }]}>
                                        {schedule.weekday_break_start ? displayTimeFrom24(schedule.weekday_break_start) : 'Ninguno'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.halfInput}>
                                <Text style={styles.fieldLabel}>Fin Descanso</Text>
                                <TouchableOpacity onPress={() => openTimePicker('weekday_break_end')} style={[styles.timeInputContainer, { backgroundColor: theme.colors.surface }]} activeOpacity={0.7}>
                                    <MaterialIcons name="access-time" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, !schedule.weekday_break_end && { color: '#64748b' }]}>
                                        {schedule.weekday_break_end ? displayTimeFrom24(schedule.weekday_break_end) : 'Ninguno'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Divider style={{ marginVertical: 16 }} />

                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Fin de Semana</Text>
                        <View style={styles.webDaysRow}>
                            {wkndLabels.map(d => (
                                <TouchableOpacity
                                    key={d.val}
                                    style={styles.webCheckbox}
                                    onPress={() => toggleDay(d.val, true)}
                                >
                                    <MaterialIcons
                                        name={weekendActive.includes(d.val) ? "check-box" : "check-box-outline-blank"}
                                        size={22}
                                        color={weekendActive.includes(d.val) ? theme.colors.primary : theme.colors.onSurfaceVariant}
                                    />
                                    <Text style={{ color: theme.colors.onSurface, marginLeft: 6, fontSize: 14 }}>{d.lab}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Text style={styles.fieldLabel}>Apertura</Text>
                                <TouchableOpacity onPress={() => openTimePicker('weekend_open')} style={[styles.timeInputContainer, { backgroundColor: theme.colors.surface }]} activeOpacity={0.7}>
                                    <MaterialIcons name="access-time" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, !schedule.weekend_open && { color: '#64748b' }]}>
                                        {schedule.weekend_open ? displayTimeFrom24(schedule.weekend_open) : '10:00 AM'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.halfInput}>
                                <Text style={styles.fieldLabel}>Cierre</Text>
                                <TouchableOpacity onPress={() => openTimePicker('weekend_close')} style={[styles.timeInputContainer, { backgroundColor: theme.colors.surface }]} activeOpacity={0.7}>
                                    <MaterialIcons name="access-time" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, !schedule.weekend_close && { color: '#64748b' }]}>
                                        {schedule.weekend_close ? displayTimeFrom24(schedule.weekend_close) : '06:00 PM'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Text style={styles.fieldLabel}>Inicio Descanso</Text>
                                <TouchableOpacity onPress={() => openTimePicker('weekend_break_start')} style={[styles.timeInputContainer, { backgroundColor: theme.colors.surface }]} activeOpacity={0.7}>
                                    <MaterialIcons name="access-time" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, !schedule.weekend_break_start && { color: '#64748b' }]}>
                                        {schedule.weekend_break_start ? displayTimeFrom24(schedule.weekend_break_start) : 'Ninguno'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.halfInput}>
                                <Text style={styles.fieldLabel}>Fin Descanso</Text>
                                <TouchableOpacity onPress={() => openTimePicker('weekend_break_end')} style={[styles.timeInputContainer, { backgroundColor: theme.colors.surface }]} activeOpacity={0.7}>
                                    <MaterialIcons name="access-time" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                                    <Text style={[styles.timeInputText, !schedule.weekend_break_end && { color: '#64748b' }]}>
                                        {schedule.weekend_break_end ? displayTimeFrom24(schedule.weekend_break_end) : 'Ninguno'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
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
                        title={themeMode === 'dark' ? "Modo Oscuro Activado" : "Modo Claro Activado"}
                        left={props => <List.Icon {...props} icon="theme-light-dark" />}
                        right={props => <Switch value={themeMode === 'dark'} onValueChange={toggleTheme} color={theme.colors.primary} />}
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

            <RNModal
                visible={qrModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setQrModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setQrModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.qrModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, borderWidth: 1 }]}>
                                <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: theme.colors.onSurface }}>
                                    Escanea para Agendar
                                </Text>
                                <View style={{ alignItems: 'center', padding: 24, backgroundColor: '#fff', borderRadius: 16, alignSelf: 'center' }}>
                                    <QRCode value={`https://kyrosapp.com/agendar/${sucursalId}`} size={Dimensions.get('window').width * 0.65} />
                                </View>
                                <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 20, fontSize: 14 }}>
                                    Comparte este código con tus clientes para que agenden directamente contigo.
                                </Text>
                                <KyrosButton mode="contained" onPress={() => setQrModalVisible(false)} style={{ marginTop: 24 }}>
                                    Cerrar
                                </KyrosButton>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </RNModal>

        </KyrosScreen>

            <TimePickerModal
                visible={timePickerVisible}
                value={timePickerField ? schedule[timePickerField] : ''}
                onSelect={(time) => {
                    if (timePickerField) setSchedule(p => ({ ...p, [timePickerField]: time }));
                }}
                onClose={() => { setTimePickerVisible(false); setTimePickerField(null); }}
            />
        </>
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
            <TouchableOpacity style={timeStyles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={timeStyles.container}>
                    <Text style={timeStyles.title}>Seleccionar Hora</Text>
                    <View style={timeStyles.preview}>
                        <Text style={timeStyles.previewText}>{displayHour}:{displayMinute} {displayPeriod}</Text>
                    </View>
                    <View style={timeStyles.wheelsRow}>
                        <View style={[timeStyles.column, { width: 90 }]}>
                            <Text style={timeStyles.columnLabel}>Hora</Text>
                            <ScrollView style={timeStyles.scrollColumn} showsVerticalScrollIndicator={false}>
                                {hours12.map(h => (
                                    <TouchableOpacity key={h} onPress={() => setSelectedHour12(h)}
                                        style={[timeStyles.wheelItem, selectedHour12 === h && timeStyles.wheelItemSelected]}>
                                        <Text style={[timeStyles.wheelText, selectedHour12 === h && timeStyles.wheelTextSelected]}>{h.toString().padStart(2, '0')}</Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>
                        <Text style={timeStyles.separator}>:</Text>
                        <View style={[timeStyles.column, { width: 90 }]}>
                            <Text style={timeStyles.columnLabel}>Min</Text>
                            <ScrollView style={timeStyles.scrollColumn} showsVerticalScrollIndicator={false}>
                                {minutes.map(m => (
                                    <TouchableOpacity key={m} onPress={() => setSelectedMinute(m)}
                                        style={[timeStyles.wheelItem, selectedMinute === m && timeStyles.wheelItemSelected]}>
                                        <Text style={[timeStyles.wheelText, selectedMinute === m && timeStyles.wheelTextSelected]}>{m.toString().padStart(2, '0')}</Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 80 }} />
                            </ScrollView>
                        </View>
                        <View style={[timeStyles.column, { width: 80, marginLeft: 10, justifyContent: 'center' }]}>
                            <TouchableOpacity onPress={() => setIsPM(false)} style={[timeStyles.ampmBtn, !isPM && timeStyles.ampmBtnSelected]}>
                                <Text style={[timeStyles.ampmText, !isPM && timeStyles.ampmTextSelected]}>AM</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsPM(true)} style={[timeStyles.ampmBtn, isPM && timeStyles.ampmBtnSelected]}>
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
                                let finalHour24 = selectedHour12;
                                if (isPM && finalHour24 !== 12) finalHour24 += 12;
                                if (!isPM && finalHour24 === 12) finalHour24 = 0;
                                onSelect(`${finalHour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`);
                                onClose();
                            }}
                            style={timeStyles.confirmBtn}>
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    contentContainer: { paddingBottom: 20 },
    headerContainer: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
    headerTextContainer: { alignItems: 'center', marginTop: 12 },

    // New Branch Header styles
    branchHeaderContainer: { paddingTop: 24, paddingBottom: 16 },
    avatarSection: { alignItems: 'center' },
    avatarWrapper: { position: 'relative' },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1E293B', borderRadius: 16, padding: 4, borderWidth: 2, borderColor: '#0F172A' },
    qrSection: { alignItems: 'center' },
    qrBox: { padding: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1 },

    // QR Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    qrModal: { width: '100%', maxWidth: 400, padding: 30, borderRadius: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },

    input: { marginBottom: 16 },

    buttonContainer: { marginTop: 20, marginBottom: 30 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, marginTop: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    halfInput: { width: '48%' },
    fieldLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: '600', textTransform: 'uppercase' },
    timeInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 16, height: 50 },
    timeInputText: { color: '#e2e8f0', fontSize: 16 },

    // Web style checkbox row
    webDaysRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 16 },
    webCheckbox: { flexDirection: 'row', alignItems: 'center' }
});
