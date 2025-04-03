"use client";

import { GroupsList } from "@/components/groups-list";
import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { Plus } from "lucide-react";
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
      className="w-full"
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">My Groups</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-full bg-white text-black h-12 px-5 font-medium hover:bg-white/90 transition-all"
          >
            {/* <Plus className="h-5 w-5" strokeWidth={1.5} /> */}
            <Image
              alt="Add Group"
              src="/plus-sign-circle.svg"
              width={20}
              height={20}
              className="invert"
            />
            <span>Add Group</span>
          </button>
          <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5">
            <div className="h-full w-full rounded-full overflow-hidden bg-[#101012]">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt="Profile"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={`https://api.dicebear.com/9.x/identicon/svg?seed=${
                    user?.id || user?.email || "user"
                  }`}
                  alt="Profile"
                  width={48}
                  height={48}
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
