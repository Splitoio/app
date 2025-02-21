"use client";

import { FriendsList } from "@/components/friends-list";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { AddFriendsModal } from "@/components/add-friends-modal";
import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";

export default function FriendsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="w-full"
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-display text-white capitalize">Friends</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group relative flex h-10 sm:h-12 items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 sm:px-4 text-sm sm:text-base font-normal text-white/90 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
        >
          <UserPlus className="h-5 w-5 opacity-70" strokeWidth={1.2} />
          <span>Add Friends</span>
        </button>
      </div>
      <FriendsList />
      <AddFriendsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </motion.div>
  );
}
