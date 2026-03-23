import { useColorScheme } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useApp } from './AppContext';

export function getKyrosPalette(mode: 'light' | 'dark', primary: string = '#1E66FF') {
    const isDark = mode === 'dark';
    return {
        isDark,
        primary,
        background: isDark ? '#0a0f1e' : '#dbe5ef',
        surface: isDark ? '#111827' : '#f8fafc',
        surfaceAlt: isDark ? '#162235' : '#e8eef5',
        surfaceRaised: isDark ? '#1e293b' : '#d5dee9',
        border: isDark ? '#334155' : '#a8b6c7',
        borderStrong: isDark ? '#475569' : '#7a8da6',
        text: isDark ? '#f8fafc' : '#111111',
        textStrong: isDark ? '#f1f5f9' : '#0f172a',
        textMuted: isDark ? '#94a3b8' : '#111827',
        textSoft: isDark ? '#64748b' : '#1f2937',
        icon: isDark ? '#94a3b8' : '#475569',
        disabled: isDark ? '#475569' : '#64748b',
        inputBg: isDark ? '#182336' : '#eef3f8',
        overlay: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.25)',
        selectedBg: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(30, 102, 255, 0.08)',
        selectedBgStrong: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 102, 255, 0.12)',
        infoBg: isDark ? 'rgba(30, 102, 255, 0.14)' : '#e3edf9',
        infoText: isDark ? '#7cc6ff' : '#163b73',
        successBg: isDark ? 'rgba(22, 163, 74, 0.16)' : '#eaf8ef',
        successText: isDark ? '#4ade80' : '#12824c',
        warningBg: isDark ? 'rgba(245, 158, 11, 0.16)' : '#fff4df',
        warningText: isDark ? '#fbbf24' : '#b86a00',
        dangerBg: isDark ? 'rgba(239, 68, 68, 0.16)' : '#fff1f2',
        dangerText: isDark ? '#f87171' : '#dc2626',
        activeBg: isDark ? 'rgba(16, 185, 129, 0.16)' : '#e7f9f2',
        inactiveBg: isDark ? '#1e293b' : '#d4dde8',
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
