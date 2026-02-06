"use client";

import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";
import { Loader2 } from "lucide-react";

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
    <motion.div variants={fadeIn} initial="initial" animate="animate" className="w-full -mt-2">
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4">
        <h1 className="text-mobile-base sm:text-xl font-medium text-white">Members</h1>
        <button
          onClick={() => router.push("/settings")}
          className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5 hover:from-purple-500/30 hover:to-blue-500/30 transition-all cursor-pointer"
        >
          <div className="h-full w-full rounded-full overflow-hidden bg-[#0f0f10]">
            {user?.image ? (
              <Image src={user.image} alt="Profile" width={56} height={56} className="h-full w-full object-cover" />
            ) : (
              <Image
                src={`https://api.dicebear.com/9.x/identicon/svg?seed=${user?.id || user?.email || "user"}`}
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
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </div>
        ) : members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full">
                    <Image
                      src={member.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${member.id}`}
                      alt={member.name || "Member"}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-mobile-base sm:text-xl text-white font-medium">{member.name || member.email || "Member"}</p>
                    <p className="text-mobile-sm sm:text-base text-white/60">{member.orgNames.join(", ")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-white/70 text-mobile-base sm:text-base">
            No members yet. Create an organization and add members to see them here.
          </div>
        )}
      </div>
    </motion.div>
  );
}
