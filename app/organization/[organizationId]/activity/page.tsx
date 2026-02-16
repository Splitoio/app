"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useGetOrganizationActivity } from "@/features/business/hooks/use-invoices";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

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
    default:
      return type;
  }
}

export default function OrganizationActivityPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { data: activities = [], isLoading: isActivityLoading } = useGetOrganizationActivity(organizationId);

  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-mobile-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">Activity</h3>
      {isActivityLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : activities.length > 0 ? (
        activities.map((act) => (
          <div key={act.id} className="p-3 sm:p-4 rounded-xl bg-white/[0.02] flex items-center gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={act.user?.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${act.user?.id}`}
                alt={act.user?.name || "User"}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-mobile-base sm:text-base text-white">
                <span className="font-medium">{act.user?.name || act.user?.email || "Someone"}</span> {activityLabel(act.type)}
                {act.invoice && (
                  <span className="text-white/70">
                    {" "}
                    ({formatCurrency(act.invoice.amount, act.invoice.currency)}
                    {act.invoice.recipient?.name && ` to ${act.invoice.recipient.name}`})
                  </span>
                )}
              </p>
              <p className="text-mobile-xs sm:text-sm text-white/60">{new Date(act.createdAt).toLocaleString()}</p>
              {act.note && <p className="text-white/50 text-sm mt-1">Note: {act.note}</p>}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 sm:py-12 text-mobile-base sm:text-base text-white/60">No activity yet</div>
      )}
    </div>
  );
}
