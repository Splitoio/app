"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { UserMinus, Loader2, UserPlus, Crown, User } from "lucide-react";
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
    <div className="w-full space-y-5 sm:space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-white">Members</h1>
          <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>
            {isLoading ? "Loading…" : `${members.length} member${members.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {currentUserIsAdmin && (
          <button
            onClick={openAddMember}
            className="flex items-center gap-2 rounded-xl h-10 px-4 text-[13px] font-extrabold transition-all hover:opacity-90"
            style={{ background: A, color: "#0a0a0a" }}
          >
            <UserPlus className="h-4 w-4" /> Add member
          </button>
        )}
      </div>

      {currentUserIsAdmin && (
        <p className="text-[13px] mb-5" style={{ color: T.muted }}>
          Admins can manage roles, invoices, and organization settings. Members can raise invoices.
        </p>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      )}

      {/* ── Empty ── */}
      {!isLoading && members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-[48px] mb-4">👥</div>
          <h2 className="text-[16px] font-bold text-white mb-2">No members yet</h2>
          <p className="text-[13px] mb-5" style={{ color: T.muted }}>
            {currentUserIsAdmin
              ? "Add admins above. Regular members join by accepting a contract."
              : "Ask an admin to send you a contract."}
          </p>
          {currentUserIsAdmin && (
            <button onClick={openAddMember}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-extrabold transition-all hover:opacity-90"
              style={{ background: A, color: "#0a0a0a" }}>
              <UserPlus className="h-4 w-4" /> Add member
            </button>
          )}
        </div>
      )}

      {/* ── Member list ── */}
      {!isLoading && members.length > 0 && (
        <div className="w-full mb-5 sm:mb-6">
          <SectionLabel className="mb-3">Team members</SectionLabel>
          <Card className="w-full p-0 overflow-hidden">
          {members.map((gu) => {
            const displayRole = gu.role ?? (group?.userId === gu.userId ? "ADMIN" : "MEMBER");
            const isCurrentUser = gu.userId === user?.id;
            const isOwner = gu.userId === group?.userId;
            const isAdminRole = displayRole === "ADMIN";

            return (
              <div key={gu.userId}
                className="w-full flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.015] transition-colors">

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 overflow-hidden rounded-full border border-white/[0.1]">
                    <Image
                      src={gu.user.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${gu.user.id}`}
                      alt={gu.user.name || "Member"} width={44} height={44}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {isOwner && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center" style={{ background: A }}>
                      <Crown className="h-2.5 w-2.5 text-black" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[14px] font-bold truncate" style={{ color: T.bright }}>
                      {gu.user.name || gu.user.email || "Member"}
                    </p>
                    {isCurrentUser && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: T.dim }}>you</span>
                    )}
                  </div>
                  {gu.user.email && (
                    <p className="text-[12px] truncate mt-0.5" style={{ color: T.dim }}>{gu.user.email}</p>
                  )}
                </div>

                {/* Role / Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentUserIsAdmin ? (
                    isOwner ? (
                      <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${A}18`, color: A, border: `1px solid ${A}30` }}>
                        Owner
                      </span>
                    ) : (
                      <>
                        <div className="w-[120px] sm:w-[130px]">
                          <Select
                            value={displayRole}
                            onValueChange={(value) => handleRoleChange(gu.userId, value as "ADMIN" | "MEMBER")}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="h-8 text-[12px] bg-white/[0.05] text-white border border-white/[0.1] rounded-lg px-3 focus:ring-1 focus:ring-white/20 focus:outline-none disabled:opacity-50 [&>svg]:text-white/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#17171A] border border-white/10 rounded-lg shadow-xl">
                              {ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}
                                  className="text-[13px] text-white hover:bg-white/5 focus:bg-white/5 focus:text-white data-[highlighted]:bg-white/5 cursor-pointer">
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setMemberToRemove(gu); }}
                          disabled={removeMemberMutation.isPending}
                          className="h-8 w-8 rounded-lg flex items-center justify-center border border-red-500/20 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 disabled:opacity-50 transition-all"
                          title="Remove member"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )
                  ) : (
                    <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                      style={isAdminRole
                        ? { background: `${A}15`, color: A, border: `1px solid ${A}25` }
                        : { background: "rgba(255,255,255,0.06)", color: T.muted, border: "1px solid rgba(255,255,255,0.09)" }}>
                      {isAdminRole ? "Admin" : "Member"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          </Card>
        </div>
      )}

      {/* ── Remove confirm modal ── */}
      <AnimatePresence>
        {memberToRemove && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => !removeMemberMutation.isPending && setMemberToRemove(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  <UserMinus className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold" style={{ color: T.bright }}>Remove member?</h3>
                  <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>This cannot be undone</p>
                </div>
              </div>
              <p className="text-[13px] mb-5" style={{ color: T.body }}>
                <span className="font-semibold" style={{ color: T.bright }}>{memberToRemove.user.name || memberToRemove.user.email || "This member"}</span> will lose access to the organization.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setMemberToRemove(null)} disabled={removeMemberMutation.isPending}
                  className="flex-1 h-11 rounded-xl border font-semibold text-[13px] transition-all hover:bg-white/5 disabled:opacity-50"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: T.body }}>
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmRemove} disabled={removeMemberMutation.isPending}
                  className="flex-1 h-11 rounded-xl font-bold text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "rgba(248,113,113,0.15)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}>
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
