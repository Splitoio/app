"use client";

import { GroupsList } from "@/components/groups-list";
import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import { CreateGroupForm } from "@/components/create-group-form";

export default function GroupsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="w-full -mt-2"
    >
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4">
        <h1 className="text-mobile-base sm:text-xl font-medium text-white">
          My Groups
        </h1>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-1 sm:gap-2 rounded-full bg-white text-black h-10 sm:h-12 px-4 sm:px-6 text-mobile-sm sm:text-base font-medium hover:bg-white/90 transition-all"
          >
            <Image
              alt="Add Group"
              src="/plus-sign-circle.svg"
              width={20}
              height={20}
              className="h-4 w-4 sm:h-5 sm:w-5 invert"
            />
            <span>Add Group</span>
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
      <GroupsList />

      {/* Create Group Modal */}
      <CreateGroupForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </motion.div>
  );
}
