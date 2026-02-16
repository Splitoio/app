"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { useGetGroupById, useUpdateMemberRole } from "@/features/groups/hooks/use-create-group";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
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

export default function OrganizationRolesDetailPage() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { user } = useAuthStore();
  const { data: group, isLoading } = useGetGroupById(organizationId, { type: "BUSINESS" });
  const updateRoleMutation = useUpdateMemberRole();

  const currentUserIsAdmin = group && user && isAdmin(group, user.id);
  const members = (group?.groupUsers ?? []) as GroupUser[];

  // Redirect non-admins; they cannot manage roles for this organization
  useEffect(() => {
    if (!organizationId || isLoading || !user) return;
    if (group && !currentUserIsAdmin) {
      router.replace("/organization/roles");
    }
  }, [organizationId, isLoading, user, group, currentUserIsAdmin, router]);

  if (!organizationId) {
    return null;
  }

  const showAccessDenied = !isLoading && group && user && !currentUserIsAdmin;

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
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="w-full -mt-2"
    >
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/organization/roles"
            className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-white/80 hover:text-white"
            aria-label="Back to Roles"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </Link>
          <h1 className="text-mobile-base sm:text-xl font-medium text-white">
            {group?.name ?? "Roles"}
          </h1>
        </div>
        <button
          onClick={() => router.push("/organization/settings")}
          className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5 hover:from-purple-500/30 hover:to-blue-500/30 transition-all cursor-pointer"
          aria-label="Settings"
        >
          <div className="h-full w-full rounded-full overflow-hidden bg-[#0f0f10]">
            {user?.image ? (
              <Image src={user.image} alt="Profile" width={56} height={56} className="h-full w-full object-cover" />
            ) : (
              <Image
                src={`https://api.dicebear.com/9.x/identicon/svg?seed=${user?.id || "user"}`}
                alt="Profile"
                width={56}
                height={56}
                className="h-full w-full"
              />
            )}
          </div>
        </button>
      </div>

      <div className="rounded-2xl sm:rounded-3xl bg-[#101012] p-4 sm:p-6">
        {showAccessDenied ? (
          <div className="text-center py-12 text-white/70 text-mobile-base sm:text-base">
            Only organization admins can manage roles. Redirecting…
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </div>
        ) : members.length > 0 ? (
          <div className="space-y-3">
            <p className="text-white/60 text-mobile-sm sm:text-base mb-4">
              Change a member’s role. Admins can manage roles and organization settings.
            </p>
            {members.map((gu) => {
              const displayRole = gu.role ?? (group?.userId === gu.userId ? "ADMIN" : "MEMBER");
              const isCurrentUser = gu.userId === user?.id;
              return (
                <div
                  key={gu.userId}
                  className="flex items-center justify-between gap-4 p-3 sm:p-4 rounded-xl hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full flex-shrink-0">
                      <Image
                        src={
                          gu.user.image ||
                          `https://api.dicebear.com/9.x/identicon/svg?seed=${gu.user.id}`
                        }
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
                      {gu.user.email && gu.user.name && (
                        <p className="text-mobile-sm sm:text-base text-white/60 truncate">{gu.user.email}</p>
                      )}
                    </div>
                  </div>
                  {gu.userId === group?.userId ? (
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
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-white/70 text-mobile-base sm:text-base">
            No members in this organization.
          </div>
        )}
      </div>
    </motion.div>
  );
}
