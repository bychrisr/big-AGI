/**
 * useOnboardingCheck — Detects if the current user needs onboarding.
 *
 * On first login, checks /api/onboarding (GET) to see if onboarding_completed
 * preference exists. If not, redirects to /onboarding.
 *
 * Usage: call inside the root app component after the user is authenticated.
 */
import * as React from 'react';
import { useRouter } from 'next/router';


const SUPABASE_ENABLED = typeof process !== 'undefined'
  && Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL']);


/**
 * Checks onboarding status for the authenticated user and redirects if needed.
 *
 * @param isAuthenticated - Whether the user is currently logged in.
 */
export function useOnboardingCheck(isAuthenticated: boolean): void {
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthenticated || !SUPABASE_ENABLED) return;
    if (router.pathname === '/onboarding' || router.pathname === '/login') return;

    void (async () => {
      try {
        const res = await fetch('/api/onboarding');
        if (!res.ok) return;
        const data = await res.json() as { needsOnboarding?: boolean };
        if (data.needsOnboarding) {
          void router.push('/onboarding');
        }
      } catch {
        // Non-critical — if check fails, user stays on current page
      }
    })();
  }, [isAuthenticated, router.pathname, router]);
}
