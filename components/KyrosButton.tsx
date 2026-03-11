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
            textColor={mode === 'contained' ? '#ffffff' : theme.colors.primary}
        >
            {children}
        </Button>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 12, // Modern softer, consistent with the new Card radiuses
    },
    content: {
        height: 48, // Standard touch target
    },
});
