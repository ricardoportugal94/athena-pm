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
import { useThemeToggle } from '@/hooks/use-theme';
import { api, type ProjectSummary } from '@/lib/api-client';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = { authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' };
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;

type Mode = 'start' | 'signup' | 'login' | 'google-project';

export default function LoginScreen() {
  const { stored, loading, signIn } = useAuth();
  const { scheme, toggle } = useThemeToggle();
  const [mode, setMode] = useState<Mode>('start');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingGoogleToken, setPendingGoogleToken] = useState<string | null>(null);

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
        .then((res) => {
          if ('needsProject' in res) {
            setPendingGoogleToken(res.pendingToken);
            setMode('google-project');
          } else {
            return signIn(res);
          }
        })
        .catch((e) => setError(e.message))
        .finally(() => setSubmitting(false));
    } else if (response?.type === 'error') {
      setError('Could not sign in with Google.');
    }
  }, [response]);

  if (loading) return null;
  // Clients always land on "My Projects" first — same as admins landing on
  // their own project list — and pick which one to actually open there,
  // whether they have one project or several.
  if (stored) return <Redirect href={stored.session.role === 'admin' ? '/team' : '/my-projects'} />;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.card}>
          <ThemedText type="wordmark" style={styles.wordmark}>
            ATHENA
          </ThemedText>
          <ThemedText style={styles.subtitle}>THE SDP MATRIX</ThemedText>

          {mode === 'start' && (
            <View style={styles.startGroup}>
              <Pressable style={styles.button} onPress={() => setMode('login')}>
                <ThemedText style={styles.buttonText}>LOGIN</ThemedText>
              </Pressable>
              <Pressable style={styles.button} onPress={() => setMode('signup')}>
                <ThemedText style={styles.buttonText}>SIGN UP</ThemedText>
              </Pressable>
              <ThemedText style={styles.hint}>@rstivali.pt signs in as team via Google.</ThemedText>
            </View>
          )}

          {mode === 'signup' && (
            <SignupForm
              onBack={() => setMode('start')}
              onDone={signIn}
              onGoogle={() => promptAsync()}
              googleDisabled={!request || submitting}
              googleSubmitting={submitting}
            />
          )}
          {mode === 'login' && (
            <LoginForm
              onBack={() => setMode('start')}
              onDone={signIn}
              onGoogle={() => promptAsync()}
              googleDisabled={!request || submitting}
              googleSubmitting={submitting}
            />
          )}
          {mode === 'google-project' && pendingGoogleToken && (
            <GoogleProjectForm pendingToken={pendingGoogleToken} onBack={() => setMode('start')} onDone={signIn} />
          )}

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <Pressable onPress={toggle} style={styles.darkModeRow}>
            <ThemedText style={styles.darkModeText}>{scheme === 'dark' ? '☀️ LIGHT MODE' : '🌙 DARK MODE'}</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SignupForm({
  onBack,
  onDone,
  onGoogle,
  googleDisabled,
  googleSubmitting,
}: {
  onBack: () => void;
  onDone: (r: any) => void;
  onGoogle: () => void;
  googleDisabled: boolean;
  googleSubmitting: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProjectSummary[]>([]);
  const [selected, setSelected] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selected || query.trim().length < 2) return setResults([]);
    const id = setTimeout(() => api.searchProjects(query).then(setResults).catch(() => {}), 250);
    return () => clearTimeout(id);
  }, [query, selected]);

  const submit = async () => {
    if (!selected) return setError('Choose your project from the list — ask the Portugal Production team if you can\'t find it.');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.signup(email, password, selected.id);
      await onDone(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextInput placeholderTextColor="#9A9A9A" style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput placeholderTextColor="#9A9A9A" style={styles.input} placeholder="Password (min. 8 characters)" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput
        placeholderTextColor="#9A9A9A"
        style={styles.input}
        placeholder="Search for your project/brand name…"
        value={selected?.name ?? query}
        onChangeText={(v) => {
          setSelected(null);
          setQuery(v);
        }}
      />
      {!selected && query.trim().length >= 2 && (
        <ThemedView style={styles.resultsBox}>
          {results.length === 0 && (
            <ThemedText style={styles.noResultsText}>No project found — ask the Portugal Production team to create it first.</ThemedText>
          )}
          {results.map((r) => (
            <Pressable key={r.id} onPress={() => setSelected(r)} style={styles.resultRow}>
              <ThemedText style={styles.resultRowText}>{r.name}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <Pressable style={styles.button} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color={Brand.ink} /> : <ThemedText style={styles.buttonText}>SIGN UP</ThemedText>}
      </Pressable>

      <Pressable style={styles.googleButton} disabled={googleDisabled} onPress={onGoogle}>
        {googleSubmitting ? <ActivityIndicator color={Brand.ink} /> : <ThemedText style={styles.googleButtonText}>SIGN UP WITH GOOGLE</ThemedText>}
      </Pressable>

      <Pressable onPress={onBack} style={styles.backLink}>
        <ThemedText style={styles.link}>← Back</ThemedText>
      </Pressable>
    </View>
  );
}

// Shown right after a first-time Google client sign-in: Google already
// verified their identity, they just need to say which project is theirs.
function GoogleProjectForm({ pendingToken, onBack, onDone }: { pendingToken: string; onBack: () => void; onDone: (r: any) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProjectSummary[]>([]);
  const [selected, setSelected] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selected || query.trim().length < 2) return setResults([]);
    const id = setTimeout(() => api.searchProjects(query).then(setResults).catch(() => {}), 250);
    return () => clearTimeout(id);
  }, [query, selected]);

  const submit = async () => {
    if (!selected) return setError('Choose your project from the list — ask the Portugal Production team if you can\'t find it.');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.completeGoogleSignup(pendingToken, selected.id);
      await onDone(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <ThemedText style={styles.hint}>You&apos;re signed in with Google — just pick your project to finish.</ThemedText>
      <TextInput
        placeholderTextColor="#9A9A9A"
        style={styles.input}
        placeholder="Search for your project/brand name…"
        value={selected?.name ?? query}
        onChangeText={(v) => {
          setSelected(null);
          setQuery(v);
        }}
        autoFocus
      />
      {!selected && query.trim().length >= 2 && (
        <ThemedView style={styles.resultsBox}>
          {results.length === 0 && (
            <ThemedText style={styles.noResultsText}>No project found — ask the Portugal Production team to create it first.</ThemedText>
          )}
          {results.map((r) => (
            <Pressable key={r.id} onPress={() => setSelected(r)} style={styles.resultRow}>
              <ThemedText style={styles.resultRowText}>{r.name}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <Pressable style={styles.button} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color={Brand.ink} /> : <ThemedText style={styles.buttonText}>CONTINUE</ThemedText>}
      </Pressable>
      <Pressable onPress={onBack} style={styles.backLink}>
        <ThemedText style={styles.link}>← Back</ThemedText>
      </Pressable>
    </View>
  );
}

function LoginForm({
  onBack,
  onDone,
  onGoogle,
  googleDisabled,
  googleSubmitting,
}: {
  onBack: () => void;
  onDone: (r: any) => void;
  onGoogle: () => void;
  googleDisabled: boolean;
  googleSubmitting: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setShowForgot(false);
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
      <TextInput placeholderTextColor="#9A9A9A" style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput placeholderTextColor="#9A9A9A" style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <Pressable style={styles.button} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color={Brand.ink} /> : <ThemedText style={styles.buttonText}>LOG IN</ThemedText>}
      </Pressable>

      {/* Only surfaced after a failed attempt — no reason to advertise it upfront. */}
      {!!error && (
        <Pressable onPress={() => setShowForgot((v) => !v)} style={styles.backLink}>
          <ThemedText style={styles.link}>Forgot password</ThemedText>
        </Pressable>
      )}
      {showForgot && <ThemedText style={styles.forgotHint}>Contact the Portugal Production team to have your password reset.</ThemedText>}

      <Pressable style={styles.googleButton} disabled={googleDisabled} onPress={onGoogle}>
        {googleSubmitting ? <ActivityIndicator color={Brand.ink} /> : <ThemedText style={styles.googleButtonText}>LOGIN WITH GOOGLE</ThemedText>}
      </Pressable>

      <Pressable onPress={onBack} style={styles.backLink}>
        <ThemedText style={styles.link}>← Back</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', maxWidth: 480, alignSelf: 'center', width: '100%', gap: Spacing.two },
  card: { backgroundColor: '#FFFFFF', borderRadius: Radius.card * 1.5, padding: Spacing.five, alignItems: 'center', gap: Spacing.three, ...Shadow.card },
  wordmark: { color: '#111111', textAlign: 'center' },
  subtitle: { color: '#8A8A8A', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: -Spacing.two, marginBottom: Spacing.two },
  googleButton: { alignSelf: 'stretch', backgroundColor: Brand.accent, borderRadius: Radius.pill, paddingVertical: Spacing.three, alignItems: 'center' },
  googleButtonText: { color: Brand.ink, fontWeight: '800' },
  startGroup: { alignSelf: 'stretch', gap: Spacing.two },
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
  noResultsText: { color: '#9A9A9A', fontSize: 12, textAlign: 'center', padding: Spacing.two },
  forgotHint: { color: '#6B6B6B', fontSize: 12, textAlign: 'center', marginTop: -Spacing.one },
});
