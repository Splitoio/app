"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { useGetOrganizationActivity } from "@/features/business/hooks/use-invoices";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { Loader2, FileText, CheckCircle2, XCircle, CreditCard, FileSignature, FilePlus } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Card, SectionLabel, T, G, A } from "@/lib/splito-design";

type Activity = {
  id: string;
  type: string;
  createdAt: string;
  note?: string | null;
  user?: { id: string; name?: string | null; email?: string | null; image?: string | null } | null;
  invoice?: { amount: number; currency: string; recipient?: { name?: string | null } | null } | null;
  contract?: { title?: string | null; jobTitle?: string | null; assignedToEmail?: string | null; assignedTo?: { name?: string | null; email?: string | null } | null } | null;
};

function activityConfig(type: string): { label: string; icon: React.ElementType; color: string; bg: string; border: string } {
  switch (type) {
    case "INVOICE_RAISED":
      return { label: "raised an invoice", icon: FilePlus, color: A, bg: `${A}12`, border: `${A}25` };
    case "INVOICE_APPROVED":
      return { label: "approved an invoice", icon: CheckCircle2, color: G, bg: `${G}12`, border: `${G}25` };
    case "INVOICE_DECLINED":
      return { label: "declined an invoice", icon: XCircle, color: "#F87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)" };
    case "INVOICE_CLEARED":
      return { label: "cleared an invoice", icon: CreditCard, color: G, bg: `${G}12`, border: `${G}25` };
    case "CONTRACT_CREATED":
      return { label: "created a contract", icon: FileText, color: A, bg: `${A}12`, border: `${A}25` };
    case "CONTRACT_SIGNED":
      return { label: "signed a contract", icon: FileSignature, color: G, bg: `${G}12`, border: `${G}25` };
    default:
      return { label: type, icon: FileText, color: T.muted, bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)" };
  }
}

function groupByDate(activities: Activity[]): { label: string; items: Activity[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, Activity[]> = {};
  for (const act of activities) {
    const d = new Date(act.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let label: string;
    if (day >= today) label = "Today";
    else if (day >= yesterday) label = "Yesterday";
    else if (day >= weekAgo) label = "This week";
    else label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(act);
  }

  const order = ["Today", "Yesterday", "This week"];
  const keys = Object.keys(groups).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return 0;
  });

  return keys.map((label) => ({ label, items: groups[label] }));
}

export default function OrganizationActivityPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.organizationId as string;
  const { isAdmin } = useOrganizationOrg();
  const { data: activities = [], isLoading } = useGetOrganizationActivity(organizationId);

  useEffect(() => {
    if (isAdmin === false) {
      router.replace(`/organization/${organizationId}/invoices`);
    }
  }, [isAdmin, organizationId, router]);

  if (isAdmin === false || isAdmin === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  const groups = groupByDate(activities as Activity[]);

  return (
    <div className="w-full space-y-5 sm:space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-white">Activity</h1>
        <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>
          {isLoading ? "Loading…" : `${(activities as Activity[]).length} event${(activities as Activity[]).length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      )}

      {/* ── Empty ── */}
      {!isLoading && (activities as Activity[]).length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-[48px] mb-4">📋</div>
          <h2 className="text-[16px] font-bold text-white mb-2">No activity yet</h2>
          <p className="text-[13px]" style={{ color: T.muted }}>
            Actions like raising invoices, signing contracts, and approvals will appear here.
          </p>
        </div>
      )}

      {/* ── Activity groups ── */}
      {!isLoading && groups.length > 0 && (
        <div className="w-full space-y-5 sm:space-y-6 mb-5 sm:mb-6">
          <SectionLabel className="mb-3">Activity</SectionLabel>
          {groups.map(({ label, items }) => (
            <div key={label} className="w-full">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3 px-1" style={{ color: T.soft }}>{label}</p>
              <Card className="w-full p-0 overflow-hidden">
                {items.map((act) => {
                  const cfg = activityConfig(act.type);
                  const Icon = cfg.icon;
                  return (
                    <div key={act.id}
                      className="w-full flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.012] transition-colors">

                      {/* Activity type icon */}
                      <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                      </div>

                      {/* Avatar */}
                      <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 border border-white/[0.08] mt-0.5">
                        <Image
                          src={act.user?.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${act.user?.id ?? "unknown"}`}
                          alt={act.user?.name || "User"}
                          width={32} height={32}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] leading-snug" style={{ color: T.body }}>
                          <span className="font-bold" style={{ color: T.bright }}>
                            {act.user?.name || act.user?.email || "Someone"}
                          </span>
                          {" "}
                          <span style={{ color: cfg.color }}>{cfg.label}</span>
                          {act.invoice && (
                            <span style={{ color: T.muted }}>
                              {" · "}
                              <span className="font-mono font-semibold">{formatCurrency(act.invoice.amount, act.invoice.currency)}</span>
                              {act.invoice.recipient?.name && ` to ${act.invoice.recipient.name}`}
                            </span>
                          )}
                          {act.contract && act.type === "CONTRACT_CREATED" && (
                            <span style={{ color: T.muted }}>
                              {" for "}
                              <span className="font-semibold" style={{ color: T.body }}>
                                {act.contract.assignedToEmail ?? act.contract.assignedTo?.email ?? "—"}
                              </span>
                              {(act.contract.jobTitle || act.contract.title) && (
                                <> ({act.contract.jobTitle || act.contract.title})</>
                              )}
                            </span>
                          )}
                          {act.contract && act.type !== "CONTRACT_CREATED" && (
                            <span style={{ color: T.muted }}>
                              {" · "}
                              {act.contract.title || "Contract"}
                              {act.contract.assignedTo?.name && ` · ${act.contract.assignedTo.name}`}
                            </span>
                          )}
                        </p>
                        {act.note && (
                          <p className="text-[12px] mt-1 italic" style={{ color: T.dim }}>&ldquo;{act.note}&rdquo;</p>
                        )}
                        <p className="text-[11px] mt-1 font-medium" style={{ color: T.sub }}>
                          {new Date(act.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          {" · "}
                          {new Date(act.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
