'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * AuthListener — Listens to global Supabase authentication state changes client-side.
 * Captures events like 'PASSWORD_RECOVERY' (triggered by recovery email links) and
 * redirects the user to the correct page (/reset-password).
 */
export function AuthListener() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthListener] Event triggered: ${event}`);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[AuthListener] Password recovery event detected! Redirecting to /reset-password');
        // Push to reset password route immediately
        router.push('/reset-password');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return null;
}
