"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Unique signing link: yourdomain.com/sign/{uuid-token}
 * Redirects to contract view so the same flow (review + signature capture) is used.
 */
export default function SignTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string | undefined;

  useEffect(() => {
    if (!token) {
      router.replace("/");
      return;
    }
    router.replace(`/contract/view?token=${encodeURIComponent(token)}`);
  }, [token, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <p className="text-white/60 text-sm">Taking you to the contract…</p>
    </div>
  );
}
