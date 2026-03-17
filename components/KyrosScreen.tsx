import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Image, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KyrosScreenProps {
    children: React.ReactNode;
    title?: string;
}

export default function KyrosScreen({ children, title }: KyrosScreenProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { backgroundColor: '#0a0f1e', paddingTop: insets.top }]}>
            <StatusBar
                barStyle={'light-content'}
                backgroundColor={'#0a0f1e'}
            />
            {title && (
                <View style={[styles.header, { borderBottomColor: '#1e293b' }]}>
                    <View style={styles.headerLeft}>
                        <Image
                            source={require('../assets/images/logo-text.png')}
                            style={styles.logo}
                        />
                        <View style={styles.separator} />
                        <Text variant="titleMedium" style={styles.titleText}>
                            {title}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.bellBtn}>
                        <MaterialIcons name="notifications-none" size={24} color="#94a3b8" />
                    </TouchableOpacity>
                </View>
            )}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 120,
        height: 32,
        resizeMode: 'contain',
    },
    separator: {
        width: 1,
        height: 20,
        backgroundColor: '#334155',
        marginHorizontal: 12,
    },
    titleText: {
        color: '#f8fafc',
        fontWeight: 'bold',
    },
    bellBtn: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
});
