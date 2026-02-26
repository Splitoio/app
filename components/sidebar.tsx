"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Users2,
  UserPlus,
  LayoutDashboard,
  ChevronLeft,
  ChevronsUpDown,
  Plus,
  LogOut,
  TrendingUp,
  Activity,
  FileSignature,
  FileText,
  UserCircle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileMenu } from "@/contexts/mobile-menu";
import { useAuthStore } from "@/stores/authStore";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";
import { useGetAllGroups } from "@/features/groups/hooks/use-create-group";
import { signOut } from "@/lib/auth";
import { APP_MODE } from "@/lib/app-mode";
import { motion, AnimatePresence } from "framer-motion";

function isOrgAdmin(
  org: { userId: string; groupUsers?: { userId: string; role?: string | null }[] },
  currentUserId: string
): boolean {
  if (org.userId === currentUserId) return true;
  const membership = org.groupUsers?.find((gu) => gu.userId === currentUserId);
  return membership?.role === "ADMIN";
}

const dropdownVariants = {
  hidden: { opacity: 0, y: 4, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 4, scale: 0.98 },
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isOrganizationMode =
    APP_MODE === "organization" || pathname.startsWith("/organization");
  const { isOpen, close } = useMobileMenu();
  const { user } = useAuthStore();
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const orgSwitcherRef = useRef<HTMLDivElement>(null);

  const { data: organizations = [], isError: isOrgsError } = useGetAllOrganizations({
    enabled: isOrganizationMode && !!user,
  });
  const { data: groups = [] } = useGetAllGroups({ type: "PERSONAL" });
  const logo = "/logo.svg";

  const orgPathMatch = pathname.match(/^\/organization\/([^/]+)\/(invoices|streams|activity|contracts|members|settings)$/);
  const currentOrgId = orgPathMatch?.[1] ?? null;
  const currentOrgTab = orgPathMatch?.[2] ?? "invoices";
  const linkOrgId = currentOrgId ?? organizations[0]?.id ?? null;
  const currentOrg = (currentOrgId ? organizations.find((o) => o.id === currentOrgId) : organizations[0]) ?? null;
  const isAdminOfLinkOrg = !!currentOrg && !!user && isOrgAdmin(currentOrg, user.id);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orgSwitcherRef.current && !orgSwitcherRef.current.contains(e.target as Node)) {
        setOrgSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    close();
    setOrgSwitcherOpen(false);
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
            <button
              onClick={close}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-[#17171A] text-white/70 hover:text-white transition-colors min-[1025px]:hidden"
              aria-label="Close menu"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Main Navigation */}
          <div className="flex-1 space-y-1 px-4 py-4 sm:py-6 overflow-y-auto">
            {/* Dashboard */}
            <Link
              id="sidebar-dashboard-link"
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

            {/* ── Organization mode: connection error hint when APIs fail ── */}
            {isOrganizationMode && !linkOrgId && isOrgsError && (
              <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-200/90 text-xs font-medium">Couldn&apos;t load organizations</p>
                <Link
                  href="/organization"
                  onClick={close}
                  className="text-amber-300/80 text-xs hover:text-amber-200 mt-0.5 inline-block underline"
                >
                  View details on dashboard →
                </Link>
              </div>
            )}

            {/* ── Organization mode links ── */}
            {isOrganizationMode && linkOrgId && (
              <>
                <Link
                  id="sidebar-org-invoices-link"
                  href={`/organization/${linkOrgId}/invoices`}
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
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
                    id="sidebar-org-streams-link"
                    href={`/organization/${linkOrgId}/streams`}
                    onClick={close}
                    className={cn(
                      "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                      pathname === `/organization/${linkOrgId}/streams`
                        ? "bg-white/[0.07] text-white shadow-sm"
                        : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <TrendingUp className="h-5 w-5" strokeWidth={1.5} />
                    Streams
                  </Link>
                )}

                {isAdminOfLinkOrg && (
                  <Link
                    id="sidebar-org-activity-link"
                    href={`/organization/${linkOrgId}/activity`}
                    onClick={close}
                    className={cn(
                      "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                      pathname === `/organization/${linkOrgId}/activity`
                        ? "bg-white/[0.07] text-white shadow-sm"
                        : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <Activity className="h-5 w-5" strokeWidth={1.5} />
                    Activity
                  </Link>
                )}

                <Link
                  id="sidebar-org-contracts-link"
                  href={`/organization/${linkOrgId}/contracts`}
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                    pathname === `/organization/${linkOrgId}/contracts`
                      ? "bg-white/[0.07] text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <FileSignature className="h-5 w-5" strokeWidth={1.5} />
                  Contracts
                </Link>

                {isAdminOfLinkOrg && (
                  <Link
                    id="sidebar-org-members-link"
                    href={`/organization/${linkOrgId}/members`}
                    onClick={close}
                    className={cn(
                      "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                      pathname === `/organization/${linkOrgId}/members`
                        ? "bg-white/[0.07] text-white shadow-sm"
                        : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <UserPlus className="h-5 w-5" strokeWidth={1.5} />
                    Members
                  </Link>
                )}

                <Link
                  id="sidebar-org-settings-link"
                  href={`/organization/${linkOrgId}/settings`}
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                    pathname === `/organization/${linkOrgId}/settings`
                      ? "bg-white/[0.07] text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <Settings className="h-5 w-5" strokeWidth={1.5} />
                  Settings
                </Link>
              </>
            )}

            {/* ── Personal mode links ── */}
            {!isOrganizationMode && (
              <>
                <Link
                  id="sidebar-groups-link"
                  href="/groups"
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                    pathname === "/groups" || pathname.startsWith("/groups/")
                      ? "bg-white/[0.07] text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <Users2 className="h-5 w-5" strokeWidth={1.5} />
                  My Groups
                </Link>
                <Link
                  id="sidebar-friends-link"
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
                <Link
                  id="sidebar-settings-link"
                  href="/settings"
                  onClick={close}
                  className={cn(
                    "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                    pathname === "/settings"
                      ? "bg-white/[0.07] text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <Settings className="h-5 w-5" strokeWidth={1.5} />
                  Settings
                </Link>
              </>
            )}
          </div>

          {/* Bottom Section */}
          <div className="p-4 mt-auto space-y-1">
            {/* Follow us */}
            <a
              id="sidebar-follow-us-link"
              href="https://x.com/splitodotio"
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all text-white/60 hover:bg-white/[0.04] hover:text-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Follow us
            </a>

            {/* Organization mode: org switcher at bottom */}
            {isOrganizationMode && (
              <div className="relative" ref={orgSwitcherRef}>
                <button
                  id="sidebar-org-switcher-button"
                  type="button"
                  onClick={() => setOrgSwitcherOpen((v) => !v)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left",
                    "text-white/90 hover:bg-[#17171A] hover:text-white",
                    orgSwitcherOpen && "bg-[#17171A] text-white"
                  )}
                >
                  {/* Org avatar */}
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white">
                    {currentOrg
                      ? currentOrg.name.charAt(0).toUpperCase()
                      : "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-mobile-sm sm:text-sm font-medium truncate">
                      {currentOrg?.name ?? "Select organization"}
                    </p>
                    <p className="text-xs text-white/50 truncate">Organization</p>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/50" strokeWidth={1.5} />
                </button>

                <AnimatePresence>
                  {orgSwitcherOpen && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute left-0 right-0 bottom-full mb-1 rounded-xl bg-[#17171A] border border-white/10 shadow-xl py-2 z-[1001] max-h-[320px] overflow-y-auto"
                    >
                      <div className="px-4 py-2 mb-1">
                        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Organizations</p>
                      </div>

                      {organizations.length === 0 ? (
                        <div className="px-4 py-3 text-sm">
                          {isOrgsError ? (
                            <span className="text-amber-400/90">Connection error. See dashboard for details.</span>
                          ) : (
                            <span className="text-white/60">No organizations</span>
                          )}
                        </div>
                      ) : (
                        organizations.map((org) => (
                          <Link
                            key={org.id}
                            href={`/organization/${org.id}/${currentOrgTab}`}
                            onClick={() => { close(); setOrgSwitcherOpen(false); }}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                              org.id === currentOrgId
                                ? "bg-white/10 text-white"
                                : "text-white/90 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold shrink-0">
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{org.name}</span>
                          </Link>
                        ))
                      )}

                      <Link
                        id="sidebar-create-org-link"
                        href="/organization/create"
                        onClick={() => { close(); setOrgSwitcherOpen(false); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Plus className="h-4 w-4" strokeWidth={1.5} />
                        Create organization
                      </Link>

                      <div className="border-t border-white/10 mt-2 pt-2">
                        <Link
                          href="/organization/organizations"
                          onClick={() => { close(); setOrgSwitcherOpen(false); }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          Manage all organizations
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
