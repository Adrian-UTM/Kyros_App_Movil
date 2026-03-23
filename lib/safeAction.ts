import { Alert } from 'react-native';

const isNetworkError = (err: unknown) => {
    const message = typeof err === 'string'
        ? err
        : err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: unknown }).message ?? '')
            : '';

    const normalized = message.toLowerCase();
    return (
        normalized.includes('network') ||
        normalized.includes('internet') ||
        normalized.includes('fetch') ||
        normalized.includes('connection') ||
        normalized.includes('offline') ||
        normalized.includes('timeout')
    );
};

/**
 * Global helper to execute Supabase mutations securely.
 * Automatically wraps the execution in a try-catch, logs the context, 
 * and shows an Alert to the user if an error occurs.
 */
export const safeAction = async (
    label: string,
    action: () => Promise<void>
) => {
    try {
        await action();
    } catch (err: any) {
        console.error(`[${label}] Error:`, err);
        if (isNetworkError(err)) {
            Alert.alert('Sin conexión', 'No tienes conexión a internet. Verifica tu red e inténtalo de nuevo.');
        } else {
            Alert.alert('Error', err.message || 'Ha ocurrido un error inesperado.');
        }
        throw err; // Re-throw if caller wants to do something
    }
};
