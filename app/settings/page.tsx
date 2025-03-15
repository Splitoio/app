"use client";

import { UserSettingsForm } from "@/components/user-settings-form";
import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-white/50" />
          <p className="text-white/70 text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white/70 text-lg">
          You need to be logged in to view this page. Redirecting...
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="w-full max-w-2xl mx-auto py-8"
    >
      <UserSettingsForm user={user} />
    </motion.div>
  );
}
