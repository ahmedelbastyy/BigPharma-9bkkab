import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet, Platform } from 'react-native';
import { useViewport } from '@/hooks/useViewport';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AlertProvider } from '@/template';
import { AuthProvider } from '@/contexts/AuthContext';
import { ExperienceProvider } from '@/contexts/ExperienceContext';
import { LaunchVisibilityProvider } from '@/contexts/LaunchVisibilityContext';
import { MedicationImagesProvider } from '@/contexts/MedicationImagesContext';
import { MedicationProvider } from '@/contexts/MedicationContext';
import { PatientSharingProvider } from '@/contexts/PatientSharingContext';
import { VideoLibraryProvider } from '@/contexts/VideoLibraryContext';
import { MedicationRequestsProvider } from '@/contexts/MedicationRequestsContext';
import { MediaReviewProvider } from '@/contexts/MediaReviewContext';
import { LaunchPreview } from '@/components/experience/LaunchPreview';
import { SessionAccess } from '@/components/auth/SessionAccess';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { MedicationGuidePreparation } from '@/components/feature/MedicationGuidePreparation';
import { AppDock } from '@/components/layout/AppDock';
import { Colors } from '@/constants/theme';
import { AvatarPreloader } from '@/components/feature/AvatarPreloader';
import { useMedicationAssetPreload } from '@/hooks/useMedicationAssetPreload';

export function RootLayout() {
  const viewport = useViewport();
  useMedicationAssetPreload();
  return (
    <AlertProvider>
      <GestureHandlerRootView style={styles.root}><SafeAreaProvider>
        <AuthProvider>
          <LaunchVisibilityProvider><ExperienceProvider>
            <MedicationProvider><PatientSharingProvider><NotificationProvider><MedicationImagesProvider><NavigationProvider><VideoLibraryProvider><MedicationRequestsProvider><MediaReviewProvider>
              <AvatarPreloader />
              <MedicationGuidePreparation />
              <StatusBar style="light" backgroundColor={Colors.background} />
              <View style={[styles.root, Platform.OS === 'web' ? { height: viewport.height, maxHeight: viewport.height } : null]}>
                <LaunchPreview><SessionAccess>
                  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)/welcome" />
                    <Stack.Screen name="(auth)/login" />
                    <Stack.Screen name="(auth)/signup" />
                    <Stack.Screen name="(auth)/onboarding" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="recovery" />
                    <Stack.Screen name="legal" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="video-library" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="scanner" options={{ presentation: 'card', animation: 'none', headerShown: false }} />
                    <Stack.Screen name="medication-log" options={{ presentation: 'card', animation: 'none' }} />
                    <Stack.Screen name="settings" options={{ presentation: 'card', animation: 'slide_from_right' }} />
                    <Stack.Screen name="add-medication" options={{ presentation: 'card', animation: 'slide_from_right' }} />
                    <Stack.Screen name="share-medication-profile" options={{ presentation: 'card', animation: 'slide_from_right' }} />
                    <Stack.Screen name="notification-settings" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="interaction-checker" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="condition-lookup" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="medication-guide" options={{ animation:'slide_from_right' }} />
                    <Stack.Screen name="medication/[id]" options={{ presentation: 'card', animation: 'slide_from_right', headerShown: false }} />
                    <Stack.Screen name="take-medication/[id]" options={{ presentation: 'card', animation: 'slide_from_right', headerShown: false }} />
                  </Stack>
                  <AppDock />
                </SessionAccess></LaunchPreview>
              </View>
            </MediaReviewProvider></MedicationRequestsProvider></VideoLibraryProvider></NavigationProvider></MedicationImagesProvider></NotificationProvider></PatientSharingProvider></MedicationProvider>
          </ExperienceProvider></LaunchVisibilityProvider>
        </AuthProvider>
      </SafeAreaProvider></GestureHandlerRootView>
    </AlertProvider>
  );
}
export default RootLayout;
const styles = StyleSheet.create({ root: { flex: 1, minHeight: 0, backgroundColor: Colors.background } });
