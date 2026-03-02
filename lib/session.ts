// Auth service using Supabase real authentication
import { supabase } from './supabaseClient';

export interface AuthResult {
    success: boolean;
    error?: string;
    user?: {
        id: string;
        email: string;
        name?: string;
    };
}

export const Session = {
    /**
     * Login with email and password using Supabase Auth
     */
    login: async (email: string, password: string): Promise<AuthResult> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return {
                    success: false,
                    error: error.message === 'Invalid login credentials'
                        ? 'Credenciales inválidas'
                        : error.message,
                };
            }

            return {
                success: true,
                user: data.user ? {
                    id: data.user.id,
                    email: data.user.email || '',
                    name: data.user.user_metadata?.name,
                } : undefined,
            };
        } catch (err) {
            return {
                success: false,
                error: 'Error de conexión',
            };
        }
    },

    /**
     * Register new user with Supabase Auth
     */
    register: async (email: string, password: string, name: string, avatarUri?: string | null): Promise<AuthResult> => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                    },
                },
            });

            if (error) {
                // Handle common errors
                if (error.message.includes('already registered')) {
                    return { success: false, error: 'Este email ya está registrado' };
                }
                if (error.message.includes('password')) {
                    return { success: false, error: 'La contraseña es muy débil' };
                }
                return { success: false, error: error.message };
            }

            // Check if email confirmation is required
            if (data.user && !data.session) {
                return {
                    success: true,
                    error: 'Revisa tu email para confirmar tu cuenta',
                    user: {
                        id: data.user.id,
                        email: data.user.email || '',
                        name,
                    },
                };
            }

            // If we have a session (Email confirm disabled), upload the avatar
            if (data.session && data.user && avatarUri) {
                try {
                    const ext = avatarUri.substring(avatarUri.lastIndexOf('.') + 1) || 'jpg';
                    const fileName = `${data.user.id}.${ext}`;

                    const response = await fetch(avatarUri);
                    const blob = await response.blob();

                    // Attempt to upload. Usually standard buckets are 'avatars' or 'usuarios_perfiles'
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('perfiles')
                        .upload(fileName, blob, { upsert: true });

                    if (!uploadError && uploadData) {
                        const { data: publicUrlData } = supabase.storage
                            .from('perfiles')
                            .getPublicUrl(uploadData.path);

                        await supabase.auth.updateUser({
                            data: { avatarUrl: publicUrlData.publicUrl }
                        });
                    }
                } catch (e) {
                    console.warn('Error subiendo avatar:', e);
                }
            }

            return {
                success: true,
                user: data.user ? {
                    id: data.user.id,
                    email: data.user.email || '',
                    name,
                } : undefined,
            };
        } catch (err) {
            return {
                success: false,
                error: 'Error de conexión',
            };
        }
    },

    /**
     * Logout current user
     */
    logout: async (): Promise<void> => {
        await supabase.auth.signOut();
    },

    /**
     * Check if user has active session
     */
    check: async (): Promise<boolean> => {
        const { data } = await supabase.auth.getSession();
        return !!data.session;
    },

    /**
     * Get current user data
     */
    getUser: async () => {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
            return {
                id: data.user.id,
                email: data.user.email || '',
                name: data.user.user_metadata?.name || '',
            };
        }
        return null;
    },
};
