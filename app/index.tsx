// app/index.jsx

import { useAuth } from '@/context/auth';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { isInitialized, isLoggedIn } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)' as unknown as string ||
                       (segments[0] && (segments[0] as string).includes('auth'));

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (isLoggedIn) {
      router.replace('/(tabs)' as any);
    }
  }, [segments, isInitialized, isLoggedIn, router]);

  // Show loading indicator during initialization
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
