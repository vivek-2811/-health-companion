"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// AetherVerifyEmail already wraps its useSearchParams usage in an internal Suspense.
// The outer Suspense here guards the dynamic import loading state.
const AetherVerifyEmail = dynamic(
  () =>
    import("@/components/ui/aether-auth").then((m) => m.AetherVerifyEmail),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    ),
  }
);

export default function VerifyEmailRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
        </div>
      }
    >
      <AetherVerifyEmail />
    </Suspense>
  );
}
