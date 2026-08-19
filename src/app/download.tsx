import { Linking, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';

// Update this whenever a new build is generated via `eas build --platform android --profile preview`.
const ANDROID_APK_URL = 'https://expo.dev/artifacts/eas/BQcZYvjD-TeRZJS48N-ec74LIycN8iSSPla_C2WBH0I.apk';

export default function DownloadScreen() {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.card}>
          <ThemedText type="wordmark" style={styles.wordmark}>
            ATHENA
          </ThemedText>
          <ThemedText style={styles.subtitle}>Download the app</ThemedText>
          <ThemedText style={styles.description}>Install Athena PM on your Android phone.</ThemedText>

          <Pressable style={styles.button} onPress={() => Linking.openURL(ANDROID_APK_URL)}>
            <ThemedText style={styles.buttonText}>⬇ Download for Android (.apk)</ThemedText>
          </Pressable>

          <ThemedText style={styles.hint}>
            {'When you open the file, Android will ask you to confirm "install from unknown source" — that\'s normal, this app isn\'t from the Play Store.'}
          </ThemedText>
          <ThemedText style={styles.iphoneNote}>
            {'Have an iPhone? This installer is Android-only. Open this same address in Safari and tap Share → "Add to Home Screen" to get an icon that opens like an app.'}
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', maxWidth: 480, alignSelf: 'center', width: '100%', gap: Spacing.two },
  card: { backgroundColor: '#FFFFFF', borderRadius: Radius.card * 1.5, padding: Spacing.five, alignItems: 'center', gap: Spacing.three, ...Shadow.card },
  wordmark: { color: '#111111', textAlign: 'center' },
  subtitle: { color: '#1C1C1C', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: -Spacing.two },
  description: { color: '#6B6B6B', textAlign: 'center' },
  button: { alignSelf: 'stretch', backgroundColor: Brand.accent, borderRadius: Radius.pill, paddingVertical: Spacing.three, alignItems: 'center', marginTop: Spacing.two },
  buttonText: { color: Brand.ink, fontWeight: '800' },
  hint: { color: '#9A9A9A', fontSize: 12, textAlign: 'center' },
  iphoneNote: { color: '#8CA300', fontSize: 12, textAlign: 'center', fontWeight: '700' },
});
