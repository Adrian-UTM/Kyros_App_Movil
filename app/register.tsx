import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Alert, Animated } from 'react-native';
import { TextInput, Text, Icon, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Session } from '../lib/session';
import { useSystemKyrosPalette } from '../lib/useKyrosPalette';
import BrandedLogo from '../components/BrandedLogo';

export default function RegisterScreen() {
    const router = useRouter();
    const palette = useSystemKyrosPalette();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [hidePassword, setHidePassword] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);

    // Animations
    const logoAnim = useRef(new Animated.Value(0)).current;
    const formAnim = useRef(new Animated.Value(0)).current;
    const buttonAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.stagger(200, [
            Animated.spring(logoAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
            Animated.spring(formAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
            Animated.spring(buttonAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
    }, [buttonAnim, formAnim, logoAnim]);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setImageUri(result.assets[0].uri);
            }
        } catch (err) {
            console.error('Error al seleccionar imagen:', err);
            setError('Error al seleccionar imagen');
        }
    };

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            setError('Completa todos los campos');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setError('');
        setSuccessMessage('');
        setLoading(true);

        const result = await Session.register(email, password, name, imageUri);

        setLoading(false);

        if (result.success) {
            if (result.error) {
                setSuccessMessage(result.error);
            } else {
                router.replace(`/?email=${encodeURIComponent(email)}`);
            }
        } else {
            const errorMsg = result.error?.toLowerCase() || '';
            if (errorMsg.includes('ya está registrado') || errorMsg.includes('already registered') || errorMsg.includes('user already exists')) {
                Alert.alert(
                    'Correo ya registrado',
                    'Este correo electrónico ya fue registrado. ¿Quieres iniciar sesión con este correo?',
                    [
                        { text: 'No', style: 'cancel' },
                        {
                            text: 'Sí, Iniciar Sesión',
                            onPress: () => router.replace(`/?email=${encodeURIComponent(email)}`)
                        }
                    ]
                );
            } else {
                setError(result.error || 'Error al registrarse');
            }
        }
    };

    const inputTheme = {
        colors: {
            onSurfaceVariant: '#94a3b8',
            outline: 'transparent',
            primary: palette.primary,
        },
        roundness: 14,
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { backgroundColor: palette.background }]}
        >
            {/* Subtle background glow */}
            <View style={styles.glowCircle} />
            <View style={styles.glowCircle2} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                        {/* Logo */}
                        <Animated.View style={[styles.logoContainer, {
                            opacity: logoAnim,
                            transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
                        }]}>
                            <BrandedLogo
                                width={240}
                                height={75}
                                respectSystemTheme
                                containerStyle={palette.isDark ? styles.logoPlate : undefined}
                            />
                            <Text style={[styles.title, { color: palette.text }]}>Crear Cuenta</Text>
                            <Text style={[styles.subtitle, { color: palette.textMuted }]}>Únete a la comunidad de Kyros</Text>
                        </Animated.View>

                        {/* Avatar */}
                        <Animated.View style={[styles.avatarSection, {
                            opacity: logoAnim,
                            transform: [{ scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                        }]}>
                            <TouchableOpacity style={[styles.avatarCircle, { backgroundColor: palette.surfaceRaised }]} activeOpacity={0.7} onPress={pickImage}>
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} style={styles.avatarImage} />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: palette.surfaceAlt }]}>
                                        <Icon source="camera-plus" size={32} color={palette.disabled} />
                                    </View>
                                )}
                                <View style={[styles.avatarBadge, { backgroundColor: palette.primary }]}>
                                    <Icon source="pencil" size={14} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={pickImage}>
                                <Text style={[styles.avatarText, { color: palette.primary }]}>
                                    {imageUri ? 'Cambiar foto' : 'Agregar foto'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Form */}
                        <Animated.View style={[styles.formContainer, {
                            opacity: formAnim,
                            transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
                        }]}>
                            <TextInput
                                label="Nombre Completo"
                                value={name}
                                onChangeText={(text) => { setName(text); setError(''); setSuccessMessage(''); }}
                                mode="flat"
                                style={[styles.input, { backgroundColor: palette.inputBg }]}
                                autoCapitalize="words"
                                textColor={palette.text}
                                underlineColor="transparent"
                                activeUnderlineColor="#3b82f6"
                                left={<TextInput.Icon icon="account-outline" color={palette.icon} />}
                                theme={inputTheme}
                            />

                            <TextInput
                                label="Correo electrónico"
                                value={email}
                                onChangeText={(text) => { setEmail(text); setError(''); setSuccessMessage(''); }}
                                mode="flat"
                                style={[styles.input, { backgroundColor: palette.inputBg }]}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                textColor={palette.text}
                                underlineColor="transparent"
                                activeUnderlineColor="#3b82f6"
                                left={<TextInput.Icon icon="email-outline" color={palette.icon} />}
                                theme={inputTheme}
                            />

                            <TextInput
                                label="Contraseña"
                                value={password}
                                onChangeText={(text) => { setPassword(text); setError(''); setSuccessMessage(''); }}
                                mode="flat"
                                secureTextEntry={hidePassword}
                                right={<TextInput.Icon icon={hidePassword ? "eye-outline" : "eye-off-outline"} color={palette.icon} onPress={() => setHidePassword(!hidePassword)} />}
                                left={<TextInput.Icon icon="lock-outline" color={palette.icon} />}
                                style={[styles.input, { backgroundColor: palette.inputBg }]}
                                textColor={palette.text}
                                underlineColor="transparent"
                                activeUnderlineColor="#3b82f6"
                                theme={inputTheme}
                            />

                            <Text style={[styles.helperText, { color: palette.textSoft }]}>Mínimo 6 caracteres</Text>

                            <TextInput
                                label="Confirmar Contraseña"
                                value={confirmPassword}
                                onChangeText={(text) => { setConfirmPassword(text); setError(''); setSuccessMessage(''); }}
                                mode="flat"
                                secureTextEntry={hidePassword}
                                left={<TextInput.Icon icon="lock-check-outline" color={palette.icon} />}
                                style={[styles.input, { backgroundColor: palette.inputBg }]}
                                textColor={palette.text}
                                underlineColor="transparent"
                                activeUnderlineColor="#3b82f6"
                                theme={inputTheme}
                            />

                            {!!error && (
                                <View style={[styles.errorContainer, { backgroundColor: palette.dangerBg }]}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {!!successMessage && (
                                <View style={[styles.successContainer, { backgroundColor: palette.successBg }]}>
                                    <Text style={styles.successText}>{successMessage}</Text>
                                </View>
                            )}
                        </Animated.View>

                        {/* Button */}
                        <Animated.View style={[styles.buttonContainer, {
                            opacity: buttonAnim,
                            transform: [{ scale: buttonAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
                        }]}>
                            <Button
                                mode="contained"
                                onPress={handleRegister}
                                loading={loading}
                                disabled={loading}
                                style={styles.registerButton}
                                labelStyle={styles.registerButtonLabel}
                                contentStyle={styles.registerButtonContent}
                                buttonColor="#2563eb"
                            >
                                {loading ? 'Registrando...' : 'Crear Cuenta'}
                            </Button>
                        </Animated.View>

                        {/* Footer */}
                        <Animated.View style={[styles.footer, { opacity: buttonAnim }]}>
                            <Text style={[styles.footerText, { color: palette.textMuted }]}>
                                ¿Ya tienes cuenta?{' '}
                                <Text style={[styles.link, { color: palette.primary }]} onPress={() => router.replace('/')}>
                                    Inicia Sesión
                                </Text>
                            </Text>
                        </Animated.View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0f1e',
    },
    glowCircle: {
        position: 'absolute',
        top: -80,
        right: -80,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(37, 99, 235, 0.06)',
    },
    glowCircle2: {
        position: 'absolute',
        bottom: -60,
        left: -60,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(37, 99, 235, 0.04)',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 40,
    },
    content: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: '#111827',
        borderRadius: 28,
        paddingVertical: 32,
        paddingHorizontal: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logo: {
        width: 240,
        height: 75,
        marginBottom: 16,
    },
    logoPlate: {
        marginBottom: 16,
    },
    title: {
        color: '#f1f5f9',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: 14,
        letterSpacing: 0.3,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 28,
    },
    avatarCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        marginBottom: 8,
        position: 'relative',
    },
    avatarImage: {
        width: 90,
        height: 90,
        borderRadius: 45,
    },
    avatarPlaceholder: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#60a5fa',
        fontSize: 13,
        fontWeight: '600',
    },
    formContainer: {
        marginBottom: 24,
        gap: 12,
    },
    input: {
        backgroundColor: '#1a2234',
        borderRadius: 14,
        fontSize: 15,
        overflow: 'hidden',
    },
    helperText: {
        color: '#475569',
        fontSize: 12,
        marginTop: -4,
        marginLeft: 16,
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginTop: 4,
    },
    errorText: {
        color: '#f87171',
        fontSize: 13,
        textAlign: 'center',
    },
    successContainer: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginTop: 4,
    },
    successText: {
        color: '#4ade80',
        fontSize: 13,
        textAlign: 'center',
    },
    buttonContainer: {
        marginBottom: 24,
    },
    registerButton: {
        borderRadius: 14,
        elevation: 8,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    registerButtonContent: {
        paddingVertical: 6,
    },
    registerButtonLabel: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    footerText: {
        color: '#94a3b8',
        fontSize: 14,
    },
    link: {
        color: '#60a5fa',
        fontWeight: '700',
    },
});
