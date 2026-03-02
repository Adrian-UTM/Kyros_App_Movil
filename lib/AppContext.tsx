import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';

// Types
interface UserProfile {
    id: string;
    negocio_id: string | null;  // UUID in Supabase
    sucursal_id: number | null; // bigint in Supabase
    rol: string | null;
}

interface AppContextType {
    // User profile data
    userId: string | null;
    negocioId: string | null;  // UUID string
    sucursalId: number | null;
    rol: string | null;

    // Loading state
    isLoading: boolean;
    isAuthenticated: boolean;
    profileMissing: boolean;

    // Actions
    refreshProfile: () => Promise<void>;
    clearSession: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Storage helper (works on web and native)
const storage = {
    async get(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        } else {
            // Lazy load AsyncStorage only on native
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            return AsyncStorage.getItem(key);
        }
    },
    async set(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
        } else {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem(key, value);
        }
    },
    async remove(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
        } else {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.removeItem(key);
        }
    },
    async multiSet(pairs: [string, string][]): Promise<void> {
        for (const [key, value] of pairs) {
            await storage.set(key, value);
        }
    },
    async multiRemove(keys: string[]): Promise<void> {
        for (const key of keys) {
            await storage.remove(key);
        }
    }
};

// Storage keys
const STORAGE_KEYS = {
    NEGOCIO_ID: 'kyros_negocio_id',
    SUCURSAL_ID: 'kyros_sucursal_id',
    ROL: 'kyros_user_rol',
    USER_ID: 'kyros_user_id',
};

export function AppProvider({ children }: { children: ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null);
    const [negocioId, setNegocioId] = useState<string | null>(null);
    const [sucursalId, setSucursalId] = useState<number | null>(null);
    const [rol, setRol] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [profileMissing, setProfileMissing] = useState(false);

    // Load profile from Supabase
    // Table: usuarios_perfiles
    // Columns: id (uuid, PK = auth.uid()), negocio_id (uuid), sucursal_id (bigint), rol (text)
    const loadProfile = useCallback(async (authUserId: string) => {
        console.log('[AppContext] Loading profile for user:', authUserId);

        try {
            const { data: profile, error } = await supabase
                .from('usuarios_perfiles')
                .select('id, negocio_id, sucursal_id, rol')
                .eq('id', authUserId)
                .single();

            if (error) {
                console.error('[AppContext] Error loading profile:', error);
                setProfileMissing(true);
                return;
            }

            if (profile) {
                console.log('[AppContext] Profile loaded:', profile);

                let finalSucursalId = profile.sucursal_id;

                // If no sucursal_id, get the first one from the business
                if (!finalSucursalId && profile.negocio_id) {
                    console.log('[AppContext] No sucursal_id, fetching first branch for negocio:', profile.negocio_id);
                    const { data: branches } = await supabase
                        .from('sucursales')
                        .select('id')
                        .eq('negocio_id', profile.negocio_id)
                        .order('id', { ascending: true })
                        .limit(1);

                    if (branches && branches.length > 0) {
                        finalSucursalId = branches[0].id;
                        console.log('[AppContext] Using first branch:', finalSucursalId);
                    }
                }

                // Update state
                setUserId(authUserId);
                setNegocioId(profile.negocio_id);
                setSucursalId(finalSucursalId);
                setRol(profile.rol);

                // Persist to storage
                await storage.multiSet([
                    [STORAGE_KEYS.USER_ID, authUserId],
                    [STORAGE_KEYS.NEGOCIO_ID, profile.negocio_id || ''],
                    [STORAGE_KEYS.SUCURSAL_ID, finalSucursalId?.toString() || ''],
                    [STORAGE_KEYS.ROL, profile.rol || ''],
                ]);

                console.log('[AppContext] Profile saved - negocio_id:', profile.negocio_id, 'sucursal_id:', finalSucursalId);
                setProfileMissing(false);
            } else {
                console.warn('[AppContext] No profile found for user:', authUserId);
                setProfileMissing(true);
            }
        } catch (err) {
            console.error('[AppContext] Error in loadProfile:', err);
        }
    }, []);

    // Clear session data
    const clearSession = useCallback(async () => {
        console.log('[AppContext] Clearing session');
        setUserId(null);
        setNegocioId(null);
        setSucursalId(null);
        setRol(null);
        setIsAuthenticated(false);

        await storage.multiRemove([
            STORAGE_KEYS.USER_ID,
            STORAGE_KEYS.NEGOCIO_ID,
            STORAGE_KEYS.SUCURSAL_ID,
            STORAGE_KEYS.ROL,
        ]);
    }, []);

    // Refresh profile (can be called manually)
    const refreshProfile = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await loadProfile(user.id);
        }
    }, [loadProfile]);

    // Initialize on mount
    useEffect(() => {
        const initialize = async () => {
            // Prevent double loading if already loading
            // setIsLoading(true); // Already true by default

            try {
                // 1. Load from local storage (fastest)
                const storedUserId = await storage.get(STORAGE_KEYS.USER_ID);
                const storedNegocioId = await storage.get(STORAGE_KEYS.NEGOCIO_ID);
                const storedSucursalId = await storage.get(STORAGE_KEYS.SUCURSAL_ID);
                const storedRol = await storage.get(STORAGE_KEYS.ROL);

                if (storedUserId) {
                    console.log('[AppContext] Loaded from storage:', storedUserId);
                    setUserId(storedUserId);
                    setNegocioId(storedNegocioId || null);
                    setSucursalId(storedSucursalId ? parseInt(storedSucursalId) : null);
                    setRol(storedRol || null);
                    // If we have data, we can potentially show app content while verifying session
                }

                // 2. Check session (getSession is fast if persisted with AsyncStorage)
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (session?.user) {
                    console.log('[AppContext] Active session found');
                    setIsAuthenticated(true);

                    // 3. Refresh profile in background or foreground depending on if we have storage data
                    // We don't await this if we already have stored data, to make startup faster
                    const loadPromise = loadProfile(session.user.id);

                    if (!storedUserId) {
                        await loadPromise; // Must wait if no local data
                    } else {
                        // Background refresh
                        loadPromise.catch(err => console.error('[AppContext] Background profile refresh failed:', err));
                    }
                } else {
                    console.log('[AppContext] No active session');
                    setIsAuthenticated(false);
                    await clearSession();
                }
            } catch (err) {
                console.error('[AppContext] Initialization error:', err);
                // Fallback: if storage had data, we might still be "authenticated" offline? 
                // For now, if init fails, we assume logged out to be safe, or keep local state.
            } finally {
                setIsLoading(false);
            }
        };

        initialize();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AppContext] Auth state changed:', event);

            if (event === 'SIGNED_IN' && session?.user) {
                setIsAuthenticated(true);
                await loadProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                await clearSession();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [loadProfile, clearSession]);

    const value: AppContextType = {
        userId,
        negocioId,
        sucursalId,
        rol,
        isLoading,
        isAuthenticated,
        profileMissing,
        refreshProfile,
        clearSession,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

// Hook to use the context
export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}

// Convenience hooks
export function useNegocioId() {
    const { negocioId } = useApp();
    return negocioId;
}

export function useSucursalId() {
    const { sucursalId } = useApp();
    return sucursalId;
}
