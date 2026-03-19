import React from 'react';
import { Image, StyleSheet, View, ImageStyle, ViewStyle } from 'react-native';
import { useSystemKyrosPalette, useKyrosPalette } from '../lib/useKyrosPalette';

interface BrandedLogoProps {
    width?: number;
    height?: number;
    respectSystemTheme?: boolean;
    style?: ImageStyle;
    containerStyle?: ViewStyle;
}

export default function BrandedLogo({
    width = 120,
    height = 32,
    respectSystemTheme = false,
    style,
    containerStyle,
}: BrandedLogoProps) {
    const appPalette = useKyrosPalette();
    const systemPalette = useSystemKyrosPalette();
    const palette = respectSystemTheme ? systemPalette : appPalette;
    const needsContrastPlate = palette.isDark;

    return (
        <View style={[
            styles.wrap,
            needsContrastPlate && { backgroundColor: '#f8fbff', borderColor: 'rgba(148,163,184,0.18)' },
            containerStyle,
        ]}>
            <Image
                source={require('../assets/images/logo-text.png')}
                style={[{ width, height }, style]}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'transparent',
        alignSelf: 'flex-start',
    },
});
