import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getPlanFeatures, type PlanFeatures } from '@/lib/api/subscription';

const defaultFeatures: PlanFeatures = {
  planName: null,
  planDisplayName: null,
  hasApiAccess: false,
  hasAutomation: false,
  hasIntegrations: false,
  hasSSO: false,
  hasWhatsAppNotifications: false,
  hasWhatsappCrm: false,
};

// Module-scoped cache so multiple components mounting on the same screen don't
// each refetch. Cleared on `invalidatePlanFeaturesCache()` after a successful
// subscription change.
let cachedFeatures: PlanFeatures | null = null;
let fetchPromise: Promise<PlanFeatures> | null = null;

/**
 * Read the caller's plan-feature flags. Mirrors the web's `usePlanFeatures`
 * semantics so the same gating logic ports cleanly. Used by upsell logic on
 * the WhatsApp tab and any future plan-locked surfaces.
 *
 * Returned shape includes `loading: true` until the fetch resolves the first
 * time. Defaults are all-false so a render during loading shows the upsell
 * (this matches web — better than briefly flashing the real UI).
 */
export function usePlanFeatures() {
  const { accessToken } = useAuth();
  const [features, setFeatures] = useState<PlanFeatures>(
    cachedFeatures || defaultFeatures,
  );
  const [loading, setLoading] = useState(!cachedFeatures);

  useEffect(() => {
    if (cachedFeatures) {
      setFeatures(cachedFeatures);
      setLoading(false);
      return;
    }
    if (!accessToken) return;

    if (!fetchPromise) {
      fetchPromise = (async () => {
        const res = await getPlanFeatures(accessToken);
        if (res.success && res.data) {
          cachedFeatures = res.data;
          return res.data;
        }
        // On failure, return the safe default (locked). Don't cache, so the
        // next mount retries.
        return defaultFeatures;
      })();
    }

    let cancelled = false;
    fetchPromise.then((data) => {
      if (cancelled) return;
      setFeatures(data);
      setLoading(false);
      fetchPromise = null;
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return { ...features, loading };
}

/**
 * Force a refetch on next mount. Call this after a successful subscription
 * change so the rest of the app sees the new plan immediately.
 */
export function invalidatePlanFeaturesCache(): void {
  cachedFeatures = null;
  fetchPromise = null;
}
