"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  useGetStreamsByOrganization,
  useDeleteStream,
} from "@/features/business/hooks/use-streams";
import { useGetOrganizationAnalytics } from "@/features/business/hooks/use-invoices";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Card, SectionLabel, Btn, T, A, Icons } from "@/lib/splito-design";

export default function OrganizationStreamsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.organizationId as string;
  const { isAdmin, openStreamModal, openEditStream } = useOrganizationOrg();
  const { data: streams = [], isLoading: isStreamsLoading } = useGetStreamsByOrganization(organizationId, { enabled: !!isAdmin });
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useGetOrganizationAnalytics(organizationId);
  const deleteStreamMutation = useDeleteStream();

  const expenseThisMonth = analyticsData?.expenseThisMonth ?? 0;
  const totalPaid = analyticsData?.totalPaid ?? 0;
  const totalInflow = analyticsData?.totalInflow ?? 0;
  const byMonth = analyticsData?.inflowOutflowByMonth ?? [];
  const maxVal = Math.max(...byMonth.flatMap((m) => [m.inflow, m.outflow]), 1);

  useEffect(() => {
    if (isAdmin === false && organizationId) {
      router.replace(`/organization/${organizationId}/invoices`);
    }
  }, [isAdmin, organizationId, router]);

  const formatCurrencyLocal = (amount: number, currency: string) => formatCurrency(amount, currency);

  if (!isAdmin) {
    return (
      <div className="flex justify-center py-8 sm:py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionLabel>Income streams</SectionLabel>
        <button
          onClick={openStreamModal}
          className="flex items-center gap-2 rounded-xl h-9 sm:h-10 px-3 sm:px-4 text-sm font-extrabold transition-all hover:opacity-90"
          style={{ background: A, color: "#0a0a0a" }}
        >
          {Icons.plus({ size: 16 })} Add stream
        </button>
      </div>
      {isStreamsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : streams.length > 0 ? (
        <Card className="p-0 overflow-hidden">
          {streams.map((stream, idx) => (
            <div
              key={stream.id}
              className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06] last:border-b-0"
            >
              <div className="min-w-0">
                <p className="font-semibold" style={{ color: T.bright }}>{stream.name}</p>
                <p className="text-sm mt-1" style={{ color: T.muted }}>
                  {stream.expectedAmount != null
                    ? formatCurrencyLocal(stream.expectedAmount, stream.currency)
                    : stream.currency}
                  {stream.description && ` · ${stream.description}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Btn variant="ghost" onClick={() => openEditStream(stream)} style={{ padding: "6px 12px", fontSize: 12 }}>
                  Edit
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() =>
                    deleteStreamMutation.mutate(
                      { organizationId, streamId: stream.id },
                      {
                        onSuccess: () => toast.success("Stream removed"),
                        onError: () => toast.error("Failed to remove stream"),
                      }
                    )
                  }
                  disabled={deleteStreamMutation.isPending}
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >
                  {Icons.trash({ size: 12 })} Delete
                </Btn>
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-[15px] font-semibold mb-4" style={{ color: T.muted }}>
            No income streams yet. Add one to track money coming into the organization.
          </p>
          <button
            onClick={openStreamModal}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{ background: A, color: "#0a0a0a" }}
          >
            {Icons.plus({ size: 16 })} Add stream
          </button>
        </Card>
      )}

      {/* Statistics */}
      <SectionLabel className="mt-8">Statistics</SectionLabel>
      {isAnalyticsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="h-5 w-5 text-red-400/90" />
                <span className="text-sm font-medium" style={{ color: T.muted }}>Expense this month</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(expenseThisMonth, "USD")}</p>
              <p className="text-xs mt-1" style={{ color: T.sub }}>Based on approved/paid invoices</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-white/70" />
                <span className="text-sm font-medium" style={{ color: T.muted }}>Total amount paid</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalPaid, "USD")}</p>
              <p className="text-xs mt-1" style={{ color: T.sub }}>All time (invoices)</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-5 w-5 text-emerald-400/90" />
                <span className="text-sm font-medium" style={{ color: T.muted }}>Expected inflow</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalInflow, "USD")}</p>
              <p className="text-xs mt-1" style={{ color: T.sub }}>From income streams</p>
            </Card>
          </div>
          <Card className="p-4 sm:p-5">
            <h3 className="text-base font-semibold text-white mb-4">Inflow vs outflow (last 6 months)</h3>
            <div className="space-y-4">
              {byMonth.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: T.muted }}>No data yet.</p>
              ) : (
                byMonth.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="w-16 text-xs font-medium shrink-0" style={{ color: T.muted }}>{m.month}</span>
                    <div className="flex-1 flex gap-2 items-end h-8">
                      <div className="rounded-md bg-emerald-500/30 min-w-[4px] transition-all" style={{ width: `${Math.max(4, (m.inflow / maxVal) * 100)}%`, height: 24 }} title={`Inflow: ${formatCurrency(m.inflow, "USD")}`} />
                      <div className="rounded-md bg-red-500/30 min-w-[4px] transition-all" style={{ width: `${Math.max(4, (m.outflow / maxVal) * 100)}%`, height: 24 }} title={`Outflow: ${formatCurrency(m.outflow, "USD")}`} />
                    </div>
                    <div className="w-32 shrink-0 flex gap-2 text-xs" style={{ color: T.sub }}>
                      <span title={formatCurrency(m.inflow, "USD")}>↑ {formatCurrency(m.inflow, "USD")}</span>
                      <span title={formatCurrency(m.outflow, "USD")}>↓ {formatCurrency(m.outflow, "USD")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-6 mt-4 pt-4 border-t border-white/[0.06] text-xs" style={{ color: T.muted }}>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500/30" /> Inflow</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500/30" /> Outflow</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
