"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { joinGroupByToken } from "@/features/groups/api/client";
import { toast } from "sonner";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "joining" | "done" | "error">("idle");

  useEffect(() => {
    if (!token?.trim()) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    setStatus("joining");

    joinGroupByToken(token)
      .then((res) => {
        if (cancelled) return;
        setStatus("done");
        toast.success(res.message ?? "You joined the group");
        router.replace(`/groups/${res.groupId}`);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        toast.error("Invite link is invalid or expired");
        router.replace("/");
      });

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (!token?.trim()) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101012]">
      {status === "joining" && (
        <p className="text-white/80 text-sm">Joining group…</p>
      )}
      {status === "error" && (
        <p className="text-white/80 text-sm">Redirecting…</p>
      )}
      {status === "done" && (
        <p className="text-white/80 text-sm">Taking you to the group…</p>
      )}
    </div>
  );
}
