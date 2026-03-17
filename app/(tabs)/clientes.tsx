import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { TextInput, Text, Avatar, List, useTheme, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import KyrosButton from '../../components/KyrosButton';
import KyrosSelector from '../../components/KyrosSelector';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import ClienteNuevoModal from '../../components/ClienteNuevoModal';
import ClienteEditModal from '../../components/ClienteEditModal';
import { confirmAction } from '../../lib/confirm';

interface Cliente {
    id: number;
    nombre: string;
    telefono: string | null;
    email?: string | null;
    sucursal_id?: number | null;
    sucursal_nombre?: string;
}

export default function ClientesScreen() {
    const theme = useTheme();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // State for filtering by branch
    const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | 'general'>('general');

    // Modals
    const [nuevoModalVisible, setNuevoModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

    const { negocioId, sucursalId, rol, isLoading: appLoading } = useApp();

    const fetchClientes = useCallback(async (showIndicator = true) => {
        if (!negocioId) return;
        if (showIndicator) setLoading(true);
        setError(null);

        try {
            // Fetch branches if owner
            if (rol !== 'sucursal') {
                const { data: sucursalesData } = await supabase
                    .from('sucursales')
                    .select('id, nombre')
                    .eq('negocio_id', negocioId);
                setSucursales(sucursalesData || []);
            }

            // Obtener clientes del negocio
            let query = supabase
                .from('clientes_bot')
                .select('id, nombre, telefono, sucursal_id, sucursales(nombre)')
                .eq('negocio_id', negocioId);

            // Branch users only see their branch clients
            if (rol === 'sucursal' && sucursalId) {
                query = query.eq('sucursal_id', sucursalId);
            }

            const { data, error: fetchError } = await query.order('nombre');

            if (fetchError) throw fetchError;
            
            const mappedData = (data || []).map((c: any) => ({
                ...c,
                sucursal_nombre: c.sucursales?.nombre || 'General'
            }));

            setClientes(mappedData);
            setFilteredClientes(mappedData);

        } catch (err: any) {
            console.error('Error fetching clientes:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [negocioId, sucursalId, rol]);

    useFocusEffect(
        useCallback(() => {
            if (!appLoading) {
                if (negocioId) {
                    fetchClientes(false);
                } else {
                    setLoading(false);
                }
            }
        }, [fetchClientes, appLoading, negocioId])
    );

    // Filtrar al buscar y por sucursal
    useEffect(() => {
        let result = clientes;

        // Apply branch filter
        if (selectedBranchId !== 'general') {
            result = result.filter(c => c.sucursal_id === selectedBranchId || (c as any).sucursales?.id === selectedBranchId); // Adjusted depending on how it's mapped
        }

        // Apply search query
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.nombre.toLowerCase().includes(query) ||
                (c.telefono && c.telefono.includes(query))
            );
        }

        setFilteredClientes(result);
    }, [searchQuery, clientes, selectedBranchId]);

    const getInitials = (name: string): string => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(n => n?.[0] || '')
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const handleDelete = (cliente: Cliente) => {
        confirmAction(
            'Eliminar Cliente',
            `¿Estás seguro de eliminar a "${cliente.nombre}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    const { error: delError } = await supabase
                        .from('clientes_bot')
                        .delete()
                        .eq('id', cliente.id)
                        .eq('negocio_id', negocioId);
                    if (delError) throw delError;
                    fetchClientes(true);
                } catch (err: any) {
                    Alert.alert('Error', err.message || 'No se pudo eliminar el cliente');
                }
            }
        );
    };

    return (
        <KyrosScreen title="Clientes">
            <ScrollView style={styles.container}>
                {/* Search + Add */}
                <View style={[styles.topSection, { flexDirection: 'column', gap: 16 }]}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TextInput
                            label="Buscar cliente"
                            mode="outlined"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            left={<TextInput.Icon icon="magnify" />}
                            style={[styles.searchInput, { flex: 1, marginBottom: 0 }]}
                            textColor="#e2e8f0"
                            outlineColor="#334155"
                            activeOutlineColor="#38bdf8"
                            theme={{ colors: { onSurfaceVariant: '#94a3b8' } }}
                        />
                        <KyrosButton 
                            mode="contained" 
                            icon="account-plus" 
                            onPress={() => setNuevoModalVisible(true)}
                            style={{ height: 50, justifyContent: 'center', marginTop: 6 }}
                        >
                            Agregar
                        </KyrosButton>
                    </View>
                    
                    {rol !== 'sucursal' && sucursales.length > 0 && (
                        <KyrosSelector
                            options={[
                                { label: 'Todas las Sucursales', value: 'general' },
                                ...sucursales.map(s => ({ label: s.nombre, value: s.id }))
                            ]}
                            selectedValue={selectedBranchId}
                            onValueChange={setSelectedBranchId}
                            placeholder="Filtrar por sucursal"
                            icon="store"
                        />
                    )}
                </View>

                {/* Loading */}
                {loading && (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color="#38bdf8" />
                        <Text style={styles.stateText}>Cargando clientes...</Text>
                    </View>
                )}

                {/* Error */}
                {!loading && error && error?.toLowerCase().includes('negocio') ? (
                    <View style={styles.centerState}>
                        <MaterialIcons name="storefront" size={64} color="#64748b" />
                        <Text style={[styles.stateText, { fontSize: 16, marginBottom: 8 }]}>Aún no tienes sucursales</Text>
                        <Text style={[styles.stateText, { marginTop: 0, paddingHorizontal: 20 }]}>Agrega una sucursal para poder agregar clientes.</Text>
                    </View>
                ) : !loading && error && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="error-outline" size={64} color="#ef4444" />
                        <Text style={[styles.stateText, { color: '#ef4444' }]}>{error}</Text>
                        <KyrosButton onPress={fetchClientes} style={{ marginTop: 16 }}>Reintentar</KyrosButton>
                    </View>
                )}

                {/* Empty */}
                {!loading && !error && clientes.length === 0 && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="person-add" size={64} color="#64748b" />
                        <Text style={styles.stateText}>No hay clientes registrados</Text>
                        <KyrosButton onPress={() => setNuevoModalVisible(true)} style={{ marginTop: 16 }}>Agregar Cliente</KyrosButton>
                    </View>
                )}

                {/* Client List */}
                {!loading && !error && filteredClientes.length > 0 && (
                    <View style={styles.listSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="people" size={18} color="#38bdf8" />
                            <Text style={styles.sectionTitle}>Clientes ({filteredClientes.length})</Text>
                        </View>

                        {filteredClientes.map(cliente => (
                            <View key={cliente.id} style={styles.clientCard}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>{getInitials(cliente.nombre)}</Text>
                                </View>
                                <View style={styles.clientInfo}>
                                    <Text style={styles.clientName}>{cliente.nombre}</Text>
                                    <Text style={styles.clientPhone}>{cliente.telefono || 'Sin teléfono'} • {cliente.sucursal_nombre}</Text>
                                </View>
                                <View style={styles.clientActions}>
                                    <TouchableOpacity onPress={() => { setSelectedCliente(cliente); setEditModalVisible(true); }} style={styles.actionBtn}>
                                        <MaterialIcons name="edit" size={18} color="#94a3b8" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(cliente)} style={[styles.actionBtn, styles.actionDelete]}>
                                        <MaterialIcons name="delete" size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* No search results */}
                {!loading && !error && clientes.length > 0 && filteredClientes.length === 0 && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="search-off" size={48} color="#64748b" />
                        <Text style={styles.stateText}>No se encontraron clientes</Text>
                    </View>
                )}

                <View style={{ height: 80 }} />
            </ScrollView>

            <ClienteNuevoModal
                visible={nuevoModalVisible}
                sucursales={sucursales}
                onDismiss={() => setNuevoModalVisible(false)}
                onClienteCreado={(newCliente) => {
                    setNuevoModalVisible(false);
                    fetchClientes(true);
                }}
            />

            <ClienteEditModal
                visible={editModalVisible}
                cliente={selectedCliente}
                negocioId={negocioId}
                onDismiss={() => {
                    setEditModalVisible(false);
                    setSelectedCliente(null);
                }}
                onClienteActualizado={(updatedCliente) => {
                    setEditModalVisible(false);
                    setSelectedCliente(null);
                    fetchClientes(true);
                }}
            />
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topSection: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        margin: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    searchInput: {
        backgroundColor: '#0f172a',
    },
    listSection: {
        paddingHorizontal: 16,
        marginTop: 8,
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
    clientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: {
        color: '#38bdf8',
        fontWeight: '700',
        fontSize: 16,
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        color: '#f1f5f9',
        fontWeight: '600',
        fontSize: 15,
    },
    clientPhone: {
        color: '#64748b',
        fontSize: 13,
        marginTop: 2,
    },
    clientActions: {
        flexDirection: 'row',
        gap: 6,
    },
    actionBtn: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
    },
    actionDelete: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: '#ef4444',
    },
    centerState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    stateText: {
        marginTop: 16,
        color: '#64748b',
        textAlign: 'center',
    },
});
