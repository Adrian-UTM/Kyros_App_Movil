import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Modal, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useKyrosPalette } from '../lib/useKyrosPalette';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import BrandedLogo from './BrandedLogo';
import KyrosButton from './KyrosButton';

interface KyrosScreenProps {
    children: React.ReactNode;
    title?: string;
}

export default function KyrosScreen({ children, title }: KyrosScreenProps) {
    const insets = useSafeAreaInsets();
    const palette = useKyrosPalette();
    const responsive = useResponsiveLayout();
    const [notificationsVisible, setNotificationsVisible] = useState(false);
    const [notificationsStatus, setNotificationsStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
    const [notificationsBusy, setNotificationsBusy] = useState(false);

    const refreshNotificationsStatus = React.useCallback(async () => {
        try {
            const { status } = await Notifications.getPermissionsAsync();
            setNotificationsStatus(status === 'granted' ? 'granted' : 'denied');
        } catch {
            setNotificationsStatus('denied');
        }
    }, []);

    React.useEffect(() => {
        if (!notificationsVisible) return;

        let mounted = true;
        const loadStatus = async () => {
            try {
                const { status } = await Notifications.getPermissionsAsync();
                if (mounted) {
                    setNotificationsStatus(status === 'granted' ? 'granted' : 'denied');
                }
            } catch {
                if (mounted) {
                    setNotificationsStatus('denied');
                }
            }
        };

        setNotificationsStatus('loading');
        loadStatus();
        return () => { mounted = false; };
    }, [notificationsVisible, refreshNotificationsStatus]);

    const handleEnableNotifications = async () => {
        setNotificationsBusy(true);
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            setNotificationsStatus(status === 'granted' ? 'granted' : 'denied');
        } catch {
            setNotificationsStatus('denied');
        } finally {
            setNotificationsBusy(false);
        }
    };

    const handleOpenSettings = async () => {
        try {
            await Linking.openSettings();
        } catch {
            // Keep modal usable even if settings cannot be opened on the platform.
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
            <StatusBar
                barStyle={palette.isDark ? 'light-content' : 'dark-content'}
                backgroundColor={palette.background}
            />
            {title && (
                <View style={[styles.header, { borderBottomColor: palette.border, paddingHorizontal: responsive.isTablet ? 24 : 16 }]}>
                    <View style={styles.headerLeft}>
                        <BrandedLogo width={120} height={32} />
                        <View style={[styles.separator, { backgroundColor: palette.border }]} />
                        <Text variant="titleMedium" style={[styles.titleText, { color: palette.text }]}>
                            {title}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.bellBtn} onPress={() => setNotificationsVisible(true)} activeOpacity={0.7}>
                        <MaterialIcons name="notifications-none" size={24} color={palette.icon} />
                    </TouchableOpacity>
                </View>
            )}
            <View style={[styles.content, { width: '100%', alignSelf: 'center', maxWidth: responsive.contentMaxWidth, paddingHorizontal: responsive.screenPadding }]}>
                {children}
            </View>
            <Modal
                visible={notificationsVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setNotificationsVisible(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: palette.overlay, padding: responsive.modalPadding }]}>
                    <View style={[styles.modalCard, { backgroundColor: palette.surface, borderColor: palette.borderStrong, width: '100%', maxWidth: responsive.modalMaxWidth, alignSelf: 'center' }]}>
                        <View style={[styles.modalIconWrap, { backgroundColor: palette.selectedBgStrong }]}>
                            <MaterialIcons name="notifications-active" size={28} color={palette.primary} />
                        </View>
                        <Text style={[styles.modalTitle, { color: palette.textStrong }]}>Notificaciones</Text>
                        <Text style={[styles.modalBody, { color: palette.textMuted }]}>
                            Las alertas en tiempo real se envían a la bandeja del teléfono. Aún no hay un historial interno para mostrar aquí.
                        </Text>
                        <View style={[styles.permissionPill, {
                            backgroundColor: notificationsStatus === 'granted' ? palette.successBg : notificationsStatus === 'denied' ? palette.warningBg : palette.surfaceAlt,
                        }]}>
                            <MaterialIcons
                                name={notificationsStatus === 'granted' ? 'check-circle' : notificationsStatus === 'denied' ? 'notifications-off' : 'hourglass-empty'}
                                size={16}
                                color={notificationsStatus === 'granted' ? palette.successText : notificationsStatus === 'denied' ? palette.warningText : palette.textSoft}
                            />
                            <Text style={[styles.permissionText, {
                                color: notificationsStatus === 'granted' ? palette.successText : notificationsStatus === 'denied' ? palette.warningText : palette.textSoft
                            }]}>
                                {notificationsStatus === 'granted'
                                    ? 'Permiso de notificaciones activo'
                                    : notificationsStatus === 'denied'
                                        ? 'Permiso no concedido'
                                        : 'Verificando permiso...'}
                            </Text>
                        </View>
                        <Text style={[styles.modalHint, { color: palette.textSoft }]}>
                            Si no ves avisos, revisa los permisos del sistema y la conexión.
                        </Text>
                        {notificationsStatus !== 'granted' && (
                            <KyrosButton
                                onPress={notificationsStatus === 'denied' ? handleOpenSettings : handleEnableNotifications}
                                mode="outlined"
                                loading={notificationsBusy}
                                disabled={notificationsBusy}
                                style={{ marginTop: 14, width: '100%' }}
                            >
                                {notificationsStatus === 'denied' ? 'Abrir ajustes' : 'Activar notificaciones'}
                            </KyrosButton>
                        )}
                        <KyrosButton onPress={() => setNotificationsVisible(false)} style={{ marginTop: 10, width: '100%' }}>
                            Entendido
                        </KyrosButton>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    separator: {
        width: 1,
        height: 20,
        marginHorizontal: 12,
    },
    titleText: {
        fontWeight: 'bold',
        flexShrink: 1,
    },
    bellBtn: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        borderRadius: 22,
        borderWidth: 1,
        padding: 24,
        alignItems: 'center',
    },
    modalIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 10,
    },
    modalBody: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    modalHint: {
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        marginTop: 10,
    },
    permissionPill: {
        marginTop: 14,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    permissionText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
