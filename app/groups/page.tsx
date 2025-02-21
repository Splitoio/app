"use client";

import { GroupsList } from "@/components/groups-list";
import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GroupsPage() {
  const router = useRouter();

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="w-full"
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-display text-white capitalize">Groups</h1>
        <button
          onClick={() => router.push("/create")}
          className="group relative flex h-10 sm:h-12 items-center gap-2 rounded-full border border-white/10 bg-transparent px-2 text-sm sm:text-base font-normal text-white/90 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
        >
          <Plus className="h-5 w-5 opacity-70" strokeWidth={1.2} />
          <span className="pr-1">Create Group</span>
        </button>
      </div>
      <GroupsList />
    </motion.div>
  );
}
