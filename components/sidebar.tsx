"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Users2,
  UserPlus,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronsUpDown,
  ChevronDown,
  Briefcase,
  UserCircle,
  LogOut,
  FileText,
  TrendingUp,
  Activity,
  FileSignature,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileMenu } from "@/contexts/mobile-menu";
import { useAuthStore } from "@/stores/authStore";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";
import { useGetAllGroups } from "@/features/groups/hooks/use-create-group";
import { signOut } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";

function isOrgAdmin(
  org: { userId: string; groupUsers?: { userId: string; role?: string | null }[] },
  currentUserId: string
): boolean {
  if (org.userId === currentUserId) return true;
  const membership = org.groupUsers?.find((gu) => gu.userId === currentUserId);
  return membership?.role === "ADMIN";
}

const profileDropdownVariants = {
  hidden: { opacity: 0, x: -4, scale: 0.98 },
  visible: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -4, scale: 0.98 },
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isOrganizationMode = pathname.startsWith("/organization");
  const { isOpen, close } = useMobileMenu();
  const { user } = useAuthStore();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const { data: organizations = [] } = useGetAllOrganizations({
    enabled: isOrganizationMode && !!user,
  });
  const { data: groups = [] } = useGetAllGroups({ type: "PERSONAL" });
  const logo = "/logo.svg";

  const orgPathMatch = pathname.match(/^\/organization\/([^/]+)\/(invoices|streams|activity|contracts|members)$/);
  const currentOrgId = orgPathMatch?.[1] ?? null;
  const currentOrgTab = orgPathMatch?.[2] ?? "invoices";
  const linkOrgId = currentOrgId ?? organizations[0]?.id ?? null;
  const currentOrg = (currentOrgId ? organizations.find((o) => o.id === currentOrgId) : organizations[0]) ?? null;
  const isAdminOfLinkOrg = !!currentOrg && !!user && isOrgAdmin(currentOrg, user.id);

  const groupPathMatch = pathname.match(/^\/groups\/([^/]+)(?:\/(splits|activity|members))?$/);
  const currentGroupId = groupPathMatch?.[1] ?? null;
  const currentGroupTab = groupPathMatch?.[2] ?? "splits";
  const linkGroupId = currentGroupId ?? groups[0]?.id ?? null;
  const currentGroup = (currentGroupId ? groups.find((g) => g.id === currentGroupId) : groups[0]) ?? null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target as Node)) {
        setGroupDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    close();
    setProfileDropdownOpen(false);
    await signOut();
    router.push("/login");
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 brightness-50 min-[1025px]:hidden z-50"
          onClick={close}
        />
      )}

      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-[260px] bg-[#101012] transition-all duration-300 ease-in-out shadow-xl min-[1025px]:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand Section */}
          <div className="flex h-[70px] sm:h-[80px] items-center px-6 mt-2 sm:mt-4 relative">
            <Link href="https://splito.io" onClick={close} className="z-10">
              <Image src={logo} alt="Splito Logo" width={120} height={120} />
            </Link>

            {/* Close button positioned as an overlay */}
            <button
              onClick={close}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-[#17171A] text-white/70 hover:text-white transition-colors min-[1025px]:hidden"
              aria-label="Close menu"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Main Navigation */}
          <div className="flex-1 space-y-1 px-4 py-4 sm:py-6">
            <Link
              href={isOrganizationMode ? "/organization" : "/"}
              onClick={close}
              className={cn(
                "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                (isOrganizationMode ? pathname === "/organization" : pathname === "/")
                  ? "bg-white/[0.07] text-white shadow-sm"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <LayoutDashboard className="h-5 w-5" strokeWidth={1.5} />
              Dashboard
            </Link>

            {isOrganizationMode ? (
              <div className="relative" ref={orgDropdownRef}>
                <button
                  type="button"
                  onClick={() => setOrgDropdownOpen((v) => !v)}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] w-full items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                    currentOrgId ? "text-white/90" : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <Users2 className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                  <span className="truncate flex-1 text-left">
                    {currentOrg ? currentOrg.name : "Select organization"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/50" strokeWidth={1.5} />
                </button>
                <AnimatePresence>
                  {orgDropdownOpen && (
                    <motion.div
                      variants={profileDropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute left-0 right-0 top-full mt-1 rounded-xl bg-[#17171A] border border-white/10 shadow-xl py-2 z-[60] max-h-[280px] overflow-y-auto"
                    >
                      {organizations.length === 0 ? (
                        <div className="px-4 py-3 text-white/60 text-sm">No organizations</div>
                      ) : (
                        organizations.map((org) => (
                          <Link
                            key={org.id}
                            href={`/organization/${org.id}/${currentOrgTab}`}
                            onClick={() => {
                              close();
                              setOrgDropdownOpen(false);
                            }}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                              org.id === currentOrgId ? "bg-white/10 text-white" : "text-white/90 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <span className="truncate">{org.name}</span>
                          </Link>
                        ))
                      )}
                      <div className="border-t border-white/10 mt-2 pt-2">
                        <Link
                          href="/organization/organizations"
                          onClick={() => {
                            close();
                            setOrgDropdownOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white"
                        >
                          Manage all organizations
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="relative" ref={groupDropdownRef}>
                <button
                  type="button"
                  onClick={() => setGroupDropdownOpen((v) => !v)}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] w-full items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                    currentGroupId ? "text-white/90" : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <Users2 className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                  <span className="truncate flex-1 text-left">
                    {currentGroup ? currentGroup.name : "Select group"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/50" strokeWidth={1.5} />
                </button>
                <AnimatePresence>
                  {groupDropdownOpen && (
                    <motion.div
                      variants={profileDropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute left-0 right-0 top-full mt-1 rounded-xl bg-[#17171A] border border-white/10 shadow-xl py-2 z-[60] max-h-[280px] overflow-y-auto"
                    >
                      {groups.length === 0 ? (
                        <div className="px-4 py-3 text-white/60 text-sm">No groups</div>
                      ) : (
                        groups.map((group) => (
                          <Link
                            key={group.id}
                            href={`/groups/${group.id}/${currentGroupTab}`}
                            onClick={() => {
                              close();
                              setGroupDropdownOpen(false);
                            }}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                              group.id === currentGroupId ? "bg-white/10 text-white" : "text-white/90 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <span className="truncate">{group.name}</span>
                          </Link>
                        ))
                      )}
                      <div className="border-t border-white/10 mt-2 pt-2">
                        <Link
                          href="/groups"
                          onClick={() => {
                            close();
                            setGroupDropdownOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white"
                        >
                          Manage all groups
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {isOrganizationMode && linkOrgId && (
              <>
                <Link
                  href={`/organization/${linkOrgId}/invoices`}
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all pl-8",
                    pathname === `/organization/${linkOrgId}/invoices`
                      ? "bg-white/[0.07] text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <FileText className="h-5 w-5" strokeWidth={1.5} />
                  Invoices
                </Link>
                {isAdminOfLinkOrg && (
                  <Link
                    href={`/organization/${linkOrgId}/streams`}
                    onClick={close}
                    className={cn(
                      "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all pl-8",
                      pathname === `/organization/${linkOrgId}/streams`
                        ? "bg-white/[0.07] text-white shadow-sm"
                        : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <TrendingUp className="h-5 w-5" strokeWidth={1.5} />
                    Streams
                  </Link>
                )}
                <Link
                  href={`/organization/${linkOrgId}/activity`}
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all pl-8",
                    pathname === `/organization/${linkOrgId}/activity`
                      ? "bg-white/[0.07] text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <Activity className="h-5 w-5" strokeWidth={1.5} />
                  Activity
                </Link>
                <Link
                  href={`/organization/${linkOrgId}/contracts`}
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all pl-8",
                    pathname === `/organization/${linkOrgId}/contracts`
                      ? "bg-white/[0.07] text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <FileSignature className="h-5 w-5" strokeWidth={1.5} />
                  Contracts
                </Link>
                <Link
                  href={`/organization/${linkOrgId}/members`}
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all pl-8",
                    pathname === `/organization/${linkOrgId}/members`
                      ? "bg-white/[0.07] text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <UserPlus className="h-5 w-5" strokeWidth={1.5} />
                  Members
                </Link>
              </>
            )}

            {!isOrganizationMode && linkGroupId && (
              <>
                <Link
                  href={`/groups/${linkGroupId}/splits`}
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all pl-8",
                    pathname === `/groups/${linkGroupId}/splits`
                      ? "bg-white/[0.07] text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <FileText className="h-5 w-5" strokeWidth={1.5} />
                  Expenses
                </Link>
                <Link
                  href={`/groups/${linkGroupId}/activity`}
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all pl-8",
                    pathname === `/groups/${linkGroupId}/activity`
                      ? "bg-white/[0.07] text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <Activity className="h-5 w-5" strokeWidth={1.5} />
                  Activity
                </Link>
                <Link
                  href={`/groups/${linkGroupId}/members`}
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all pl-8",
                    pathname === `/groups/${linkGroupId}/members`
                      ? "bg-white/[0.07] text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <UserPlus className="h-5 w-5" strokeWidth={1.5} />
                  Members
                </Link>
              </>
            )}

            {!isOrganizationMode && (
              <Link
                href="/friends"
                onClick={close}
                className={cn(
                  "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                  pathname === "/friends"
                    ? "bg-white/[0.07] text-white shadow-sm"
                    : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <UserPlus className="h-5 w-5" strokeWidth={1.5} />
                Friends
              </Link>
            )}
          </div>

          {/* Bottom Section: Profile dropdown */}
          <div className="p-4 mt-auto">
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((v) => !v)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                  "text-white/90 hover:bg-[#17171A] hover:text-white",
                  profileDropdownOpen && "bg-[#17171A] text-white"
                )}
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10">
                  {user?.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || "User"}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white/70 text-sm font-medium">
                      {(user?.name || user?.email || "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-mobile-sm sm:text-sm font-medium truncate">
                    {user?.name || "Account"}
                  </p>
                  <p className="text-xs text-white/50 truncate">
                    {user?.email || ""}
                  </p>
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/50" strokeWidth={1.5} />
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    variants={profileDropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute left-full bottom-0 ml-1 w-[220px] rounded-xl bg-[#17171A] border border-white/10 shadow-xl py-2 z-[100]"
                  >
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10">
                          {user?.image ? (
                            <Image
                              src={user.image}
                              alt={user.name || "User"}
                              width={36}
                              height={36}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-white/70 text-sm font-medium">
                              {(user?.name || user?.email || "?")[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {user?.name || "Account"}
                          </p>
                          <p className="text-xs text-white/50 truncate">
                            {user?.email || ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        href={isOrganizationMode ? "/organization/settings" : "/settings"}
                        onClick={() => {
                          close();
                          setProfileDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Settings className="h-4 w-4 text-white/60" strokeWidth={1.5} />
                        Settings
                      </Link>
                      <Link
                        href={isOrganizationMode ? "/" : "/organization"}
                        onClick={() => {
                          close();
                          setProfileDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        {isOrganizationMode ? (
                          <UserCircle className="h-4 w-4 text-white/60" strokeWidth={1.5} />
                        ) : (
                          <Briefcase className="h-4 w-4 text-white/60" strokeWidth={1.5} />
                        )}
                        {isOrganizationMode ? "Personal mode" : "Organization mode"}
                      </Link>
                      <a
                        href="https://x.com/splitodotio"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          close();
                          setProfileDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <svg
                          className="h-4 w-4 text-white/60"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Follow us
                      </a>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <LogOut className="h-4 w-4 text-white/60" strokeWidth={1.5} />
                        Log out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
