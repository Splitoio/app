"use client";

import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";
import { Loader2 } from "lucide-react";
import { Card, SectionLabel, T } from "@/lib/splito-design";

export default function OrganizationMembersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: organizations = [], isLoading } = useGetAllOrganizations();

  const membersMap = new Map<
    string,
    { id: string; name: string | null; image: string | null; email: string | null; orgNames: string[] }
  >();
  organizations.forEach((org) => {
    (org.groupUsers || []).forEach((gu: { user: { id: string; name: string | null; image: string | null; email?: string | null } }) => {
      const u = gu.user;
      if (u.id === user?.id) return;
      if (!membersMap.has(u.id)) {
        membersMap.set(u.id, { id: u.id, name: u.name ?? null, image: u.image ?? null, email: u.email ?? null, orgNames: [] });
      }
      const entry = membersMap.get(u.id)!;
      entry.orgNames.push(org.name);
    });
  });
  const members = Array.from(membersMap.values());

  return (
    <motion.div variants={fadeIn} initial="initial" animate="animate" className="w-full flex flex-col min-w-0">
      <div className="border-b border-white/[0.07] flex items-center justify-between h-14 sm:h-[70px] px-4 sm:px-7 sticky top-0 bg-[#0b0b0b]/95 backdrop-blur-xl z-10">
        <h1 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-white">Team members</h1>
        <button
          onClick={() => router.push("/settings")}
          className="h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-full flex-shrink-0 border border-white/[0.1]"
        >
          {user?.image ? (
            <Image src={user.image} alt="Profile" width={40} height={40} className="h-full w-full object-cover" />
          ) : (
            <Image src={`https://api.dicebear.com/9.x/identicon/svg?seed=${user?.id || user?.email || "user"}`} alt="Profile" width={40} height={40} className="h-full w-full" />
          )}
        </button>
      </div>

      <div className="flex-1 p-4 sm:p-7 overflow-y-auto">
        <SectionLabel className="mb-3">All members</SectionLabel>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          </div>
        ) : members.length > 0 ? (
          <Card className="p-0 overflow-hidden">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.015] transition-colors">
                <div className="h-10 w-10 overflow-hidden rounded-full flex-shrink-0 border border-white/[0.08]">
                  <Image src={member.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${member.id}`} alt={member.name || "Member"} width={40} height={40} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold truncate" style={{ color: T.bright }}>{member.name || member.email || "Member"}</p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: T.dim }}>{member.orgNames.join(", ")}</p>
                </div>
              </div>
            ))}
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[48px] mb-4">👥</div>
            <h2 className="text-[16px] font-bold text-white mb-2">No members yet</h2>
            <p className="text-[13px]" style={{ color: T.muted }}>Create an organization and add members to see them here.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
