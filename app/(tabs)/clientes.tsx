import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { TextInput, Text, Avatar, List, useTheme, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';
import KyrosButton from '../../components/KyrosButton';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../lib/AppContext';
import ClienteNuevoModal from '../../components/ClienteNuevoModal';
import ClienteEditModal from '../../components/ClienteEditModal';

interface Cliente {
    id: number;
    nombre: string;
    telefono: string | null;
    email?: string | null;
}

export default function ClientesScreen() {
    const theme = useTheme();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [nuevoModalVisible, setNuevoModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

    const { negocioId, sucursalId, rol, isLoading: appLoading } = useApp();

    const fetchClientes = useCallback(async () => {
        if (!negocioId) return;
        setLoading(true);
        setError(null);

        try {
            // Obtener clientes del negocio
            let query = supabase
                .from('clientes_bot')
                .select('id, nombre, telefono')
                .eq('negocio_id', negocioId);

            // Branch users only see their branch clients
            if (rol === 'sucursal' && sucursalId) {
                query = query.eq('sucursal_id', sucursalId);
            }

            const { data, error: fetchError } = await query.order('nombre');

            if (fetchError) throw fetchError;
            setClientes(data || []);
            setFilteredClientes(data || []);

        } catch (err: any) {
            console.error('Error fetching clientes:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (!appLoading) {
                if (negocioId) {
                    fetchClientes();
                } else {
                    setLoading(false);
                }
            }
        }, [fetchClientes, appLoading, negocioId])
    );

    // Filtrar al buscar
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredClientes(clientes);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredClientes(
                clientes.filter(c =>
                    c.nombre.toLowerCase().includes(query) ||
                    (c.telefono && c.telefono.includes(query))
                )
            );
        }
    }, [searchQuery, clientes]);

    const getInitials = (name: string): string => {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const handleDelete = (cliente: Cliente) => {
        Alert.alert(
            'Eliminar Cliente',
            `¿Estás seguro de eliminar a "${cliente.nombre}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error: delError } = await supabase
                                .from('clientes_bot')
                                .delete()
                                .eq('id', cliente.id)
                                .eq('negocio_id', negocioId);
                            if (delError) throw delError;

                            // Refetch inmediato tras borrar
                            fetchClientes();
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'No se pudo eliminar el cliente');
                        }
                    },
                },
            ]
        );
    };

    return (
        <KyrosScreen title="Clientes">
            <ScrollView style={styles.container}>
                {/* Barra de búsqueda */}
                <KyrosCard>
                    <TextInput
                        label="Buscar cliente"
                        mode="outlined"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        left={<TextInput.Icon icon="magnify" />}
                        style={styles.searchInput}
                        theme={{ colors: { primary: theme.colors.primary } }}
                    />
                    <KyrosButton
                        mode="contained"
                        icon="account-plus"
                        onPress={() => setNuevoModalVisible(true)}
                        style={{ marginTop: 12 }}
                    >
                        Nuevo Cliente
                    </KyrosButton>
                </KyrosCard>

                {/* Estado de carga */}
                {loading && (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.stateText}>Cargando clientes...</Text>
                    </View>
                )}

                {/* Error */}
                {!loading && error && error.toLowerCase().includes('negocio') ? (
                    <View style={styles.centerState}>
                        <MaterialIcons name="storefront" size={64} color="#888" />
                        <Text style={[styles.stateText, { color: '#555', fontSize: 16, marginBottom: 8 }]}>
                            Aún no tienes sucursales creadas
                        </Text>
                        <Text style={[styles.stateText, { marginTop: 0, paddingHorizontal: 20 }]}>
                            Agrega una sucursal en el panel de Sucursales para poder agregar clientes.
                        </Text>
                    </View>
                ) : !loading && error && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="error-outline" size={64} color="#d32f2f" />
                        <Text style={[styles.stateText, { color: '#d32f2f' }]}>{error}</Text>
                        <KyrosButton onPress={fetchClientes} style={{ marginTop: 16 }}>
                            Reintentar
                        </KyrosButton>
                    </View>
                )}

                {/* Empty state */}
                {!loading && !error && clientes.length === 0 && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="person-add" size={64} color="#888" />
                        <Text style={styles.stateText}>No hay clientes registrados</Text>
                        <KyrosButton onPress={() => setNuevoModalVisible(true)} style={{ marginTop: 16 }}>
                            Agregar Cliente
                        </KyrosButton>
                    </View>
                )}

                {/* Lista de clientes */}
                {!loading && !error && filteredClientes.length > 0 && (
                    <KyrosCard title={`Clientes (${filteredClientes.length})`}>
                        {filteredClientes.map((cliente, index) => (
                            <React.Fragment key={cliente.id}>
                                <List.Item
                                    title={cliente.nombre}
                                    description={cliente.telefono || 'Sin teléfono'}
                                    left={props => (
                                        <Avatar.Text
                                            {...props}
                                            size={40}
                                            label={getInitials(cliente.nombre)}
                                            style={{ backgroundColor: theme.colors.secondaryContainer }}
                                            color={theme.colors.onSecondaryContainer}
                                        />
                                    )}
                                    right={props => (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <TouchableOpacity onPress={() => {
                                                setSelectedCliente(cliente);
                                                setEditModalVisible(true);
                                            }}>
                                                <List.Icon {...props} icon="pencil" color={theme.colors.primary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDelete(cliente)}>
                                                <List.Icon {...props} icon="delete" color="#d32f2f" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                />
                                {index < filteredClientes.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </KyrosCard>
                )}

                {/* Sin resultados de búsqueda */}
                {!loading && !error && clientes.length > 0 && filteredClientes.length === 0 && (
                    <View style={styles.centerState}>
                        <MaterialIcons name="search-off" size={48} color="#888" />
                        <Text style={styles.stateText}>No se encontraron clientes</Text>
                    </View>
                )}

                <View style={{ height: 80 }} />
            </ScrollView>

            <ClienteNuevoModal
                visible={nuevoModalVisible}
                onDismiss={() => setNuevoModalVisible(false)}
                onClienteCreado={(newCliente) => {
                    setNuevoModalVisible(false);
                    fetchClientes(); // Refrescar lista automáticamente
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
                    fetchClientes(); // Refrescar lista automáticamente
                }}
            />
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchInput: {
        backgroundColor: 'white',
    },
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
});
