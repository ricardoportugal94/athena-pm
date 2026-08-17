import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';

// The lime rounded-bottom header used across every screen — the visual anchor
// carried over from the old athena-app's dashboard. Use size="brand" only for
// the literal "ATHENA" wordmark (login, project list); size="title" for
// screen-specific titles like a project name, which can be long.
export function HeroPanel({
  title,
  subtitle,
  right,
  children,
  size = 'brand',
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  size?: 'brand' | 'title';
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <ThemedText type={size === 'brand' ? 'wordmark' : 'subtitle'} numberOfLines={2} style={styles.title}>
            {title}
          </ThemedText>
          {subtitle && <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Brand.accent,
    borderBottomLeftRadius: Radius.card * 1.5,
    borderBottomRightRadius: Radius.card * 1.5,
    padding: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.three,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleBlock: { flex: 1, marginRight: Spacing.two },
  title: { color: Brand.ink },
  subtitle: {
    color: '#4A5A00',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
