import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 * On native: uses Alert.alert
 * On web: uses window.confirm (since Alert.alert doesn't work on web)
 */
export function confirmAction(
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    destructive = true
) {
    if (Platform.OS === 'web') {
        const ok = window.confirm(`${title}\n\n${message}`);
        if (ok) onConfirm();
    } else {
        Alert.alert(title, message, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: destructive ? 'Eliminar' : 'Aceptar',
                style: destructive ? 'destructive' : 'default',
                onPress: () => onConfirm(),
            },
        ]);
    }
}
