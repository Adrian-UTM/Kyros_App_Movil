import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';

export default function EstadisticasScreen() {
    const theme = useTheme();

    return (
        <KyrosScreen title="Estadísticas">
            <ScrollView style={styles.container}>
                <View style={styles.centerState}>
                    <MaterialIcons name="bar-chart" size={80} color={theme.colors.primary} />
                    <Text variant="headlineSmall" style={styles.title}>En desarrollo</Text>
                    <Text style={styles.stateText}>
                        Pronto podrás ver estadísticas de tu negocio: ingresos, citas, clientes más frecuentes y más.
                    </Text>
                </View>

                <KyrosCard title="Próximamente">
                    <View style={styles.featureItem}>
                        <MaterialIcons name="trending-up" size={24} color={theme.colors.primary} />
                        <Text style={styles.featureText}>Ingresos por período</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <MaterialIcons name="event-available" size={24} color={theme.colors.primary} />
                        <Text style={styles.featureText}>Citas completadas vs canceladas</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <MaterialIcons name="star" size={24} color={theme.colors.primary} />
                        <Text style={styles.featureText}>Servicios más solicitados</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <MaterialIcons name="people" size={24} color={theme.colors.primary} />
                        <Text style={styles.featureText}>Clientes más frecuentes</Text>
                    </View>
                </KyrosCard>

                <View style={{ height: 80 }} />
            </ScrollView>
        </KyrosScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    title: {
        marginTop: 16,
        fontWeight: 'bold',
    },
    stateText: {
        marginTop: 8,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    featureText: {
        marginLeft: 16,
        fontSize: 16,
    },
});
