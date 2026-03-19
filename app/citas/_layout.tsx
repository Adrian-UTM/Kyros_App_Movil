import { Stack } from 'expo-router';

export default function CitasLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
            <Stack.Screen name="nueva" />
            <Stack.Screen name="[id]" />
        </Stack>
    );
}
