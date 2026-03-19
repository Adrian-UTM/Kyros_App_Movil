import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabaseClient';
import { useApp } from './AppContext';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export function useRealtimeNotifications() {
    const { negocioId, sucursalId, rol } = useApp();
    const lastProcessedEvent = useRef<string | null>(null);

    useEffect(() => {
        if (Platform.OS === 'web') return;

        const requestPermissions = async () => {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            return finalStatus === 'granted';
        };

        let subscription: any = null;

        const setupRealtime = async () => {
            const hasPermission = await requestPermissions();
            if (!hasPermission || !negocioId) return;

            subscription = supabase
                .channel('citas_realtime_notifications')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'citas',
                        filter: `negocio_id=eq.${negocioId}`,
                    },
                    (payload) => {
                        handleCitaChange(payload);
                    }
                )
                .subscribe();
        };

        const handleCitaChange = async (payload: any) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;

            // Prevent duplicate handling for the same realtime event.
            const eventId = `${eventType}-${newRecord?.id || oldRecord?.id}-${newRecord?.estado || oldRecord?.estado || 'na'}-${payload.commit_timestamp || 'no-ts'}`;
            if (lastProcessedEvent.current === eventId) return;
            lastProcessedEvent.current = eventId;
            
            if (rol === 'sucursal' && sucursalId && newRecord && newRecord.sucursal_id !== sucursalId) {
                return;
            }

            if (eventType === 'INSERT') {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '📅 Nueva Cita',
                        body: 'Se ha agendado una nueva cita en tu negocio.',
                        data: { citaId: newRecord.id },
                    },
                    trigger: null,
                });
            } else if (eventType === 'UPDATE') {
                if (oldRecord && newRecord.estado !== oldRecord.estado) {
                    if (newRecord.estado === 'cancelada') {
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: '❌ Cita Cancelada',
                                body: 'Una cita agendada ha sido cancelada.',
                                data: { citaId: newRecord.id },
                            },
                            trigger: null,
                        });
                    }
                }
            }
        };

        setupRealtime();

        return () => {
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, [negocioId, sucursalId, rol]);
}
