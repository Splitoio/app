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
import { UserPlus } from "lucide-react";

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
      <div className="text-mobile-base sm:text-base text-white/70 text-center py-6">
        Loading friends...
      </div>
    );
  }

  if (!friends?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl bg-[#0f0f10] p-6 sm:p-12 min-h-[calc(100vh-160px)] sm:min-h-[calc(100vh-180px)]">
        <div className="text-mobile-lg sm:text-xl text-white/70 mb-3 sm:mb-4">
          No friends added yet
        </div>
        <p className="text-mobile-sm sm:text-base text-white/50 text-center max-w-md mb-6 sm:mb-8">
          Add friends to start tracking expenses and settle debts together
        </p>
        <button
          onClick={() =>
            document.dispatchEvent(new CustomEvent("open-add-friend-modal"))
          }
          className="flex items-center justify-center gap-2 rounded-full bg-white text-black h-10 sm:h-12 px-4 sm:px-6 text-mobile-base sm:text-base font-medium hover:bg-white/90 transition-all"
        >
          <UserPlus className="h-4 sm:h-5 w-4 sm:w-5" strokeWidth={1.5} />
          <span>Add Friend</span>
        </button>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="bg-[#0f0f10] rounded-2xl sm:rounded-[20px] min-h-[calc(100vh-120px)] p-3 sm:p-5"
    >
      {friends.map((friend) => (
        <motion.div
          key={friend.id}
          variants={slideUp}
          className="relative py-4 border-b border-white/5 last:border-b-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full bg-white/5">
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
                <p className="text-mobile-base sm:text-xl font-medium text-white">
                  {friend.name}
                </p>
                <p className="text-mobile-sm sm:text-sm text-white/60">
                  {friend.email}
                </p>
              </div>
            </div>

            {/* <button className="text-white text-mobile-sm sm:text-sm rounded-full border border-white/20 px-3 sm:px-4 py-1.5 hover:bg-white/5 transition-colors">
              View
            </button> */}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
