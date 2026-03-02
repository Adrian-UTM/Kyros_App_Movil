import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

interface KyrosButtonProps {
    onPress: () => void;
    children: string;
    style?: ViewStyle;
    disabled?: boolean;
    loading?: boolean;
    mode?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
    icon?: string;
    compact?: boolean;
}

export default function KyrosButton({
    onPress,
    children,
    style,
    disabled,
    loading,
    mode = 'contained',
    icon,
    compact
}: KyrosButtonProps) {
    const theme = useTheme();

    return (
        <Button
            mode={mode}
            onPress={onPress}
            style={[styles.button, style]}
            contentStyle={styles.content}
            disabled={disabled}
            loading={loading}
            icon={icon}
            compact={compact}
            buttonColor={mode === 'contained' ? theme.colors.primary : undefined}
            textColor={mode === 'contained' ? theme.colors.onPrimary : theme.colors.primary}
        >
            {children}
        </Button>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 4, // More square/corporate look often, or keep rounded. Paper default is rounder. Let's use 4 for a slightly sharper look or stick to theme. 
        // User asked for "consistent". Let's stick to theme roundness or standard.
        // Let's use standard Paper roundness (which comes from theme) unless specified.
        // But for explicit "Kyros" identity, maybe slight adjustment.
        // I will adhere to the request's "blue primary button".
    },
    content: {
        height: 48, // Standard touch target
    },
});
