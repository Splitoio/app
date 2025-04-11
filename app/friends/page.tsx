"use client";

import { FriendsList } from "@/components/friends-list";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { AddFriendsModal } from "@/components/add-friends-modal";
import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useAuthStore } from "@/stores/authStore";
import Image from "next/image";

export default function FriendsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="w-full -mt-2"
    >
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4">
        <h1 className="text-mobile-base sm:text-xl font-medium text-white">
          Friends
        </h1>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1 sm:gap-2 rounded-full bg-transparent border border-white/20 text-white h-10 sm:h-12 px-4 sm:px-6 text-mobile-sm sm:text-base font-medium hover:bg-white/5 transition-all"
          >
            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
            <span>Add Friend</span>
          </button>
          <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5">
            <div className="h-full w-full rounded-full overflow-hidden bg-[#0f0f10]">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt="Profile"
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={`https://api.dicebear.com/9.x/identicon/svg?seed=${
                    user?.id || user?.email || "user"
                  }`}
                  alt="Profile"
                  width={56}
                  height={56}
                  className="h-full w-full"
                  onError={(e) => {
                    console.error(`Error loading identicon for user`);
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=user`;
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0f0f10] rounded-2xl sm:rounded-[20px] min-h-[calc(100vh-120px)] mt-2 px-3 sm:px-5 py-3 sm:py-4">
        <FriendsList />
      </div>

      <AddFriendsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </motion.div>
  );
}
