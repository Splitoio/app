"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";
import { Loader2, Shield } from "lucide-react";
import Link from "next/link";

type GroupUser = { userId: string; user: { id: string; name: string | null; image: string | null; email: string | null }; role?: string | null };
type Org = { id: string; name: string; userId: string; groupUsers?: GroupUser[] };

function isAdmin(org: Org, currentUserId: string): boolean {
  if (org.userId === currentUserId) return true;
  const membership = org.groupUsers?.find((gu) => gu.userId === currentUserId);
  return membership?.role === "ADMIN";
}

export default function OrganizationRolesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: organizations = [], isLoading } = useGetAllOrganizations();

  const adminOrgs = organizations.filter((org) => user && isAdmin(org as Org, user.id));

  // Only admins can access this page; redirect others to organization dashboard
  useEffect(() => {
    if (isLoading || !user) return;
    if (adminOrgs.length === 0) {
      router.replace("/organization");
    }
  }, [isLoading, user, adminOrgs.length, router]);

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="w-full -mt-2"
    >
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4">
        <h1 className="text-mobile-base sm:text-xl font-medium text-white">
          Manage roles
        </h1>
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
        ) : adminOrgs.length === 0 ? (
          <div className="text-center py-12 text-white/70 text-mobile-base sm:text-base">
            Redirecting… Only organization admins can manage roles.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-white/60 text-mobile-sm sm:text-base mb-4">
              Select an organization to manage member roles (Admin / Member).
            </p>
            {adminOrgs.map((org) => (
              <Link
                key={org.id}
                href={`/organization/roles/${org.id}`}
                className="flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-xl bg-white/[0.03] shrink-0 flex items-center justify-center">
                    <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white/60" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-mobile-base sm:text-xl text-white font-medium truncate">{org.name}</p>
                    <p className="text-mobile-sm sm:text-base text-white/60">
                      {org.groupUsers?.length ?? 0} member{(org.groupUsers?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <span className="text-white/50 text-mobile-sm sm:text-base shrink-0">Manage →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
