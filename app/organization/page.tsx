"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";
import { useGetInvoicesByOrganization } from "@/features/business/hooks/use-invoices";
import { useGetContractsByOrganization } from "@/features/business/hooks/use-contracts";
import { useGetStreamsByOrganization } from "@/features/business/hooks/use-streams";
import { Loader2, UserPlus, Building2, FileText, TrendingUp, FileSignature, ChevronsUpDown, Plus } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { OrganizationConnectionError } from "@/components/organization-connection-error";
import { ContractNotifications } from "@/components/contract-notifications";
import { Card, SectionLabel, StatBox, T, A, Avatar } from "@/lib/splito-design";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function getConnectionErrorMessage(error: unknown): string {
  const msg = typeof (error as { message?: string })?.message === "string"
    ? (error as { message: string }).message
    : "";
  if (msg.toLowerCase().includes("cors") || msg === "Network Error" || msg.includes("Failed to fetch")) {
    return "The server couldn't be reached. Check that the backend is running and CORS is configured for this origin.";
  }
  return msg || "We couldn't load your organizations. The backend may be down or there may be a network issue.";
}

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

export default function OrganizationDashboardPage() {
  const { user } = useAuthStore();
  const [mobileOrgSwitcherOpen, setMobileOrgSwitcherOpen] = useState(false);
  const mobileOrgSwitcherRef = useRef<HTMLDivElement>(null);
  const { data: organizations = [], isLoading: isOrgsLoading, isError: isOrgsError, error: orgsError } = useGetAllOrganizations();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileOrgSwitcherRef.current && !mobileOrgSwitcherRef.current.contains(e.target as Node)) {
        setMobileOrgSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const orgIds = organizations.map((o) => o.id);
  const selectedOrgId = orgIds[0] ?? "";
  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
  const hasAdminOrg = organizations.some((o) => isOrgAdmin(o, user?.id ?? ""));
  const isAdminOfSelectedOrg = selectedOrg ? isOrgAdmin(selectedOrg, user?.id ?? "") : false;

  const { data: invoicesForOrg = [] } = useGetInvoicesByOrganization(isAdminOfSelectedOrg ? selectedOrgId : "");
  const { data: contractsForOrg = [], isLoading: contractsLoading } = useGetContractsByOrganization(selectedOrgId);

  const { data: streamsForOrg = [], isLoading: streamsLoading } = useGetStreamsByOrganization(selectedOrgId, {
    enabled: !!selectedOrgId && isAdminOfSelectedOrg,
  });

  const memberCountForOrg = selectedOrg ? (selectedOrg.groupUsers?.length ?? 0) : 0;
  const totalStreamsCount = streamsForOrg.length;
  const expectedUsd = streamsForOrg
    .filter((s) => s.currency === "USD" && s.expectedAmount != null)
    .reduce((sum, s) => sum + (s.expectedAmount ?? 0), 0);
  const streamsWithAmount = streamsForOrg.filter((s) => s.expectedAmount != null).length;

  const totalOutstanding = invoicesForOrg
    .filter((i) => i.status === "SENT" || i.status === "OVERDUE" || i.status === "APPROVED")
    .reduce((sum, i) => sum + i.amount, 0);
  const currencyFirst = invoicesForOrg[0]?.currency ?? "USD";
  const pendingCount = invoicesForOrg.filter(
    (i) => i.status === "DRAFT" || i.status === "SENT" || i.status === "OVERDUE" || i.status === "APPROVED"
  ).length;
  const totalInvoicesForOrg = invoicesForOrg.length;

  const membersMap = new Map<string, { id: string; name: string | null; image: string | null; email: string | null; orgNames: string[] }>();
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

  if (isOrgsError) {
    return (
      <div className="w-full py-8">
        <OrganizationConnectionError message={getConnectionErrorMessage(orgsError)} />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col min-w-0">
      <div
        className="border-b border-white/[0.07] flex items-center justify-between gap-3 h-14 sm:h-[70px] px-4 sm:px-7 sticky top-0 bg-[#0b0b0b]/95 backdrop-blur-xl z-10"
      >
        {/* Mobile: org switcher; Desktop: "Organization dashboard" */}
        <div className="my-10 min-w-0 flex-1 flex items-center min-[1025px]:flex-initial">
          <div className="hidden sm:block">
            <h1 className="text-[18px] sm:text-[20px] font-extrabold tracking-[-0.02em] text-white">
              {isOrgsLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: T.muted }} />
                  Loading...
                </span>
              ) : (
                "Organization dashboard"
              )}
            </h1>
          </div>
          <div className="relative sm:hidden flex-1 min-w-0 max-w-[calc(100%-100px)]" ref={mobileOrgSwitcherRef}>
            {isOrgsLoading ? (
              <span className="flex items-center gap-2 text-white">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: T.muted }} />
                Loading...
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMobileOrgSwitcherOpen((v) => !v)}
                  className={cn(
                    "flex w-full items-center gap-2 py-2 pr-2.5 pl-2.5 rounded-xl text-left transition-colors",
                    "bg-white/[0.05] border border-white/[0.07]",
                    "hover:bg-white/[0.07] hover:border-white/[0.1]",
                    mobileOrgSwitcherOpen && "bg-white/[0.07] border-white/[0.1]"
                  )}
                  style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
                >
                  <Avatar
                    init={selectedOrg ? selectedOrg.name.charAt(0).toUpperCase() : "?"}
                    color={A}
                    size={32}
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="text-[13px] font-bold truncate text-white leading-tight">
                      {selectedOrg?.name ?? "Select organization"}
                    </p>
                    <p className="text-[10px] truncate leading-tight mt-0.5" style={{ color: T.muted }}>Organization</p>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60 ml-0.5" style={{ color: T.muted }} strokeWidth={1.5} />
                </button>
                <AnimatePresence>
                  {mobileOrgSwitcherOpen && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute left-0 top-full mt-1 rounded-xl bg-[#17171A] border border-white/10 shadow-xl py-2 z-[1001] max-h-[280px] overflow-y-auto min-w-[200px]"
                    >
                      <div className="px-4 py-2 mb-1">
                        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Organizations</p>
                      </div>
                      {organizations.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-white/60">No organizations</div>
                      ) : (
                        organizations.map((org) => (
                          <Link
                            key={org.id}
                            href={`/organization/${org.id}/invoices`}
                            onClick={() => setMobileOrgSwitcherOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                              org.id === selectedOrgId
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
                        href="/organization/create"
                        onClick={() => setMobileOrgSwitcherOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Plus className="h-4 w-4" strokeWidth={1.5} />
                        Create organization
                      </Link>
                      <div className="border-t border-white/10 mt-2 pt-2">
                        <Link
                          href="/organization/organizations"
                          onClick={() => setMobileOrgSwitcherOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          Manage all organizations
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-1">
          <ContractNotifications />
          {user && (
            <ProfileDropdown
              user={user}
              profileHref="/settings"
              avatarSizeClass="h-10 w-10 sm:h-14 sm:w-14"
            />
          )}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-7 overflow-y-auto">
      {/* Stats */}
      <div className="grid gap-4 sm:gap-5 mb-5 sm:mb-7" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <Card className="p-4 sm:p-[22px]">
          <div className="flex items-center gap-2 mb-4">
            <Building2 style={{ width: 18, height: 18, color: T.muted }} />
            <span className="text-sm font-medium" style={{ color: T.muted }}>Team</span>
          </div>
          <StatBox label="Members" value={isOrgsLoading || !selectedOrgId ? "—" : String(memberCountForOrg)} color={T.bright} />
        </Card>
        {hasAdminOrg && (
          <Card className="p-4 sm:p-[22px]">
            <div className="flex items-center gap-2 mb-4">
              <FileText style={{ width: 18, height: 18, color: T.muted }} />
              <span className="text-sm font-medium" style={{ color: T.muted }}>Invoices</span>
            </div>
            <div className="flex justify-between gap-4 flex-wrap">
              <StatBox label="Total" value={String(totalInvoicesForOrg)} color={T.bright} />
              <StatBox label="Outstanding" value={invoicesForOrg.length > 0 ? formatCurrency(totalOutstanding, currencyFirst) : "—"} color={T.bright} />
            </div>
            {pendingCount > 0 && <p className="text-xs mt-2" style={{ color: T.muted }}>{pendingCount} pending</p>}
          </Card>
        )}
        {selectedOrgId && isAdminOfSelectedOrg && (
          <Card className="p-4 sm:p-[22px]">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp style={{ width: 18, height: 18, color: T.muted }} />
              <span className="text-sm font-medium" style={{ color: T.muted }}>Income streams</span>
            </div>
            <div className="flex justify-between gap-4 flex-wrap">
              <StatBox label="Streams" value={streamsLoading ? "—" : String(totalStreamsCount)} color={T.bright} />
              <StatBox label="Amount (USD)" value={streamsLoading ? "—" : expectedUsd > 0 ? formatCurrency(expectedUsd, "USD") : "—"} color={T.bright} />
            </div>
            {!streamsLoading && streamsWithAmount > 0 && <p className="text-xs mt-2" style={{ color: T.muted }}>{streamsWithAmount} with amount</p>}
          </Card>
        )}
        {hasAdminOrg && (
          <Card className="p-4 sm:p-[22px]">
            <div className="flex items-center gap-2 mb-4">
              <FileSignature style={{ width: 18, height: 18, color: T.muted }} />
              <span className="text-sm font-medium" style={{ color: T.muted }}>Contracts</span>
            </div>
            <StatBox label="Total" value={contractsLoading ? "—" : String(contractsForOrg.length)} color={T.bright} />
            {selectedOrgId && <Link href={`/organization/${selectedOrgId}/contracts`} className="text-sm font-medium mt-2 inline-flex items-center gap-1" style={{ color: A }}>View contracts →</Link>}
          </Card>
        )}
      </div>

        <Card className="p-4 sm:p-[22px]">
          <div className="flex justify-between items-center mb-4">
            <SectionLabel>Your Members</SectionLabel>
            <Link href="/organization/members" className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium" style={{ borderColor: "rgba(255,255,255,0.2)", color: T.body }}>
              <UserPlus className="h-4 w-4" />
              <span>View All</span>
            </Link>
          </div>
          <div className="space-y-4">
          {isOrgsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: T.muted }} />
            </div>
          ) : members.length > 0 ? (
            members.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center gap-4 py-2.5 border-b border-white/[0.06] last:border-b-0">
                <div className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full flex-shrink-0 border border-white/[0.08]">
                  <Image src={member.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${member.id}`} alt={member.name || "Member"} width={48} height={48} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold truncate" style={{ color: T.bright }}>{member.name || member.email || "Member"}</p>
                  <p className="text-[13px] font-medium truncate" style={{ color: T.muted }}>{member.orgNames.join(", ")}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-6 text-sm" style={{ color: T.body }}>No members yet. Create an organization and add members to get started.</p>
          )}
        </div>
        </Card>
      </div>
    </div>
  );
}
