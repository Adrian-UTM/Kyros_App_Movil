import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, Alert, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../lib/AppContext';
import { safeAction } from '../lib/safeAction';

interface Servicio {
    id: number;
    nombre: string;
    precio_base: number | null;
    duracion_aprox_minutos: number | null;
    activo?: boolean;
    descripcion?: string;
    imagen_url?: string | null;
}

interface ServicioFormModalProps {
    visible: boolean;
    servicio: Servicio | null;
    onDismiss: () => void;
    onServicioGuardado: (servicio: Servicio) => void;
}

export default function ServicioFormModal({ visible, servicio, onDismiss, onServicioGuardado }: ServicioFormModalProps) {
    const theme = useTheme();
    const { negocioId, sucursalId } = useApp();

    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');
    const [duracion, setDuracion] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagenUrl, setImagenUrl] = useState<string | null>(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (servicio) {
            setNombre(servicio.nombre);
            setPrecio(servicio.precio_base?.toString() || '');
            setDuracion(servicio.duracion_aprox_minutos?.toString() || '');
            setDescripcion(servicio.descripcion || '');
            setImagenUrl(servicio.imagen_url || null);
        } else {
            setNombre('');
            setPrecio('');
            setDuracion('30');
            setDescripcion('');
            setImagenUrl(null);
        }
    }, [servicio, visible]);

    const precioNum = parseFloat(precio);
    const duracionNum = parseInt(duracion);

    const isFormValid =
        nombre.trim().length > 0 &&
        !isNaN(precioNum) && precioNum >= 0 &&
        !isNaN(duracionNum) && duracionNum >= 1;

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permisos', 'Se necesita acceso a la galería para subir imágenes.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                await uploadImage(result.assets[0].uri);
            }
        } catch (err) {
            console.error('Error picking image:', err);
            Alert.alert('Error', 'No se pudo seleccionar la imagen');
        }
    };

    const uploadImage = async (uri: string) => {
        setImageUploading(true);
        try {
            const ext = uri.substring(uri.lastIndexOf('.') + 1) || 'jpg';
            const fileName = `${negocioId}/${Date.now()}.${ext}`;

            const response = await fetch(uri);
            const blob = await response.blob();

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('servicios')
                .upload(fileName, blob, { upsert: true });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                // If bucket doesn't exist, just store the local URI as fallback
                Alert.alert('Aviso', 'No se pudo subir la imagen al servidor. Verifica que el bucket "servicios" exista en Supabase Storage.');
                return;
            }

            if (uploadData) {
                const { data: publicUrlData } = supabase.storage
                    .from('servicios')
                    .getPublicUrl(uploadData.path);
                setImagenUrl(publicUrlData.publicUrl);
            }
        } catch (err) {
            console.error('Error uploading image:', err);
            Alert.alert('Error', 'No se pudo subir la imagen');
        } finally {
            setImageUploading(false);
        }
    };

    const removeImage = () => {
        setImagenUrl(null);
    };

    const handleSave = async () => {
        if (!nombre.trim()) {
            Alert.alert('Error', 'El nombre es obligatorio');
            return;
        }
        if (isNaN(precioNum) || precioNum < 0) {
            Alert.alert('Error', 'El precio debe ser un número mayor o igual a 0');
            return;
        }
        if (isNaN(duracionNum) || duracionNum < 1) {
            Alert.alert('Error', 'La duración debe ser al menos 1 minuto');
            return;
        }

        setLoading(true);
        try {
            await safeAction('ServicioForm', async () => {
                let resultData;

                const payload: any = {
                    nombre: nombre.trim(),
                    precio_base: precioNum,
                    duracion_aprox_minutos: duracionNum,
                    descripcion: descripcion.trim(),
                    imagen_url: imagenUrl,
                };

                if (servicio) {
                    const { data, error } = await supabase
                        .from('servicios')
                        .update(payload)
                        .eq('id', servicio.id)
                        .eq('negocio_id', negocioId)
                        .select()
                        .single();

                    if (error) throw error;
                    resultData = data;
                } else {
                    const insertPayload = {
                        ...payload,
                        negocio_id: negocioId,
                        sucursal_id: sucursalId
                    };
                    const { data, error } = await supabase
                        .from('servicios')
                        .insert(insertPayload)
                        .select()
                        .single();

                    if (error) throw error;
                    resultData = data;
                }

                Alert.alert('Éxito', servicio ? 'Servicio actualizado' : 'Servicio creado');
                onServicioGuardado(resultData);
                onDismiss();
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!servicio) return;

        Alert.alert(
            'Eliminar Servicio',
            '¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await safeAction('ServicioDelete', async () => {
                                const { error } = await supabase
                                    .from('servicios')
                                    .delete()
                                    .eq('id', servicio.id)
                                    .eq('negocio_id', negocioId);

                                if (error) throw error;

                                Alert.alert('Servicio eliminado');
                                onServicioGuardado(servicio as Servicio);
                                onDismiss();
                            });
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onDismiss}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modal}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.title}>
                            {servicio ? 'Editar Servicio' : 'Nuevo Servicio'}
                        </Text>

                        {/* Image Upload Section */}
                        <View style={styles.imageSection}>
                            {imagenUrl ? (
                                <View style={styles.imagePreviewContainer}>
                                    <Image source={{ uri: imagenUrl }} style={styles.imagePreview} />
                                    <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
                                        <MaterialIcons name="close" size={18} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage} disabled={imageUploading}>
                                    {imageUploading ? (
                                        <ActivityIndicator color="#38bdf8" />
                                    ) : (
                                        <>
                                            <MaterialIcons name="add-photo-alternate" size={36} color="#38bdf8" />
                                            <Text style={styles.imagePlaceholderText}>Agregar imagen</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                            {imagenUrl && (
                                <TouchableOpacity style={styles.changeImageBtn} onPress={pickImage} disabled={imageUploading}>
                                    <MaterialIcons name="edit" size={16} color="#38bdf8" />
                                    <Text style={{ color: '#38bdf8', marginLeft: 4, fontSize: 13 }}>Cambiar imagen</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TextInput
                            label="Nombre del Servicio *"
                            value={nombre}
                            onChangeText={setNombre}
                            mode="outlined"
                            style={styles.input}
                            textColor="#e2e8f0"
                            outlineColor="#334155"
                            activeOutlineColor="#38bdf8"
                            theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                        />

                        <View style={styles.row}>
                            <TextInput
                                label="Precio ($)"
                                value={precio}
                                onChangeText={setPrecio}
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                textColor="#e2e8f0"
                                outlineColor="#334155"
                                activeOutlineColor="#38bdf8"
                                theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                            />
                            <TextInput
                                label="Duración (min)"
                                value={duracion}
                                onChangeText={setDuracion}
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                                textColor="#e2e8f0"
                                outlineColor="#334155"
                                activeOutlineColor="#38bdf8"
                                theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                            />
                        </View>

                        <TextInput
                            label="Descripción (Opcional)"
                            value={descripcion}
                            onChangeText={setDescripcion}
                            mode="outlined"
                            multiline
                            numberOfLines={3}
                            style={styles.input}
                            textColor="#e2e8f0"
                            outlineColor="#334155"
                            activeOutlineColor="#38bdf8"
                            theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                        />

                        <View style={styles.actions}>
                            <TouchableOpacity onPress={onDismiss} disabled={loading} style={styles.cancelBtn}>
                                <Text style={{ color: '#94a3b8', fontSize: 16 }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={loading || !isFormValid}
                                style={[styles.saveBtn, (!isFormValid || loading) && { opacity: 0.5 }]}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {servicio && (
                            <TouchableOpacity onPress={handleDelete} disabled={loading} style={styles.deleteBtn}>
                                <MaterialIcons name="delete" size={18} color="#ef4444" />
                                <Text style={{ color: '#ef4444', marginLeft: 6 }}>Eliminar Servicio</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20
    },
    modal: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 24,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: '#334155',
    },
    title: {
        marginBottom: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#e2e8f0',
        fontSize: 20,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    imagePlaceholder: {
        width: 160,
        height: 120,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#334155',
        borderStyle: 'dashed',
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        color: '#64748b',
        fontSize: 13,
        marginTop: 8,
    },
    imagePreviewContainer: {
        position: 'relative',
    },
    imagePreview: {
        width: 200,
        height: 150,
        borderRadius: 12,
        backgroundColor: '#0f172a',
    },
    removeImageBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#ef4444',
        borderRadius: 14,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    changeImageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    input: {
        marginBottom: 12,
        backgroundColor: '#0f172a',
    },
    row: {
        flexDirection: 'row',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 12,
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
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        paddingVertical: 12,
    },
});
