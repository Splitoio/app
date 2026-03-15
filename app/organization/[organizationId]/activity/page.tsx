"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useGetOrganizationActivity } from "@/features/business/hooks/use-invoices";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { formatRelativeTime } from "@/lib/utils";
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

const DOT_COLORS: Record<string, string> = {
  INVOICE_RAISED: A,
  INVOICE_APPROVED: G,
  INVOICE_DECLINED: "#F87171",
  INVOICE_CLEARED: G,
  CONTRACT_CREATED: A,
  CONTRACT_SIGNED: "#A78BFA",
};

function getDotColor(type: string): string {
  return DOT_COLORS[type] ?? T.muted;
}

function getActivityText(act: Activity): React.ReactNode {
  const userName = act.user?.name || act.user?.email || "Someone";

  switch (act.type) {
    case "INVOICE_RAISED":
      return (
        <>
          {userName} raised an invoice
          {act.invoice && (
            <>
              {" "}
              <span style={{ color: A }}>
                ({formatCurrency(act.invoice.amount, act.invoice.currency)})
              </span>
              {act.invoice.recipient?.name && ` to ${act.invoice.recipient.name}`}
            </>
          )}
        </>
      );
    case "INVOICE_APPROVED":
      return (
        <>
          {userName} approved an invoice
          {act.invoice && (
            <>
              {" "}
              <span style={{ color: G }}>
                ({formatCurrency(act.invoice.amount, act.invoice.currency)})
              </span>
            </>
          )}
        </>
      );
    case "INVOICE_DECLINED":
      return (
        <>
          {userName} declined an invoice
          {act.invoice && (
            <>
              {" "}
              <span style={{ color: "#F87171" }}>
                ({formatCurrency(act.invoice.amount, act.invoice.currency)})
              </span>
            </>
          )}
        </>
      );
    case "INVOICE_CLEARED":
      return (
        <>
          {userName} cleared an invoice
          {act.invoice && (
            <>
              {" "}
              <span style={{ color: G }}>
                ({formatCurrency(act.invoice.amount, act.invoice.currency)})
              </span>
            </>
          )}
        </>
      );
    case "CONTRACT_CREATED":
      return (
        <>
          {userName} created a contract
          {act.contract && (
            <>
              {act.contract.assignedToEmail || act.contract.assignedTo?.email
                ? ` for ${act.contract.assignedToEmail ?? act.contract.assignedTo?.email}`
                : ""}
              {(act.contract.jobTitle || act.contract.title) && (
                <> ({act.contract.jobTitle || act.contract.title})</>
              )}
            </>
          )}
        </>
      );
    case "CONTRACT_SIGNED":
      return (
        <>
          {userName} signed a contract
          {act.contract && (
            <>
              {act.contract.title ? ` · ${act.contract.title}` : ""}
              {act.contract.assignedTo?.name ? ` · ${act.contract.assignedTo.name}` : ""}
            </>
          )}
        </>
      );
    default:
      return <>{userName} performed an action</>;
  }
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

  const activityList = activities as unknown as Activity[];

  return (
    <div style={{ padding: "0 0 24px" }}>
      <SectionLabel>Recent Activity</SectionLabel>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      )}

      {!isLoading && activityList.length > 0 ? (
        <Card>
          {activityList.map((act, idx) => (
            <div
              key={act.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "15px 22px",
                borderBottom:
                  idx < activityList.length - 1
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "none",
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: getDotColor(act.type),
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: T.body,
                  fontWeight: 500,
                }}
              >
                {getActivityText(act)}
                {act.note && (
                  <span style={{ color: T.dim }}> &mdash; &ldquo;{act.note}&rdquo;</span>
                )}
              </p>
              <span
                style={{
                  color: T.sub,
                  fontSize: 12,
                  flexShrink: 0,
                  fontWeight: 600,
                }}
              >
                {formatRelativeTime(new Date(act.createdAt))}
              </span>
            </div>
          ))}
        </Card>
      ) : !isLoading ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
          }}
        >
          <p style={{ fontSize: 48, marginBottom: 18 }}>📋</p>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: T.body,
              marginBottom: 8,
            }}
          >
            No activity yet
          </p>
          <p style={{ fontSize: 14, color: T.sub }}>
            Expenses and settlements will show here
          </p>
        </div>
      ) : null}
    </div>
  );
}
