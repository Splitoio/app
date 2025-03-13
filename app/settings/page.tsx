"use client";

import { UserSettingsForm } from "@/components/user-settings-form";
import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useAuthStore } from "@/stores/authStore";

export default function SettingsPage() {
  const {isAuthenticated, isLoading, user} = useAuthStore()

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <div>Not authenticated</div>;
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
