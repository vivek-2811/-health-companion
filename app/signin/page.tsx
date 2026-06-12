"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const HealthCompanionSignIn = dynamic(
  () => import("@/components/ui/health-companion-auth").then((m) => m.HealthCompanionSignIn),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    ),
  }
);

export default function SignInRoute() {
  return <HealthCompanionSignIn />;
}
