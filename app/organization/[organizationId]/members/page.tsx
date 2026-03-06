"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { UserMinus, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { useGetGroupById, useUpdateMemberRole, useRemoveMemberFromGroup } from "@/features/groups/hooks/use-create-group";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Card, SectionLabel, T, A, Icons } from "@/lib/splito-design";
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
  const router = useRouter();
  const organizationId = params?.organizationId as string;
  const { user } = useAuthStore();
  const { openAddMember } = useOrganizationOrg();
  const { data: group, isLoading } = useGetGroupById(organizationId, { type: "BUSINESS" });
  const updateRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveMemberFromGroup();
  const [memberToRemove, setMemberToRemove] = useState<GroupUser | null>(null);

  const currentUserIsAdmin = group && user && isAdmin(group, user.id);
  const members = (group?.groupUsers ?? []) as GroupUser[];

  useEffect(() => {
    if (group && user && !isAdmin(group, user.id)) {
      router.replace(`/organization/${organizationId}/invoices`);
    }
  }, [group, user, organizationId, router]);

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

  const handleConfirmRemove = () => {
    if (!memberToRemove || !organizationId) return;
    removeMemberMutation.mutate(
      { groupId: organizationId, userId: memberToRemove.userId },
      {
        onSuccess: () => {
          toast.success("Member removed from organization");
          setMemberToRemove(null);
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to remove member";
          toast.error(message);
        },
      }
    );
  };

  if (group && user && !currentUserIsAdmin) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>Members</SectionLabel>
        {currentUserIsAdmin && (
          <button
            onClick={openAddMember}
            className="flex items-center gap-2 rounded-xl h-9 sm:h-10 px-3 sm:px-4 text-sm font-extrabold transition-all hover:opacity-90"
            style={{ background: A, color: "#0a0a0a" }}
          >
            {Icons.plus({ size: 16 })} Add Admin
          </button>
        )}
      </div>
      {currentUserIsAdmin && (
        <p className="text-sm mb-4" style={{ color: T.muted }}>
          Manage members and their roles. Admins can manage roles and organization settings.
        </p>
      )}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : members.length > 0 ? (
        <Card className="p-0 overflow-hidden">
          {members.map((gu, idx) => {
            const displayRole = gu.role ?? (group?.userId === gu.userId ? "ADMIN" : "MEMBER");
            const isCurrentUser = gu.userId === user?.id;
            return (
              <div
                key={gu.userId}
                className="flex items-center justify-between gap-4 p-4 sm:p-5 border-b border-white/[0.06] last:border-b-0"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full flex-shrink-0 border border-white/[0.08]">
                    <Image
                      src={gu.user.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${gu.user.id}`}
                      alt={gu.user.name || "Member"}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate" style={{ color: T.bright }}>
                      {gu.user.name || gu.user.email || "Member"}
                      {isCurrentUser && <span className="ml-1.5 text-sm" style={{ color: T.muted }}>(you)</span>}
                      {gu.userId === group?.userId && <span className="ml-1.5 text-sm" style={{ color: T.muted }}>(Owner)</span>}
                    </p>
                    {gu.user.email && (
                      <p className="text-sm truncate mt-0.5" style={{ color: T.muted }}>{gu.user.email}</p>
                    )}
                  </div>
                </div>
                {currentUserIsAdmin && (
                  gu.userId === group?.userId ? (
                    <div className="shrink-0 w-[140px] flex items-center justify-end text-white/80 text-sm font-medium">
                      Admin
                    </div>
                  ) : (
                    <div className="shrink-0 flex items-center gap-2 w-[200px] sm:w-[240px]">
                      <Select
                        value={displayRole}
                        onValueChange={(value) => handleRoleChange(gu.userId, value as "ADMIN" | "MEMBER")}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="flex-1 min-w-0 h-12 bg-[#17171A] text-white border border-white/20 rounded-lg px-4 focus:ring-1 focus:ring-white/40 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed [&>span]:line-clamp-1 [&>svg]:text-white/70">
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
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMemberToRemove(gu); }}
                        disabled={removeMemberMutation.isPending}
                        className="shrink-0 rounded-full border border-red-500/30 p-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        title="Remove from organization"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </Card>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-[15px] font-semibold" style={{ color: T.muted }}>
            No members yet. {currentUserIsAdmin ? "Use Add Admin above to add org admins; members join via contract." : "Ask an admin to add admins or send you a contract."}
          </p>
        </Card>
      )}

      <AnimatePresence>
        {memberToRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => !removeMemberMutation.isPending && setMemberToRemove(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 bg-[#101012] rounded-2xl border border-white/20 p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-2">Remove member?</h3>
              <p className="text-white/70 text-sm mb-6">
                {memberToRemove.user.name || memberToRemove.user.email || "This member"} will be removed from the organization and will lose access.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMemberToRemove(null)}
                  disabled={removeMemberMutation.isPending}
                  className="flex-1 h-11 rounded-full border border-white/20 text-white hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  disabled={removeMemberMutation.isPending}
                  className="flex-1 h-11 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {removeMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
