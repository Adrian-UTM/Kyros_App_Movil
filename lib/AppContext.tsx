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

    // Theme state
    themeMode: 'light' | 'dark';
    toggleTheme: () => Promise<void>;

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
    THEME_MODE: 'kyros_theme_mode',
};

export function AppProvider({ children }: { children: ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null);
    const [negocioId, setNegocioId] = useState<string | null>(null);
    const [sucursalId, setSucursalId] = useState<number | null>(null);
    const [rol, setRol] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [profileMissing, setProfileMissing] = useState(false);
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

    // Use a ref to track current userId so the onAuthStateChange callback
    // always has the latest value (avoids stale closure bug)
    const userIdRef = React.useRef<string | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    const toggleTheme = useCallback(async () => {
        const newMode = themeMode === 'light' ? 'dark' : 'light';
        setThemeMode(newMode);
        await storage.set(STORAGE_KEYS.THEME_MODE, newMode);
    }, [themeMode]);

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
            try {
                // 1. Load from local storage (fastest)
                const storedUserId = await storage.get(STORAGE_KEYS.USER_ID);
                const storedNegocioId = await storage.get(STORAGE_KEYS.NEGOCIO_ID);
                const storedSucursalId = await storage.get(STORAGE_KEYS.SUCURSAL_ID);
                const storedRol = await storage.get(STORAGE_KEYS.ROL);
                const storedTheme = await storage.get(STORAGE_KEYS.THEME_MODE);

                if (storedTheme === 'dark' || storedTheme === 'light') {
                    setThemeMode(storedTheme);
                }

                if (storedUserId) {
                    console.log('[AppContext] Loaded from storage:', storedUserId);
                    setUserId(storedUserId);
                    setNegocioId(storedNegocioId || null);
                    setSucursalId(storedSucursalId ? parseInt(storedSucursalId) : null);
                    setRol(storedRol || null);
                }

                // 2. Check session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (session?.user) {
                    console.log('[AppContext] Active session found');
                    setIsAuthenticated(true);

                    const loadPromise = loadProfile(session.user.id);

                    if (!storedUserId) {
                        await loadPromise;
                    } else {
                        loadPromise.catch(err => console.error('[AppContext] Background profile refresh failed:', err));
                    }
                } else {
                    console.log('[AppContext] No active session');
                    setIsAuthenticated(false);
                    await clearSession();
                }
            } catch (err) {
                console.error('[AppContext] Initialization error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        initialize();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AppContext] Auth state changed:', event);

            // Ignore events that should NOT trigger loading states
            // TOKEN_REFRESHED: just a token refresh, user is still logged in
            // INITIAL_SESSION: fires on page focus/tab switch, user is already loaded
            if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                console.log('[AppContext] Ignoring event:', event);
                // Just ensure authenticated state is correct
                if (session?.user) {
                    setIsAuthenticated(true);
                }
                return;
            }

            if (event === 'SIGNED_IN' && session?.user) {
                setIsAuthenticated(true);
                // Only reload profile if it's a DIFFERENT user than currently loaded
                // Use ref to avoid stale closure
                if (session.user.id !== userIdRef.current) {
                    setIsLoading(true);
                    await loadProfile(session.user.id);
                    setIsLoading(false);
                }
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
        themeMode,
        toggleTheme,
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
