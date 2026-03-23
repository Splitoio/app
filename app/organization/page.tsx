"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";
import { useGetInvoicesByOrganization, useGetOrganizationAnalytics } from "@/features/business/hooks/use-invoices";
import { useGetContractsByOrganization, useGetMyContracts } from "@/features/business/hooks/use-contracts";
import { useGetStreamsByOrganization } from "@/features/business/hooks/use-streams";
import { Loader2, FileText, TrendingUp, ChevronsUpDown, Plus, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useQueries } from "@tanstack/react-query";
import { getExchangeRate } from "@/features/currencies/api/client";
import { CURRENCY_QUERY_KEYS } from "@/features/currencies/hooks/use-currencies";
import { OrganizationConnectionError } from "@/components/organization-connection-error";
import { Card, SectionLabel, T, A, G, Avatar, getUserColor } from "@/lib/splito-design";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  const router = useRouter();
  const [mobileOrgSwitcherOpen, setMobileOrgSwitcherOpen] = useState(false);
  const [chartRange, setChartRange] = useState<"week" | "month" | "year">("week");
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
  const hasAdminOrg = organizations.some((o) => isOrgAdmin(o, user?.id ?? "")); // kept for future use
  const isAdminOfSelectedOrg = selectedOrg ? isOrgAdmin(selectedOrg, user?.id ?? "") : false;

  const { data: invoicesForOrg = [] } = useGetInvoicesByOrganization(isAdminOfSelectedOrg ? selectedOrgId : "");
  const { data: memberInvoices = [] } = useGetInvoicesByOrganization(!isAdminOfSelectedOrg ? selectedOrgId : "");
  const { data: contractsForOrg = [], isLoading: contractsLoading } = useGetContractsByOrganization(selectedOrgId);
  const { data: myAllContracts = [] } = useGetMyContracts();
  const myOrgContracts = myAllContracts.filter((c) => c.organizationId === selectedOrgId);
  const { data: streamsForOrg = [], isLoading: streamsLoading } = useGetStreamsByOrganization(selectedOrgId, {
    enabled: !!selectedOrgId && isAdminOfSelectedOrg,
  });

  // User's personal currency takes priority; analytics data is in the org's own currency
  const orgCurrency = user?.currency || selectedOrg?.defaultCurrency || "USD";
  const analyticsCurrency = selectedOrg?.defaultCurrency || "USD";

  const uniqueCurrenciesOrg = Array.from(
    new Set([
      ...invoicesForOrg.map((i) => i.currency),
      ...memberInvoices.map((i) => i.currency),
      ...streamsForOrg.map((s) => s.currency),
      analyticsCurrency, // ensure analytics currency has an exchange rate
    ])
  ).filter((c) => c !== orgCurrency);
  const rateQueriesOrg = useQueries({
    queries: uniqueCurrenciesOrg.map((from) => ({
      queryKey: [CURRENCY_QUERY_KEYS.EXCHANGE_RATE, from, orgCurrency],
      queryFn: () => getExchangeRate(from, orgCurrency),
      staleTime: 1000 * 60 * 5,
      enabled: !!orgCurrency && !!from,
    })),
  });
  const rateMapOrg: Record<string, number> = { [orgCurrency]: 1 };
  uniqueCurrenciesOrg.forEach((c, i) => {
    const rate = rateQueriesOrg[i]?.data?.rate;
    if (rate != null) rateMapOrg[c] = rate;
  });
  const convert = (amount: number, currency: string) => amount * (rateMapOrg[currency] ?? 1);

  const memberCountForOrg = selectedOrg ? (selectedOrg.groupUsers?.length ?? 0) : 0;
  const totalStreamsCount = streamsForOrg.length;
  const expectedUsd = streamsForOrg
    .filter((s) => s.currency === "USD" && s.expectedAmount != null)
    .reduce((sum, s) => sum + (s.expectedAmount ?? 0), 0);

  const totalOutstanding = invoicesForOrg
    .filter((i) => i.status === "SENT" || i.status === "OVERDUE" || i.status === "APPROVED")
    .reduce((sum, i) => sum + convert(i.amount, i.currency), 0);
  const pendingCount = invoicesForOrg.filter(
    (i) => i.status === "DRAFT" || i.status === "SENT" || i.status === "OVERDUE" || i.status === "APPROVED"
  ).length;
  const totalInvoicesForOrg = invoicesForOrg.length;
  const paymentsOverdue = invoicesForOrg.filter((i) => i.status === "OVERDUE" || i.status === "APPROVED").length;
  const memberActiveInvoices = memberInvoices.filter((i) => i.status !== "PAID" && i.status !== "CLEARED" && i.status !== "DECLINED").length;
  const approvalRequestsCount = invoicesForOrg.filter((i) => i.status === "SENT").length;
  const approvalPastDueCount = invoicesForOrg.filter((i) => i.status === "SENT" && new Date(i.dueDate) < new Date()).length;

  const { data: analyticsData, isLoading: isAnalyticsLoading } = useGetOrganizationAnalytics(selectedOrgId, chartRange);
  const expenseThisMonth = convert(analyticsData?.expenseThisMonth ?? 0, analyticsCurrency);
  const totalPaid = convert(analyticsData?.totalPaid ?? 0, analyticsCurrency);
  const totalInflow = streamsForOrg.reduce((sum, s) => sum + convert(s.expectedAmount ?? 0, s.currency), 0);
  const outflowByPeriod = analyticsData?.outflowByPeriod ?? [];

  // Compute inflow per bucket from streams createdAt (same bucketing logic as backend)
  const lineChartData = outflowByPeriod.map((bucket) => {
    const bucketLabel = bucket.month;
    // Find matching streams: parse the label back to a date range for comparison
    const inflow = streamsForOrg
      .filter((s) => {
        const d = new Date(s.streamDate);
        if (chartRange === "year") {
          const label = d.toLocaleDateString("en-US", { month: "short" }) + " " + String(d.getFullYear()).slice(-2);
          return label === bucketLabel;
        }
        // week / month: label is "Mon D" (e.g. "Mar 16")
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return label === bucketLabel;
      })
      .reduce((sum, s) => sum + convert(s.expectedAmount ?? 0, s.currency), 0);
    return { month: bucketLabel, inflow, outflow: convert(bucket.outflow, analyticsCurrency) };
  });

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
      {/* ── Sticky header ── */}
      <div className="border-b py-10 border-white/[0.07] flex items-center justify-between gap-3 h-14 sm:h-[70px] px-4 sm:px-7 sticky top-0 bg-[#0b0b0b]/95 backdrop-blur-xl z-10">
        {/* Desktop title / Mobile org switcher */}
        <div className="min-w-0 flex-1 flex items-center">
          <div className="hidden sm:block">
            <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-white">
              {isOrgsLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" style={{ color: T.muted }} />Loading...</span>
              ) : "Organization"}
            </h1>
          </div>
          <div className="relative sm:hidden flex-1 min-w-0 max-w-[calc(100%-56px)]" ref={mobileOrgSwitcherRef}>
            {isOrgsLoading ? (
              <span className="flex items-center gap-2 text-white"><Loader2 className="h-5 w-5 animate-spin" style={{ color: T.muted }} />Loading...</span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMobileOrgSwitcherOpen((v) => !v)}
                  className={cn(
                    "flex w-full items-center gap-2 py-2 pr-2.5 pl-2.5 rounded-xl text-left transition-colors",
                    "bg-white/[0.05] border border-white/[0.07]",
                    mobileOrgSwitcherOpen && "bg-white/[0.07] border-white/[0.1]"
                  )}
                >
                  <Avatar init={selectedOrg ? selectedOrg.name.charAt(0).toUpperCase() : "?"} color={A} size={30} className="shrink-0" />
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="text-[13px] font-bold truncate text-white leading-tight">{selectedOrg?.name ?? "Select org"}</p>
                    <p className="text-[10px] leading-tight mt-0.5" style={{ color: T.dim }}>Organization</p>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0" style={{ color: T.muted }} strokeWidth={1.5} />
                </button>
                <AnimatePresence>
                  {mobileOrgSwitcherOpen && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden" animate="visible" exit="exit"
                      className="absolute left-0 top-full mt-1 rounded-xl bg-[#17171A] border border-white/10 shadow-xl py-2 z-[1001] max-h-[280px] overflow-y-auto min-w-[200px]"
                    >
                      <div className="px-4 py-2 mb-1">
                        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: T.dim }}>Organizations</p>
                      </div>
                      {organizations.length === 0 ? (
                        <div className="px-4 py-3 text-sm" style={{ color: T.muted }}>No organizations</div>
                      ) : organizations.map((org) => (
                        <Link key={org.id} href={`/organization/${org.id}/invoices`} onClick={() => setMobileOrgSwitcherOpen(false)}
                          className={cn("flex items-center gap-3 px-4 py-2.5 text-sm transition-colors", org.id === selectedOrgId ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5 hover:text-white")}>
                          <div className="h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{org.name}</span>
                        </Link>
                      ))}
                      <Link href="/organization/create" onClick={() => setMobileOrgSwitcherOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5" style={{ color: A }}>
                        <Plus className="h-4 w-4" strokeWidth={1.5} />
                        Create organization
                      </Link>
                      <div className="border-t border-white/[0.07] mt-2 pt-2">
                        <Link href="/organization/organizations" onClick={() => setMobileOrgSwitcherOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors">
                          Manage all
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>

        {/* User avatar → settings */}
        {user && (
          <button
            type="button"
            onClick={() => router.push("/organization/settings")}
            className="h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-full flex-shrink-0 border border-white/[0.1] transition-opacity hover:opacity-80"
          >
            {user.image ? (
              <Image src={user.image} alt="" width={40} height={40} className="h-full w-full object-cover" />
            ) : (
              <Image src={`https://api.dicebear.com/9.x/identicon/svg?seed=${user.id || user.email || "user"}`} alt="" width={40} height={40} className="h-full w-full object-cover" />
            )}
          </button>
        )}
      </div>

      <div className="flex-1 p-4 sm:p-7 overflow-y-auto">

        {/* ── Mobile page title ── */}
        <div className="sm:hidden mb-5">
          <p className="text-[13px] font-medium mb-1" style={{ color: T.muted }}>Overview</p>
          <h1 className="text-[26px] font-black tracking-[-0.04em] text-white">Organization</h1>
        </div>

        {/* ── Hero card – org summary ── */}
        {selectedOrg && (
          <div
            className="rounded-2xl sm:rounded-3xl border border-white/[0.09] p-5 sm:p-7 mb-5 sm:mb-6 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #141414 0%, #0f0f0f 100%)", boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)" }}
          >
            <div className="absolute -top-8 -right-8 w-[180px] h-[180px] rounded-full pointer-events-none" style={{ background: `${A}07` }} />
            <div className="flex items-center gap-4 mb-5">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden border border-white/[0.1] flex-shrink-0">
                <Image src={`https://api.dicebear.com/9.x/identicon/svg?seed=${selectedOrg.id}`} alt={selectedOrg.name} width={56} height={56} className="h-full w-full" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.08em] uppercase mb-1" style={{ color: T.muted }}>Active organization</p>
                <h2 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-white truncate">{selectedOrg.name}</h2>
              </div>
            </div>
            <div className="h-px mb-5" style={{ background: "rgba(255,255,255,0.07)" }} />
            {isAdminOfSelectedOrg ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
                {[
                  { label: "Members", value: String(memberCountForOrg), accent: T.bright },
                  { label: "Invoices", value: String(totalInvoicesForOrg), accent: paymentsOverdue > 0 ? "#F87171" : T.bright },
                  { label: "Streams", value: String(totalStreamsCount), accent: "#34D399" },
                  { label: "Contracts", value: String(contractsForOrg.length), accent: A },
                ].flatMap((s, i) => {
                  const el = (
                    <div key={s.label} className={cn("min-w-0",
                      (i === 1 || i === 3) ? "pl-4 sm:pl-6 border-l border-white/[0.07]" : "",
                      i === 2 ? "sm:pl-6 sm:border-l sm:border-white/[0.07]" : "",
                      (i === 0 || i === 2) ? "pr-4 sm:pr-6" : "",
                    )}>
                      <p className="text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5" style={{ color: T.dim }}>{s.label}</p>
                      <p className="text-[22px] sm:text-[24px] font-extrabold font-mono" style={{ color: s.accent }}>{s.value}</p>
                    </div>
                  );
                  if (i === 2) return [(<div key="row-sep" className="col-span-2 sm:hidden h-px my-4" style={{ background: "rgba(255,255,255,0.07)" }} />), el];
                  return [el];
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0">
                {[
                  { label: "Members", value: String(memberCountForOrg), accent: T.bright },
                  { label: "Active Invoices", value: String(memberActiveInvoices), accent: memberActiveInvoices > 0 ? "#F87171" : T.bright },
                  { label: "Contracts", value: String(myOrgContracts.length), accent: A },
                ].map((s, i) => (
                  <div key={s.label} className={cn("min-w-0",
                    i > 0 ? "pl-4 sm:pl-6 border-l border-white/[0.07]" : "",
                    i < 2 ? "pr-4 sm:pr-6" : "",
                  )}>
                    <p className="text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5" style={{ color: T.dim }}>{s.label}</p>
                    <p className="text-[22px] sm:text-[24px] font-extrabold font-mono" style={{ color: s.accent }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Admin: Needs attention + Team members ── */}
        {isAdminOfSelectedOrg && ((paymentsOverdue > 0 || approvalRequestsCount > 0) || members.length > 0) && (
          <div className="mb-5 sm:mb-6">
            {(paymentsOverdue > 0 || approvalRequestsCount > 0) && (
              <div className="mb-5 sm:mb-6">
                <SectionLabel className="mb-3">Needs attention</SectionLabel>
                <div className="space-y-2">
                  {paymentsOverdue > 0 && (
                    <Link href={`/organization/${selectedOrgId}/invoices`}
                      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 transition-colors hover:opacity-90"
                      style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(248,113,113,0.15)" }}>
                          <AlertCircle className="h-4 w-4 text-red-400" />
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-red-400">{paymentsOverdue} overdue payment{paymentsOverdue !== 1 ? "s" : ""}</p>
                          <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>{formatCurrency(totalOutstanding, orgCurrency)} outstanding</p>
                        </div>
                      </div>
                      <span className="text-[12px] font-extrabold px-3 py-1.5 rounded-lg shrink-0" style={{ background: "#F87171", color: "#0a0a0a" }}>Pay now</span>
                    </Link>
                  )}
                  {approvalRequestsCount > 0 && (
                    <Link href={`/organization/${selectedOrgId}/invoices`}
                      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 transition-colors hover:opacity-90"
                      style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.18)" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,211,238,0.12)" }}>
                          <FileText className="h-4 w-4" style={{ color: A }} />
                        </div>
                        <div>
                          <p className="text-[14px] font-bold" style={{ color: A }}>{approvalRequestsCount} approval request{approvalRequestsCount !== 1 ? "s" : ""}</p>
                          {approvalPastDueCount > 0 && <p className="text-[12px] font-medium mt-0.5 text-red-400/80">{approvalPastDueCount} past due</p>}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: T.muted }} />
                    </Link>
                  )}
                </div>
              </div>
            )}
            {members.length > 0 && (
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: T.soft }}>Team members</p>
                  <Link href="/organization/members" className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors hover:opacity-80" style={{ color: A }}>
                    View all <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <Card className="p-0 overflow-hidden">
                  {members.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] last:border-b-0">
                      <div className="h-9 w-9 overflow-hidden rounded-full flex-shrink-0 border border-white/[0.08]">
                        <Image src={member.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${member.id}`} alt={member.name || "Member"} width={36} height={36} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold truncate" style={{ color: T.bright }}>{member.name || member.email || "Member"}</p>
                        <p className="text-[11px] truncate mt-0.5" style={{ color: T.dim }}>{member.orgNames.join(", ")}</p>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ── Member: My invoices + My contracts ── */}
        {!isAdminOfSelectedOrg && selectedOrgId && (
          <div className="mb-5 sm:mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* My invoices */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: T.soft }}>My invoices</p>
                <Link href={`/organization/${selectedOrgId}/invoices`} className="flex items-center gap-1 text-[12px] font-semibold hover:opacity-80" style={{ color: A }}>
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {memberInvoices.length === 0 ? (
                <div className="rounded-2xl px-5 py-6 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[13px]" style={{ color: T.muted }}>No invoices raised yet</p>
                </div>
              ) : (
                <Card className="p-0 overflow-hidden">
                  {memberInvoices.slice(0, 5).map((inv) => {
                    const badge = (() => {
                      switch (inv.status) {
                        case "APPROVED": return { label: "Approved", color: "#34D399" };
                        case "PAID":     return { label: "Paid",     color: "#34D399" };
                        case "SENT":     return { label: "Sent",     color: A };
                        case "DECLINED": return { label: "Declined", color: "#F87171" };
                        case "OVERDUE":  return { label: "Overdue",  color: "#F87171" };
                        case "CLEARED":  return { label: "Cleared",  color: T.muted };
                        default:         return { label: inv.status, color: T.muted };
                      }
                    })();
                    return (
                      <Link key={inv.id} href={`/organization/${selectedOrgId}/invoices`}
                        className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.015] transition-colors">
                        <div className="h-9 w-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <FileText className="h-4 w-4" style={{ color: T.dim }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: T.bright }}>
                            {formatCurrency(convert(inv.amount, inv.currency), orgCurrency)}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>
                            Due {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: badge.color, background: `${badge.color}18`, border: `1px solid ${badge.color}30` }}>
                          {badge.label}
                        </span>
                      </Link>
                    );
                  })}
                </Card>
              )}
            </div>

            {/* My contracts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: T.soft }}>My contracts</p>
                <Link href={`/organization/${selectedOrgId}/contracts`} className="flex items-center gap-1 text-[12px] font-semibold hover:opacity-80" style={{ color: A }}>
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {myOrgContracts.length === 0 ? (
                <div className="rounded-2xl px-5 py-6 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[13px]" style={{ color: T.muted }}>No contracts assigned</p>
                </div>
              ) : (
                <Card className="p-0 overflow-hidden">
                  {myOrgContracts.slice(0, 5).map((contract) => {
                    const signed = !!contract.signedAt;
                    return (
                      <Link key={contract.id} href={`/organization/${selectedOrgId}/contracts`}
                        className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.015] transition-colors">
                        <div className="h-9 w-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: signed ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${signed ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.07)"}` }}>
                          <FileText className="h-4 w-4" style={{ color: signed ? "#34D399" : T.dim }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: T.bright }}>
                            {contract.title || "Contract"}
                          </p>
                          {contract.compensationAmount != null && (
                            <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>
                              {formatCurrency(contract.compensationAmount, contract.compensationCurrency ?? orgCurrency)}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ color: signed ? "#34D399" : T.muted, background: signed ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)", border: `1px solid ${signed ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.09)"}` }}>
                          {signed ? "Signed" : "Pending"}
                        </span>
                      </Link>
                    );
                  })}
                </Card>
              )}
            </div>
            </div>{/* end grid */}
          </div>
        )}

        {/* ── Admin: Financial overview ── */}
        {isAdminOfSelectedOrg && selectedOrgId && (
          <div className="mb-6">
            <SectionLabel className="mb-3">Financial overview</SectionLabel>
            {isAnalyticsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-white/40" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Chart: two columns */}
                <Card className="lg:col-span-2 p-4 sm:p-5 min-w-0">
                  <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <h3 className="text-[14px] font-bold" style={{ color: T.bright }}>Inflow vs outflow</h3>
                    <div className="flex items-center gap-3">
                      {/* Range tabs */}
                      <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                        {(["week", "month", "year"] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setChartRange(r)}
                            className="px-3 py-1 text-[11px] font-semibold transition-colors capitalize"
                            style={{
                              background: chartRange === r ? "rgba(255,255,255,0.1)" : "transparent",
                              color: chartRange === r ? T.bright : T.muted,
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      {/* Legend */}
                      <div className="flex gap-4 text-[11px]" style={{ color: T.muted }}>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-0.5 rounded-full" style={{ background: G }} />
                          Inflow
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-0.5 rounded-full" style={{ background: "#F87171" }} />
                          Outflow
                        </span>
                      </div>
                    </div>
                  </div>
                  {lineChartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <p className="text-[13px]" style={{ color: T.muted }}>No data yet — activity will appear here over time.</p>
                    </div>
                  ) : (
                    <div className="w-full h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fill: T.dim }}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
                          />
                          <YAxis
                            tickFormatter={(v: number) => formatCurrency(v, orgCurrency)}
                            tick={{ fontSize: 10, fill: T.dim }}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
                            width={52}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "#17171A",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "12px",
                            }}
                            labelStyle={{ color: T.bright }}
                            formatter={(value: number, name: string) => [formatCurrency(value, orgCurrency), name]}
                            labelFormatter={(label: string) => label}
                          />
                          <Line
                            type="monotone"
                            dataKey="inflow"
                            name="Inflow"
                            stroke={G}
                            strokeWidth={2}
                            dot={{ fill: G, r: 4 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="outflow"
                            name="Outflow"
                            stroke="#F87171"
                            strokeWidth={2}
                            dot={{ fill: "#F87171", r: 4 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>

                {/* Stats: third column */}
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Expense this month", value: formatCurrency(expenseThisMonth, orgCurrency), icon: Clock, iconColor: "#F87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.15)", sub: "From approved/paid invoices" },
                    { label: "Total paid", value: formatCurrency(totalPaid, orgCurrency), icon: FileText, iconColor: T.muted, bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", sub: "All time (invoices)" },
                    { label: "Expected inflow", value: formatCurrency(totalInflow, orgCurrency), icon: TrendingUp, iconColor: "#34D399", bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.25)", sub: "From income streams" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl p-4 flex-1 min-h-0"
                      style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon className="h-4 w-4 flex-shrink-0" style={{ color: stat.iconColor }} />
                        <span className="text-[12px] font-semibold truncate" style={{ color: T.muted }}>{stat.label}</span>
                      </div>
                      <p className="text-[20px] font-extrabold font-mono" style={{ color: stat.iconColor === T.muted ? T.bright : stat.iconColor }}>
                        {stat.value}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: T.sub }}>{stat.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state when no orgs */}
        {!isOrgsLoading && organizations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[52px] mb-4">🏢</div>
            <h2 className="text-[18px] font-extrabold text-white mb-2">No organizations yet</h2>
            <p className="text-[14px] mb-6 max-w-xs" style={{ color: T.muted }}>Create your first organization to start managing invoices, contracts, and your team.</p>
            <Link href="/organization/create"
              className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-extrabold transition-all hover:opacity-90"
              style={{ background: A, color: "#0a0a0a" }}>
              <Plus className="h-4 w-4" /> Create organization
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
