"use client";

import Image from "next/image";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";
import { useGetInvoicesByOrganization } from "@/features/business/hooks/use-invoices";
import { useGetContractsByOrganization } from "@/features/business/hooks/use-contracts";
import { getStreamsByOrganization } from "@/features/business/api/client";
import { QueryKeys } from "@/lib/constants";
import { Loader2, Users2, UserPlus, Building2, FileText, TrendingUp, FileSignature } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

const viewAllButtonClass =
  "inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/80 px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-white/[0.06] transition-colors text-white font-medium text-mobile-sm sm:text-base whitespace-nowrap flex-shrink-0";

export default function OrganizationDashboardPage() {
  const { user } = useAuthStore();
  const { data: organizations = [], isLoading: isOrgsLoading } = useGetAllOrganizations();

  const orgIds = organizations.map((o) => o.id);
  const firstOrgId = orgIds[0];

  const { data: invoicesFirstOrg = [] } = useGetInvoicesByOrganization(firstOrgId || "");
  const { data: contractsFirstOrg = [], isLoading: contractsLoading } = useGetContractsByOrganization(firstOrgId || "");

  const adminOrgIds = organizations.filter((o) => o.userId === user?.id).map((o) => o.id);
  const streamQueries = useQueries({
    queries: adminOrgIds.map((orgId) => ({
      queryKey: [QueryKeys.STREAMS, orgId],
      queryFn: () => getStreamsByOrganization(orgId),
      enabled: !!orgId,
    })),
  });
  const allStreams = streamQueries.flatMap((q) => q.data ?? []);
  const streamsLoading = streamQueries.some((q) => q.isLoading);
  const totalStreamsCount = allStreams.length;
  const expectedUsd = allStreams
    .filter((s) => s.currency === "USD" && s.expectedAmount != null)
    .reduce((sum, s) => sum + (s.expectedAmount ?? 0), 0);
  const streamsWithAmount = allStreams.filter((s) => s.expectedAmount != null).length;

  const totalOutstanding = invoicesFirstOrg
    .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
    .reduce((sum, i) => sum + i.amount, 0);
  const currencyFirst = invoicesFirstOrg[0]?.currency ?? "USD";
  const pendingCount = invoicesFirstOrg.filter((i) => i.status === "DRAFT" || i.status === "SENT" || i.status === "OVERDUE").length;
  const totalInvoicesFirstOrg = invoicesFirstOrg.length;

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

  return (
    <div className="w-full">
      <div className="py-4 sm:py-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-mobile-base sm:text-xl text-white max-w-[60%]">
            {isOrgsLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              "Organization dashboard"
            )}
          </h2>
          <Link href="/settings" className="cursor-pointer">
            <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5 hover:opacity-80 transition-opacity">
              <div className="h-full w-full rounded-full overflow-hidden bg-[#101012]">
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
            </div>
          </Link>
        </div>
      </div>

      {/* Stats: 3 cards in a row when Streams hidden, 2x2 when Streams shown */}
      <div
        className={`grid grid-cols-1 gap-5 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 ${adminOrgIds.length > 0 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
      >
        <div className="rounded-2xl sm:rounded-3xl bg-[#101012] p-5 sm:p-6 lg:p-7 border border-white/5 min-w-0">
          <div className="flex items-center gap-2 text-white/60 mb-4">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-sm sm:text-base font-medium">Team</span>
          </div>
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-white/50 text-xs sm:text-sm">Organizations</p>
              <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums">
                {isOrgsLoading ? "—" : organizations.length}
              </p>
            </div>
            <div>
              <p className="text-white/50 text-xs sm:text-sm">Members</p>
              <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums">
                {isOrgsLoading ? "—" : members.length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl sm:rounded-3xl bg-[#101012] p-5 sm:p-6 lg:p-7 border border-white/5 min-w-0">
          <div className="flex items-center gap-2 text-white/60 mb-4">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-sm sm:text-base font-medium">Invoices</span>
          </div>
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-white/50 text-xs sm:text-sm">Total</p>
              <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums">
                {totalInvoicesFirstOrg}
              </p>
              {organizations.length > 1 && (
                <p className="text-white/50 text-xs mt-0.5">First org</p>
              )}
            </div>
            <div>
              <p className="text-white/50 text-xs sm:text-sm">Outstanding</p>
              <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums">
                {invoicesFirstOrg.length > 0 ? formatCurrency(totalOutstanding, currencyFirst) : "—"}
              </p>
              {pendingCount > 0 && (
                <p className="text-white/50 text-xs mt-0.5">{pendingCount} pending</p>
              )}
            </div>
          </div>
        </div>
        {adminOrgIds.length > 0 && (
          <div className="rounded-2xl sm:rounded-3xl bg-[#101012] p-5 sm:p-6 lg:p-7 border border-white/5 min-w-0">
            <div className="flex items-center gap-2 text-white/60 mb-4">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-sm sm:text-base font-medium">Income streams</span>
            </div>
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-white/50 text-xs sm:text-sm">Streams</p>
                <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums">
                  {streamsLoading ? "—" : totalStreamsCount}
                </p>
                {!streamsLoading && streamsWithAmount > 0 && (
                  <p className="text-white/50 text-xs mt-0.5">{streamsWithAmount} with amount</p>
                )}
              </div>
              <div>
                <p className="text-white/50 text-xs sm:text-sm">Amount (USD)</p>
                <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums">
                  {streamsLoading ? "—" : expectedUsd > 0 ? formatCurrency(expectedUsd, "USD") : "—"}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="rounded-2xl sm:rounded-3xl bg-[#101012] p-5 sm:p-6 lg:p-7 border border-white/5 min-w-0">
          <div className="flex items-center gap-2 text-white/60 mb-4">
            <FileSignature className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-sm sm:text-base font-medium">Contracts</span>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-white/50 text-xs sm:text-sm">Total (first org)</p>
              <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums">
                {contractsLoading ? "—" : contractsFirstOrg.length}
              </p>
            </div>
            {firstOrgId && (
              <Link
                href={`/organization/${firstOrgId}/contracts`}
                className="text-white/70 hover:text-white text-sm font-medium mt-1 inline-flex items-center gap-1"
              >
                View contracts
                <span className="text-white/50">→</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 sm:gap-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="rounded-2xl sm:rounded-3xl bg-[#101012] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-white">Your Members</h2>
              <Link href="/organization/members" className={viewAllButtonClass}>
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>View All</span>
              </Link>
            </div>
            <div className="space-y-4 sm:space-y-8">
              {isOrgsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-white/50" />
                </div>
              ) : members.length > 0 ? (
                members.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3">
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
                ))
              ) : (
                <div className="text-white/70 text-center py-6 sm:py-8 text-mobile-sm sm:text-base">
                  No members yet. Create an organization and add members to get started.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl bg-[#101012] p-4 sm:p-6 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-white truncate min-w-0">Your Organizations</h2>
            <Link href="/organization/organizations" className={viewAllButtonClass}>
              <Users2 className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>View All</span>
            </Link>
          </div>
          <div className="space-y-4 sm:space-y-6">
            {isOrgsLoading ? (
              <div className="flex items-center justify-center p-6 sm:p-8">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-white/50" />
              </div>
            ) : organizations.length > 0 ? (
              organizations.slice(0, 4).map((org) => (
                <Link href={`/organization/${org.id}/invoices`} key={org.id}>
                  <div className="flex items-center justify-between hover:bg-white/[0.02] p-2 sm:p-3 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-xl bg-white/[0.03]">
                        {org.image ? (
                          <Image src={org.image} alt={org.name} width={56} height={56} className="h-full w-full object-cover" />
                        ) : (
                          <Image
                            src={`https://api.dicebear.com/9.x/identicon/svg?seed=${org.id}`}
                            alt={org.name}
                            width={56}
                            height={56}
                            className="h-full w-full"
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-mobile-base sm:text-xl text-white font-medium">{org.name}</p>
                        <p className="text-mobile-sm sm:text-base text-white/60">
                          {(org.groupUsers || []).length} member{(org.groupUsers || []).length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-white/70 text-center py-6 sm:py-8 text-mobile-sm sm:text-base">
                No organizations yet. Create one to get started!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
