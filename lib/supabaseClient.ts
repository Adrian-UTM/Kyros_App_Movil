import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = 'https://qyyhembukflbxjbctuav.supabase.co';
const supabaseAnonKey = 'sb_publishable_iyXy7g8HFkSWS-hscoR4HQ_6ONq_SzF';

// Custom storage adapter to handle Web/SSR vs Native
const storageAdapter = {
    getItem: (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') {
                return null;
            }
            return localStorage.getItem(key);
        }
        return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, value);
            }
            return;
        }
        AsyncStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }
            return;
        }
        AsyncStorage.removeItem(key);
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: storageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
