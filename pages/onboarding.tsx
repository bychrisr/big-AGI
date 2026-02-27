import * as React from 'react';
import { useRouter } from 'next/router';

import { AppOnboarding } from '../src/apps/onboarding/AppOnboarding';


export default function OnboardingPage() {
  const router = useRouter();

  function handleComplete() {
    void router.push('/');
  }

  return <AppOnboarding onComplete={handleComplete} />;
}
