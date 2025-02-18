"use client";

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
                <h1 className="text-display text-white capitalize inline-block mb-8">
                    Friends
                </h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="group relative flex h-9 sm:h-10 items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 sm:px-4 text-xs font-normal text-white/90 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                >
                    <UserPlus
                        className="h-4 w-4 opacity-70"
                        strokeWidth={1.2}
                    />
                    <span className="hidden sm:inline">Add Friends</span>
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
