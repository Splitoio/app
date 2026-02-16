"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { useGetGroupById, useUpdateMemberRole } from "@/features/groups/hooks/use-create-group";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = [
  { value: "ADMIN" as const, label: "Admin" },
  { value: "MEMBER" as const, label: "Member" },
];

type GroupUser = {
  userId: string;
  role?: string | null;
  user: { id: string; name: string | null; image: string | null; email: string | null };
};

function isAdmin(group: { userId: string; groupUsers?: GroupUser[] }, currentUserId: string): boolean {
  if (group.userId === currentUserId) return true;
  const membership = group.groupUsers?.find((gu) => gu.userId === currentUserId);
  return membership?.role === "ADMIN";
}

export default function OrganizationMembersPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { user } = useAuthStore();
  const { openAddMember } = useOrganizationOrg();
  const { data: group, isLoading } = useGetGroupById(organizationId, { type: "BUSINESS" });
  const updateRoleMutation = useUpdateMemberRole();

  const currentUserIsAdmin = group && user && isAdmin(group, user.id);
  const members = (group?.groupUsers ?? []) as GroupUser[];

  const handleRoleChange = (memberUserId: string, newRole: "ADMIN" | "MEMBER") => {
    updateRoleMutation.mutate(
      { groupId: organizationId, userId: memberUserId, role: newRole },
      {
        onSuccess: () => toast.success("Role updated"),
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to update role";
          toast.error(message);
        },
      }
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 sm:mb-4">
        <h3 className="text-mobile-lg sm:text-xl font-medium text-white">Members</h3>
        {currentUserIsAdmin && (
          <button
            onClick={openAddMember}
            className="flex items-center gap-2 rounded-full border border-white/20 h-9 sm:h-10 px-3 sm:px-4 text-sm text-white hover:bg-white/5"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        )}
      </div>
      {currentUserIsAdmin && (
        <p className="text-white/60 text-mobile-sm sm:text-base mb-4">
          Manage members and their roles. Admins can manage roles and organization settings.
        </p>
      )}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : members.length > 0 ? (
        <div className="space-y-3">
          {members.map((gu) => {
            const displayRole = gu.role ?? (group?.userId === gu.userId ? "ADMIN" : "MEMBER");
            const isCurrentUser = gu.userId === user?.id;
            return (
              <div
                key={gu.userId}
                className="flex items-center justify-between gap-4 p-3 sm:p-4 rounded-xl bg-white/[0.02]"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full flex-shrink-0">
                    <Image
                      src={gu.user.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${gu.user.id}`}
                      alt={gu.user.name || "Member"}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-mobile-base sm:text-xl text-white font-medium truncate">
                      {gu.user.name || gu.user.email || "Member"}
                      {isCurrentUser && (
                        <span className="ml-1.5 text-white/60 text-mobile-sm sm:text-base">(you)</span>
                      )}
                      {gu.userId === group?.userId && (
                        <span className="ml-1.5 text-white/60 text-mobile-sm sm:text-base">(Owner)</span>
                      )}
                    </p>
                    {gu.user.email && (
                      <p className="text-mobile-sm sm:text-base text-white/60 truncate">{gu.user.email}</p>
                    )}
                  </div>
                </div>
                {currentUserIsAdmin && (
                  gu.userId === group?.userId ? (
                    <div className="shrink-0 w-[140px] flex items-center justify-end text-white/80 text-sm font-medium">
                      Admin
                    </div>
                  ) : (
                    <div className="shrink-0 w-[140px]">
                      <Select
                        value={displayRole}
                        onValueChange={(value) => handleRoleChange(gu.userId, value as "ADMIN" | "MEMBER")}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-full h-12 bg-[#17171A] text-white border border-white/20 rounded-lg px-4 focus:ring-1 focus:ring-white/40 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed [&>span]:line-clamp-1 [&>svg]:text-white/70">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#17171A] border border-white/10 rounded-lg shadow-xl">
                          {ROLES.map((role) => (
                            <SelectItem
                              key={role.value}
                              value={role.value}
                              className="text-white hover:bg-white/5 focus:bg-white/5 focus:text-white data-[highlighted]:bg-white/5 cursor-pointer"
                            >
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-white/60">
          No members yet. {currentUserIsAdmin ? "Use Add Member above to invite people." : "Ask an admin to add members."}
        </div>
      )}
    </div>
  );
}
