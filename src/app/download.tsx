import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { t, type Lang } from '@/i18n';

// Update this whenever a new build is generated via `eas build --platform android --profile preview`.
const ANDROID_APK_URL = 'https://expo.dev/artifacts/eas/1pQlFMSMDzRiume0be0-bS8umsJfCIt6PGMt0nMN9nk.apk';

export default function DownloadScreen() {
  const { lang, setLang } = useLanguage();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.langSwitch}>
          {(['pt', 'en'] as Lang[]).map((l) => (
            <Pressable key={l} onPress={() => setLang(l)} style={[styles.langChip, lang === l && styles.langChipOn]}>
              <ThemedText style={lang === l ? styles.langChipOnText : styles.langChipText}>{l.toUpperCase()}</ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedView style={styles.card}>
          <ThemedText type="wordmark" style={styles.wordmark}>
            ATHENA
          </ThemedText>
          <ThemedText style={styles.subtitle}>{t('downloadTitle', lang)}</ThemedText>
          <ThemedText style={styles.description}>{t('downloadSubtitle', lang)}</ThemedText>

          <Pressable style={styles.button} onPress={() => Linking.openURL(ANDROID_APK_URL)}>
            <ThemedText style={styles.buttonText}>{t('downloadButton', lang)}</ThemedText>
          </Pressable>

          <ThemedText style={styles.hint}>{t('downloadInstallHint', lang)}</ThemedText>
          <ThemedText style={styles.iphoneNote}>{t('downloadIphoneNote', lang)}</ThemedText>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', maxWidth: 480, alignSelf: 'center', width: '100%', gap: Spacing.two },
  langSwitch: { flexDirection: 'row', gap: Spacing.one, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: Radius.pill, padding: 3, alignSelf: 'center' },
  langChip: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: Radius.pill },
  langChipText: { color: '#2B2E33' },
  langChipOn: { backgroundColor: Brand.ink },
  langChipOnText: { color: Brand.accent },
  card: { backgroundColor: '#FFFFFF', borderRadius: Radius.card * 1.5, padding: Spacing.five, alignItems: 'center', gap: Spacing.three, ...Shadow.card },
  wordmark: { color: '#111111', textAlign: 'center' },
  subtitle: { color: '#1C1C1C', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: -Spacing.two },
  description: { color: '#6B6B6B', textAlign: 'center' },
  button: { alignSelf: 'stretch', backgroundColor: Brand.accent, borderRadius: Radius.pill, paddingVertical: Spacing.three, alignItems: 'center', marginTop: Spacing.two },
  buttonText: { color: Brand.ink, fontWeight: '800' },
  hint: { color: '#9A9A9A', fontSize: 12, textAlign: 'center' },
  iphoneNote: { color: '#8CA300', fontSize: 12, textAlign: 'center', fontWeight: '700' },
});
