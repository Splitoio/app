"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { staggerContainer, slideUp } from "@/utils/animations";
import { useGetFriends } from "@/features/friends/hooks/use-get-friends";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { useEffect } from "react";
import { ApiError } from "@/types/api-error";

export function FriendsList() {
  const { data: friends, isLoading, error } = useGetFriends();
  const router = useRouter();

  useEffect(() => {
    if (error) {
      const apiError = error as ApiError;
      const statusCode =
        apiError.response?.status || apiError.status || apiError.code;

      if (statusCode === 401) {
        Cookies.remove("sessionToken");
        router.push("/login");
        toast.error("Session expired. Please log in again.");
      } else if (error) {
        toast.error("An unexpected error occurred.");
      }
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <div className="text-white/70 text-center py-8">Loading friends...</div>
    );
  }

  if (!friends?.length) {
    return (
      <div className="text-white/70 text-center py-8">No friends added yet</div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-3 lg:space-y-4"
    >
      {friends.map((friend) => (
        <motion.div
          key={friend.id}
          variants={slideUp}
          className="grid grid-cols-[auto_1fr] items-center gap-3 lg:gap-8 rounded-xl bg-zinc-950 p-3 lg:p-4"
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="h-8 w-8 lg:h-16 lg:w-16 overflow-hidden rounded-full">
              <Image
                src={
                  friend.image ||
                  `https://api.dicebear.com/9.x/identicon/svg?seed=${
                    friend.id || friend.name
                  }`
                }
                alt={friend.name}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                onError={(e) => {
                  console.error(
                    `Error loading image for friend ${friend.name}`
                  );
                  // @ts-expect-error - fallback to identicon on error
                  e.target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${
                    friend.id || friend.name
                  }`;
                }}
              />
            </div>
            <div>
              <p className="text-base lg:text-lg font-semibold text-white">
                {friend.name}
              </p>
              <p className="text-xs lg:text-sm text-white/70">{friend.email}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
