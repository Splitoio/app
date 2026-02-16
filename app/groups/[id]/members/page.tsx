"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useGroupLayout } from "@/contexts/group-layout-context";
import { useAuthStore } from "@/stores/authStore";

export default function GroupMembersPage() {
  const { user } = useAuthStore();
  const { group, isAdmin, openAddMember, handleRemoveMember } = useGroupLayout();

  if (!group || !user) return null;

  return (
    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
      {isAdmin && (
        <div className="flex justify-end mb-2">
          <button
            onClick={openAddMember}
            className="flex items-center justify-center gap-1 sm:gap-2 rounded-full text-white hover:bg-white/5 h-8 sm:h-10 px-3 sm:px-4 text-mobile-sm sm:text-base transition-colors border border-white/80"
          >
            <Image
              alt="Add Member"
              src="/plus-sign-circle.svg"
              width={14}
              height={14}
              className="w-4 h-4 sm:w-5 sm:h-5"
            />
            <span className="text-mobile-sm sm:text-base">Add Member</span>
          </button>
        </div>
      )}

      <div className="space-y-3 sm:space-y-4">
        {group.groupUsers.map((member) => {
          const isCurrentUser = member.user.id === user.id;
          return (
            <div
              key={member.user.id}
              className="flex items-center justify-between p-3 sm:p-4 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full">
                  <Image
                    src={
                      member.user.image ||
                      `https://api.dicebear.com/9.x/identicon/svg?seed=${member.user.id}`
                    }
                    alt={member.user.name || "User"}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${member.user.id}`;
                    }}
                  />
                </div>
                <div>
                  <p className="text-mobile-base sm:text-base text-white font-medium">
                    {isCurrentUser ? "You" : member.user.name}
                  </p>
                  <p className="text-mobile-sm sm:text-base text-white/70">
                    {member.user.email}
                  </p>
                </div>
              </div>
              {!isCurrentUser && group.createdBy.id === user.id && (
                <button
                  className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/5 ml-1 sm:ml-2"
                  onClick={() => handleRemoveMember(member.user.id)}
                >
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-white/70" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
