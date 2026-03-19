import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import KyrosScreen from '../../components/KyrosScreen';
import KyrosCard from '../../components/KyrosCard';

export default function SuscripcionScreen() {
    const theme = useTheme();

    return (
        <KyrosScreen title="Suscripción">
            <ScrollView style={styles.container}>
                <View style={styles.centerState}>
                    <MaterialIcons name="star" size={80} color="#FFB300" />
                    <Text variant="headlineSmall" style={styles.title}>En desarrollo</Text>
                    <Text style={styles.stateText}>
                        Pronto podrás gestionar tu plan de suscripción y acceder a funciones premium.
                    </Text>
                </View>

                <KyrosCard title="Planes disponibles">
                    <View style={[styles.planCard, { borderColor: '#ddd' }]}>
                        <Text variant="titleMedium" style={styles.planName}>Básico</Text>
                        <Text style={styles.planPrice}>Gratis</Text>
                        <Text style={styles.planFeature}>• Hasta 50 citas/mes</Text>
                        <Text style={styles.planFeature}>• 1 sucursal</Text>
                        <Text style={styles.planFeature}>• 3 empleados</Text>
                    </View>

                    <View style={[styles.planCard, { borderColor: theme.colors.primary }]}>
                        <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedText}>Recomendado</Text>
                        </View>
                        <Text variant="titleMedium" style={styles.planName}>Pro</Text>
                        <Text style={[styles.planPrice, { color: theme.colors.primary }]}>$299/mes</Text>
                        <Text style={styles.planFeature}>• Citas ilimitadas</Text>
                        <Text style={styles.planFeature}>• 3 sucursales</Text>
                        <Text style={styles.planFeature}>• Empleados ilimitados</Text>
                        <Text style={styles.planFeature}>• Estadísticas avanzadas</Text>
                    </View>

                    <View style={[styles.planCard, { borderColor: '#FFB300' }]}>
                        <Text variant="titleMedium" style={styles.planName}>Enterprise</Text>
                        <Text style={[styles.planPrice, { color: '#FFB300' }]}>$599/mes</Text>
                        <Text style={styles.planFeature}>• Todo en Pro</Text>
                        <Text style={styles.planFeature}>• Sucursales ilimitadas</Text>
                        <Text style={styles.planFeature}>• Soporte prioritario</Text>
                        <Text style={styles.planFeature}>• API access</Text>
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
    planCard: {
        borderWidth: 2,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        position: 'relative',
    },
    planName: {
        fontWeight: 'bold',
    },
    planPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 8,
    },
    planFeature: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    recommendedBadge: {
        position: 'absolute',
        top: -10,
        right: 16,
        backgroundColor: '#1E88E5',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    recommendedText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
