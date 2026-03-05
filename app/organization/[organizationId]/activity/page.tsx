"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { useGetOrganizationActivity } from "@/features/business/hooks/use-invoices";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Card, SectionLabel, T, G } from "@/lib/splito-design";

function activityLabel(type: string) {
  switch (type) {
    case "INVOICE_RAISED":
      return "raised an invoice";
    case "INVOICE_APPROVED":
      return "approved an invoice";
    case "INVOICE_DECLINED":
      return "declined an invoice";
    case "INVOICE_CLEARED":
      return "cleared an invoice";
    case "CONTRACT_CREATED":
      return "created a contract";
    case "CONTRACT_SIGNED":
      return "signed a contract";
    default:
      return type;
  }
}

export default function OrganizationActivityPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.organizationId as string;
  const { isAdmin } = useOrganizationOrg();
  const { data: activities = [], isLoading: isActivityLoading } = useGetOrganizationActivity(organizationId);

  useEffect(() => {
    if (isAdmin === false) {
      router.replace(`/organization/${organizationId}/invoices`);
    }
  }, [isAdmin, organizationId, router]);

  if (isAdmin === false || isAdmin === undefined) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  const dotColor = (type: string) => (type.includes("APPROVED") || type.includes("SIGNED") ? G : "#22D3EE");

  return (
    <div className="space-y-4 sm:space-y-5">
      <SectionLabel>Activity</SectionLabel>
      {isActivityLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : activities.length > 0 ? (
        <Card className="p-0 overflow-hidden">
          {activities.map((act, idx) => (
            <div
              key={act.id}
              className="flex items-center gap-3 p-4 sm:p-5 border-b border-white/[0.06] last:border-b-0"
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: dotColor(act.type) }} />
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full overflow-hidden flex-shrink-0 border border-white/[0.08]">
                <Image
                  src={act.user?.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${act.user?.id}`}
                  alt={act.user?.name || "User"}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base leading-snug" style={{ color: T.body }}>
                  <span className="font-semibold" style={{ color: T.bright }}>{act.user?.name || act.user?.email || "Someone"}</span> {activityLabel(act.type)}
                  {act.invoice && (
                    <span style={{ color: T.muted }}>
                      {" "}
                      ({formatCurrency(act.invoice.amount, act.invoice.currency)}
                      {act.invoice.recipient?.name && ` to ${act.invoice.recipient.name}`})
                    </span>
                  )}
                  {act.contract && act.type === "CONTRACT_CREATED" && (
                    <span style={{ color: T.muted }}>
                      {" "}for &quot;{act.contract.assignedToEmail ?? act.contract.assignedTo?.email ?? "—"}&quot;
                      {(act.contract.jobTitle || act.contract.title) && (
                        <> ({act.contract.jobTitle || act.contract.title})</>
                      )}
                    </span>
                  )}
                  {act.contract && act.type !== "CONTRACT_CREATED" && (
                    <span style={{ color: T.muted }}>
                      {" "}
                      ({act.contract.title || "Contract"}
                      {act.contract.assignedTo?.name && ` · ${act.contract.assignedTo.name}`})
                    </span>
                  )}
                </p>
                <p className="text-xs sm:text-sm mt-1 font-semibold" style={{ color: T.sub }}>{new Date(act.createdAt).toLocaleString()}</p>
                {act.note && <p className="text-sm mt-1" style={{ color: T.dim }}>Note: {act.note}</p>}
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-[15px] font-semibold" style={{ color: T.muted }}>No activity yet</p>
        </Card>
      )}
    </div>
  );
}
