import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useApp } from '../lib/AppContext';
import { useKyrosPalette } from '../lib/useKyrosPalette';

interface KyrosCardProps {
    title?: string;
    children: React.ReactNode;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

export default function KyrosCard({ title, children, onPress, style }: KyrosCardProps) {
    const theme = useTheme();
    const { themeMode } = useApp();
    const palette = useKyrosPalette();

    return (
        <Card
            style={[
                styles.card,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : theme.colors.outline,
                },
                style
            ]}
            onPress={onPress}
            mode="outlined"
        >
            <Card.Content style={styles.content}>
                {title && (
                    <Text variant="titleLarge" style={[styles.title, { color: palette.text }]}>
                        {title}
                    </Text>
                )}
                {children}
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        marginBottom: 16,
        borderRadius: 20, // Modern softer, larger radius
        overflow: 'hidden',
    },
    content: {
        padding: 24,
    },
    title: {
        marginBottom: 16,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontSize: 15,
        color: '#e2e8f0',
    },
});
