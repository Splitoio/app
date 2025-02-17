"use client";

import { PageTitle } from "@/components/page-title";
import { FriendsList } from "@/components/friends-list";
import { Users, UserPlus } from "lucide-react";
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
      className="w-full space-y-4 lg:space-y-8 -px-2 lg:px-0"
    >
      <div className="flex items-center justify-between">
        <PageTitle />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 lg:px-8 lg:py-2 rounded-[20px] bg-[#3B3D53] border border-white text-white hover:bg-[#6a6e95] transition-colors text-sm lg:text-base"
        >
          <UserPlus className="h-4 w-4 lg:h-5 lg:w-5" />
          <span className="text-bold">Add Friends</span>
        </motion.button>
      </div>
      <FriendsList />
      <AddFriendsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </motion.div>
  );
}
