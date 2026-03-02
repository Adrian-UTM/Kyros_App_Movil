import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface KyrosScreenProps {
    children: React.ReactNode;
    title?: string;
}

export default function KyrosScreen({ children, title }: KyrosScreenProps) {
    const theme = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
            {title && (
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                        {title}
                    </Text>
                </View>
            )}
            <View style={styles.content}>
                {children}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    content: {
        flex: 1,
        padding: 16,
    },
});
