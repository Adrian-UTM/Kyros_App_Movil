import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, HelperText, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../lib/AppContext';
import { safeAction } from '../lib/safeAction';

interface SucursalData {
    id?: number;
    nombre?: string;
    direccion?: string | null;
    telefono?: string | null;
    cuenta_email?: string | null;
    cuenta_password?: string | null;
    hora_apertura?: string | null;
    hora_cierre?: string | null;
    descanso_inicio?: string | null;
    descanso_fin?: string | null;
    dias_abiertos?: number[] | null;
}

interface Props {
    visible: boolean;
    sucursal?: SucursalData | null;
    onDismiss: () => void;
    onSaved: () => void;
}

export default function SucursalFormModal({ visible, sucursal, onDismiss, onSaved }: Props) {
    const { negocioId } = useApp();
    const isEdit = !!sucursal?.id;

    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Schedule state
    const [horaApertura, setHoraApertura] = useState('09:00');
    const [horaCierre, setHoraCierre] = useState('20:00');
    const [descansoInicio, setDescansoInicio] = useState('');
    const [descansoFin, setDescansoFin] = useState('');
    const [diasAbiertos, setDiasAbiertos] = useState<number[]>([1,2,3,4,5,6]); // 1=Mon...7=Sun
    
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState({ nombre: false, direccion: false, telefono: false, email: false, password: false, horario: false });

    useEffect(() => {
        if (visible) {
            setNombre(sucursal?.nombre || '');
            setDireccion(sucursal?.direccion || '');
            setTelefono(sucursal?.telefono || '');
            setEmail(sucursal?.cuenta_email || '');
            setPassword(sucursal?.cuenta_password || '');
            setHoraApertura(sucursal?.hora_apertura || '09:00');
            setHoraCierre(sucursal?.hora_cierre || '20:00');
            setDescansoInicio(sucursal?.descanso_inicio || '');
            setDescansoFin(sucursal?.descanso_fin || '');
            setDiasAbiertos(sucursal?.dias_abiertos || [1,2,3,4,5,6]);
            setTouched({ nombre: false, direccion: false, telefono: false, email: false, password: false, horario: false });
            setShowPassword(false);
        }
    }, [visible]);

    const handlePhoneChange = (text: string) => {
        setTelefono(text.replace(/\D/g, ''));
    };

    const isEmailValid = email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPasswordValid = isEdit ? true : password.length >= 6;

    const isFormValid =
        nombre.trim().length > 0 &&
        direccion.trim().length > 0 &&
        telefono.length >= 10 && telefono.length <= 15 &&
        isEmailValid &&
        isPasswordValid;

    const handleSave = async () => {
        setTouched({ nombre: true, direccion: true, telefono: true, email: true, password: true, horario: true });
        if (!isFormValid) { Alert.alert('Error', 'Completa los campos correctamente.'); return; }
        
        // Basic schedule validation
        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(horaApertura) || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(horaCierre)) {
            Alert.alert('Error', 'Formato de hora de apertura/cierre inválido (HH:MM).'); return;
        }
        if (diasAbiertos.length === 0) {
            Alert.alert('Error', 'Selecciona al menos un día de apertura.'); return;
        }

        if (!negocioId) { Alert.alert('Error', 'No hay negocio_id.'); return; }

        setSaving(true);
        try {
            await safeAction('SucursalForm', async () => {
                const branchData: any = {
                    nombre: nombre.trim(),
                    direccion: direccion.trim(),
                    telefono: telefono,
                    cuenta_email: email.trim(),
                    negocio_id: negocioId,
                    hora_apertura: horaApertura.padEnd(5, ':00'),
                    hora_cierre: horaCierre.padEnd(5, ':00'),
                    descanso_inicio: descansoInicio ? descansoInicio.padEnd(5, ':00') : null,
                    descanso_fin: descansoFin ? descansoFin.padEnd(5, ':00') : null,
                    dias_abiertos: diasAbiertos,
                };

                if (password.trim().length > 0) {
                    branchData.cuenta_password = password;
                }

                let result;

                if (isEdit && sucursal?.id) {
                    result = await supabase.from('sucursales').update(branchData).eq('id', sucursal.id).eq('negocio_id', negocioId).select().single();
                    if (result.error) throw result.error;
                } else {
                    result = await supabase.from('sucursales').insert(branchData).select().single();
                    if (result.error) throw result.error;
                }

                const savedBranch = result.data;

                if (password.trim().length > 0) {
                    const { error: fnError } = await supabase.functions.invoke('create-branch-user', {
                        body: { email: email.trim(), password: password, sucursalId: savedBranch.id, negocioId: negocioId }
                    });
                    if (fnError) {
                        console.error('Error creating auth user:', fnError);
                        Alert.alert('Aviso', 'Sucursal guardada, pero hubo un error con la cuenta de usuario (Auth).');
                    }
                }

                Alert.alert('Éxito', 'Sucursal guardada');
                onSaved();
                onDismiss();
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerIcon}>
                                <MaterialIcons name={isEdit ? "edit" : "store"} size={28} color="#38bdf8" />
                            </View>
                            <Text style={styles.title}>{isEdit ? 'Editar Sucursal' : 'Nueva Sucursal'}</Text>
                            <Text style={styles.subtitle}>{isEdit ? 'Actualiza los datos' : 'Configura tu nueva sucursal'}</Text>
                        </View>

                        {/* Basic Info */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="store" size={18} color="#38bdf8" />
                                <Text style={styles.sectionTitle}>Datos de la Sucursal</Text>
                            </View>

                            <TextInput
                                mode="outlined" label="Nombre *" value={nombre} onChangeText={setNombre}
                                onBlur={() => setTouched(t => ({ ...t, nombre: true }))}
                                error={touched.nombre && !nombre.trim()}
                                style={styles.input} textColor="#e2e8f0" outlineColor="#334155" activeOutlineColor="#38bdf8"
                                theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                            />
                            {touched.nombre && !nombre.trim() && <HelperText type="error" visible>El nombre es requerido</HelperText>}

                            <TextInput
                                mode="outlined" label="Dirección *" value={direccion} onChangeText={setDireccion}
                                onBlur={() => setTouched(t => ({ ...t, direccion: true }))}
                                style={styles.input} textColor="#e2e8f0" outlineColor="#334155" activeOutlineColor="#38bdf8"
                                theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                            />
                            {touched.direccion && !direccion.trim() && <HelperText type="error" visible>La dirección es requerida</HelperText>}

                            <TextInput
                                mode="outlined" label="Teléfono *" value={telefono} onChangeText={handlePhoneChange}
                                onBlur={() => setTouched(t => ({ ...t, telefono: true }))}
                                keyboardType="phone-pad" maxLength={15}
                                style={styles.input} textColor="#e2e8f0" outlineColor="#334155" activeOutlineColor="#38bdf8"
                                theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                            />
                            {touched.telefono && (telefono.length < 10 || telefono.length > 15) && (
                                <HelperText type="error" visible>
                                    {telefono.length === 0 ? 'El teléfono es requerido' : `Mínimo 10 dígitos (${telefono.length}/10)`}
                                </HelperText>
                            )}
                        </View>

                        {/* Horarios */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="schedule" size={18} color="#38bdf8" />
                                <Text style={styles.sectionTitle}>Horarios de Operación</Text>
                            </View>
                            
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <TextInput
                                        mode="outlined" label="Apertura (HH:MM)" value={horaApertura} onChangeText={setHoraApertura}
                                        style={styles.input} textColor="#e2e8f0" outlineColor="#334155" activeOutlineColor="#38bdf8"
                                        theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                                        placeholder="09:00"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <TextInput
                                        mode="outlined" label="Cierre (HH:MM)" value={horaCierre} onChangeText={setHoraCierre}
                                        style={styles.input} textColor="#e2e8f0" outlineColor="#334155" activeOutlineColor="#38bdf8"
                                        theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                                        placeholder="20:00"
                                    />
                                </View>
                            </View>

                            <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8, marginTop: 4 }}>Horario de Descanso (Opcional)</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <TextInput
                                        mode="outlined" label="Inicio (HH:MM)" value={descansoInicio} onChangeText={setDescansoInicio}
                                        style={styles.input} textColor="#e2e8f0" outlineColor="#334155" activeOutlineColor="#38bdf8"
                                        theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                                        placeholder="14:00"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <TextInput
                                        mode="outlined" label="Fin (HH:MM)" value={descansoFin} onChangeText={setDescansoFin}
                                        style={styles.input} textColor="#e2e8f0" outlineColor="#334155" activeOutlineColor="#38bdf8"
                                        theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                                        placeholder="15:00"
                                    />
                                </View>
                            </View>
                            
                            <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Días Abiertos</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => {
                                    const dayVal = i + 1; // 1-7 (Lun-Dom)
                                    const isSelected = diasAbiertos.includes(dayVal);
                                    return (
                                        <TouchableOpacity
                                            key={d}
                                            style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                                            onPress={() => {
                                                setDiasAbiertos(prev => 
                                                    prev.includes(dayVal) ? prev.filter(x => x !== dayVal) : [...prev, dayVal].sort()
                                                );
                                            }}
                                        >
                                            <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>{d}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {touched.horario && diasAbiertos.length === 0 && <HelperText type="error" visible>Selecciona al menos un día</HelperText>}
                        </View>

                        {/* Account */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="lock" size={18} color="#38bdf8" />
                                <Text style={styles.sectionTitle}>Cuenta de Acceso</Text>
                            </View>

                            <TextInput
                                mode="outlined" label="Correo de la Sucursal *" value={email} onChangeText={setEmail}
                                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                                keyboardType="email-address" autoCapitalize="none"
                                style={styles.input} textColor="#e2e8f0" outlineColor="#334155" activeOutlineColor="#38bdf8"
                                theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                            />
                            {touched.email && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && (
                                <HelperText type="error" visible>Ingresa un correo válido</HelperText>
                            )}

                            <TextInput
                                mode="outlined" label="Contraseña *" value={password} onChangeText={setPassword}
                                onBlur={() => setTouched(t => ({ ...t, password: true }))}
                                secureTextEntry={!showPassword}
                                right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
                                style={styles.input} textColor="#e2e8f0" outlineColor="#334155" activeOutlineColor="#38bdf8"
                                theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                            />
                            {touched.password && !isEdit && password.length < 6 && (
                                <HelperText type="error" visible>La contraseña debe tener al menos 6 caracteres</HelperText>
                            )}
                        </View>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={onDismiss} style={styles.cancelBtn}>
                                <Text style={{ color: '#94a3b8', fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={!isFormValid || saving}
                                style={[styles.saveBtn, (!isFormValid || saving) && { opacity: 0.5 }]}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{isEdit ? 'Actualizar' : 'Guardar'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: '#334155',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f1f5f9',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    section: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    sectionTitle: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        marginBottom: 6,
        backgroundColor: '#0f172a',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    saveBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#2563eb',
    },
    dayChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
    },
    dayChipSelected: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderColor: '#38bdf8',
    },
    dayChipText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600',
    },
    dayChipTextSelected: {
        color: '#38bdf8',
    },
});
