import { useColorScheme } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useApp } from './AppContext';

export function getKyrosPalette(mode: 'light' | 'dark', primary: string = '#1E66FF') {
    const isDark = mode === 'dark';
    return {
        isDark,
        primary,
        background: isDark ? '#0a0f1e' : '#edf2f7',
        surface: isDark ? '#111827' : '#f8fafc',
        surfaceAlt: isDark ? '#162235' : '#eef3f7',
        surfaceRaised: isDark ? '#1e293b' : '#e7edf5',
        border: isDark ? '#334155' : '#d2dce8',
        borderStrong: isDark ? '#475569' : '#bcc9d9',
        text: isDark ? '#f8fafc' : '#111111',
        textStrong: isDark ? '#f1f5f9' : '#0f172a',
        textMuted: isDark ? '#94a3b8' : '#59708f',
        textSoft: isDark ? '#64748b' : '#7b8da6',
        icon: isDark ? '#94a3b8' : '#5b6f89',
        disabled: isDark ? '#475569' : '#a1b1c5',
        inputBg: isDark ? '#182336' : '#f3f6fa',
        overlay: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.25)',
        selectedBg: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(30, 102, 255, 0.08)',
        selectedBgStrong: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 102, 255, 0.12)',
        infoBg: isDark ? 'rgba(30, 102, 255, 0.14)' : '#e9f1ff',
        infoText: isDark ? '#7cc6ff' : '#1E66FF',
        successBg: isDark ? 'rgba(22, 163, 74, 0.16)' : '#eaf8ef',
        successText: isDark ? '#4ade80' : '#12824c',
        warningBg: isDark ? 'rgba(245, 158, 11, 0.16)' : '#fff4df',
        warningText: isDark ? '#fbbf24' : '#b86a00',
        dangerBg: isDark ? 'rgba(239, 68, 68, 0.16)' : '#fff1f2',
        dangerText: isDark ? '#f87171' : '#dc2626',
        activeBg: isDark ? 'rgba(16, 185, 129, 0.16)' : '#e7f9f2',
        inactiveBg: isDark ? '#1e293b' : '#edf2f7',
    };
}

export function useKyrosPalette() {
    const theme = useTheme();
    const { themeMode } = useApp();
    return getKyrosPalette(themeMode, theme.colors.primary);
}

export function useSystemKyrosPalette() {
    const theme = useTheme();
    const systemColorScheme = useColorScheme();
    return getKyrosPalette(systemColorScheme === 'dark' ? 'dark' : 'light', theme.colors.primary);
}
