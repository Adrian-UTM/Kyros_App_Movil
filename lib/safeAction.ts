import { Alert } from 'react-native';

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
        Alert.alert('Error', err.message || 'Ha ocurrido un error inesperado.');
        throw err; // Re-throw if caller wants to do something
    }
};
