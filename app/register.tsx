import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { TextInput, Text, HelperText, Icon } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Session } from '../lib/session';
import KyrosCard from '../components/KyrosCard';
import KyrosButton from '../components/KyrosButton';

export default function RegisterScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [hidePassword, setHidePassword] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5, // lower quality for quicker uploads
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
            // If there's an error message with success, it means email confirmation is needed
            if (result.error) {
                setSuccessMessage(result.error);
                // Stay on page to show the message, user can go to login manually
            } else {
                // Registration complete, go to login
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

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.contentContainer}>
                    <KyrosCard style={styles.card}>
                        <View style={styles.header}>
                            <Image
                                source={require('../assets/images/logo-text.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                            <Text style={styles.title}>Crear Cuenta</Text>
                            <Text style={styles.subtitle}>Únete a la comunidad de Kyros</Text>
                        </View>

                        <View style={styles.avatarContainer}>
                            <TouchableOpacity style={styles.avatarCircle} activeOpacity={0.7} onPress={pickImage}>
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                                ) : (
                                    <Icon source="camera-plus" size={40} color="#757575" />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={pickImage}>
                                <Text style={styles.avatarText}>
                                    {imageUri ? 'Cambiar foto de perfil' : 'Seleccionar foto de perfil'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
                            <TextInput
                                label="Nombre Completo"
                                value={name}
                                onChangeText={(text) => { setName(text); setError(''); setSuccessMessage(''); }}
                                mode="outlined"
                                style={styles.input}
                                autoCapitalize="words"
                                error={!!error && !name}
                            />

                            <TextInput
                                label="Email"
                                value={email}
                                onChangeText={(text) => { setEmail(text); setError(''); setSuccessMessage(''); }}
                                mode="outlined"
                                style={styles.input}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                error={!!error && !email}
                            />

                            <TextInput
                                label="Contraseña"
                                value={password}
                                onChangeText={(text) => { setPassword(text); setError(''); setSuccessMessage(''); }}
                                mode="outlined"
                                secureTextEntry={hidePassword}
                                right={<TextInput.Icon icon={hidePassword ? "eye" : "eye-off"} onPress={() => setHidePassword(!hidePassword)} />}
                                style={styles.input}
                                error={!!error && !password}
                            />
                            <HelperText type="info" visible={true} style={styles.helperText}>
                                Mínimo 6 caracteres
                            </HelperText>

                            <TextInput
                                label="Confirmar Contraseña"
                                value={confirmPassword}
                                onChangeText={(text) => { setConfirmPassword(text); setError(''); setSuccessMessage(''); }}
                                mode="outlined"
                                secureTextEntry={hidePassword}
                                style={styles.input}
                                error={!!error && password !== confirmPassword}
                            />

                            <HelperText type="error" visible={!!error} style={styles.errorText}>
                                {error}
                            </HelperText>

                            <HelperText type="info" visible={!!successMessage} style={styles.successText}>
                                {successMessage}
                            </HelperText>

                            <KyrosButton
                                onPress={handleRegister}
                                loading={loading}
                                disabled={loading}
                                style={styles.button}
                            >
                                {loading ? 'Registrando...' : 'Registrarme'}
                            </KyrosButton>
                        </View>

                        <View style={styles.footer}>
                            <Text variant="bodyMedium">¿Ya tienes cuenta? <Text style={styles.link} onPress={() => router.replace('/')}>Inicia Sesión</Text></Text>
                        </View>
                    </KyrosCard>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    contentContainer: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    card: {
        padding: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logo: {
        width: 200,
        height: 60,
        marginBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: '500',
        marginBottom: 5,
    },
    subtitle: {
        color: '#666',
        fontSize: 14,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 25,
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatarText: {
        color: '#666',
        fontSize: 14,
    },
    form: {
        width: '100%',
    },
    input: {
        marginBottom: 10,
        backgroundColor: 'white',
    },
    helperText: {
        marginTop: -10,
        marginBottom: 5,
    },
    errorText: {
        marginBottom: 10,
        textAlign: 'center',
    },
    successText: {
        marginBottom: 10,
        textAlign: 'center',
        color: '#4caf50',
    },
    button: {
        marginTop: 10,
    },
    footer: {
        marginTop: 20,
        alignItems: 'center',
        marginBottom: 10,
    },
    link: {
        color: '#1976d2',
        fontWeight: 'bold',
    },
});
