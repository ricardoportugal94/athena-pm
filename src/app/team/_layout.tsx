import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';

export default function TeamLayout() {
  const { stored, loading } = useAuth();

  if (loading) return null;
  if (!stored || stored.session.role !== 'admin') return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
