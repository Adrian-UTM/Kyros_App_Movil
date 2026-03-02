import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

interface KyrosCardProps {
    title?: string;
    children: React.ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
}

export default function KyrosCard({ title, children, onPress, style }: KyrosCardProps) {
    const theme = useTheme();

    return (
        <Card
            style={[
                styles.card,
                { borderColor: theme.colors.outline },
                style
            ]}
            onPress={onPress}
            mode="outlined"
        >
            <Card.Content>
                {title && (
                    <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
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
        backgroundColor: 'white',
        borderWidth: 1,
        marginBottom: 16,
        borderRadius: 8, // Rounded corners as per Material 3 but slightly less for "sharp" feel if needed, keeping 8 for now.
    },
    title: {
        marginBottom: 8,
        fontWeight: '600',
    },
});
