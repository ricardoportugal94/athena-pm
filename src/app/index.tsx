import * as AuthSession from 'expo-auth-session';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useThemeToggle } from '@/hooks/use-theme';
import { t, type Lang } from '@/i18n';
import { api, type ProjectSummary } from '@/lib/api-client';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = { authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' };
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;

type Mode = 'start' | 'signup' | 'login';

export default function LoginScreen() {
  const { stored, loading, signIn } = useAuth();
  const { scheme, toggle } = useThemeToggle();
  const { lang, setLang } = useLanguage();
  const [mode, setMode] = useState<Mode>('start');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri();
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'email', 'profile'],
      redirectUri,
      usePKCE: true,
      // Without this, Google skips the account picker and silently reuses
      // whatever Google account is already active in the browser.
      extraParams: { prompt: 'select_account' },
    },
    GOOGLE_DISCOVERY
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params.code) {
      setSubmitting(true);
      setError(null);
      api
        .googleLogin(response.params.code, redirectUri, request?.codeVerifier)
        .then((res) => signIn(res))
        .catch((e) => setError(e.message))
        .finally(() => setSubmitting(false));
    } else if (response?.type === 'error') {
      setError(t('googleLoginFailed', lang));
    }
  }, [response]);

  if (loading) return null;
  if (stored) return <Redirect href={stored.session.role === 'admin' ? '/team' : '/my-project'} />;

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
          <ThemedText style={styles.subtitle}>{t('sdpMatrix', lang)}</ThemedText>

          {mode === 'start' && (
            <>
              <Pressable style={styles.googleButton} disabled={!request || submitting} onPress={() => promptAsync()}>
                {submitting ? <ActivityIndicator color={Brand.ink} /> : <ThemedText style={styles.googleButtonText}>{t('loginWithGoogle', lang)}</ThemedText>}
              </Pressable>
              <ThemedText style={styles.hint}>{t('adminDomainHint', lang)}</ThemedText>

              <Pressable style={styles.googleButton} onPress={() => setMode('login')}>
                <ThemedText style={styles.googleButtonText}>{t('alreadyClientLink', lang)}</ThemedText>
              </Pressable>

              <Pressable onPress={() => setMode('signup')}>
                <ThemedText style={styles.link}>{t('createAccountLink', lang)}</ThemedText>
              </Pressable>
            </>
          )}

          {mode === 'signup' && <SignupForm lang={lang} onBack={() => setMode('start')} onDone={signIn} />}
          {mode === 'login' && <LoginForm lang={lang} onBack={() => setMode('start')} onDone={signIn} />}

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <Pressable onPress={toggle} style={styles.darkModeRow}>
            <ThemedText style={styles.darkModeText}>{scheme === 'dark' ? `☀️ ${t('lightMode', lang)}` : `🌙 ${t('darkMode', lang)}`}</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SignupForm({ lang, onBack, onDone }: { lang: Lang; onBack: () => void; onDone: (r: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProjectSummary[]>([]);
  const [selected, setSelected] = useState<ProjectSummary | null>(null);
  const [creatingNewName, setCreatingNewName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selected || creatingNewName || query.trim().length < 2) return setResults([]);
    const id = setTimeout(() => api.searchProjects(query).then(setResults).catch(() => {}), 250);
    return () => clearTimeout(id);
  }, [query, selected, creatingNewName]);

  const submit = async () => {
    if (!selected && !creatingNewName) return setError(t('chooseOrCreateError', lang));
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.signup(email, password, selected ? { projectId: selected.id } : { newProjectName: creatingNewName! });
      await onDone(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldValue = selected?.name ?? creatingNewName ?? query;

  return (
    <View style={styles.form}>
      <TextInput placeholderTextColor="#9A9A9A" style={styles.input} placeholder={t('emailPlaceholder', lang)} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput placeholderTextColor="#9A9A9A" style={styles.input} placeholder={t('passwordMinPlaceholder', lang)} secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput
        placeholderTextColor="#9A9A9A"
        style={styles.input}
        placeholder={t('projectNamePlaceholder', lang)}
        value={fieldValue}
        onChangeText={(v) => {
          setSelected(null);
          setCreatingNewName(null);
          setQuery(v);
        }}
      />
      {!selected && !creatingNewName && query.trim().length >= 2 && (
        <ThemedView style={styles.resultsBox}>
          {results.map((r) => (
            <Pressable key={r.id} onPress={() => setSelected(r)} style={styles.resultRow}>
              <ThemedText style={styles.resultRowText}>{r.name}</ThemedText>
            </Pressable>
          ))}
          <Pressable onPress={() => setCreatingNewName(query.trim())} style={styles.resultRowNew}>
            <ThemedText style={styles.resultRowNewText}>
              {t('createNewProjectPrefix', lang)} "{query.trim()}"
            </ThemedText>
          </Pressable>
        </ThemedView>
      )}
      {creatingNewName && (
        <ThemedText style={styles.newProjectHint}>
          {t('willCreateProject', lang)} "{creatingNewName}" {t('with73Tasks', lang)}
        </ThemedText>
      )}

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <Pressable style={styles.button} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color={Brand.ink} /> : <ThemedText style={styles.buttonText}>{t('signUpButton', lang)}</ThemedText>}
      </Pressable>
      <Pressable onPress={onBack} style={styles.backLink}>
        <ThemedText style={styles.link}>{t('back', lang)}</ThemedText>
      </Pressable>
    </View>
  );
}

function LoginForm({ lang, onBack, onDone }: { lang: Lang; onBack: () => void; onDone: (r: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      await onDone(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextInput placeholderTextColor="#9A9A9A" style={styles.input} placeholder={t('emailPlaceholder', lang)} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput placeholderTextColor="#9A9A9A" style={styles.input} placeholder={t('passwordPlaceholder', lang)} secureTextEntry value={password} onChangeText={setPassword} />

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <Pressable style={styles.button} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color={Brand.ink} /> : <ThemedText style={styles.buttonText}>{t('logInButton', lang)}</ThemedText>}
      </Pressable>

      <Pressable onPress={() => setShowForgot((v) => !v)} style={styles.backLink}>
        <ThemedText style={styles.link}>{t('forgotPasswordLink', lang)}</ThemedText>
      </Pressable>
      {showForgot && <ThemedText style={styles.forgotHint}>{t('forgotPasswordBody', lang)}</ThemedText>}

      <Pressable onPress={onBack} style={styles.backLink}>
        <ThemedText style={styles.link}>{t('back', lang)}</ThemedText>
      </Pressable>
    </View>
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
  subtitle: { color: '#8A8A8A', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: -Spacing.two, marginBottom: Spacing.two },
  googleButton: { alignSelf: 'stretch', backgroundColor: Brand.accent, borderRadius: Radius.pill, paddingVertical: Spacing.three, alignItems: 'center' },
  googleButtonText: { color: Brand.ink, fontWeight: '800' },
  hint: { color: '#9A9A9A', fontSize: 12, textAlign: 'center' },
  link: { color: '#8CA300', fontWeight: '700' },
  backLink: { alignItems: 'center' },
  form: { alignSelf: 'stretch', gap: Spacing.two },
  input: {
    backgroundColor: '#F2F2F2',
    color: '#1C1C1C',
    borderRadius: Radius.card * 0.7,
    padding: Spacing.three,
    fontSize: 16,
  },
  resultsBox: { backgroundColor: '#F2F2F2', borderRadius: Radius.small, overflow: 'hidden' },
  resultRow: { padding: Spacing.two, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  resultRowText: { color: '#1C1C1C' },
  error: { color: '#E74C3C', textAlign: 'center' },
  button: { alignSelf: 'stretch', backgroundColor: Brand.accent, borderRadius: Radius.pill, paddingVertical: Spacing.three, alignItems: 'center' },
  buttonText: { color: Brand.ink, fontWeight: '800' },
  darkModeRow: { marginTop: Spacing.two },
  darkModeText: { color: '#9A9A9A', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  resultRowNew: { padding: Spacing.two },
  resultRowNewText: { color: '#7A8F00', fontWeight: '700' },
  newProjectHint: { color: '#7A8F00', fontSize: 12, textAlign: 'center' },
  forgotHint: { color: '#6B6B6B', fontSize: 12, textAlign: 'center', marginTop: -Spacing.one },
});
