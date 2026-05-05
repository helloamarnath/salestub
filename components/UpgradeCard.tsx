import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';

interface UpgradeCardProps {
  /** Display name of the feature being gated, e.g. "WhatsApp CRM" */
  featureName: string;
  /** One-line pitch shown under the title */
  description: string;
  /** Three or four bullet-point reasons to upgrade */
  bullets?: string[];
  /** The plan the user needs (default: "SalesTub One") */
  requiredPlan?: string;
  /** Where the upgrade button routes to (default: '/subscription/plans') */
  upgradeHref?: string;
  /** Optional plan name on the user's account, shown in the description tail */
  currentPlanDisplayName?: string | null;
}

const DEFAULT_UPGRADE_HREF = '/subscription/plans';

/**
 * Full-screen upsell shown in place of a plan-locked feature. Mirrors the
 * web's UpgradeCard semantics so a user who hits a locked surface on either
 * platform gets the same pitch and the same upgrade CTA.
 */
export function UpgradeCard({
  featureName,
  description,
  bullets,
  requiredPlan = 'SalesTub One',
  upgradeHref = DEFAULT_UPGRADE_HREF,
  currentPlanDisplayName,
}: UpgradeCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();

  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const tintBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  const fullDescription =
    description +
    (currentPlanDisplayName
      ? ` Your current plan (${currentPlanDisplayName}) doesn't include this.`
      : '');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.card, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor }]}>
          {/* Lock chip */}
          <View style={styles.lockChipRow}>
            <Ionicons name="lock-closed-outline" size={14} color={subtitleColor} />
            <Text style={[styles.lockChipText, { color: subtitleColor }]}>Feature locked</Text>
          </View>

          {/* Title */}
          <View style={styles.titleRow}>
            <Ionicons name="sparkles" size={26} color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
              Unlock {featureName}
            </Text>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: subtitleColor }]}>
            {fullDescription}
          </Text>

          {/* Bullets */}
          {bullets && bullets.length > 0 && (
            <View style={styles.bullets}>
              {bullets.map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={Palette.emerald}
                    style={{ marginTop: 1 }}
                  />
                  <Text style={[styles.bulletText, { color: colors.foreground }]}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Plan callout */}
          <View style={[styles.planCallout, { backgroundColor: tintBg, borderColor }]}>
            <Text style={[styles.planCalloutText, { color: subtitleColor }]}>
              Available on the <Text style={{ fontWeight: '700', color: colors.foreground }}>{requiredPlan}</Text> plan.
            </Text>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(upgradeHref as never);
            }}
          >
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
              Upgrade to {requiredPlan}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  lockChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockChipText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
  },
  bullets: { gap: 10 },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  planCallout: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  planCalloutText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default UpgradeCard;
