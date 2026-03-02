import { Stack } from 'expo-router';

export default function CitasLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="nueva" />
            <Stack.Screen name="[id]" />
        </Stack>
    );
}
